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

- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:111
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:112
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:113
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:114
- [[MermaidRelationship]] → /home/user/tsdoc-edge/managed/primary-types/MermaidRelationship.md:23
- [[MermaidRelationship]] → /home/user/tsdoc-edge/managed/primary-types/MermaidRelationship.md:29
- [[MermaidRelationship]] → /home/user/tsdoc-edge/managed/primary-types/MermaidRelationship.md:45
- [[MermaidRelationship]] → /home/user/tsdoc-edge/managed/primary-types/MermaidRelationship.md:46
- [[MermaidRelationship]] → /home/user/tsdoc-edge/managed/primary-types/MermaidRelationship.md:47
- [[MermaidRelationship]] → /home/user/tsdoc-edge/managed/primary-types/MermaidRelationship.md:48
- [[MermaidRelationship]] → /home/user/tsdoc-edge/managed/primary-types/MermaidRelationship.md:49
- [[MermaidRelationship]] → /home/user/tsdoc-edge/managed/primary-types/MermaidRelationship.md:50
- [[MermaidSymbol]] → /home/user/tsdoc-edge/managed/primary-types/MermaidSymbol.md:32
- [[MermaidSymbol]] → /home/user/tsdoc-edge/managed/primary-types/MermaidSymbol.md:52
- [[MermaidSymbol]] → /home/user/tsdoc-edge/managed/primary-types/MermaidSymbol.md:53
- [[MermaidSymbol]] → /home/user/tsdoc-edge/managed/primary-types/MermaidSymbol.md:54
- [[MermaidSymbol]] → /home/user/tsdoc-edge/managed/primary-types/MermaidSymbol.md:55

