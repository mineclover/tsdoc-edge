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
