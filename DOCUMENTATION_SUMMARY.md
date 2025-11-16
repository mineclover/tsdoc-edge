# QUICK REFERENCE - DOCUMENTATION CATEGORIES

## Summary Table

| Category | Location | Files | TSDoc Duplicate | Recommendation | Notes |
|----------|----------|-------|-----------------|-----------------|-------|
| **API DOCUMENTATION** | | **172** | **YES (74%)** | **CONSOLIDATE** | |
| Commands | `/managed/commands/` | 53 | HIGH | Remove 50, keep 1-2 | Move to TSDoc |
| Analyzers | `/managed/analyzers/` | 31 | HIGH | Remove 28, keep index | Move to TSDoc |
| Utilities | `/managed/utilities/` | 19 | MEDIUM | Remove 17, keep index | Move to TSDoc |
| Types | `/managed/types/` | 20 | MEDIUM | Remove 18, keep index | Move to TSDoc |
| Primary Types | `/managed/primary-types/` | 20 | MEDIUM | Remove 19, keep index | Move to TSDoc |
| Parsers | `/managed/parser/` + `/parsers/` | 7 | MEDIUM | Remove 7 | Move to TSDoc |
| Generators | `/managed/generator/` | 6 | MEDIUM | Remove 6 | Move to TSDoc |
| Other Classes | `/core-components/`, `/fold/`, `/fixer/`, etc. | 16 | MEDIUM | Remove 14-16 | Move to TSDoc |
| **CONCEPTUAL DOCUMENTATION** | | **10** | **NO** | **KEEP ALL** | System philosophy |
| Concepts | `/managed/concepts/` | 10 | NO | Keep 10 | Module spec, SSOT, etc. |
| **RELATIONSHIP DOCUMENTATION** | | **28** | **NO** | **KEEP ALL** | Domain taxonomy |
| Relationships | `/managed/relationships/` | 28 | NO | Keep 28 | Behavioral/structural types |
| **WORKFLOW/GUIDE DOCUMENTATION** | | **12** | **NO** | **KEEP ALL** | User workflows |
| Workflows | `/managed/workflows/` | 7 | NO | Keep 7 | User procedures |
| Guides | `/managed/guides/` | 5 | NO | Keep 5 | Developer onboarding |
| **ARCHITECTURE DOCUMENTATION** | | **5** | **NO** | **KEEP** | System design |
| Architecture | `/managed/architecture/` | 5 | NO | Keep 5 | Design decisions |
| **FEATURE DOCUMENTATION** | | **19** | **PARTIAL** | **REVIEW** | Mixed type |
| Features (Conceptual) | `/managed/features/` | 8 | NO | Keep 8 | Capabilities/workflows |
| Features (Status/Analysis) | `/managed/features/` | 5 | PARTIAL | Archive 5 | Move to /archive/ |
| Duplicates (doc-symbol-system) | `/managed/features/` | 1 | YES | Remove 1 | Consolidate to concepts |
| Features (Other) | `/managed/features/` | 5 | PARTIAL | Review 5 | Query, gephi, etc. |
| **INDEX/TOC FILES** | | **2** | **N/A** | **KEEP** | Navigation |
| Main Index | `/managed/README.md` | 1 | N/A | Keep | Entry point |
| Commands Ref | `/managed/COMMANDS.md` | 1 | N/A | Keep | Command reference |
| Quick Start | `/managed/quick-start.md` | 1 | N/A | Keep | Onboarding |
| **ARCHIVE** | | **21** | **HISTORICAL** | **REVIEW** | Historical |
| Archive | `/managed/archive/` | 21 | OLD | Delete/Keep recent | 6+ months old |
| | | | | | |
| **TOTAL** | | **274** | | | |
| **After Consolidation** | | **~115** | | -59% | |

---

## Detailed Breakdown by Action

### REMOVE (158 files - 58%)
```
Commands:            50 files (keep 1-2)
Analyzers:           28 files (keep index)
Types:               18 files (keep index)
Primary Types:       19 files (keep index)
Utilities:           17 files (keep index)
Parsers:              7 files
Generators:           6 files
Doc-Symbols:         3 files
Fold:                3 files
Fixer:               2 files
Core-Components:     2 files
Graph:               1 file
Storage:             1 file
Config:              1 file
Features (Dup):      1 file
Archive (old):      10 files
---
SUBTOTAL:          158 files
```

### KEEP (115 files - 42%)
```
Concepts:           10 files (essential)
Relationships:      28 files (taxonomy)
Workflows:           7 files (procedures)
Guides:              5 files (onboarding)
Architecture:        5 files (system design)
Features (Concept):  8 files (capabilities)
Index/TOC:           3 files (navigation)
Command indexes:     2 files
Feature overviews:   5 files
Archive (recent):   11 files
---
SUBTOTAL:          115 files
```

