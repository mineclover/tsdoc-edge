---
title: Mermaid Relationship
type: type
category: primary-types
status: active
canonical: true
---

# [[MermaidRelationship]]

**Source**: `src/doc-symbol/MermaidSymbolExtractor.ts`

## Purpose

Type for relationships extracted from Mermaid diagram edges.

## Type Definition

See MermaidRelationship implementation in source code.

## Fields

- **from**: Source node ID
- **to**: Target node ID
- **edgeType**: Edge type (-->, -.->, ==>)
- **label**: Edge label (optional)
- **direction**: unidirectional | bidirectional

## Usage

Part of MermaidExtractionResult as the `relationships` array field.

## Related

- MermaidExtractionResult - Contains this
- [[Mermaid Symbol Extractor]] - Creates this

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[Mermaid Symbol Extractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/parser/MermaidSymbolExtractor.md:51
- MermaidExtractionResult → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:30
- MermaidRelationship → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/MermaidRelationship.md:11
- MermaidSymbol → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/MermaidSymbol.md:33

