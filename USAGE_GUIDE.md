# TSDoc Edge 사용 가이드

## 개요

TSDoc Edge는 **연결성 기반의 SSOT(Single Source of Truth) 문서 시스템**입니다. 코드와 문서가 완벽하게 일치하도록 강제하며, 심볼 간의 관계를 추적하고 검증합니다.

## 핵심 개념

### 1. 심볼(Symbol)
코드베이스의 모든 함수, 클래스, 인터페이스 등을 의미합니다.

### 2. 연결성(Connectivity)
심볼들이 서로 어떻게 관련되어 있는지를 나타냅니다:
- **의존성(dependsOn)**: A가 B를 사용함
- **사용자(usedBy)**: A가 B에 의해 사용됨
- **구현(implements)**: A가 B를 구현함
- **관련(relatedTo)**: A와 B가 관련됨

### 3. 계약(Contract)
함수나 메서드가 지켜야 할 규칙:
- **전제조건(Precondition)**: 실행 전에 참이어야 함
- **후행조건(Postcondition)**: 실행 후에 참이어야 함
- **불변조건(Invariant)**: 항상 참이어야 함

### 4. 책임(Responsibility)
심볼이 무엇을 해야 하고 무엇을 하지 말아야 하는지 명확히 정의

## 커스텀 TSDoc 태그

### 관계 태그
```typescript
/**
 * @relatedTo SymbolName - 관련된 심볼
 * @dependsOn SymbolName - 의존하는 심볼
 * @usedBy SymbolName - 이 심볼을 사용하는 심볼
 * @implements InterfaceName - 구현하는 인터페이스
 * @extends ClassName - 확장하는 클래스
 */
```

### 계약 태그
```typescript
/**
 * @contract 계약 설명
 * @precondition 전제조건
 * @postcondition 후행조건
 * @invariant 불변조건
 */
```

### 테스트 태그
```typescript
/**
 * @testedBy test-file.ts - 테스트 파일 경로
 * @testScenario 시나리오 설명
 * @coverage 커버리지 정보
 */
```

### 설계 태그
```typescript
/**
 * @responsibility 책임 설명
 * @designDecision ADR-001 - 설계 결정 참조
 * @architecture 아키텍처 레이어
 * @pattern 디자인 패턴명
 */
```

## 사용 예제

### 1. 기본 사용법

```typescript
import { SymbolGraphBuilder, SymbolSearchEngine, ConnectivityValidator } from 'tsdoc-edge';
import { Symbol } from 'tsdoc-edge';

// 1. 그래프 빌더 생성
const builder = new SymbolGraphBuilder();

// 2. 심볼 추가
const symbol: Symbol = {
  id: 'user-service',
  name: 'UserService',
  type: 'class',
  filePath: '/src/services/user.ts',
  line: 10,
  column: 0,
  isExported: true,
  isPublic: true,
  summary: 'User management service',
  tests: [],
  designDecisions: []
};

builder.addSymbol(symbol);

// 3. 관계 추가
builder.addRelationship({
  type: 'dependsOn',
  from: 'user-service',
  to: 'user-repository',
  filePath: '/src/services/user.ts'
});

// 4. 검색
const searchEngine = new SymbolSearchEngine(builder);
const results = searchEngine.search({
  name: 'User',
  type: 'class',
  isPublic: true
});

console.log(`Found ${results.totalCount} symbols`);

// 5. 연결성 검증
const validator = new ConnectivityValidator(builder);
const analysis = validator.analyze();

console.log(`Connectivity Score: ${analysis.connectivityScore}/100`);
console.log(`Undocumented: ${analysis.undocumented.length}`);
console.log(`Untested: ${analysis.untested.length}`);

// 6. 리포트 생성
const report = validator.generateReport();
console.log(report);
```

### 2. 심볼 검색

```typescript
const searchEngine = new SymbolSearchEngine(builder);

// 이름으로 검색
const byName = searchEngine.search({ name: 'User.*' });

// 타입으로 검색
const functions = searchEngine.search({ type: 'function' });

// 테스트 여부로 검색
const untested = searchEngine.search({ hasTesting: false });

// 계약 여부로 검색
const withContract = searchEngine.search({ hasContract: true });

// 관계로 검색
const dependsOnUser = searchEngine.search({ dependsOn: 'User' });

// 복합 조건
const publicFunctionsWithTests = searchEngine.search({
  type: 'function',
  isPublic: true,
  hasTesting: true
});
```

### 3. 특수 검색

```typescript
// 문서화되지 않은 심볼 찾기
const undocumented = searchEngine.findUndocumented();

// 테스트되지 않은 심볼 찾기
const untested = searchEngine.findUntested();

// 책임이 정의되지 않은 심볼 찾기
const noResponsibility = searchEngine.findWithoutResponsibility();

// 계약이 없는 심볼 찾기
const noContract = searchEngine.findWithoutContract();

// 고립된 심볼 찾기 (관계가 없는 심볼)
const orphaned = searchEngine.findOrphaned();
```

### 4. 순환 의존성 감지

