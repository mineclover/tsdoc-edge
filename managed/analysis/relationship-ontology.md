# [[Relationship Ontology]]

**Purpose**: Document all relationship types collected by tsdoc, their definitions, implementation, and prepare for ontology modeling and pruning redundancies.

**Status**: Analysis Phase
**Created**: 2025-11-17
**Last Updated**: 2025-11-17

---

## Executive Summary

TSDoc Edge currently tracks **6 active relationship types** totaling **11,530 relationships** across the codebase:

| Type | Count | Percentage | Category |
|------|-------|------------|----------|
| test-coverage | 5,293 | 45.9% | Verification |
| code-dependency | 3,040 | 26.4% | Structural |
| contains | 2,452 | 21.3% | Testing |
| conceptual-relation | 465 | 4.0% | Semantic |
| covers-scenario | 176 | 1.5% | Testing |
| inheritance | 104 | 0.9% | Structural |

---

## Relationship Type Definitions

### 1. test-coverage (5,293 relationships)

**Definition**: Links test symbols (test-case, test-suite) to implementation symbols they test.

**Purpose**: Track which implementation code is covered by which tests.

**Category**: `verification`

**Implementation**:
- **Primary**: `src/analyzer/TestCoverageUnifier.ts:122`
  ```typescript
  type: 'test-coverage',
  category: 'verification',
  from: coverage.symbolId,  // test symbol
  to: implementationSymbolId  // implementation symbol
  ```
- **Secondary**: `src/commands/AnalyzeTestsCommand.ts:125`

**Test Files**:
- `src/__tests__/analyzer/TestCoverageAnalyzer.test.ts`

**Example Relationships**:
```
test-case:should-initialize-schema → DatabaseManager
test-case:should-scan-files → FileScanner
```

**Direction**: Unidirectional (test → implementation)

**Strength**: Strong (explicit test-to-code connection)

**Discovery Method**: `test-analysis`

---

### 2. code-dependency (3,040 relationships)

**Definition**: Symbol A imports/uses symbol B from another module.

**Purpose**: Track import-based dependencies between modules and symbols.

**Category**: `structural`

**Implementation**:
- **Primary**: `src/commands/ExploreEntrypointCommand.ts:423`
  ```typescript
  type: 'code-dependency',
  from: symbolId,
  to: dep.target
  ```
- **Used in**: Import analysis, dependency graphs

**Test Files**:
- Implicitly tested through integration tests

**Example Relationships**:
```
DatabaseManager → better-sqlite3
FileScanner → glob
SymbolGraphBuilder → ASTSymbolExtractor
```

**Direction**: Unidirectional (consumer → dependency)

**Strength**: Strong (explicit import)

**Discovery Method**: `static-analysis`, `ast-parsing`

---

### 3. contains (2,452 relationships)

**Definition**: Hierarchical containment relationships in test structures.

**Purpose**: Model test suite → test case hierarchy and nested test suites.

**Category**: `testing`

**Implementation**:
- **Primary**: `src/analyzer/TestCoverageAnalyzer.ts:159,178`
  ```typescript
  type: 'contains',
  fromSymbols: [testSuite.id],
  toSymbols: [childSuiteId || testCaseId],
  category: 'testing',
  confidence: 1.0
  ```

**Test Files**:
- `src/__tests__/analyzer/TestCoverageAnalyzer.test.ts`

**Example Relationships**:
```
test-suite:database-manager → test-suite:initialization
test-suite:initialization → test-case:should-create-schema
test-suite:file-scanner → test-case:should-find-ts-files
```

**Direction**: Unidirectional (parent → child)

**Strength**: Strong (explicit structure)

**Discovery Method**: `test-analysis`

---

### 4. conceptual-relation (465 relationships)

**Definition**: Semantic/conceptual connections between symbols based on naming patterns or explicit `@relatedTo` tags.

**Purpose**: Capture domain relationships and conceptual groupings.

