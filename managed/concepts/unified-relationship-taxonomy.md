# [[Unified Relationship Taxonomy]]

**Document Type**: Architectural Specification

## Purpose

모든 종류의 **심볼 간 관계**를 체계적으로 분류하고 수집하여, SSOT(Single Source of Truth)의 완성도를 측정 가능하게 만듭니다.

## Problem Statement

### 현재 상황
```
현재 추적하는 관계:
1. Code-level:
   - dependsOn (A가 B를 import)
   - usedBy (B가 A에 의해 사용됨)
   - implements (A가 I를 구현)
   - extends (A가 B를 상속)

2. Test-level:
   - testedBy (A가 TestA에 의해 검증됨)
   - verifiedRelationship (A↔B 연결이 TestAB로 검증됨)

문제:
❌ Output 의존성 (A의 출력이 B의 입력)
❌ 데이터 흐름 (A → B → C 파이프라인)
❌ 기능 조합 (A+B+C = Feature X)
❌ 대체 관계 (A 또는 B 사용 가능)
❌ 충돌 관계 (A와 B 동시 사용 불가)
❌ 시간 순서 (A 이후 B 호출 필수)
```

**목표**: 모든 관계를 추적하여 **완전한 연결성 그래프** 구축

---

## Relationship Taxonomy

### 1. Structural Relationships (구조적 관계)

코드 구조에서 직접 추출 가능한 관계

#### 1.1 Dependency (의존)
```typescript
// Type: code-dependency
import { B } from './B';

class A {
  constructor(private b: B) {}  // A depends on B
}

Relationship: {
  type: 'code-dependency',
  from: 'A',
  to: 'B',
  direction: 'unidirectional',
  strength: 'strong',
  evidence: 'import + constructor injection'
}
```

#### 1.2 Inheritance (상속)
```typescript
// Type: inheritance
class B extends A {}

Relationship: {
  type: 'inheritance',
  from: 'B',
  to: 'A',
  direction: 'unidirectional',
  strength: 'strong',
  evidence: 'extends keyword'
}
```

#### 1.3 Implementation (구현)
```typescript
// Type: implementation
class A implements IService {}

Relationship: {
  type: 'implementation',
  from: 'A',
  to: 'IService',
  direction: 'unidirectional',
  strength: 'strong',
  evidence: 'implements keyword'
}
```

---

### 2. Data Flow Relationships (데이터 흐름 관계)

입출력 의존성

#### 2.1 Input-Output Dependency
```typescript
// Type: io-dependency
class A {
  process(): DataA { return new DataA(); }
}

class B {
  consume(data: DataA) { }  // B consumes A's output
}

Relationship: {
  type: 'io-dependency',
  from: 'A',
  to: 'B',
  direction: 'unidirectional',
  strength: 'medium',
  dataType: 'DataA',
  evidence: 'return type matches parameter type'
}
```

#### 2.2 Pipeline (파이프라인)
```typescript
// Type: pipeline
const result = A.process()
  .pipe(B.transform)
  .pipe(C.save);

Relationships: [
  { type: 'pipeline', from: 'A', to: 'B', order: 1 },
  { type: 'pipeline', from: 'B', to: 'C', order: 2 }
]
```

#### 2.3 Event Flow (이벤트 흐름)
```typescript
// Type: event-flow
class A {
  emit(event: 'data-ready') { }
}

class B {
  constructor() {
    A.on('data-ready', this.handle);  // B reacts to A's events
  }
}

Relationship: {
  type: 'event-flow',
  from: 'A',
  to: 'B',
  direction: 'unidirectional',
  strength: 'weak',
  eventName: 'data-ready'
}
```

---

### 3. Behavioral Relationships (행위 관계)

런타임 동작 기반

#### 3.1 Collaboration (협력)
```typescript
// Type: collaboration
class OrderService {
  async checkout(order: Order) {
    const payment = await PaymentService.process(order);  // Collaborates
    await InventoryService.reserve(order);                // Collaborates
    await NotificationService.notify(order);              // Collaborates
  }
}

Relationships: [
  { type: 'collaboration', from: 'OrderService', to: 'PaymentService', role: 'payment-processor' },
  { type: 'collaboration', from: 'OrderService', to: 'InventoryService', role: 'inventory-manager' },
  { type: 'collaboration', from: 'OrderService', to: 'NotificationService', role: 'notifier' }
]
```

