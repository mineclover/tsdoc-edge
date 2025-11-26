# Category Consolidation Plan

**Created**: 2025-11-25
**Status**: Draft
**Goal**: Reduce from 25 categories to 8-10 core categories

## Current State Analysis

### Category Distribution (25 total)

```
Large categories (8) - 10+ files:
  53  commands
  31  analyzers
  28  relationships
  20  types
  20  primary-types
  20  features
  19  utilities
  10  concepts

Medium categories (4) - 5-9 files:
   8  workflows
   6  generator
   6  doc-symbols
   5  guides

Small categories (4) - 3-4 files:
   4  parser
   3  parsers
   3  fold
   3  examples

Micro categories (9) - 1-2 files ⚠️  CONSOLIDATION TARGET:
   2  fixer
   2  core-components
   2  architecture
   1  storage
   1  graph
   1  conventions
   1  config
   1  analysis
```

**Total**: 25 categories, 250 document symbols

## Problems

1. **Too many micro-categories**: 9 categories with only 1-2 files
2. **Overlapping categories**:
   - `parser` vs `parsers` (duplicate concept)
   - `types` vs `primary-types` (unclear distinction)
   - `generator` vs `fold` (both code generation)
3. **Implementation-focused categories**: `fixer`, `fold`, `generator` are code structure, not concepts
4. **Unclear boundaries**: Where do new docs go?

## Consolidation Strategy

### Phase 1: Merge Micro-Categories (9 → 0)

#### 1.1 Merge `architecture` (2) → `concepts`
- `architecture/README.md` → `concepts/architecture-overview.md`
- `architecture/diagrams/README.md` → Keep in `architecture/diagrams/` (special case for .mmd files)

**Rationale**: Architecture documents describe conceptual design, not implementation

#### 1.2 Merge `core-components` (2) → `utilities` or `analyzers`
- Examine each file to determine if it's a utility or analyzer
- `DatabaseManager` → `core-components/` (keep, it's truly core)
- Other components → merge based on function

**Rationale**: "Core components" is too vague

#### 1.3 Merge `storage` (1) → `core-components`
- `storage/SymbolRegistryManager.md` → `core-components/`

**Rationale**: Storage is a core system component

#### 1.4 Merge `graph` (1) → `core-components`
- `graph/SymbolGraphBuilder.md` → `core-components/`

**Rationale**: Graph is a core system component

#### 1.5 Merge `analysis` (1) → `analyzers`
- Check what this single file is and move to `analyzers/`

**Rationale**: Analysis belongs with analyzers

#### 1.6 Merge `conventions` (1) → `guides`
- `conventions/*.md` → `guides/conventions.md`

**Rationale**: Conventions are guidance documents

#### 1.7 Merge `config` (1) → `concepts` or root
- Check if it's `.tsdoc.config.json` documentation → keep in root or `concepts/`

**Rationale**: Configuration is a concept, not a category

#### 1.8 Merge `fixer` (2) → `utilities`
- Fixer utilities are implementation tools

**Rationale**: Fixers are utility functions

#### 1.9 Merge `parser` (4) + `parsers` (3) → ONE `parser` category
- Consolidate `parsers/` → `parser/`
- **OR** keep `parsers/` and delete `parser/` (choose most populated)

**Rationale**: Eliminate duplicate categories

### Phase 2: Merge Small Categories (4 → 1-2)

#### 2.1 Merge `fold` (3) + `generator` (6) → `code-generation`
- Both are about generating code/docs from templates
- New unified category: `code-generation/` (9 files)

**Rationale**: Related functionality

#### 2.2 Keep or Merge `examples` (3)
- **Option A**: Keep as-is (examples are valuable)
- **Option B**: Distribute to relevant categories (e.g., workflow examples → `workflows/`)

**Decision**: Keep `examples/` as separate category (useful for onboarding)

### Phase 3: Clarify Medium/Large Categories

#### 3.1 Merge `types` (20) + `primary-types` (20) → ONE `types` category?
- Investigate difference between `types/` and `primary-types/`
- If distinction is valuable, keep both but rename for clarity:
  - `types/` → `type-definitions/` (implementation types)
  - `primary-types/` → `domain-types/` (domain concepts)
- If distinction is unclear, merge all into `types/`

**Rationale**: Reduce cognitive load

#### 3.2 Merge `doc-symbols` (6) → `features` or `concepts`
- Document symbols are a feature/concept, not a separate category
- Move to `features/` or create subsection in `concepts/`

**Rationale**: Reduce top-level categories

## Proposed Final Structure (10 categories)

After consolidation:

```
1. commands/          (53) - CLI command documentation
2. analyzers/         (31+1) - Relationship analyzers
3. relationships/     (28) - Relationship type specs
4. types/             (40) - Type definitions (merged types + primary-types)
5. features/          (20+6) - Feature documentation
6. utilities/         (19+2+2) - Utility functions
7. concepts/          (10+2+1) - Core concepts
8. workflows/         (8) - Workflow guides
9. guides/            (5+1) - User guides
10. code-generation/  (9) - Code/doc generation (merged fold + generator)
```

**Optional 11-12**:
- `examples/` (3) - Keep separate for onboarding
- `core-components/` (2+1+1) - Keep truly core components separate

**Total**: 10-12 categories (down from 25)

## Implementation Plan

### Step 1: Verify Content (Week 1)
- Review each micro-category file to understand content
- Determine correct destination category
- Document any conflicts or unclear cases

### Step 2: Create Mapping (Week 1)
- Create detailed file-by-file migration map
- Identify any [[Symbol]] references that need updating
- Plan backlink updates

### Step 3: Execute Moves (Week 2)
- Use `git mv` to preserve history
- Update all [[Symbol]] references
- Update backlinks
- Update category frontmatter

### Step 4: Validate (Week 2)
- Run `tsdoc-edge validate-symbol-refs managed`
- Run `tsdoc-edge index-docs managed`
- Run `tsdoc-edge update-backlinks`
- Verify no broken links

### Step 5: Update Guides (Week 2)
- Update `README.md` with new category structure
- Update `CLAUDE.md` if needed
- Update navigation docs

## Success Criteria

- ✅ Reduced to 10-12 categories (from 25)
- ✅ No micro-categories (1-2 files)
- ✅ Clear category boundaries
- ✅ All [[Symbol]] refs valid
- ✅ All backlinks correct
- ✅ Documentation updated

## Risks and Mitigations

**Risk 1**: Breaking existing workflows
- **Mitigation**: Use `git mv` to preserve history, update all references

**Risk 2**: Unclear category assignments
- **Mitigation**: Document decision criteria, review with stakeholders

**Risk 3**: Loss of information
- **Mitigation**: Keep category metadata in frontmatter, maintain index

## Next Actions

1. ✅ Analyze current state (DONE)
2. ⏳ Review micro-category files individually
3. ⏳ Create detailed migration map
4. ⏳ Execute Phase 1 consolidation
5. ⏳ Validate and iterate

---

**Status**: Ready for review
**Approver**: Project maintainer
**Timeline**: 2 weeks
