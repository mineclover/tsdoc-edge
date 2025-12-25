# [[Validator System]]

> 문서 품질, 연결성, 규칙 준수를 검증하는 다층 검증 시스템

---

## 개요

Validator System은 코드와 문서의 품질을 다양한 관점에서 검증합니다. 연결성 검증, 컨벤션 검증, 엄격 모드 검증, 모듈 명세 검증을 통해 SSOT 원칙 준수를 강제합니다.

**핵심 가치**: 문서화되지 않은 심볼 탐지, 테스트 커버리지 확인, 순환 의존성 경고

---

## Module Specification

### Purpose
코드-문서 일치성 검증 및 품질 기준 강제

### Input
- `SymbolGraph`: 심볼 및 관계 그래프
- `Symbol[]`: 검증 대상 심볼 목록
- 검증 설정 (strictMode, checks)

### Output
- `ConnectivityAnalysis`: 연결성 분석 결과
- `DetailedValidationReport`: 상세 검증 리포트
- `ValidationIssue[]`: 발견된 이슈 목록

### Context
- [[Symbol Graph System]]에서 그래프 데이터 조회
- [[Parser System]]에서 파싱된 문서 검증
- 설정 파일(`.tsdoc.config.json`)에서 규칙 로드

### Logic
```
1. 심볼 순회 → 문서화 상태 확인
2. 관계 순회 → 연결 유효성 확인
3. 규칙 적용 → 위반 사항 수집
4. 점수 계산 → 가중치 기반 품질 점수
5. 리포트 생성 → 심각도별/파일별/유형별 분류
```

### Effect
- 검증 결과 로깅
- 위반 사항 리포팅

### Scope
- `ConnectivityValidator`: SSOT 연결성 검증
- `ConventionValidator`: 코딩 규칙 검증
- `StrictModeValidator`: 엄격 모드 규칙
- `ModuleSpecValidator`: 모듈 명세 완성도
- `GeneratedDocsValidator`: 생성 문서 검증

---

## 핵심 컴포넌트

### ConnectivityValidator

SSOT 연결성을 분석하고 검증

```typescript
/**
 * @doc [[Validator System]]
 * @functionality 연결성 분석, 끊어진 링크 탐지, 품질 점수 계산
 * @depends SymbolSearchEngine
 * @depType runtime
 * @depReason 심볼 검색 및 필터링
 */
class ConnectivityValidator {
  analyze(): ConnectivityAnalysis
  generateDetailedReport(): DetailedValidationReport
  calculateConnectivityScore(...): number
  findBrokenLinks(): BrokenLink[]
}
```

**Source**: `src/validator/ConnectivityValidator.ts`

### ConventionValidator

네이밍 및 문서화 컨벤션 검증

```typescript
/**
 * @doc [[Validator System]]
 * @problem 일관되지 않은 코딩 스타일
 * @solves 자동화된 컨벤션 검사
 * @context 팀 코딩 표준 강제
 */
class ConventionValidator {
  validateFile(filePath: string): ValidationResult[]
  checkNamingConventions(): ValidationResult[]
  checkDocumentationQuality(): ValidationResult[]
}
```

**Source**: `src/validator/ConventionValidator.ts`

### StrictModeValidator

엄격 모드에서 추가 규칙 적용

```typescript
/**
 * @doc [[Validator System]]
 * @functionality 계약 준수, 책임 정의 확인
 */
class StrictModeValidator {
  validate(symbols: Symbol[]): ValidationIssue[]
  checkContractCompliance(): ValidationIssue[]
  checkResponsibilityDefined(): ValidationIssue[]
}
```

**Source**: `src/validator/StrictModeValidator.ts`

### ModuleSpecValidator

모듈 명세 완성도 검증

```typescript
/**
 * @doc [[Validator System]]
 * @depends ModuleSpecTagParser
 * @depType runtime
 * @depReason 명세 태그 파싱 결과 사용
 */
class ModuleSpecValidator {
  validate(spec: ModuleSpecTemplate): ModuleSpecValidationResult
  checkRequiredSections(): ValidationIssue[]
  calculateScore(): number
}
```

**Source**: `src/validator/ModuleSpecValidator.ts`

---

## 검증 규칙

### 연결성 검증

| 검증 항목 | 심각도 | 가중치 | 설명 |
|-----------|--------|--------|------|
| 문서 없음 | error | 20% | public 심볼에 TSDoc 없음 |
| 테스트 없음 | error | 25% | 테스트 커버리지 0% |
| 책임 없음 | warning | 15% | @responsibility 태그 없음 |
| 계약 없음 | warning | 10% | @contract 태그 없음 |
| 고립 심볼 | info | 5% | 참조/피참조 없음 |
| 끊어진 링크 | error | 15% | 존재하지 않는 심볼 참조 |
| 순환 의존성 | error | 10% | 순환 참조 감지 |

### 컨벤션 검증

| 규칙 | 설명 |
|------|------|
| kebab-case ID | 심볼 ID는 kebab-case |
| PascalCase 클래스 | 클래스명 PascalCase |
| camelCase 함수 | 함수명 camelCase |
| 요약 필수 | @summary 또는 첫 문장 |

### 엄격 모드 추가 규칙