#### 3.2 Composition (조합)
```typescript
// Type: composition
class Feature {
  constructor(
    private moduleA: A,
    private moduleB: B,
    private moduleC: C
  ) {}

  execute() {
    // Feature = A + B + C
  }
}

Relationship: {
  type: 'composition',
  from: 'Feature',
  to: ['A', 'B', 'C'],
  direction: 'unidirectional',
  strength: 'strong',
  purpose: 'Feature combines A, B, C'
}
```

#### 3.3 Temporal Ordering (시간 순서)
```typescript
// Type: temporal-order
/**
 * @temporalOrder init() must be called before process()
 */
class A {
  init() { }
  process() { }  // requires init() first
}

Relationship: {
  type: 'temporal-order',
  from: 'A.init',
  to: 'A.process',
  direction: 'unidirectional',
  constraint: 'must-precede'
}
```

---

### 4. Alternative Relationships (대안 관계)

선택 가능한 옵션들

#### 4.1 Substitution (대체)
```typescript
// Type: substitution
interface ICache {
  get(key: string): any;
}

class RedisCache implements ICache { }
class MemoryCache implements ICache { }

// RedisCache OR MemoryCache can be used

Relationship: {
  type: 'substitution',
  from: 'RedisCache',
  to: 'MemoryCache',
  direction: 'bidirectional',
  interface: 'ICache',
  constraint: 'one-of'
}
```

#### 4.2 Fallback (폴백)
```typescript
// Type: fallback
class Service {
  async getData() {
    try {
      return await PrimaryAPI.fetch();
    } catch {
      return await FallbackAPI.fetch();  // Fallback
    }
  }
}

Relationship: {
  type: 'fallback',
  from: 'PrimaryAPI',
  to: 'FallbackAPI',
  direction: 'unidirectional',
  condition: 'on-error'
}
```

---

### 5. Constraint Relationships (제약 관계)

함께 사용 가능 여부

#### 5.1 Mutual Exclusion (상호 배제)
```typescript
// Type: mutual-exclusion
/**
 * @conflict Cannot use with ModuleB
 */
class ModuleA { }
class ModuleB { }

Relationship: {
  type: 'mutual-exclusion',
  from: 'ModuleA',
  to: 'ModuleB',
  direction: 'bidirectional',
  reason: 'both modify same global state'
}
```

#### 5.2 Co-requirement (공동 요구)
```typescript
// Type: co-requirement
/**
 * @requires ModuleB must also be present
 */
class ModuleA { }

Relationship: {
  type: 'co-requirement',
  from: 'ModuleA',
  to: 'ModuleB',
  direction: 'unidirectional',
  reason: 'ModuleA needs ModuleB for full functionality'
}
```

---

### 6. Semantic Relationships (의미 관계)

개념적 연관성

#### 6.1 Conceptual Relation (개념 연관)
```typescript
/**
 * @relatedTo UserRepository - Data access layer
 * @relatedTo UserValidator - Input validation
 */
class UserService { }

Relationship: {
  type: 'conceptual-relation',
  from: 'UserService',
  to: 'UserRepository',
  direction: 'undirected',
  strength: 'weak',
  category: 'same-domain'
}
```

#### 6.2 Feature Grouping (기능 그룹)
```typescript
/**
 * @featureGroup Authentication
 */
class LoginController { }
class LogoutController { }
class SessionManager { }

Relationships: [
  { type: 'feature-grouping', group: 'Authentication', members: ['LoginController', 'LogoutController', 'SessionManager'] }
]
```

---

### 7. Verification Relationships (검증 관계)

테스트 및 품질 관계

#### 7.1 Test Coverage
```typescript
// Type: test-coverage
// Extracted from test files
describe('A', () => {
  it('should work', () => {
    const a = new A();
  });
});

Relationship: {
  type: 'test-coverage',
  from: 'A',
  to: 'A.test.ts',
  direction: 'bidirectional',
  strength: 'strong'
}
```

#### 7.2 Integration Verification
```typescript
// Type: integration-verification
it('A and B integration', () => {
  const b = new B();
  const a = new A(b);
  a.execute();
});

Relationship: {
  type: 'integration-verification',
  from: 'A',
  to: 'B',
  verifiedBy: 'integration.test.ts',
  strength: 'strong'
}
```

