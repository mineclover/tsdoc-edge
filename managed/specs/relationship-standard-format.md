# [[Relationship Standard Format]]

**Document Type**: Technical Specification

## Purpose

모든 심볼 간 관계를 **표준화된 포맷**으로 수집, 저장, 쿼리할 수 있는 통합 규격을 정의합니다.

## Standard Format Specification

### 1. Core Data Model

#### UnifiedRelationship Schema

```typescript
{
  // ===== Identity (필수) =====
  id: string                    // 고유 ID (예: "io-dep-auth-user-repo")
  type: RelationshipType        // 관계 유형 (17개 타입)
  category: RelationshipCategory // 관계 카테고리 (7개)

  // ===== Participants (필수) =====
  from: string | string[]       // 출발 심볼 ID (다자 관계는 배열)
  to: string | string[]         // 도착 심볼 ID (다자 관계는 배열)

  // ===== Properties (필수) =====
  direction: 'unidirectional' | 'bidirectional' | 'undirected'
  strength: 'strong' | 'medium' | 'weak'

  // ===== Evidence (필수) =====
  evidence: Array<{
    type: 'code' | 'documentation' | 'test' | 'trace' | 'type-signature'
    source: string              // 파일 경로
    lineNumber?: number
    snippet?: string            // 코드 스니펫
    confidence: number          // 0-1
    context?: string
  }>

  discoveredBy: 'static-analysis' | 'ast-parsing' | 'test-analysis' | 'documentation' | 'runtime-trace' | 'type-inference'
  confidence: number            // 전체 신뢰도 (0-1)

  // ===== Location (선택) =====
  filePath?: string
  line?: number

  // ===== Type-Specific Properties (선택) =====
  properties: {
    // io-dependency
    dataType?: string           // 전달되는 데이터 타입
    producerMethod?: string
    consumerMethod?: string

    // pipeline
    order?: number              // 파이프라인 순서
    chain?: string[]            // 전체 체인

    // event-flow
    eventName?: string          // 이벤트 이름

    // collaboration
    role?: string               // 협력 역할

    // feature-grouping
    featureName?: string        // 기능 이름

    // temporal-order
    constraint?: string         // 제약 조건

    // substitution
    interface?: string          // 공통 인터페이스

    // fallback
    condition?: string          // 폴백 조건

    // mutual-exclusion
    reason?: string             // 배제 이유

    // ... 기타 타입별 속성
  }

  // ===== Metadata (필수) =====
  createdAt: string             // ISO 8601
  updatedAt: string             // ISO 8601
  description?: string          // 설명
}
```

---

### 2. Relationship Types (17개)

#### 2.1 Structural (구조적)
```typescript
'code-dependency'      // A imports B
'inheritance'          // A extends B
'implementation'       // A implements I
```

#### 2.2 Data Flow (데이터 흐름)
```typescript
'io-dependency'        // A의 출력 → B의 입력
'pipeline'             // A → B → C 순차 처리
'event-flow'           // A 이벤트 → B 핸들러
```

#### 2.3 Behavioral (행위)
```typescript
'collaboration'        // A와 B가 협력하여 목표 달성
'composition'          // Feature = A + B + C
'temporal-order'       // A 실행 후 B 실행 필수
```

#### 2.4 Alternative (대안)
```typescript
'substitution'         // A 또는 B 사용 가능 (동일 인터페이스)
'fallback'             // A 실패 시 B 사용
```

#### 2.5 Constraint (제약)
```typescript
'mutual-exclusion'     // A와 B 동시 사용 불가
'co-requirement'       // A 사용 시 B 필수
```

#### 2.6 Semantic (의미)
```typescript
'conceptual-relation'  // A와 B는 관련 개념
'feature-grouping'     // A, B, C는 같은 기능 그룹
```

#### 2.7 Verification (검증)
```typescript
'test-coverage'        // A는 TestA로 검증됨
'integration-verification' // A↔B 연결이 TestAB로 검증됨
```

---

### 3. Collection Methods

#### 3.1 Static Analysis (코드 구조)

```typescript
// Import 분석
import { B } from './B';
→ { type: 'code-dependency', from: 'A', to: 'B' }

// 상속 분석
class A extends B {}
→ { type: 'inheritance', from: 'A', to: 'B' }

// 구현 분석
class A implements I {}
→ { type: 'implementation', from: 'A', to: 'I' }
```

#### 3.2 Type Inference (타입 분석)

```typescript
// 타입 매칭
function processData(): UserData { }
function saveUser(data: UserData) { }
→ { type: 'io-dependency', from: 'processData', to: 'saveUser', dataType: 'UserData' }

// 파이프라인 감지
data.pipe(transform).pipe(save)
→ { type: 'pipeline', chain: ['data', 'transform', 'save'] }
```

#### 3.3 Test Analysis (테스트 분석)

```typescript
// 테스트 커버리지
describe('AuthService', () => {
  it('should login', () => { ... });
});
→ { type: 'test-coverage', from: 'AuthService', to: 'AuthService.test.ts' }

// 통합 테스트
it('should work together', () => {
  const a = new A(new B());
});
→ { type: 'integration-verification', from: 'A', to: 'B' }
```

