package tsdocedge

import (
	"sort"
	"strings"
	"sync"

	shimast "github.com/microsoft/typescript-go/shim/ast"
	shimscanner "github.com/microsoft/typescript-go/shim/scanner"
	"github.com/samchon/ttsc/packages/lint/rule"
)

// docBlock represents a real `/** ... */` TSDoc comment in source byte offsets.
// `start` points at the opening `/` of `/**`, `end` points immediately after
// the closing `*/`, `bodyStart` is `start + 3`, and `bodyEnd` is `end - 2`.
type docBlock struct {
	start     int
	end       int
	bodyStart int
	bodyEnd   int
}

type opaqueSpan struct {
	pos int
	end int
}

var (
	defaultTSDocConfigOnce  sync.Once
	defaultTSDocConfigValue *tsdocConfigState
)

// defaultTSDocConfigState builds an immutable fallback tag state containing the
// 29 standard @microsoft/tsdoc tags when `tsdoc-edge/tsdoc-config` is inactive.
func defaultTSDocConfigState() *tsdocConfigState {
	defaultTSDocConfigOnce.Do(func() {
		allowed := make(map[string]string, len(standardTSDocTags))
		ordered := make([]tsdocTagSpec, len(standardTSDocTags))
		copy(ordered, standardTSDocTags)
		for _, std := range standardTSDocTags {
			allowed[std.TagName] = std.SyntaxKind
		}
		sort.Slice(ordered, func(i, j int) bool {
			return ordered[i].TagName < ordered[j].TagName
		})
		defaultTSDocConfigValue = &tsdocConfigState{
			allowed: allowed,
			ordered: ordered,
		}
	})
	return defaultTSDocConfigValue
}

// resolveTSDocConfigState reads the active `tsdoc-edge/tsdoc-config` state for
// the current Program cycle, falling back to `defaultTSDocConfigState()`.
func resolveTSDocConfigState(ctx *rule.Context) *tsdocConfigState {
	if ctx != nil {
		proj := ctx.ProjectResult(tsdocConfigRuleName)
		if proj.Status == rule.ProjectRulePassed {
			if state, ok := proj.State.(*tsdocConfigState); ok && state != nil && len(state.allowed) > 0 {
				return state
			}
		}
	}
	return defaultTSDocConfigState()
}

// findDocBlocks enumerates real `/** ... */` MultiLineCommentTrivia spans
// outside parser-owned literal, template, and JSX-text tokens, so `/** ... */`
// inside string/template/regex literals is never scanned.
func findDocBlocks(file *shimast.SourceFile) []docBlock {
	if file == nil {
		return nil
	}
	src := file.Text()
	if len(src) < 5 {
		return nil
	}
	opaque := collectOpaqueTokenSpans(file)
	scanner := shimscanner.NewScanner()
	var blocks []docBlock

	cursor := 0
	for _, span := range opaque {
		if cursor < span.pos {
			blocks = scanDocBlocksInGap(scanner, src, cursor, span.pos, blocks)
		}
		if span.end > cursor {
			cursor = span.end
		}
	}
	if cursor < len(src) {
		blocks = scanDocBlocksInGap(scanner, src, cursor, len(src), blocks)
	}
	return blocks
}

func scanDocBlocksInGap(scanner *shimscanner.Scanner, src string, from, to int, out []docBlock) []docBlock {
	if scanner == nil || from < 0 || to-from < 5 || to > len(src) {
		return out
	}
	scanner.SetText(src[from:to])
	scanner.SetSkipTrivia(false)
	for {
		kind := scanner.Scan()
		if kind == shimast.KindEndOfFile {
			return out
		}
		if kind != shimast.KindMultiLineCommentTrivia {
			continue
		}
		start := from + scanner.TokenStart()
		end := from + scanner.TokenEnd()
		if block, ok := parseDocBlockBounds(src, start, end); ok {
			out = append(out, block)
		}
	}
}

