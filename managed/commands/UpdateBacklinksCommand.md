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
- [[Backlinks]]: 역방향 링크 개념

---

## Backlinks

### Referenced By

- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:88
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:65
- [[BacklinkGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/BacklinkGenerator.md:22
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:122
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:52
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:65
- [[LinkValidator]] → /home/user/tsdoc-edge/managed/utilities/LinkValidator.md:64