**Category**: `semantic`

**Implementation**:
- **Primary**: `src/analyzer/ConceptualRelationAnalyzer.ts:300`
  ```typescript
  type: 'conceptual-relation',
  from: site.symbolA,
  to: site.symbolB,
  direction: 'undirected',
  strength: 'weak',
  category: 'semantic'
  ```

**Detection Strategies**:
1. **Explicit tags**: Parse `@relatedTo` from TSDoc comments
2. **Naming patterns**: Group symbols with common prefixes (e.g., UserService, UserRepository → User domain)

**Test Files**:
- Not directly tested (analyzer component)

**Example Relationships**:
```
UserService ~ UserRepository (naming-pattern)
AuthService ~ TokenManager (@relatedTo tag)
DatabaseManager ~ SymbolRegistryManager (naming-pattern)
```

**Direction**: Undirected (bidirectional semantic link)

**Strength**: Weak (inferred, not explicit in code)

**Discovery Method**: `static-analysis`, `documentation`

**Confidence**:
- Explicit tag: 1.0
- Naming pattern: 0.6

---

### 5. covers-scenario (176 relationships)

**Definition**: Test cases that verify specific test scenarios.

**Purpose**: Map individual test cases to high-level test scenarios they cover.

**Category**: `testing`

**Implementation**:
- **Primary**: `src/analyzer/TestCoverageAnalyzer.ts:202`
  ```typescript
  type: 'covers-scenario',
  fromSymbols: [testCase.id],
  toSymbols: [scenario.id],
  category: 'testing',
  confidence: this.calculateScenarioMatchConfidence(testCase, scenario)
  ```

**Matching Algorithm** (Phase 8.1):
- Multi-strategy semantic matching:
  1. 2+ exact word matches
  2. 1 exact + 1 stem match
  3. 2+ stem matches
- Stem/prefix matching for word variations
- Word normalization (lowercase, special chars removed)

**Test Files**:
- `src/__tests__/analyzer/TestCoverageAnalyzer.test.ts`

**Example Relationships**:
```
test-case:should-initialize-schema → scenario:database-initialization-with-schema
test-case:should-insert-symbol → scenario:symbol-insertion-and-retrieval
```

**Direction**: Unidirectional (test-case → scenario)

**Strength**: Medium (semantic matching)

**Discovery Method**: `test-analysis`

**Confidence**: Variable (based on match quality)

**Coverage**: 100% (34/34 scenarios covered as of Phase 8.1)

---

### 6. inheritance (104 relationships)

**Definition**: Class A extends class B or implements interface I.

**Purpose**: Track object-oriented inheritance hierarchies.

**Category**: `structural`

**Implementation**:
- **Primary**: `src/analyzer/ASTSymbolExtractor.ts:287-296`
  ```typescript
  // Extract inheritance (extends)
  if (node.heritageClauses) {
    for (const clause of node.heritageClauses) {
      if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
        this.relationships.push({
          type: 'extends',  // Maps to 'inheritance'
          from: name,
          to: baseClassName
        });
      }
    }
  }
  ```

**Test Files**:
- `src/__tests__/analyzer/ASTSymbolExtractor.test.ts`

**Example Relationships**:
```
DatabaseManager extends BaseManager
CustomError extends Error
UserController extends BaseController
```

**Direction**: Unidirectional (subclass → superclass)

**Strength**: Strong (explicit language feature)

**Discovery Method**: `ast-parsing`

---

## Relationship Type System Architecture

### Type Hierarchy (from unified.ts)

TSDoc Edge defines **26 relationship types** across **10 categories**, but currently only **6 are actively collected**:

#### Active Types (6):
1. **Structural** (2 types):
   - ✅ `code-dependency` - 3,040 relationships
   - ✅ `inheritance` - 104 relationships
   - ⚠️ `implementation` - Defined but not collected

