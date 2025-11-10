# Relationship Analysis System

**Complete architectural intelligence through graph analysis**

## Overview

The TSDoc Edge relationship system transforms 20,000+ discovered symbol relationships into actionable architectural intelligence. It provides 7 specialized commands for querying, analyzing, validating, and visualizing your codebase's dependency graph.

**Total Discovered**: 20,150 relationships across 1,722 symbols
**Categories**: Structural, Data-flow, Behavioral, Semantic, Verification, Alternative, Constraint
**Implementation**: 47% complete (9/19 types)

---

## Quick Start

```bash
# Discover architectural patterns
tsdoc-edge relationship-clusters

# Find critical bottlenecks
tsdoc-edge relationship-metrics --metric betweenness --top 10

# Before changing a symbol
tsdoc-edge relationship-impact class-buildcommand

# Understand connections
tsdoc-edge relationship-path class-a class-b

# Export for visualization
tsdoc-edge relationship-export --format graphml --output graph.graphml
```

---

## Command Suite

### 1. relationship-query - Explore Symbol Connections

**Purpose**: Query all relationships for a given symbol
**When to use**: Understanding what a symbol connects to

```bash
# Basic usage
tsdoc-edge relationship-query class-buildcommand

# Filter by category
tsdoc-edge relationship-query class-buildcommand --category structural

# Filter by type and direction
tsdoc-edge relationship-query class-buildcommand --type code-dependency --direction from
```

**Output**:
- Grouped by category (structural, behavioral, semantic, etc.)
- Shows relationship types and targets
- Statistics by type

**Use Cases**:
- Code review: "What does this class depend on?"
- Refactoring: "What relationships will be affected?"
- Documentation: "What should I document about connections?"

---

### 2. relationship-impact - Change Impact Analysis

**Purpose**: Analyze who/what will be affected by changing a symbol
**When to use**: Before making changes, assessing risk

```bash
# Downstream impact (who depends on this)
tsdoc-edge relationship-impact class-buildcommand

# Upstream impact (what this depends on)
tsdoc-edge relationship-impact class-buildcommand --direction upstream

# Limited depth for quick checks
tsdoc-edge relationship-impact class-buildcommand --depth 2

# Filter by category
tsdoc-edge relationship-impact class-buildcommand --category structural
```

**Output**:
- Risk level: LOW / MEDIUM / HIGH
- Affected symbols by depth
- Impact breakdown by category
- Recommendations based on risk

**Risk Thresholds**:
- **HIGH**: 20+ symbols affected OR depth 4+
- **MEDIUM**: 5-19 symbols OR depth 2-3
- **LOW**: <5 symbols

**Use Cases**:
- Before refactoring: "How risky is this change?"
- Sprint planning: "Which changes are safe to make in parallel?"
- Code review: "Did we consider the impact?"

**Example Output**:
```
BuildCommand → 278 affected symbols (HIGH RISK)
Depth 1: 10 symbols
Depth 2: 34 symbols
Depth 3: 234 symbols
Recommendation: Extensive testing required, consider feature flags
```

---

### 3. relationship-path - Connection Discovery

**Purpose**: Find how two symbols are connected through the graph
**When to use**: Understanding indirect dependencies

```bash
# Find all paths
tsdoc-edge relationship-path class-buildcommand class-databasemanager

# Show only shortest paths
tsdoc-edge relationship-path class-a class-b --shortest-only

# Limit path length
tsdoc-edge relationship-path class-a class-b --max-length 3

# Filter by category
tsdoc-edge relationship-path class-a class-b --category structural
```

**Output**:
- All connection paths with relationship types
- Path length and strength metrics
- Statistics: shortest, longest, average
- Category distribution

**Use Cases**:
- Debugging: "Why does A affect B?"
- Architecture review: "Are these components too coupled?"
- Refactoring: "Can we break this indirect dependency?"

