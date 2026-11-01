package tsdocedge

import (
	"strings"

	shimast "github.com/microsoft/typescript-go/shim/ast"
	"github.com/samchon/ttsc/packages/lint/rule"
)

func init() {
	rule.Register(tsdocEscapesRule{})
}

const tsdocEscapesRuleName = "tsdoc-edge/tsdoc-escapes"

var (
	_ rule.Rule          = tsdocEscapesRule{}
	_ rule.TypeAwareRule = tsdocEscapesRule{}
	_ rule.OptionsRule   = tsdocEscapesRule{}
)

// tsdocEscapesRule validates @microsoft/tsdoc prose escape rules in real
// `/** ... */` doc blocks (`{`, `}`, `<`, `>`, `@`, inline tag braces, and
// mid-line code fence openers) and offers lossless backslash-escape autofixes.
type tsdocEscapesRule struct{}

func (tsdocEscapesRule) Name() string                 { return tsdocEscapesRuleName }
func (tsdocEscapesRule) Visits() []shimast.Kind       { return []shimast.Kind{shimast.KindSourceFile} }
func (tsdocEscapesRule) NeedsTypeChecker() bool       { return false }
func (tsdocEscapesRule) AcceptsTtscLintOptions() bool { return false }

func (tsdocEscapesRule) Check(ctx *rule.Context, _ *shimast.Node) {
	if ctx == nil || ctx.File == nil {
		return
	}
	cfg := resolveTSDocConfigState(ctx)
	src := ctx.File.Text()
	for _, block := range findDocBlocks(ctx.File) {
		checkDocBlockEscapes(ctx, cfg, src, block)
	}
}

