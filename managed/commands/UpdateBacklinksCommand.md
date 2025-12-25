# [[UpdateBacklinksCommand]]

**Source**: `src/commands/UpdateBacklinksCommand.ts`

## Purpose

문서 심볼의 역방향 링크 자동 업데이트.

## Process

1. Parse all `[[Symbol]]` references
2. Build reverse index
3. Append "Referenced by" sections
4. Update markdown files

## Related

- [[Document Symbol System]]: 문서 심볼
- Backlinks: 역방향 링크 개념

---

## Backlinks

### Referenced By

- [[CLI Commands]] → /Users/junwoobang/workflow/tsdoc-edge/managed/CLI-COMMANDS.md:178
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:88
- [[Document Symbol System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/document-symbol-system.md:88
- [[BacklinkGenerator]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/BacklinkGenerator.md:22
- [[DocumentSymbolRegistry]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/DocumentSymbolRegistry.md:122
- [[AutoIndexing]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/auto-indexing.md:52
- [[CLI Command Development Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/command-development-guide.md:94
- [[CLI Command Development Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/command-development-guide.md:275
- [[Document Symbol Parser]] → /Users/junwoobang/workflow/tsdoc-edge/managed/parser/DocumentSymbolParser.md:72
- [[Doc Reference]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/doc-reference.md:41
- [[LinkValidator]] → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/LinkValidator.md:64

