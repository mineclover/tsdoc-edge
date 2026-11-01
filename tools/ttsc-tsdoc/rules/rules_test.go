package tsdocedge

import (
	"encoding/json"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	shimast "github.com/microsoft/typescript-go/shim/ast"
	shimcore "github.com/microsoft/typescript-go/shim/core"
	shimparser "github.com/microsoft/typescript-go/shim/parser"
	shimtspath "github.com/microsoft/typescript-go/shim/tspath"
	"github.com/samchon/ttsc/packages/lint/rule"
)

type recordedFinding struct {
	pos         int
	end         int
	message     string
	edits       []rule.TextEdit
	suggestions []rule.Suggestion
}

type testReporter struct {
	file     *shimast.SourceFile
	findings []recordedFinding
}

func (r *testReporter) Report(node *shimast.Node, message string) {
	r.findings = append(r.findings, recordedFinding{
		pos:     node.Pos(),
		end:     node.End(),
		message: message,
	})
}

func (r *testReporter) ReportRange(pos, end int, message string) {
	r.findings = append(r.findings, recordedFinding{
		pos:     pos,
		end:     end,
		message: message,
	})
}

func (r *testReporter) ReportFix(node *shimast.Node, message string, edits ...rule.TextEdit) {
	r.findings = append(r.findings, recordedFinding{
		pos:     node.Pos(),
		end:     node.End(),
		message: message,
		edits:   append([]rule.TextEdit(nil), edits...),
	})
}

func (r *testReporter) ReportRangeFix(pos, end int, message string, edits ...rule.TextEdit) {
	r.findings = append(r.findings, recordedFinding{
		pos:     pos,
		end:     end,
		message: message,
		edits:   append([]rule.TextEdit(nil), edits...),
	})
}

func (r *testReporter) ReportSuggestion(node *shimast.Node, message string, suggestions ...rule.Suggestion) {
	r.findings = append(r.findings, recordedFinding{
		pos:         node.Pos(),
		end:         node.End(),
		message:     message,
		suggestions: append([]rule.Suggestion(nil), suggestions...),
	})
}

func (r *testReporter) ReportRangeSuggestion(pos, end int, message string, suggestions ...rule.Suggestion) {
	r.findings = append(r.findings, recordedFinding{
		pos:         pos,
		end:         end,
		message:     message,
		suggestions: append([]rule.Suggestion(nil), suggestions...),
	})
}

type testProjectReporter struct {
	failed   bool
	messages []string
	state    any
}

func (p *testProjectReporter) Fail() {
	p.failed = true
}

func (p *testProjectReporter) Report(message string) {
	p.failed = true
	p.messages = append(p.messages, message)
}

func (p *testProjectReporter) SetState(state any) {
	p.state = state
}

type mapProjectResults map[string]rule.ProjectRuleResult

func (m mapProjectResults) ProjectResult(name string) rule.ProjectRuleResult {
	if res, ok := m[name]; ok {
		return res
	}
	return rule.ProjectRuleResult{Status: rule.ProjectRuleAbsent}
}

type recordingInputReader struct {
	statCalls     int
	walkCalls     int
	readFileCalls int
	unavailable   bool
}

func (r *recordingInputReader) ReadFile(p string) ([]byte, error) {
	r.readFileCalls++
	return os.ReadFile(p)
}

func (r *recordingInputReader) Stat(p string) (os.FileInfo, error) {
	r.statCalls++
	return os.Stat(p)
}

func (r *recordingInputReader) Lstat(p string) (os.FileInfo, error) {
	return os.Lstat(p)
}

func (r *recordingInputReader) ReadDir(p string) ([]os.DirEntry, error) {
	return os.ReadDir(p)
}

func (r *recordingInputReader) Readlink(p string) (string, error) {
	return os.Readlink(p)
}

func (r *recordingInputReader) EvalSymlinks(p string) (string, error) {
	return filepath.EvalSymlinks(p)
}

