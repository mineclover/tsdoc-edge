# CLI 명령어 XML 출력 통일 작업

## 목적

### 왜 XML 출력으로 통일하는가?

1. **기계 판독성**: 스크립트, CI/CD 파이프라인, AI 에이전트가 명령어 결과를 파싱하고 처리
2. **구조화된 데이터**: 일관된 구조로 데이터 추출 및 분석 자동화
3. **도구 통합**: 외부 도구(Jenkins, GitHub Actions 등)와의 연동 용이
4. **하위 호환성**: `--human` 플래그로 기존 색상 터미널 출력 유지

### 구현 방식

- **기본 출력**: XML (기계 판독용). stdout에는 XML 문서 하나만 출력한다 (배너, 진행 메시지, ANSI 색상 없음)
- **`--human` 플래그**: 변환 전 기본 출력과 동일한 색상 터미널 출력
- **실패 경로**: "찾을 수 없음", 인자 오류, DB 없음 등은 기존의 일반 텍스트 오류와 종료 코드를 그대로 유지한다
- **통합 인터페이스**: `BaseCommand.printOutput()` 사용

```typescript
const isHuman = this.hasFlag(args, '--human');

if (isHuman) {
  // 기존 색상 출력 (변환 전 기본 출력과 바이트 단위로 동일해야 함)
  this.printHeader('Title');
  console.log(`${colors.green}${data}${colors.reset}`);
} else {
  this.printOutput('command-name', {
    summary: { total: items.length },
    items: items.map((item) => ({ id: item.id, name: item.name })),
  }, args);
}
```

### printOutput 작성 규칙

- 루트 태그는 kebab-case 명사(`undocumented-symbols`), 섹션 키는 camelCase
- 값이 객체/객체 배열이면 중첩 섹션으로 렌더링된다 (`<path count="2"><item index="1">…`).
  문자열 배열은 쉼표로 이어진 문자열, 빈 배열은 빈 요소가 된다
- **`undefined`는 건너뛰지 않고 빈 요소(`<x></x>`)로 출력된다.** 선택 필드는 조건부 spread로 생략한다
- **모든 값이 배열인 객체 섹션은 "그룹 섹션"으로 해석된다** (`<group name="…">`). 의도한 경우가 아니라면 스칼라 필드를 함께 둔다
- 큰 리포트(수십만 줄)도 안전하다: 줄 추가에 spread를 쓰지 않는다
- 이름으로 심볼을 해석하는 명령은 `resolveSymbol(db, name, { quiet: !isHuman })`로 호출해 `Selected: …` 안내가 XML에 섞이지 않게 한다
- CLI 종료 시 stdout/stderr를 비운 뒤 종료한다 (`exitAfterFlush`). 파이프로 큰 XML을 받아도 잘리지 않는다

## 진행 현황

### ✅ Phase 1: 인프라 준비 (완료)
- [x] BaseCommand에 printOutput() 메서드 추가
- [x] 동적 XML 생성 (배열, 그룹화된 배열, 중첩 객체/배열 지원)
- [x] XML 이스케이프 처리
- [x] 대용량 출력(스택 오버플로), 파이프 출력 잘림, 이름 선택 안내 문구 혼입 수정

### ✅ Phase 2: 핵심 명령어 변환 (완료)
- [x] StatsCommand, HealthCommand, IdCommand, RelationshipQueryCommand

### ✅ Phase 3: 나머지 명령어 변환 (완료)

## 변환 결과

`명령 → 루트 태그` (명령 파일은 `src/commands/<Name>Command.ts`)

### 품질 체크
- [x] Undocumented → `undocumented-symbols`, Untested → `untested-symbols`, Orphans → `orphans`
- [x] Validate(`val connectivity`) → `validation-report`, Lint → `lint-report` (`--json` 유지)
- [x] CoverageReport → `coverage-report` (`--json` 유지), CheckDuplicates → `content-similarity`
- [x] DetectDeadCode → `dead-code-detection`, FindUnusedDocs → `unused-documents`, FindMethod → `method-search`

### 빌드/파싱/문서
- [x] Build → `build-result` (변환 전부터 XML 전용, `BuildResultSchema`)
- [x] Parse → `parse-results`, IndexDocs → `index-results` / `index-update`, RebuildIndex → `rebuild-results`
- [x] GenerateDocs → `generate-docs`, UpdateBacklinks → `update-backlinks`, UpdateSymbolRefs → `update-symbol-refs`
- [x] ValidateDocs → `validate-docs`, ValidateGeneratedDocs → `validation-results`, ValidateSymbolRefs → `symbol-reference-validation`
- [x] CheckLinks → `link-check`, DocSymbols → `document-symbols` (`--llm` 유지)
- [x] Docs (라우터) — `--human`을 하위 명령에 전달

### 관계 분석
- [x] RelationshipImpact → `relationship-impact`, RelationshipPath → `relationship-path`
- [x] RelationshipClusters → `relationship-clusters`, RelationshipMetrics → `relationship-metrics`
- [x] AnalyzeRelationships → `analyzer-list` / `relationship-analysis`, RelationshipCheck → `relationship-check` (`--json` 유지)
- [x] RelationshipStats → `relationship-stats`, RelationshipValidate → `relationship-validation`
- [x] RelationshipExport / RelationshipVisualize → `--output` 사용 시 `relationship-export` / `relationship-visualization` 요약. `--output` 없이 출력하는 그래프 본문(graphml, dot, mermaid, json, csv)은 그대로 둔다
- [x] TypeChain → `type-dependency-tree` / `type-chain` / `root-types` / `circular-types`
- [x] TestRelationships → `test-relationship-analysis`
- [x] Relationship (라우터)

