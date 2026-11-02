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

**핵심 가치**: `@microsoft/tsdoc` 공식 29개 표준 태그 + `tsdoc-edge` 22개 커스텀 태그 + 7-part 모듈 명세

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
import type { TSDocParser } from './TSDocParser';

/**
 * @doc [[Parser System]]
 * @context TSDocParser 파싱 결과 및 TypeScript AST를 기반으로 6-카테고리 확장 문서를 추출
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

## 지원 태그 체계 (29개 표준 + 22개 커스텀)

### `@microsoft/tsdoc` 공식 표준 태그 (29개)

| 구분 | 개수 | 태그 목록 |
|------|------|-----------|
| **Modifier 태그** | 11 | `@alpha`, `@beta`, `@eventProperty`, `@experimental`, `@internal`, `@override`, `@packageDocumentation`, `@public`, `@readonly`, `@sealed`, `@virtual` |
| **Inline 태그** | 3 | `{@inheritDoc}`, `{@label}`, `{@link}` |
| **Block 태그** | 15 | `@decorator`, `@defaultValue`, `@deprecated`, `@example`, `@jsx`, `@jsxFrag`, `@jsxImportSource`, `@jsxRuntime`, `@param`, `@privateRemarks`, `@remarks`, `@returns`, `@see`, `@throws`, `@typeParam` |

### `tsdoc-edge` 커스텀 블록 태그 (`tsdoc.json`, 22개)

| 카테고리 | 태그 | 복수 허용 | 설명 및 예시 |
|----------|------|-----------|--------------|
| **SSOT 체크포인트 라우팅 (1)** | `@doc` | Yes | 관리 문서 체크포인트 참조 (`@doc [[User Guide]]`) |
| **목적 및 계약 명세 (8)** | `@responsibility` | No | 핵심 설계 책임 (`@responsibility 사용자 인증 처리`) |
| | `@problem` | No | 해결하려는 문제 정의 |
| | `@solves` | No | 문제 해결 접근 방식 |
| | `@context` | No | 실행 환경 및 도메인 맥락 |
| | `@contract` | No | 계약 요약 명세 |
| | `@precondition` | Yes | 입력 및 사전 조건 (`@precondition token이 비어 있지 않아야 함`) |
| | `@postcondition` | Yes | 반환 및 사후 보장 조건 |
| | `@invariant` | Yes | 항상 유지되어야 하는 불변식 |
| **모듈 로직 및 부수 효과 (4)** | `@functionality` | No | 주요 기능 요약 |
| | `@algorithm` | No | 처리 알고리즘 및 단계 |
| | `@complexity` | No | 시간/공간 복잡도 (`@complexity O(n)`) |
| | `@sideEffect` | Yes | 부수 효과 및 I/O/상태 변경 (`@sideEffect database: 사용자 레코드 갱신 (write)`) |
| **인라인 ADR 3원소 (3)** | `@decision` | Yes | 설계 의사결정 |
| | `@rationale` | Yes | 의사결정 근거 |
| | `@consequences` | Yes | 의사결정 결과 및 트레이드오프 |
| **비-AST 의미 관계 및 거버넌스 (6)** | `@relatedTo` | Yes | 명시적 의미 관계 (`@relatedTo AuthGuard`) |
| | `@enhances` | Yes | 기존 기능 확장/개선 대상 |
| | `@requires` | Yes | 공동 요구사항 |
| | `@feature` | Yes | 기능 도메인 그룹 매핑 |
| | `@testScenario` | Yes | 검증 테스트 시나리오 (`@testScenario 로그인 성공`) |
| | `@deadcode` | No | 의도적 미사용/보존 코드 표시 |

### 7-Part 모듈 명세 매핑

| Aspect | 정본(SSOT) 소스 |
|--------|-----------------|
| **Purpose** | TSDoc 요약 문단(summary) + `@responsibility`, `@problem`, `@solves` |
| **Input** | TypeScript 매개변수 타입 + `@param`, `@typeParam`, `@defaultValue`, `@precondition` |
| **Output** | TypeScript 반환 타입 + `@returns`, `@throws`, `@postcondition` |
| **Context** | TypeScript `import` AST 및 `@ttsc/graph` 엣지(`calls`, `accesses`, `instantiates`, `type_ref`) + `@context` |
| **Logic** | `@algorithm`, `@complexity`, `@functionality`, `@remarks` |
| **Effect** | `@sideEffect` (`state`, `filesystem`, `database`, `network`, `process`) |
| **Scope** | `@public`, `@internal`, `@beta`, `@alpha`, `@packageDocumentation` + TS AST 접근 제한자 + `CanonicalNodeId` |

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

- [[Code Generation]] → managed/code-generation/index.md:46
- [[Analyzer System]] → managed/core/analyzer-system.md:442
- [[Document Symbol System]] → managed/core/doc-symbol-system.md:391
- [[Spec Management System]] → managed/core/spec-management-system.md:397
- [[Storage System]] → managed/core/storage-system.md:329
- [[Symbol Graph System]] → managed/core/symbol-graph.md:38
- [[Validator System]] → managed/core/validator-system.md:40
- [[Parser Components]] → managed/parser/index.md:117

### Implemented By

- Parser System → src/parser/TSDocParser.ts:1

