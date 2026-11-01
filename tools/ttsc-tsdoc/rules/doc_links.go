package tsdocedge

import (
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
					"TSDoc @doc tag must reference a document checkpoint in [[Checkpoint]] format (escape prose mentions as `@doc` in backticks).",
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

		if effectiveEnd-trimmedStart >= 4 &&
			src[trimmedStart:trimmedStart+4] == "@doc" &&
			(trimmedStart+4 == effectiveEnd || src[trimmedStart+4] == ' ' || src[trimmedStart+4] == '\t') {
			visit(parseDocTagLine(src, trimmedStart, effectiveEnd))
		}

		lineStart = rawLineEnd + 1
	}
}

func parseDocTagLine(src string, tagStart, lineEnd int) parsedDocTagLine {
	res := parsedDocTagLine{
		tagStart: tagStart,
		lineEnd:  lineEnd,
	}
	pos := tagStart + 4
	for pos < lineEnd && (src[pos] == ' ' || src[pos] == '\t') {
		pos++
	}
	if lineEnd-pos < 5 || src[pos:pos+2] != "[[" {
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
