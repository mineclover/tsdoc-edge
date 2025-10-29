# Simplified 6-Category Specification

AI가 작성하기에 실용적인 수준으로 간소화된 스펙

## 설계 원칙

1. **필수는 최소화**: 정말 중요한 필드만 required
2. **중복 제거**: @param/@returns와 겹치는 정보 제거
3. **AI 친화적**: 명확한 구조, 적은 부담
4. **점진적 확장**: 기본은 단순하게, 필요시 optional 필드 추가

---

## Category 1: Problem Solving (문제 해결)

### 목적
이 코드가 **왜 존재하는가**

### Required Fields
```typescript
problemSolving: {
  description: string;  // 해결하는 문제 (1-2문장)
  context: string;      // 문제 발생 배경 (2-3문장)
}
```

### Optional Fields
```typescript
{
  targetUseCase?: string;     // 주요 사용 사례
  relatedProblem?: string;    // 관련 문제 ID
}
```

### TSDoc Example
```typescript
/**
 * @problemContext Out-of-memory errors when loading 3GB+ CSV files.
 * Server has 8GB RAM but pandas.read_csv() fails on large files.
 *
 * @problemSolution Stream-based processing with configurable chunk size.
 * Memory usage stays constant under 2GB regardless of file size.
 */
```

### 간소화 포인트
- ✅ 핵심 2개만 필수: description, context
- ✅ 나머지는 optional

---

## Category 2: Functionality (기능)

### 목적
**무엇을 하는가**

### Required Fields
```typescript
functionality: {
  mainFeatures: string[];  // 주요 기능 목록 (3-5개)
}
```

### Optional Fields
```typescript
{
  examples?: string[];  // 코드 예제
}
```

### 제거된 필드 (중복이므로)
- ❌ `components` - 이미 함수/메서드로 정의됨
- ❌ `io.inputs` - 이미 @param으로 문서화됨
- ❌ `io.outputs` - 이미 @returns로 문서화됨
- ❌ `componentSignature` - TypeScript 타입으로 명확함

### TSDoc Example
```typescript
/**
 * @mainFeature Stream-based CSV reading with configurable chunk size
 * @mainFeature NaN value handling with drop/fill/interpolate strategies
 * @mainFeature Progress tracking with callback support
 *
 * @example
 * ```typescript
 * const processor = new CSVDataProcessor();
 * for await (const chunk of processor.loadData('data.csv')) {
 *   await processChunk(chunk);
 * }
 * ```
 */
```

### 간소화 포인트
- ✅ mainFeatures만 필수 (기능 목록)
- ✅ components, io 정보 제거 (코드에 이미 있음)
- ✅ examples는 optional (유용하지만 필수 아님)

---

## Category 3: Error Experiences (에러 경험)

### 목적
**실제 겪은 문제와 해결책**

### Required Fields
```typescript
errorExperiences: [
  {
    id: string;        // ERR-001
    errorType: string; // MemoryError, TypeError 등
    message: string;   // 실제 에러 메시지
    solution: string;  // 어떻게 해결했나
  }
]
```

### Optional Fields
```typescript
{
  context?: string;       // 발생 상황 (상세)
  prevention?: string;    // 예방 방법
}
```

### 제거된 필드
- ❌ `occurredAt` - 대부분 불필요, Git history로 추적 가능

### TSDoc Example
```typescript
/**
 * @error ERR-001
 * @errorType MemoryError
 * @errorMessage "Unable to allocate array with shape (10000000, 50)"
 * @errorSolution Implemented chunk-based streaming with chunksize=10000.
 * Each chunk uses ~200MB to keep total under 2GB.
 */
```

### 간소화 포인트
- ✅ 4개 필드만 필수: id, type, message, solution
- ✅ context, prevention은 optional
- ✅ occurredAt 제거 (Git history로 충분)
- ✅ Public API는 최소 1개, Private는 빈 배열 허용

---

## Category 4: Design Decisions (설계 결정)

### 목적
**왜 이렇게 구현했나** (ADR)

### Required Fields
```typescript
decisions: [
  {
    id: string;         // ADR-001
    title: string;      // 결정 제목
    decision: string;   // 무엇을 결정했나
    rationale: string;  // 왜 이 선택을 했나
  }
]
```