**Example**:
```
Path 1 (length: 1, strength: █████)
  class-buildcommand
    ↓ code-dependency (structural)
  class-databasemanager
```

---

### 4. relationship-validate - Data Integrity Check

**Purpose**: Validate relationship data quality
**When to use**: Regular maintenance, after major changes, in CI/CD

```bash
# Quick validation
tsdoc-edge relationship-validate

# Detailed report
tsdoc-edge relationship-validate --verbose

# Auto-fix issues
tsdoc-edge relationship-validate --fix

# Check confidence levels
tsdoc-edge relationship-validate --min-confidence 0.7
```

**Checks Performed**:
1. **Orphaned relationships**: References to non-existent symbols (ERROR)
2. **Duplicate relationships**: Same relationship recorded multiple times (WARNING)
3. **Low confidence**: Relationships below threshold (INFO)
4. **Bidirectional consistency**: Missing reverse relationships (WARNING)

**Auto-Fix Capabilities**:
- ✅ Removes orphaned relationships
- ⚠️ Flags duplicates for manual review
- ℹ️ Reports low confidence for investigation

**Exit Codes** (CI/CD friendly):
- `0`: No errors (warnings OK)
- `1`: Errors found

**Use Cases**:
- CI/CD: Prevent bad data from being committed
- After analysis: Ensure quality
- Regular maintenance: Weekly validation runs

---

### 5. relationship-export - Multi-Format Export

**Purpose**: Export relationships for external analysis tools
**When to use**: Visualization, reporting, integration with other tools

```bash
# JSON (programmatic processing)
tsdoc-edge relationship-export --format json --output relationships.json

# GraphML (Gephi, yEd, Cytoscape visualization)
tsdoc-edge relationship-export --format graphml --output graph.graphml

# DOT (Graphviz visualization)
tsdoc-edge relationship-export --format dot --output graph.dot

# CSV (spreadsheet analysis)
tsdoc-edge relationship-export --format csv --output relationships.csv

# Cypher (Neo4j graph database)
tsdoc-edge relationship-export --format cypher --output import.cypher

# Filter before export
tsdoc-edge relationship-export --format graphml --category structural --output structural.graphml
```

**Formats**:

| Format | Use Case | Tools |
|--------|----------|-------|
| JSON | Programmatic analysis, custom tools | Any JSON processor |
| GraphML | Visual graph analysis | Gephi, yEd, Cytoscape |
| DOT | Diagram generation | Graphviz |
| CSV | Spreadsheet analysis, data science | Excel, Python/Pandas |
| Cypher | Graph database import | Neo4j |

**Export Size Reference**:
- Full JSON: 14.2 MB (20,150 relationships)
- Structural GraphML: 1.4 MB (2,272 relationships)
- Behavioral CSV: 1 MB (4,054 high-confidence)

**Use Cases**:
- Visualization: Import to Gephi for interactive graph exploration
- Reporting: Export to CSV for executive dashboards
- Analysis: Import to Neo4j for complex graph queries
- Documentation: Generate DOT diagrams for architecture docs

---

### 6. relationship-clusters - Architectural Module Discovery

**Purpose**: Discover natural architectural modules through community detection
**When to use**: Architecture review, refactoring planning, understanding system structure

```bash
# Find all clusters
tsdoc-edge relationship-clusters

# Large modules only
tsdoc-edge relationship-clusters --min-size 10

# Focus on structural relationships
tsdoc-edge relationship-clusters --category structural

# Detailed symbol lists
tsdoc-edge relationship-clusters --detailed --max-clusters 10
```

**Algorithm**: Greedy modularity optimization
**Metric**: Cohesion = Internal edges / (Internal + External edges)

**Output**:
- Cluster size (symbol count)
- Internal edges (within cluster)
- External edges (to other clusters)
- Cohesion score (0-100%)
- Dominant category
- Symbol samples or full list

