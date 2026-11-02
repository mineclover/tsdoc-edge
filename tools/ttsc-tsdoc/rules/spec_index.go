package tsdocedge

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"
	"unicode"

	"github.com/samchon/ttsc/packages/lint/rule"
)

func init() {
	rule.RegisterProject(specIndexRule{})
}

const specIndexRuleName = "tsdoc-edge/spec-index"

var (
	_ rule.ProjectRule                 = specIndexRule{}
	_ rule.ProjectInputRule            = specIndexRule{}
	_ rule.ProjectInputObservationRule = specIndexRule{}
	_ rule.HintRule                    = specIndexRule{}
	_ rule.GraphRule                   = specIndexRule{}
	_ rule.TypeAwareRule               = specIndexRule{}
	_ rule.OptionsRule                 = specIndexRule{}
)

// specIndexRule indexes Markdown specification files under `managedDir`
// (default `"managed"`), publishing:
//   - resolved `[[Checkpoint]]` targets to `tsdoc-edge/doc-link-target`
//   - `@doc [[` JSDoc completions via `rule.HintRule`
//   - Markdown document & section citation nodes via `rule.GraphRule`
type specIndexRule struct{}

type specIndexOptions struct {
	ManagedDir string `json:"managedDir"`
}

type specHintItem struct {
	checkpoint string
	relPath    string
}

type specIndexState struct {
	exists      bool
	managedDir  string
	checkpoints map[string]bool
	paths       map[string]string
	hints       []specHintItem
	graphNodes  []rule.GraphNode
}

func (specIndexRule) Name() string                 { return specIndexRuleName }
func (specIndexRule) NeedsTypeChecker() bool       { return false }
func (specIndexRule) AcceptsTtscLintOptions() bool { return true }
func (specIndexRule) UsesProjectInputReader() bool { return true }

func (specIndexRule) ProjectInputs(ctx *rule.ProjectInputContext) []rule.ProjectInput {
	var opts specIndexOptions
	_ = ctx.DecodeOptions(&opts)
	managedDir := resolveManagedDirPattern(opts.ManagedDir)
	return []rule.ProjectInput{
		{
			Kind:    rule.ProjectInputGlob,
			Pattern: slashJoin(managedDir, "**/*.md"),
		},
	}
}

