# Symbol Hierarchy and ID Strategy

Future Plans 라이프사이클과 메서드 주소 생성 전략

## 현재 상황 분석

### 1. 현재 ID 시스템의 한계

**현재 구현**:
- ✅ **Top-level 심볼만 ID 할당**: 클래스, 함수, 인터페이스
- ❌ **메서드/프로퍼티는 ID 없음**: 암묵적 계층 구조
- ❌ **중첩 함수 추적 불가**: 내부 helper 함수 등

**ID 생성 방식**:
```typescript
// Sequential mode (default)
000, 001, 002, ..., 00z, 010, ...

// Registry entry
{
  "id": "005",
  "sourceRef": {
    "filePath": "src/DataProcessor.ts",
    "symbolName": "DataProcessor",
    "type": "class"
  }
}
```

**문제점**:
```typescript
/**
 * @id 005
 */
export class DataProcessor {
  // ❌ 메서드는 ID 없음 - 어떻게 참조?
  process(data: string): void { }

  // ❌ 중첩 함수도 ID 없음 - Future Plan에서 어떻게 명시?
  private helper() { }
}
```

---

## JSDoc/TSDoc 표준 계층 표현법

### 1. Namepath 표기법

JSDoc 표준:
- `MyClass#instanceMethod` - 인스턴스 메서드
- `MyClass.staticMethod` - 정적 메서드
- `MyClass~innerMethod` - 내부/private 메서드
- `module:path/to/module~MyClass` - 모듈 내 심볼

### 2. 표준 태그

```typescript
/**
 * Instance method
 * @memberof MyClass
 * @instance
 */
MyClass.prototype.process = function() { }

/**
 * Static method
 * @memberof MyClass
 * @static
 */
MyClass.createDefault = function() { }

/**
 * Inner helper
 * @memberof MyClass
 * @inner
 */
function helper() { }
```

### 3. 예제: 완전한 계층 구조

```typescript
/**
 * Main data processor
 * @id 005
 * @class
 */
export class DataProcessor {
  /**
   * Process data
   * @memberof DataProcessor
   * @instance
   * @method process
   */
  process(data: string): void {
    /**
     * Helper function
     * @memberof DataProcessor#process
     * @inner
     * @function sanitize
     */
    function sanitize(text: string) { }
  }

  /**
   * Create default instance
   * @memberof DataProcessor
   * @static
   * @method createDefault
   */
  static createDefault(): DataProcessor { }
}
```

---

## Future Plans 라이프사이클 (명확화)

### 시나리오: "CSV 스트리밍 기능 추가"

#### Stage 1: Plan 작성 (인터페이스 미구현)

```typescript
/**
 * Data processor
 * @id 005
 *
 * @futurePlan PLAN-042
 * @planTitle Add CSV streaming support
 * @planDescription Need loadCSV() method that streams large files
 * without loading into memory. Should return AsyncGenerator<Row>.
 * Target chunk size: 10000 rows.
 * @planPriority high
 * @planStatus planned
 * @planCreatedAt 2024-03-01
 */
export class DataProcessor {
  // loadCSV 메서드 아직 없음
}
```

#### Stage 2: 구현 시작

```typescript
/**
 * Data processor
 * @id 005
 *
 * @futurePlan PLAN-042
 * @planStatus in-progress
 * @planRelatedIssue ISSUE-123
 */
export class DataProcessor {
  /**
   * Load CSV with streaming
   * @implements PLAN-042
   * @memberof DataProcessor
   * @instance
   * @param filePath - Path to CSV file
   * @returns Async generator of rows
   */
  async *loadCSV(filePath: string): AsyncGenerator<Row> {
    // 구현 중...
  }
}
```

#### Stage 3: 구현 완료

```typescript
/**
 * Data processor
 * @id 005
 *
 * @futurePlan PLAN-042
 * @planStatus completed
 * @planCompletedAt 2024-03-15
 */
export class DataProcessor {
  /**
   * Load CSV with streaming
   * @id 005-loadCSV
   * @implements PLAN-042
   * @memberof DataProcessor
   * @instance
   * @tested 95% coverage
   */
  async *loadCSV(filePath: string): AsyncGenerator<Row> {
    // 완전히 구현됨
  }
}
```

**핵심**:
- Future Plan은 **기능 명세** (what we want)
- 구현된 메서드는 `@implements PLAN-042`로 **추적 가능**
- Plan은 completed 상태로 유지 (히스토리)

