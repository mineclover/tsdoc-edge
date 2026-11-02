package tsdocedge

import (
	"path/filepath"
	"strings"

	shimast "github.com/microsoft/typescript-go/shim/ast"
	"github.com/samchon/ttsc/packages/lint/rule"
)

func init() {
	rule.Register(docLinkSyntaxRule{})
	rule.Register(docLinkTargetRule{})
}

const (
	docLinkSyntaxRuleName = "tsdoc-edge/doc-link-syntax"
	docLinkTargetRuleName = "tsdoc-edge/doc-link-target"
)

var (
	_ rule.Rule          = docLinkSyntaxRule{}
	_ rule.TypeAwareRule = docLinkSyntaxRule{}
	_ rule.OptionsRule   = docLinkSyntaxRule{}

	_ rule.Rule          = docLinkTargetRule{}
	_ rule.TypeAwareRule = docLinkTargetRule{}
	_ rule.OptionsRule   = docLinkTargetRule{}
)

// docLinkSyntaxRule enforces that every `@doc` block tag in real `/** ... */`
// comments starts with a well-formed `[[Checkpoint]]` reference.
type docLinkSyntaxRule struct{}

func (docLinkSyntaxRule) Name() string                 { return docLinkSyntaxRuleName }
func (docLinkSyntaxRule) Visits() []shimast.Kind       { return []shimast.Kind{shimast.KindSourceFile} }
func (docLinkSyntaxRule) NeedsTypeChecker() bool       { return false }
func (docLinkSyntaxRule) AcceptsTtscLintOptions() bool { return false }

func (docLinkSyntaxRule) Check(ctx *rule.Context, _ *shimast.Node) {
	if ctx == nil || ctx.File == nil {
		return
	}
	src := ctx.File.Text()
	for _, block := range findDocBlocks(ctx.File) {
		forEachDocTagLine(src, block, func(tag parsedDocTagLine) {
			if !tag.validSyntax {
				ctx.ReportRange(
					tag.tagStart,
					tag.lineEnd,
					"TSDoc citation tag must reference [[Checkpoint]] or a .md/.mdx/.tsp/.yaml/.json path (escape prose mentions in backticks).",
				)
			}
		})
	}
}

// docLinkTargetRule resolves syntactically valid `@doc [[Target]]` block tags
// against the Markdown checkpoint index built by `tsdoc-edge/spec-index`.
type docLinkTargetRule struct{}

func (docLinkTargetRule) Name() string                 { return docLinkTargetRuleName }
func (docLinkTargetRule) Visits() []shimast.Kind       { return []shimast.Kind{shimast.KindSourceFile} }
func (docLinkTargetRule) NeedsTypeChecker() bool       { return false }
func (docLinkTargetRule) AcceptsTtscLintOptions() bool { return false }

func (docLinkTargetRule) Check(ctx *rule.Context, _ *shimast.Node) {
	if ctx == nil || ctx.File == nil {
		return
	}
	proj := ctx.ProjectResult(specIndexRuleName)
	if proj.Status != rule.ProjectRulePassed {
		return
	}
	state, ok := proj.State.(*specIndexState)
	if !ok || state == nil || !state.exists {
		return
	}

	src := ctx.File.Text()
	for _, block := range findDocBlocks(ctx.File) {
		forEachDocTagLine(src, block, func(tag parsedDocTagLine) {
			if !tag.validSyntax {
				return
			}
			target := strings.TrimSpace(tag.target)
			base := strings.TrimSpace(strings.SplitN(target, "#", 2)[0])
			if tag.isPathRef {
				ext := strings.ToLower(filepath.Ext(base))
				if ext == ".tsp" || ext == ".yaml" || ext == ".json" {
					return
				}
				validScope := strings.HasPrefix(base, state.managedDir+"/") || !strings.Contains(base, "..")
				hasFragment := strings.Contains(target, "#")
				matched := state.paths[target] != "" || (!hasFragment && state.paths[base] != "")
				if !validScope || !matched {
					ctx.ReportRange(tag.bracketStart, tag.bracketEnd, "TSDoc citation path \""+target+"\" does not match a Markdown document or # heading under "+state.managedDir+"/.")
				}
				return
			}
			if !state.checkpoints[target] && !state.checkpoints[base] {
				ctx.ReportRange(
					tag.bracketStart,
					tag.bracketEnd,
					"TSDoc @doc checkpoint \"[["+target+"]]\" does not match any document or # [[Checkpoint]] heading under "+state.managedDir+"/.",
				)
			}
		})
	}
}

