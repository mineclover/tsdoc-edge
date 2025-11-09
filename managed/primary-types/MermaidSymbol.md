# [[MermaidSymbol]]

**Source**: `src/doc-symbol/MermaidSymbolExtractor.ts`

## Purpose

Type definition for symbols extracted from Mermaid diagram nodes.

## Type Definition

```typescript
export interface MermaidSymbol {
  nodeId: string;
  label: string;
  symbolName: string;
  typeHint?: string;
  status?: 'implemented' | 'not-implemented' | 'partial';
  metrics?: {
    count?: number;
    unit?: string;
  };
  subgraph?: string;
}
```

## Fields

- **nodeId**: Node identifier (e.g., A, B, S1)
- **label**: Original node label
- **symbolName**: Cleaned symbol name
- **typeHint**: Symbol type hint (normalized)
- **status**: Implementation status (from emoji)
- **metrics**: Extracted metrics (e.g., "1,968 rels")
- **subgraph**: Subgraph this node belongs to

## Usage

Returned by [[Mermaid Symbol Extractor]]:

```typescript
const extractor = new MermaidSymbolExtractor();
const result = extractor.extract(content, filePath);
const symbols: MermaidSymbol[] = result.symbols;
```

## Related

- [[Mermaid Symbol Extractor]] - Parser
- [[MermaidExtractionResult]] - Full result type
- [[MermaidRelationship]] - Relationship type

---

**Category**: Type Definition
**Status**: Active