---

## 제안: 메서드 ID 전략

### Option A: Flat ID with Type Suffix (단순)

**장점**: 기존 시스템 유지, 간단
**단점**: 계층 구조 불명확

```typescript
// Class
{
  "id": "005",
  "symbolName": "DataProcessor",
  "type": "class"
}

// Method
{
  "id": "042",
  "symbolName": "loadCSV",
  "type": "method",
  "parent": "005"  // ← 부모 참조 추가
}
```

**TSDoc**:
```typescript
/**
 * @id 005
 */
export class DataProcessor {
  /**
   * @id 042
   * @memberof DataProcessor
   */
  loadCSV() { }
}
```

---

### Option B: Hierarchical ID (계층 명시) - 👍 추천

**장점**: 계층 구조 명확, 충돌 방지
**단점**: ID가 길어짐, 리팩토링 시 ID 변경

```typescript
// Class
{
  "id": "005",
  "symbolName": "DataProcessor",
  "type": "class"
}

// Method
{
  "id": "005.001",
  "symbolName": "loadCSV",
  "type": "method"
}

// Method 2
{
  "id": "005.002",
  "symbolName": "process",
  "type": "method"
}

// Nested function
{
  "id": "005.001.001",
  "symbolName": "sanitize",
  "type": "function"
}
```

**TSDoc**:
```typescript
/**
 * @id 005
 */
export class DataProcessor {
  /**
   * @id 005.001
   * @memberof DataProcessor
   */
  loadCSV() { }

  /**
   * @id 005.002
   * @memberof DataProcessor
   */
  process() {
    /**
     * @id 005.002.001
     * @memberof DataProcessor#process
     * @inner
     */
    function helper() { }
  }
}
```

---

### Option C: Qualified Path (텍스트 기반)

**장점**: 인간 친화적, 자동 생성 가능
**단점**: 리팩토링 시 변경됨, 긴 경로

```typescript
// Class
{
  "id": "005",
  "qualifiedName": "DataProcessor",
  "filePath": "src/DataProcessor.ts"
}

// Method
{
  "id": "042",
  "qualifiedName": "DataProcessor#loadCSV",
  "filePath": "src/DataProcessor.ts"
}

// Static method
{
  "id": "043",
  "qualifiedName": "DataProcessor.createDefault",
  "filePath": "src/DataProcessor.ts"
}
```

**TSDoc**:
```typescript
/**
 * @id DataProcessor
 */
export class DataProcessor {
  /**
   * @id DataProcessor#loadCSV
   * @memberof DataProcessor
   */
  loadCSV() { }

  /**
   * @id DataProcessor.createDefault
   * @memberof DataProcessor
   * @static
   */
  static createDefault() { }
}
```

---

### Option D: Hybrid (숫자 ID + 경로 참조) - 👍👍 최고 추천

**장점**: ID는 짧고 불변, 경로로 인간 친화적
**단점**: 시스템 복잡도 증가

```typescript
// Registry entry
{
  "id": "042",                           // 짧고 불변
  "sourceRef": {
    "filePath": "src/DataProcessor.ts",
    "symbolName": "loadCSV",
    "type": "method",
    "memberOf": "005"                   // 부모 클래스 ID
  },
  "qualifiedName": "DataProcessor#loadCSV"  // 인간 친화적 참조
}
```

**TSDoc**:
```typescript
/**
 * Data processor
 * @id 005
 */
export class DataProcessor {
  /**
   * Load CSV with streaming
   * @id 042
   * @memberof DataProcessor
   * @instance
   * @implements PLAN-042
   */
  async *loadCSV(filePath: string): AsyncGenerator<Row> { }
}
```

**Future Plan에서 참조**:
```typescript
/**
 * @futurePlan PLAN-042
 * @planTitle Add CSV streaming support
 * @planDescription Need method DataProcessor#loadCSV that streams...
 * @planStatus planned
 * @planTargetSymbol DataProcessor  // 어디에 추가할지
 * @planTargetMethod loadCSV        // 메서드명
 */
```

**구현 후**:
```typescript
/**
 * @futurePlan PLAN-042
 * @planStatus completed
 * @planImplementedBy 042  // 실제 구현된 메서드 ID
 */
```

---

## 실전 예제: 전체 라이프사이클

### 1. 초기 상태: 클래스만 존재

