# Local-First Development Guide

Complete guide to using TSDoc Edge's relationship analysis system in your daily workflow.

## Philosophy

**Local-First**: All tools work without external dependencies, immediately after clone.
**Multiple Entry Points**: Choose your preferred workflow - CLI, npm, shell, IDE, or git hooks.
**Progressive Enhancement**: Start simple, add automation as needed.

---

## Quick Setup (5 minutes)

```bash
# 1. Clone and build
git clone <repo>
cd tsdoc-edge
npm install
npm run build

# 2. Initialize database
node dist/cli.js init
node dist/cli.js build src

# 3. Choose your workflow style (pick one or all):

# Option A: Shell Aliases (fastest)
source ./scripts/relationship/setup-aliases.sh
rel-critical  # Show top critical symbols

# Option B: VS Code Tasks (GUI)
./scripts/relationship/setup-vscode.sh
# Then: Ctrl+Shift+P → "Tasks: Run Task"

# Option C: Git Hooks (automatic)
./scripts/relationship/install-git-hooks.sh
# Now commits are automatically checked

# Option D: Just use npm scripts
npm run rel:metrics
```

---

## 5 Ways to Run Commands

### 1. Direct CLI
**When**: You want full control and all options.

```bash
node dist/cli.js relationship-impact class-buildcommand --depth 5
node dist/cli.js relationship-metrics --metric betweenness --top 20
node dist/cli.js relationship-export --format graphml > graph.graphml
```

**Pros**: Most flexible, all options available
**Cons**: Longer to type, need to remember syntax

### 2. npm Scripts
**When**: You're already in package.json workflow.

```bash
npm run rel:check class-buildcommand      # Quick safety check
npm run rel:impact class-buildcommand     # Impact analysis
npm run rel:metrics                       # Top 20 critical symbols
npm run safety:check class-buildcommand   # Comprehensive check
npm run report:weekly                     # Generate weekly report
npm run git:check-critical                # Check git changes
```

**Pros**: Familiar, works everywhere, no setup
**Cons**: Limited to predefined scripts

### 3. Shell Aliases
**When**: You work primarily in terminal.

```bash
# One-time setup
source ./scripts/relationship/setup-aliases.sh

# Add to ~/.bashrc or ~/.zshrc for permanent:
echo "source $(pwd)/scripts/relationship/setup-aliases.sh" >> ~/.bashrc

# Usage
rel-critical                              # Top 20 critical
rel-before class-buildcommand             # Pre-modification check
rel-blast class-buildcommand 5            # Deep impact analysis
rel-connect class-a class-b               # Find path between
rel-to-gephi > graph.graphml              # Export for visualization
rel-viz dot arch.dot                      # Generate diagram
```

**Pros**: Fastest, ergonomic, helper functions
**Cons**: Requires shell configuration

### 4. VS Code Tasks
**When**: You prefer GUI and IDE integration.

```bash
# One-time setup
./scripts/relationship/setup-vscode.sh

# Usage in VS Code:
# 1. Ctrl+Shift+P
# 2. Type "Tasks: Run Task"
# 3. Select task (e.g., "Relationship: Show Critical Symbols")
# 4. Interactive prompts for parameters
```

**Available Tasks**:
- Relationship: Check Symbol Safety
- Relationship: Impact Analysis (with depth picker)
- Relationship: Show Critical Symbols
- Relationship: Query Symbol
- Relationship: Validate Data
- Relationship: Find Clusters
- Relationship: Generate Weekly Report
- Relationship: Check Git Changes
- Relationship: Export to Gephi
- Relationship: Export to Graphviz
- TSDoc: Work Context (Current File)
- TSDoc: Build Database

**Pros**: GUI, interactive prompts, keyboard shortcuts
**Cons**: VS Code only, requires setup

### 5. Git Hooks
**When**: You want automatic safety checks.

```bash
# One-time setup
./scripts/relationship/install-git-hooks.sh

# Now every commit automatically:
# 1. Checks for critical symbol changes
# 2. Shows risk assessment
# 3. Asks for confirmation if high-risk
```

**Bypass when needed**:
```bash
git commit --no-verify  # Skip hook for this commit
```

**Pros**: Automatic, catches issues early
**Cons**: Adds time to commits

---

## Daily Workflows

### Morning: Check Architecture Health

