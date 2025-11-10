# VS Code Integration

VS Code tasks and launch configurations for TSDoc Edge development.

## Setup

Copy these files to your local `.vscode/` directory:

```bash
# Automated setup (recommended)
./scripts/relationship/setup-vscode.sh

# Or copy manually
cp -r .vscode-template .vscode

# Or copy individual files
cp .vscode-template/tasks.json .vscode/
```

> **Note**: `.vscode/` is git-ignored to preserve your personal settings.
> These templates provide a starting point for relationship analysis workflows.

## Quick Access

**Keyboard Shortcut**: `Ctrl+Shift+P` → "Tasks: Run Task"

## Available Tasks

### Relationship Analysis Tasks

**Check Symbol Safety**
- Full safety check: impact + metrics + connections
- Prompts for symbol ID
- Usage: `Ctrl+Shift+P` → "Relationship: Check Symbol Safety"

**Impact Analysis**
- Analyze downstream impact with configurable depth
- Prompts for symbol ID and depth (1-5)
- Usage: `Ctrl+Shift+P` → "Relationship: Impact Analysis"

**Show Critical Symbols**
- Display top 20 most critical symbols
- No prompts required
- Usage: `Ctrl+Shift+P` → "Relationship: Show Critical Symbols"

**Query Symbol**
- Show all relationships for a symbol
- Prompts for symbol ID
- Usage: `Ctrl+Shift+P` → "Relationship: Query Symbol"

**Validate Data**
- Check data integrity
- No prompts required
- Usage: `Ctrl+Shift+P` → "Relationship: Validate Data"

**Find Clusters**
- Discover architectural modules
- No prompts required
- Usage: `Ctrl+Shift+P` → "Relationship: Find Clusters"

**Generate Weekly Report**
- Create comprehensive architecture health report
- Outputs to `.reports/` directory
- Usage: `Ctrl+Shift+P` → "Relationship: Generate Weekly Report"

**Check Git Changes**
- Analyze current git changes for critical symbols
- No prompts required
- Usage: `Ctrl+Shift+P` → "Relationship: Check Git Changes"

**Export to Gephi**
- Export GraphML format for visualization
- No prompts required
- Usage: `Ctrl+Shift+P` → "Relationship: Export to Gephi"

**Export to Graphviz**
- Export DOT format for diagrams
- Structural relationships only
- Usage: `Ctrl+Shift+P` → "Relationship: Export to Graphviz"

**Help**
- Interactive help system
- No prompts required
- Usage: `Ctrl+Shift+P` → "Relationship: Help"

### General TSDoc Tasks

**Build Project**
- Compile TypeScript to JavaScript
- Default build task: `Ctrl+Shift+B`

**Build Database**
- Build symbol database from source code
- Automatically builds project first
- Usage: `Ctrl+Shift+P` → "TSDoc: Build Database"

**Work Context (Current File)**
- Show work context for currently open file
- Automatically uses current file path
- Usage: `Ctrl+Shift+P` → "TSDoc: Work Context (Current File)"

## Tips & Tricks

### Quick Symbol ID

Symbol IDs follow kebab-case pattern:
- `BuildCommand` → `class-buildcommand`
- `executeCommand` → `method-executecommand`
- `SymbolType` → `type-symboltype`

### Context Menu Integration

You can add these tasks to your context menu by editing VS Code settings:

```json
{
  "explorer.experimental.fileNesting.patterns": {
    "tasks.json": "README.md"
  }
}
```

### Keyboard Shortcuts

Add custom keyboard shortcuts in `keybindings.json`:

```json
[
  {
    "key": "ctrl+alt+r c",
    "command": "workbench.action.tasks.runTask",
    "args": "Relationship: Show Critical Symbols"
  },
  {
    "key": "ctrl+alt+r w",
    "command": "workbench.action.tasks.runTask",
    "args": "TSDoc: Work Context (Current File)"
  }
]
```

### Task Chains

Run multiple tasks in sequence:

1. Build Project → Build Database → Show Critical Symbols
2. Check Git Changes → Generate Weekly Report

### Output Management

Tasks open in new panels. Configure in `tasks.json`:
- `"reveal": "always"` - Always show output
- `"reveal": "silent"` - Only show on errors
- `"panel": "shared"` - Reuse panel
- `"panel": "new"` - New panel each time

## Troubleshooting

### "Command not found"

Make sure you've built the project first:
```bash
npm run build
```

### "Symbol not found"

Check symbol exists in database:
```bash
node dist/cli.js list-symbols | grep <symbol-name>
```

### Tasks not appearing

Reload VS Code window:
- `Ctrl+Shift+P` → "Reload Window"

## Integration with npm Scripts

All these tasks can also be run from terminal using npm:

```bash
npm run rel:check class-buildcommand
npm run rel:metrics
npm run safety:check class-buildcommand
npm run report:weekly
npm run git:check-critical
```

## Learn More

- [Relationship System Guide](../docs/relationship-system-guide.md)
- [Quick Reference](../docs/RELATIONSHIP-QUICK-REFERENCE.md)
- [Shell Aliases](../scripts/relationship/setup-aliases.sh)
- [Git Hooks](../scripts/relationship/install-git-hooks.sh)
