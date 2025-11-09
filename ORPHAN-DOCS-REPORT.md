# Orphan Documentation Report
**Generated**: 2025-11-08
**Basis**: Active features from src/cli.ts (61 commands)

## Summary

- **Total Docs**: 47 markdown files
- **Active (Mapped)**: 25 files (53%)
- **Review Needed**: 22 files (47%)
  - Concepts: 8 files
  - Historical: 5 files
  - Specs/Types: 6 files
  - Workflows: 3 files

## ✅ Active Documentation (25 files)

### Core Workflow & Features (15 files)
```
managed/features/core-workflow.md              → WorkContextCommand, BuildCommand
managed/workflows/work-context-workflow.md     → WorkContextCommand
managed/features/document-symbol-system.md     → ParseMermaidCommand, PromoteSymbolCommand
managed/relationships/index.md                 → Relationship SSOT
managed/relationships/CALLS.md                 → AnalyzeCallsCommand
managed/relationships/CODE-DEPENDENCY.md       → BuildCommand (ASTSymbolExtractor)
managed/relationships/IO-DEPENDENCY.md         → AnalyzeIOCommand
managed/relationships/PIPELINE.md              → AnalyzeChainsCommand
managed/relationships/INHERITANCE.md           → BuildCommand
managed/relationships/TEST-COVERAGE.md         → AnalyzeTestsCommand
managed/relationships/TYPE-DEPENDENCY.md       → AnalyzeTypesCommand
managed/relationships/GENERIC-CONSTRAINT.md    → AnalyzeTypesCommand
managed/relationships/INTERFACE-IMPL.md        → BuildCommand
managed/relationships/CIRCULAR.md              → DetectCircularTypesCommand
managed/features/core-features-catalog.md      → Feature index
```

### Architecture & System (5 files)
```
managed/architecture/system-architecture-2025-11-07.md        → Overall system
managed/architecture/analysis-extraction-systems-2025-11-07.md → BuildCommand, Analyzers
managed/architecture/database-relationships-2025-11-07.md     → Database schema
managed/architecture/diagrams/dependency-meta-structure.mmd   → Relationship taxonomy
managed/architecture/README.md                                → Architecture index
```

### Analysis & Validation (5 files)
```
managed/features/analysis-features.md    → Query & Analysis commands (11)
managed/features/validation-features.md  → Validation commands (8)
managed/features/symbol-graph.md         → Graph system
managed/features/auto-indexing.md        → IndexDocsCommand
```

## ⚠️ Review Needed (22 files)

### 1. Concept Docs - Design Principles (8 files)

**Recommendation**: Archive or consolidate into main docs

```
managed/concepts/immediate-feedback.md              → No clear command mapping
managed/concepts/progressive-disclosure.md          → Design principle (no feature)
managed/concepts/purpose-refinement.md              → Design principle (no feature)
managed/concepts/user-mental-model.md               → Design principle (no feature)
managed/concepts/work-context-reliability.md        → DUPLICATE of work-context-workflow.md?
managed/concepts/unified-relationship-taxonomy.md   → DUPLICATE of relationships/index.md
managed/concepts/integration-test-traceability.md   → TestRelationshipsCommand (minor)
managed/concepts/parallel-work-theory.md            → ParallelWorkCommand (minor)
```

**Action**:
- DELETE: `unified-relationship-taxonomy.md` (covered by relationships/index.md)
- DELETE: `work-context-reliability.md` (covered by workflows/work-context-workflow.md)
- ARCHIVE: Design principle docs → managed/archive/concepts/

### 2. Historical Docs - Session Notes (5 files)

**Recommendation**: Archive historical snapshots

```
managed/reviews/implementation-progress-2025-11-07.md      → Historical snapshot
managed/reviews/system-review-2025-11-06.md                → Historical snapshot
managed/sessions/implementation-session-2025-11-07.md      → Historical session
managed/sessions/work-context-integration-2025-11-07.md    → Historical session
managed/architecture/diagrams/SESSION_SUMMARY.md           → Historical diagram session
```

**Action**:
- MOVE: All to `managed/archive/history/`

### 3. Primary Types - May Be Orphaned (4 files)

**Recommendation**: Check if actually used in commands