### Optional Fields
```typescript
{
  alternatives?: string[];   // 고려한 대안들 (단순 배열)
  consequences?: string[];   // 결과/영향 (단순 배열)
  date?: string;            // 결정 날짜
  status?: 'accepted' | 'deprecated' | 'superseded';
}
```

### 간소화된 alternatives 구조
```typescript
// Before (복잡)
alternatives: [
  { option: "multiprocessing", reason: "High overhead" },
  { option: "asyncio", reason: "Requires rewrite" }
]

// After (단순)
alternatives: [
  "multiprocessing - High overhead for I/O tasks",
  "asyncio - Requires complete rewrite"
]
```

### TSDoc Example
```typescript
/**
 * @decision ADR-001
 * @decisionTitle Use concurrent.futures instead of multiprocessing
 * @decisionMade Implement thread-based parallelism with ThreadPoolExecutor
 * @decisionRationale CSV reading is I/O bound. Threads provide better
 * performance with minimal GIL contention. 3x faster than process-based.
 */
```

### 간소화 포인트
- ✅ 4개 필드만 필수: id, title, decision, rationale
- ✅ alternatives를 복잡한 객체에서 단순 문자열 배열로
- ✅ consequences도 단순 문자열 배열로
- ✅ date, status는 optional

---

## Category 5: Dependencies (의존성)

### 목적
**무엇에 의존하고 왜 필요한가**

### Required Fields
```typescript
dependencies: [
  {
    target: string;  // pandas, DataValidator 등
    type: 'external' | 'module' | 'symbol';
    reason: string;  // 왜 필요한가
  }
]
```

### Optional Fields
```typescript
{
  version?: string;       // external인 경우 버전 제약
  importPath?: string;    // module/symbol인 경우 경로
  isOptional?: boolean;   // 필수 여부
}
```

### 제거된 필드
- ❌ `dependencyRequired` → `isOptional`로 통합 (더 직관적)
- ❌ `dependencyFallback` → 대부분 불필요

### TSDoc Example
```typescript
/**
 * @dependsOn pandas
 * @dependencyType external
 * @dependencyReason DataFrame operations and CSV parsing with chunksize
 *
 * @dependsOn DataValidator
 * @dependencyType symbol
 * @dependencyReason Validate data quality before processing
 */
```

### 간소화 포인트
- ✅ 3개 필드만 필수: target, type, reason
- ✅ version, importPath, isOptional은 optional
- ✅ fallback 제거

---

## Category 6: Future Plans (향후 계획) - 대폭 간소화

### 목적
**앞으로 무엇을 할 것인가**

### Required Fields (Option A: 최소)
```typescript
futurePlans: [
  {
    id: string;          // PLAN-001
    title: string;       // 계획 제목
    description: string; // 상세 설명
  }
]
```

### Optional Fields
```typescript
{
  priority?: 'high' | 'medium' | 'low';
  status?: 'planned' | 'in-progress' | 'completed';
}
```

### 제거된 필드 (Issue Tracker에서 관리)
- ❌ `targetMilestone` → GitHub Issues/Milestones로
- ❌ `estimatedEffort` → Issue에서 관리
- ❌ `blockedBy` → Issue dependencies로
- ❌ `relatedIssues` → Issue links로
- ❌ `createdAt` → Git history로
- ❌ `completedAt` → Git history로

### TSDoc Example
```typescript
/**
 * @futurePlan PLAN-001
 * @planTitle Add S3 direct streaming support
 * @planDescription Enable direct streaming from AWS S3 buckets without
 * downloading files. Use boto3 streaming API to reduce bandwidth.
 * @planPriority high
 * @planStatus planned
 */
```

### 간소화 포인트
- ✅ 3개 필드만 필수: id, title, description
- ✅ priority, status는 optional
- ✅ 나머지는 Issue Tracker에서 관리 (중복 제거)

---

## 대안: Future Plans 완전 제거?

### 제거 근거
1. GitHub Issues로 충분히 관리 가능
2. 코드 주석에 로드맵을 넣는 것이 적절한가?
3. 자주 변경되는 정보 → 코드와 sync 어려움

