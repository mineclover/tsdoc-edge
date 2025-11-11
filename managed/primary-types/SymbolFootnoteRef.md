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
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:83
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:84
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:85
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:86
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:87

