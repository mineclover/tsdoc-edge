# [[Symbol Graph System]]

> 코드 심볼과 관계를 그래프 구조로 관리하는 핵심 시스템

---

## 개요

Symbol Graph System은 TypeScript 코드베이스의 모든 심볼(함수, 클래스, 인터페이스 등)을 노드로, 심볼 간 관계를 엣지로 표현하는 그래프 구조를 구축하고 관리합니다.

**핵심 가치**: O(1) 심볼 조회, 양방향 의존성 추적, 순환 의존성 탐지

---

## Module Specification

### Purpose
코드베이스의 모든 심볼과 관계를 그래프로 모델링하여 빠른 조회와 분석 지원

### Input
- TypeScript 소스 파일에서 추출된 `Symbol` 객체
- 심볼 간 `SymbolRelationship` 정의

### Output
- 완전한 `SymbolGraph` 구조 (심볼 맵 + 인덱스 + 인접 리스트)
- 검색 결과 (`SymbolQueryResult`)
- 순환 의존성 탐지 결과

### Context
- [[Parser System]]에서 심볼 추출
- [[Storage System]]에 그래프 저장
- [[Analyzer System]]이 그래프 기반 분석 수행

### Logic
```
1. 심볼 추가 → 4개 인덱스 동시 갱신 (id, name, file, adjacency)
2. 관계 추가 → 양방향 인접 리스트 갱신
3. 검색 → 인덱스 기반 O(1) 조회 후 필터링
4. 순환 탐지 → DFS 기반 사이클 탐색
```

### Effect
- 메모리 내 그래프 구조 변경
- 인덱스 자동 동기화

### Scope
- `SymbolGraphBuilder`: 그래프 구축 및 관리
- `SymbolSearchEngine`: 다중 조건 검색
- `DepthTraverser`: BFS 기반 의존성 순회

---

## 핵심 컴포넌트

### [[SymbolGraphBuilder]]

그래프 구축 및 관리를 담당하는 핵심 클래스

```typescript
/**
 * @doc [[Symbol Graph System]]
 * @functionality 심볼 그래프 구축, 인덱스 관리, 순환 탐지
 */
class SymbolGraphBuilder {
  addSymbol(symbol: Symbol): void
  addRelationship(relationship: SymbolRelationship): void
  getAllSymbols(): Symbol[]
  detectCircularDependencies(): string[][]
  getGraph(): SymbolGraph
}
```

**Source**: `src/graph/SymbolGraphBuilder.ts`

### SymbolSearchEngine

다중 조건 기반 심볼 검색 엔진

```typescript
/**
 * @doc [[Symbol Graph System]]
 * @depends SymbolGraphBuilder
 * @depType runtime
 * @depReason 그래프 데이터 조회
 */
class SymbolSearchEngine {
  search(query: SymbolQuery): SymbolQueryResult
  findUndocumented(): Symbol[]
  findUntested(): Symbol[]
  findWithoutResponsibility(): Symbol[]
  findWithoutContract(): Symbol[]
  findOrphaned(): Symbol[]
}
```

**Source**: `src/graph/SymbolSearchEngine.ts`

### DepthTraverser

BFS 기반 의존성 순회

```typescript
/**
 * @doc [[Symbol Graph System]]
 * @problem 깊은 의존성 체인 탐색 시 성능 저하
 * @solves 깊이 제한 BFS로 효율적 순회
 * @context 대규모 코드베이스에서 의존성 분석
 */
class DepthTraverser {
  traverse(entryPoints: string[], options: TraversalOptions): TraversalResult
}
```

**Source**: `src/graph/DepthTraverser.ts`

---

## 데이터 구조

### SymbolGraph

```typescript
interface SymbolGraph {
  /** 심볼 ID → Symbol 매핑 */
  symbols: Map<string, Symbol>

  /** 모든 관계 목록 */
  relationships: SymbolRelationship[]

  /** 심볼 이름 → ID 목록 (동명 심볼 지원) */
  nameIndex: Map<string, string[]>

  /** 파일 경로 → 심볼 ID 목록 */
  fileIndex: Map<string, string[]>

  /** 심볼 ID → 의존하는 심볼 ID 목록 */
  adjacencyList: Map<string, string[]>

  /** 심볼 ID → 의존받는 심볼 ID 목록 (역방향) */
  reverseAdjacencyList: Map<string, string[]>
}
```

