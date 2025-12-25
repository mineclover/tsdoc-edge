---
title: Mermaid Symbol Extractor
type: component
category: parser
status: active
canonical: true
---

# [[Mermaid Symbol Extractor]]

**Source**: `src/doc-symbol/MermaidSymbolExtractor.ts`

## Purpose

Extract symbol references from Mermaid diagrams to enable diagram-driven documentation.

## Responsibility

Parse Mermaid diagram syntax and extract:
- Node labels as potential symbol names
- Relationships between nodes
- Diagram metadata (type, orientation, subgraphs)
- Symbol references for validation

## Core Functionality

### extract
```typescript
extract(content: string, filePath: string): MermaidExtractionResult
```

**Process**:
1. Extract Mermaid code blocks from markdown
2. Parse diagram type and orientation
3. Extract node definitions (e.g., `A[Label]`)
4. Clean and normalize node labels
5. Filter out non-symbol patterns (100+ patterns)
6. Extract relationships (arrows: `-->`, `-.->`, `==>`)
7. Detect subgraphs
8. Return symbols, relationships, and metadata

## Non-Symbol Filtering

Filters 100+ patterns to prevent false positives:
- **Node IDs**: A, B, CD, L1A, L2B
- **File patterns**: .mmd, .db, .jsonl
- **Workflow verbs**: Create, Parse, Generate
- **Technical terms**: Return Type, Parameter Type
- **Labels**: Linter:, Test:, Extract:
- **Operators**: ≥, ≤, =, ?
- **Categories**: Structural, Behavioral, Data Flow
- **Korean characters**: 한글

## Output Type

Returns MermaidExtractionResult:

**Structure**:
- `metadata`: Diagram metadata (type, orientation, title, subgraphs)
- `symbols`: Array of MermaidSymbol
- `relationships`: Array of MermaidRelationship
- `symbolReferences`: Symbol reference strings for validation

## Relationship Mapping

Maps relationship types to canonical names:
```typescript
{
  'code-dependency': 'Code Dependency',
  'io-dependency': 'IO Dependency',
  'calls': 'Call Relationships',
  'inheritance': 'Inheritance',
  // ... 17 total types
}
```

## Integration

Used by:
- [[ValidateSymbolRefsCommand]] - Validate diagram symbols
- [[ExploreEntrypointCommand]] - Explore from diagrams
- [[ParseMermaidCommand]] - Extract diagram metadata

## Example

**Input**:
```mermaid
graph TD
    A[BuildCommand] --> B[DatabaseManager]
    B --> C[SymbolRegistry]

    subgraph Core
        B
        C
    end
```

**Output**:
```typescript
{
  metadata: {
    diagramType: "graph",
    orientation: "TD",
    subgraphs: [{ id: "Core", title: "Core" }]
  },
  symbols: [
    { symbolName: "BuildCommand", nodeId: "A" },
    { symbolName: "DatabaseManager", nodeId: "B", subgraph: "Core" },
    { symbolName: "SymbolRegistry", nodeId: "C", subgraph: "Core" }
  ],
  relationships: [
    { from: "A", to: "B", edgeType: "solid" },
    { from: "B", to: "C", edgeType: "solid" }
  ],
  symbolReferences: ["BuildCommand", "DatabaseManager", "SymbolRegistry"]
}
```

## Pattern Evolution

**v1.0**: Basic node extraction (581 errors)
**v2.0**: Added relationshipTypeMap (-71 errors)
**v3.0**: Added nonSymbolPatterns 40+ patterns (-54 errors)
**v4.0**: Comprehensive filtering 100+ patterns (-48 errors)
**v5.0**: Smart nodeId handling (-32 errors)

## Related

- TSDoc Symbol Parser - Code parser
- [[Document Symbol Parser]] - Markdown parser
- [[ValidateSymbolRefsCommand]] - Main consumer
- MermaidSymbol - Output type

---

**Category**: Parser
**Status**: Active - Highly Optimized

---

## Backlinks

### Referenced By

- [[ParseMermaidCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/ParseMermaidCommand.md:39
- [[Document Symbol Parser]] → /Users/junwoobang/workflow/tsdoc-edge/managed/parser/DocumentSymbolParser.md:85
- MermaidExtractionResult → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:22
- MermaidExtractionResult → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/MermaidExtractionResult.md:28
- MermaidRelationship → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/MermaidRelationship.md:28
- MermaidSymbol → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/MermaidSymbol.md:25
- MermaidSymbol → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/MermaidSymbol.md:31

