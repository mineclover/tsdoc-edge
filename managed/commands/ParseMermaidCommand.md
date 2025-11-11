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

- [[MermaidSymbolExtractor]] → /home/user/tsdoc-edge/managed/doc-symbols/MermaidSymbolExtractor.md:22
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:59

