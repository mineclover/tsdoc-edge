---
title: Mermaid Symbol
type: type
category: primary-types
status: active
canonical: true
---

# MermaidSymbol

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

- [[Mermaid Symbol Extractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/parser/MermaidSymbolExtractor.md:50
- [[Mermaid Symbol Extractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/parser/MermaidSymbolExtractor.md:87
- MermaidExtractionResult → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:29
- MermaidSymbol → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/MermaidSymbol.md:11