```typescript
/**
 * CSV data processor
 *
 * @id 005
 * @public
 * @responsibility Handle CSV file processing
 *
 * @futurePlan PLAN-010
 * @planTitle Add streaming support for large files
 * @planDescription Implement loadStream() method that can handle 5GB+ files
 * by processing in chunks. Memory usage should stay under 2GB.
 * @planPriority high
 * @planStatus planned
 * @planMilestone v2.0
 * @planTargetSymbol DataProcessor
 * @planTargetMethod loadStream
 * @planCreatedAt 2024-03-01
 *
 * @futurePlan PLAN-011
 * @planTitle Add automatic encoding detection
 * @planDescription Implement detectEncoding() helper that uses chardet
 * @planPriority medium
 * @planStatus planned
 * @planTargetSymbol DataProcessor
 * @planTargetMethod detectEncoding
 * @planCreatedAt 2024-03-01
 */
export class DataProcessor {
  // 아직 메서드 없음
}
```

---

### 2. 개발 시작: 일부 구현

```typescript
/**
 * CSV data processor
 *
 * @id 005
 * @public
 *
 * @futurePlan PLAN-010
 * @planStatus in-progress
 * @planRelatedIssue ISSUE-234
 *
 * @futurePlan PLAN-011
 * @planStatus planned
 */
export class DataProcessor {
  /**
   * Load large CSV file with streaming
   *
   * @id 042
   * @memberof DataProcessor
   * @instance
   * @implements PLAN-010
   *
   * @param filePath - Path to CSV file
   * @param options - Streaming options
   * @returns Async generator of data chunks
   *
   * @public
   * @contract Stream CSV with constant memory usage
   * @precondition File must exist and be readable
   * @postcondition Memory usage < 2GB
   *
   * @testedBy DataProcessor.test.ts
   * @testScenario Load 5GB file successfully
   * @coverage 85%
   */
  async *loadStream(
    filePath: string,
    options?: StreamOptions
  ): AsyncGenerator<DataChunk> {
    // 구현 중...
    throw new Error('Not fully implemented');
  }
}
```

---

### 3. 완료: 모든 기능 구현

```typescript
/**
 * CSV data processor with streaming support
 *
 * @id 005
 * @public
 * @version 2.0.0
 *
 * @futurePlan PLAN-010
 * @planStatus completed
 * @planImplementedBy 042
 * @planCompletedAt 2024-03-15
 *
 * @futurePlan PLAN-011
 * @planStatus completed
 * @planImplementedBy 043
 * @planCompletedAt 2024-03-20
 */
export class DataProcessor {
  /**
   * Load large CSV file with streaming
   *
   * @id 042
   * @memberof DataProcessor
   * @instance
   * @implements PLAN-010
   *
   * @param filePath - Path to CSV file
   * @param options - Streaming options
   * @returns Async generator of data chunks
   *
   * @public
   * @contract Stream CSV with constant memory usage
   * @precondition File must exist and be readable
   * @postcondition Memory usage < 2GB
   *
   * @testedBy DataProcessor.test.ts
   * @coverage 95%
   */
  async *loadStream(
    filePath: string,
    options?: StreamOptions
  ): AsyncGenerator<DataChunk> {
    const encoding = await this.detectEncoding(filePath);
    // 완전히 구현됨
  }

  /**
   * Detect file encoding automatically
   *
   * @id 043
   * @memberof DataProcessor
   * @instance
   * @implements PLAN-011
   *
   * @param filePath - Path to file
   * @returns Detected encoding (utf-8, latin-1, etc)
   *
   * @dependsOn chardet
   * @dependencyType external
   * @dependencyReason Automatic encoding detection
   *
   * @private
   */
  private async detectEncoding(filePath: string): Promise<string> {
    // 구현됨
  }
}
```

---

## 데이터 구조 업데이트

### SourceRef 확장

```typescript
interface SourceRef {
  filePath: string;
  symbolName: string;
  type?: 'class' | 'function' | 'interface' | 'type' | 'enum' | 'variable' | 'method' | 'property';
  line?: number;

  // 새로 추가
  memberOf?: string;        // 부모 심볼 ID (메서드인 경우)
  memberType?: 'instance' | 'static' | 'inner';
  qualifiedName?: string;   // 전체 경로 (예: DataProcessor#loadStream)
}
```

### FuturePlan 확장

