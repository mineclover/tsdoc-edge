# [[SymbolFootnoteRef]]

**Source**: `src/types/feature/doc-symbol.ts`

## Purpose

Type for symbol footnote references in documentation.

## Type Definition

```typescript
export interface SymbolFootnoteRef {
  id: string;
  symbolName: string;
  line: number;
}
```

## Syntax

- `[^sym-XXX]` - Symbol footnote
- `[^SymbolName]` - Named symbol footnote

## Usage

Part of [[ParsedDocSymbols]]:

```typescript
interface ParsedDocSymbols {
  symbolFootnoteRefs: SymbolFootnoteRef[];
  // ...
}
```

## Related

- [[ParsedDocSymbols]] - Contains this type

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:60
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:89
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:90
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:91
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:92
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:93
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:94
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:95
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:96