---

## Directory Summary

| Directory | Current | Keep | Remove | Action |
|-----------|---------|------|--------|--------|
| `/managed/commands/` | 53 | 1-2 | 50 | REMOVE |
| `/managed/analyzers/` | 31 | 1 | 28 | REMOVE |
| `/managed/utilities/` | 19 | 1 | 17 | REMOVE |
| `/managed/types/` | 20 | 1 | 18 | REMOVE |
| `/managed/primary-types/` | 20 | 1 | 19 | REMOVE |
| `/managed/parser/` | 4 | 0 | 4 | REMOVE |
| `/managed/parsers/` | 3 | 0 | 3 | REMOVE |
| `/managed/generator/` | 6 | 0 | 6 | REMOVE |
| `/managed/fold/` | 3 | 0 | 3 | REMOVE |
| `/managed/fixer/` | 2 | 0 | 2 | REMOVE |
| `/managed/doc-symbols/` | 6 | 3 | 3 | KEEP 3 |
| `/managed/core-components/` | 2 | 1 | 1 | REMOVE 1 |
| `/managed/graph/` | 1 | 0 | 1 | REMOVE |
| `/managed/storage/` | 1 | 0 | 1 | REMOVE |
| `/managed/config/` | 1 | 0 | 1 | REMOVE |
| `/managed/concepts/` | 10 | 10 | 0 | KEEP |
| `/managed/relationships/` | 28 | 28 | 0 | KEEP |
| `/managed/workflows/` | 7 | 7 | 0 | KEEP |
| `/managed/guides/` | 5 | 5 | 0 | KEEP |
| `/managed/architecture/` | 5 | 5 | 0 | KEEP |
| `/managed/features/` | 19 | 13 | 6 | REVIEW |
| `/managed/archive/` | 21 | 11 | 10 | REVIEW |
| Root files | 4 | 3 | 1 | CONSOLIDATE |
| | **274** | **115** | **159** | |

---

## Impact Analysis

### Files Duplicating TSDoc (Candidates for Removal)
- **High Duplication**: 
  - 53 Command documentation files (source has @public, @responsibility, @contract)
  - 31 Analyzer documentation files (source already has TSDoc)
  
- **Medium Duplication**:
  - 20 Type files (interfaces have inline JSDoc)
  - 19 Utility files (functions have @param/@returns)
  - 20 Primary Types files (types partially documented in code)
  - 7 Parser files (classes have methods with documentation)
  - 6 Generator files (classes have implementation)

### Files That Cannot Be Replaced by TSDoc
- **10 Concept files** - System-level design philosophy, cannot fit in code comments
- **28 Relationship files** - Domain taxonomy, used as specification
- **12 Workflow/Guide files** - User procedures, procedural knowledge
- **5 Architecture files** - System interaction diagrams and design
- **8 Feature concept files** - Feature descriptions, use cases

### Files Needing Consolidation
- Index/TOC files (consolidate multiple command references)
- Feature documentation (split conceptual vs. API)
- Archive files (define retention policy)

---

## Code-to-Doc Links

### Current Strategy
- Source files have `@doc [[Symbol]]` tags pointing to managed docs
- Managed docs cross-reference via `[[Symbol]]` syntax
- Backlinks track relationships

### After Consolidation
- Source TSDoc becomes primary documentation
- Managed docs link FROM code via `@see` tags
- Managed docs focus on "why" not "what"
- Concept docs become reference architecture

Example:
```typescript
/**
 * Analyzes code health for a directory
 * 
 * @param checker - CodeHealthChecker instance
 * @returns Promise<CommandResult> with analysis report
 * 
 * @see [[CodeHealthChecker]] - Implementation
 * @doc [[Analysis Features]] - Feature capabilities
 * @doc [[Module Specification Framework]] - Design principles
 */
```

---

## Risk Assessment

| Phase | Risk | Mitigation |
|-------|------|-----------|
| Remove API docs | Medium | Keep backups, verify backlinks first |
| Enhance TSDoc | Low | Gradual migration, test IDE lookup |
| Update links | Medium | Automated link checking, git history |
| Archive cleanup | Low | Batch deletion, archive preservation |

---

## Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Total markdown files | 274 | 115 | Week 4 |
| Doc/source ratio | 1.19 | 0.50 | Week 4 |
| TSDoc coverage | 74% | 95% | Week 3 |
| Broken links | Unknown | 0 | Week 4 |
| Build time | Baseline | <3% change | Week 4 |

