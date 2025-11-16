---
title: Unified Relationship Taxonomy
type: concept
category: relationships
status: active
canonical: true
---

# [[Unified Relationship Taxonomy]]

> **Complete classification system** for all symbol relationships

## Purpose

Provides a comprehensive taxonomy for categorizing all types of relationships between symbols, enabling systematic tracking and analysis.

**Problem**: Previous systems only tracked basic code dependencies (imports), missing critical relationships like data flow, behavioral patterns, and semantic connections.

**Solution**: 7-category taxonomy with 18 distinct relationship types, each with defined semantics and evidence requirements.

**Benefits**:
- **Complete coverage**: All relationship types in one system
- **Consistent semantics**: Clear definition for each type
- **Evidence-based**: Relationships backed by code, docs, or tests
- **Query flexibility**: Filter by category, type, or strength

## The 7 Categories

### 1. Structural (3 types)

**Definition**: Physical code structure and organization relationships

**Types**:
- **code-dependency**: A imports B
- **inheritance**: A extends B (class hierarchy)
- **implementation**: A implements Interface I

**Characteristics**:
- **Strength**: Strong (explicit in code)
- **Direction**: Unidirectional
- **Discovery**: AST parsing
- **Confidence**: 1.0 (verifiable)

**Examples**:
```typescript
import { DatabaseManager } from './DatabaseManager'; // code-dependency
class BuildCommand extends BaseCommand { }           // inheritance
class User implements Serializable { }               // implementation
```

**Use Cases**:
- Dependency graph construction
- Import cycle detection
- Architecture layer validation
- Refactoring impact analysis

---

### 2. Data Flow (3 types)

**Definition**: How data moves between symbols

**Types**:
- **io-dependency**: A's output feeds B's input
- **pipeline**: A � B � C sequential data processing
- **event-flow**: A emits events consumed by B

**Characteristics**:
- **Strength**: Strong to Medium
- **Direction**: Unidirectional
- **Discovery**: Static analysis, runtime tracing
- **Confidence**: 0.8-1.0

**Examples**:
```typescript
// io-dependency
const symbols = extractor.extract();
await db.save(symbols);  // extractor output � db input

// pipeline
data � parse() � validate() � transform() � save()

// event-flow
emitter.on('data-ready', handler);
emitter.emit('data-ready', data);
```

**Use Cases**:
- Data lineage tracking
- Pipeline optimization
- Event system visualization
- Performance bottleneck detection

---

### 3. Behavioral (5 types)

**Definition**: Runtime behavior and interaction patterns

**Types**:
- **calls**: A calls function/method B
- **callback**: A registers B as callback
- **collaboration**: A collaborates with B to achieve goal
- **composition**: Feature = A + B + C (combined functionality)
- **temporal-order**: A must execute before B

**Characteristics**:
- **Strength**: Strong to Weak
- **Direction**: Unidirectional or Bidirectional
- **Discovery**: AST parsing, runtime tracing
- **Confidence**: 0.7-1.0

**Examples**:
```typescript
// calls
buildCommand.execute();  // BuildCommand calls execute()

// callback
button.addEventListener('click', handleClick);

// collaboration
// User + AuthService + Database collaborate for authentication

// composition
// SymbolExtraction = BuildCommand + ASTExtractor + DatabaseManager

// temporal-order
await initialize();  // must run before
await processData(); // can run
```

**Use Cases**:
- Call graph analysis
- Dead code detection
- Feature decomposition
- Execution flow tracing

---

### 4. Alternative (2 types)

**Definition**: Interchangeable or fallback relationships

**Types**:
- **substitution**: A OR B can be used (same interface)
- **fallback**: Try A, if fails use B

**Characteristics**:
- **Strength**: Medium to Weak
- **Direction**: Undirected
- **Discovery**: Type inference, documentation
- **Confidence**: 0.6-0.8

**Examples**:
```typescript
// substitution
// SymbolRegistryManager OR DatabaseManager implement ISymbolStorage
const storage: ISymbolStorage = useRegistry ?
  new SymbolRegistryManager() :
  new DatabaseManager();

// fallback
try {
  result = await primaryAPI();
} catch {
  result = await fallbackAPI();  // fallback to secondary
}
```