func parseDocBlockBounds(src string, start, end int) (docBlock, bool) {
	if start < 0 || end > len(src) || end-start < 5 {
		return docBlock{}, false
	}
	if src[start] != '/' || src[start+1] != '*' || src[start+2] != '*' {
		return docBlock{}, false
	}
	// Exclude empty `/**/` and multi-star banner comments `/***...*/`.
	if src[start+3] == '/' || src[start+3] == '*' {
		return docBlock{}, false
	}
	return docBlock{
		start:     start,
		end:       end,
		bodyStart: start + 3,
		bodyEnd:   end - 2,
	}, true
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
		(kind >= shimast.KindFirstTemplateToken && kind <= shimast.KindLastTemplateToken) ||
		kind == shimast.KindJsxText ||
		kind == shimast.KindJsxTextAllWhiteSpaces
}

// findAttachedDocBlock returns the nearest preceding `/** ... */` comment
// attached to `node` (with only whitespace or linter/TS directive line comments
// between `block.end` and `node`'s declaration tokens).
func findAttachedDocBlock(file *shimast.SourceFile, node *shimast.Node) (docBlock, bool) {
	if file == nil || node == nil {
		return docBlock{}, false
	}
	if block, ok := findImmediatePrecedingDocBlock(file, node); ok {
		return block, true
	}
	// Handle `@Decorator() /** @param ... */ method(...)` where decorators
	// precede the TSDoc comment inside the declaration's leading modifiers.
	if block, ok := findPostDecoratorDocBlock(file, node); ok {
		return block, true
	}
	// Handle `/** @param ... */ type Callback = (x: string) => void;` and
	// `interface Foo { /** @param ... */ fn: (x: string) => void; }`.
	if node.Kind == shimast.KindFunctionType && node.Parent != nil {
		switch node.Parent.Kind {
		case shimast.KindTypeAliasDeclaration:
			if alias := node.Parent.AsTypeAliasDeclaration(); alias != nil && alias.Type == node {
				return findImmediatePrecedingDocBlock(file, node.Parent)
			}
		case shimast.KindPropertySignature:
			if prop := node.Parent.AsPropertySignatureDeclaration(); prop != nil && prop.Type == node {
				return findImmediatePrecedingDocBlock(file, node.Parent)
			}
		case shimast.KindPropertyDeclaration:
			if prop := node.Parent.AsPropertyDeclaration(); prop != nil && prop.Type == node {
				if block, ok := findImmediatePrecedingDocBlock(file, node.Parent); ok {
					return block, true
				}
				return findPostDecoratorDocBlock(file, node.Parent)
			}
		}
	}
	return docBlock{}, false
}

func findImmediatePrecedingDocBlock(file *shimast.SourceFile, node *shimast.Node) (docBlock, bool) {
	src := file.Text()
	from := node.Pos()
	to := shimscanner.GetTokenPosOfNode(node, file, false)
	return lastAttachedDocBlockInTrivia(src, from, to)
}

func findPostDecoratorDocBlock(file *shimast.SourceFile, node *shimast.Node) (docBlock, bool) {
	src := file.Text()
	tokenPos := shimscanner.GetTokenPosOfNode(node, file, false)
	if tokenPos < 0 || tokenPos >= len(src) || src[tokenPos] != '@' {
		return docBlock{}, false
	}
	lastDecoratorEnd := -1
	nextNodeStart := node.End()
	node.ForEachChild(func(child *shimast.Node) bool {
		if child == nil {
			return false
		}
		if child.Kind == shimast.KindDecorator {
			if child.End() > lastDecoratorEnd {
				lastDecoratorEnd = child.End()
			}
			return false
		}
		cPos := shimscanner.GetTokenPosOfNode(child, file, false)
		if cPos >= lastDecoratorEnd && cPos < nextNodeStart {
			nextNodeStart = cPos
		}
		return false
	})
	if lastDecoratorEnd < 0 || nextNodeStart <= lastDecoratorEnd {
		return docBlock{}, false
	}
	return lastAttachedDocBlockInTrivia(src, lastDecoratorEnd, nextNodeStart)
}