```bash
# Shell aliases
rel-critical

# Or npm
npm run rel:metrics

# Or VS Code
Ctrl+Shift+P → "Relationship: Show Critical Symbols"
```

**Output**: Top 20 most critical symbols with centrality metrics.

### Before Modifying Code

```bash
# Comprehensive safety check (recommended)
./scripts/relationship/check-symbol-safety.sh class-buildcommand

# Or just impact
rel-impact class-buildcommand

# Or npm
npm run safety:check class-buildcommand
```

**Output**:
1. Impact analysis (how many symbols affected)
2. Criticality check (is it in top 20?)
3. Connection overview (what depends on it)
4. Risk-based recommendations

### During Code Review

```bash
# Check what changed
rel-git  # Shell alias

# Or script directly
./scripts/relationship/find-critical-changes.sh

# For specific commits
./scripts/relationship/find-critical-changes.sh HEAD~3..HEAD
```

**Output**: Critical symbols affected by changes + impact analysis.

### Before Committing

**Automatic** (if git hook installed):
```bash
git commit  # Hook runs automatically
```

**Manual**:
```bash
npm run git:check-critical
```

### Friday: Weekly Report

```bash
# Generate comprehensive report
rel-report  # Shell alias

# Or script directly
./scripts/relationship/weekly-report.sh .reports

# Or npm
npm run report:weekly
```

**Output**:
- `.reports/weekly-TIMESTAMP/`
  - 01-statistics.txt
  - 02-critical-symbols.txt
  - 03-bottlenecks.txt
  - 04-modules.txt
  - 05-data-quality.txt
  - 06-graph.graphml (Gephi)
  - 06-structural.dot (Graphviz)
  - 06-data.json (custom analysis)
  - README.md (summary)

---

## Common Patterns

### Pattern 1: Before Refactoring

```bash
# 1. Check current state
rel-check class-oldname

# 2. Find what depends on it
rel-query class-oldname --direction incoming

# 3. Check criticality
rel-metrics --top 50 | grep class-oldname

# 4. Plan migration
rel-path class-oldname class-newname
```

### Pattern 2: Understanding Architecture

```bash
# 1. Find natural modules
rel-clusters

# 2. Identify hubs
rel-metrics --metric degree --top 20

# 3. Find bottlenecks
rel-metrics --metric betweenness --top 15

# 4. Visualize in Gephi
rel-to-gephi > graph.graphml
```

### Pattern 3: Debugging Dependencies

```bash
# 1. Find how A connects to B
rel-path class-a class-b

# 2. Check all of A's connections
rel-query class-a

# 3. See impact of changing A
rel-impact class-a --depth 5
```

### Pattern 4: Code Quality Review

```bash
# 1. Validate data integrity
rel-validate

# 2. Generate weekly report
rel-report

# 3. Check for orphaned relationships
rel-validate --fix

# 4. Export for deep analysis
rel-to-json > data.json
```

---

## Integration Examples

### CI/CD Pipeline

```yaml
# .github/workflows/critical-changes.yml
name: Check Critical Changes

on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24.x'
      - name: Build database
        run: |
          npm ci
          npm run build
          node dist/cli.js build src
      - name: Check critical changes
        run: |
          ./scripts/relationship/find-critical-changes.sh origin/main..HEAD
          if [ $? -eq 10 ]; then
            echo "Critical changes detected - requires senior review"
            # Add label, notify, etc.
          fi
```

### Pre-Push Hook

```bash
#!/bin/bash
# .git/hooks/pre-push

./scripts/relationship/find-critical-changes.sh @{upstream}..HEAD

if [ $? -eq 10 ]; then
  echo "⚠️  Pushing critical changes!"
  read -p "Continue? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
```

### Weekly Cron Job

```bash
#!/bin/bash
# Generate weekly report every Friday at 5pm

0 17 * * 5 cd /path/to/tsdoc-edge && ./scripts/relationship/weekly-report.sh ~/reports && \
  mail -s "Weekly Architecture Report" team@example.com < ~/reports/weekly-*/README.md
```

### VS Code Keyboard Shortcuts

```json
// .vscode/keybindings.json
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
  },
  {
    "key": "ctrl+alt+r i",
    "command": "workbench.action.tasks.runTask",
    "args": "Relationship: Impact Analysis"
  }
]
```

---

## Troubleshooting

### Command not found

