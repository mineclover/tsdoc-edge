# TSDoc Edge

**SSOT(Single Source of Truth) Documentation Connectivity Platform**

TSDoc Edge tracks all symbols in your TypeScript codebase, maps relationships between them, and ensures perfect alignment between code and documentation.

---

## Why TSDoc Edge?

### The Problem

When modifying code in a large TypeScript project, you face these questions:

- "What will break if I change this function?"
- "Where is this type used?"
- "Is there documentation I should update?"
- "Are there tests covering this code?"

Finding answers requires jumping between files, grepping through code, and hoping you didn't miss anything.

### The Solution

**One command before any code change:**

```bash
tsdoc-edge wc src/services/UserService.ts
```

**Output:**
```
Work Context: UserService.ts

📊 Summary
  Symbols: 12 | Relationships: 85 | Test Coverage: 85%

📦 This file depends on:
  → DatabaseManager, Logger, AuthService

🔗 Files that depend on this:
  ← UserController, AdminPanel, UserTests (8 files)

📚 Related Documentation:
  → managed/features/user-management.md

💡 Recommendations:
  • High impact file - review changes carefully
  • 2 test files cover this code
```

Now you know exactly what you're touching before making any changes.

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

## Learning Path

```
1. Quick Start (5 min)     → managed/quick-start.md
   ↓
2. Usage Scenarios         → managed/guides/usage-scenarios.md
   ↓
3. Commands Reference      → managed/COMMANDS.md
   ↓
4. Advanced: LSP/IDE       → managed/features/lsp-integration.md
```

## Documentation

| Document | Description |
|----------|-------------|
| [Quick Start](managed/quick-start.md) | 5-minute setup guide |
| [Usage Scenarios](managed/guides/usage-scenarios.md) | Real-world workflows |
| [Commands Index](managed/COMMANDS.md) | All 55 CLI commands |
| [Relationship Guide](managed/guides/relationship-analysis-guide.md) | Dependency analysis |
| [LSP Integration](managed/features/lsp-integration.md) | IDE integration |

---

## Project Structure

```
src/
├── analyzer/      # Code analysis (health, coverage)
├── commands/      # CLI commands (55 commands)
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
| CLI Commands | 55 |
| Symbols | 6,726 |
| Relationships | 38,704 |
| Relationship Types | 13/28 (46%) |
| Test Suites | 191 |
| Tests | 2,755 |
| Build Time | 11s |

---

## License

MIT