---

## Unified Relationship Model

### Core Schema

```typescript
interface UnifiedRelationship {
  // Identity
  id: string;
  type: RelationshipType;

  // Participants
  from: string | string[];      // Source symbol(s)
  to: string | string[];        // Target symbol(s)

  // Properties
  direction: 'unidirectional' | 'bidirectional' | 'undirected';
  strength: 'strong' | 'medium' | 'weak';

  // Context
  category: RelationshipCategory;
  evidence: Evidence[];

  // Metadata
  discoveredBy: 'static-analysis' | 'ast-parsing' | 'test-analysis' | 'documentation' | 'runtime-trace';
  confidence: number;  // 0-1
  filePath?: string;
  line?: number;

  // Additional properties
  properties: Record<string, any>;
}

type RelationshipType =
  // Structural
  | 'code-dependency'
  | 'inheritance'
  | 'implementation'
  // Data Flow
  | 'io-dependency'
  | 'pipeline'
  | 'event-flow'
  // Behavioral
  | 'collaboration'
  | 'composition'
  | 'temporal-order'
  // Alternative
  | 'substitution'
  | 'fallback'
  // Constraint
  | 'mutual-exclusion'
  | 'co-requirement'
  // Semantic
  | 'conceptual-relation'
  | 'feature-grouping'
  // Verification
  | 'test-coverage'
  | 'integration-verification';

type RelationshipCategory =
  | 'structural'
  | 'data-flow'
  | 'behavioral'
  | 'alternative'
  | 'constraint'
  | 'semantic'
  | 'verification';

interface Evidence {
  type: 'code' | 'documentation' | 'test' | 'trace';
  source: string;
  lineNumber?: number;
  snippet?: string;
  confidence: number;
}
```

---

## Relationship Collection Strategy

### Phase 1: Static Analysis
```typescript
class RelationshipCollector {
  // 1. Structural relationships
  collectCodeDependencies(ast: AST): UnifiedRelationship[];
  collectInheritance(ast: AST): UnifiedRelationship[];
  collectImplementations(ast: AST): UnifiedRelationship[];

  // 2. Data flow relationships
  collectIODependencies(ast: AST): UnifiedRelationship[];
  collectPipelines(ast: AST): UnifiedRelationship[];
  collectEventFlows(ast: AST): UnifiedRelationship[];
}
```

### Phase 2: Documentation Analysis
```typescript
class DocumentationAnalyzer {
  // Extract from TSDoc tags
  collectFromTSDoc(comments: TSDocComment[]): UnifiedRelationship[];

  // Extract from markdown
  collectFromMarkdown(docs: string[]): UnifiedRelationship[];
}
```

### Phase 3: Test Analysis
```typescript
class TestAnalyzer {
  // Test coverage
  collectTestCoverage(testFiles: string[]): UnifiedRelationship[];

  // Integration verification
  collectIntegrationTests(testFiles: string[]): UnifiedRelationship[];
}
```

### Phase 4: Runtime Tracing (Future)
```typescript
class RuntimeTracer {
  // Actual execution traces
  collectExecutionTraces(traces: Trace[]): UnifiedRelationship[];
}
```

---

## SSOT Completeness Metrics

### Relationship Completeness Score

```typescript
interface SSOTCompleteness {
  // Coverage by category
  structural: {
    total: number;
    discovered: number;
    coverage: number;  // %
  };
  dataFlow: { total: number; discovered: number; coverage: number };
  behavioral: { total: number; discovered: number; coverage: number };
  verification: { total: number; discovered: number; coverage: number };

  // Overall
  overallScore: number;  // 0-100

  // Gaps
  missingRelationships: {
    type: string;
    from: string;
    to: string;
    reason: string;
  }[];

  // Recommendations
  recommendations: string[];
}
```

### Calculation Algorithm

