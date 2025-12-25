---
title: Parse Mermaid Command
type: command
category: commands
status: active
canonical: true
---

# [[ParseMermaidCommand]]

Parse Mermaid diagram (.mmd) and extract symbols and relationships.

**Source**: `src/commands/ParseMermaidCommand.ts`

## Purpose

CLI command to parse Mermaid diagrams and extract symbols and relationships.

## Command

```bash
tsdoc-edge parse-mermaid <file.mmd>
```

## Functionality

Parses Mermaid diagram files and extracts:
- Symbols from node labels
- Relationships between nodes
- Diagram metadata
- Subgraph structures

## Output

Displays extracted information:
- Symbol names
- Relationships
- Diagram type and orientation
- Subgraphs

## Use Cases

1. **Debugging**: Verify diagram parsing
2. **Validation**: Check symbol extraction
3. **Testing**: Test Mermaid Symbol Extractor

## Related

- [[Mermaid Symbol Extractor]] - Core parser
- [[ExploreEntrypointCommand]] - Explore from diagrams
- [[ValidateSymbolRefsCommand]] - Validate diagram symbols

---

**Category**: Command
**Status**: Active

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:85
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:122
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:296
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:362
- [[Parser Components]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/MermaidSymbolExtractor.md:22
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:178
- [[Mermaid Symbol Extractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/parser/MermaidSymbolExtractor.md:64

