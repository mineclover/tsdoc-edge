# Relationship System Quick Reference

One-page cheatsheet for TSDoc Edge's relationship analysis system.

## 🚀 Quick Start (2 minutes)

```bash
# 1. Build database (first time only)
tsdoc-edge build src

# 2. Check safety before modifying any symbol
tsdoc-edge relationship-impact class-buildcommand

# 3. Find connection between two symbols
tsdoc-edge relationship-path class-buildcommand class-databasemanager
```

## 📋 Commands Cheatsheet

### Before You Code
```bash
# Quick safety check (impact + metrics + query combined)
./scripts/relationship/check-symbol-safety.sh class-buildcommand

# Just impact analysis
tsdoc-edge relationship-impact <symbol-id> --depth 3

# Find all connections to/from a symbol
tsdoc-edge relationship-query <symbol-id> --limit 10
```

### Architecture Review
```bash
# Find top critical symbols
tsdoc-edge relationship-metrics --top 20

# Identify bottlenecks
tsdoc-edge relationship-metrics --metric betweenness --top 15

# Discover architectural modules
tsdoc-edge relationship-clusters --min-size 5

# Generate weekly report
./scripts/relationship/weekly-report.sh .reports
```

### Refactoring & Analysis
```bash
# Find how two symbols are connected
tsdoc-edge relationship-path <from> <to> --max-length 5

# Validate data integrity
tsdoc-edge relationship-validate

# Export for visualization
tsdoc-edge relationship-export --format graphml > graph.graphml
tsdoc-edge relationship-export --format dot > graph.dot
```

### Git Integration
```bash
# Check if current changes affect critical symbols
./scripts/relationship/find-critical-changes.sh

# Check specific commit range
./scripts/relationship/find-critical-changes.sh main..HEAD
```

## 🎯 7 Core Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `relationship-query` | Search relationships by symbol | `tsdoc-edge relationship-query class-buildcommand` |
| `relationship-impact` | Analyze downstream impact | `tsdoc-edge relationship-impact class-buildcommand --depth 3` |
| `relationship-path` | Find connection paths | `tsdoc-edge relationship-path class-a class-b` |
| `relationship-validate` | Check data integrity | `tsdoc-edge relationship-validate --fix` |
| `relationship-export` | Export to other tools | `tsdoc-edge relationship-export --format graphml` |
| `relationship-clusters` | Find architectural modules | `tsdoc-edge relationship-clusters --min-size 5` |
| `relationship-metrics` | Calculate centrality | `tsdoc-edge relationship-metrics --top 20` |

## 🔍 Common Patterns

### Pattern 1: Pre-Modification Check
```bash
# Before changing any file
tsdoc-edge relationship-impact <symbol-id>

# If impact > 20 symbols → HIGH RISK
# - Write comprehensive tests
# - Get senior review
# - Consider feature flag
```

### Pattern 2: Understanding Dependencies
```bash
# What does this depend on?
tsdoc-edge relationship-query <symbol-id> --direction incoming

# What depends on this?
tsdoc-edge relationship-query <symbol-id> --direction outgoing
```

### Pattern 3: Refactoring Planning
```bash
# 1. Check current connections
tsdoc-edge relationship-query <symbol-id>

# 2. Find critical symbols in module
tsdoc-edge relationship-metrics --category structural --top 10

# 3. Plan breaking changes carefully
tsdoc-edge relationship-path <old-symbol> <new-symbol>
```

### Pattern 4: Weekly Architecture Review
```bash
# Generate comprehensive report
./scripts/relationship/weekly-report.sh

# Review outputs:
# - Critical symbols (top 20)
# - Bottlenecks (betweenness)
# - Modules (clusters)
# - Data quality
```

## 🏗️ Bash Scripts

### check-symbol-safety.sh
Comprehensive pre-modification safety check.

```bash
./scripts/relationship/check-symbol-safety.sh class-buildcommand

# Outputs:
# 1. Impact analysis (how many affected)
# 2. Criticality check (is it in top 20?)
# 3. Connection overview (dependencies)
# 4. Risk-based recommendations
```

### weekly-report.sh
Automated architecture health report.

```bash
./scripts/relationship/weekly-report.sh .reports

# Generates:
# - 01-statistics.txt (overall stats)
# - 02-critical-symbols.txt (top 20)
# - 03-bottlenecks.txt (betweenness)
# - 04-modules.txt (clusters)
# - 05-data-quality.txt (validation)
# - 06-graph.graphml (Gephi)
# - 06-structural.dot (Graphviz)
# - 06-data.json (custom analysis)
# - README.md (summary + quick actions)
```

### find-critical-changes.sh
Git integration for PR safety.

```bash
# Check uncommitted changes
./scripts/relationship/find-critical-changes.sh

# Check last commit
./scripts/relationship/find-critical-changes.sh HEAD~1

# Check branch vs main
./scripts/relationship/find-critical-changes.sh main..HEAD

# Exit code 10 if critical changes detected
# Use in CI/CD: requires extra review if critical
```