**Use Cases**:
- Polymorphism detection
- Fault tolerance analysis
- Architecture flexibility assessment
- Interface conformance checking

---

### 5. Constraint (2 types)

**Definition**: Required or forbidden co-existence

**Types**:
- **mutual-exclusion**: A and B cannot coexist
- **co-requirement**: A requires B to be present

**Characteristics**:
- **Strength**: Strong
- **Direction**: Unidirectional or Bidirectional
- **Discovery**: Documentation, runtime validation
- **Confidence**: 0.7-0.9

**Examples**:
```typescript
// mutual-exclusion
// Cannot use both SQLite and PostgreSQL adapters simultaneously
if (useSQLite && usePostgres) {
  throw new Error('Cannot use both adapters');
}

// co-requirement
// BuildCommand requires ConfigManager to be initialized
class BuildCommand {
  constructor(private config: ConfigManager) {
    if (!config.isInitialized()) {
      throw new Error('ConfigManager must be initialized');
    }
  }
}
```

**Use Cases**:
- Configuration validation
- Prerequisite checking
- Compatibility verification
- Error prevention

---

### 6. Semantic (2 types)

**Definition**: Conceptual and organizational relationships

**Types**:
- **conceptual-relation**: A and B are related concepts
- **feature-grouping**: A, B, C belong to same feature

**Characteristics**:
- **Strength**: Weak
- **Direction**: Undirected
- **Discovery**: Documentation, manual curation
- **Confidence**: 0.5-0.7

**Examples**:
```typescript
// conceptual-relation
// User �� UserProfile �� UserSettings (related user concepts)

// feature-grouping
// BuildCommand, WorkContextCommand, TreeCommand � "Analysis Features"
```

**Use Cases**:
- Documentation organization
- Feature mapping
- Knowledge graph construction
- Onboarding assistance

---

### 7. Verification (2 types)

**Definition**: Testing and quality assurance relationships

**Types**:
- **test-coverage**: A is tested by TestA
- **integration-verification**: A�B connection verified by test

**Characteristics**:
- **Strength**: Medium
- **Direction**: Unidirectional
- **Discovery**: Test analysis
- **Confidence**: 1.0 (explicit)

**Examples**:
```typescript
// test-coverage
describe('BuildCommand', () => {
  it('should extract symbols', async () => {
    // test code
  });
});

// integration-verification
it('BuildCommand � DatabaseManager integration', async () => {
  const cmd = new BuildCommand(db);
  await cmd.execute();
  expect(db.symbolCount).toBeGreaterThan(0);
});
```

**Use Cases**:
- Coverage gap detection
- Integration test mapping
- Quality metrics
- Test prioritization

---

## Complete Taxonomy Table

| Category | Type | Strength | Direction | Discovery | Confidence | Count |
|----------|------|----------|-----------|-----------|------------|-------|
| **Structural** | code-dependency | Strong | Uni | AST | 1.0 | ~500 |
| | inheritance | Strong | Uni | AST | 1.0 | ~50 |
| | implementation | Strong | Uni | AST | 1.0 | ~30 |
| **Data Flow** | io-dependency | Strong | Uni | Static | 0.9 | ~200 |
| | pipeline | Medium | Uni | Static | 0.8 | ~20 |
| | event-flow | Medium | Uni | Runtime | 0.7 | ~15 |
| **Behavioral** | calls | Strong | Uni | AST | 1.0 | ~1500 |
| | callback | Medium | Uni | AST | 0.9 | ~50 |
| | collaboration | Weak | Bi | Manual | 0.6 | ~10 |
| | composition | Weak | Undi | Manual | 0.6 | ~20 |
| | temporal-order | Medium | Uni | Runtime | 0.7 | ~5 |
| **Alternative** | substitution | Medium | Undi | Type | 0.7 | ~15 |
| | fallback | Medium | Uni | Docs | 0.7 | ~8 |
| **Constraint** | mutual-exclusion | Strong | Bi | Docs | 0.8 | ~3 |
| | co-requirement | Strong | Uni | Docs | 0.8 | ~25 |
| **Semantic** | conceptual-relation | Weak | Undi | Manual | 0.5 | ~30 |
| | feature-grouping | Weak | Undi | Docs | 0.6 | ~12 |
| **Verification** | test-coverage | Medium | Uni | Test | 1.0 | ~80 |
| | integration-verification | Medium | Uni | Test | 1.0 | ~10 |

