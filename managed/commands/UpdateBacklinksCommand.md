---
title: Update Backlinks Command
type: command
category: commands
status: active
canonical: true
---

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

- [[CLI Commands]] → managed/CLI-COMMANDS.md:37
- [[TSDoc Edge Documentation]] → managed/README.md:116
- [[SyncCommand]] → managed/commands/SyncCommand.md:24
- [[DocumentSymbolRegistry]] → managed/features/DocumentSymbolRegistry.md:292
- [[AutoIndexing]] → managed/features/auto-indexing.md:72
- [[CLI Command Development Guide]] → managed/guides/command-development-guide.md:250
- [[Document Symbol Parser]] → managed/parser/DocumentSymbolParser.md:90
- [[LinkValidator]] → managed/utilities/LinkValidator.md:78

### Implemented By

- UpdateBacklinksCommand → src/commands/UpdateBacklinksCommand.ts:39