type parsedDocTagLine struct {
	tagStart     int
	lineEnd      int
	validSyntax  bool
	bracketStart int
	bracketEnd   int
	target       string
	isPathRef    bool
}

func forEachDocTagLine(src string, block docBlock, visit func(parsedDocTagLine)) {
	inFence := false
	for lineStart := block.bodyStart; lineStart < block.bodyEnd; {
		rawLineEnd, lineEnd, _, trimmedStart := docLineBounds(src, lineStart, block.bodyEnd)
		if isCodeFenceLine(src, trimmedStart, lineEnd) {
			inFence = !inFence
			lineStart = rawLineEnd + 1
			continue
		}
		if inFence {
			lineStart = rawLineEnd + 1
			continue
		}

		// Trim trailing horizontal whitespace (e.g. before `*/` on single-line comments).
		effectiveEnd := lineEnd
		for effectiveEnd > trimmedStart && (src[effectiveEnd-1] == ' ' || src[effectiveEnd-1] == '\t') {
			effectiveEnd--
		}

		if effectiveEnd-trimmedStart >= 4 {
			name := ""
			for _, candidate := range []string{"@doc", "@evidenceReview", "@evidence"} {
				if strings.HasPrefix(src[trimmedStart:effectiveEnd], candidate) && (trimmedStart+len(candidate) == effectiveEnd || src[trimmedStart+len(candidate)] == ' ' || src[trimmedStart+len(candidate)] == '\t') {
					name = candidate
					break
				}
			}
			if name != "" {
				visit(parseDocTagLine(src, trimmedStart, effectiveEnd))
			}
		}

		lineStart = rawLineEnd + 1
	}
}

func parseDocTagLine(src string, tagStart, lineEnd int) parsedDocTagLine {
	res := parsedDocTagLine{
		tagStart: tagStart,
		lineEnd:  lineEnd,
	}
	nameLen := 4
	if strings.HasPrefix(src[tagStart:lineEnd], "@evidenceReview") {
		nameLen = len("@evidenceReview")
	} else if strings.HasPrefix(src[tagStart:lineEnd], "@evidence") {
		nameLen = len("@evidence")
	}
	pos := tagStart + nameLen
	for pos < lineEnd && (src[pos] == ' ' || src[pos] == '\t') {
		pos++
	}
	if lineEnd-pos < 2 {
		return res
	}
	if src[pos:pos+2] != "[[" {
		fields := strings.Fields(src[pos:lineEnd])
		if len(fields) == 0 {
			return res
		}
		candidate := strings.Trim(fields[0], "`\"'")
		if strings.HasPrefix(candidate, "http://") || strings.HasPrefix(candidate, "https://") {
			return res
		}
		base := candidate
		if idx := strings.IndexByte(base, '#'); idx >= 0 {
			base = base[:idx]
		}
		ext := strings.ToLower(filepath.Ext(base))
		if ext != ".md" && ext != ".mdx" && ext != ".tsp" && ext != ".yaml" && ext != ".json" {
			return res
		}
		res.validSyntax = true
		res.bracketStart = pos
		res.bracketEnd = pos + len(fields[0])
		res.target = candidate
		res.isPathRef = true
		return res
	}
	innerStart := pos + 2
	closeRel := strings.Index(src[innerStart:lineEnd], "]]")
	if closeRel <= 0 {
		return res
	}
	rawTarget := src[innerStart : innerStart+closeRel]
	if strings.ContainsAny(rawTarget, "[]\r\n") {
		return res
	}
	trimmedTarget := strings.TrimSpace(rawTarget)
	if trimmedTarget == "" {
		return res
	}
	base := strings.TrimSpace(strings.SplitN(trimmedTarget, "#", 2)[0])
	if base == "" {
		return res
	}

	res.validSyntax = true
	res.bracketStart = pos
	res.bracketEnd = innerStart + closeRel + 2
	res.target = trimmedTarget
	return res
}