func lastAttachedDocBlockInTrivia(src string, from, to int) (docBlock, bool) {
	if from < 0 || to > len(src) || to-from < 5 {
		return docBlock{}, false
	}
	scanner := shimscanner.NewScanner()
	scanner.SetText(src[from:to])
	scanner.SetSkipTrivia(false)

	var candidate docBlock
	hasCandidate := false

	for {
		kind := scanner.Scan()
		if kind == shimast.KindEndOfFile {
			break
		}
		start := from + scanner.TokenStart()
		end := from + scanner.TokenEnd()
		switch kind {
		case shimast.KindWhitespaceTrivia, shimast.KindNewLineTrivia:
			continue
		case shimast.KindMultiLineCommentTrivia:
			if block, ok := parseDocBlockBounds(src, start, end); ok {
				if isPackageDocumentationBlock(src, block) {
					hasCandidate = false
					continue
				}
				candidate = block
				hasCandidate = true
			} else {
				// Non-doc block comment after candidate detaches earlier doc block.
				hasCandidate = false
			}
		case shimast.KindSingleLineCommentTrivia:
			if hasCandidate && !isDirectiveLineComment(src[start:end]) {
				hasCandidate = false
			}
		default:
			// Unexpected non-trivia token detaches any earlier doc block.
			hasCandidate = false
		}
	}
	return candidate, hasCandidate
}

func isPackageDocumentationBlock(src string, block docBlock) bool {
	return strings.Contains(src[block.bodyStart:block.bodyEnd], "@packageDocumentation")
}

func isDirectiveLineComment(comment string) bool {
	trimmed := strings.TrimSpace(strings.TrimPrefix(comment, "//"))
	return strings.HasPrefix(trimmed, "eslint-") ||
		strings.HasPrefix(trimmed, "@ts-") ||
		strings.HasPrefix(trimmed, "ttsc-") ||
		strings.HasPrefix(trimmed, "prettier-ignore")
}

// docLineBounds splits `[lineStart, bodyEnd)` up to the next `\n`, returning
// `rawLineEnd` (index of `\n` or `bodyEnd`), `lineEnd` (without trailing `\r`),
// `contentStart` (after leading indent and optional `*` + single space/tab),
// and `trimmedStart` (after any further horizontal whitespace).
func docLineBounds(src string, lineStart, bodyEnd int) (rawLineEnd, lineEnd, contentStart, trimmedStart int) {
	rawLineEnd = lineStart
	for rawLineEnd < bodyEnd && src[rawLineEnd] != '\n' {
		rawLineEnd++
	}
	lineEnd = rawLineEnd
	if lineEnd > lineStart && src[lineEnd-1] == '\r' {
		lineEnd--
	}
	i := lineStart
	for i < lineEnd && (src[i] == ' ' || src[i] == '\t' || src[i] == '\r') {
		i++
	}
	if i < lineEnd && src[i] == '*' {
		i++
		if i < lineEnd && (src[i] == ' ' || src[i] == '\t') {
			i++
		}
	}
	contentStart = i
	trimmedStart = contentStart
	for trimmedStart < lineEnd && (src[trimmedStart] == ' ' || src[trimmedStart] == '\t') {
		trimmedStart++
	}
	return rawLineEnd, lineEnd, contentStart, trimmedStart
}

func isCodeFenceLine(src string, trimmedStart, lineEnd int) bool {
	return lineEnd-trimmedStart >= 3 && src[trimmedStart:trimmedStart+3] == "```"
}

func isASCIIAlpha(b byte) bool {
	return (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z')
}

func isASCIIAlphaNum(b byte) bool {
	return isASCIIAlpha(b) || (b >= '0' && b <= '9')
}

func isTagStart(b byte) bool {
	return isASCIIAlpha(b)
}

func isTagContinue(b byte) bool {
	return isASCIIAlphaNum(b)
}
