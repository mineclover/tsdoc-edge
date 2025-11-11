---
title: Features Index
type: index
category: features
status: active
canonical: true
---

# [[Features Index]]

> TSDoc Edge 기능 카탈로그 - 모든 기능의 진입점

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

### [[DocumentSymbolSystem]]
**Path**: `document-symbol-system.md`

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

---

### [[DependencyAnalysis]]
**Path**: `DependencyAnalysis.md`

심볼 의존성 분석 및 관계 탐색.

**주요 기능**:
- 전방 의존성 분석 (Forward dependencies)
- 역방향 의존성 분석 (Reverse dependencies)
- 전이적 의존성 체인 (Transitive chains)
- 순환 의존성 탐지

**Commands**: `deps`, `used-by`, `who-uses`, `type-chain`, `detect-cycles`

---

### [[ImpactAnalysis]]
**Path**: `ImpactAnalysis.md`

코드 변경의 영향 범위 평가.

**주요 기능**:
- 직접 영향 분석 (Direct impact)
- 전이적 영향 분석 (Transitive impact)
- 테스트 영향 예측
- Breaking change 탐지

**Commands**: `used-by`, `analyze-impact`, `test-impact`, `breaking-changes`

---

### [[DeadCodeDetection]]
**Path**: `DeadCodeDetection.md`

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

## Integration Features (통합 기능)

### [[CICDIntegration]]
**Path**: `CICDIntegration.md`

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

## Feature Matrix

| Feature | Status | Commands | Priority |
|---------|--------|----------|----------|
| [[CoreWorkflow]] | ✅ Active | build, parse | Critical |
| [[DocumentSymbolSystem]] | ✅ Active | index-docs | Critical |
| [[AnalysisFeatures]] | ✅ Active | analyze, health | High |
| [[DependencyAnalysis]] | ✅ Active | deps, used-by | High |
| [[ImpactAnalysis]] | ✅ Active | analyze-impact | High |
| [[SymbolGraphFeatures]] | ✅ Active | scan, deps | High |
| [[QueryCommands]] | ✅ Active | deps, orphans | Medium |
| [[ValidationFeatures]] | ✅ Active | validate | Medium |
| [[DeadCodeDetection]] | ✅ Active | orphans | Medium |
| [[CICDIntegration]] | ✅ Active | (CI/CD) | Medium |
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

- **[[Commands Index]]** (`/managed/COMMANDS.md`) - All 61 commands
- **[[Relationship Types]]** (`/managed/relationships/index.md`) - 17 relationship types
- **[[Guides & Tutorials]]** (`/managed/guides/index.md`) - Learning resources
- **[[CoreFeatures]]** (`core-features-catalog.md`) - Detailed feature catalog

---

## Backlinks

### Referenced By

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:238
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:254
- [[QueryCommands]] → /home/user/tsdoc-edge/managed/features/QueryCommands.md:132
- [[AnalysisFeatures]] → /home/user/tsdoc-edge/managed/features/analysis-features.md:323
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:201
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:342
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:343
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:210
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:143
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:304
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:278
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:347
- [[Primary Types Index]] → /home/user/tsdoc-edge/managed/primary-types/index.md:403
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:230
- [[Types Index]] → /home/user/tsdoc-edge/managed/types/index.md:348
- [[Utilities Index]] → /home/user/tsdoc-edge/managed/utilities/index.md:418
- [[Workflows Index]] → /home/user/tsdoc-edge/managed/workflows/index.md:195