func (specIndexRule) Check(ctx *rule.ProjectContext) {
	if ctx == nil {
		return
	}
	var opts specIndexOptions
	if err := ctx.DecodeOptions(&opts); err != nil {
		ctx.Report("Invalid tsdoc-edge/spec-index options: " + err.Error())
		return
	}

	managedDir := resolveManagedDirPattern(opts.ManagedDir)
	dirFsPath := resolveConfigFsPath(ctx.Identity, managedDir)

	exists, err := statDir(ctx.Inputs, dirFsPath)
	if err != nil {
		ctx.Report("Failed to stat " + managedDir + ": " + err.Error())
		return
	}
	if !exists {
		ctx.SetState(&specIndexState{
			exists:      false,
			managedDir:  managedDir,
			checkpoints: map[string]bool{},
			paths:       map[string]string{},
		})
		return
	}

	type mdEntry struct {
		fsPath  string
		relPath string
	}
	var files []mdEntry

	walkErr := walkSpecDir(ctx.Inputs, dirFsPath, func(entryPath string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			name := d.Name()
			if name == ".git" || name == "node_modules" || name == ".ttsc" {
				return fs.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(strings.ToLower(d.Name()), ".md") {
			return nil
		}
		subRel, relErr := filepath.Rel(dirFsPath, entryPath)
		if relErr != nil {
			return relErr
		}
		relSlash := slashJoin(managedDir, filepath.ToSlash(subRel))
		files = append(files, mdEntry{fsPath: entryPath, relPath: relSlash})
		return nil
	})
	if walkErr != nil {
		ctx.Report("Failed to index " + managedDir + ": " + walkErr.Error())
		return
	}

	sort.Slice(files, func(i, j int) bool {
		return files[i].relPath < files[j].relPath
	})

	state := &specIndexState{
		exists:      true,
		managedDir:  managedDir,
		checkpoints: make(map[string]bool, len(files)*4),
		paths:       make(map[string]string, len(files)*6),
	}
	seenHint := make(map[string]bool, len(files)*2)

	for _, f := range files {
		raw, readErr := readConfigBytes(ctx.Inputs, f.fsPath)
		if readErr != nil {
			ctx.Report("Failed to read " + f.relPath + ": " + readErr.Error())
			return
		}
		indexMarkdownSpecFile(state, seenHint, f.relPath, raw)
	}

	sort.Slice(state.hints, func(i, j int) bool {
		if state.hints[i].checkpoint != state.hints[j].checkpoint {
			return state.hints[i].checkpoint < state.hints[j].checkpoint
		}
		return state.hints[i].relPath < state.hints[j].relPath
	})

	ctx.SetState(state)
}

func (specIndexRule) Hints(ctx *rule.HintContext) []rule.Hint {
	if ctx == nil {
		return nil
	}
	state, ok := ctx.State.(*specIndexState)
	if !ok || state == nil || !state.exists || len(state.hints) == 0 {
		return nil
	}
	out := make([]rule.Hint, 0, len(state.hints))
	for _, item := range state.hints {
		for _, after := range []string{"@doc [[", "@evidence [["} {
			out = append(out, rule.Hint{
				Insert: item.checkpoint,
				Label:  "[[" + item.checkpoint + "]]",
				Detail: item.relPath,
				Trigger: rule.HintTrigger{
					Scope: rule.HintScopeJSDoc,
					After: after,
				},
			})
		}
	}
	return out
}

func (specIndexRule) GraphNodes(ctx *rule.GraphContext) []rule.GraphNode {
	if ctx == nil {
		return nil
	}
	state, ok := ctx.State.(*specIndexState)
	if !ok || state == nil || !state.exists || len(state.graphNodes) == 0 {
		return nil
	}
	out := make([]rule.GraphNode, len(state.graphNodes))
	for i, n := range state.graphNodes {
		copied := n
		if len(n.Aliases) > 0 {
			copied.Aliases = append([]string(nil), n.Aliases...)
		}
		out[i] = copied
	}
	return out
}

func indexMarkdownSpecFile(state *specIndexState, seenHint map[string]bool, relPath string, raw []byte) {
	base := path.Base(relPath)
	ext := path.Ext(base)
	baseName := base[:len(base)-len(ext)]
	primaryCheckpoint := baseName
	subRel := strings.TrimPrefix(relPath, state.managedDir+"/")
	if baseName != "" {
		state.checkpoints[baseName] = true
		state.paths[relPath] = primaryCheckpoint
		state.paths[subRel] = primaryCheckpoint
	}

	text := strings.TrimPrefix(string(raw), "\xef\xbb\xbf")
	lines := strings.Split(text, "\n")
	for i := range lines {
		lines[i] = strings.TrimSuffix(lines[i], "\r")
	}

	startIdx := stripYAMLFrontmatter(lines)

	docNodeIdx := len(state.graphNodes)
	docTitle := baseName
	hasH1Title := false
	hasAnyTitle := false
	state.graphNodes = append(state.graphNodes, rule.GraphNode{
		Address:  relPath,
		Kind:     rule.GraphNodeMarkdownDocument,
		Readable: docTitle,
		File:     relPath,
		Line:     1,
	})

	var (
		fenceChar     byte
		fenceLen      int
		inBacklinks   bool
		sectionParent [7]string
		slugCounts    = make(map[string]int)
	)

	for idx := startIdx; idx < len(lines); idx++ {
		line := lines[idx]
		lineNum := idx + 1
		trimmedLeft := strings.TrimLeft(line, " \t")

		if fenceLen > 0 {
			if isClosingMarkdownFence(trimmedLeft, fenceChar, fenceLen) {
				fenceChar = 0
				fenceLen = 0
			}
			continue
		}
		if fc, fl, ok := parseOpeningMarkdownFence(trimmedLeft); ok {
			fenceChar = fc
			fenceLen = fl
			continue
		}

		level, headingText, ok := parseATXHeading(line)
		if !ok {
			continue
		}

		// Ignore `## Backlinks` section (matching DocumentSymbolParser.ts) until
		// a subsequent H1/H2 heading exits it.
		if level <= 2 {
			if level == 2 && strings.EqualFold(headingText, "Backlinks") {
				inBacklinks = true
				continue
			}
			inBacklinks = false
		}
		if inBacklinks {
			continue
		}

		if level == 1 && !hasH1Title {
			docTitle = headingText
			hasH1Title = true
			hasAnyTitle = true
		} else if !hasAnyTitle {
			docTitle = headingText
			hasAnyTitle = true
		}

		checkpoints := extractHeadingCheckpoints(headingText)
		var aliases []string
		for _, cp := range checkpoints {
			if level == 1 && primaryCheckpoint == "" {
				primaryCheckpoint = cp
			}
			if level == 1 && primaryCheckpoint == baseName {
				primaryCheckpoint = cp
			}
			state.checkpoints[cp] = true
			aliases = append(aliases, "[["+cp+"]]")
			if !seenHint[cp] {
				seenHint[cp] = true
				state.hints = append(state.hints, specHintItem{
					checkpoint: cp,
					relPath:    relPath,
				})
			}
			if level >= 2 && primaryCheckpoint != "" && !strings.Contains(cp, "#") {
				qualified := primaryCheckpoint + "#" + cp
				state.checkpoints[qualified] = true
				aliases = append(aliases, "[["+qualified+"]]")
			}
		}
		if level == 1 {
			state.paths[relPath] = primaryCheckpoint
			state.paths[subRel] = primaryCheckpoint
		}

		for l := level; l <= 6; l++ {
			sectionParent[l] = ""
		}
		parent := relPath
		for l := level - 1; l >= 1; l-- {
			if sectionParent[l] != "" {
				parent = sectionParent[l]
				break
			}
		}

		baseSlug := githubSlug(headingText)
		state.checkpoints[baseSlug] = true
		count := slugCounts[baseSlug]
		slugCounts[baseSlug] = count + 1
		slug := baseSlug
		if count > 0 {
			slug = fmt.Sprintf("%s-%d", baseSlug, count)
		}
		if primaryCheckpoint != "" {
			sectionCheckpoint := baseSlug
			if len(checkpoints) > 0 && level >= 2 {
				sectionCheckpoint = checkpoints[0]
			}
			value := primaryCheckpoint
			if level >= 2 {
				value += "#" + sectionCheckpoint
			}
			state.paths[relPath+"#"+slug] = value
			state.paths[subRel+"#"+slug] = value
		}
		addr := relPath + "#" + slug
		sectionParent[level] = addr

		state.graphNodes = append(state.graphNodes, rule.GraphNode{
			Address:  addr,
			Kind:     rule.GraphNodeMarkdownSection,
			Readable: headingText,
			Parent:   parent,
			File:     relPath,
			Line:     lineNum,
			Aliases:  aliases,
		})
	}

	if primaryCheckpoint == "" {
		primaryCheckpoint = baseName
	}
	state.paths[relPath] = primaryCheckpoint
	state.paths[subRel] = primaryCheckpoint
	state.graphNodes[docNodeIdx].Readable = docTitle
}

func stripYAMLFrontmatter(lines []string) int {
	if len(lines) < 2 || strings.TrimSpace(lines[0]) != "---" {
		return 0
	}
	for i := 1; i < len(lines); i++ {
		trimmed := strings.TrimSpace(lines[i])
		if trimmed == "---" || trimmed == "..." {
			return i + 1
		}
	}
	return 0
}

func parseOpeningMarkdownFence(trimmedLeft string) (byte, int, bool) {
	if len(trimmedLeft) < 3 {
		return 0, 0, false
	}
	ch := trimmedLeft[0]
	if ch != '`' && ch != '~' {
		return 0, 0, false
	}
	n := 0
	for n < len(trimmedLeft) && trimmedLeft[n] == ch {
		n++
	}
	if n < 3 {
		return 0, 0, false
	}
	// Backtick info strings cannot contain backticks in CommonMark (otherwise it's inline code).
	if ch == '`' && strings.ContainsRune(trimmedLeft[n:], '`') {
		return 0, 0, false
	}
	return ch, n, true
}

func isClosingMarkdownFence(trimmedLeft string, fenceChar byte, minLen int) bool {
	if len(trimmedLeft) < minLen || trimmedLeft[0] != fenceChar {
		return false
	}
	n := 0
	for n < len(trimmedLeft) && trimmedLeft[n] == fenceChar {
		n++
	}
	if n < minLen {
		return false
	}
	return strings.TrimSpace(trimmedLeft[n:]) == ""
}

func parseATXHeading(line string) (level int, text string, ok bool) {
	// CommonMark allows up to 3 leading spaces before `#`.
	i := 0
	for i < len(line) && i < 3 && line[i] == ' ' {
		i++
	}
	hashStart := i
	for i < len(line) && line[i] == '#' {
		i++
	}
	level = i - hashStart
	if level < 1 || level > 6 || i >= len(line) || (line[i] != ' ' && line[i] != '\t') {
		return 0, "", false
	}
	rest := strings.TrimSpace(line[i:])
	// Strip optional ATX closing ` ###` sequence when preceded by whitespace.
	if strings.HasSuffix(rest, "#") {
		j := len(rest) - 1
		for j >= 0 && rest[j] == '#' {
			j--
		}
		if j < 0 {
			rest = ""
		} else if rest[j] == ' ' || rest[j] == '\t' {
			rest = strings.TrimSpace(rest[:j])
		}
	}
	if rest == "" {
		return 0, "", false
	}
	return level, rest, true
}

func extractHeadingCheckpoints(headingText string) []string {
	var out []string
	rest := headingText
	for {
		openIdx := strings.Index(rest, "[[")
		if openIdx < 0 {
			break
		}
		afterOpen := rest[openIdx+2:]
		closeIdx := strings.Index(afterOpen, "]]")
		if closeIdx < 0 {
			break
		}
		candidate := afterOpen[:closeIdx]
		if !strings.ContainsAny(candidate, "[]") {
			if cp := strings.TrimSpace(candidate); cp != "" {
				out = append(out, cp)
			}
		}
		rest = afterOpen[closeIdx+2:]
	}
	return out
}

func githubSlug(headingText string) string {
	var b strings.Builder
	b.Grow(len(headingText))
	for _, r := range strings.TrimSpace(headingText) {
		r = unicode.ToLower(r)
		switch {
		case unicode.IsLetter(r) || unicode.IsNumber(r) || r == '-' || r == '_':
			b.WriteRune(r)
		case r == ' ':
			b.WriteByte('-')
		}
	}
	slug := b.String()
	if slug == "" {
		return "section"
	}
	return slug
}

func resolveManagedDirPattern(configured string) string {
	trimmed := strings.TrimSpace(strings.ReplaceAll(configured, "\\", "/"))
	trimmed = strings.TrimSuffix(trimmed, "/")
	if trimmed == "" || trimmed == "." {
		return "managed"
	}
	return trimmed
}

func slashJoin(elem ...string) string {
	return path.Join(elem...)
}

func statDir(inputs rule.ProjectInputReader, dir string) (bool, error) {
	var (
		info os.FileInfo
		err  error
	)
	if inputs != nil {
		info, err = inputs.Stat(dir)
	} else {
		info, err = os.Stat(dir)
	}
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) || os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}
	return info.IsDir(), nil
}

func walkSpecDir(inputs rule.ProjectInputReader, dir string, fn fs.WalkDirFunc) error {
	if inputs != nil {
		return inputs.WalkDir(dir, fn)
	}
	return filepath.WalkDir(dir, fn)
}
