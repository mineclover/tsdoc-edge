---
title: parser-system
type: system
category: core
status: active
canonical: true
---

# [[Parser System]]

> TypeScript 소스와 TSDoc 주석을 파싱하여 구조화된 메타데이터 추출

---

## 개요

Parser System은 TypeScript AST와 TSDoc 주석을 분석하여 심볼, 문서, 테스트 정보를 추출합니다. Microsoft TSDoc을 래핑하고 커스텀 태그를 확장하여 풍부한 메타데이터를 지원합니다.

**핵심 가치**: TSDoc 표준 호환 + 20개 이상 커스텀 태그 + 7-part 모듈 명세

---

## Module Specification

### Purpose
소스 코드와 주석에서 구조화된 심볼 정보 및 문서 메타데이터 추출

### Input
- TypeScript 소스 파일 (`.ts`, `.tsx`)
- TSDoc 주석 (JSDoc 스타일)
- 마크다운 문서 (Frontmatter)

### Output
- `ParsedDocComment`: 파싱된 TSDoc 주석
- `EnhancedSymbolDoc`: 6-카테고리 확장 문서
- `ModuleSpecTags`: 7-part 모듈 명세
- `TestExtractionResult`: 테스트 구조

### Context
- TypeScript Compiler API 사용
- Microsoft TSDoc 라이브러리 래핑
- [[Symbol Graph System]]에 데이터 제공

### Logic
```
1. TypeScript AST 파싱 → 심볼 노드 추출
2. JSDoc 주석 추출 → TSDoc 파서로 전달
3. 커스텀 태그 파싱 → 구조화된 객체로 변환
4. 유효성 검증 → 결과와 함께 반환
```

### Effect
- 파일 시스템 읽기 (소스 파일)
- 메모리 내 AST 생성

### Scope
- `TSDocParser`: 핵심 TSDoc 파싱
- `EnhancedDocExtractor`: 확장 문서 추출
- `ModuleSpecTagParser`: 모듈 명세 태그 파싱
- `TestSymbolParser`: 테스트 구조 추출
- `FrontmatterParser`: 마크다운 메타데이터

---

## 핵심 컴포넌트

### [[TSDocParser]]

Microsoft TSDoc을 래핑한 핵심 파서

```typescript
/**
 * @doc [[Parser System]]
 * @functionality TSDoc 주석 파싱, 커스텀 태그 등록
 * @decision TSDoc 래핑 선택
 * @rationale 포크 대신 래핑으로 업스트림 호환성 유지
 */
class TSDocParser {
  parseFile(filePath: string): ParseResult
  parseComment(comment: string): ParsedDocComment
  extractCustomTags(jsDocText: string): EnhancedSymbolDoc
}
```

**Source**: `src/parser/TSDocParser.ts`

### EnhancedDocExtractor

6-카테고리 확장 문서 추출

```typescript
/**
 * @doc [[Parser System]]
 * @depends TSDocParser
 * @depType runtime
 * @depReason TSDoc 파싱 결과 활용
 */
class EnhancedDocExtractor {
  extractFromFile(filePath: string, sourceCode: string): ExtractedEnhancedDoc[]
  calculateCompleteness(doc: EnhancedSymbolDoc): number
}
```

**Source**: `src/parser/EnhancedDocExtractor.ts`

### ModuleSpecTagParser

7-part 모듈 명세 태그 파싱

```typescript
/**
 * @doc [[Parser System]]
 * @problem 복잡한 모듈 명세를 주석으로 표현
 * @solves @algorithm, @complexity, @sideEffect 등 전용 태그
 * @context 함수/클래스의 완전한 동작 명세 필요
 */
class ModuleSpecTagParser {
  parseModuleSpecTags(context: ParserContext, jsDocText: string): ModuleSpecTags
  parseSideEffect(text: string): SideEffectDoc
  parseComplexity(text: string): ComplexityDoc
}
```

**Source**: `src/parser/ModuleSpecTagParser.ts`

### TestSymbolParser

테스트 파일 구조 추출

```typescript
/**
 * @doc [[Parser System]]
 * @functionality 테스트 스위트, 케이스, 시나리오 추출
 */
class TestSymbolParser {
  extract(filePath: string, sourceCode: string): TestExtractionResult
  extractTestSuites(): TestSuite[]
  extractTestCases(): TestCase[]
  extractScenarios(): TestScenario[]
}
```

**Source**: `src/parser/TestSymbolParser.ts`

---

## 지원 커스텀 태그

### 기본 태그

| 태그 | 설명 | 예시 |
|------|------|------|
| `@id` | 심볼 고유 식별자 | `@id user-service` |
| `@doc` | 문서 참조 | `@doc [[User Guide]]` |
| `@contract` | 계약 명세 | `@contract pre: x > 0` |
| `@responsibility` | 설계 책임 | `@responsibility 사용자 인증` |
| `@testScenario` | 테스트 시나리오 | `@testScenario 로그인 성공` |

### 확장 문서 태그 (6-카테고리)

| 태그 | 카테고리 | 설명 |
|------|----------|------|
| `@problem` | problemSolving | 해결하는 문제 |
| `@solves` | problemSolving | 해결 방식 |
| `@context` | problemSolving | 사용 맥락 |
| `@functionality` | functionality | 주요 기능 |
| `@error` | errorExperiences | 오류 경험 |
| `@decision` | decisions | 설계 결정 |
| `@rationale` | decisions | 결정 근거 |
| `@consequences` | decisions | 결정 결과 |
| `@depends` | dependencies | 의존성 |
| `@depType` | dependencies | 의존성 유형 |
| `@depReason` | dependencies | 의존 이유 |
| `@future` | futurePlans | 향후 계획 |