**Cohesion Interpretation**:
- **>70%**: Strong module boundary (well-defined)
- **50-70%**: Moderate cohesion (acceptable)
- **<50%**: Weak boundary (refactoring recommended)

**Use Cases**:
- Architecture review: "How modular is our codebase?"
- Refactoring: "Which symbols should move together?"
- Team organization: "How should we split the codebase?"
- Documentation: "What are the natural system boundaries?"

**Example Output**:
```
Cluster 1: Core Commands (195 symbols, 92.5% cohesion)
  Dominant: structural
  Sample: BuildCommand, HelpCommand, AnalyzeCommand...
  Insight: Well-defined module, good architectural boundary

Cluster 5: Utility Functions (8 symbols, 32% cohesion)
  Dominant: semantic
  Sample: isTypeScript, getFileExtension...
  Insight: Low cohesion - consider refactoring
```

---

### 7. relationship-metrics - Centrality & Importance Analysis

**Purpose**: Identify architecturally critical symbols using graph metrics
**When to use**: Prioritizing stability, understanding system topology, finding bottlenecks

```bash
# Find most important symbols
tsdoc-edge relationship-metrics

# Find bottlenecks
tsdoc-edge relationship-metrics --metric betweenness --top 10

# Find most connected
tsdoc-edge relationship-metrics --metric degree --top 15

# Detailed metrics
tsdoc-edge relationship-metrics --detailed --top 20

# Focus on structural
tsdoc-edge relationship-metrics --category structural
```

**Metrics Calculated**:

| Metric | Meaning | Use Case |
|--------|---------|----------|
| **Degree** | Total connections | Find hubs |
| **In-Degree** | Number depending on this | Find core components |
| **Out-Degree** | Number this depends on | Find orchestrators |
| **Betweenness** | Appears on shortest paths | Find bottlenecks/bridges |
| **PageRank** | Importance propagation | Find influential symbols |
| **Importance** | Composite score | Overall ranking |

**Architectural Patterns Detected**:

```
High Degree + High Betweenness = Critical Hub (bottleneck)
  → Changes have wide impact, careful change management required

High In-Degree + Low Out-Degree = Core Component
  → Many symbols depend on this, stability essential

High Out-Degree + Low In-Degree = Orchestrator
  → Coordinates many components, integration point

High Betweenness = Bridge
  → Connects different subsystems, critical for information flow
```

**Use Cases**:
- Stability planning: "Which symbols must never break?"
- Change management: "Which changes need extra review?"
- Testing strategy: "Where should we focus integration tests?"
- Documentation: "Which APIs need the best docs?"

**Example Output**:
```
1. SymbolGraphBuilder.getDependents
   Importance: 0.27
   Degree: 125 (in: 5, out: 120)
   Betweenness: 0.0212
   → Critical hub - architectural bottleneck

2. BaseCommand.executeWithErrorHandling
   Importance: 0.23
   In-Degree: 63
   → Core component - many symbols depend on this
```

**Insights Section**:
- Critical hubs: Symbols requiring careful change management
- Core components: Symbols requiring stability guarantees
- Architectural statistics: Hub/bridge distribution

---

## Workflow Guides

### Before Making Changes

**Goal**: Assess risk and plan testing strategy

```bash
# Step 1: Check if it's a critical symbol
tsdoc-edge relationship-metrics --top 20

# Step 2: Analyze impact
tsdoc-edge relationship-impact <symbol-id>

# Step 3: Understand dependencies
tsdoc-edge relationship-query <symbol-id>

# Step 4: If HIGH RISK, document affected symbols
tsdoc-edge relationship-impact <symbol-id> --category structural > impact.txt
```

**Decision Matrix**:
- **HIGH RISK**: Feature flag, extensive testing, staged rollout
- **MEDIUM RISK**: Integration tests, code review
- **LOW RISK**: Standard testing

---

### Architecture Review

**Goal**: Understand system structure and identify issues

