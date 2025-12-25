---
title: Mermaid Extraction Result
type: type
category: primary-types
status: active
canonical: true
---

# MermaidExtractionResult

**Source**: `src/doc-symbol/MermaidSymbolExtractor.ts`

## Purpose

Complete result type from Mermaid diagram extraction.

## Type Definition

See MermaidExtractionResult implementation in source code.

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
- MermaidSymbol - Symbol type
- MermaidRelationship - Relationship type

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[Mermaid Symbol Extractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/parser/MermaidSymbolExtractor.md:46
- MermaidExtractionResult → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:11
- MermaidRelationship → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/MermaidRelationship.md:23
- MermaidRelationship → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/MermaidRelationship.md:27
- MermaidSymbol → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/MermaidSymbol.md:32

