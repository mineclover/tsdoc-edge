---
title: Analyzer Status
type: feature
category: feature
status: active
canonical: true
---

# [[Analyzer Status]]

Current status of all relationship analyzers in TSDoc Edge - which are active, relationship counts, and activation blockers.

## Purpose

Current status of all relationship analyzers in TSDoc Edge, showing which analyzers are active, how many relationships they detect, and why some analyzers cannot be activated.

**Last Updated**: 2025-12-26

## Active Analyzers (16 types)

### Data-Flow Category (1 type, 17,269 relationships)

#### ✅ IO Dependency (17,269)
- **Analyzer**: `IODependencyAnalyzer`
- **Pattern**: Input/output type matching
- **Status**: Fully active
- **Performance**: Excellent

### Behavioral Category (6 types, 7,561 relationships)

#### ✅ Pipeline (4,276)
- **Analyzer**: `DependencyChainAnalyzer`
- **Pattern**: 3+ step transformation chains
- **Status**: Fully active
- **Performance**: Good

#### ✅ Calls (2,752)
- **Analyzer**: `CallGraphAnalyzer`
- **Pattern**: Function/method invocations
- **Status**: Fully active
- **Performance**: Good

#### ✅ Temporal Order (254)
- **Analyzer**: `TemporalOrderAnalyzer`
- **Pattern**: Sequential execution dependencies
- **Status**: ✅ **Recently Enhanced** (2025-11-12)
- **Enhancements**:
  - Constructor field initialization sequences
  - Async/await execution sequences
  - Enhanced lifecycle hooks (beforeEach, afterEach, setup, teardown)
  - Promise chain detection (.then(), .catch())
- **Performance**: Good (~500ms)
- **Documentation**: [[Temporal Order]]

#### ✅ Composition (154)
- **Analyzer**: `CompositionAnalyzer`
- **Pattern**: Class field dependencies
- **Status**: Fully active

#### ✅ Collaboration (118)
- **Analyzer**: `CollaborationAnalyzer`
- **Pattern**: Cross-class method cooperation
- **Status**: Fully active

#### ✅ Callback (7)
- **Analyzer**: `CallbackAnalyzer`
- **Pattern**: Function passed as parameter
- **Status**: Active (low count due to codebase style)

### Semantic Category (2 types, 8,847 relationships)

#### ✅ Feature Grouping (8,816)
- **Analyzer**: `FeatureGroupingAnalyzer`
- **Pattern**: Documentation-based feature clustering
- **Status**: Fully active
- **Performance**: Excellent

#### ✅ Conceptual Relation (31)
- **Analyzer**: `ConceptualRelationAnalyzer`
- **Pattern**: Abstract concept relationships
- **Status**: Active

### Structural Category (3 types, 3,982 relationships)

#### ✅ Code Dependency (2,799)
- **Analyzer**: Built-in during parsing
- **Pattern**: Import/export statements
- **Status**: Fully active
- **Performance**: Excellent

#### ✅ Type Dependency (1,116)
- **Analyzer**: `TypeDependencyAnalyzer`
- **Pattern**: Parameter, return, property types
- **Status**: ✅ **Recently Fixed** (2025-11-12)
- **Fix**: Changed from `Object.entries()` to `Map.entries()` for proper Map iteration
- **Result**: 0 → 1,116 relationships (parameter: 410, return-type: 480, property: 226)
- **Performance**: Good (~800ms)
- **Documentation**: [[TypeDependencyAnalyzer]]

#### ✅ Inheritance (67)
- **Analyzer**: Built-in during parsing
- **Pattern**: `extends` and `implements` clauses
- **Status**: Fully active

### Alternative Category (2 types, 2,095 relationships)

#### ✅ Substitution (2,080)
- **Analyzer**: `SubstitutionAnalyzer`
- **Pattern**: Interchangeable implementations
- **Status**: Fully active

#### ✅ Fallback (15)
- **Analyzer**: `FallbackAnalyzer`
- **Pattern**: Error recovery alternatives
- **Status**: Active

### Verification Category (2 types, 1,008 relationships)

#### ✅ Integration Verification (808)
- **Analyzer**: `IntegrationVerificationAnalyzer`
- **Pattern**: Cross-module test relationships
- **Status**: Fully active

#### ✅ Test Coverage (200)
- **Analyzer**: `TestCoverageAnalyzer`
- **Pattern**: Test file to implementation mapping
- **Status**: Fully active

---

## Inactive Analyzers (8 types)

### ❌ Implementation
- **Analyzer**: `ImplementationAnalyzer`
- **Why Inactive**: TSDoc Edge codebase uses `extends` for class inheritance, not `implements` for interface implementation
- **Pattern Required**: Classes with `implements` keyword
- **Can Be Activated**: Yes, in codebases with interface implementations
- **Codebase Impact**: Low (architectural choice, not a limitation)

### ❌ Generic Constraint
- **Analyzer**: Built-in during type dependency analysis
- **Why Inactive**: Current codebase has minimal use of generic type constraints
- **Pattern Required**: `<T extends SomeType>` in function/class signatures
- **Can Be Activated**: Yes, in codebases with heavy generic usage
- **Codebase Impact**: Low (not frequently needed in CLI tools)

### ❌ Event Flow
- **Analyzer**: `EventFlowAnalyzer`
- **Why Inactive**: TSDoc Edge is a CLI tool, not an event-driven application
- **Pattern Required**: Event emitters, event listeners, event handlers
- **Can Be Activated**: Yes, in event-driven architectures (UI, servers)
- **Codebase Impact**: None (architectural mismatch)