func (r *recordingInputReader) WalkDir(root string, fn fs.WalkDirFunc) error {
	r.walkCalls++
	return filepath.WalkDir(root, fn)
}

func (r *recordingInputReader) Unavailable() {
	r.unavailable = true
}

func parseTestTS(t *testing.T, source string) *shimast.SourceFile {
	t.Helper()
	opts := shimast.SourceFileParseOptions{
		FileName: shimtspath.RootedFilePathFromAbsolute("/virtual/test.ts"),
	}
	file := shimparser.ParseSourceFile(opts, source, shimcore.ScriptKindTS)
	if file == nil {
		t.Fatalf("ParseSourceFile returned nil")
	}
	return file
}

func parseTestTSX(t *testing.T, source string) *shimast.SourceFile {
	t.Helper()
	opts := shimast.SourceFileParseOptions{
		FileName: shimtspath.RootedFilePathFromAbsolute("/virtual/test.tsx"),
	}
	file := shimparser.ParseSourceFile(opts, source, shimcore.ScriptKindTSX)
	if file == nil {
		t.Fatalf("ParseSourceFile (TSX) returned nil")
	}
	return file
}

func runFileRule(
	t *testing.T,
	r rule.Rule,
	file *shimast.SourceFile,
	options json.RawMessage,
	results rule.ProjectResultReader,
) []recordedFinding {
	t.Helper()
	rep := &testReporter{file: file}
	ctx := rule.NewContextWithProjectResults(file, nil, rule.SeverityError, options, rep, results)

	visitSet := make(map[shimast.Kind]bool, len(r.Visits()))
	for _, k := range r.Visits() {
		visitSet[k] = true
	}

	var walk func(*shimast.Node)
	walk = func(n *shimast.Node) {
		if n == nil {
			return
		}
		if visitSet[n.Kind] {
			r.Check(ctx, n)
		}
		n.ForEachChild(func(child *shimast.Node) bool {
			walk(child)
			return false
		})
	}
	walk(file.AsNode())
	return rep.findings
}

func applyEdits(t *testing.T, src string, findings []recordedFinding) string {
	t.Helper()
	var all []rule.TextEdit
	for _, f := range findings {
		all = append(all, f.edits...)
	}
	sort.Slice(all, func(i, j int) bool {
		if all[i].Pos != all[j].Pos {
			return all[i].Pos > all[j].Pos
		}
		return all[i].End > all[j].End
	})
	out := src
	for _, e := range all {
		if e.Pos < 0 || e.End < e.Pos || e.End > len(out) {
			t.Fatalf("out-of-bounds edit [%d, %d) for len %d", e.Pos, e.End, len(out))
		}
		out = out[:e.Pos] + e.Text + out[e.End:]
	}
	return out
}

func TestRegisteredRulesInventory(t *testing.T) {
	wantProjects := map[string]bool{
		"tsdoc-edge/tsdoc-config": true,
		"tsdoc-edge/spec-index":   true,
	}
	for _, pr := range rule.RegisteredProjects() {
		delete(wantProjects, pr.Name())
	}
	if len(wantProjects) != 0 {
		t.Fatalf("missing registered project rules: %v", wantProjects)
	}
}

func TestCommentScannerIgnoresLiteralsTemplatesAndJSXText(t *testing.T) {
	src := strings.Join([]string{
		`const s = "/** @badTag {unescaped} */";`,
		"const tpl = `/** @badTag <T, U> */ ${`/** @badNested */`}`;",
		`const re = /\/\*\* @badRegex \*\//;`,
		`/************************************`,
		` * Banner comment, not a TSDoc block`,
		` ************************************/`,
		`/** Real doc block */`,
		`export function View() { return <div>/** @badJsx */</div>; }`,
	}, "\n")

	file := parseTestTSX(t, src)
	blocks := findDocBlocks(file)
	if len(blocks) != 1 {
		t.Fatalf("expected exactly 1 real docBlock, got %d", len(blocks))
	}
	got := src[blocks[0].start:blocks[0].end]
	if got != "/** Real doc block */" {
		t.Fatalf("unexpected docBlock slice: %q", got)
	}
}