### 제거 시 대안
- `TODO` 주석 사용
- GitHub Issues/Projects로 로드맵 관리
- ROADMAP.md 파일 별도 관리

### 투표
- **Option A**: 최소 유지 (id, title, description만)
- **Option B**: 완전 제거 (Issue Tracker로 대체)

---

## 비교: Before vs After

### Before (원래 스펙)
```typescript
{
  problemSolving: { description, context, targetUseCase, relatedProblem },
  functionality: {
    mainFeatures: [],
    components: [{ name, description, signature }],
    io: { inputs: [{ name, type, description }], outputs: [...] },
    examples: []
  },
  errorExperiences: [{
    id, errorType, message, context, solution, prevention, occurredAt
  }],
  decisions: [{
    id, title, decision, rationale,
    alternatives: [{ option, reason }],
    consequences: [],
    date, status, supersededBy
  }],
  dependencies: [{
    target, type, reason, version, importPath, isRequired, fallback
  }],
  futurePlans: [{
    id, title, description, priority, status,
    targetMilestone, estimatedEffort, blockedBy,
    relatedIssues, createdAt, completedAt
  }]
}
```

**총 필드 수**: ~40개

---

### After (간소화 스펙)
```typescript
{
  // Category 1: Problem Solving (2 required)
  problemSolving: {
    description: string;  // required
    context: string;      // required
  },

  // Category 2: Functionality (1 required)
  functionality: {
    mainFeatures: string[];  // required
  },

  // Category 3: Error Experiences (4 required per error)
  errorExperiences: [{
    id: string;        // required
    errorType: string; // required
    message: string;   // required
    solution: string;  // required
  }],

  // Category 4: Design Decisions (4 required per decision)
  decisions: [{
    id: string;         // required
    title: string;      // required
    decision: string;   // required
    rationale: string;  // required
  }],

  // Category 5: Dependencies (3 required per dependency)
  dependencies: [{
    target: string;  // required
    type: string;    // required
    reason: string;  // required
  }],

  // Category 6: Future Plans (3 required per plan)
  futurePlans: [{
    id: string;          // required
    title: string;       // required
    description: string; // required
  }]
}
```

**총 필수 필드 수**: ~19개 (52% 감소)

---

## 실전 예제: 간소화된 TSDoc

```typescript
/**
 * CSV data processor with memory-efficient streaming
 *
 * ## Category 1: Problem Solving
 * @problemContext Out-of-memory errors when loading 3GB+ CSV files.
 * Server has 8GB RAM but pandas.read_csv() fails on large files.
 *
 * @problemSolution Stream-based processing with configurable chunk size
 * to keep memory usage constant under 2GB.
 *
 * ## Category 2: Functionality
 * @mainFeature Stream-based CSV reading with configurable chunk size
 * @mainFeature NaN value handling with drop/fill/interpolate strategies
 * @mainFeature Progress tracking with callback support
 *
 * @example
 * ```typescript
 * const processor = new CSVDataProcessor();
 * for await (const chunk of processor.loadData('data.csv')) {
 *   await processChunk(chunk);
 * }
 * ```
 *
 * ## Category 3: Error Experiences
 * @error ERR-001
 * @errorType MemoryError
 * @errorMessage "Unable to allocate array with shape (10000000, 50)"
 * @errorSolution Implemented chunk-based streaming with chunksize=10000
 *
 * ## Category 4: Design Decisions
 * @decision ADR-001
 * @decisionTitle Use concurrent.futures instead of multiprocessing
 * @decisionMade Implement thread-based parallelism with ThreadPoolExecutor
 * @decisionRationale CSV reading is I/O bound. Threads provide 3x better
 * performance with minimal GIL contention.
 *
 * ## Category 5: Dependencies
 * @dependsOn pandas
 * @dependencyType external
 * @dependencyReason DataFrame operations and CSV parsing with chunksize
 *
 * @dependsOn DataValidator
 * @dependencyType symbol
 * @dependencyReason Validate data quality before processing
 *
 * ## Category 6: Future Plans
 * @futurePlan PLAN-001
 * @planTitle Add S3 direct streaming support
 * @planDescription Enable direct streaming from AWS S3 buckets without
 * downloading files. Use boto3 streaming API.
 *
 * ## Metadata
 * @public
 * @responsibility Handle CSV data processing with streaming
 * @param filePath - Path to CSV file
 * @returns Async generator of data chunks
 */
export class CSVDataProcessor {
  // Implementation
}
```

