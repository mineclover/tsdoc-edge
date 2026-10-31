// Package tsdocedge is a project-local `@ttsc/lint` contributor.
//
// In 0.34.3+, `tsdoc-edge/tsdoc-config` (ProjectRule + ProjectInputRule +
// HintRule) loads `tsdoc.json` once per Program cycle via ProjectInputReader
// and shares the compiled allow-list through `ProjectContext.SetState`.
// `tsdoc-edge/check-tag-names` reads that shared state in O(1), falling back to
// explicit `{"tags": [...]}` rule options when the project rule is absent/off.
package tsdocedge

import (
	"sort"

	shimast "github.com/microsoft/typescript-go/shim/ast"
	shimscanner "github.com/microsoft/typescript-go/shim/scanner"
	"github.com/samchon/ttsc/packages/lint/rule"
)

func init() {
	rule.Register(checkTagNames{})
}

type checkTagNames struct{}

type checkTagNamesOptions struct {
	Tags []string `json:"tags"`
}

func (checkTagNames) Name() string                 { return "tsdoc-edge/check-tag-names" }
func (checkTagNames) Visits() []shimast.Kind       { return []shimast.Kind{shimast.KindSourceFile} }
func (checkTagNames) NeedsTypeChecker() bool       { return false }
func (checkTagNames) AcceptsTtscLintOptions() bool { return true }

func (checkTagNames) Check(ctx *rule.Context, _ *shimast.Node) {
	if ctx == nil || ctx.File == nil {
		return
	}
	hasTag := resolveAllowedTagPredicate(ctx)
	if hasTag == nil {
		return
	}

	src := ctx.File.Text()
	for _, block := range findDocBlocks(ctx.File) {
		forEachTag(src, block, func(start, end int) {
			tag := src[start:end]
			if !hasTag(tag) {
				ctx.ReportRange(start, end, "TSDoc tag \""+tag+"\" is not defined in tsdoc.json.")
			}
		})
	}
}

func resolveAllowedTagPredicate(ctx *rule.Context) func(string) bool {
	proj := ctx.ProjectResult(tsdocConfigRuleName)
	if proj.Status == rule.ProjectRulePassed {
		if state, ok := proj.State.(*tsdocConfigState); ok && state != nil && len(state.allowed) > 0 {
			return func(tag string) bool {
				_, ok := state.allowed[tag]
				return ok
			}
		}
	}

	var opts checkTagNamesOptions
	if err := ctx.DecodeOptions(&opts); err != nil || len(opts.Tags) == 0 {
		return nil
	}
	allowed := make(map[string]struct{}, len(opts.Tags))
	for _, tag := range opts.Tags {
		allowed[tag] = struct{}{}
	}
	return func(tag string) bool {
		_, ok := allowed[tag]
		return ok
	}
}

type docBlock struct{ bodyStart, bodyEnd int }
type opaqueSpan struct{ pos, end int }

// findDocBlocks enumerates real `/** ... */` MultiLineCommentTrivia spans
// outside parser-owned literal and template tokens, so `/** @badTag */` inside
// string or template literals (e.g. parser test fixtures) is never scanned.
func findDocBlocks(file *shimast.SourceFile) []docBlock {
	src := file.Text()
	opaque := collectOpaqueTokenSpans(file)
	scanner := shimscanner.NewScanner()
	var blocks []docBlock

	scanGap := func(from, to int) {
		if from < 0 || to-from < 5 || to > len(src) {
			return
		}
		scanner.SetText(src[from:to])
		scanner.SetSkipTrivia(false)
		for {
			kind := scanner.Scan()
			if kind == shimast.KindEndOfFile {
				return
			}
			if kind != shimast.KindMultiLineCommentTrivia {
				continue
			}
			start := from + scanner.TokenStart()
			end := from + scanner.TokenEnd()
			if end-start < 5 {
				continue
			}
			if src[start] != '/' || src[start+1] != '*' || src[start+2] != '*' {
				continue
			}
			if end-start == 4 && src[start+3] == '/' {
				continue
			}
			blocks = append(blocks, docBlock{bodyStart: start + 3, bodyEnd: end - 2})
		}
	}

	cursor := 0
	for _, span := range opaque {
		if cursor < span.pos {
			scanGap(cursor, span.pos)
		}
		if span.end > cursor {
			cursor = span.end
		}
	}
	if cursor < len(src) {
		scanGap(cursor, len(src))
	}
	return blocks
}

func collectOpaqueTokenSpans(file *shimast.SourceFile) []opaqueSpan {
	srcLen := len(file.Text())
	var spans []opaqueSpan
	var walk func(*shimast.Node)
	walk = func(node *shimast.Node) {
		if node == nil {
			return
		}
		if isOpaqueLiteralOrTemplate(node.Kind) {
			pos := shimscanner.GetTokenPosOfNode(node, file, false)
			end := node.End()
			if pos >= 0 && end > pos && end <= srcLen {
				spans = append(spans, opaqueSpan{pos: pos, end: end})
			}
			return
		}
		node.ForEachChild(func(child *shimast.Node) bool {
			walk(child)
			return false
		})
	}
	walk(file.AsNode())
	if len(spans) < 2 {
		return spans
	}
	sort.Slice(spans, func(i, j int) bool {
		if spans[i].pos != spans[j].pos {
			return spans[i].pos < spans[j].pos
		}
		return spans[i].end < spans[j].end
	})
	merged := spans[:1]
	for _, span := range spans[1:] {
		last := &merged[len(merged)-1]
		if span.pos <= last.end {
			if span.end > last.end {
				last.end = span.end
			}
			continue
		}
		merged = append(merged, span)
	}
	return merged
}

func isOpaqueLiteralOrTemplate(kind shimast.Kind) bool {
	return (kind >= shimast.KindStringLiteral && kind <= shimast.KindLastLiteralToken) ||
		(kind >= shimast.KindFirstTemplateToken && kind <= shimast.KindLastTemplateToken)
}

// forEachTag yields `@tag` spans for block tags at line start and inline `{@tag`.
// Lines inside ``` fences and inline code spans are skipped.
func forEachTag(src string, block docBlock, visit func(start, end int)) {
	inFence := false
	for lineStart := block.bodyStart; lineStart < block.bodyEnd; {
		lineEnd := lineStart
		for lineEnd < block.bodyEnd && src[lineEnd] != '\n' {
			lineEnd++
		}
		content := lineStart
		for content < lineEnd && (src[content] == ' ' || src[content] == '\t' || src[content] == '\r') {
			content++
		}
		if content < lineEnd && src[content] == '*' {
			content++
			for content < lineEnd && src[content] == ' ' {
				content++
			}
		}
		if lineEnd-content >= 3 && src[content:content+3] == "```" {
			inFence = !inFence
		} else if !inFence {
			inCode := false
			for i := content; i < lineEnd; i++ {
				switch {
				case src[i] == '`':
					inCode = !inCode
				case inCode:
				case src[i] == '@' && (i == content || src[i-1] == '{') && i+1 < lineEnd && isTagStart(src[i+1]):
					j := i + 2
					for j < lineEnd && isTagContinue(src[j]) {
						j++
					}
					visit(i, j)
					i = j - 1
				}
			}
		}
		lineStart = lineEnd + 1
	}
}

func isTagStart(b byte) bool { return (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z') }

func isTagContinue(b byte) bool { return isTagStart(b) || (b >= '0' && b <= '9') }