func TestTSDocEscapesDetectsAndFixesCleanly(t *testing.T) {
	dir := t.TempDir()
	tsdocJSON := `{
		"tagDefinitions": [
			{ "tagName": "@symbol", "syntaxKind": "block" },
			{ "tagName": "@doc", "syntaxKind": "block" }
		]
	}`
	if err := os.WriteFile(filepath.Join(dir, "tsdoc.json"), []byte(tsdocJSON), 0o644); err != nil {
		t.Fatal(err)
	}

	projRep := &testProjectReporter{}
	projCtx := rule.NewProjectContext(
		rule.ProjectIdentity{PhysicalProjectRoot: dir},
		nil,
		nil,
		rule.SeverityError,
		nil,
		projRep,
	)
	tsdocConfigRule{}.Check(projCtx)
	if projRep.failed || projRep.state == nil {
		t.Fatalf("tsdoc-config failed: %v", projRep.messages)
	}
	results := mapProjectResults{
		tsdocConfigRuleName: rule.NewProjectRuleResult(rule.ProjectRulePassed, projRep.state, nil, projRep),
	}

	// 1. Clean cases: valid HTML tags, single-arg generics, valid {@link}, code fences, inline backticks.
	cleanSrc := strings.Join([]string{
		`/**`,
		` * Returns <void> or <User> or <CommandResult>.`,
		` * Supports <br/>, <a href="https://example.com/@org" title="a > b">docs</a>, and </p>.`,
		` * See {@link https://example.com/@user | User > Profile} and {@inheritDoc}.`,
		" * Inline code `{ a: 1, b: Map<string, number>, tag: @doc }` is untouched.",
		` *   ` + "```ts",
		` *   const m: Map<string, number> = new Map(); // @symbol {raw}`,
		` *   ` + "```",
		` * @doc [[Spec]]`,
		` */`,
		`export function clean(): void {}`,
	}, "\n")
	cleanFindings := runFileRule(t, tsdocEscapesRule{}, parseTestTS(t, cleanSrc), nil, results)
	if len(cleanFindings) != 0 {
		t.Fatalf("expected 0 findings on clean TSDoc, got %d: %+v", len(cleanFindings), cleanFindings)
	}

	// 2. Dirty autofixable cases: braces, non-inline tag in braces, generics, `>`, `@` in words/packages.
	dirtySrc := strings.Join([]string{
		`/**`,
		` * Config { a: 1 } and {@symbol} and Map<string, number> and a -> b.`,
		` * Uses @microsoft/tsdoc and foo@bar and (@param) and @ttsc/lint@0.34.3.`,
		` */`,
		`export function dirty(): void {}`,
	}, "\n")
	dirtyFile := parseTestTS(t, dirtySrc)
	findings := runFileRule(t, tsdocEscapesRule{}, dirtyFile, nil, results)
	if len(findings) == 0 {
		t.Fatalf("expected escape findings on dirty TSDoc, got 0")
	}

	fixed := applyEdits(t, dirtySrc, findings)
	wantFixed := strings.Join([]string{
		`/**`,
		` * Config \{ a: 1 \} and \{\@symbol\} and Map\<string, number\> and a -\> b.`,
		` * Uses \@microsoft/tsdoc and foo\@bar and (\@param) and \@ttsc/lint\@0.34.3.`,
		` */`,
		`export function dirty(): void {}`,
	}, "\n")
	if fixed != wantFixed {
		t.Fatalf("autofix mismatch:\ngot:\n%s\nwant:\n%s", fixed, wantFixed)
	}

	// Re-run both tsdoc-escapes AND check-tag-names on fixed output to prove 1-pass convergence!
	afterEscapes := runFileRule(t, tsdocEscapesRule{}, parseTestTS(t, fixed), nil, results)
	if len(afterEscapes) != 0 {
		t.Fatalf("expected 0 findings after 1-pass autofix, got %+v", afterEscapes)
	}
	afterTags := runFileRule(t, checkTagNames{}, parseTestTS(t, fixed), nil, results)
	if len(afterTags) != 0 {
		t.Fatalf("expected 0 check-tag-names findings after autofix, got %+v", afterTags)
	}

	// 3. Diagnostic-only cases: mid-line code fence and unbraced inline tag `@link`.
	diagSrc := strings.Join([]string{
		`/**`,
		` * Bad fence: ` + "```ts",
		` * Missing braces on @link Target`,
		` */`,
		`export function diag(): void {}`,
	}, "\n")
	diagFindings := runFileRule(t, tsdocEscapesRule{}, parseTestTS(t, diagSrc), nil, results)
	if len(diagFindings) != 2 {
		t.Fatalf("expected 2 findings for mid-line fence and bare @link, got %d: %+v", len(diagFindings), diagFindings)
	}
	if !strings.Contains(diagFindings[0].message, "Code fence opening backticks") {
		t.Fatalf("unexpected finding[0]: %s", diagFindings[0].message)
	}
	if !strings.Contains(diagFindings[1].message, `Inline TSDoc tag "@link" must be enclosed in "{ }" braces.`) {
		t.Fatalf("unexpected finding[1]: %s", diagFindings[1].message)
	}
}

