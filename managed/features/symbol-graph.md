---
tsdoc: managed
version: 1.0.0
status: active
primary: SymbolGraphFeatures
category: feature
tags:
  - graph
  - dependency
lastUpdated: 2025-01-15
---

# [[SymbolGraphFeatures]]
> 심볼 간 의존성 그래프 구축 및 깊이별 탐색

## 개요
TypeScript 코드베이스의 모든 심볼(클래스, 인터페이스, 함수, 타입)을 노드로, import 관계를 엣지로 하는 의존성 그래프를 구축합니다. 이를 통해 리팩토링 영향 범위, 순환 의존성, 고아 심볼 등을 분석할 수 있습니다.

**해결하는 문제:**
- 코드 변경 시 영향 범위 파악
- 리팩토링 계획 수립
- 순환 의존성 탐지
- 사용되지 않는 코드 발견
- 코드베이스 구조 시각화

## 핵심 개념
### 1. 심볼 (Symbol)

```typescript
interface Symbol {
  id: string;              // 고유 ID (예: "001", "a3f")
  name: string;            // 심볼 이름 (예: "UserService")
  qualifiedName: string;   // 전체 이름 (예: "UserService#createUser")
  type: 'class' | 'interface' | 'function' | 'type' | 'variable';
  filePath: string;
  exported: boolean;       // export 여부
  documented: boolean;     // TSDoc 주석 여부
  tested: boolean;         // 테스트 존재 여부
}
```

### 2. 관계 (Relationship)
```typescript
interface SymbolRelationship {
  from: string;           // 출발 심볼 ID
  to: string;             // 도착 심볼 ID
  type: 'depends-on' | 'used-by' | 'implements' | 'extends';
  reason?: string;        // 관계 이유
}
```
### 3. 탐색 방향 (Direction)

```typescript
type Direction =
  | 'dependencies'  // 하위 의존성 (이 코드가 사용하는 것)
  | 'dependents'    // 상위 의존성 (이 코드를 사용하는 것)
  | 'both';         // 양방향
```

