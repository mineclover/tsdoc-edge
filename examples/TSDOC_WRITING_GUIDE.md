# TSDoc Writing Guide for 6-Category System

이 가이드는 TSDoc Edge의 6개 카테고리 시스템에 필요한 모든 데이터를 수집할 수 있도록 TSDoc 주석을 작성하는 방법을 설명합니다.

## 목차

1. [개요](#개요)
2. [기본 구조](#기본-구조)
3. [카테고리별 작성법](#카테고리별-작성법)
4. [커스텀 태그 전체 목록](#커스텀-태그-전체-목록)
5. [실전 예제](#실전-예제)
6. [장단점 분석](#장단점-분석)
7. [대안적 접근법](#대안적-접근법)

---

## 개요

TSDoc Edge는 **2단계 검증 시스템**을 사용합니다:

### 1단계: 기본 모드 (ConventionValidator)
표준 TSDoc 컨벤션 준수 검증

### 2단계: 엄격 모드 (StrictModeValidator)
6개 카테고리 완전 문서화 검증

이 가이드는 **엄격 모드**를 통과하기 위한 TSDoc 작성법을 다룹니다.

---

## 기본 구조

```typescript
/**
 * 한 줄 요약 (필수)
 *
 * 상세 설명 (선택)
 *
 * ## Category 1: Problem Solving
 * @problemContext ...
 * @problemSolution ...
 *
 * ## Category 2: Functionality
 * @mainFeature ...
 * @component ...
 *
 * ## Category 3: Error Experiences
 * @error ERR-001
 * @errorType ...
 *
 * ## Category 4: Design Decisions
 * @decision ADR-001
 * @decisionTitle ...
 *
 * ## Category 5: Dependencies
 * @dependsOn ...
 *
 * ## Category 6: Future Plans
 * @futurePlan PLAN-001
 * @planTitle ...
 *
 * ## Metadata & Traceability
 * @public
 * @responsibility ...
 * @contract ...
 *
 * @param name - 설명
 * @returns 설명
 */
```

---

## 카테고리별 작성법

### Category 1: Problem Solving (문제 해결)

**목적**: 이 코드가 해결하는 문제를 명확히 정의

```typescript
/**
 * @problemContext 문제가 발생한 배경과 상황 설명.
 * 구체적인 수치와 환경 정보 포함.
 *
 * @problemSolution 문제를 어떻게 해결하는가.
 * 핵심 아이디어와 접근법 설명.
 *
 * @targetUseCase 주요 사용 사례 (선택)
 *
 * @relatedProblem 관련된 다른 문제 ID (선택)
 */
```

**예시**:
```typescript
/**
 * @problemContext Out-of-memory errors when loading 3GB+ CSV files.
 * Server has 8GB RAM but pandas.read_csv() fails on files >3GB.
 * External vendor sends daily customer data files that keep growing.
 *
 * @problemSolution Stream-based processing with configurable chunk size.
 * Memory usage stays constant under 2GB regardless of file size.
 *
 * @targetUseCase ETL pipeline loading customer data into warehouse.
 * Daily batch processing of vendor files from 100MB to 5GB.
 *
 * @relatedProblem memory-optimization-project
 */
```

---

### Category 2: Functionality (기능)

**목적**: 구체적인 기능과 컴포넌트 명세

```typescript
/**
 * @mainFeature 주요 기능 1 설명
 * @mainFeature 주요 기능 2 설명
 * @mainFeature 주요 기능 3 설명
 *
 * @component 컴포넌트명 - 컴포넌트 설명
 * @componentSignature (param: Type) => ReturnType
 *
 * @input 입력명 - 입력 설명 (선택)
 * @inputType 타입명
 *
 * @output 출력명 - 출력 설명 (선택)
 * @outputType 타입명
 *
 * @example
 * ```typescript
 * // 코드 예제
 * ```
 */
```

**예시**:
```typescript
/**
 * @mainFeature Stream-based CSV reading with configurable chunk size
 * @mainFeature NaN value handling with drop/fill/interpolate strategies
 * @mainFeature Progress tracking with callback support
 *
 * @component loadData - Load CSV as async stream with auto-chunking
 * @componentSignature (filePath: string, options?: LoadOptions) => AsyncGenerator<DataFrame>
 *
 * @component cleanText - Remove special characters and normalize whitespace
 * @componentSignature (text: string, options?: CleanOptions) => string
 *
 * @input filePath - Absolute or relative path to CSV file
 * @inputType string
 *
 * @output result - Processed data stream
 * @outputType AsyncGenerator<DataFrame>
 *
 * @example
 * ```typescript
 * const processor = new CSVDataProcessor();
 * const stream = processor.loadData('data.csv', { chunkSize: 10000 });
 * for await (const chunk of stream) {
 *   await processChunk(chunk);
 * }
 * ```
 */
```

---

### Category 3: Error Experiences (에러 경험)

**목적**: 실제 겪은 에러와 해결책 문서화

```typescript
/**
 * @error 에러-ID
 * @errorType 에러 타입/클래스명
 * @errorMessage "실제 에러 메시지"
 * @errorContext 에러가 발생한 상황과 조건 설명
 * @errorSolution 어떻게 해결했는가
 * @errorPrevention 재발 방지 방법 (선택)
 * @errorOccurredAt ISO 날짜 (선택)
 */
```

**예시**:
```typescript
/**
 * @error ERR-001
 * @errorType MemoryError
 * @errorMessage "Unable to allocate array with shape (10000000, 50)"
 * @errorContext Occurred when loading 3GB CSV with pandas.read_csv()
 * on 8GB RAM server. Memory usage spiked to 7.8GB and process was
 * killed by OOM killer.
 * @errorSolution Implemented chunk-based streaming with chunksize=10000.
 * Each chunk uses ~200MB, processed sequentially to keep total under 2GB.
 * @errorPrevention Use chunked reading for any file >500MB. Monitor
 * memory with psutil.
 * @errorOccurredAt 2024-01-15T03:45:00Z
 *
 * @error ERR-002
 * @errorType UnicodeDecodeError
 * @errorMessage "codec can't decode byte 0xff in position 1234"
 * @errorContext CSV file had mixed encodings (UTF-8 and Windows-1252).
 * @errorSolution Added automatic encoding detection using chardet library.
 * Falls back to latin-1 if UTF-8 fails.
 * @errorPrevention Always specify encoding or use auto-detection for
 * external files.
 * @errorOccurredAt 2024-01-20T10:30:00Z
 */
```

**참고**:
- Public API는 최소 1개 이상의 에러 경험 권장
- Private 함수는 `[]` 빈 배열 가능

---

### Category 4: Design Decisions (설계 결정)

**목적**: 중요한 설계 결정 사항을 ADR 형식으로 기록

```typescript
/**
 * @decision ADR-ID
 * @decisionTitle 결정 제목
 * @decisionMade 무엇을 결정했는가
 * @decisionRationale 왜 이 결정을 내렸는가 (근거)
 * @decisionAlternative 대안1 - 왜 선택하지 않았나
 * @decisionAlternative 대안2 - 왜 선택하지 않았나
 * @decisionConsequence Positive: 긍정적 영향
 * @decisionConsequence Negative: 부정적 영향
 * @decisionDate YYYY-MM-DD
 * @decisionStatus accepted | proposed | deprecated | superseded
 * @decisionSupersededBy ADR-XXX (선택)
 */
```

**예시**:
```typescript
/**
 * @decision ADR-001
 * @decisionTitle Use concurrent.futures instead of multiprocessing
 * @decisionMade Implement thread-based parallelism with ThreadPoolExecutor
 * for chunk processing
 * @decisionRationale CSV reading is I/O bound. Threads provide better
 * performance than processes for I/O workloads with minimal GIL contention.
 * Process-based approach had 40% overhead from serialization costs.
 * @decisionAlternative multiprocessing.Pool - High overhead for I/O tasks,
 * pickling costs too high
 * @decisionAlternative asyncio - Requires complete rewrite to async/await,
 * library compatibility issues with pandas
 * @decisionConsequence Positive: 3x performance improvement on 4-core machine
 * @decisionConsequence Negative: Not optimal for CPU-intensive transformations
 * @decisionDate 2024-01-10
 * @decisionStatus accepted
 *
 * @decision ADR-002
 * @decisionTitle Stream processing instead of batch loading
 * @decisionMade Process CSV in chunks using generator pattern instead of
 * loading entire file into memory
 * @decisionRationale Memory constraints (8GB RAM) and growing file sizes
 * (up to 5GB). Batch loading causes OOM errors.
 * @decisionAlternative Increase server RAM to 32GB - Cost: $500/month increase
 * @decisionAlternative Use Dask/Spark - Too heavy for our use case,
 * deployment complexity
 * @decisionConsequence Positive: Stable memory usage, handles any file size
 * @decisionConsequence Negative: 20% slower than batch for small files (<100MB)
 * @decisionDate 2024-01-05
 * @decisionStatus accepted
 */
```

---

### Category 5: Dependencies (의존성)

**목적**: 모든 의존성을 이유와 함께 명시

```typescript
/**
 * @dependsOn 의존대상명
 * @dependencyType external | module | symbol | file
 * @dependencyReason 왜 필요한가
 * @dependencyVersion 버전 제약 (external인 경우)
 * @dependencyImportPath 임포트 경로 (module/symbol인 경우, 선택)
 * @dependencyRequired true | false
 * @dependencyFallback 대체 방안 (optional인 경우)
 */
```

**예시**:
```typescript
/**
 * @dependsOn pandas
 * @dependencyType external
 * @dependencyReason DataFrame operations, CSV parsing with chunksize support
 * @dependencyVersion >=2.0.0
 * @dependencyRequired true
 *
 * @dependsOn numpy
 * @dependencyType external
 * @dependencyReason NaN detection and numeric operations
 * @dependencyVersion >=1.24.0
 * @dependencyRequired true
 *
 * @dependsOn chardet
 * @dependencyType external
 * @dependencyReason Automatic CSV file encoding detection
 * @dependencyVersion >=5.0.0
 * @dependencyRequired false
 * @dependencyFallback Use UTF-8 as default encoding if chardet not available
 *
 * @dependsOn DataValidator
 * @dependencyType symbol
 * @dependencyReason Validate data quality before processing
 * @dependencyImportPath ../validation/DataValidator
 * @dependencyRequired true
 *
 * @dependsOn config_loader
 * @dependencyType module
 * @dependencyReason Load database credentials and processing configuration
 * @dependencyImportPath ../config/config_loader
 * @dependencyRequired true
 */
```

---

### Category 6: Future Plans (향후 계획)

**목적**: 로드맵과 개선 계획 추적

```typescript
/**
 * @futurePlan PLAN-ID
 * @planTitle 계획 제목
 * @planDescription 상세 설명
 * @planPriority high | medium | low
 * @planStatus planned | in-progress | completed | cancelled
 * @planMilestone 마일스톤 (선택)
 * @planEffort 예상 공수 (선택)
 * @planBlockedBy PLAN-XXX (선택)
 * @planRelatedIssue ISSUE-XXX (선택)
 * @planCreatedAt ISO 날짜
 * @planCompletedAt ISO 날짜 (completed인 경우)
 */
```

**예시**:
```typescript
/**
 * @futurePlan PLAN-001
 * @planTitle Add S3 direct streaming support
 * @planDescription Enable direct streaming from AWS S3 buckets without
 * downloading files. Use boto3 streaming API to reduce network bandwidth
 * and local storage requirements.
 * @planPriority high
 * @planStatus in-progress
 * @planMilestone v2.0
 * @planEffort 2 weeks
 * @planRelatedIssue ISSUE-234
 * @planRelatedIssue ISSUE-245
 * @planCreatedAt 2024-02-15T00:00:00Z
 *
 * @futurePlan PLAN-002
 * @planTitle Integrate Great Expectations for data quality
 * @planDescription Add automatic data quality validation using
 * Great Expectations framework. Check: null percentage, outlier detection,
 * schema compliance, duplicate detection.
 * @planPriority medium
 * @planStatus planned
 * @planMilestone v2.1
 * @planEffort 3 weeks
 * @planCreatedAt 2024-02-20T00:00:00Z
 *
 * @futurePlan PLAN-003
 * @planTitle Real-time progress dashboard
 * @planDescription Web UI to monitor processing progress of multiple files.
 * @planPriority medium
 * @planStatus completed
 * @planMilestone v1.5
 * @planCreatedAt 2024-01-01T00:00:00Z
 * @planCompletedAt 2024-02-10T00:00:00Z
 */
```

---

## 커스텀 태그 전체 목록

### Category 1: Problem Solving
- `@problemContext` - 문제 발생 배경
- `@problemSolution` - 해결 방법
- `@targetUseCase` - 주요 사용 사례
- `@relatedProblem` - 관련 문제 ID

### Category 2: Functionality
- `@mainFeature` - 주요 기능 (여러 개 가능)
- `@component` - 컴포넌트명과 설명
- `@componentSignature` - 컴포넌트 시그니처
- `@input` - 입력 파라미터
- `@inputType` - 입력 타입
- `@output` - 출력
- `@outputType` - 출력 타입
- `@example` - 코드 예제

### Category 3: Error Experiences
- `@error` - 에러 ID
- `@errorType` - 에러 타입
- `@errorMessage` - 에러 메시지
- `@errorContext` - 발생 상황
- `@errorSolution` - 해결책
- `@errorPrevention` - 예방법
- `@errorOccurredAt` - 발생 일시

### Category 4: Design Decisions
- `@decision` - ADR ID
- `@decisionTitle` - 결정 제목
- `@decisionMade` - 결정 내용
- `@decisionRationale` - 근거
- `@decisionAlternative` - 고려한 대안
- `@decisionConsequence` - 결과/영향
- `@decisionDate` - 결정 날짜
- `@decisionStatus` - 상태
- `@decisionSupersededBy` - 대체된 경우

### Category 5: Dependencies
- `@dependsOn` - 의존 대상
- `@dependencyType` - 의존 타입
- `@dependencyReason` - 필요 이유
- `@dependencyVersion` - 버전 제약
- `@dependencyImportPath` - 임포트 경로
- `@dependencyRequired` - 필수 여부
- `@dependencyFallback` - 대체 방안

### Category 6: Future Plans
- `@futurePlan` - 계획 ID
- `@planTitle` - 계획 제목
- `@planDescription` - 상세 설명
- `@planPriority` - 우선순위
- `@planStatus` - 진행 상태
- `@planMilestone` - 마일스톤
- `@planEffort` - 예상 공수
- `@planBlockedBy` - 블로커
- `@planRelatedIssue` - 관련 이슈
- `@planCreatedAt` - 생성 일시
- `@planCompletedAt` - 완료 일시

### Metadata & Traceability (기존 표준 + 커스텀)
- `@id` - 심볼 고유 ID
- `@public` / `@internal` / `@private` - 접근 제어
- `@responsibility` - 책임 범위
- `@shouldDo` - 해야 할 일 (여러 개)
- `@shouldNotDo` - 하지 말아야 할 일 (여러 개)
- `@pattern` - 디자인 패턴
- `@architecture` - 아키텍처 레이어
- `@contract` - 계약 개요
- `@precondition` - 사전 조건
- `@postcondition` - 사후 조건
- `@invariant` - 불변 조건
- `@testedBy` - 테스트 파일
- `@testScenario` - 테스트 시나리오 (여러 개)
- `@coverage` - 코드 커버리지
- `@relatedTo` - 관련 심볼
- `@usedBy` - 사용처
- `@implements` - 구현 인터페이스
- `@extends` - 상속 클래스
- `@see` - 참고 링크

---

## 실전 예제

완전한 예제는 `examples/complete-tsdoc-sample.ts`를 참고하세요.

### 최소 예제 (Public API)

```typescript
/**
 * Calculate user account balance
 *
 * @problemContext Need fast balance calculation for 1M+ users
 * @problemSolution Use cached aggregation with Redis
 *
 * @mainFeature Real-time balance calculation from transactions
 * @mainFeature Automatic cache invalidation on updates
 *
 * @error ERR-101
 * @errorType CacheError
 * @errorMessage "Redis connection timeout"
 * @errorSolution Added connection retry with exponential backoff
 *
 * @decision ADR-010
 * @decisionTitle Use Redis for balance cache
 * @decisionMade Cache balance in Redis with 5-minute TTL
 * @decisionRationale 100x faster than database query
 * @decisionDate 2024-01-15
 * @decisionStatus accepted
 *
 * @dependsOn redis
 * @dependencyType external
 * @dependencyReason Fast in-memory caching
 * @dependencyRequired true
 *
 * @futurePlan PLAN-050
 * @planTitle Add balance history tracking
 * @planDescription Track balance changes over time
 * @planPriority medium
 * @planStatus planned
 * @planCreatedAt 2024-02-01T00:00:00Z
 *
 * @param userId - User identifier
 * @returns Current account balance
 * @throws UserNotFoundError if user doesn't exist
 *
 * @public
 * @contract Calculate accurate balance from all transactions
 * @precondition userId must be valid
 * @postcondition Returns accurate balance or throws error
 */
export function calculateBalance(userId: string): number {
  // Implementation
}
```

---

## 장단점 분석

### ✅ 장점

1. **Single Source of Truth**
   - 모든 정보가 코드와 함께 위치
   - 코드 변경 시 문서도 함께 업데이트 가능

2. **IDE 통합**
   - 코드 편집기에서 바로 볼 수 있음
   - IntelliSense/자동완성 지원

3. **버전 관리**
   - Git으로 코드와 문서가 함께 버전 관리됨
   - 코드 리뷰에서 문서도 함께 검토

4. **강제성**
   - 파서가 누락된 정보를 자동 검출
   - CI/CD 파이프라인에서 검증 가능

### ❌ 단점

1. **가독성 저하**
   - TSDoc 주석이 300+ 줄로 매우 길어짐
   - 코드보다 문서가 더 긴 경우 발생

2. **유지보수 부담**
   - 작은 변경에도 여러 태그 업데이트 필요
   - 복사-붙여넣기 실수 가능성

3. **파싱 복잡도**
   - 커스텀 태그 파서 구현 필요
   - 중첩 구조 표현 어려움 (alternatives, consequences 등)

4. **도구 지원 부족**
   - 표준 TSDoc 도구들이 커스텀 태그 미지원
   - 별도 파서/validator 개발 필요

5. **중복 정보**
   - 같은 정보를 여러 곳에 작성 (예: component + @param)
   - 일관성 유지 어려움

---

## 대안적 접근법

### 접근법 1: TSDoc + YAML 하이브리드 (권장)

**기본 정보는 TSDoc**, **복잡한 구조는 YAML**

```typescript
/**
 * CSV data processor with memory-efficient streaming
 *
 * @see CSVDataProcessor.meta.yaml for detailed specifications
 *
 * @public
 * @responsibility Handle CSV data processing with streaming
 * @contract Process CSV data with configurable strategies
 * @param filePath - Path to CSV file
 * @returns Async generator of data chunks
 */
export class CSVDataProcessor {
  // Implementation
}
```

`CSVDataProcessor.meta.yaml`:
```yaml
id: data-processor-001
version: 1.0.0

problemSolving:
  description: Process large CSV files (100MB-5GB) memory-efficiently
  context: |
    Out-of-memory errors when loading 3GB+ files with pandas.
    Server has 8GB RAM but fails on files >3GB.
  targetUseCase: ETL pipeline for customer data
  relatedProblem: memory-optimization-project

functionality:
  mainFeatures:
    - Stream-based CSV reading with configurable chunk size
    - NaN value handling with drop/fill/interpolate strategies
    - Special character filtering using regex patterns

  components:
    - name: loadData
      description: Load CSV as async stream
      signature: "(filePath: string, options?: LoadOptions) => AsyncGenerator"

    - name: cleanText
      description: Remove special characters
      signature: "(text: string, options?: CleanOptions) => string"

errorExperiences:
  - id: ERR-001
    errorType: MemoryError
    message: "Unable to allocate array with shape (10000000, 50)"
    context: Loading 3GB CSV on 8GB RAM server
    solution: Implemented chunk-based streaming with chunksize=10000
    occurredAt: "2024-01-15T03:45:00Z"

decisions:
  - id: ADR-001
    title: Use concurrent.futures instead of multiprocessing
    decision: Implement thread-based parallelism with ThreadPoolExecutor
    rationale: CSV reading is I/O bound, threads perform better
    alternatives:
      - option: multiprocessing.Pool
        reason: High overhead for I/O tasks
      - option: asyncio
        reason: Requires complete rewrite
    consequences:
      positive:
        - 3x performance improvement on 4-core machine
      negative:
        - Not optimal for CPU-intensive transformations
    date: "2024-01-10"
    status: accepted

dependencies:
  - target: pandas
    type: external
    reason: DataFrame operations, CSV parsing
    version: ">=2.0.0"
    required: true

  - target: chardet
    type: external
    reason: Automatic encoding detection
    version: ">=5.0.0"
    required: false
    fallback: Use UTF-8 as default

futurePlans:
  - id: PLAN-001
    title: Add S3 direct streaming support
    description: Enable direct streaming from AWS S3 buckets
    priority: high
    status: in-progress
    milestone: v2.0
    effort: 2 weeks
    createdAt: "2024-02-15T00:00:00Z"
```

**장점**:
- TSDoc은 간결하게 유지
- 복잡한 구조는 YAML로 명확히 표현
- YAML은 Git diff가 깔끔
- 편집기/도구 지원 좋음

**단점**:
- 파일 2개 관리 필요
- 동기화 문제 가능성

---

### 접근법 2: TSDoc 기본 + 데이터베이스

**TSDoc에는 최소 정보만**, **상세 정보는 DB에**

```typescript
/**
 * CSV data processor with memory-efficient streaming
 *
 * @id data-processor-001
 * @public
 * @responsibility Handle CSV data processing
 * @contract Process CSV data with configurable strategies
 * @param filePath - Path to CSV file
 * @returns Async generator of data chunks
 */
export class CSVDataProcessor {
  // Implementation
}
```

데이터베이스에 상세 정보 저장:
- enhanced_docs 테이블에 6개 카테고리 JSON
- SQLite + JSONL export for Git
- Web UI에서 편집 가능

**장점**:
- TSDoc 주석 매우 간결
- 구조화된 데이터 쉽게 쿼리
- Web UI로 편집/검색 가능
- 버전 관리는 JSONL export로

**단점**:
- 코드와 문서 분리
- 초기 데이터 입력 필요
- 도구 의존성

---

### 접근법 3: 점진적 적용

**단계별로 문서화 수준 증가**

**Level 1 (최소)**: 기본 TSDoc만
```typescript
/**
 * Process CSV files
 * @param filePath - File path
 * @returns Data stream
 * @public
 */
```

**Level 2 (표준)**: 계약 추가
```typescript
/**
 * Process CSV files with streaming
 * @param filePath - File path
 * @returns Data stream
 * @public
 * @contract Process CSV with memory efficiency
 * @precondition File must exist
 * @postcondition Memory usage < 2GB
 */
```

**Level 3 (완전)**: 6개 카테고리 전부
```typescript
// examples/complete-tsdoc-sample.ts 참고
```

**적용 가이드**:
- Public API: Level 3 (완전 문서화)
- Internal API: Level 2 (계약 중심)
- Private: Level 1 (최소)

---

## 권장 사항

### 프로젝트 규모별

**소규모 (< 100 파일)**:
- TSDoc only 접근법
- 모든 정보를 TSDoc에 포함

**중규모 (100-500 파일)**:
- **TSDoc + YAML 하이브리드 (권장)**
- Public API는 YAML로 상세 관리
- Internal은 TSDoc만

**대규모 (500+ 파일)**:
- TSDoc + 데이터베이스
- Web UI로 문서 관리
- CI/CD 자동 검증

### 팀 규모별

**1-3명 (소규모)**:
- 자유 형식, 필수 항목만
- 점진적 적용

**4-10명 (중규모)**:
- TSDoc + YAML 하이브리드
- Code review에서 문서 검증

**10명+ (대규모)**:
- 완전 자동화
- CI/CD에서 Strict Mode 검증 강제
- Documentation Dashboard

---

## 다음 단계

1. **파서 구현**: 커스텀 태그 파싱 로직 추가
2. **Validator 업데이트**: 새로운 태그 검증
3. **CLI 확장**: `tsdoc-edge validate` 명령어
4. **VSCode Extension**: 실시간 검증 및 자동완성
5. **Documentation Website**: 자동 생성 문서 사이트

---

## 참고 자료

- [TSDoc 공식 문서](https://tsdoc.org/)
- [ADR (Architecture Decision Records)](https://adr.github.io/)
- `examples/complete-tsdoc-sample.ts` - 완전한 예제
- `examples/strict-mode-example.ts` - 실전 예제
- `demo/poc-demo.ts` - 데모 코드