func TestParamSignaturesHyphenFixAndSignatureMatchingAcrossKinds(t *testing.T) {
	// 1. Missing hyphen autofix.
	hyphenSrc := strings.Join([]string{
		`/**`,
		` * Adds numbers.`,
		` * @param left First operand`,
		` * @param right: Second operand`,
		` */`,
		`export function add(left: number, right: number): number { return left + right; }`,
	}, "\n")
	hyphenFindings := runFileRule(t, paramSignaturesRule{}, parseTestTS(t, hyphenSrc), nil, nil)
	if len(hyphenFindings) != 2 {
		t.Fatalf("expected 2 missing-hyphen findings, got %d: %+v", len(hyphenFindings), hyphenFindings)
	}
	fixedHyphen := applyEdits(t, hyphenSrc, hyphenFindings)
	wantHyphen := strings.Join([]string{
		`/**`,
		` * Adds numbers.`,
		` * @param left - First operand`,
		` * @param right - Second operand`,
		` */`,
		`export function add(left: number, right: number): number { return left + right; }`,
	}, "\n")
	if fixedHyphen != wantHyphen {
		t.Fatalf("hyphen autofix mismatch:\ngot:\n%s\nwant:\n%s", fixedHyphen, wantHyphen)
	}
	if rerun := runFileRule(t, paramSignaturesRule{}, parseTestTS(t, fixedHyphen), nil, nil); len(rerun) != 0 {
		t.Fatalf("expected 0 findings after hyphen autofix, got %+v", rerun)
	}

	// 2. Underscore mismatch suggestion + destructuring skip + `this` param skip + dotted root match.
	sigSrc := strings.Join([]string{
		`/**`,
		` * @param ctx - Execution context`,
		` * @param opts.verbose - Verbose mode`,
		` */`,
		`export function run(this: Window, _ctx: string, opts: { verbose?: boolean }): void {}`,
		``,
		`/**`,
		` * @param options - Options bag`,
		` * @param limit - Destructured field`,
		` */`,
		`export function query({ limit }: { limit: number }): number { return limit; }`,
		``,
		`export interface Service {`,
		`  /** @param badCtor - mismatch */`,
		`  new (config: string): Service;`,
		`  /** @param badCall - mismatch */`,
		`  (input: number): boolean;`,
		`  /** @param badMethod - mismatch */`,
		`  execute(task: string): void;`,
		`}`,
		``,
		`/** @param badFnType - mismatch */`,
		`export type Handler = (event: string) => void;`,
		``,
		`export class Impl {`,
		`  /** @param badInit - mismatch */`,
		`  constructor(private readonly seed: number) {}`,
		`  /** @param badRun - mismatch */`,
		`  run(step: string): void {}`,
		`}`,
	}, "\n")

	sigFindings := runFileRule(t, paramSignaturesRule{}, parseTestTS(t, sigSrc), nil, nil)
	if len(sigFindings) != 7 {
		t.Fatalf("expected 7 signature mismatch findings across all 7 AST kinds, got %d: %+v", len(sigFindings), sigFindings)
	}
	// First finding is `ctx` vs `_ctx`: top suggestion must rename `ctx` -> `_ctx`!
	first := sigFindings[0]
	if len(first.suggestions) == 0 || first.suggestions[0].Title != "Rename @param to `_ctx`" {
		t.Fatalf("expected first suggestion to rename to `_ctx`, got %+v", first.suggestions)
	}
}