func checkDocBlockEscapes(ctx *rule.Context, cfg *tsdocConfigState, src string, block docBlock) {
	inFence := false
	skipUntil := 0
	var handledCloseBraces map[int]bool

	markHandledBrace := func(pos int) {
		if handledCloseBraces == nil {
			handledCloseBraces = make(map[int]bool, 2)
		}
		handledCloseBraces[pos] = true
	}

	for lineStart := block.bodyStart; lineStart < block.bodyEnd; {
		rawLineEnd, lineEnd, contentStart, trimmedStart := docLineBounds(src, lineStart, block.bodyEnd)

		if isCodeFenceLine(src, trimmedStart, lineEnd) {
			inFence = !inFence
			skipUntil = 0
			lineStart = rawLineEnd + 1
			continue
		}
		if inFence {
			lineStart = rawLineEnd + 1
			continue
		}

		startPos := contentStart
		if skipUntil > 0 {
			if skipUntil > lineEnd {
				lineStart = rawLineEnd + 1
				continue
			}
			if skipUntil > startPos {
				startPos = skipUntil
			}
			skipUntil = 0
		}

		for pos := startPos; pos < lineEnd; pos++ {
			ch := src[pos]

			// Backslash escapes the next character in TSDoc prose.
			if ch == '\\' {
				pos++
				continue
			}

			// Inline code spans and mid-line code fence detection.
			if ch == '`' {
				if lineEnd-pos >= 3 && src[pos:pos+3] == "```" {
					// Because line-start ``` was already handled above, reaching
					// here guarantees non-whitespace prose preceded ``` on this line.
					ctx.ReportRange(pos, pos+3, "Code fence opening backticks must appear at the start of a line.")
					for pos+1 < lineEnd && src[pos+1] == '`' {
						pos++
					}
					continue
				}
				if rel := strings.IndexByte(src[pos+1:lineEnd], '`'); rel >= 0 {
					pos = pos + 1 + rel
					continue
				}
				continue
			}

			switch ch {
			case '{':
				if pos+2 < lineEnd && src[pos+1] == '@' && isTagStart(src[pos+2]) {
					tagEnd := pos + 3
					for tagEnd < lineEnd && isTagContinue(src[tagEnd]) {
						tagEnd++
					}
					// An inline tag opener `{@tag` must be followed by whitespace, `}`, or EOL.
					if tagEnd == lineEnd || src[tagEnd] == ' ' || src[tagEnd] == '\t' || src[tagEnd] == '}' {
						tag := src[pos+1 : tagEnd]
						syntaxKind, known := cfg.allowed[tag]
						closePos := findMatchingInlineTagBrace(src, block, rawLineEnd, lineEnd, tagEnd)

						if known && syntaxKind != "inline" {
							edits := []rule.TextEdit{
								{Pos: pos, End: pos, Text: "\\"},
								{Pos: pos + 1, End: pos + 1, Text: "\\"},
							}
							reportEnd := tagEnd
							if closePos >= 0 {
								edits = append(edits, rule.TextEdit{Pos: closePos, End: closePos, Text: "\\"})
								markHandledBrace(closePos)
								if closePos < lineEnd {
									reportEnd = closePos + 1
								}
							}
							ctx.ReportRangeFix(
								pos,
								reportEnd,
								"TSDoc tag \""+tag+"\" is not an inline tag and must not be enclosed in \"{ }\" braces.",
								edits...,
							)
							pos = tagEnd - 1
							continue
						}

						// Valid inline tag (or unknown tag owned by check-tag-names).
						if closePos >= 0 {
							markHandledBrace(closePos)
							if closePos < lineEnd {
								pos = closePos
								continue
							}
							skipUntil = closePos + 1
							pos = lineEnd
							continue
						}

						// Unclosed inline tag `{@link ...` without matching `}`.
						ctx.ReportRangeFix(
							pos,
							tagEnd,
							"TSDoc inline tag \""+tag+"\" is missing its closing \"}\".",
							rule.TextEdit{Pos: pos, End: pos, Text: "\\"},
							rule.TextEdit{Pos: pos + 1, End: pos + 1, Text: "\\"},
						)
						pos = tagEnd - 1
						continue
					}
				}

				ctx.ReportRangeFix(
					pos,
					pos+1,
					"Unescaped \"{\" in TSDoc prose looks like a malformed inline tag; escape with \"\\\" or wrap code in backticks.",
					rule.TextEdit{Pos: pos, End: pos, Text: "\\"},
				)

			case '}':
				if handledCloseBraces != nil && handledCloseBraces[pos] {
					continue
				}
				ctx.ReportRangeFix(
					pos,
					pos+1,
					"Unescaped \"}\" in TSDoc prose should be escaped with \"\\\" or wrapped in backticks.",
					rule.TextEdit{Pos: pos, End: pos, Text: "\\"},
				)

			case '<':
				if gtPos, ok := tryScanValidHTMLTag(src, pos, lineEnd); ok {
					// Advance straight to `gtPos` so both HTML attributes and
					// the closing `>` are consumed cleanly.
					pos = gtPos
					continue
				}
				ctx.ReportRangeFix(
					pos,
					pos+1,
					"Invalid HTML tag syntax in TSDoc (e.g. unescaped generic \"<T, U>\"); escape \"<\" with \"\\\" or wrap in backticks.",
					rule.TextEdit{Pos: pos, End: pos, Text: "\\"},
				)

			case '>':
				ctx.ReportRangeFix(
					pos,
					pos+1,
					"Unescaped \">\" in TSDoc prose should be escaped with \"\\\" or wrapped in backticks.",
					rule.TextEdit{Pos: pos, End: pos, Text: "\\"},
				)

			case '@':
				if pos > contentStart && src[pos-1] != ' ' && src[pos-1] != '\t' {
					ctx.ReportRangeFix(
						pos,
						pos+1,
						"Unescaped \"@\" inside a word/token looks like a TSDoc tag; escape with \"\\\" or wrap in backticks.",
						rule.TextEdit{Pos: pos, End: pos, Text: "\\"},
					)
					for pos+1 < lineEnd && isTagContinue(src[pos+1]) {
						pos++
					}
					continue
				}

				if pos+1 >= lineEnd || !isTagStart(src[pos+1]) {
					ctx.ReportRangeFix(
						pos,
						pos+1,
						"Unescaped \"@\" in TSDoc prose must be followed by a valid tag name or escaped with \"\\\".",
						rule.TextEdit{Pos: pos, End: pos, Text: "\\"},
					)
					continue
				}

				tagEnd := pos + 2
				for tagEnd < lineEnd && isTagContinue(src[tagEnd]) {
					tagEnd++
				}

				if tagEnd < lineEnd && src[tagEnd] != ' ' && src[tagEnd] != '\t' {
					ctx.ReportRangeFix(
						pos,
						tagEnd+1,
						"Token \""+src[pos:tagEnd+1]+"\" looks like a TSDoc tag with invalid trailing character; escape \"@\" with \"\\\" or wrap in backticks.",
						rule.TextEdit{Pos: pos, End: pos, Text: "\\"},
					)
					pos = tagEnd - 1
					continue
				}

				tag := src[pos:tagEnd]
				if cfg.allowed[tag] == "inline" {
					ctx.ReportRange(
						pos,
						tagEnd,
						"Inline TSDoc tag \""+tag+"\" must be enclosed in \"{ }\" braces.",
					)
				}
				pos = tagEnd - 1
			}
		}

		lineStart = rawLineEnd + 1
	}
}