**TSDoc 길이**: ~150 줄 (기존 300+ 줄에서 50% 감소)

---

## 간소화 요약

| Category | Before (필드 수) | After (필수 필드) | 감소율 |
|----------|------------------|-------------------|--------|
| 1. Problem Solving | 4 | 2 | 50% |
| 2. Functionality | 10+ | 1 | 90% |
| 3. Error Experiences | 7 | 4 | 43% |
| 4. Design Decisions | 9 | 4 | 56% |
| 5. Dependencies | 7 | 3 | 57% |
| 6. Future Plans | 10 | 3 | 70% |
| **Total** | **~47** | **~17** | **64%** |

---

## 검증 수준 조정

### Strict Mode (Public API)
- 6개 카테고리 모두 필수
- 각 카테고리의 required 필드만 검증
- 최소 항목 수 요구:
  - errorExperiences: 최소 1개
  - decisions: 최소 1개
  - dependencies: 있으면 문서화 (없어도 OK)
  - futurePlans: 있으면 문서화 (없어도 OK)

### Standard Mode (Internal API)
- Category 1, 2만 필수
- 나머지는 optional

### Minimal Mode (Private)
- 기본 TSDoc만 (summary, @param, @returns)

---

## 다음 단계

1. **스펙 확정**: 이 간소화 버전으로 진행할지 결정
2. **TypeScript 타입 업데이트**: types/enhanced-tags.ts 수정
3. **Validator 수정**: 새로운 필수 필드만 검증
4. **파서 구현**: 커스텀 태그 파싱 로직
5. **AI 프롬프트**: AI가 이 스펙으로 작성하도록 가이드

---

## 추가 검토 포인트

### Future Plans 완전 제거?
**찬성**:
- Issue Tracker로 충분
- 코드와 로드맵 분리가 더 자연스러움
- 자주 변경되는 정보

**반대**:
- 코드를 보면서 바로 향후 계획 확인 가능
- Single Source of Truth 유지

**제안**: Option A (최소 유지) 채택, 하지만 완전 optional로

### Components 정보 정말 불필요?
**검토**:
- 클래스의 경우 메서드가 여러 개
- 각 메서드에 독립적인 TSDoc 있음
- 클래스 레벨에서 "주요 메서드 목록" 필요한가?

**제안**: 불필요. 코드 구조로 충분.

---

## 최종 권장 스펙

```typescript
interface SimplifiedEnhancedSymbolDoc {
  symbolId: string;

  // Category 1: 2 required
  problemSolving: {
    description: string;
    context: string;
  };

  // Category 2: 1 required
  functionality: {
    mainFeatures: string[];
    examples?: string[];
  };

  // Category 3: 배열 (각 항목 4 required)
  errorExperiences: Array<{
    id: string;
    errorType: string;
    message: string;
    solution: string;
    context?: string;
    prevention?: string;
  }>;

  // Category 4: 배열 (각 항목 4 required)
  decisions: Array<{
    id: string;
    title: string;
    decision: string;
    rationale: string;
    alternatives?: string[];
    date?: string;
    status?: 'accepted' | 'deprecated' | 'superseded';
  }>;

  // Category 5: 배열 (각 항목 3 required)
  dependencies: Array<{
    target: string;
    type: 'external' | 'module' | 'symbol';
    reason: string;
    version?: string;
    importPath?: string;
    isOptional?: boolean;
  }>;

  // Category 6: 배열 (각 항목 3 required) - OPTIONAL 카테고리
  futurePlans?: Array<{
    id: string;
    title: string;
    description: string;
    priority?: 'high' | 'medium' | 'low';
    status?: 'planned' | 'in-progress' | 'completed';
  }>;

  // Metadata
  createdAt: string;
  updatedAt: string;
  version: string;
}
```

이 스펙으로 진행하시겠습니까?
