// Package tsdocedge is a project-local `@ttsc/lint` contributor.
//
// It hosts TSDoc rules that need the project's tsdoc.json tag set. The tag set
// is not read from disk here: lint.config.ts derives it from tsdoc.json plus
// @microsoft/tsdoc's StandardTags and passes it as rule options, so tsdoc.json
// stays the single source of truth and the Go side stays I/O-free.
package tsdocedge

import (
  shimast "github.com/microsoft/typescript-go/shim/ast"
  "github.com/samchon/ttsc/packages/lint/rule"
)

func init() {
  rule.Register(checkTagNames{})
}

// checkTagNames reports block and inline tags missing from the configured set.
//
// Options: {"tags": ["@param", "@doc", ...]}. Without options the rule is inert,
// because an empty allow-list would flag every tag.
type checkTagNames struct{}

type checkTagNamesOptions struct {
  Tags []string `json:"tags"`
}

func (checkTagNames) Name() string           { return "tsdoc-edge/check-tag-names" }
func (checkTagNames) Visits() []shimast.Kind { return []shimast.Kind{shimast.KindSourceFile} }

func (checkTagNames) Check(ctx *rule.Context, _ *shimast.Node) {
  if ctx == nil || ctx.File == nil {
    return
  }
  var opts checkTagNamesOptions
  if err := ctx.DecodeOptions(&opts); err != nil || len(opts.Tags) == 0 {
    return
  }
  allowed := make(map[string]struct{}, len(opts.Tags))
  for _, tag := range opts.Tags {
    allowed[tag] = struct{}{}
  }

  src := ctx.File.Text()
  for _, block := range findDocBlocks(src) {
    forEachTag(src, block, func(start, end int) {
      if _, ok := allowed[src[start:end]]; !ok {
        ctx.ReportRange(start, end, "TSDoc tag \""+src[start:end]+"\" is not defined in tsdoc.json.")
      }
    })
  }
}

type docBlock struct{ bodyStart, bodyEnd int }

// findDocBlocks returns the bodies of `/** ... */` comments. String and template
// literals are not tokenized; the rule targets comments, and a `/**` inside a
// string literal in TypeScript source is rare enough to accept for a spike.
func findDocBlocks(src string) []docBlock {
  var blocks []docBlock
  for i := 0; i+2 < len(src); i++ {
    if src[i] != '/' || src[i+1] != '*' || src[i+2] != '*' {
      continue
    }
    if i+3 < len(src) && src[i+3] == '/' { // `/**/` is an empty block comment
      continue
    }
    end := indexFrom(src, "*/", i+3)
    if end < 0 {
      return blocks
    }
    blocks = append(blocks, docBlock{bodyStart: i + 3, bodyEnd: end})
    i = end + 1
  }
  return blocks
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

func indexFrom(s, sub string, from int) int {
  for i := from; i+len(sub) <= len(s); i++ {
    if s[i:i+len(sub)] == sub {
      return i
    }
  }
  return -1
}

func isTagStart(b byte) bool { return (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z') }

func isTagContinue(b byte) bool { return isTagStart(b) || (b >= '0' && b <= '9') }
