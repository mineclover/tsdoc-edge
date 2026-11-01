package tsdocedge

import (
	"strings"

	shimast "github.com/microsoft/typescript-go/shim/ast"
	"github.com/samchon/ttsc/packages/lint/rule"
)

func init() {
	rule.Register(paramSignaturesRule{})
}

const paramSignaturesRuleName = "tsdoc-edge/param-signatures"

var (
	_ rule.Rule          = paramSignaturesRule{}
	_ rule.TypeAwareRule = paramSignaturesRule{}
	_ rule.OptionsRule   = paramSignaturesRule{}
)

// paramSignaturesRule enforces TSDoc `@param <name> - <description>` hyphen
// formatting (with autofix) and validates `@param` names against the attached
// declaration's parameter list (with rename suggestions).
type paramSignaturesRule struct{}

func (paramSignaturesRule) Name() string { return paramSignaturesRuleName }

func (paramSignaturesRule) Visits() []shimast.Kind {
	return []shimast.Kind{
		shimast.KindFunctionDeclaration,
		shimast.KindMethodDeclaration,
		shimast.KindConstructor,
		shimast.KindMethodSignature,
		shimast.KindConstructSignature,
		shimast.KindCallSignature,
		shimast.KindFunctionType,
	}
}

func (paramSignaturesRule) NeedsTypeChecker() bool       { return false }
func (paramSignaturesRule) AcceptsTtscLintOptions() bool { return false }

func (paramSignaturesRule) Check(ctx *rule.Context, node *shimast.Node) {
	if ctx == nil || ctx.File == nil || node == nil {
		return
	}
	block, ok := findAttachedDocBlock(ctx.File, node)
	if !ok {
		return
	}

	actualParams, paramSet, hasDestructuring := extractDeclarationParams(node)
	src := ctx.File.Text()

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

		// Trim trailing whitespace before `*/` on single-line doc comments.
		effectiveEnd := lineEnd
		for effectiveEnd > trimmedStart && (src[effectiveEnd-1] == ' ' || src[effectiveEnd-1] == '\t') {
			effectiveEnd--
		}

		if effectiveEnd-trimmedStart >= 6 &&
			src[trimmedStart:trimmedStart+6] == "@param" &&
			(trimmedStart+6 == effectiveEnd || src[trimmedStart+6] == ' ' || src[trimmedStart+6] == '\t') {
			checkParamTagLine(ctx, src, trimmedStart, effectiveEnd, actualParams, paramSet, hasDestructuring)
		}

		lineStart = rawLineEnd + 1
	}
}

func extractDeclarationParams(node *shimast.Node) (actualParams []string, paramSet map[string]bool, hasDestructuring bool) {
	params := node.Parameters()
	if params == nil {
		if fn := node.FunctionLikeData(); fn != nil && fn.Parameters != nil {
			params = fn.Parameters.Nodes
		}
	}
	if len(params) == 0 {
		return nil, nil, false
	}

	paramSet = make(map[string]bool, len(params))
	for _, p := range params {
		if p == nil {
			continue
		}
		decl := p.AsParameterDeclaration()
		if decl == nil {
			continue
		}
		nameNode := decl.Name()
		if nameNode == nil {
			continue
		}
		switch nameNode.Kind {
		case shimast.KindThisKeyword:
			continue
		case shimast.KindObjectBindingPattern, shimast.KindArrayBindingPattern:
			hasDestructuring = true
		case shimast.KindIdentifier:
			if id := nameNode.AsIdentifier(); id != nil && id.Text != "" {
				if id.Text == "this" {
					continue
				}
				actualParams = append(actualParams, id.Text)
				paramSet[id.Text] = true
			}
		}
	}
	return actualParams, paramSet, hasDestructuring
}

