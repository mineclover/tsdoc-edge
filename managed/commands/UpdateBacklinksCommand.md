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

- [[CLI Commands]] → /home/user/tsdoc-edge/managed/CLI-COMMANDS.md:176
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:88
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:181
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:182
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:183
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:184
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:65
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:164
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:165
- [[BacklinkGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/BacklinkGenerator.md:22
- [[BacklinkGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/BacklinkGenerator.md:32
- [[BacklinkGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/BacklinkGenerator.md:33
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:122
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:172
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:173
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:52
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:183
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:184
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:65
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:97
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:98
- [[Doc Reference]] → /home/user/tsdoc-edge/managed/relationships/doc-reference.md:41
- [[Doc Reference]] → /home/user/tsdoc-edge/managed/relationships/doc-reference.md:54
- [[LinkValidator]] → /home/user/tsdoc-edge/managed/utilities/LinkValidator.md:64
- [[LinkValidator]] → /home/user/tsdoc-edge/managed/utilities/LinkValidator.md:74
- [[LinkValidator]] → /home/user/tsdoc-edge/managed/utilities/LinkValidator.md:75

