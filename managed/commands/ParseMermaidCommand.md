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

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:64
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:99
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:242
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:313
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:401
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:402
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:403
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:404
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:33
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:34
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:34
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:35
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:62
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:156
- [[MermaidSymbolExtractor]] → /home/user/tsdoc-edge/managed/doc-symbols/MermaidSymbolExtractor.md:22
- [[MermaidSymbolExtractor]] → /home/user/tsdoc-edge/managed/doc-symbols/MermaidSymbolExtractor.md:32
- [[MermaidSymbolExtractor]] → /home/user/tsdoc-edge/managed/doc-symbols/MermaidSymbolExtractor.md:33
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:104
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:343
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:59
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:97
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:98
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:99
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:100

