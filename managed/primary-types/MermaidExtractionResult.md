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