### Symbol

```typescript
interface Symbol {
  id: string                    // 고유 식별자 (kebab-case)
  name: string                  // 심볼 이름
  type: SymbolType              // 'function' | 'class' | 'interface' | ...
  filePath: string              // 소스 파일 경로
  line: number                  // 정의 라인
  column: number                // 정의 컬럼
  isExported: boolean           // export 여부
  isPublic: boolean             // public 여부
  summary?: string              // TSDoc @summary
  contract?: ContractSpec       // @contract 명세
  responsibility?: ResponsibilitySpec  // @responsibility 명세
  tests: TestMapping[]          // 연결된 테스트
  designDecisions: string[]     // 설계 의사결정
}
```

---

## 설계 의사결정

### ADR-001: Adjacency List vs Matrix]]

```
@decision 인접 리스트 방식 채택
@rationale
  - 희소 그래프(sparse graph)에 효율적: O(V+E) 공간
  - 노드 순회 O(1), 엣지 순회 O(degree)
  - 메모리 효율성 우선
@consequences
  - 두 노드 간 엣지 존재 확인: O(degree) vs O(1)
  - 양방향 인접 리스트로 역방향 조회 지원
```

### ADR-002: Multi-Index Strategy]]

```
@decision 4개 인덱스 동시 유지 (id, name, file, adjacency)
@rationale
  - 다양한 쿼리 패턴 지원 (이름, 파일, 의존성)
  - 모든 주요 조회 O(1) 보장
@consequences
  - 메모리 사용량 증가
  - 삽입 시 4개 인덱스 갱신 필요
```

---

## 사용 시나리오

### 시나리오 1: 심볼 그래프 구축

```typescript
import { SymbolGraphBuilder } from './graph/SymbolGraphBuilder';

const builder = new SymbolGraphBuilder();

// 심볼 추가
builder.addSymbol({
  id: 'user-service',
  name: 'UserService',
  type: 'class',
  filePath: 'src/services/UserService.ts',
  // ...
});

// 관계 추가
builder.addRelationship({
  from: 'user-service',
  to: 'user-repository',
  type: 'depends'
});

const graph = builder.getGraph();
```

### 시나리오 2: 문서화되지 않은 심볼 검색

```typescript
import { SymbolSearchEngine } from './graph/SymbolSearchEngine';

const engine = new SymbolSearchEngine(graph);
const undocumented = engine.findUndocumented();

console.log(`${undocumented.length}개 심볼에 문서 필요`);
```

### 시나리오 3: 순환 의존성 탐지

```typescript
const cycles = builder.detectCircularDependencies();

if (cycles.length > 0) {
  console.log('순환 의존성 발견:');
  cycles.forEach(cycle => {
    console.log(`  ${cycle.join(' → ')} → ${cycle[0]}`);
  });
}
```

---

## 관련 시스템

- [[Parser System]] - 소스 코드에서 심볼 추출
- [[Storage System]] - 그래프 영속화
- [[Analyzer System]] - 그래프 기반 관계 분석
- [[Validator System]] - 연결성 검증

---

## CLI 명령어

| 명령어 | 설명 |
|--------|------|
| `tsdoc-edge build <src>` | 소스에서 심볼 그래프 구축 |
| `tsdoc-edge orphans` | 고립된 심볼 찾기 |
| `tsdoc-edge untested` | 테스트 없는 심볼 찾기 |
| `tsdoc-edge relationship-metrics` | 그래프 메트릭 출력 |
| `tsdoc-edge relationship-clusters` | 클러스터 분석 |

---

## Backlinks

### Referenced By

- [[Analyzer System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/analyzer-system.md:33
- [[Analyzer System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/analyzer-system.md:232
- [[Parser System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/parser-system.md:34
- [[Parser System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/parser-system.md:179
- [[Storage System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/storage-system.md:148
- [[Validator System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/validator-system.md:31
- [[Validator System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/core/validator-system.md:172

