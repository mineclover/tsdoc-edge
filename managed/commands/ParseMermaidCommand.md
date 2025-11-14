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
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:35
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:36
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:37
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:38
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:39
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:40
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:62
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:159
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:160
- [[MermaidSymbolExtractor]] → /home/user/tsdoc-edge/managed/doc-symbols/MermaidSymbolExtractor.md:22
- [[MermaidSymbolExtractor]] → /home/user/tsdoc-edge/managed/doc-symbols/MermaidSymbolExtractor.md:33
- [[MermaidSymbolExtractor]] → /home/user/tsdoc-edge/managed/doc-symbols/MermaidSymbolExtractor.md:34
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:178
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:435
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:436
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:59
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:97
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:98
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:99
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:100
- [[Mermaid Symbol Extractor]] → /home/user/tsdoc-edge/managed/parsers/MermaidSymbolExtractor.md:101