```bash
# Step 1: Find architectural modules
tsdoc-edge relationship-clusters --detailed

# Step 2: Identify bottlenecks
tsdoc-edge relationship-metrics --metric betweenness --top 15

# Step 3: Check modularity
tsdoc-edge relationship-clusters --category structural

# Step 4: Export for team discussion
tsdoc-edge relationship-export --format graphml --output review.graphml
```

**Review Checklist**:
- ✅ Are clusters cohesive (>70%)?
- ✅ Are critical hubs protected (tests, docs)?
- ✅ Are there unexpected dependencies?
- ✅ Is there a clear architectural hierarchy?

---

### Refactoring Planning

**Goal**: Safely restructure code

```bash
# Step 1: Understand what moves together
tsdoc-edge relationship-clusters --min-size 5

# Step 2: Check what connects to the target
tsdoc-edge relationship-query <symbol-id>

# Step 3: Assess impact of moving
tsdoc-edge relationship-impact <symbol-id>

# Step 4: Find connection paths
tsdoc-edge relationship-path <old-location> <new-location>
```

**Refactoring Safety Levels**:
- **Safe**: Low cohesion cluster, low impact, few paths
- **Moderate**: Medium cohesion, medium impact
- **Risky**: High cohesion, high impact, critical hub

---

### Integration with Visualization Tools

#### Gephi (Network Analysis)

```bash
# Export to GraphML
tsdoc-edge relationship-export --format graphml --output graph.graphml

# In Gephi:
# 1. File → Open → graph.graphml
# 2. Layout → ForceAtlas 2 (for natural clustering)
# 3. Statistics → Modularity (validate clusters)
# 4. Color nodes by category attribute
# 5. Resize nodes by degree
```

#### Neo4j (Graph Database)

```bash
# Export Cypher statements
tsdoc-edge relationship-export --format cypher --output import.cypher

# In Neo4j:
# 1. Open Neo4j Browser
# 2. Run import.cypher
# 3. Query: MATCH (s:Symbol)-[r:RELATES]->(t:Symbol) RETURN s,r,t LIMIT 100
# 4. Analyze: CALL gds.pageRank.stream('Symbol')
```

#### Graphviz (Documentation)

```bash
# Export structural relationships
tsdoc-edge relationship-export --format dot --category structural --output arch.dot

# Generate diagram
dot -Tpng arch.dot -o architecture.png
dot -Tsvg arch.dot -o architecture.svg
```

---

## Data Quality & Maintenance

### Regular Maintenance Schedule

**Weekly**:
```bash
tsdoc-edge relationship-validate --fix
```

**After Major Changes**:
```bash
tsdoc-edge relationship-validate --verbose
tsdoc-edge relationship-clusters  # Check if modularity changed
tsdoc-edge relationship-metrics --top 10  # Check if critical symbols changed
```

**Monthly**:
```bash
tsdoc-edge relationship-export --format json --output monthly-snapshot.json
# Compare with previous month to track architectural drift
```

---

## Performance Notes

### Command Speed

| Command | Speed | Why |
|---------|-------|-----|
| query | Fast | Single symbol lookup |
| validate | Fast | Database queries only |
| export | Medium | Serialization overhead |
| path | Medium | BFS traversal, capped at depth 5 |
| impact | Medium | BFS with depth limit |
| clusters | Slow | Iterative optimization |
| metrics | Slow | PageRank + Betweenness calculation |

**Optimization Tips**:
- Use `--category` to filter early
- Limit `--top` for metrics
- Use `--max-length` for path finding
- Export to JSON once, analyze offline

---

## Relationship Types Reference

### Structural (67% complete)

| Type | Status | Description |
|------|--------|-------------|
| code-dependency | ✅ Implemented | Direct import/require |
| inheritance | ❌ Planned | Class extends |
| implementation | ❌ Planned | Interface implementation |

### Data-flow (33% complete)

