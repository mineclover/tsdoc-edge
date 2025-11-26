# Category Migration Map

**Created**: 2025-11-25
**Status**: Draft - Ready for Review
**Related**: CATEGORY-CONSOLIDATION-PLAN.md

## Micro-Category Migration (11 files)

### Phase 1A: Move to `core-components/` (NEW - create this category)

Create `managed/core-components/` as a permanent category for truly core system components.

| Current Path | Symbol | Destination | Reason |
|--------------|--------|-------------|--------|
| `core-components/CLIRunner.md` | CLI Runner | `core-components/CLIRunner.md` | Keep (already in right place) |
| `core-components/DatabaseManager.md` | DatabaseManager | `core-components/DatabaseManager.md` | Keep (already in right place) |
| `storage/SymbolRegistryManager.md` | SymbolRegistryManager | `core-components/SymbolRegistryManager.md` | Storage is a core component |
| `graph/DepthTraverser.md` | DepthTraverser | `core-components/DepthTraverser.md` | Graph traversal is core |
| `config/ConfigManager.md` | ConfigManager | `core-components/ConfigManager.md` | Config is core infrastructure |

**Result**: `core-components/` will have 5 files (core infrastructure)

### Phase 1B: Move to `concepts/`

| Current Path | Symbol | Destination | Reason |
|--------------|--------|-------------|--------|
| `analysis/relationship-ontology.md` | Relationship Ontology | `concepts/relationship-ontology.md` | Conceptual framework |
| `conventions/relationship-conventions.md` | Relationship Conventions | `concepts/relationship-conventions.md` | Design conventions |
| `architecture/mermaid-validation-workflow.md` | Mermaid Diagram Validation Workflow | `workflows/mermaid-validation-workflow.md` | It's a workflow, not architecture |
| `architecture/README.md` | (no H1) | DELETE or merge into concepts/architecture.md | Index file, likely redundant |

**Result**: `concepts/` will have 12 files (10 + 2)

### Phase 1C: Move to `utilities/`

| Current Path | Symbol | Destination | Reason |
|--------------|--------|-------------|--------|
| `fixer/DocumentationFixer.md` | DocumentationFixer | `utilities/DocumentationFixer.md` | Utility function |
| `fixer/RecursiveImprover.md` | RecursiveImprover | `utilities/RecursiveImprover.md` | Utility function |

**Result**: `utilities/` will have 21 files (19 + 2)

## Phase 2: Merge Duplicate Categories

### Phase 2A: Merge `parsers/` → `parser/`

Investigation needed: which category has more files?
- `parser/` has 4 files
- `parsers/` has 3 files

**Decision**: Merge `parsers/` → `parser/` (keep singular form)

```bash
# Commands to execute:
git mv managed/parsers/*.md managed/parser/
git rm -r managed/parsers/
```

**Result**: `parser/` will have 7 files (4 + 3)

### Phase 2B: Investigate `types/` vs `primary-types/`

- `types/` has 20 files
- `primary-types/` has 20 files

**Action**: Requires investigation of file content to determine if merge is appropriate.

**Options**:
1. **Keep separate** with better naming:
   - `types/` → `type-definitions/` (TS type interfaces, internal types)
   - `primary-types/` → `domain-types/` (Domain model types, business concepts)

2. **Merge all** → `types/`:
   - If distinction is unclear or not valuable

**Decision**: DEFER - needs content review

## Phase 3: Merge Related Categories

### Phase 3A: Merge `fold/` + `generator/` → `code-generation/`

- `fold/` has 3 files
- `generator/` has 6 files

Both are about code/documentation generation.

```bash
# Commands to execute:
mkdir -p managed/code-generation
git mv managed/fold/*.md managed/code-generation/
git mv managed/generator/*.md managed/code-generation/
git rm -r managed/fold/ managed/generator/
```

**Result**: `code-generation/` will have 9 files (3 + 6)

### Phase 3B: Move `doc-symbols/` → `features/`

- `doc-symbols/` has 6 files

Document symbols are a feature, not a separate category.

```bash
# Commands to execute:
git mv managed/doc-symbols/*.md managed/features/
# Update category frontmatter in each file
git rm -r managed/doc-symbols/
```

**Result**: `features/` will have 26 files (20 + 6)

## Summary of Changes

### Directories to DELETE (8):
1. `managed/storage/` → files moved to `core-components/`
2. `managed/graph/` → files moved to `core-components/`
3. `managed/analysis/` → files moved to `concepts/`
4. `managed/conventions/` → files moved to `concepts/`
5. `managed/config/` → files moved to `core-components/`
6. `managed/fixer/` → files moved to `utilities/`
7. `managed/parsers/` → files moved to `parser/`
8. `managed/fold/` → files moved to `code-generation/`
9. `managed/generator/` → files moved to `code-generation/`
10. `managed/doc-symbols/` → files moved to `features/`
11. `managed/architecture/` → files moved to `workflows/` or deleted