```bash
# Make sure you've built the project
npm run build

# Check if CLI works
node dist/cli.js --help

# For shell aliases, source the file
source ./scripts/relationship/setup-aliases.sh
```

### Database not found

```bash
# Build database
node dist/cli.js build src

# Check if database exists
ls -lh .tsdoc/tsdoc.db

# Rebuild if needed
rm -rf .tsdoc
node dist/cli.js init
node dist/cli.js build src
```

### Symbol not found

```bash
# Check symbol exists
node dist/cli.js list-symbols | grep <name>

# Remember: symbols are kebab-case
# BuildCommand → class-buildcommand
# getUserById → method-getuserbyid
```

### Slow performance

```bash
# Use sampling for large graphs
rel-metrics --top 20  # Fast, samples for betweenness

# Avoid full betweenness on huge graphs
rel-metrics --metric degree --top 50  # Much faster

# Export to Gephi for interactive exploration
rel-to-gephi > graph.graphml
```

### Git hook too slow

```bash
# Edit .git/hooks/pre-commit
# Add timeout or reduce depth:
timeout 5s ./scripts/relationship/find-critical-changes.sh --staged

# Or check fewer critical symbols (edit script line 56):
CRITICAL_SYMBOLS=$(... --top 10 ...)  # Instead of 30
```

---

## Reference

### All Available Scripts

```
scripts/relationship/
├── check-symbol-safety.sh      # Comprehensive pre-modification check
├── weekly-report.sh            # Generate weekly architecture report
├── find-critical-changes.sh    # Check git changes for critical symbols
├── setup-aliases.sh            # Install shell aliases
├── setup-vscode.sh             # Install VS Code tasks
└── install-git-hooks.sh        # Install pre-commit hook
```

### All npm Scripts

```
npm run rel:check <symbol>      # Quick safety check
npm run rel:impact <symbol>     # Impact analysis
npm run rel:metrics             # Top 20 critical symbols
npm run rel:validate            # Data integrity check
npm run rel:clusters            # Find modules
npm run rel:help                # Interactive help
npm run safety:check <symbol>   # Comprehensive check
npm run report:weekly           # Weekly report
npm run git:check-critical      # Check git changes
```

### Shell Aliases Cheatsheet

```bash
rel-aliases                     # Show all aliases
rel-critical                    # Top 20 critical
rel-before <symbol>             # Pre-modification check
rel-blast <symbol> [depth]      # Deep impact
rel-connect <from> <to>         # Find path
rel-viz [format] [output]       # Generate viz
rel-to-gephi                    # Export GraphML
rel-to-dot                      # Export DOT
rel-to-json                     # Export JSON
```

### VS Code Tasks

```
Ctrl+Shift+P → "Tasks: Run Task" → Choose:
- Relationship: Check Symbol Safety
- Relationship: Impact Analysis
- Relationship: Show Critical Symbols
- Relationship: Query Symbol
- Relationship: Find Clusters
- Relationship: Generate Weekly Report
- Relationship: Check Git Changes
- TSDoc: Work Context (Current File)
```

---

## Learning Path

### Day 1: Basics
1. Build database: `npm run build && node dist/cli.js build src`
2. Check critical symbols: `npm run rel:metrics`
3. Try impact analysis: `npm run rel:impact class-buildcommand`

### Day 2: Choose Workflow
1. Try shell aliases: `source ./scripts/relationship/setup-aliases.sh`
2. Or try VS Code: `./scripts/relationship/setup-vscode.sh`
3. Pick what feels natural

### Day 3: Integrate
1. Install git hooks: `./scripts/relationship/install-git-hooks.sh`
2. Use before committing
3. Adjust if too slow

### Week 1: Habits
1. Check critical symbols every morning
2. Run safety check before modifying code
3. Generate Friday report

### Month 1: Advanced
1. Export to Gephi for visual exploration
2. Set up CI/CD integration
3. Create custom npm scripts for your team's patterns

---

## Next Steps

- [Relationship System Guide](relationship-system-guide.md) - Complete 400-line guide
- [Quick Reference](RELATIONSHIP-QUICK-REFERENCE.md) - 1-page cheatsheet
- [VS Code Tasks](.vscode-template/README.md) - VS Code integration details
- [Work Context Workflow](../managed/workflows/work-context-workflow.md) - Work-context command

---

**Philosophy**: Analysis tools are only valuable if they're easy to use.
Meet developers in their natural workflow - don't make them adapt to the tool.