func TestSpecIndexDocLinkSyntaxAndTarget(t *testing.T) {
	dir := t.TempDir()
	featuresDir := filepath.Join(dir, "managed", "features")
	if err := os.MkdirAll(featuresDir, 0o755); err != nil {
		t.Fatal(err)
	}

	specMD := strings.Join([]string{
		`---`,
		`title: LSP Integration`,
		`status: active`,
		`---`,
		`# [[LSP Integration]]`,
		``,
		`## [[Hover Support]]`,
		``,
		"```markdown",
		`# [[IgnoredCodeFenceCheckpoint]]`,
		"```",
		``,
		`## Architecture`,
		`### Architecture`,
		``,
		`## Backlinks`,
		`### [[IgnoredBacklinkCheckpoint]]`,
	}, "\n")
	if err := os.WriteFile(filepath.Join(featuresDir, "lsp-integration.md"), []byte(specMD), 0o644); err != nil {
		t.Fatal(err)
	}

	reader := &recordingInputReader{}
	projRep := &testProjectReporter{}
	projCtx := rule.NewProjectContext(
		rule.ProjectIdentity{PhysicalProjectRoot: dir},
		nil,
		nil,
		rule.SeverityError,
		nil,
		projRep,
	)
	projCtx.Inputs = reader

	inputs := specIndexRule{}.ProjectInputs(rule.NewProjectInputContext(
		rule.ProjectIdentity{PhysicalProjectRoot: dir},
		rule.SeverityError,
		nil,
	))
	if len(inputs) != 1 || inputs[0].Kind != rule.ProjectInputGlob || inputs[0].Pattern != "managed/**/*.md" {
		t.Fatalf("unexpected ProjectInputs: %+v", inputs)
	}

	specIndexRule{}.Check(projCtx)
	if projRep.failed || projRep.state == nil {
		t.Fatalf("spec-index failed: %v", projRep.messages)
	}
	if reader.statCalls == 0 || reader.walkCalls == 0 || reader.readFileCalls == 0 || reader.unavailable {
		t.Fatalf("expected spec-index to consume ProjectContext.Inputs, got %+v", reader)
	}

	// Verify Hints.
	hints := specIndexRule{}.Hints(&rule.HintContext{
		Identity: rule.ProjectIdentity{PhysicalProjectRoot: dir},
		State:    projRep.state,
		Severity: rule.SeverityError,
	})
	if len(hints) != 2 {
		t.Fatalf("expected 2 hints (Hover Support, LSP Integration), got %+v", hints)
	}
	if hints[0].Insert != "Hover Support" || hints[0].Label != "[[Hover Support]]" ||
		hints[0].Trigger.Scope != rule.HintScopeJSDoc || hints[0].Trigger.After != "@doc [[" {
		t.Fatalf("unexpected hint[0]: %+v", hints[0])
	}
	if hints[1].Insert != "LSP Integration" || hints[1].Detail != "managed/features/lsp-integration.md" {
		t.Fatalf("unexpected hint[1]: %+v", hints[1])
	}

	// Verify GraphNodes (1 document + 4 non-backlink/non-fenced headings with deduplicated slugs).
	nodes := specIndexRule{}.GraphNodes(&rule.GraphContext{
		Identity: rule.ProjectIdentity{PhysicalProjectRoot: dir},
		State:    projRep.state,
		Severity: rule.SeverityError,
	})
	if len(nodes) != 5 {
		t.Fatalf("expected 5 graph nodes, got %d: %+v", len(nodes), nodes)
	}
	if nodes[0].Kind != rule.GraphNodeMarkdownDocument || nodes[0].Address != "managed/features/lsp-integration.md" {
		t.Fatalf("unexpected document node: %+v", nodes[0])
	}
	if nodes[1].Line != 5 || nodes[1].Address != "managed/features/lsp-integration.md#lsp-integration" {
		t.Fatalf("unexpected H1 section node: %+v", nodes[1])
	}
	if nodes[4].Address != "managed/features/lsp-integration.md#architecture-1" ||
		nodes[4].Parent != "managed/features/lsp-integration.md#architecture" {
		t.Fatalf("unexpected duplicate-slug H3 section node: %+v", nodes[4])
	}

	results := mapProjectResults{
		specIndexRuleName: rule.NewProjectRuleResult(rule.ProjectRulePassed, projRep.state, nil, projRep),
	}

	tsSrc := strings.Join([]string{
		`/**`,
		` * Valid links:`,
		` * @doc [[LSP Integration]]`,
		` * @doc [[lsp-integration]]`,
		` * @doc [[Hover Support]]`,
		` * @doc [[LSP Integration#Hover Support]]`,
		` * @doc [[LSP Integration#CustomHeading]]`,
		" * Prose mention of `@doc` in backticks is ignored.",
		` *`,
		` * Invalid syntax:`,
		` * @doc managed/features/lsp-integration.md`,
		` * @doc [[]]`,
		` *`,
		` * Invalid targets:`,
		` * @doc [[MissingFeature]]`,
		` * @doc [[IgnoredCodeFenceCheckpoint]]`,
		` * @doc [[IgnoredBacklinkCheckpoint]]`,
		` */`,
		`export class LspServer {}`,
	}, "\n")
	tsFile := parseTestTS(t, tsSrc)

	syntaxFindings := runFileRule(t, docLinkSyntaxRule{}, tsFile, nil, results)
	if len(syntaxFindings) != 2 {
		t.Fatalf("expected 2 doc-link-syntax findings, got %d: %+v", len(syntaxFindings), syntaxFindings)
	}

	targetFindings := runFileRule(t, docLinkTargetRule{}, tsFile, nil, results)
	if len(targetFindings) != 3 {
		t.Fatalf("expected 3 doc-link-target findings, got %d: %+v", len(targetFindings), targetFindings)
	}
	if gotSpan := tsSrc[targetFindings[0].pos:targetFindings[0].end]; gotSpan != "[[MissingFeature]]" {
		t.Fatalf("expected doc-link-target range to highlight [[MissingFeature]], got %q", gotSpan)
	}
}

func TestSpecIndexGracefullySkipsMissingManagedDir(t *testing.T) {
	emptyDir := t.TempDir()
	projRep := &testProjectReporter{}
	projCtx := rule.NewProjectContext(
		rule.ProjectIdentity{PhysicalProjectRoot: emptyDir},
		nil,
		nil,
		rule.SeverityError,
		nil,
		projRep,
	)
	specIndexRule{}.Check(projCtx)
	if projRep.failed {
		t.Fatalf("spec-index must not fail when managed/ does not exist: %v", projRep.messages)
	}

	results := mapProjectResults{
		specIndexRuleName: rule.NewProjectRuleResult(rule.ProjectRulePassed, projRep.state, nil, projRep),
	}
	tsFile := parseTestTS(t, "/**\n * @doc [[Anything]]\n */\nexport const x = 1;\n")
	findings := runFileRule(t, docLinkTargetRule{}, tsFile, nil, results)
	if len(findings) != 0 {
		t.Fatalf("expected doc-link-target to stay silent when managed/ is absent, got %+v", findings)
	}
}