## 핵심 산출물
### Graph Construction
- [SymbolGraphBuilder](../../src/graph/SymbolGraphBuilder.ts#SymbolGraphBuilder) - 그래프 구축
  - AST 기반 심볼 추출
  - Import 문 분석
  - 관계 매핑 (depends-on, implements, extends)

- [ASTSymbolExtractor](../../src/analyzer/ASTSymbolExtractor.ts#ASTSymbolExtractor) - AST에서 심볼 추출
  - 클래스, 인터페이스, 함수, 타입 추출
  - Export 정보 파악
  - 접근 제어자 분석

- [DependencyResolver](../../src/analyzer/DependencyResolver.ts#DependencyResolver) - Import 경로 해석
  - 모듈 경로 해석 (.ts, .tsx, index)
  - Import 문과 심볼 매핑
  - 의존성 그래프 구축

### Graph Search
- [SymbolSearchEngine](../../src/graph/SymbolSearchEngine.ts#SymbolSearchEngine) - 다양한 조건 검색
  - 이름 기반 검색
  - 타입 필터 (class, interface, function...)
  - 경로 패턴 검색
  - Public API 필터
  - 문서화/테스트 여부 필터
### Graph Traversal
- [DepthTraverser](../../src/graph/DepthTraverser.ts#DepthTraverser) - 깊이별 탐색
  - N단계 의존성 추적
  - 방향 지정 (dependencies/dependents/both)
  - 깊이별 심볼 그룹핑
  - 영향 범위 분석
## 사용 시나리오

### 시나리오 1: 버그 수정 전 영향 범위 파악
```bash
# UserService를 사용하는 코드들을 3단계까지 추적
tsdoc-edge scan --entry=UserService --direction=dependents --depth=3
```
**출력:**
```
📊 Depth 1 (3 symbols)
  → AuthController (class)
  → ProfileService (class)
  → AdminDashboard (class)
📊 Depth 2 (7 symbols)
  → APIRouter (class)
  → WebSocketHandler (class)
  ...
📊 Depth 3 (12 symbols)
  ...
```

이제 UserService 변경 시 영향받는 22개 심볼을 알 수 있습니다.
### 시나리오 2: 리팩토링 계획 - 의존성 파악

```bash
# DatabaseConnection이 사용하는 모든 의존성 추적
tsdoc-edge scan --entry=DatabaseConnection --direction=dependencies --depth=5
```

**사용 예:**
- DatabaseConnection을 리팩토링하려면 어떤 의존성들을 먼저 정리해야 하는가?
- 의존성 깊이가 5단계 → 복잡도가 높음 → 단계적 리팩토링 필요
### 시나리오 3: 양방향 분석

```bash
# ConfigManager의 모든 연결 관계 파악
tsdoc-edge scan --entry=ConfigManager --direction=both --depth=2
```

**결과:**
- **Dependencies**: ConfigManager가 사용하는 것 (파일 시스템, 검증 로직 등)
- **Dependents**: ConfigManager를 사용하는 것 (앱 전체 설정 의존)
### 시나리오 4: 문서 자동 생성

```bash
# 탐색 결과를 마크다운으로 저장
tsdoc-edge scan --entry=UserService \
  --direction=dependents \
  --depth=3 \
  --output=docs/impact-analysis/UserService.md
```
생성된 문서:
```markdown
# UserService Impact Analysis

## Level 1 Dependencies (Direct)
- AuthController
- ProfileService
- AdminDashboard

## Level 2 Dependencies
- APIRouter
- WebSocketHandler
...
```
이를 PR에 첨부 → 리뷰어가 변경 영향 범위를 한눈에 파악

### 시나리오 5: 순환 의존성 탐지
```bash
# 연결성 검증으로 순환 의존성 탐지
tsdoc-edge validate
```
**출력:**
```
❌ Circular Dependencies (2)
  → UserService → AuthService → UserService
  → ConfigManager → Logger → ConfigManager
```
## CLI 명령어

### scan 명령어
```bash
# 기본 사용
tsdoc-edge scan --entry=<symbol> [options]

# 옵션
--direction=<dir>       # dependencies | dependents | both (기본: dependencies)
--depth=<N>             # 탐색 깊이 (기본: 2)
--output=<file>         # 마크다운 파일로 저장
--group-by-category     # 카테고리별 그룹핑 (Class, Interface, Function...)
```

### 빠른 조회 명령어
```bash
# 심볼 레지스트리 기반 (1단계 의존성만)
tsdoc-edge deps <id>        # 이 심볼이 사용하는 것
tsdoc-edge used-by <id>     # 이 심볼을 사용하는 것
# AST 기반 (이름으로 검색)
tsdoc-edge who-uses <name>  # 이 심볼을 사용하는 모든 곳
tsdoc-edge find-method <Class#method>  # 메서드 찾기
```
### 연결성 검증

```bash
tsdoc-edge validate         # 전체 검증 (순환 의존성, 고아 심볼 등)
tsdoc-edge orphans          # 고아 심볼 찾기
```

## 깊이 설정 가이드
| Depth | 권장 사용 | 실행 시간 | 출력 심볼 수 |
|-------|-----------|-----------|--------------|
| 1 | 직접 의존성만 | <1s | 3-10 |
| 2 | 일반적 영향 범위 | 1-3s | 10-50 |
| 3 | 상세 분석 | 3-10s | 50-200 |
| 4-5 | 전체 추적 | 10-30s | 200-500 |
| 6+ | 권장 안 함 | >30s | 너무 많음 |

**경험 법칙:**
- 버그 수정: depth=2
- 리팩토링 계획: depth=3
- 전체 영향 분석: depth=4
- 아키텍처 검토: depth=5
## 심볼 ID 관리

### ID 생성 전략
```bash
# Sequential 모드 (기본)
tsdoc-edge id new src/api/UserService.ts UserService
# → 001
# Random 모드 (읽기 쉬움)
tsdoc-edge id new src/api/AuthService.ts AuthService --mode=random
# → a3f
```
### 계층 구조

```bash
# 부모-자식 관계 설정
tsdoc-edge id new src/api/UserService.ts createUser \
  --type=method \
  --parent=001 \
  --member-type=instance
```
```bash
# 계층 구조 트리 출력
tsdoc-edge tree
```
**출력:**
```
001 (UserService)
  ├─ 002 (createUser)
  ├─ 003 (updateUser)
  └─ 004 (deleteUser)
```

## 저장소
### Database (SQLite)
- [DatabaseManager](../../src/storage/DatabaseManager.ts#DatabaseManager)
  - 심볼 정보 영속화
  - 빠른 쿼리 지원
  - JSONL export/import

### Symbol Registry (JSONL)
- [SymbolRegistryManager](../../src/storage/SymbolRegistryManager.ts#SymbolRegistryManager)
  - ID 기반 심볼 추적
  - 의존성 관계 저장
  - Git 친화적 JSONL 포맷
## 관련 기능

- [[AnalysisFeatures]] - 코드 건강도 및 중요도 분석
- [[ValidationFeatures]] - 연결성 및 순환 의존성 검증
- [[CoreWorkflow]] - 메인 문서화 파이프라인
## 가이드

실전 시나리오 및 워크플로우: [DEPENDENCY_ANALYSIS_GUIDE.md](../DEPENDENCY_ANALYSIS_GUIDE.md)

---

## Backlinks

### Referenced By

- [[AnalysisFeatures]] → /Users/junwoobang/project/tsdoc-edge/managed/features/analysis-features.md:170
- [[AnalysisFeatures]] → /Users/junwoobang/project/tsdoc-edge/managed/features/analysis-features.md:182
- [[CoreFeatures]] → /Users/junwoobang/project/tsdoc-edge/managed/features/core-features-catalog.md:62
- [[CoreFeatures]] → /Users/junwoobang/project/tsdoc-edge/managed/features/core-features-catalog.md:267
- [[CoreWorkflow]] → /Users/junwoobang/project/tsdoc-edge/managed/features/core-workflow.md:63
- [[CoreWorkflow]] → /Users/junwoobang/project/tsdoc-edge/managed/features/core-workflow.md:85
- [[ValidationFeatures]] → /Users/junwoobang/project/tsdoc-edge/managed/features/validation-features.md:142
- [[ValidationFeatures]] → /Users/junwoobang/project/tsdoc-edge/managed/features/validation-features.md:160

### Implemented By

- DepthTraverser (Traversal) → /Users/junwoobang/project/tsdoc-edge/src/graph/DepthTraverser.ts:64
- SymbolGraphBuilder (Builder) → /Users/junwoobang/project/tsdoc-edge/src/graph/SymbolGraphBuilder.ts:22
- SymbolSearchEngine (Search) → /Users/junwoobang/project/tsdoc-edge/src/graph/SymbolSearchEngine.ts:25

