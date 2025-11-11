# [[MermaidExtractionResult]]

**Source**: `src/doc-symbol/MermaidSymbolExtractor.ts`

## Purpose

Complete result type from Mermaid diagram extraction.

## Type Definition

```typescript
export interface MermaidExtractionResult {
  metadata: MermaidMetadata;
  symbols: MermaidSymbol[];
  relationships: MermaidRelationship[];
  symbolReferences: string[];
}
```

## Fields

- **metadata**: Diagram metadata (type, orientation, subgraphs)
- **symbols**: Extracted symbols from nodes
- **relationships**: Relationships between nodes
- **symbolReferences**: Symbol names for validation

## Usage

Returned by [[Mermaid Symbol Extractor]]:

```typescript
const extractor = new MermaidSymbolExtractor();
const result: MermaidExtractionResult = extractor.extract(content, path);
```

## Related

- [[Mermaid Symbol Extractor]] - Returns this
- [[MermaidSymbol]] - Symbol type
- [[MermaidRelationship]] - Relationship type

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:97
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:98
- [[MermaidRelationship]] → /home/user/tsdoc-edge/managed/primary-types/MermaidRelationship.md:23
- [[MermaidRelationship]] → /home/user/tsdoc-edge/managed/primary-types/MermaidRelationship.md:29
- [[MermaidRelationship]] → /home/user/tsdoc-edge/managed/primary-types/MermaidRelationship.md:43
- [[MermaidSymbol]] → /home/user/tsdoc-edge/managed/primary-types/MermaidSymbol.md:32
- [[MermaidSymbol]] → /home/user/tsdoc-edge/managed/primary-types/MermaidSymbol.md:47