## 📊 Risk Levels

### Impact-Based Risk
- **LOW**: < 5 affected symbols
- **MEDIUM**: 5-19 affected symbols
- **HIGH**: 20+ affected symbols

### Centrality-Based Risk
- **CRITICAL**: Top 20 by importance score
- **HUB**: Top 100 by degree centrality
- **BRIDGE**: Top 100 by betweenness
- **NORMAL**: Standard connectivity

## 🎨 Export Formats

### GraphML (Gephi/yEd/Cytoscape)
```bash
tsdoc-edge relationship-export --format graphml > graph.graphml

# Import to Gephi:
# 1. File → Open → graph.graphml
# 2. Layout → ForceAtlas 2
# 3. Color by 'category'
# 4. Resize by 'degree'
```

### DOT (Graphviz)
```bash
tsdoc-edge relationship-export --format dot > graph.dot
dot -Tpng graph.dot -o architecture.png

# For structural only:
tsdoc-edge relationship-export --format dot --category structural > struct.dot
```

### JSON (Custom Analysis)
```bash
tsdoc-edge relationship-export --format json > data.json

# Structure:
# {
#   "symbols": [...],
#   "relationships": [...],
#   "metadata": {...}
# }
```

### CSV (Spreadsheet)
```bash
tsdoc-edge relationship-export --format csv > relationships.csv

# Import to Excel/Google Sheets for pivot tables
```

### Cypher (Neo4j)
```bash
tsdoc-edge relationship-export --format cypher > import.cypher
cat import.cypher | cypher-shell -u neo4j -p password
```

## 🔧 Common Options

### Filtering
```bash
--category structural    # inheritance, composition, code-dependency
--category semantic      # feature-grouping, domain-modeling, api-contract
--category behavioral    # data-flow, collaboration, event-driven
```

### Output Control
```bash
--limit 10              # Limit number of results
--depth 3               # Graph traversal depth
--max-length 5          # Max path length
--top 20                # Top N results
```

### Metrics
```bash
--metric degree         # Total connections (default)
--metric in-degree      # Incoming connections
--metric out-degree     # Outgoing connections
--metric betweenness    # Bridge score
--metric pagerank       # Google PageRank
--metric importance     # Composite score
```

## 📈 Interpreting Metrics

### Degree Centrality
- **High**: Many connections (hub, critical component)
- **Low**: Peripheral, isolated component

### Betweenness Centrality
- **High**: Communication bottleneck, bridge between modules
- **Low**: Not on critical paths

### PageRank
- **High**: Influential, pointed to by important nodes
- **Low**: Leaf nodes, utilities

### Importance (Composite)
- Combines: Degree (40%) + PageRank (35%) + Betweenness (25%)
- **High**: Architecturally critical
- **Low**: Safe to modify

## 💡 Best Practices

### ✅ DO
- Run impact analysis before modifying any symbol
- Check safety script before starting work
- Generate weekly reports for team review
- Use git integration in PR workflow
- Export to Gephi for visual exploration
- Validate data integrity regularly

### ❌ DON'T
- Modify top 20 critical symbols without senior review
- Skip safety checks for "small" changes
- Ignore high betweenness warnings
- Refactor without checking dependencies
- Commit without running find-critical-changes.sh

## 🆘 Troubleshooting

### "No database found"
```bash
tsdoc-edge build src
```

### "Symbol not found"
```bash
# Check symbol exists
tsdoc-edge list-symbols | grep <symbol-name>

# Symbol IDs are kebab-case:
# BuildCommand → class-buildcommand
# getSymbolById → method-getbyid
```

### "Command not found: tsdoc-edge"
```bash
# Scripts auto-detect local development mode
# They use: node dist/cli.js or npx ts-node src/cli.ts

# Or install globally:
npm install -g tsdoc-edge
```

### Slow metrics calculation
```bash
# Use sampling for large graphs
tsdoc-edge relationship-metrics --top 20  # Fast, only top results

# Avoid full betweenness on huge graphs
tsdoc-edge relationship-metrics --metric degree --top 50  # Much faster
```

## 📚 Learn More

- **Full Guide**: `docs/relationship-system-guide.md`
- **Interactive Help**: `tsdoc-edge relationship-help`
- **Command Help**: `tsdoc-edge relationship-<command> --help`

## 🎯 Daily Workflow

```bash
# Morning: Check what's critical today
tsdoc-edge relationship-metrics --top 10

# Before coding: Safety check
./scripts/relationship/check-symbol-safety.sh <symbol-id>

# Before commit: Check changes
./scripts/relationship/find-critical-changes.sh

# Friday: Generate weekly report
./scripts/relationship/weekly-report.sh
```

---

**Generated by**: TSDoc Edge Relationship Analysis System
**Version**: 0.12.0
**Last Updated**: 2024
