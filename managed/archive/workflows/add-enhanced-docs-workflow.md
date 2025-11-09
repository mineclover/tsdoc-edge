---
tsdoc: managed
status: active
category: workflow
version: 1.0.0
tags:
  - documentation
  - workflow
  - best-practice
---

# [[AddEnhancedDocsWorkflow]]

## 개요

공개 API 클래스/함수에 Enhanced Documentation을 추가하는 표준 워크플로우입니다. 이 워크플로우는 문서 품질을 67% 이상 유지하고 SSOT 원칙을 준수하도록 설계되었습니다.

## 목적

- 공개 API의 일관된 고품질 문서화
- 6-카테고리 문서 시스템 적용
- 개발자가 빠르게 Enhanced Docs를 추가할 수 있도록 가이드 제공

## 워크플로우 단계

### 1. 대상 파일 선정

**우선순위 기준**:
```bash
# 공개 API 파일 찾기
find src -name "*.ts" -type f ! -path "*/__tests__/*" ! -path "*/types/*"

# 우선순위
# 1순위: 공개 API 클래스 (export class)
# 2순위: 공개 함수 (export function)
# 3순위: 주요 인터페이스 (핵심 타입)
```

**선정 기준**:
- ✅ `@public` 태그가 있거나 export된 클래스/함수
- ✅ 프로젝트의 핵심 기능 담당
- ✅ 다른 모듈에서 자주 사용됨
- ❌ 내부 유틸리티 함수 (낮은 우선순위)
- ❌ 타입 정의만 있는 파일 (types/)

### 2. 기존 문서 분석

```bash
# 현재 completeness 확인
npx ts-node src/cli.ts parse <file-path>

# 예시 출력:
# SymbolGraphBuilder
#   Completeness: 33%
#   Missing: problemSolving, functionality, decisions
```

**체크리스트**:
- [ ] 기본 TSDoc 주석 존재 (`@public`, `@param`, `@returns`)
- [ ] `@responsibility`, `@contract` 태그 존재
- [ ] 누락된 Enhanced Doc 카테고리 파악

### 3. Enhanced Docs 작성

**6-카테고리 템플릿**:

```typescript
/**
 * [기존 요약 설명]
 *
 * [기존 태그들 (@public, @responsibility 등)]
 *
 * @problem [이 클래스가 해결하는 문제를 1-2문장으로]
 * @solves [어떻게 해결하는지 핵심 솔루션]
 * @context [이 클래스가 필요한 맥락/배경]
 *
 * @functionality
 * - [주요 기능 1]: 간단한 설명
 * - [주요 기능 2]: 간단한 설명
 * - [주요 기능 3]: 간단한 설명
 *
 * @decision [주요 설계 결정]
 * @rationale [그 결정을 내린 이유 (성능, 단순성, 확장성 등)]
 * @consequences [결정의 결과/영향]
 *
 * @depends [의존하는 주요 모듈/타입]
 * @depType [internal|external]
 * @depReason [의존하는 이유]
 */
```

**실제 예시** (SymbolGraphBuilder):

```typescript
/**
 * Builds and maintains a graph of all symbols and their relationships
 *
 * @id 006
 * @public
 * @responsibility Build and maintain symbol graph structure
 * @contract Initialize empty symbol graph and provide symbol/relationship management
 * @architecture Core component for connectivity tracking
 *
 * @problem Need to track all code symbols and their relationships across the entire codebase
 * @solves Provides a centralized graph data structure with efficient indexing for name, file, and dependency lookups
 * @context TypeScript projects have complex dependency chains that need to be analyzed for documentation connectivity and SSOT compliance
 *
 * @functionality
 * - Symbol management: Add, retrieve, search symbols by ID, name, or file
 * - Relationship tracking: Manage dependencies and reverse dependencies between symbols
 * - Index maintenance: Automatic indexing by name and file path for fast lookups
 * - Graph analysis: Circular dependency detection, statistics calculation
 * - Adjacency lists: Bidirectional adjacency lists for efficient traversal
 *
 * @decision Use adjacency list representation instead of adjacency matrix
 * @rationale Sparse graphs (most symbols don't depend on each other) benefit from adjacency lists with O(1) edge lookup and O(V+E) space complexity
 * @consequences Better memory efficiency for large codebases, efficient DFS/BFS traversal for dependency analysis
 *
 * @depends Symbol, SymbolGraph, SymbolRelationship
 * @depType internal
 * @depReason Core type definitions for graph structure
 */
```