2. **Verification** (2 types):
   - ✅ `test-coverage` - 5,293 relationships
   - ⚠️ `integration-verification` - Defined but not collected

3. **Testing** (2 types):
   - ✅ `contains` - 2,452 relationships
   - ✅ `covers-scenario` - 176 relationships

4. **Semantic** (1 type):
   - ✅ `conceptual-relation` - 465 relationships

#### Defined But Unused (20 types):

**Data Flow** (3 types):
- `io-dependency` - A's output feeds B's input
- `pipeline` - Sequential processing
- `event-flow` - Event emission/consumption

**Behavioral** (5 types):
- `calls` - Function/method calls
- `callback` - Callback registration
- `collaboration` - Multi-symbol collaboration
- `composition` - Feature composition
- `temporal-order` - Execution ordering

**Alternative** (2 types):
- `substitution` - Interchangeable implementations
- `fallback` - Error fallback chains

**Constraint** (3 types):
- `mutual-exclusion` - Incompatible symbols
- `co-requirement` - Required pairs
- `circular-dependency` - Circular references

**Semantic** (3 additional types):
- `feature-grouping` - Feature clustering
- `doc-reference` - Documentation links
- `enhancement` - Enhancement relationships

**Type System** (2 types):
- `type-dependency` - Type parameter dependencies
- `generic-constraint` - Generic type constraints

**Architectural** (2 types):
- `layer-dependency` - Architectural layer violations
- `module-boundary` - Cross-package dependencies

---

## Analysis: Semantic Overlaps and Redundancies

### Potential Redundancies

#### 1. Testing Hierarchy Overlap

**Issue**: `contains` and `covers-scenario` both represent hierarchical relationships in testing.

- `contains`: Test suite → Test case (structural hierarchy)
- `covers-scenario`: Test case → Scenario (semantic grouping)

**Verdict**: ✅ **NOT REDUNDANT** - Different semantic purposes
- `contains` = organizational structure
- `covers-scenario` = verification coverage

#### 2. Structural Dependencies

**Issue**: `code-dependency` and `inheritance` both represent structural connections.

**Verdict**: ✅ **NOT REDUNDANT** - Different relationship semantics
- `code-dependency` = module-level imports
- `inheritance` = OOP class hierarchy

#### 3. Semantic Relationships

**Issue**: `conceptual-relation` is very broad and could overlap with many specific types.

**Observation**:
- Currently used for naming-pattern relationships and `@relatedTo` tags
- Could potentially overlap with:
  - `feature-grouping` (if it were implemented)
  - `doc-reference` (if it were implemented)

**Verdict**: ⚠️ **POTENTIALLY OVER-BROAD**
- Consider splitting into:
  - `naming-pattern-relation` (shared domain prefix)
  - `explicit-relation` (`@relatedTo` tags)
  - `feature-grouping` (for feature-level grouping)

### Over-Connected Relationships

#### Test Coverage Dominance (45.9%)

**Observation**: `test-coverage` represents 5,293 relationships (45.9% of total).

**Analysis**:
- This is expected and healthy for a documentation platform
- High test coverage is a positive signal
- Not a redundancy issue

**Verdict**: ✅ **APPROPRIATE**

#### Testing Category Concentration (68.7%)

**Observation**: Testing-related types (`test-coverage`, `contains`, `covers-scenario`) = 7,921 relationships (68.7%)

**Analysis**:
- Testing is heavily tracked
- Implementation relationship types are underutilized
- Behavioral, data-flow, and architectural types are missing

**Verdict**: ⚠️ **IMBALANCED** - Consider implementing:
- `calls` relationships (runtime behavior)
- `io-dependency` (data flow)
- `layer-dependency` (architectural constraints)

---

## Recommendations for Pruning and Enhancement

### 1. Refine `conceptual-relation` (PRUNE)

**Action**: Split into more specific types

**Before**:
```
conceptual-relation (465 relationships)
├── naming-pattern matches
└── @relatedTo tags
```