```typescript
interface FuturePlan {
  id: string;
  title: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';

  // 새로 추가: 구현 위치 명시
  targetSymbol?: string;      // 어느 클래스/모듈에 추가할지
  targetMethod?: string;      // 메서드명 (또는 함수명)
  targetType?: 'method' | 'function' | 'property';

  // 구현 완료 시
  implementedBy?: string;     // 실제 구현된 심볼 ID
  completedAt?: string;

  createdAt: string;
}
```

---

## 파서 업데이트 필요

### TSDoc Parser 확장

**새로 파싱해야 할 태그**:
- `@memberof` - 부모 심볼 지정
- `@instance` / `@static` / `@inner` - 멤버 타입
- `@implements PLAN-XXX` - Future Plan 참조
- `@planTargetSymbol` - Future Plan에서 타겟 지정
- `@planTargetMethod` - 추가할 메서드명
- `@planImplementedBy` - 구현된 심볼 ID

### ID Generator 확장

**Hierarchical ID 생성**:
```typescript
class IdGenerator {
  // 기존: 000, 001, 002
  generate(): string { }

  // 새로 추가: 005.001, 005.002
  generateChild(parentId: string): string {
    const counter = this.getChildCounter(parentId);
    return `${parentId}.${counter.toString().padStart(3, '0')}`;
  }
}
```

---

## 권장 방안

### 단계별 구현

#### Phase 1: 메서드 ID 할당 (Hybrid 방식)
- 메서드에도 flat ID 할당 (042, 043, ...)
- `memberOf` 필드로 부모 참조
- `qualifiedName` 생성 (DataProcessor#loadCSV)

#### Phase 2: Future Plan 확장
- `targetSymbol`, `targetMethod` 필드 추가
- `implementedBy` 필드로 구현 추적
- Lifecycle 자동 업데이트 (CLI 명령어)

#### Phase 3: 검증 강화
- `@implements PLAN-XXX` 검증
- Plan completed인데 implementedBy 없으면 경고
- implementedBy 심볼이 실제 존재하는지 검증

---

## CLI 명령어 제안

```bash
# Future Plans 목록
tsdoc-edge plans
tsdoc-edge plans --status=planned
tsdoc-edge plans --priority=high

# Plan 상세 보기
tsdoc-edge plan PLAN-042

# Plan 완료 처리 (자동으로 implementedBy 설정)
tsdoc-edge plan complete PLAN-042 --implemented-by=042

# 메서드 ID 생성
tsdoc-edge id new src/DataProcessor.ts DataProcessor.loadCSV --type=method

# 메서드 찾기
tsdoc-edge find-method DataProcessor#loadCSV
```

---

## 다음 단계

1. **결정 필요**:
   - Option D (Hybrid) 방식 채택?
   - Future Plan 필드 확장?

2. **구현 순서**:
   1. SourceRef 타입 확장 (memberOf, qualifiedName 추가)
   2. FuturePlan 타입 확장 (targetSymbol, implementedBy 추가)
   3. ID Generator에 child ID 생성 기능 추가
   4. Parser에 @memberof, @implements 파싱 추가
   5. CLI 명령어 확장 (plans, plan complete 등)
   6. Validator 업데이트 (@implements 검증)

3. **테스트 시나리오**:
   - 클래스 → 메서드 계층 구조 파싱
   - Future Plan 생성 → 구현 → 완료 라이프사이클
   - 메서드 ID로 검색 및 추적

---

## 예상 결과

완성 후 개발 워크플로우:

```bash
# 1. Future Plan 작성 (AI 또는 개발자)
# TSDoc에 @futurePlan 추가

# 2. Plan 확인
$ tsdoc-edge plans
PLAN-042 [high] [planned] Add CSV streaming support

# 3. 구현 시작
# 메서드 추가 + @implements PLAN-042

# 4. ID 생성
$ tsdoc-edge id new src/DataProcessor.ts DataProcessor.loadCSV --type=method
✅ ID generated: 042
   Qualified Name: DataProcessor#loadCSV

# 5. Plan 완료 처리
$ tsdoc-edge plan complete PLAN-042 --implemented-by=042
✅ PLAN-042 marked as completed
   Implemented by: 042 (DataProcessor#loadCSV)

# 6. 검증
$ tsdoc-edge validate
✅ All Future Plans validated
✅ All implementations linked correctly
```

---

## 결론

**추천 방안**: Option D (Hybrid)
- 짧은 숫자 ID 유지 (불변성)
- qualifiedName으로 인간 친화적 참조
- memberOf로 계층 구조 명확화
- Future Plan과 구현 간 명확한 추적

이 방식으로 진행하시겠습니까?