```typescript
function calculateCompleteness(
  graph: SymbolGraph,
  relationships: UnifiedRelationship[]
): SSOTCompleteness {
  // 1. Expected relationships (from code structure)
  const expectedStructural = inferExpectedStructural(graph);
  const expectedDataFlow = inferExpectedDataFlow(graph);
  const expectedBehavioral = inferExpectedBehavioral(graph);

  // 2. Actual discovered relationships
  const actualStructural = relationships.filter(r => r.category === 'structural');
  const actualDataFlow = relationships.filter(r => r.category === 'data-flow');
  const actualBehavioral = relationships.filter(r => r.category === 'behavioral');

  // 3. Calculate coverage
  const structuralCoverage = (actualStructural.length / expectedStructural.length) * 100;
  const dataFlowCoverage = (actualDataFlow.length / expectedDataFlow.length) * 100;
  const behavioralCoverage = (actualBehavioral.length / expectedBehavioral.length) * 100;

  // 4. Weighted overall score
  const weights = { structural: 0.4, dataFlow: 0.3, behavioral: 0.3 };
  const overallScore =
    structuralCoverage * weights.structural +
    dataFlowCoverage * weights.dataFlow +
    behavioralCoverage * weights.behavioral;

  return {
    structural: { total: expectedStructural.length, discovered: actualStructural.length, coverage: structuralCoverage },
    dataFlow: { total: expectedDataFlow.length, discovered: actualDataFlow.length, coverage: dataFlowCoverage },
    behavioral: { total: expectedBehavioral.length, discovered: actualBehavioral.length, coverage: behavioralCoverage },
    overallScore,
    missingRelationships: findMissingRelationships(expected, actual),
    recommendations: generateRecommendations(gaps)
  };
}
```

---

## Database Schema Extension

```sql
-- Unified relationships table
CREATE TABLE unified_relationships (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  category TEXT NOT NULL,

  -- Participants (JSON array for multi-party relationships)
  from_symbols TEXT NOT NULL,  -- JSON: ["symbolId1", "symbolId2"]
  to_symbols TEXT NOT NULL,    -- JSON: ["symbolId3"]

  -- Properties
  direction TEXT NOT NULL,  -- unidirectional, bidirectional, undirected
  strength TEXT NOT NULL,   -- strong, medium, weak

  -- Evidence
  discovered_by TEXT NOT NULL,
  confidence REAL NOT NULL,
  evidence TEXT NOT NULL,  -- JSON array of Evidence objects

  -- Location
  file_path TEXT,
  line INTEGER,

  -- Additional properties (JSON)
  properties TEXT,

  -- Metadata
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_unified_rels_type ON unified_relationships(type);
CREATE INDEX idx_unified_rels_category ON unified_relationships(category);
CREATE INDEX idx_unified_rels_from ON unified_relationships(from_symbols);
CREATE INDEX idx_unified_rels_to ON unified_relationships(to_symbols);

-- SSOT completeness tracking
CREATE TABLE ssot_completeness (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  measured_at TEXT NOT NULL,

  structural_total INTEGER NOT NULL,
  structural_discovered INTEGER NOT NULL,
  structural_coverage REAL NOT NULL,

  dataflow_total INTEGER NOT NULL,
  dataflow_discovered INTEGER NOT NULL,
  dataflow_coverage REAL NOT NULL,

  behavioral_total INTEGER NOT NULL,
  behavioral_discovered INTEGER NOT NULL,
  behavioral_coverage REAL NOT NULL,

  verification_total INTEGER NOT NULL,
  verification_discovered INTEGER NOT NULL,
  verification_coverage REAL NOT NULL,

  overall_score REAL NOT NULL,

  missing_relationships TEXT,  -- JSON
  recommendations TEXT         -- JSON
);
```

---

## CLI Design

