# [[MermaidRelationship]]

**Source**: `src/doc-symbol/MermaidSymbolExtractor.ts`

## Purpose

Type for relationships extracted from Mermaid diagram edges.

## Type Definition

```typescript
export interface MermaidRelationship {
  from: string;
  to: string;
  edgeType: 'solid' | 'dotted' | 'thick';
  label?: string;
  direction: 'unidirectional' | 'bidirectional';
}
```

## Fields

- **from**: Source node ID
- **to**: Target node ID
- **edgeType**: Edge type (-->, -.->, ==>)
- **label**: Edge label (optional)
- **direction**: unidirectional | bidirectional

## Usage

Part of [[MermaidExtractionResult]]:

```typescript
interface MermaidExtractionResult {
  relationships: MermaidRelationship[];
  // ...
}
```

## Related

- [[MermaidExtractionResult]] - Contains this
- [[Mermaid Symbol Extractor]] - Creates this

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:109
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:110
- [[MermaidExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:30
- [[MermaidExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:45
- [[MermaidExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:46
- [[MermaidExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:47
- [[MermaidExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:48
- [[MermaidExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:49
- [[MermaidSymbol]] → /home/user/tsdoc-edge/managed/primary-types/MermaidSymbol.md:33
- [[MermaidSymbol]] → /home/user/tsdoc-edge/managed/primary-types/MermaidSymbol.md:53