### 4. 카테고리별 작성 가이드

#### Problem/Solves/Context (필수 - 33% 기여)

**Problem**:
- "Need to..." 또는 "Users face..." 형태
- 1-2문장으로 핵심 문제 정의

**Solves**:
- 핵심 솔루션을 1문장으로
- 구체적인 구현 방법보다는 접근 방식

**Context**:
- 왜 이 문제가 중요한지
- 어떤 상황에서 발생하는지

#### Functionality (필수 - 33% 기여)

- 불릿 포인트 형식
- 3-7개 주요 기능
- 각 기능은 간결하게 (한 줄)
- 그룹핑 가능 (서브 불릿)

```typescript
@functionality
- Symbol management: Add, retrieve, search symbols
- Relationship tracking: Dependencies and reverse dependencies
- Index maintenance: Automatic indexing by name and file
```

#### Decisions (필수 - 17% 기여)

**Decision**:
- "Use X instead of Y" 형태
- 주요 아키텍처/설계 결정

**Rationale**:
- 왜 X를 선택했는지 (성능, 단순성, 유지보수성)
- 트레이드오프 언급

**Consequences**:
- 긍정적 영향
- 알려진 제약사항 (있다면)

#### Dependencies (필수 - 17% 기여)

```typescript
@depends Module1, Module2, Module3
@depType internal|external
@depReason Why these dependencies are needed
```

- **internal**: 프로젝트 내부 모듈
- **external**: npm 패키지, Node.js 내장 모듈

### 5. 검증

```bash
# 1. 빌드 테스트
npm run build

# 2. Enhanced Docs 파싱
npx ts-node src/cli.ts parse <file-path>

# 3. Completeness 확인
# 목표: 67% 이상 (4개 카테고리 충족)
# - problemSolving: ✓
# - functionality: ✓
# - decisions: ✓
# - dependencies: ✓

# 4. 테스트 실행
npm test

# 5. Link 검증 (dependencies 확인)
npx ts-node src/cli.ts check-links src
```

**품질 기준**:
- ✅ Completeness ≥ 67%
- ✅ 빌드 성공
- ✅ 기존 테스트 통과
- ✅ 모든 `@depends` 참조가 유효함

### 6. 커밋

```bash
# 변경사항 확인
git diff src/

# 커밋
git add src/
git commit -m "docs: Add enhanced docs to [ClassName]

- Add problem/solves/context section
- Add functionality list
- Add design decision rationale
- Add dependency documentation
- Completeness: [XX]%"
```

## 실전 예시

### 사례 1: SymbolGraphBuilder

**Before** (33% completeness):
```typescript
/**
 * Builds and maintains a graph of all symbols and their relationships
 *
 * @id 006
 * @public
 * @responsibility Build and maintain symbol graph structure
 * @contract Initialize empty symbol graph
 */
export class SymbolGraphBuilder {
```

**After** (67% completeness):
```typescript
/**
 * Builds and maintains a graph of all symbols and their relationships
 *
 * @id 006
 * @public
 * @responsibility Build and maintain symbol graph structure
 * @contract Initialize empty symbol graph
 *
 * @problem Need to track all code symbols and their relationships across the entire codebase
 * @solves Provides a centralized graph data structure with efficient indexing
 * @context TypeScript projects have complex dependency chains for SSOT compliance
 *
 * @functionality
 * - Symbol management: Add, retrieve, search symbols
 * - Relationship tracking: Dependencies and reverse dependencies
 * - Index maintenance: Automatic indexing by name and file
 * - Graph analysis: Circular dependency detection
 *
 * @decision Use adjacency list representation instead of adjacency matrix
 * @rationale Sparse graphs benefit from O(V+E) space complexity
 * @consequences Better memory efficiency for large codebases
 *
 * @depends Symbol, SymbolGraph, SymbolRelationship
 * @depType internal
 * @depReason Core type definitions for graph structure
 */
export class SymbolGraphBuilder {
```

