---
title: Features Index
type: index
category: features
status: active
canonical: true
lastUpdated: 2026-07-14
codeImplementation: not-applicable
---

# [[Features Index]]

> TSDoc Edge 기능 카탈로그 - 모든 기능의 진입점

> 아래 규모·건강도 수치는 historical catalog snapshot이다. 현재 ttsc canonical graph,
> convention gate와 release qualification 상태는 [[Semantic Graph Spec Governance Roadmap]]와
> [[Coverage Metrics Contract]]를 기준으로 확인한다.

## Project Status

| Metric | Value |
|--------|-------|
| Commands | 67 |
| Test Suites | 196 |
| Tests | 2,885 |
| Health Score | 74/100 (B) |
| Symbols | 6,726 |
| Relationships | 38,704 |
| Relationship Types | 13/28 (46%) |
| Build Time | 11s (optimized) |

## Quick Navigation

**핵심 카탈로그**: [[CoreFeatures]] (`core-features-catalog.md`) - 상세한 기능 설명 및 코드 매핑

**빠른 시작**:
```bash
tsdoc-edge work-context <file-path>    # 파일 작업 전 컨텍스트 확인
```

---

## Core Features (핵심 기능)

### [[CoreWorkflow]]
**Path**: `core-workflow.md`

소스 파일 처리부터 문서 생성까지의 핵심 파이프라인.

**주요 기능**:
- TypeScript 프로젝트 자동 문서화
- TSDoc 주석 검증 및 표준화
- 마크다운 API 문서 생성

**Commands**: `build`, `parse`, `init`

---

### [[Document Symbol System]]
**Path**: `../concepts/document-symbol-system.md`

Wiki 스타일 `[[Symbol]]` 문법으로 문서와 코드를 양방향 연결.

**주요 기능**:
- H1/H2/H3 계층적 심볼 정의
- 문서 간 양방향 링크
- Backlinks 자동 생성

**Commands**: `index-docs`, `update-backlinks`, `validate-symbol-refs`

---

## Analysis Features (분석 기능)

### [[AnalysisFeatures]]
**Path**: `analysis-features.md`

코드 건강도, 문서 품질, 중요도 분석.

**주요 기능**:
- 코드 건강도 측정 (CodeHealthChecker)
- 문서 품질 분석 (DocumentationAnalyzer)
- 중요도 분류 (Critical/Important/Normal)
- 통계 추적 및 회귀 탐지

**Commands**: `analyze`, `health`, `stats`, `undocumented`, `untested`

### [[Coverage Metrics Contract]]
**Path**: `coverage-metrics-contract.md`

커버리지라는 이름으로 관리되는 문서화·실행·심볼 테스트·통합 검증·health score·canonical
graph policy 메트릭의 정의와 현재 구현 상태를 관리하는 기준 문서.

**Key rule**: `coverage-report`는 테스트 실행률이 아니라 `documentation.symbol`을 측정한다.

---

### Dependency Analysis
**Path**: `DependencyAnalysis.md` (source-backed)

심볼 의존성 분석 및 관계 탐색.

**주요 기능**:
- 전방 의존성 분석 (Forward dependencies)
- 역방향 의존성 분석 (Reverse dependencies)
- 전이적 의존성 체인 (Transitive chains)
- 순환 의존성 탐지

**Commands**: `deps`, `used-by`, `who-uses`, `type-chain`, `detect-cycles`

---

### Impact Analysis
**Path**: `ImpactAnalysis.md` (source-backed)

코드 변경의 영향 범위 평가.

**주요 기능**:
- 직접 영향 분석 (Direct impact)
- 전이적 영향 분석 (Transitive impact)
- 테스트 영향 예측
- Breaking change 탐지

**Commands**: `used-by`, `analyze-impact`, `test-impact`, `breaking-changes`

---

### Dead Code Detection
**Path**: `DeadCodeDetection.md` (source-backed)

미사용 코드 탐지 및 제거 전략.

**주요 기능**:
- Orphan 심볼 탐지 (no dependencies/usages)
- 진입점 기반 도달 불가능 코드 탐지
- 테스트 커버리지 상관 분석
- 안전한 제거 가이드

**Commands**: `orphans`, `untested`, `stats`

---

## Graph & Query Features (그래프 & 쿼리)

### [[SymbolGraphFeatures]]
**Path**: `symbol-graph.md`

심볼 간 의존성 그래프 구축 및 깊이별 탐색.

**주요 기능**:
- 의존성 그래프 구축 (SymbolGraphBuilder)
- 다양한 조건 검색 (SymbolSearchEngine)
- 깊이별 탐색 (DepthTraverser)
- 양방향 탐색 (dependencies/dependents/both)

**Commands**: `scan`, `deps`, `used-by`, `who-uses`

---

### [[QueryCommands]]
**Path**: `QueryCommands.md`

심볼 쿼리 및 관계 조회 명령어 그룹 (Phase 5).

**주요 명령어**:
- `deps <id>` - Forward dependencies
- `used-by <id>` - Reverse dependencies (registry)
- `who-uses <name>` - Reverse dependencies (database)
- `orphans` - Orphaned symbols
- `stats` - Documentation statistics
- `undocumented` - Symbols without TSDoc
- `untested` - Symbols without tests