**After**:
```
naming-pattern-relation (naming-based grouping)
explicit-semantic-relation (@relatedTo tags)
feature-grouping (feature-level clustering)
```

**Benefit**: More precise semantic meaning, better queryability

---

### 2. Consolidate Test Hierarchy (KEEP AS-IS)

**Decision**: Keep `contains` and `covers-scenario` separate

**Rationale**:
- Different dimensions: structure vs. coverage
- Both provide unique value
- No semantic overlap

---

### 3. Implement High-Value Missing Types (ENHANCE)

**Priority 1** - Behavioral relationships:
- `calls`: Function/method call relationships → Critical for understanding execution flow

**Priority 2** - Architectural relationships:
- `layer-dependency`: Track architectural violations
- `module-boundary`: Cross-module dependencies

**Priority 3** - Data flow:
- `io-dependency`: Data pipeline tracking

---

### 4. Deprecate Low-Value Defined Types (PRUNE)

**Candidates for Removal**:
- `mutual-exclusion` - Rare use case
- `co-requirement` - Can be inferred from usage
- `fallback` - Too specific, overlaps with error handling patterns
- `temporal-order` - Can be inferred from code flow
- `event-flow` - Too domain-specific

**Rationale**: Keep ontology focused on high-signal relationships

---

## Ontology Modeling Diagram

### Current State (6 Active Types)

```mermaid
graph TB
    subgraph Verification[Verification 45.9%]
        TC[test-coverage<br/>5,293]
    end

    subgraph Structural[Structural 27.3%]
        CD[code-dependency<br/>3,040]
        INH[inheritance<br/>104]
    end

    subgraph Testing[Testing 22.8%]
        CONT[contains<br/>2,452]
        COV[covers-scenario<br/>176]
    end

    subgraph Semantic[Semantic 4.0%]
        CR[conceptual-relation<br/>465]
    end

    style TC fill:#4CAF50
    style CD fill:#2196F3
    style CONT fill:#FF9800
    style CR fill:#9C27B0
    style COV fill:#FF9800
    style INH fill:#2196F3
```

### Proposed State (9 Active Types)

```mermaid
graph TB
    subgraph Verification[Verification]
        TC[test-coverage<br/>5,293]
        IV[integration-verification<br/>NEW]
    end

    subgraph Structural[Structural]
        CD[code-dependency<br/>3,040]
        INH[inheritance<br/>104]
    end

    subgraph Testing[Testing]
        CONT[contains<br/>2,452]
        COV[covers-scenario<br/>176]
    end

    subgraph Semantic[Semantic - REFINED]
        NP[naming-pattern-relation<br/>SPLIT FROM CR]
        ES[explicit-semantic-relation<br/>SPLIT FROM CR]
        FG[feature-grouping<br/>NEW]
    end

    subgraph Behavioral[Behavioral - NEW]
        CALLS[calls<br/>NEW]
    end

    CR[conceptual-relation<br/>DEPRECATED] -.splits into.-> NP
    CR -.splits into.-> ES

    style TC fill:#4CAF50
    style CD fill:#2196F3
    style CONT fill:#FF9800
    style NP fill:#9C27B0
    style ES fill:#9C27B0
    style FG fill:#9C27B0
    style COV fill:#FF9800
    style INH fill:#2196F3
    style CALLS fill:#E91E63
    style IV fill:#4CAF50
    style CR fill:#ccc,stroke-dasharray: 5 5
```

### Relationship Density Map

```mermaid
graph LR
    subgraph Legend
        H[High Density >1000]
        M[Medium Density 100-1000]
        L[Low Density <100]
    end

    TC[test-coverage]:::high
    CD[code-dependency]:::high
    CONT[contains]:::high
    CR[conceptual-relation]:::medium
    COV[covers-scenario]:::medium
    INH[inheritance]:::low

    classDef high fill:#d32f2f,color:#fff
    classDef medium fill:#f57c00,color:#fff
    classDef low fill:#388e3c,color:#fff
```