```bash
# Collect all relationships
tsdoc-edge relationships collect

# 출력:
Collecting Relationships
================================================================================
  ✓ Structural:    245 relationships (code-dependency, inheritance, etc.)
  ✓ Data Flow:      89 relationships (io-dependency, pipeline, etc.)
  ✓ Behavioral:     67 relationships (collaboration, composition, etc.)
  ✓ Alternative:    12 relationships (substitution, fallback, etc.)
  ✓ Constraint:      5 relationships (mutual-exclusion, co-requirement, etc.)
  ✓ Semantic:       34 relationships (conceptual-relation, feature-grouping, etc.)
  ✓ Verification:  123 relationships (test-coverage, integration-verification, etc.)

Total: 575 relationships discovered

---

# Analyze SSOT completeness
tsdoc-edge ssot-completeness

# 출력:
SSOT Completeness Report
================================================================================

Overall Score: 78.3 / 100

Category Breakdown:
  Structural:     245/250  (98.0%)  ✓
  Data Flow:       89/120  (74.2%)  ⚠️
  Behavioral:      67/95   (70.5%)  ⚠️
  Verification:   123/200  (61.5%)  ⚠️

Top Missing Relationships (10):
  1. OrderService → PaymentService (io-dependency)
     Reason: Output type OrderReceipt matches input, but no explicit connection
     Suggestion: Add @outputTo PaymentService tag

  2. AuthService ↔ SessionManager (collaboration)
     Reason: Both used together in tests, but no documented collaboration
     Suggestion: Add collaboration documentation

  3. RedisCache ↔ MemoryCache (substitution)
     Reason: Both implement ICache, but no substitution relationship defined
     Suggestion: Add @alternative tag

Recommendations:
  1. Document 31 io-dependency relationships
  2. Add collaboration tags to 28 service classes
  3. Create integration tests for 77 unverified relationships

---

# View specific relationship type
tsdoc-edge relationships --type io-dependency

# 출력:
I/O Dependency Relationships (89)
================================================================================

  DataProcessor → DataValidator
    From: DataProcessor.process() returns ProcessedData
    To: DataValidator.validate(data: ProcessedData)
    Evidence: Type signature match (confidence: 0.95)
    File: src/processor/DataProcessor.ts:42

  AuthService → SessionManager
    From: AuthService.login() returns Session
    To: SessionManager.store(session: Session)
    Evidence: Method call chain in tests (confidence: 0.85)
    File: src/__tests__/integration/auth.test.ts:18

---

# Find related symbols
tsdoc-edge relationships --from AuthService

# 출력:
Relationships from AuthService (12)
================================================================================

  Structural:
    ✓ AuthService → UserRepository (code-dependency)
    ✓ AuthService → TokenService (code-dependency)

  Data Flow:
    ✓ AuthService → SessionManager (io-dependency)
    ⚠️ AuthService → LoggingService (pipeline) - Not documented

  Behavioral:
    ✓ AuthService + UserRepository + TokenService (collaboration)

  Verification:
    ✓ AuthService ↔ UserRepository (integration-verified)
    ✗ AuthService ↔ TokenService (not verified)
```

---

## Implementation Roadmap

### Phase 1: Foundation
- [ ] Create UnifiedRelationship type system
- [ ] Extend database schema
- [ ] Implement RelationshipCollector interface

### Phase 2: Static Analysis
- [ ] Code dependency extractor (imports, constructors)
- [ ] I/O dependency analyzer (type matching)
- [ ] Event flow detector (EventEmitter patterns)

### Phase 3: Documentation Integration
- [ ] TSDoc tag parser for new relationship types
- [ ] Markdown relationship extractor

### Phase 4: Completeness Metrics
- [ ] SSOT completeness calculator
- [ ] Missing relationship inference
- [ ] Recommendation generator

### Phase 5: CLI & Visualization
- [ ] `relationships collect` command
- [ ] `ssot-completeness` command
- [ ] Mermaid diagram generator for relationship graphs

---

## Benefits

### 1. Complete Connectivity Graph
**Before**: Only code dependencies tracked
**After**: All 7 categories of relationships tracked

### 2. SSOT Quality Metrics
**Before**: No way to measure documentation completeness
**After**: Quantifiable completeness score with actionable gaps

### 3. Parallel Development Safety
**Before**: Only dependency conflicts detected
**After**: Mutual exclusion, co-requirements, temporal ordering all enforced

### 4. Feature Composition
**Before**: Hard to see which modules form a feature
**After**: Explicit composition and collaboration relationships

### 5. Alternative Discovery
**Before**: Manual search for substitutable implementations
**After**: Automatic substitution/fallback relationship tracking

---

## Related Concepts

- [[Integration Test Traceability]] - Verification relationships
- [[Parallel Work Theory]] - Constraint relationships
- [[SymbolGraphFeatures]] - Structural relationships

---

**Status**: Design Phase
**Priority**: Critical (Core SSOT feature)
**Next Steps**: Implement UnifiedRelationship type system
**Last Updated**: 2025-11-06
