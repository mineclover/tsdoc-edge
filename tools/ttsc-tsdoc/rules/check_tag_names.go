// Package tsdocedge is a project-local `@ttsc/lint` contributor.
//
// In 0.34.3+, `tsdoc-edge/tsdoc-config` (ProjectRule + ProjectInputRule +
// HintRule) loads `tsdoc.json` once per Program cycle via ProjectInputReader
// and shares the compiled allow-list through `ProjectContext.SetState`.
// `tsdoc-edge/check-tag-names` reads that shared state in O(1), falling back to
// explicit `{"tags": [...]}` rule options when the project rule is absent/off.
package tsdocedge

import (
	"strings"

	shimast "github.com/microsoft/typescript-go/shim/ast"
	"github.com/samchon/ttsc/packages/lint/rule"
)

func init() {
	rule.Register(checkTagNames{})
}

var (
	_ rule.Rule          = checkTagNames{}
	_ rule.TypeAwareRule = checkTagNames{}
	_ rule.OptionsRule   = checkTagNames{}
)

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

// forEachTag yields `@tag` spans for block tags at line start and inline `{@tag`.
// Lines inside ``` fences, inline code spans, and backslash-escaped tokens are skipped.
func forEachTag(src string, block docBlock, visit func(start, end int)) {
	inFence := false
	for lineStart := block.bodyStart; lineStart < block.bodyEnd; {
		rawLineEnd, lineEnd, _, trimmedStart := docLineBounds(src, lineStart, block.bodyEnd)
		if isCodeFenceLine(src, trimmedStart, lineEnd) {
			inFence = !inFence
		} else if !inFence {
			prevUnescapedBrace := -2
			for i := trimmedStart; i < lineEnd; i++ {
				b := src[i]
				if b == '\\' {
					i++
					continue
				}
				if b == '`' {
					if rel := strings.IndexByte(src[i+1:lineEnd], '`'); rel >= 0 {
						i = i + 1 + rel
						continue
					}
				}
				if b == '{' {
					prevUnescapedBrace = i
					continue
				}
				if b == '@' && i+1 < lineEnd && isTagStart(src[i+1]) {
					isBlockTag := i == trimmedStart
					isInlineTag := prevUnescapedBrace == i-1
					if !isBlockTag && !isInlineTag {
						continue
					}
					j := i + 2
					for j < lineEnd && isTagContinue(src[j]) {
						j++
					}
					// Only treat as a tag when terminated by whitespace, EOL, or `}` (for inline tags).
					// Tokens like `@microsoft/tsdoc` are invalid-trailing-char tokens owned by `tsdoc-escapes`.
					if j == lineEnd || src[j] == ' ' || src[j] == '\t' || (isInlineTag && src[j] == '}') {
						visit(i, j)
					}
					i = j - 1
				}
			}
		}
		lineStart = rawLineEnd + 1
	}
}