func checkParamTagLine(
	ctx *rule.Context,
	src string,
	tagStart int,
	lineEnd int,
	actualParams []string,
	paramSet map[string]bool,
	hasDestructuring bool,
) {
	pos := tagStart + 6
	for pos < lineEnd && (src[pos] == ' ' || src[pos] == '\t') {
		pos++
	}

	// Skip optional JSDoc `{Type}` annotation if present.
	if pos < lineEnd && src[pos] == '{' {
		depth := 0
		closed := -1
		for i := pos; i < lineEnd; i++ {
			if src[i] == '{' {
				depth++
			} else if src[i] == '}' {
				depth--
				if depth == 0 {
					closed = i
					break
				}
			}
		}
		if closed >= 0 {
			pos = closed + 1
			for pos < lineEnd && (src[pos] == ' ' || src[pos] == '\t') {
				pos++
			}
		}
	}

	if pos >= lineEnd || src[pos] == '-' {
		return
	}

	// Read parameter name token (`foo`, `opts.bar`, `[foo]`, `[foo=default]`, `...args`).
	rawStart := pos
	rawEnd := pos
	if src[pos] == '[' {
		if rel := strings.IndexByte(src[pos+1:lineEnd], ']'); rel >= 0 {
			rawEnd = pos + 1 + rel + 1
		} else {
			for rawEnd < lineEnd && src[rawEnd] != ' ' && src[rawEnd] != '\t' {
				rawEnd++
			}
		}
	} else {
		for rawEnd < lineEnd && src[rawEnd] != ' ' && src[rawEnd] != '\t' && src[rawEnd] != ':' {
			rawEnd++
		}
	}
	if rawEnd <= rawStart {
		return
	}
	rawName := src[rawStart:rawEnd]

	// Check 1: Hyphen format (`@param name - description`).
	afterName := rawEnd
	hasColonSep := false
	if afterName < lineEnd && src[afterName] == ':' {
		hasColonSep = true
		afterName++
	}
	descStart := afterName
	for descStart < lineEnd && (src[descStart] == ' ' || src[descStart] == '\t') {
		descStart++
	}
	if descStart < lineEnd {
		if hasColonSep {
			ctx.ReportRangeFix(
				tagStart,
				descStart,
				"TSDoc @param tag must separate parameter name and description with \"-\" (e.g. \"@param "+rawName+" - ...\").",
				rule.TextEdit{Pos: rawEnd, End: descStart, Text: " - "},
			)
		} else if src[descStart] != '-' {
			ctx.ReportRangeFix(
				tagStart,
				descStart,
				"TSDoc @param tag must separate parameter name and description with \"-\" (e.g. \"@param "+rawName+" - ...\").",
				rule.TextEdit{Pos: descStart, End: descStart, Text: "- "},
			)
		}
	}

	// Check 2: Signature parameter name matching.
	if hasDestructuring {
		return
	}
	rootName, nameStart, nameEnd := extractParamRootName(src, rawStart, rawEnd)
	if rootName == "" || rootName == "this" {
		return
	}
	if paramSet != nil && paramSet[rootName] {
		return
	}

	suggestions := buildParamRenameSuggestions(rootName, nameStart, nameEnd, actualParams)
	ctx.ReportRangeSuggestion(
		nameStart,
		nameEnd,
		"TSDoc @param \""+rootName+"\" does not match any parameter in declaration signature ("+strings.Join(actualParams, ", ")+").",
		suggestions...,
	)
}

func extractParamRootName(src string, rawStart, rawEnd int) (root string, start, end int) {
	s, e := rawStart, rawEnd
	if e-s >= 2 && src[s] == '[' && src[e-1] == ']' {
		s++
		e--
		for s < e && (src[s] == ' ' || src[s] == '\t') {
			s++
		}
		if eq := strings.IndexByte(src[s:e], '='); eq >= 0 {
			e = s + eq
		}
		for e > s && (src[e-1] == ' ' || src[e-1] == '\t') {
			e--
		}
	}
	if e-s > 3 && src[s:s+3] == "..." {
		s += 3
	}
	if dot := strings.IndexByte(src[s:e], '.'); dot >= 0 {
		e = s + dot
	}
	if e <= s {
		return "", rawStart, rawEnd
	}
	return src[s:e], s, e
}

func buildParamRenameSuggestions(rootName string, nameStart, nameEnd int, actualParams []string) []rule.Suggestion {
	if len(actualParams) == 0 {
		return nil
	}
	suggestions := make([]rule.Suggestion, 0, len(actualParams))
	added := make(map[string]bool, len(actualParams))
	strippedRoot := strings.TrimPrefix(rootName, "_")

	// Offer underscore-prefixed/stripped exact matches first.
	for _, p := range actualParams {
		if p == "_"+rootName || p == strippedRoot || strings.TrimPrefix(p, "_") == strippedRoot {
			if !added[p] {
				added[p] = true
				suggestions = append(suggestions, rule.Suggestion{
					Title: "Rename @param to `" + p + "`",
					Edits: []rule.TextEdit{{Pos: nameStart, End: nameEnd, Text: p}},
				})
			}
		}
	}
	// Offer remaining actual signature parameters as explicit choices.
	for _, p := range actualParams {
		if !added[p] {
			added[p] = true
			suggestions = append(suggestions, rule.Suggestion{
				Title: "Rename @param to `" + p + "`",
				Edits: []rule.TextEdit{{Pos: nameStart, End: nameEnd, Text: p}},
			})
		}
	}
	return suggestions
}
