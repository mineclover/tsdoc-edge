---
title: Mermaid Symbol
type: type
category: primary-types
status: active
canonical: true
---

# [[MermaidSymbol]]

**Source**: `src/doc-symbol/MermaidSymbolExtractor.ts`

## Purpose

Type definition for symbols extracted from Mermaid diagram nodes.

## Type Definition

See MermaidSymbol implementation in source code.

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
- MermaidExtractionResult - Full result type
- MermaidRelationship - Relationship type

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[Primary Types Index]] → managed/primary-types/index.md:21

### Implemented By

- MermaidSymbol → src/doc-symbol/MermaidSymbolExtractor.ts:1