### 사례 2: DatabaseManager

**핵심 개선점**:
1. **Problem**: "Need fast local lookups while maintaining Git-friendly version control"
2. **Functionality**: 6개 주요 기능 (스키마 관리, CRUD, FTS5, JSONL 동기화, 통계, 커버리지)
3. **Decision**: "SQLite + JSONL hybrid instead of pure JSON or pure SQL"
4. **Rationale**: O(log n) lookups + Git diff/merge
5. **Dependencies**: better-sqlite3 (external), ConfigManager (internal)

**결과**: 67% completeness

## 주의사항

### ✅ Do

- **간결하게**: 각 섹션은 1-3문장
- **구체적으로**: "Better performance" 대신 "O(log n) lookups"
- **일관성**: 같은 카테고리는 같은 형식
- **검증**: 항상 parse 명령으로 확인

### ❌ Don't

- **장황하게**: 긴 설명 대신 핵심만
- **중복**: 기존 JSDoc 내용 반복하지 말 것
- **과도하게**: 선택적 카테고리 (errorExperiences, futurePlans)는 필요시만
- **추측**: 불확실하면 코드 읽고 확인

## 선택적 카테고리

67% 목표 달성 후 추가 가능:

### Error Experiences (선택 - 약 10%)

```typescript
@errorExp "TypeError: Cannot read property 'x' of undefined"
@errorContext When symbol ID is invalid
@errorSolution Added null check before accessing properties
```

### Future Plans (선택 - 약 10%)

```typescript
@plan Add support for TypeScript 5.0 decorators
@planPriority medium
@planStatus planned
```

## 자동화 팁

### VSCode Snippet

`.vscode/tsdoc-enhanced.code-snippets`:
```json
{
  "Enhanced Docs Full": {
    "prefix": "tsdoc-enhanced",
    "body": [
      "@problem ${1:Problem description}",
      "@solves ${2:Solution approach}",
      "@context ${3:Context and background}",
      "",
      "@functionality",
      "- ${4:Feature 1}: Description",
      "- ${5:Feature 2}: Description",
      "",
      "@decision ${6:Design decision}",
      "@rationale ${7:Rationale}",
      "@consequences ${8:Consequences}",
      "",
      "@depends ${9:Dependencies}",
      "@depType ${10|internal,external|}",
      "@depReason ${11:Reason}"
    ]
  }
}
```

### Shell Script

```bash
#!/bin/bash
# add-enhanced-docs.sh

FILE=$1

if [ -z "$FILE" ]; then
  echo "Usage: ./add-enhanced-docs.sh <file-path>"
  exit 1
fi

echo "Current completeness:"
npx ts-node src/cli.ts parse "$FILE"

echo ""
echo "Edit the file, then press Enter to validate..."
read

echo "Validating..."
npm run build && npx ts-node src/cli.ts parse "$FILE"
```

## 성공 지표

### 프로젝트 수준
- [ ] 공개 API 클래스 80% 이상 Enhanced Docs 보유
- [ ] 평균 completeness ≥ 67%
- [ ] 모든 핵심 기능 클래스 문서화 완료

### 개별 파일 수준
- [ ] Completeness ≥ 67%
- [ ] 4개 필수 카테고리 모두 작성
- [ ] 빌드 및 테스트 통과
- [ ] Link 검증 통과

## 관련 문서

- [[EnhancedDocumentationSystem]] - Enhanced Docs 전체 시스템 설명
- [[CoreWorkflow]] - 프로젝트 전체 워크플로우
- [[ValidationFeatures]] - 문서 검증 규칙

## Backlinks

<!-- Automatically generated by tsdoc-edge -->

## 버전 히스토리

- v1.0.0 (2025-11-06): 초기 워크플로우 작성
