# TSDoc Edge MCP Server

Model Context Protocol server for TSDoc Edge - Provides LLM access to codebase knowledge graph.

## Overview

This MCP server exposes TSDoc Edge's powerful code analysis capabilities through the Model Context Protocol, enabling LLMs like Claude to:

- Search and explore code symbols (classes, functions, methods, etc.)
- Query relationships between code elements
- Analyze codebase structure and metrics
- Get comprehensive work context before editing files
- Access design decisions, contracts, and error patterns

## Prerequisites

1. **TSDoc Edge** installed in your project:
   ```bash
   npm install tsdoc-edge
   ```

2. **Build the symbol database**:
   ```bash
   tsdoc-edge build src
   ```

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "tsdoc-edge": {
      "command": "node",
      "args": ["/path/to/tsdoc-edge/mcp-server/dist/index.js"],
      "env": {
        "TSDOC_WORKSPACE": "/path/to/your/project"
      }
    }
  }
}
```

### Standalone

```bash
# Set workspace (defaults to current directory)
export TSDOC_WORKSPACE=/path/to/your/project

# Run server
npm start
```

## Available Tools

### 1. `tsdoc_search_symbols`

Search for code symbols in the codebase.

**Parameters:**
- `query` (string): Search query for symbol names
- `type` (optional): Filter by symbol type (class, function, method, etc.)
- `limit` (number, default: 20): Maximum results to return
- `offset` (number, default: 0): Pagination offset
- `format` (markdown|json, default: markdown): Response format

**Example:**
```typescript
{
  "query": "Database",
  "type": "class",
  "limit": 10
}
```

### 2. `tsdoc_get_ontology_stats`

Get comprehensive statistics about the codebase knowledge graph.

**Parameters:**
- `detailed` (boolean, default: false): Include detailed breakdown
- `format` (markdown|json, default: markdown): Response format

**Returns:**
- Total nodes and relationships
- Graph density and metrics
- Distribution by type, category, strength
- Explicit vs inferred relationships

### 3. `tsdoc_list_relationships`

List relationships between code symbols with filtering.

**Parameters:**
- `type` (optional): Filter by relationship type
- `category` (optional): Filter by category (structural, data-flow, etc.)
- `strength` (optional): Filter by strength (strong, medium, weak)
- `from` (optional): Filter by source symbol ID
- `to` (optional): Filter by target symbol ID
- `limit` (number, default: 20): Maximum results
- `offset` (number, default: 0): Pagination offset
- `format` (markdown|json, default: markdown): Response format

**Example:**
```typescript
{
  "category": "structural",
  "strength": "strong",
  "limit": 50
}
```

### 4. `tsdoc_get_work_context`

Get comprehensive work context for a file before editing.

**Parameters:**
- `filePath` (string): Relative or absolute path to the file
- `depth` (number, 1-5, default: 2): Context aggregation depth
- `format` (markdown|json, default: markdown): Response format

**Returns:**
- All symbols in the file
- Relationships (dependencies, tests, documentation)
- Test coverage statistics
- Documentation coverage
- Actionable recommendations

**Example:**
```typescript
{
  "filePath": "src/services/UserService.ts",
  "depth": 2
}
```

### 5. `tsdoc_get_design_context`

Get design decisions, contracts, and error patterns for a file.

**Parameters:**
- `filePath` (string): Relative or absolute path to the file
- `format` (markdown|json, default: markdown): Response format

**Returns:**
- Contract specifications (preconditions, postconditions, invariants)
- Design decisions and rationale
- Known error patterns and solutions
- Relationship statistics

### 6. `tsdoc_query_relationships`

Query all relationships for a specific symbol.

**Parameters:**
- `symbolId` (string): Symbol ID to query
- `direction` (incoming|outgoing|both, default: both): Direction of relationships
- `maxDepth` (number, 1-3, default: 1): Maximum traversal depth
- `format` (markdown|json, default: markdown): Response format

**Example:**
```typescript
{
  "symbolId": "class-database-manager",
  "direction": "both",
  "maxDepth": 2
}
```

### 7. `tsdoc_get_symbol_details`

Get detailed information about a specific symbol.

**Parameters:**
- `symbolId` (string): Symbol ID to retrieve
- `includeRelationships` (boolean, default: true): Include relationship info
- `format` (markdown|json, default: markdown): Response format

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## Architecture

```
mcp-server/
├── src/
│   ├── index.ts           # MCP server initialization
│   ├── types.ts           # TypeScript interfaces
│   ├── constants.ts       # Shared constants
│   ├── schemas/           # Zod validation schemas
│   │   └── index.ts
│   ├── services/          # TSDoc CLI integration
│   │   └── tsdocService.ts
│   └── tools/             # MCP tool implementations
│       └── index.ts
├── dist/                  # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## Design Principles

Following MCP best practices:

- **Read-only operations**: All tools are read-only and idempotent
- **Clear naming**: Tools prefixed with `tsdoc_` to avoid conflicts
- **Input validation**: Zod schemas validate all inputs
- **Error handling**: Graceful error messages with helpful guidance
- **Pagination**: Large result sets support limit/offset
- **Multiple formats**: Both markdown (human) and JSON (machine) outputs
- **Response truncation**: Automatic truncation at 25KB with indicators

## Troubleshooting

### "Database not found" error

Run `tsdoc-edge build src` in your project directory to create the symbol database.

### "CLI execution failed" error

Ensure TSDoc Edge is installed and the `dist/cli.js` file exists in your project.

### Slow responses

Large codebases may take time to query. Use pagination and filtering to reduce response size.

## License

MIT