### Directories to CREATE (1):
1. `managed/code-generation/` (new, merged from fold + generator)

### Final Category Count: ~14 categories

```
Before: 25 categories
After:  14 categories
Reduction: 44% (11 categories eliminated)
```

### Final Structure:

```
1.  commands/          (53) - No change
2.  analyzers/         (31) - No change
3.  relationships/     (28) - No change
4.  types/             (20) - DEFER decision on merge with primary-types
5.  primary-types/     (20) - DEFER decision on merge with types
6.  features/          (26) ← +6 from doc-symbols
7.  utilities/         (21) ← +2 from fixer
8.  concepts/          (12) ← +2 from analysis, conventions
9.  workflows/         (9) ← +1 from architecture/mermaid-validation-workflow.md
10. parser/            (7) ← +3 from parsers
11. code-generation/   (9) ← NEW (fold + generator)
12. core-components/   (5) ← +3 from storage, graph, config
13. guides/            (6) ← +1 potentially
14. examples/          (3) - No change
```

## Execution Steps

### Step 1: Verify architecture/README.md
- [ ] Read `managed/architecture/README.md`
- [ ] Decide: DELETE or merge into `concepts/architecture-overview.md`

### Step 2: Execute Phase 1 Moves (Micro-categories)
- [ ] Move 3 files to `core-components/`
- [ ] Move 2 files to `concepts/`
- [ ] Move 1 file to `workflows/`
- [ ] Move 2 files to `utilities/`
- [ ] Delete empty directories

### Step 3: Execute Phase 2 Merges (Duplicates)
- [ ] Merge `parsers/` → `parser/`
- [ ] Investigate and decide on `types/` vs `primary-types/`

### Step 4: Execute Phase 3 Merges (Related)
- [ ] Create `code-generation/` directory
- [ ] Merge `fold/` + `generator/` → `code-generation/`
- [ ] Move `doc-symbols/` → `features/`

### Step 5: Update References
- [ ] Update all [[Symbol]] references (if symbol moved)
- [ ] Update category frontmatter in moved files
- [ ] Run `tsdoc-edge update-backlinks`

### Step 6: Validate
- [ ] Run `tsdoc-edge validate-symbol-refs managed`
- [ ] Run `tsdoc-edge index-docs managed`
- [ ] Verify no broken links

### Step 7: Update Documentation
- [ ] Update `README.md` category list
- [ ] Update `CLAUDE.md` if needed
- [ ] Update any navigation/index files

## Git Commands Template

```bash
# Phase 1A: Core Components
git mv managed/storage/SymbolRegistryManager.md managed/core-components/
git mv managed/graph/DepthTraverser.md managed/core-components/
git mv managed/config/ConfigManager.md managed/core-components/

# Phase 1B: Concepts
git mv managed/analysis/relationship-ontology.md managed/concepts/
git mv managed/conventions/relationship-conventions.md managed/concepts/

# Phase 1B: Workflows
git mv managed/architecture/mermaid-validation-workflow.md managed/workflows/

# Phase 1C: Utilities
git mv managed/fixer/DocumentationFixer.md managed/utilities/
git mv managed/fixer/RecursiveImprover.md managed/utilities/

# Phase 2A: Merge parsers
git mv managed/parsers/*.md managed/parser/

# Phase 3A: Merge code generation
mkdir -p managed/code-generation
git mv managed/fold/*.md managed/code-generation/
git mv managed/generator/*.md managed/code-generation/

# Phase 3B: Move doc-symbols
git mv managed/doc-symbols/*.md managed/features/

# Cleanup empty directories
git rm -r managed/storage/
git rm -r managed/graph/
git rm -r managed/analysis/
git rm -r managed/conventions/
git rm -r managed/config/
git rm -r managed/fixer/
git rm -r managed/parsers/
git rm -r managed/fold/
git rm -r managed/generator/
git rm -r managed/doc-symbols/
git rm -r managed/architecture/  # After handling README.md

# Commit
git commit -m "refactor: consolidate 25 categories down to 14

- Merge micro-categories (1-2 files) into logical parents
- Merge duplicate categories (parser/parsers)
- Create code-generation category (fold + generator)
- Move doc-symbols to features
- Standardize category structure

Reduction: 44% (11 categories eliminated)
Files affected: 42 files moved, 11 directories removed"
```

## Risks

1. **[[Symbol]] reference breakage**: Mitigated by keeping symbol names unchanged
2. **Backlink breakage**: Mitigated by running `update-backlinks` after move
3. **Category frontmatter**: Needs manual update in moved files
4. **Lost files**: Mitigated by using `git mv` to preserve history

## Next Steps

1. ⏳ Review and approve this migration map
2. ⏳ Investigate `architecture/README.md` content
3. ⏳ Decide on `types/` vs `primary-types/` merge
4. ⏳ Execute migrations in phases
5. ⏳ Validate and commit

---

**Status**: Ready for review and execution
**Estimated time**: 2-3 hours for execution + validation