**Total**: 18 relationship types across 7 categories

---

## Relationship Properties

### Strength Levels

**Strong** (Direct, explicit):
- Verifiable in code
- Low false positive rate
- Examples: imports, calls, inheritance

**Medium** (Indirect, inferred):
- Requires analysis
- Some interpretation needed
- Examples: data flow, callbacks, constraints

**Weak** (Loose, potential):
- Requires manual curation
- Higher subjectivity
- Examples: conceptual relations, feature grouping

### Direction Types

**Unidirectional** (A � B):
- Clear source and target
- Examples: imports, calls, data flow

**Bidirectional** (A � B):
- Mutual relationship
- Examples: collaboration, mutual exclusion

**Undirected** (A  B):
- No inherent direction
- Examples: substitution, conceptual relations

### Discovery Methods

**AST Parsing** (Highest confidence):
- TypeScript Compiler API
- Confidence: 1.0
- Types: code-dependency, inheritance, calls

**Static Analysis** (High confidence):
- Data flow analysis
- Confidence: 0.8-0.9
- Types: io-dependency, pipeline

**Type Inference** (Medium confidence):
- Type system analysis
- Confidence: 0.7-0.8
- Types: substitution, implementation

**Documentation** (Lower confidence):
- TSDoc tags, markdown
- Confidence: 0.6-0.8
- Types: constraints, semantic relations

**Runtime Tracing** (Variable confidence):
- Execution monitoring
- Confidence: 0.7-0.9
- Types: event-flow, temporal-order

**Manual Curation** (Lowest confidence):
- Human judgment
- Confidence: 0.5-0.7
- Types: collaboration, conceptual relations

---

## Usage Guidelines

### When to Use Each Category

**Structural**: Physical code organization
- Use for: Dependency analysis, layer violations, circular imports
- Query: "What does X import?"

**Data Flow**: Data movement
- Use for: Lineage tracking, pipeline visualization, data provenance
- Query: "Where does this data come from?"

**Behavioral**: Runtime interactions
- Use for: Call graphs, dead code detection, execution flow
- Query: "Who calls this function?"

**Alternative**: Interchangeable options
- Use for: Polymorphism, fallback detection, interface conformance
- Query: "What can replace this component?"

**Constraint**: Dependencies and conflicts
- Use for: Prerequisite checking, configuration validation
- Query: "What does X require to work?"

**Semantic**: Conceptual organization
- Use for: Documentation, knowledge graphs, feature mapping
- Query: "What features use this concept?"

**Verification**: Testing relationships
- Use for: Coverage analysis, test gap detection, quality metrics
- Query: "Is this code tested?"

---

## Query Examples

### By Category
```typescript
// All structural relationships
db.queryRelationships({ category: 'structural' });

// All data flow relationships
db.queryRelationships({ category: 'data-flow' });
```

### By Type
```typescript
// All function calls
db.queryRelationships({ type: 'calls' });

// All test coverage
db.queryRelationships({ type: 'test-coverage' });
```

### By Strength
```typescript
// Only strong relationships
db.queryRelationships({ minStrength: 'strong' });

// Weak relationships (needs review)
db.queryRelationships({ strength: 'weak' });
```

### Combined Filters
```typescript
// High-confidence behavioral relationships
db.queryRelationships({
  category: 'behavioral',
  minConfidence: 0.9,
  strength: 'strong'
});
```

---

## Evolution & Extensions

### Current Status

**Implemented** (v1.0):
-  Structural: code-dependency, inheritance, implementation
-  Behavioral: calls
-  Verification: test-coverage

**Planned** (v2.0):
- � Data Flow: io-dependency, pipeline, event-flow
- � Behavioral: callback, composition
- � Alternative: substitution, fallback
- � Constraint: co-requirement, mutual-exclusion

**Future** (v3.0):
- =. Semantic: conceptual-relation, feature-grouping
- =. Behavioral: collaboration, temporal-order
- =. Verification: integration-verification

