---
title: Promote Symbol Command
type: command
category: commands
status: active
canonical: true
---

# [[PromoteSymbolCommand]]

**Source**: `src/commands/PromoteSymbolCommand.ts`

## Purpose

Promote auxiliary symbols to primary definitions.

## Promotion

- Validate auxiliary symbol
- Create new primary document
- Update references
- Maintain consistency

## Symbol Count

11 symbols

## Related

- [[Document Symbol System]]: Primary vs Auxiliary

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → managed/README.md:114
- [[DocumentSymbolSystem]] → managed/concepts/document-symbol-system.md:178
- [[Guides & Tutorials]] → managed/guides/index.md:214

### Implemented By

- PromoteSymbolCommand → src/commands/PromoteSymbolCommand.ts:36