### 심볼/분석
- [x] SymbolQuery → `symbol-list` / `symbol-search` / `symbol-info` / `symbol-backlinks` / `similar-symbols` / `symbol-statistics`
- [x] SymbolFix → `symbol-fix`, SymbolRename → `symbol-rename`, SymbolUnified (라우터)
- [x] Analyze → `code-analysis`, Suggest → `improvement-suggestions`, Fix → `doc-fix`, Improve → `recursive-improvement`
- [x] QueryInferred → `inferred-relationships`, PromoteSymbol → `promote-symbol`, Move → `move-file`
- [x] Deps, WhoUses, Hubs, Layers, Common, Endpoints, HttpEndpoints, Routes, Blocks (변환 전부터 XML)

### 명세/온톨로지/태스크
- [x] SpecBump → `spec-bump`, SpecDiff → `spec-diff`, SpecHistory → `spec-history`
- [x] SpecStatus → `spec-status-show` / `-promote` / `-ready` / `-stats`, ValidateSpec → `spec-validation`
- [x] OntologyList → `ontology-node-list` / `ontology-relationship-list`, OntologyStats → `ontology-statistics`
- [x] TaskCommands → `task-list` / `task-created` / `task-updated` / `task-statistics`
- [x] Spec, Ontology, Task, ValidateUnified (라우터)

### 탐색/상태/컨텍스트
- [x] Tree → `symbol-tree`, CoreApi → `core-api`, ExploreEntrypoint → `entrypoint-exploration`
- [x] Plans → `future-plans`, Todos → `todos`, VisualizeDeps → `dependency-visualization`
- [x] ParseMermaid → `mermaid-parse`, ParallelWork → `parallel-work`
- [x] SystemStatus → `system-status`, TestExamples → `test-examples`, SyncCoverage → `sync-coverage`
- [x] Usage → `usage-report` / `usage-errors` / `usage-export` / `usage-clear`, PreCommitRun → `pre-commit-results`
- [x] DesignContext → `design-context` (`--llm` 유지)
- [x] WorkContext — 변환 전부터 XML 기본(`XMLContextGenerator`), `--human`/`--llm` 유지

## 변환 제외 (의도적)

| 명령 | 이유 |
|------|------|
| HelpCommand, RelationshipHelpCommand | 도움말 화면 (사람 전용) |
| InitCommand | 프로젝트 초기화 (대화형) |
| InstallHookCommand, UninstallHookCommand | 훅 설치/제거 (대화형). 설치되는 훅은 `pre-commit-run --human`을 실행한다 |
| ConventionCommand, ConventionCheckCommand | 이미 `--json` 기계 판독 모드가 있고 `scripts/prove-convention-poc.cjs`가 의존한다 |
| SpecExtractCommand | `--json` 기계 판독 모드 |
| CommandRegistry, BaseCommand | 인프라 |

## 알려진 선재 이슈 (이 작업에서 고치지 않음)

- `orphans`(정확 모드), `parallel-work`, `test-relationships`: `new DatabaseManager(dbPath, '')`가 `mkdir ''`에서 실패한다
- `move`는 문서화된 `--dry-run`/`--yes`를 읽지 않고, 대상 디렉터리가 없으면 참조를 고친 뒤 실패한다
- `package.json`의 `rel:*` 스크립트와 `scripts/relationship/*.sh`는 등록되지 않은 `relationship-impact` 같은 평면 명령 이름을 호출한다 (`relationship impact`가 올바른 호출)
- `relationship metrics --metric pagerank`는 검증은 통과하지만 정렬 키가 `pageRank`와 달라 정렬되지 않는다
- `UndocumentedCommand.ts` 끝에 TreeCommand 문서 주석이 남아 있다

## 변환 체크리스트

각 명령어 변환 시 확인 사항:

- [x] `this.hasFlag(args, '--human')` 분기 추가
- [x] XML 출력 시 `this.printOutput()` 사용
- [x] 색상 출력 로직을 `--human` 분기로 이동 (기존 출력과 동일하게 유지)
- [x] 빈 결과/에러 케이스 처리
- [x] positional args 파싱 시 `--human` 제외
- [x] `getUsage()`에 `--human` 옵션 문서화
- [x] 빌드/타입체크/린트 통과
- [x] 테스트: XML 기본, `--human`, 에러 경로
- [x] 실제 실행: 변환 전 빌드의 기본 출력과 새 빌드의 `--human` 출력 비교, 새 기본 출력의 XML 유효성 확인

## 통계

- **명령 파일**: 97개 (`src/commands/*Command*.ts`)
- **XML 기본 출력**: 79개 (`printOutput`/`XmlBuilder`) + 라우터 7개 + WorkContext(변환 전부터 XML)
- **제외**: 8개 (도움말/대화형/`--json` 전용) + 인프라 2개