| Type | Status | Description |
|------|--------|-------------|
| io-dependency | ✅ Implemented | Input/output matching |
| pipeline | ❌ Planned | Sequential transformations |
| event-flow | ❌ Planned | Event emission/handling |

### Behavioral (60% complete)

| Type | Status | Description |
|------|--------|-------------|
| calls | ❌ Planned | Function invocation |
| callback | ❌ Planned | Callback pattern |
| collaboration | ✅ Implemented | Delegation pattern |
| composition | ✅ Implemented | Object composition |
| temporal-order | ✅ Implemented | Execution sequence |

### Semantic (50% complete)

| Type | Status | Description |
|------|--------|-------------|
| conceptual-relation | ❌ Planned | Logical relationship |
| feature-grouping | ✅ Implemented | Feature modules |

### Verification (50% complete)

| Type | Status | Description |
|------|--------|-------------|
| test-coverage | ❌ Planned | Test to implementation |
| integration-verification | ✅ Implemented | Integration test coverage |

### Alternative (50% complete)

| Type | Status | Description |
|------|--------|-------------|
| substitution | ❌ Planned | Alternative implementations |
| fallback | ✅ Implemented | Error handling fallback |

### Constraint (0% complete)

| Type | Status | Description |
|------|--------|-------------|
| mutual-exclusion | ❌ Planned | Cannot coexist |
| co-requirement | ❌ Planned | Must exist together |

---

## Troubleshooting

### "No relationships found"

**Cause**: Database not built or symbol ID incorrect

**Solution**:
```bash
# Rebuild database
tsdoc-edge build src

# Check symbol exists
tsdoc-edge symbol-query <symbol-name>

# Use correct ID format (kebab-case)
# ✅ class-buildcommand
# ❌ BuildCommand
```

### "Path finding too slow"

**Cause**: Large graph with many paths

**Solution**:
```bash
# Reduce max length
tsdoc-edge relationship-path A B --max-length 3

# Use shortest-only
tsdoc-edge relationship-path A B --shortest-only

# Filter by category
tsdoc-edge relationship-path A B --category structural
```

### "Metrics calculation timeout"

**Cause**: Betweenness calculation on very large graph

**Solution**:
```bash
# Use simpler metrics
tsdoc-edge relationship-metrics --metric degree

# Filter by category first
tsdoc-edge relationship-metrics --category structural
```

---

## Advanced Use Cases

### Finding Circular Dependencies

```bash
# Export to Neo4j
tsdoc-edge relationship-export --format cypher --output graph.cypher

# In Neo4j, find cycles
MATCH (s:Symbol)-[*]->(s)
RETURN s LIMIT 10
```

### Measuring Architectural Drift

```bash
# Month 1
tsdoc-edge relationship-metrics --top 100 > metrics-jan.txt
tsdoc-edge relationship-clusters > clusters-jan.txt

# Month 2
tsdoc-edge relationship-metrics --top 100 > metrics-feb.txt
tsdoc-edge relationship-clusters > clusters-feb.txt

# Compare: Did critical symbols change? Did cluster count increase?
diff metrics-jan.txt metrics-feb.txt
```

### API Stability Analysis

```bash
# Find all public APIs
tsdoc-edge symbol-query --filter "type:function,class,interface"

# Check their stability (low out-degree = stable)
tsdoc-edge relationship-metrics --metric degree --detailed

# Identify which are core (high in-degree)
# → These need semantic versioning guarantees
```

---

## Summary

The relationship system provides **7 commands** covering:

1. ✅ **Discovery** - query, path
2. ✅ **Analysis** - impact, metrics, clusters
3. ✅ **Quality** - validate
4. ✅ **Integration** - export

**Total capabilities**: 20,150 relationships analyzed across 1,722 symbols, providing complete architectural intelligence for development workflows.

**Next steps**: See `tsdoc-edge relationship-stats` for current implementation progress.
