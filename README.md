# TSDoc Edge

**SSOT(Single Source of Truth) Documentation Connectivity Platform**

TSDoc Edge tracks all symbols in your TypeScript codebase, maps relationships between them, and ensures perfect alignment between code and documentation.

---

## Quick Start

```bash
# Install
npm install -g tsdoc-edge

# Initialize & Build
tsdoc-edge init
tsdoc-edge build src

# Get context before modifying any file (most important!)
tsdoc-edge work-context src/path/to/file.ts
```

The `work-context` command provides everything you need before modifying code:
- Related documentation
- Dependencies and dependents
- Test coverage
- Impact analysis

---

## Key Features

| Feature | Command | Description |
|---------|---------|-------------|
| Work Context | `wc <file>` | Complete context before file modification |
| Relationship Analysis | `relationship stats` | 13 relationship types, 10 categories |
| Impact Analysis | `relationship impact <symbol>` | Change impact assessment |
| Quality Check | `lint` | Code health, docs, tests, relationships |
| Documentation | `index-docs managed` | Index `[[Symbol]]` references |

---

## Core Concepts

### Symbol Graph
Every function, class, interface is tracked as a node with relationships:
- **code-dependency**: Import/usage relationships
- **io-dependency**: Data flow (parameters, returns)
- **test-coverage**: Test file relationships
- **calls**: Function call graph

### Document Symbols
Use `[[SymbolName]]` in markdown to create bidirectional links:
```markdown
# [[UserService]]
This service uses [[DatabaseManager]] for storage.
```

---

## Common Workflows

### Before Modifying Code
```bash
tsdoc-edge wc src/services/UserService.ts
```

### Refactoring Safely
```bash
tsdoc-edge relationship query <symbol>  # Dependencies
tsdoc-edge who-uses <symbol>            # Reverse dependencies
tsdoc-edge relationship impact <id>     # Full impact analysis
```

### Quality Checks
```bash
tsdoc-edge lint                  # All checks
tsdoc-edge health src            # Code health report
tsdoc-edge suggest               # Improvement suggestions
```

### Documentation Management
```bash
tsdoc-edge index-docs managed    # Index documents
tsdoc-edge validate-docs         # Validate SSOT
tsdoc-edge update-backlinks      # Update backlinks
```

---

## Configuration

Create `.tsdoc.config.json`:

```json
{
  "project": {
    "name": "my-project",
    "srcDirs": ["src"]
  },
  "paths": {
    "databasePath": ".tsdoc/symbols.db"
  },
  "documentManagement": {
    "managedDirs": ["managed"]
  }
}
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [User Guide](managed/user-guide.md) | Complete user guide |
| [Commands Index](managed/commands/index.md) | All CLI commands |
| [Relationship Guide](managed/guides/relationship-analysis-guide.md) | Relationship analysis |
| [Quick Start](managed/quick-start.md) | 5-minute start |
| [LSP Integration](managed/features/lsp-integration.md) | IDE integration |

---

## Project Structure

```
src/
├── analyzer/      # Code analysis (health, coverage)
├── commands/      # CLI commands (81 commands)
├── doc-symbol/    # [[Symbol]] system
├── graph/         # Symbol graph
├── lsp/           # LSP server
├── parser/        # TSDoc parsing
├── storage/       # SQLite + JSONL
└── types/         # Type definitions
```

---

## Development

```bash
npm run build      # Compile TypeScript
npm run dev        # Watch mode
npm test           # Run tests
```

---

## Statistics

| Metric | Value |
|--------|-------|
| CLI Commands | 81 |
| Test Suites | 195 |
| Tests | 2,873 |
| Health Score | 74/100 |

---

## License

MIT