#### 3.4 Documentation Analysis (문서 분석)

```typescript
/**
 * @relatedTo UserRepository
 * @collaboration Uses PaymentService for payments
 */
class OrderService { }
→ [
  { type: 'conceptual-relation', from: 'OrderService', to: 'UserRepository' },
  { type: 'collaboration', from: 'OrderService', to: 'PaymentService' }
]
```

---

### 4. Storage Format

#### 4.1 Database Schema (SQLite)

```sql
CREATE TABLE unified_relationships (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  category TEXT NOT NULL,

  -- JSON arrays for multi-party relationships
  from_symbols TEXT NOT NULL,
  to_symbols TEXT NOT NULL,

  direction TEXT NOT NULL,
  strength TEXT NOT NULL,

  -- JSON arrays
  evidence TEXT NOT NULL,

  discovered_by TEXT NOT NULL,
  confidence REAL NOT NULL,

  file_path TEXT,
  line INTEGER,

  -- JSON object for type-specific properties
  properties TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  description TEXT
);

-- Indexes
CREATE INDEX idx_ur_type ON unified_relationships(type);
CREATE INDEX idx_ur_category ON unified_relationships(category);
CREATE INDEX idx_ur_strength ON unified_relationships(strength);
CREATE INDEX idx_ur_confidence ON unified_relationships(confidence);

-- Full-text search
CREATE VIRTUAL TABLE ur_fts USING fts5(
  id,
  description,
  properties,
  content='unified_relationships'
);
```

#### 4.2 JSONL Format (버전 관리)

```jsonl
{"id":"io-dep-auth-user","type":"io-dependency","category":"data-flow","from":"AuthService","to":"UserRepository","direction":"unidirectional","strength":"strong","evidence":[{"type":"type-signature","source":"src/auth/AuthService.ts","lineNumber":42,"confidence":0.9}],"discoveredBy":"type-inference","confidence":0.9,"properties":{"dataType":"User"},"createdAt":"2025-11-06T10:00:00Z","updatedAt":"2025-11-06T10:00:00Z"}
{"id":"collab-order-payment","type":"collaboration","category":"behavioral","from":"OrderService","to":"PaymentService","direction":"unidirectional","strength":"strong","evidence":[{"type":"code","source":"src/order/OrderService.ts","lineNumber":67,"snippet":"await this.paymentService.process()","confidence":1.0}],"discoveredBy":"static-analysis","confidence":1.0,"properties":{"role":"payment-processor"},"createdAt":"2025-11-06T10:00:00Z","updatedAt":"2025-11-06T10:00:00Z"}
```

---

### 5. Query Interface

#### 5.1 Query by Type

```typescript
// Find all I/O dependencies
const ioDeps = await queryRelationships({
  type: 'io-dependency'
});

// Find all strong relationships
const strongRels = await queryRelationships({
  strength: 'strong'
});
```

#### 5.2 Query by Participant

```typescript
// Find all relationships from AuthService
const fromAuth = await queryRelationships({
  from: 'AuthService'
});

// Find all relationships to UserRepository
const toUser = await queryRelationships({
  to: 'UserRepository'
});

// Find relationships between two symbols
const between = await queryRelationships({
  from: 'AuthService',
  to: 'UserRepository'
});
```

#### 5.3 Query by Category

```typescript
// All data flow relationships
const dataFlow = await queryRelationships({
  category: 'data-flow'
});

// All verification relationships
const verified = await queryRelationships({
  category: 'verification'
});
```

#### 5.4 Query by Confidence

```typescript
// High-confidence relationships only
const highConf = await queryRelationships({
  minConfidence: 0.8
});
```

---

### 6. Export Formats

#### 6.1 Mermaid Diagram

```typescript
// Generate relationship graph
const mermaid = exportToMermaid(relationships, {
  type: 'graph',
  includeTypes: ['code-dependency', 'io-dependency'],
  maxDepth: 3
});

// Output:
graph TD
  A[AuthService] -->|io-dependency| B[UserRepository]
  A -->|collaboration| C[PaymentService]
  B -->|code-dependency| D[Database]
```

#### 6.2 CSV Export

```typescript
// Export to CSV for analysis
const csv = exportToCSV(relationships);

// Output:
id,type,category,from,to,strength,confidence
io-dep-auth-user,io-dependency,data-flow,AuthService,UserRepository,strong,0.9
collab-order-payment,collaboration,behavioral,OrderService,PaymentService,strong,1.0
```

#### 6.3 JSON API

```typescript
// REST API response format
GET /api/relationships?category=data-flow

Response:
{
  "total": 89,
  "relationships": [
    {
      "id": "io-dep-auth-user",
      "type": "io-dependency",
      "category": "data-flow",
      "from": "AuthService",
      "to": "UserRepository",
      "strength": "strong",
      "confidence": 0.9,
      "properties": {
        "dataType": "User"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalPages": 2
  }
}
```

