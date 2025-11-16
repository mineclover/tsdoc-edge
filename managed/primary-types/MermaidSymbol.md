# [[MermaidSymbol]]

**Source**: `src/doc-symbol/MermaidSymbolExtractor.ts`

## Purpose

Type definition for symbols extracted from Mermaid diagram nodes.

## Type Definition

See [[MermaidSymbol]] implementation in source code.

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

---

## Backlinks

### Referenced By

- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:82
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:122
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:123
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:124
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:125
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:126
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:127
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:128
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:129
- [[MermaidExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:29
- [[MermaidExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:55
- [[MermaidExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:56
- [[MermaidExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:57
- [[MermaidExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:58
- [[MermaidExtractionResult]] → /home/user/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:59
- [[MermaidRelationship]] → /home/user/tsdoc-edge/managed/primary-types/MermaidRelationship.md:52
- [[MermaidRelationship]] → /home/user/tsdoc-edge/managed/primary-types/MermaidRelationship.md:53
- [[MermaidRelationship]] → /home/user/tsdoc-edge/managed/primary-types/MermaidRelationship.md:54

