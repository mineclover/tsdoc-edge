# Types vs Primary-Types Analysis

**Created**: 2025-11-25
**Status**: Recommendation - DO NOT MERGE
**Related**: CATEGORY-CONSOLIDATION-PLAN.md

## Question

Should we merge `types/` (20 files) and `primary-types/` (20 files) into a single `types/` category?

## Analysis

### types/ Category (20 files)

**Nature**: Internal implementation types, technical infrastructure

**Files**:
- `AnalyticsTypes.md` - Internal analytics data structures
- `CommentStateTypes.md` - Comment management state
- `DataFlowTypes.md` - Data flow analysis types
- `LinkingTypes.md` - Symbol linking infrastructure
- `ParseTypes.md` - Parser internal types
- `RegistryTypes.md` - Registry system types
- `Symbol.md` - **Core graph symbol type**
- `TestRelationships.md` - Test relationship types
- `UnifiedRelationships.md` - Unified relationship system

**Characteristics**:
- ✅ Technical/implementation focused
- ✅ Source: `src/types/`, `src/graph/`, `src/storage/`
- ✅ Used internally by system components
- ✅ Rarely referenced in user documentation

**Example**: `Symbol.md`
```
Source: src/types/graph/graph.ts
Purpose: Core type representing a code symbol in the symbol graph
Fields: id, name, type, filePath, line, column, etc.
Usage: Internal graph operations
```

### primary-types/ Category (20 files)

**Nature**: Domain model types, business logic, user-facing concepts

**Files**:
- `AnalysisReport.md` - User-facing analysis reports
- `DecisionRecord.md` - ADR (Architectural Decision Record)
- `ErrorExperience.md` - Error tracking domain type
- `Functionality.md` - Feature/functionality metadata
- `FuturePlan.md` - Roadmap and planning types
- `MermaidSymbol.md` - **Mermaid diagram domain type**
- `MermaidRelationship.md` - Mermaid relationship extraction
- `ParsedDocSymbols.md` - Document symbol parsing results
- `TsdocEdgeConfig.md` - User configuration type

**Characteristics**:
- ✅ Domain/business focused
- ✅ Source: `src/doc-symbol/`, `src/analyzer/`, feature modules
- ✅ Used in user-facing features
- ✅ Frequently referenced in documentation

**Example**: `MermaidSymbol.md`
```
Source: src/doc-symbol/MermaidSymbolExtractor.ts
Purpose: Symbols extracted from Mermaid diagram nodes
Fields: nodeId, label, symbolName, typeHint, status, metrics
Usage: Mermaid workflow, diagram parsing
```

## Key Differences

| Aspect | types/ | primary-types/ |
|--------|--------|----------------|
| **Focus** | Technical implementation | Domain concepts |
| **Audience** | Internal developers | Feature users & docs |
| **Stability** | Changes with refactoring | Changes with features |
| **Source Location** | `src/types/`, `src/graph/` | `src/doc-symbol/`, feature dirs |
| **Examples** | Symbol, UnifiedRelationships, ParseTypes | MermaidSymbol, DecisionRecord, AnalysisReport |
| **Reference Frequency** | Low (internal) | High (user-facing) |

## Recommendation: DO NOT MERGE

**Verdict**: Keep separate, but rename for clarity

### Proposed Renaming

1. **types/** → **type-definitions/**
   - Clearer indication: internal system types
   - Alternative: `internal-types/`, `system-types/`

2. **primary-types/** → **domain-types/**
   - Clearer indication: domain model types
   - Alternative: `domain-models/`, `business-types/`

### Rationale

1. **Clear Separation of Concerns**:
   - `type-definitions/`: "How does the system work internally?"
   - `domain-types/`: "What concepts does TSDoc Edge model?"

2. **Different Lifecycle**:
   - System types change with refactoring (implementation details)
   - Domain types change with features (business requirements)

3. **Different Audiences**:
   - System types: Internal developers doing refactoring
   - Domain types: Feature developers and documentation writers

4. **Different Documentation Needs**:
   - System types: Implementation-focused (structure, fields, usage)
   - Domain types: Concept-focused (purpose, examples, workflows)

5. **Search and Discovery**:
   - Easier to find: "I need a domain concept" → `domain-types/`
   - Easier to find: "I need an internal type" → `type-definitions/`

## Alternative: Merge with Subcategories

If we insist on merging, use subdirectories:

```
types/
├── internal/          # Current types/
│   ├── Symbol.md
│   ├── ParseTypes.md
│   └── ...
└── domain/            # Current primary-types/
    ├── MermaidSymbol.md
    ├── DecisionRecord.md
    └── ...
```

**Pros**:
- Single top-level category
- Clear subcategory distinction

**Cons**:
- More complex navigation
- Extra directory level
- Harder to reference in docs (`types/internal/Symbol` vs `type-definitions/Symbol`)

## Final Recommendation

**Option 1 (Recommended)**: Keep separate with better names
```
type-definitions/  (20 files) - Internal system types
domain-types/      (20 files) - Domain model types
```

**Option 2 (Alternative)**: Merge with subdirectories
```
types/
├── internal/      (20 files)
└── domain/        (20 files)
```

**Option 3 (Not Recommended)**: Merge into single `types/`
- ❌ Loses valuable distinction
- ❌ Harder to navigate (40 files in one directory)
- ❌ Confuses internal vs domain types

## Implementation

If we proceed with Option 1 (recommended):

```bash
# Rename types/ → type-definitions/
git mv managed/types managed/type-definitions

# Rename primary-types/ → domain-types/
git mv managed/primary-types managed/domain-types

# Update category frontmatter in all files (automated)
# Update references in documentation
# Update backlinks
```

Estimated time: 1 hour

## Conclusion

**DO NOT MERGE** `types/` and `primary-types/`.

The distinction between internal system types and domain model types is valuable and should be preserved. Recommend renaming for clarity:
- `types/` → `type-definitions/`
- `primary-types/` → `domain-types/`

This maintains the organizational benefit while improving discoverability.

---

**Decision**: Awaiting approval
**Next Steps**: If approved, execute Option 1 renaming