| 규칙 | 설명 |
|------|------|
| 계약 필수 | 모든 public 함수에 @contract |
| 책임 필수 | 모든 클래스에 @responsibility |
| 테스트 시나리오 필수 | @testScenario 최소 1개 |

---

## 데이터 구조

### ConnectivityAnalysis

```typescript
interface ConnectivityAnalysis {
  /** 문서화되지 않은 심볼 */
  undocumented: Symbol[]

  /** 테스트되지 않은 심볼 */
  untested: Symbol[]

  /** 책임 정의 없는 심볼 */
  noResponsibility: Symbol[]

  /** 계약 정의 없는 심볼 */
  noContract: Symbol[]

  /** 고립된 심볼 */
  orphaned: Symbol[]

  /** 끊어진 링크 */
  brokenLinks: BrokenLink[]

  /** 순환 의존성 */
  circularDependencies: string[][]

  /** 연결성 점수 (0-100) */
  connectivityScore: number
}
```

### DetailedValidationReport

```typescript
interface DetailedValidationReport {
  totalSymbols: number
  totalIssues: number

  /** 심각도별 이슈 수 */
  issuesBySeverity: {
    error: number
    warning: number
    info: number
  }

  /** 파일별 이슈 맵 */
  issuesByFile: Map<string, {
    errors: number
    warnings: number
    issues: DetailedValidationIssue[]
  }>

  /** 유형별 이슈 맵 */
  issuesByType: Map<string, DetailedValidationIssue[]>

  /** 전체 이슈 목록 */
  allIssues: DetailedValidationIssue[]

  /** 완성도 퍼센트 */
  completionPercentage: number
}
```

### DetailedValidationIssue

```typescript
interface DetailedValidationIssue {
  symbolId: string
  issueType:
    | 'missing-documentation'
    | 'missing-tests'
    | 'missing-responsibility'
    | 'missing-contract'
    | 'broken-link'
    | 'circular-dependency'
  severity: 'error' | 'warning' | 'info'
  message: string
  suggestedFix?: string
}
```

---

## 점수 계산

### 연결성 점수 공식

```typescript
const score = 100 - (
  (undocumented.length / total) * 20 +  // 문서 가중치 20%
  (untested.length / total) * 25 +       // 테스트 가중치 25%
  (noResponsibility.length / total) * 15 + // 책임 가중치 15%
  (noContract.length / total) * 10 +     // 계약 가중치 10%
  (orphaned.length / total) * 5 +        // 고립 가중치 5%
  (brokenLinks.length / total) * 15 +    // 링크 가중치 15%
  (circularDeps.length > 0 ? 10 : 0)     // 순환 가중치 10%
);
```

### 등급 기준

| 점수 | 등급 | 상태 |
|------|------|------|
| 90-100 | A | 우수 |
| 80-89 | B | 양호 |
| 70-79 | C | 보통 |
| 60-69 | D | 개선 필요 |
| 0-59 | F | 심각 |

---

## 사용 시나리오

### 시나리오 1: 연결성 분석

```typescript
import { ConnectivityValidator } from './validator/ConnectivityValidator';

const validator = new ConnectivityValidator(graph, searchEngine);
const analysis = validator.analyze();

console.log(`연결성 점수: ${analysis.connectivityScore}/100`);
console.log(`문서 없음: ${analysis.undocumented.length}개`);
console.log(`테스트 없음: ${analysis.untested.length}개`);
```

### 시나리오 2: 상세 리포트 생성

```typescript
const report = validator.generateDetailedReport();

console.log(`총 이슈: ${report.totalIssues}개`);
console.log(`- 에러: ${report.issuesBySeverity.error}개`);
console.log(`- 경고: ${report.issuesBySeverity.warning}개`);
console.log(`완성도: ${report.completionPercentage}%`);
```

### 시나리오 3: 엄격 모드 검증

```typescript
import { StrictModeValidator } from './validator/StrictModeValidator';

const strictValidator = new StrictModeValidator();
const issues = strictValidator.validate(symbols);

issues.forEach(issue => {
  console.log(`[${issue.severity}] ${issue.symbolId}: ${issue.message}`);
});
```

---

## 관련 시스템

- [[Symbol Graph System]] - 검증 대상 그래프
- [[Parser System]] - 파싱된 문서 데이터
- [[Analyzer System]] - 분석 결과 검증
- [[Spec Management System]] - 명세 완성도 연동

---

## CLI 명령어

| 명령어 | 설명 |
|--------|------|
| `tsdoc-edge health` | 코드베이스 건강도 검사 |
| `tsdoc-edge validate-docs` | 문서 유효성 검증 |
| `tsdoc-edge validate-links` | 링크 유효성 검증 |
| `tsdoc-edge untested` | 테스트 없는 심볼 |
| `tsdoc-edge without-responsibility` | 책임 없는 심볼 |
| `tsdoc-edge without-contract` | 계약 없는 심볼 |

---

## Backlinks

### Referenced By

- [[Analyzer System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/analyzer-system.md:235
- [[Parser System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/parser-system.md:180
- [[Spec Management System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/spec-management-system.md:187
- [[Symbol Graph System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/symbol-graph.md:121