```typescript
const cycles = builder.detectCircularDependencies();

if (cycles.length > 0) {
  console.log('Circular dependencies detected:');
  cycles.forEach(cycle => {
    console.log(cycle.join(' -> '));
  });
}
```

### 5. 연결성 분석

```typescript
const validator = new ConnectivityValidator(builder);
const analysis = validator.analyze();

// 전체 점수 (0-100)
console.log(`Score: ${analysis.connectivityScore}`);

// 문제 목록
console.log('Issues:');
console.log(`- Undocumented: ${analysis.undocumented.length}`);
console.log(`- Untested: ${analysis.untested.length}`);
console.log(`- No Responsibility: ${analysis.noResponsibility.length}`);
console.log(`- No Contract: ${analysis.noContract.length}`);
console.log(`- Orphaned: ${analysis.orphaned.length}`);
console.log(`- Broken Links: ${analysis.brokenLinks.length}`);
console.log(`- Circular Dependencies: ${analysis.circularDependencies.length}`);
```

### 6. 개별 심볼 검증

```typescript
const validator = new ConnectivityValidator(builder);
const symbol = builder.getSymbol('user-service');

if (symbol) {
  const validationResults = validator.validateSymbol(symbol);

  if (validationResults.length > 0) {
    console.log(`Issues with ${symbol.name}:`);
    validationResults.forEach(result => {
      console.log(`- [${result.severity}] ${result.message}`);
    });
  }
}
```

## 완벽한 SSOT 달성하기

### 100점 달성 체크리스트

모든 public 심볼은:
- ✅ 문서화되어야 함 (summary 존재)
- ✅ 테스트가 있어야 함 (tests 배열에 항목 존재)
- ✅ 책임이 정의되어야 함 (responsibility 존재)
- ✅ 계약이 명시되어야 함 (contract 존재, 함수/메서드의 경우)
- ✅ 관계가 명확해야 함 (고립되지 않음)
- ✅ 깨진 링크가 없어야 함 (모든 참조가 유효)
- ✅ 순환 의존성이 없어야 함

### 예시: 완벽한 문서화

```typescript
/**
 * Calculate the sum of two numbers
 *
 * @param a - First number
 * @param b - Second number
 * @returns Sum of a and b
 *
 * @public
 * @responsibility Perform addition operation
 * @contract Add two numbers and return result
 * @precondition a and b must be finite numbers
 * @postcondition Result is sum of inputs
 * @invariant Result is always a number
 *
 * @testedBy calculator.test.ts
 * @testScenario Positive numbers
 * @testScenario Negative numbers
 * @testScenario Zero
 * @testScenario Large numbers
 *
 * @relatedTo Calculator class
 * @architecture Utility Layer
 * @pattern Pure Function
 */
export function add(a: number, b: number): number {
  return a + b;
}
```

## 통계 정보

```typescript
const stats = builder.getStatistics();

console.log('Graph Statistics:');
console.log(`Total Symbols: ${stats.totalSymbols}`);
console.log(`Total Relationships: ${stats.totalRelationships}`);
console.log(`Avg Dependencies: ${stats.avgDependencies.toFixed(2)}`);
console.log(`Max Dependencies: ${stats.maxDependencies}`);
console.log(`Orphaned Symbols: ${stats.orphanedSymbols}`);
```

## Best Practices

### 1. 항상 계약 명시
함수와 메서드는 precondition, postcondition, invariant를 명시하세요.

### 2. 테스트 시나리오 나열
각 함수가 어떤 시나리오에서 테스트되는지 명시하세요.

### 3. 책임 명확히
각 클래스와 모듈의 책임을 "Should Do"와 "Should Not Do"로 명시하세요.

### 4. 관계 추적
심볼 간의 의존성을 명확히 문서화하세요.

### 5. 정기적 검증
CI/CD 파이프라인에 연결성 검증을 추가하세요.

```bash
# 연결성 점수가 80점 미만이면 빌드 실패
npm run connectivity-check
```

## 검증 규칙

### Error 수준
- `require-documentation`: 문서 누락
- `require-tests`: 테스트 누락 (public API)
- `require-param-docs`: 파라미터 문서 누락
- `require-returns`: 반환값 문서 누락

### Warning 수준
- `require-responsibility`: 책임 정의 누락
- `require-contract`: 계약 명세 누락

### Info 수준
- `no-orphaned-symbols`: 고립된 심볼

## 다음 단계

1. 실제 TypeScript 코드 파싱 (TSDoc Parser 통합)
2. 자동 관계 추출 (AST 분석)
3. 테스트 커버리지 통합
4. CI/CD 통합
5. 시각화 도구 (의존성 그래프)
6. VSCode 확장 프로그램

## 예제 프로젝트 구조

```
examples/
  sample-code.ts      # 완벽하게 문서화된 예제 코드

tests/
  sample-code.test.ts # 예제 코드의 테스트
```

## 참고 자료

- [TSDoc 공식 문서](https://tsdoc.org/)
- [Design by Contract](https://en.wikipedia.org/wiki/Design_by_contract)
- [Single Source of Truth](https://en.wikipedia.org/wiki/Single_source_of_truth)
