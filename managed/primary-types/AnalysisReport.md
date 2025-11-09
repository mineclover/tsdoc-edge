# [[AnalysisReport]]

**Primary Type**: Code Analysis Result

## 1. Purpose (목적)

코드베이스 전체의 품질 분석 결과를 통합한 최종 리포트 타입입니다. 헬스 메트릭, 문서 점수, 테스트 커버리지, 개선 제안을 하나의 구조로 제공합니다.

### Problem (해결하는 문제)
- 코드 품질을 파편적으로만 파악
- 문서/테스트/아키텍처 이슈가 분산
- 개선 우선순위 판단 어려움

### Solution (해결 방법)
- 모든 품질 메트릭을 하나의 리포트로 통합
- 자동 개선 제안 생성
- 우선순위 기반 이슈 정렬

## 2. Structure (구조)

### Type Definition

```typescript
interface AnalysisReport {
  metrics: CodeHealthMetrics;           // 전체 건강도 메트릭
  docScores: DocQualityScore[];         // 파일별 문서 품질 점수
  testCoverage: TestCoverageInfo[];     // 테스트 커버리지 정보
  suggestions: ImprovementSuggestion[]; // 개선 제안 목록
  topIssues: DocQualityScore[];         // 상위 문제 파일들
}
```

### Composed Types

이 타입은 5개의 분석 결과 타입을 명시적으로 조합합니다:

1. **CodeHealthMetrics** - 전체 건강도 점수 (0-100), 문서화율, 테스트율
2. **DocQualityScore** - 파일별 문서 품질 점수 (계층적 구조 지원)
3. **TestCoverageInfo** - 심볼별 테스트 매핑 정보
4. **ImprovementSuggestion** - 자동 생성된 개선 제안
5. **DocQualityScore** (재사용) - 상위 문제 파일 식별용

## 3. Usage Scenarios (사용 시나리오)

### 1. 코드 건강도 체크
```bash
tsdoc-edge health src
# AnalysisReport 생성 및 출력
```

### 2. 분석 결과 프로그래밍 접근
```typescript
const checker = new CodeHealthChecker(db);
const report: AnalysisReport = checker.generateReport();

console.log(`Overall Score: ${report.metrics.overallScore}`);
console.log(`Documentation: ${report.metrics.documentationScore}%`);
console.log(`Top Issues: ${report.topIssues.length}`);
```

### 3. CI/CD 통합
```typescript
if (report.metrics.overallScore < 70) {
  throw new Error('Code health below threshold');
}
```

## 4. Design Decisions (설계 결정)

### Decision 1: Hierarchical DocQualityScore

**Rationale:**
- 파일 계층 구조 표현 필요 (디렉토리 → 파일 트리)
- 자기 참조 순환 구조로 Tree 표현

**Consequences:**
- ✅ 무한 깊이 계층 지원
- ⚠️ 순환 참조 (의도됨, TypeChainTracer가 감지)

### Decision 2: Separate topIssues Array

**Rationale:**
- docScores는 전체 파일 (수백 개)
- topIssues는 개선 필요 상위 N개만
- 사용자 집중도 향상

**Alternatives Considered:**
- 정렬만 하기: 전체 리스트 탐색 필요
- 필터 함수 제공: 매번 계산 비용

## 5. Related Concepts (관련 개념)

- [[AnalysisFeatures]] - 분석 기능 전체 설명
- [[HealthCommand]] - `tsdoc-edge health` 명령어 구현
- [[AnalyzeCommand]] - `tsdoc-edge analyze` 명령어 구현

## 6. Commands Using This Type

**[[HealthCommand]]** (`src/commands/HealthCommand.ts`)
- `AnalysisReport` 생성 및 출력
- 전체 건강도 점수 계산

**[[AnalyzeCommand]]** (`src/commands/AnalyzeCommand.ts`)
- 코드 품질 분석 수행
- `AnalysisReport` 기반 개선 제안

**[[SuggestCommand]]** (`src/commands/Phase4Commands.ts:21`)
- `suggestions` 필드 기반 우선순위 제안

## 7. Code References (코드 참조)

**Type Definition**: `src/types/AnalysisReport.ts`
**Primary Usage**: [[CodeHealthChecker]] (`src/analyzer/CodeHealthChecker.ts`)

[^AnalysisReport]
[^CodeHealthChecker]
[^CodeHealthMetrics]
[^DocQualityScore]
[^TestCoverageInfo]
[^ImprovementSuggestion]