### Extension Points

**Add New Type**:
1. Define semantics (what does it mean?)
2. Choose category (which of 7?)
3. Specify discovery method
4. Implement analyzer
5. Add to taxonomy

**Add New Category**:
1. Identify gap in current categories
2. Define category semantics
3. Propose initial types
4. Update taxonomy documentation
5. Implement storage schema

---

## Related

- [[Relationship Standard Format]] (`../relationships/STANDARD-FORMAT.md`) - Technical schema
- [[Call Relationships]] (`../relationships/CALLS.md`) - Specific type example
- [[IO Dependency]] (`../relationships/IO-DEPENDENCY.md`) - Data flow example
- [[Composition Relationship]] (`../relationships/COMPOSITION.md`) - Behavioral example
- [[Callback Pattern]] (`../relationships/CALLBACK.md`) - Behavioral example
- [[DatabaseManager]] (`../core-components/DatabaseManager.md`) - Storage implementation

## Principles

### Design Principles

1. **Completeness**: Cover all meaningful relationships
2. **Orthogonality**: Categories don't overlap
3. **Evidence-based**: Every relationship has proof
4. **Queryable**: Support rich filtering
5. **Extensible**: Easy to add new types

### Quality Principles

1. **High confidence for code**: AST-based relationships are 1.0
2. **Medium confidence for inference**: Analysis-based are 0.7-0.9
3. **Low confidence for manual**: Human-curated are 0.5-0.7
4. **No speculation**: Don't store relationships <0.5 confidence

### Storage Principles

1. **Single source of truth**: One table for all types
2. **Consistent schema**: All types use same format
3. **Rich metadata**: Evidence, confidence, timestamps
4. **Efficient queries**: Indexes on type, category, participants

---

## Statistics (Example Project)

**Total Relationships**: ~2,500

**By Category**:
- Structural: 580 (23%)
- Behavioral: 1,565 (63%)
- Verification: 90 (4%)
- Data Flow: 235 (9%)
- Constraint: 28 (1%)
- Alternative: 2 (<1%)

**By Confidence**:
- 1.0 (Exact): 2,145 (86%)
- 0.9 (High): 235 (9%)
- 0.8 (Medium): 90 (4%)
- 0.7 (Low): 28 (1%)
- <0.7: 2 (<1%)

**Discovery Methods**:
- AST Parsing: 2,145 (86%)
- Static Analysis: 235 (9%)
- Test Analysis: 90 (4%)
- Documentation: 30 (1%)

---

## Source

**Specification**: This document
**Implementation**: `src/types/relationships/unified.ts`
**Storage**: `unified_relationships` table in SQLite

## Status

**Current**: v1.0 (5 types implemented)
**Roadmap**: v2.0 (13 additional types planned)
**Coverage**: ~40% of taxonomy implemented

---

**Last Updated**: 2025-11-09
**Total Types**: 18 (5 implemented, 13 planned)
**Total Categories**: 7
**Schema Version**: 1.0

---

## Backlinks

### Referenced By

- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:212
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:281
- [[CallGraphAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/CallGraphAnalyzer.md:282
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:225
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:242
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:279
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:280
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:273
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:274
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:275
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:203
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:214
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:215
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:216
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:217
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:218
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:74
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:75
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:76
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:178
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:186
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:187
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:188
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:189
- [[Composition Relationship]] → /home/user/tsdoc-edge/managed/relationships/COMPOSITION.md:190
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:168
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:209
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:210
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:211
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:212
- [[Relationship Standard Format]] → /home/user/tsdoc-edge/managed/relationships/STANDARD-FORMAT.md:213
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:86
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:87
- [[IO Dependency]] → /home/user/tsdoc-edge/managed/relationships/io-dependency.md:88
- [[Relationship System Roadmap]] → /home/user/tsdoc-edge/managed/workflows/relationship-system-roadmap.md:399
- [[Relationship System Roadmap]] → /home/user/tsdoc-edge/managed/workflows/relationship-system-roadmap.md:448
- [[Relationship System Roadmap]] → /home/user/tsdoc-edge/managed/workflows/relationship-system-roadmap.md:449

