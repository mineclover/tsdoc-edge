---
title: TSDoc Edge User Guide
type: guide
category: getting-started
status: active
canonical: true
entrypoint: true
updated: 2025-12-27
---

# [[TSDoc Edge User Guide]]

> **Complete user guide** - All you need to know to use TSDoc Edge effectively

**Current Statistics** (2025-12-27):
- Symbols: 5,587 | Relationships: 49,448 | Types: 13/30 (43%) | Categories: 10
- Commands: 65 | Documents: 213 | Graph Density: 8.85

---

## Quick Navigation

| I want to... | Go to |
|--------------|-------|
| Get started quickly | [[Quick Start Guide]] |
| Understand relationships | [[Relationship Types]] |
| Learn CLI commands | [[Commands Index]] |
| Follow workflows | [[Workflows Index]] |
| Read detailed guides | [[Guides & Tutorials]] |
| Understand core concepts | [[Concepts Index]] |

---

## 1. Getting Started

### Installation

```bash
npm install -g tsdoc-edge
```

### Initialize & Build

```bash
tsdoc-edge init          # Create .tsdoc config
tsdoc-edge build src     # Extract symbols from source
```

**Details**: [[Quick Start Guide]] | [[Build Pipeline Guide]]

---

## 2. Core Workflow: work-context

**The most important command** - Get complete context before modifying any file:

```bash
tsdoc-edge work-context <file-path>
tsdoc-edge wc <file-path>           # Short alias
tsdoc-edge wc <file-path> --llm     # LLM-friendly output
```

**What it provides**:
- Related documentation
- Dependencies and dependents
- Test coverage
- Impact analysis
- Recommendations

**Details**: [[Work Context Workflow]]

---

## 3. Relationship Analysis

TSDoc Edge tracks **13 relationship types** across **10 categories**:

| Category | % | Key Types |
|----------|---|-----------|
| Data Flow | 45.8% | io-dependency |
| Testing | 24.2% | test-coverage, test-as-example |
| Structural | 10.0% | code-dependency, inheritance, contains |
| Semantic | 7.2% | feature-grouping, naming-pattern, doc-reference |
| Behavioral | 7.0% | calls |
| Verification | 5.8% | verification |

**Commands**:
```bash
tsdoc-edge relationship stats           # View statistics
tsdoc-edge relationship query <symbol>  # All relationships
tsdoc-edge who-uses <symbol>            # Reverse dependencies
```

**Details**: [[Relationship Types]] | [[Relationship Analysis Guide]]

---

## 4. Key Commands by Category

### Analysis
```bash
tsdoc-edge analyze               # Analyze code health
tsdoc-edge health <path>         # Health report
tsdoc-edge stats                 # Project statistics
tsdoc-edge ontology-stats        # Graph statistics
```

### Queries
```bash
tsdoc-edge relationship query <symbol>  # Forward/reverse dependencies
tsdoc-edge who-uses <symbol>            # Who uses this
tsdoc-edge orphans                      # Find orphaned code
```

### Documentation
```bash
tsdoc-edge index-docs managed    # Index documents
tsdoc-edge validate-docs         # Validate SSOT
tsdoc-edge update-backlinks      # Update backlinks
```

**Full list**: [[Commands Index]] (67 commands)

---

## 5. Documentation System

### Document Symbol Format

Use `[[Symbol]]` to create bidirectional links:

```markdown
# [[MyComponent]]

This component uses [[DatabaseManager]] for storage.
```

### Validation

```bash
tsdoc-edge validate-symbol-refs  # Check symbol references
tsdoc-edge find-unused-docs      # Find orphan documents
```

**Details**: [[Document Symbol System]]

---

## 6. Common Workflows

### Before Modifying Code
```bash
tsdoc-edge wc src/path/to/file.ts
```

### Refactoring Safely
```bash
tsdoc-edge relationship query <symbol>  # What this uses/is used by
tsdoc-edge who-uses <symbol>            # What uses this
tsdoc-edge relationship impact <id>     # Full impact analysis
```

### Understanding Architecture
```bash
tsdoc-edge ontology-stats          # Graph overview
tsdoc-edge relationship metrics    # Important symbols
tsdoc-edge relationship clusters   # Module boundaries
```

### System Status (NEW)
```bash
tsdoc-edge system-status           # Full status
tsdoc-edge ss --compact            # One-line summary
```

**Details**: [[Usage Scenarios]] | [[Workflows Index]]

---

## 7. Configuration

**File**: `.tsdoc.config.json`

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

**Details**: [[TsdocEdgeConfig]]

---

## 8. Learning Path

### Beginner (1 hour)
1. [[Quick Start Guide]] - First steps
2. [[Work Context Workflow]] - Core workflow
3. Run: `tsdoc-edge build src && tsdoc-edge wc <file>`

### Intermediate (2 hours)
1. [[Relationship Types]] - Understanding relationships
2. [[Relationship Analysis Guide]] - Query patterns
3. [[Commands Index]] - All available commands

### Advanced (4+ hours)
1. [[Mermaid Entrypoint Workflow]] - Diagram-based docs
2. [[Analyzer Development Guide]] - Custom analyzers
3. [[CLI Command Development Guide]] - Custom commands

**Complete learning path**: [[Guides & Tutorials]]

---

## 9. Architecture Overview

```
TypeScript Source
       ↓
  [[ASTSymbolExtractor]] → Symbols (5,587)
       ↓
  [[DatabaseManager]] → SQLite + JSONL
       ↓
  Analyzers → Relationships (49,448)
       ↓
  CLI Commands (74) → Analysis & Reports
```

**Details**: [[Relationship System Roadmap]] | [[Relationship Types]]

---

## 10. Troubleshooting

### Build Issues
```bash
tsdoc-edge build src --verbose    # Debug output
```

### Missing Relationships
```bash
tsdoc-edge analyze-calls          # Re-run analyzers
tsdoc-edge analyze-io
```

### Documentation Sync
```bash
tsdoc-edge update-backlinks       # Fix backlinks
tsdoc-edge validate-symbol-refs   # Find broken refs
```

---

## Document Index

### Core Documentation
- [[TSDoc Edge Documentation]] - Main README
- [[Quick Start Guide]] - Getting started
- [[Commands Index]] - All 67 commands

### Relationship System
- [[Relationship Types]] - 19 types, 8 categories
- [[Relationship System Roadmap]] - Progress tracking
- [[Relationship Types]] - Meta architecture

### Guides
- [[Build Pipeline Guide]] - Build process
- [[Relationship Analysis Guide]] - Query patterns
- [[Work Context Workflow]] - Core workflow

### Reference
- [[Analyzers & Extractors]] - All analyzers
- [[Core Components]] - Core modules
- [[Features Index]] - Feature documentation

---

## Statistics Reference

| Metric | Value | Updated |
|--------|-------|---------|
| Symbols | 5,587 | 2025-12-27 |
| Relationships | 49,448 | 2025-12-27 |
| Relationship Types | 13/30 (43%) | 2025-12-27 |
| Categories | 10 | 2025-12-27 |
| CLI Commands | 74 | 2025-12-27 |
| Documents | 213 | 2025-12-27 |
| Graph Density | 8.85 | 2025-12-27 |

**Live stats**: `tsdoc-edge ontology-stats`

---

## Related

- [[TSDoc Edge Documentation]] - Main README
- [[Quick Start Guide]] - 5-minute start
- [[Guides & Tutorials]] - All guides
- [[Workflows Index]] - All workflows