**Density Analysis**:
- **High density** (>1,000): May indicate over-collection or fundamental relationships
  - `test-coverage`, `code-dependency`, `contains` are all fundamental
- **Medium density** (100-1,000): Well-balanced
  - `conceptual-relation`, `covers-scenario`
- **Low density** (<100): Rare but valuable
  - `inheritance` - Not all codebases use OOP heavily

---

## Implementation Plan

### Phase 1: Refine Existing (Pruning)

**Tasks**:
1. Split `conceptual-relation` into 3 types:
   - Create `naming-pattern-relation` analyzer
   - Create `explicit-semantic-relation` analyzer
   - Create `feature-grouping` analyzer (future)
2. Update database schema to support new types
3. Migrate existing `conceptual-relation` relationships
4. Update documentation

**Estimated effort**: 2 days

---

### Phase 2: Implement High-Priority Missing Types (Enhancement)

**Tasks**:
1. Implement `calls` relationship extractor
   - Parse function/method call AST nodes
   - Track caller → callee relationships
2. Implement `layer-dependency` validator
   - Define layer rules in config
   - Detect cross-layer violations
3. Update BuildCommand to collect new types

**Estimated effort**: 3 days

---

### Phase 3: Prune Unused Types (Cleanup)

**Tasks**:
1. Remove unused types from `unified.ts`:
   - `mutual-exclusion`
   - `co-requirement`
   - `fallback`
   - `temporal-order`
   - `event-flow`
2. Update type documentation
3. Clean up references in codebase

**Estimated effort**: 1 day

---

## References

### Implementation Files

| Type | Implementation | Test |
|------|---------------|------|
| test-coverage | TestCoverageUnifier.ts:122 | TestCoverageAnalyzer.test.ts |
| code-dependency | ExploreEntrypointCommand.ts:423 | integration.test.ts |
| contains | TestCoverageAnalyzer.ts:159,178 | TestCoverageAnalyzer.test.ts |
| conceptual-relation | ConceptualRelationAnalyzer.ts:300 | - |
| covers-scenario | TestCoverageAnalyzer.ts:202 | TestCoverageAnalyzer.test.ts |
| inheritance | ASTSymbolExtractor.ts:287 | ASTSymbolExtractor.test.ts |

### Type System Definition

- `src/types/relationships/unified.ts` - Complete type taxonomy (26 types)
- `src/storage/schema.sql:143` - Database schema

### Analysis Scripts

- `scripts/check-scenario-relationships.ts` - Validate scenario relationships
- `scripts/analyze-uncovered-scenarios.ts` - Analyze scenario coverage gaps

---

## Metrics

**Total Relationships**: 11,530
**Active Types**: 6 / 26 (23%)
**Type Categories**: 10
**Average Relationships per Type**: 1,922
**Most Common**: test-coverage (45.9%)
**Least Common**: inheritance (0.9%)

**Coverage by Category**:
- Verification: 45.9%
- Structural: 27.3%
- Testing: 22.8%
- Semantic: 4.0%

**Unused Categories** (0 relationships):
- Data Flow
- Behavioral
- Alternative
- Constraint (partially)
- Type System
- Architectural
- Quality

---

## Conclusion

The current relationship ontology is **focused but imbalanced**, with heavy emphasis on testing relationships (68.7%) and minimal coverage of behavioral, architectural, and data-flow dimensions.

**Key Actions**:
1. ✅ **Prune**: Refine `conceptual-relation` into more specific types
2. ✅ **Enhance**: Implement `calls`, `layer-dependency`, `io-dependency`
3. ✅ **Cleanup**: Remove 5 low-value defined types
4. ✅ **Balance**: Shift focus to behavioral and architectural relationships

This will result in a more **precise, balanced, and queryable** ontology optimized for SSOT documentation completeness.