// findMatchingInlineTagBrace searches for the matching unescaped `}` of an
// `{@tag ...}` span starting at `fromPos` on the current line and continuing
// across subsequent non-fenced lines in `block`.
func findMatchingInlineTagBrace(src string, block docBlock, curRawLineEnd, curLineEnd, fromPos int) int {
	if closePos := findUnescapedRightBraceOnLine(src, fromPos, curLineEnd); closePos >= 0 {
		return closePos
	}
	for nextLineStart := curRawLineEnd + 1; nextLineStart < block.bodyEnd; {
		rawEnd, lineEnd, contentStart, trimmedStart := docLineBounds(src, nextLineStart, block.bodyEnd)
		if isCodeFenceLine(src, trimmedStart, lineEnd) {
			return -1
		}
		if closePos := findUnescapedRightBraceOnLine(src, contentStart, lineEnd); closePos >= 0 {
			return closePos
		}
		nextLineStart = rawEnd + 1
	}
	return -1
}

func findUnescapedRightBraceOnLine(src string, from, lineEnd int) int {
	for i := from; i < lineEnd; i++ {
		switch src[i] {
		case '\\':
			i++
		case '`':
			if rel := strings.IndexByte(src[i+1:lineEnd], '`'); rel >= 0 {
				i = i + 1 + rel
			}
		case '}':
			return i
		}
	}
	return -1
}

// tryScanValidHTMLTag parses `<tag ...>`, `<tag .../>`, or `</tag>` on one line.
// Valid single-type generics like `<void>`, `<User>`, `<CommandResult>` and real
// HTML tags like `<br/>`, `</p>`, `<a href="...">` return `(gtPos, true)`.
// Multi-parameter or complex TypeScript generics like `Map<string, number>` or
// `Promise<A | B>` fail cleanly and return `(-1, false)`.
func tryScanValidHTMLTag(src string, ltPos, lineEnd int) (int, bool) {
	i := ltPos + 1
	if i >= lineEnd {
		return -1, false
	}
	isEndTag := false
	if src[i] == '/' {
		isEndTag = true
		i++
	}
	if i >= lineEnd || !isASCIIAlpha(src[i]) {
		return -1, false
	}
	i++
	for i < lineEnd && (isASCIIAlphaNum(src[i]) || src[i] == '-') {
		i++
	}

	if isEndTag {
		for i < lineEnd && (src[i] == ' ' || src[i] == '\t') {
			i++
		}
		if i < lineEnd && src[i] == '>' {
			return i, true
		}
		return -1, false
	}

	for {
		wsStart := i
		for i < lineEnd && (src[i] == ' ' || src[i] == '\t') {
			i++
		}
		if i >= lineEnd {
			return -1, false
		}
		if src[i] == '>' {
			return i, true
		}
		if src[i] == '/' {
			if i+1 < lineEnd && src[i+1] == '>' {
				return i + 1, true
			}
			return -1, false
		}
		// Attributes must be separated from the tag name or previous attribute by whitespace.
		if i == wsStart {
			return -1, false
		}
		if !isHTMLAttrStart(src[i]) {
			return -1, false
		}
		i++
		for i < lineEnd && isHTMLAttrContinue(src[i]) {
			i++
		}
		wsBeforeEq := i
		for i < lineEnd && (src[i] == ' ' || src[i] == '\t') {
			i++
		}
		if i < lineEnd && src[i] == '=' {
			i++
			for i < lineEnd && (src[i] == ' ' || src[i] == '\t') {
				i++
			}
			if i >= lineEnd {
				return -1, false
			}
			if src[i] == '"' || src[i] == '\'' {
				quote := src[i]
				i++
				closeQuote := strings.IndexByte(src[i:lineEnd], quote)
				if closeQuote < 0 {
					return -1, false
				}
				i += closeQuote + 1
			} else {
				valStart := i
				for i < lineEnd && isHTMLUnquotedAttrVal(src[i]) {
					i++
				}
				if i == valStart {
					return -1, false
				}
			}
		} else {
			// Restore cursor to wsBeforeEq so the next loop iteration observes
			// the separating whitespace before the next attribute or `>`.
			i = wsBeforeEq
		}
	}
}

func isHTMLAttrStart(b byte) bool {
	return isASCIIAlpha(b) || b == '_' || b == ':'
}

func isHTMLAttrContinue(b byte) bool {
	return isASCIIAlphaNum(b) || b == '_' || b == '.' || b == ':' || b == '-'
}

func isHTMLUnquotedAttrVal(b byte) bool {
	return isASCIIAlphaNum(b) || b == '_' || b == '.' || b == ':' || b == '-'
}
