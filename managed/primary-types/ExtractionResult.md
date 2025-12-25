---
title: Extraction Result
type: type
category: primary-types
status: active
canonical: true
---

# [[ExtractionResult]]

**Primary Type**: Symbol Extraction Output

## 1. Purpose (목적)

소스 코드 파싱 결과를 표준화된 형태로 제공하는 타입입니다. 추출된 심볼 목록과 심볼 간 관계를 하나의 구조로 반환하여 후속 처리를 용이하게 합니다.

### Problem (해결하는 문제)
- 파싱 결과가 분산되어 처리 복잡
- 심볼과 관계를 별도로 관리 시 불일치 가능
- 그래프 구축 위한 중간 변환 필요

### Solution (해결 방법)
- 심볼(노드)와 관계(엣지)를 하나의 결과로 통합
- 그래프 이론의 V(Vertex)와 E(Edge) 명시적 분리
- 파이프라인의 표준 출력 형식 정의

## 2. Structure (구조)

### Type Definition

See implementation: ExtractionResult

**Structure**: 그래프 이론의 V(Vertex)와 E(Edge) 분리
- `symbols`: ExtractedSymbol[] - 추출된 심볼 목록 (노드)
- `relationships`: SymbolRelationship[] - 심볼 간 관계 (엣지)

### Composed Types

이 타입은 2개의 추출 결과 타입을 명시적으로 조합합니다:

1. **ExtractedSymbol** - 파싱된 심볼 정보 (이름, 타입, 위치, TSDoc 태그)
2. **SymbolRelationship** - 심볼 간 의존성 관계 (dependsOn, usedBy, implements 등)

## 3. Usage Scenarios (사용 시나리오)

### 1. 파일 파싱
```bash
tsdoc-edge build src
# 내부적으로 ExtractionResult 생성 및 저장
```

### 2. 프로그래밍 방식 파싱
```typescript
const parser = new TSDocParser();
const sourceCode = fs.readFileSync('file.ts', 'utf-8');
const result: ExtractionResult = parser.extractAll(sourceCode, 'file.ts');

console.log(`Found ${result.symbols.length} symbols`);
console.log(`Found ${result.relationships.length} relationships`);
```

### 3. 심볼 그래프 구축
```typescript
const builder = new SymbolGraphBuilder();
const graph = builder.buildFromExtraction(result);
// ExtractionResult → SymbolGraph 변환
```

## 4. Design Decisions (설계 결정)

### Decision 1: Separate symbols and relationships Arrays

**Rationale:**
- **심볼**: 노드 (Vertex) - 독립적 존재
- **관계**: 엣지 (Edge) - 노드 간 연결
- 그래프 이론의 V와 E를 명시적으로 분리

**Consequences:**
- ✅ 각각 독립적 쿼리 및 필터링 가능
- ✅ 관계 중심 쿼리 최적화
- ✅ 역방향 검색 용이

**Alternatives Considered:**
- Symbol 내부에 중첩: 역방향 검색 어려움
- 별도 클래스: 추가 추상화 복잡도

### Decision 2: Relationships as First-class Citizens

**Rationale:**
- "A를 사용하는 모든 심볼" 쿼리 최적화
- relationships 배열 필터링만으로 해결

**Processing Pipeline:**
```
Source Code → [TSDocParser] → ExtractionResult
  ↓
[SymbolGraphBuilder] → SymbolGraph
  ↓
[DatabaseManager] → SQLite + JSONL
```

## 5. Related Concepts (관련 개념)

- [[ASTSymbolExtractor]] - 실제 파싱 구현체
- [[SymbolGraphBuilder]] - ExtractionResult → Graph 변환
- [[BuildCommand]] - 전체 빌드 프로세스

## 6. Commands Using This Type

**[[BuildCommand]]** (`src/commands/BuildCommand.ts:40`)
- 소스 코드 파싱하여 `ExtractionResult` 생성
- 심볼과 관계를 DB에 저장

**[[ParseCommand]]** (`src/commands/ParseCommand.ts:37`)
- 단일 파일 파싱 및 `ExtractionResult` 출력
- 디버깅 및 검증 용도

## 7. Code References (코드 참조)

**Type Definition**: `src/types/ExtractionResult.ts`
**Primary Producer**: [[ASTSymbolExtractor]] (`src/analyzer/ASTSymbolExtractor.ts`)
**Primary Consumer**: [[BuildCommand]] (`src/commands/BuildCommand.ts`)

[^ExtractionResult]
[^TSDocParser]
[^ExtractedSymbol]
[^SymbolRelationship]
[^SymbolGraphBuilder]

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:273
- [[ASTSymbolExtractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:82
- [[ASTSymbolExtractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:111
- [[ASTSymbolExtractor]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:193
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:380
- ExtractionResult → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/ExtractionResult.md:23

### Implemented By

- ExtractionResult → /Users/junwoobang/workflow/tsdoc-edge/src/analyzer/ASTSymbolExtractor.ts:36