---

## Validation Features (검증 기능)

### [[ValidationFeatures]]
**Path**: `validation-features.md`

컨벤션, 연결성, 엄격 모드 검증.

**주요 기능**:
- 컨벤션 검증 (ConventionValidator)
- 연결성 검증 (ConnectivityValidator)
- 엄격 모드 (StrictModeValidator)
- 고아 심볼 탐지
- 깨진 링크 탐지
- 순환 의존성 탐지

**Commands**: `validate`, `validate-docs`, `validate-symbol-refs`, `check-links`

---

### [[Convention Pack Check]]
**Path**: `convention-pack-check.md`

저장된 canonical graph revision에 workspace-installed spec-binding convention pack을 적용하고,
정확한 spec/policy/rule-set/binding/report pin과 CI exit code를 생성합니다.

**Commands**: `convention check --pack <file>`, `convention inputs list|read`,
`convention retention list|pin|unpin|gc`

---

### [[Lint Governance]]
**Path**: `lint-governance.md`

Biome severity tiers, legacy warning budget, and strict canonical-kernel quality gate.

**Commands**: `lint`, `lint:budget`, `lint:governance`

---

## Integration Features (통합 기능)

### CI/CD Integration
**Path**: `CICDIntegration.md` (workflow-backed)

CI/CD 파이프라인 통합 및 품질 게이트.

**주요 기능**:
- GitHub Actions 워크플로우
- Pre-commit hooks
- 문서 커버리지 임계값 검증
- 회귀 방지 (stats 비교)

**플랫폼**: GitHub Actions, GitLab CI, Jenkins, CircleCI

---

### [[AutoIndexing]]
**Path**: `auto-indexing.md`

파일 저장 시 자동 문서 심볼 인덱스 업데이트.

**주요 기능**:
- 파일 변경 감지 (watch mode)
- 증분 인덱싱 (incremental updates)
- Backlinks 자동 동기화

**Commands**: `watch`, `index-docs --watch`

---

### [[LSP Integration]]
**Path**: `lsp-integration.md`

IDE 통합을 위한 Language Server Protocol 지원.

**주요 기능**:
- Hover: 심볼 정보 및 영향 분석
- Code Lens: 의존성 인라인 표시
- Diagnostics: 순환 의존성, 레이어 위반 경고
- Document Link: `[[Symbol]]` 클릭 시 정의로 이동

**Commands**: LSP 서버 실행 (`node dist/lsp/server.js`)

---

### MCP Testing Strategy
**Path**: `mcp-testing-strategy.md` | **Link**: [[MCP Testing Strategy]]

Model Context Protocol 도구 테스트 전략.

**주요 기능**:
- MCP 도구 테스트 프레임워크
- 통합 테스트 가이드
- 도구별 테스트 시나리오

---

## Feature Matrix

| Feature | Status | Commands | Priority |
|---------|--------|----------|----------|
| [[CoreWorkflow]] | ✅ Active | build, parse | Critical |
| DocumentSymbolSystem | ✅ Active | index-docs | Critical |
| [[AnalysisFeatures]] | ✅ Active | analyze, health | High |
| DependencyAnalysis | ✅ Active | deps, used-by | High |
| ImpactAnalysis | ✅ Active | analyze-impact | High |
| [[SymbolGraphFeatures]] | ✅ Active | scan, deps | High |
| [[QueryCommands]] | ✅ Active | deps, orphans | Medium |
| [[ValidationFeatures]] | ✅ Active | validate | Medium |
| DeadCodeDetection | ✅ Active | orphans | Medium |
| CICDIntegration | ✅ Active | (CI/CD) | Medium |
| [[AutoIndexing]] | ✅ Active | watch | Low |

---

## Usage Patterns

### Daily Workflow
```bash
# 1. Get file context before editing
tsdoc-edge work-context src/services/UserService.ts

# 2. Make changes...

# 3. Check impact
tsdoc-edge used-by user-service

# 4. Validate documentation
tsdoc-edge validate-docs managed
```

### Code Health Monitoring
```bash
# Save baseline
tsdoc-edge stats --save baseline

# ... development ...

# Compare progress
tsdoc-edge stats --compare baseline --warnings-only
```

### Refactoring Support
```bash
# 1. Analyze dependencies
tsdoc-edge deps database-manager
tsdoc-edge used-by database-manager

# 2. Check impact
tsdoc-edge analyze-impact database-manager

# 3. Find affected tests
tsdoc-edge test-impact database-manager
```

---

## Related Documentation

- **Commands Index** (`/managed/COMMANDS.md`) - All 67 commands
- **[[Relationship Types]]** (`/managed/relationships/index.md`) - 11 relationship types implemented
- **[[Guides & Tutorials]]** (`/managed/guides/index.md`) - Learning resources
- **[[CoreFeatures]]** (`core-features-catalog.md`) - Detailed feature catalog

---

## Backlinks

### Referenced By

- [[Concepts Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/index.md:254
- [[Primary Types Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/index.md:403
- [[Types Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/types/index.md:348
- [[Utilities Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/index.md:418
- [[Workflows Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/workflows/index.md:195
