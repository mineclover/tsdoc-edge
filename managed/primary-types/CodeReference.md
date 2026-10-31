---
title: Code Reference
type: type
category: primary-types
status: active
canonical: true
---

# [[CodeReference]]

**Source**: `src/types/feature/doc-symbol.ts`

## Purpose

Type for document-to-code references.

## Type Definition

See [[CodeReference]] implementation in source code.

## Fields

- **text**: Link text
- **targetFile**: Target file path
- **targetSymbol**: Target symbol name
- **targetMember**: Target member
- **line**: Line in document

## Usage

Part of ParsedDocSymbols as the `codeReferences` array field.

## Related

- ParsedDocSymbols - Contains this type
- [[CodeConnection]] - Code-to-doc references

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[Document Symbol Parser]] → managed/parser/DocumentSymbolParser.md:81
- [[CodeConnection]] → managed/primary-types/CodeConnection.md:40
- [[ParsedDocSymbols]] → managed/primary-types/ParsedDocSymbols.md:107
- [[DocumentSymbol]] → managed/types/DocumentSymbol.md:69

### Implemented By

- CodeReference → src/types/feature/doc-symbol.ts:1