```
managed/primary-types/AnalysisReport.md        → No command uses this?
managed/primary-types/ExtractionResult.md      → BuildCommand internal type
managed/primary-types/TrackableStatistics.md   → StatsCommand uses this?
managed/primary-types/TsdocEdgeConfig.md       → InitCommand uses this?
```

**Action**:
- VERIFY: Check actual usage in code
- If unused: DELETE or move to archive

### 4. Specs - Possibly Outdated (2 files)

**Recommendation**: Merge into active docs or delete

```
managed/specs/enhanced-database-schema.md          → Is this current schema?
managed/specs/relationship-standard-format.md      → DUPLICATE of relationships/index.md?
```

**Action**:
- CHECK: `enhanced-database-schema.md` vs actual schema in `src/storage/`
- DELETE: `relationship-standard-format.md` (covered by relationships/index.md)

### 5. Workflows - Duplicate/Vague (3 files)

**Recommendation**: Consolidate or clarify

```
managed/workflows/add-enhanced-docs-workflow.md    → UpdateBacklinksCommand?
managed/workflows/cli-feedback-cycle.md            → Design doc (no feature)
managed/workflows/cognitive-user-flow.md           → Design doc (no feature)
```

**Action**:
- REVIEW: `add-enhanced-docs-workflow.md` - is this current process?
- ARCHIVE: Design workflow docs → managed/archive/workflows/

### 6. Diagram Meta Docs (2 files)

```
managed/architecture/diagrams/MERMAID_RULES.md     → Mermaid syntax reference
managed/architecture/diagrams/README.md            → Diagram index
```

**Action**:
- KEEP: Both are useful references

## Recommended Actions

### Immediate Cleanup (11 files to remove)

```bash
# Delete duplicates
rm managed/concepts/unified-relationship-taxonomy.md
rm managed/concepts/work-context-reliability.md
rm managed/specs/relationship-standard-format.md

# Archive historical
mkdir -p managed/archive/history
mv managed/reviews/*.md managed/archive/history/
mv managed/sessions/*.md managed/archive/history/
mv managed/architecture/diagrams/SESSION_SUMMARY.md managed/archive/history/

# Archive design principles
mkdir -p managed/archive/concepts
mv managed/concepts/immediate-feedback.md managed/archive/concepts/
mv managed/concepts/progressive-disclosure.md managed/archive/concepts/
mv managed/concepts/purpose-refinement.md managed/archive/concepts/
mv managed/concepts/user-mental-model.md managed/archive/concepts/
```

### Review & Decide (11 files)

**Primary Types** - Check code usage:
```bash
grep -r "AnalysisReport" src/ | wc -l  # If 0, delete
grep -r "ExtractionResult" src/ | wc -l
grep -r "TrackableStatistics" src/ | wc -l
grep -r "TsdocEdgeConfig" src/ | wc -l
```

**Specs** - Compare with actual:
- `enhanced-database-schema.md` vs `src/storage/DatabaseManager.ts`

**Workflows** - Validate current:
- `add-enhanced-docs-workflow.md` - still used?
- `cli-feedback-cycle.md`, `cognitive-user-flow.md` - archive?

**Concepts** - Keep or archive:
- `integration-test-traceability.md` - link to TestRelationshipsCommand
- `parallel-work-theory.md` - link to ParallelWorkCommand

## After Cleanup

**Expected Structure**:
```
managed/
├── relationships/        (11 files) - ✅ SSOT for relationship types
├── features/            (5 files)  - ✅ Feature documentation
├── architecture/        (4 files)  - ✅ System architecture
├── workflows/           (1 file)   - ✅ work-context-workflow.md
├── concepts/            (2 files)  - ⚠️  Keep only if linked to commands
├── primary-types/       (0-4 files)- ⚠️  Verify usage
├── specs/               (0-1 files)- ⚠️  Verify current
└── archive/             (NEW)      - Historical & design docs
    ├── history/         (5 files)  - Session notes, reviews
    └── concepts/        (4 files)  - Design principles
```

**Total Active**: ~25-30 files (down from 47)

## Validation

After cleanup, verify with:
```bash
# All active docs should be discoverable from entrypoint
tsdoc-edge explore-entrypoint managed/relationships/index.md --detect-orphans

# Should show minimal orphaned docs (only archive/)
```
