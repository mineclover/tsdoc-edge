# [[CodeReference]]

**Source**: `src/types/feature/doc-symbol.ts`

## Purpose

Type for document-to-code references.

## Type Definition

```typescript
export interface CodeReference {
  text: string;
  targetFile: string;
  targetSymbol?: string;
  targetMember?: string;
  line: number;
}
```

## Fields

- **text**: Link text
- **targetFile**: Target file path
- **targetSymbol**: Target symbol name
- **targetMember**: Target member
- **line**: Line in document

## Usage

Part of [[ParsedDocSymbols]]:

```typescript
interface ParsedDocSymbols {
  codeReferences: CodeReference[];
  // ...
}
```

## Related

- [[ParsedDocSymbols]] - Contains this type
- [[CodeConnection]] - Code-to-doc references

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[CodeConnection]] → /home/user/tsdoc-edge/managed/primary-types/CodeConnection.md:29
- [[CodeConnection]] → /home/user/tsdoc-edge/managed/primary-types/CodeConnection.md:45
- [[CodeConnection]] → /home/user/tsdoc-edge/managed/primary-types/CodeConnection.md:46
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:59
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:76
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:77
- [[ParsedDocSymbols]] → /home/user/tsdoc-edge/managed/primary-types/ParsedDocSymbols.md:78