### 모듈 명세 태그 (7-part)

| 태그 | Part | 설명 |
|------|------|------|
| `@purpose` | Purpose | 존재 이유 |
| `@input` | Input | 입력 매개변수 |
| `@output` | Output | 반환값/출력 |
| `@algorithm` | Logic | 알고리즘 |
| `@complexity` | Logic | 시간/공간 복잡도 |
| `@sideEffect` | Effect | 부수 효과 |
| `@mutates` | Effect | 변경 대상 |
| `@io` | Effect | I/O 작업 |
| `@scope` | Scope | 공개 범위 |

---

## 데이터 구조

### ParsedDocComment

```typescript
interface ParsedDocComment {
  docComment: DocComment     // TSDoc DocComment 객체
  filePath: string           // 소스 파일 경로
  symbolName: string         // 심볼 이름
  validationResults: ValidationResult[]  // 검증 결과
  isValid: boolean           // 유효성 여부
}
```

### EnhancedSymbolDoc (6-카테고리)

```typescript
interface EnhancedSymbolDoc {
  /** 문제 해결 */
  problemSolving: {
    description: string
    context: string
    targetUseCase?: string
    relatedProblem?: string
  }

  /** 기능성 */
  functionality: {
    mainFeatures: string[]
    components: Array<{ name: string; description: string }>
    io?: { inputs: string[]; outputs: string[] }
    examples?: string[]
  }

  /** 오류 경험 */
  errorExperiences: Array<{
    id: string
    errorType: string
    message: string
    context: string
    solution: string
  }>

  /** 설계 결정 */
  decisions: Array<{
    id: string
    title: string
    decision: string
    rationale: string
    alternatives: string[]
    consequences: string[]
  }>

  /** 의존성 */
  dependencies: Array<{
    symbolId: string
    reason: string
    type?: 'runtime' | 'type-only' | 'dev'
  }>

  /** 향후 계획 */
  futurePlans: Array<{
    id: string
    description: string
    priority: 'low' | 'medium' | 'high'
  }>
}
```

### ModuleSpecTags (7-part)

```typescript
interface ModuleSpecTags {
  purpose?: string
  inputs?: Array<{ name: string; type: string; constraint?: string }>
  outputs?: Array<{ name: string; type: string }>
  context?: string
  logic?: string
  algorithm?: AlgorithmDoc
  complexity?: ComplexityDoc
  sideEffects?: SideEffectDoc[]
  mutations?: MutationDoc[]
  io?: IODoc[]
  scope?: ScopeDoc
}
```

---

## 설계 의사결정

### ADR-003: TSDoc Wrapping Strategy]]

```
@decision Microsoft TSDoc 래핑 (포크 대신)
@rationale
  - 업스트림 호환성 유지
  - 버그 픽스 자동 적용
  - 커스텀 태그만 확장
@consequences
  - TSDoc 내부 API 의존
  - 버전 업그레이드 시 테스트 필요
```

### ADR-004: Custom Tags over NLP]]

```
@decision 자연어 처리 대신 구조화된 커스텀 태그
@rationale
  - 명확한 의도 표현
  - 파싱 정확도 100%
  - IDE 자동완성 지원
@consequences
  - 태그 학습 필요
  - 초기 작성 비용 증가
```

---

## 사용 시나리오

### 시나리오 1: 파일 파싱

```typescript
import { TSDocParser } from './parser/TSDocParser';

const parser = new TSDocParser();
const result = parser.parseFile('src/services/UserService.ts');

console.log(`${result.symbols.length}개 심볼 추출`);
console.log(`유효성: ${result.isValid ? '통과' : '실패'}`);
```

### 시나리오 2: 확장 문서 추출

```typescript
import { EnhancedDocExtractor } from './parser/EnhancedDocExtractor';

const extractor = new EnhancedDocExtractor();
const docs = extractor.extractFromFile(filePath, sourceCode);

docs.forEach(doc => {
  const completeness = extractor.calculateCompleteness(doc.enhanced);
  console.log(`${doc.symbolName}: ${completeness}% 완성도`);
});
```

### 시나리오 3: 테스트 구조 추출

```typescript
import { TestSymbolParser } from './parser/TestSymbolParser';

const testParser = new TestSymbolParser();
const result = testParser.extract('src/__tests__/UserService.test.ts', sourceCode);

console.log(`${result.suites.length}개 테스트 스위트`);
console.log(`${result.cases.length}개 테스트 케이스`);
```

---

## 관련 시스템

- [[Symbol Graph System]] - 추출된 심볼 저장
- [[Validator System]] - 파싱 결과 검증
- [[Storage System]] - 문서 메타데이터 저장
- [[Analyzer System]] - 관계 분석에 파싱 결과 활용

---

## CLI 명령어

| 명령어 | 설명 |
|--------|------|
| `tsdoc-edge build <src>` | 소스 디렉토리 파싱 및 심볼 추출 |
| `tsdoc-edge parse <file>` | 단일 파일 파싱 |
| `tsdoc-edge validate-docs` | 문서 검증 |

---

## Backlinks

### Referenced By

- [[Analyzer System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/analyzer-system.md:233
- [[Spec Management System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/spec-management-system.md:186
- [[Storage System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/storage-system.md:149
- [[Symbol Graph System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/symbol-graph.md:30
- [[Symbol Graph System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/symbol-graph.md:118
- [[Validator System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/validator-system.md:32
- [[Validator System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/validator-system.md:173