### ❌ Circular Dependency
- **Analyzer**: `CircularDependencyAnalyzer` (planned)
- **Why Inactive**: Not yet implemented
- **Pattern Required**: A → B → C → A cycles
- **Can Be Activated**: Yes, after implementation
- **Codebase Impact**: Medium (useful for detecting architecture issues)

### ❌ Alternative
- **Note**: This is a **category**, not a relationship type
- **Status**: Category is active via `substitution` and `fallback` types
- **Clarification**: The "inactive" flag is misleading - the alternative category IS active

### ❌ Enhancement
- **Analyzer**: `EnhancementAnalyzer`
- **Why Inactive**: Requires documentation annotations or code patterns not present
- **Pattern Required**: `@enhances`, `@improves`, or decorator-based enhancements
- **Can Be Activated**: Yes, with documentation annotations
- **Codebase Impact**: Low (documentation-driven, optional)

### ❌ Integration Test
- **Note**: This appears to be confused with `integration-verification`
- **Status**: `integration-verification` is active with 808 relationships
- **Clarification**: The analyzer IS working, just under a different name

### ❌ Contract Fulfillment
- **Analyzer**: Planned for formal contract verification
- **Why Inactive**: Not yet implemented
- **Pattern Required**: Design-by-contract annotations or formal specs
- **Can Be Activated**: Yes, after implementation
- **Codebase Impact**: Low (advanced feature, not critical for most use cases)

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| **Total Relationships** | 49,448 |
| **Active Analyzer Types** | 16 |
| **Inactive Analyzer Types** | 8 (3 architectural mismatches, 2 not implemented, 2 naming confusion, 1 documentation-driven) |
| **Active Categories** | 6 (all categories active) |
| **Activation Rate** | 16/19 = **84.2%** |

### Breakdown by Category

| Category | Types | Relationships | Percentage |
|----------|-------|---------------|------------|
| Data-Flow | 1 | 22,629 | 45.8% |
| Testing | 2 | 11,981 | 24.2% |
| Structural | 3 | 4,938 | 10.0% |
| Semantic | 2 | 3,573 | 7.2% |
| Behavioral | 6 | 3,482 | 7.0% |
| Alternative | 2 | 2,845 | 5.8% |

---

## Recent Improvements (2025-11-12)

### 1. TypeDependencyAnalyzer Bug Fix
**Problem**: Used `Object.entries()` on Map, causing 0 relationships to be detected

**Fix**: Changed to `Map.entries()` for proper iteration

**Result**: 0 → 1,116 type dependencies (868 parameter, 960 return-type, 304 property)

**Impact**: +2.7% relationship coverage

### 2. TemporalOrderAnalyzer Enhancement
**Added Patterns**:
1. Constructor field initialization sequences
2. Async/await execution sequences
3. Enhanced lifecycle hooks
4. Promise chain detection

**Result**: 254 temporal-order relationships detected

**Impact**: +0.6% relationship coverage

### 3. Relationship-Path Optimization
**Performance**: 30+ seconds → 250ms (120x speedup)

**Method**: Adjacency list + memory-safe BFS

**Impact**: Practical path finding for large graphs

---

## Recommendations

### For Current Codebase

1. ✅ **All critical analyzers are active** - No immediate action needed
2. ✅ **Performance is good** - All analyzers complete in <1 second
3. ⚠️ **Circular dependency detection** - Consider implementing for architecture validation

### For Future Development

1. **Implement CircularDependencyAnalyzer** - Useful for detecting architecture issues
2. **Implement ContractFulfillmentAnalyzer** - Useful for design-by-contract validation
3. **Add Generic Constraint detection** - Low priority, but useful for type-heavy codebases
4. **Document Enhancement patterns** - If enhancement tracking is desired

### For Other Codebases

- **Event-driven apps**: EventFlowAnalyzer will be highly useful
- **OOP with interfaces**: ImplementationAnalyzer will detect interface implementations
- **Generic-heavy code**: Generic constraint detection will be valuable

---

## Running Analyzers

### Individual Analyzers

```bash
# Run specific analyzer
tsdoc-edge analyze-temporal-order src
tsdoc-edge analyze-types src
tsdoc-edge analyze-calls src
```

### All Analyzers

```bash
# Run all analyzers at once
tsdoc-edge analyze-all src
```

### During Build

```bash
# Some analyzers run automatically during build
tsdoc-edge build src
```

**Note**: Not all analyzers run during `build`. Some require explicit commands:
- `temporal-order` - Requires `analyze-temporal-order` or `analyze-all`
- `callback` - Requires `analyze-behavioral` or `analyze-all`
- `collaboration` - Requires `analyze-behavioral` or `analyze-all`

---

## Related Documentation

- Commands Index - All available commands
- [[Temporal Order]] - Temporal order relationship type
- [[TypeDependencyAnalyzer]] - Type dependency analyzer
- [[Relationship Types]] - All relationship types
- [[Analyzers & Extractors]] - Analyzer overview

---

## Links

- Source: src/analyzer/ - All analyzer implementations
- Source: src/commands/Analyze*Command.ts - Analyzer command implementations

---

## Backlinks

### Referenced By

- [[Codebase Health Report]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/codebase-health-report.md:136
- [[Codebase Health Report]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/codebase-health-report.md:343