---

### 7. Validation Rules

#### 7.1 Required Fields

```typescript
// Must have
✓ id: non-empty string
✓ type: valid RelationshipType
✓ category: valid RelationshipCategory
✓ from: non-empty string or array
✓ to: non-empty string or array
✓ direction: valid direction
✓ strength: valid strength
✓ evidence: non-empty array
✓ discoveredBy: valid method
✓ confidence: 0-1
✓ createdAt: valid ISO 8601
✓ updatedAt: valid ISO 8601
```

#### 7.2 Consistency Rules

```typescript
// Category must match type
io-dependency → category must be 'data-flow'
test-coverage → category must be 'verification'

// Evidence confidence must not exceed overall confidence
max(evidence.confidence) <= confidence

// Bidirectional relationships must have matching reverse
if A ↔ B exists, then B ↔ A should exist or be implied
```

#### 7.3 Type-Specific Validation

```typescript
// io-dependency: must have dataType in properties
if (type === 'io-dependency') {
  assert(properties.dataType !== undefined);
}

// pipeline: must have chain or order
if (type === 'pipeline') {
  assert(properties.chain || properties.order);
}

// feature-grouping: from or to must be array (multi-party)
if (type === 'feature-grouping') {
  assert(Array.isArray(from) || Array.isArray(to));
}
```

---

### 8. Migration Path

#### From Current System to Unified Format

```typescript
// Migrate existing SymbolRelationship
const legacy: SymbolRelationship = {
  type: 'dependsOn',
  from: 'A',
  to: 'B',
  filePath: 'src/A.ts',
  line: 10
};

// Convert to UnifiedRelationship
const unified: UnifiedRelationship = {
  id: generateId('code-dep', legacy.from, legacy.to),
  type: 'code-dependency',  // map: dependsOn → code-dependency
  category: 'structural',
  from: legacy.from,
  to: legacy.to,
  direction: 'unidirectional',
  strength: 'strong',
  evidence: [{
    type: 'code',
    source: legacy.filePath,
    lineNumber: legacy.line,
    confidence: 1.0
  }],
  discoveredBy: 'static-analysis',
  confidence: 1.0,
  filePath: legacy.filePath,
  line: legacy.line,
  properties: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
```

---

### 9. Performance Considerations

#### Indexing Strategy

```sql
-- Primary access patterns
CREATE INDEX idx_ur_from_to ON unified_relationships(
  json_extract(from_symbols, '$[0]'),
  json_extract(to_symbols, '$[0]')
);

CREATE INDEX idx_ur_type_conf ON unified_relationships(type, confidence);
CREATE INDEX idx_ur_category_strength ON unified_relationships(category, strength);

-- Composite index for common queries
CREATE INDEX idx_ur_composite ON unified_relationships(
  category, type, strength, confidence
);
```

#### Caching Strategy

```typescript
// In-memory cache for frequently accessed relationships
class RelationshipCache {
  private cache: Map<string, UnifiedRelationship[]>;

  // Cache hot paths
  cacheByType(type: RelationshipType): void {
    this.cache.set(`type:${type}`, loadFromDB(type));
  }

  cacheBySymbol(symbolId: string): void {
    this.cache.set(`symbol:${symbolId}`, loadRelationshipsForSymbol(symbolId));
  }
}
```

---

### 10. Extensibility

#### Adding New Relationship Types

```typescript
// Step 1: Extend types
type RelationshipType =
  | ...existing types...
  | 'new-custom-type';

// Step 2: Assign category
'new-custom-type' → category: 'custom-category'

// Step 3: Define type-specific properties
interface NewCustomProperties {
  customField: string;
}

// Step 4: Implement collector
class NewCustomCollector {
  collect(): UnifiedRelationship[] {
    return [
      {
        type: 'new-custom-type',
        category: 'custom-category',
        properties: { customField: 'value' },
        ...
      }
    ];
  }
}

// Step 5: Register
RelationshipCollectorRegistry.register('new-custom-type', NewCustomCollector);
```

---

## Benefits of Standard Format

### 1. Unified Data Model
**Before**: Different formats for different relationship types
**After**: Single schema for all relationships

### 2. Queryability
**Before**: Hard-coded queries for each type
**After**: Flexible SQL/API queries across all types

### 3. Extensibility
**Before**: Adding new type requires schema changes
**After**: Properties field allows type-specific extensions

### 4. Confidence Tracking
**Before**: No way to measure relationship quality
**After**: Evidence-based confidence scores

### 5. Multi-Source Evidence
**Before**: Single source (code or doc)
**After**: Multiple evidence sources combined

### 6. Version Control
**Before**: Binary database only
**After**: JSONL format for Git tracking

---

## Related Specifications

- [[Unified Relationship Taxonomy]] - Relationship classification
- [[Integration Test Traceability]] - Verification relationships
- [[Parallel Work Theory]] - Constraint relationships

---

**Status**: Specification Complete
**Implementation**: In Progress
**Version**: 1.0.0
**Last Updated**: 2025-11-06
