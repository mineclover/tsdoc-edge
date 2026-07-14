---
title: Coverage Metrics Contract
type: feature
category: governance
status: active
canonical: true
source: src/convention/CoverageMetricPolicy.ts
---

# [[Coverage Metrics Contract]]

커버리지라는 이름으로 서로 다른 측정값을 혼용하지 않기 위한 canonical 문서다. 이 문서는
현재 구현을 하나의 완성된 커버리지 시스템으로 선언하지 않고, 각 측정값의 의미·소유자·증거
수준·`ttsc` canonical graph 연계 상태를 고정한다.

## Scope

TSDoc Edge에서 `coverage`는 다음 측정값을 포함할 수 있다.

| Metric ID | Meaning | Primary source | Current status | Canonical graph |
| --- | --- | --- | --- | --- |
| `execution.line` | 실행된 소스 라인 비율 | Istanbul/NYC, `CoverageParser` | Implemented parser | Yes, inferred file attribution |
| `execution.function` | 호출된 함수 비율 | Istanbul/NYC, `CoverageParser` | Implemented parser | Yes, direct range POC |
| `execution.branch` | 실행된 분기 비율 | Istanbul/NYC, `CoverageParser` | Implemented parser | Yes, inferred file attribution |
| `test.symbol` | 테스트 심볼이 구현 심볼을 검증하는 비율 | `TestCoverageAnalyzer`, `test-coverage` | Canonical build report, inferred | Yes, report-only |
| `test.scenario` | 테스트 케이스가 시나리오를 덮는 비율 | `covers-scenario` extraction | Partial, inferred | No |
| `test.integration` | 통합 지점이 통합 테스트로 검증되는 비율 | `IntegrationVerificationAnalyzer` | Partial, legacy analyzer | No |
| `documentation.symbol` | 구현 심볼에 `@doc` 연결이 있는 비율 | `coverage-report` | Canonical projection POC, direct/inferred | Yes, report-only |
| `quality.health` | 문서·테스트·품질을 합산한 health score | `CodeHealthMetrics` | Implemented, legacy analyzer | No |
| `relationship.type` | 관계 타입별 추출·저장 완성도 | relationship roadmap/statistics | Historical/partial | Not a ttsc graph metric |
| `graph.policy` | canonical graph가 명시된 구조 규칙을 만족하는지 | upstream `ttsc graph-lint` | Implemented saved-lane gate + packed canary | Yes |

`graph.policy`는 비율형 coverage가 아니다. 이것은 `ttsc graph-router`가 평가한 구조 규칙의
통과/위반 결과이며, convention report와 gate에 참여할 수 있는 graph-quality metric이다.

## Terminology rules

- `coverage-report`는 **테스트 커버리지 명령이 아니다**. 현재 구현은 소스 심볼의 `@doc` 태그를
  측정하므로 `documentation.symbol`로만 부른다.
- 실행률은 `execution.line`, `execution.function`, `execution.branch` 중 하나를 명시한다.
  단순히 `test coverage`라고 표기하지 않는다.
- 테스트 파일과 구현 심볼의 연결은 `test.symbol`이다. AST 실행률과 동일한 의미로 해석하지
  않는다.
- 통합 테스트 검증은 `test.integration`, 시나리오 매핑은 `test.scenario`로 구분한다.
- `quality.health`는 coverage percentage가 아니라 여러 품질 지표를 합산한 score다.
- 과거 다이어그램·로드맵의 숫자는 `historical`로 취급하며 현재 baseline으로 재사용하지 않는다.

## Metric result shape

새 메트릭 어댑터는 다음 의미를 보존해야 한다. 구현 언어의 구체적인 타입은 각 어댑터가
정하지만, 분자·분모·증거·입력 identity를 생략한 percentage만 저장해서는 안 된다.

```json
{
  "contractId": "tsdoc-edge/coverage-metric-result",
  "contractVersion": "1.0",
  "metricId": "test.symbol",
  "metricKind": "ratio",
  "subject": {
    "workspaceId": "acme-platform",
    "graphNamespace": "acme/ts7"
  },
  "source": {
    "adapterId": "tsdoc-edge/test-coverage-adapter",
    "revisionId": "canonical-revision:<sha256>",
    "graphFingerprint": "sha256:<sha256>",
    "inputKind": "legacy-database|canonical-graph|istanbul-report"
  },
  "value": {
    "numerator": 103,
    "denominator": 498,
    "ratio": 0.2068,
    "unit": "fraction"
  },
  "evidence": {
    "status": "direct|inferred|estimated|historical|planned",
    "confidence": 0.8,
    "capturedAt": "2026-07-14T00:00:00.000Z"
  },
  "policy": {
    "threshold": 0.8,
    "gate": "report-only|warning|error|unsupported"
  }
}
```

`graphFingerprint`와 `revisionId`는 canonical graph를 사용한 메트릭에 필수다. Istanbul 또는
legacy DB 입력에는 해당 필드가 없을 수 있지만, 대신 `inputKind`와 원본 report/database
identity를 기록해야 한다.

## Current implementation map

### Execution coverage

`src/analyzer/CoverageParser.ts`는 Jest, Vitest, NYC, c8 계열 Istanbul JSON에서 파일별 line,
function, branch, statement coverage를 파싱한다. `parseWithIdentity()`는
`src/metrics/CoverageMetricContract.ts`의 source identity와 분자·분모 metric envelope를
함께 반환한다. `SyncCoverageCommand`는 이 결과를 별도
`CoverageMetricReportRepository`에 저장한다. 이 구현은 Phase 2의 report identity 수직
슬라이스다. graph revision을 선택한 호출자가 파일·함수 범위 projection을 별도로 수행하며,
저장된 report 자체는 graph revision에 종속되지 않는다. `sync-coverage --canonical-graph-db`
가 호출될 때 선택된 revision으로 projection 요약을 출력한다.

따라서 현재 상태는 다음과 같다.

- 실행률 파싱: `implemented`
- report source identity 및 `execution.*` projection: `implemented, Phase 2 slice`
- file-level evidence 보존: `implemented, fileMetrics`
- canonical node file attribution: `implemented, inferred/report-only`
- symbol-range 함수 실행률 매핑: `implemented, direct/report-only`
- convention gate eligibility: `CoverageMetricGate` and `CoverageMetricPolicy` implemented for the
  `convention check` path; direct evidence may enter warning/error gates and inferred evidence is
  `unsupported`
- convention ratio thresholds: `convention check --coverage-thresholds metric.id=fraction` is
  implemented; direct evidence below the explicit minimum is `violated`, while non-direct evidence
  remains `indeterminate`

### Symbol test coverage

`TestCoverageAnalyzer`는 테스트 케이스에서 구현 심볼로의 `test-coverage`와
`covers-scenario` 관계를 추출한다. 이 값은 import/name matching과 assertion metadata에
기반한 관계 추정이며 Istanbul 실행률과 동일하지 않다.

현재 관계 문서와 analyzer는 유지하며, `BuildCommand --canonical-graph`가 생성한 관계 결과를
`projectTestCoverageToCanonicalNodes()`로 canonical node ID와 graph revision에 연결한다.
legacy relationship target은 같은 graph revision에 저장된 canonical↔legacy alias로 먼저
해석하며, alias가 없거나 충돌하면 unmatched로 보존한다. 관계 매칭은 추정치이므로 결과는
`mappingKind: test-relation`, `evidence.status: inferred`, `gate: report-only`다. 구현 심볼별
관계가 없으면 `uncoveredSymbols`, canonical graph에 없는 관계 대상은
`unmatchedRelationTargets`로 보존한다.

### Canonical execution projection

`src/metrics/CanonicalCoverageProjection.ts`는 저장된 `fileMetrics`를 canonical graph node의
source file에 연결한다. 파일 안의 모든 심볼이 실행되었다는 뜻이 아니므로 결과는
`mappingKind: file-attributed`, `evidence.status: inferred`, `gate: report-only`로 고정한다.
호출자는 반드시 저장된 `graphRevisionId`와 `graphFingerprint`를 함께 제공해야 하며, 파일과
graph node가 매칭되지 않은 report 파일은 `unmatchedFiles`로 보존한다.

함수 범위 projection은 같은 source file에서 함수명 또는 qualified name과 node의 line range가
동시에 일치할 때만 `mappingKind: symbol-range`, `evidence.status: direct`로 승격한다. 다중
후보는 가장 좁은 line range를 선택하고, 애매하거나 범위를 확인할 수 없는 함수는
`unmatchedFunctions`에 남긴다. 이 결과도 현재는 `report-only`이며 convention gate 입력으로
사용하지 않는다.

### Documentation coverage

`coverage-report`는 `DatabaseManager`의 심볼 목록을 읽고 `@doc` 태그를 파싱한다. 따라서
`documentation.symbol`의 legacy implementation으로 분류한다. `explore-entrypoint`의
문서 도달률과도 다른 값이다.

`coverage-report --canonical-graph-db <file>`는 legacy `@doc` scan을 score envelope로 만들고
`projectDocumentationCoverageToCanonicalNodes()`로 같은 source file의 canonical node에
투영한다. 파일·이름·line range가 일치하면 `direct`, 이름만으로 유일하게 매칭되면
`inferred`로 기록하며 둘 다 현재 `report-only`다. 매칭되지 않은 score와 node는 각각
`unmatchedScores`, `unmatchedNodes`에 남겨 legacy 결과의 손실을 막는다.

### Quality health

`CodeHealthMetrics`는 문서화 수, 파일 테스트 존재 여부, 평균 품질 점수를 조합해 health
score를 만든다. 이 score는 의사결정용 summary이지 독립된 실행 커버리지 또는 심볼 테스트
커버리지의 대체값이 아니다.

### Integration verification

`IntegrationVerificationAnalyzer`는 legacy `SymbolGraph`와 test-file discovery를 사용해
`integration-verification` 관계를 만들 수 있다. 다만 현재 contract 기준의 persisted metric
report, execution result evidence, canonical graph revision 연결은 제공하지 않으므로
`test.integration`은 `partial`이며 gate 입력이 아니다.

### Canonical graph policy

`ttsc graph-lint`는 커버리지 비율을 산출하지 않지만, canonical graph의 구조 품질을 동일한
convention report/gate에 연결한다. traversal과 matcher는 upstream `ttsc graph-router`가
소유하고, TSDoc Edge는 결과를 normalization/projection만 한다. source-checkout POC와 packed
provider canary에서 CLI/public library parity와 zero-violation gate를 검증한다.

```bash
export TSDOC_EDGE_GRAPH_LINT_MODULE=/path/to/ttsc-graph-router/dist/index.js
tsdoc-edge convention check \
  --pack managed/conventions/tsdoc-edge-core.json \
  --graph-lint-rules managed/conventions/tsdoc-edge-graph-lint.json \
  --fail-on error
```

이 결과는 `graph.policy`로 기록하며 `graphFingerprint`, rule identity, finding identity를
보존한다.

## Policy for reports and baselines

1. 모든 비율은 분자와 분모를 함께 출력한다.
2. `estimated`, `inferred`, `historical` 값은 `direct` 값과 합산하지 않는다.
3. revision 또는 source report identity가 없는 값은 CI baseline으로 고정하지 않는다.
4. gate에 참여하지 않는 값은 `report-only` 또는 `unsupported`로 명시한다.
5. `2025-*` 등의 과거 수치를 현재 상태 표에 복사하지 않는다. 필요한 경우 `historical`
   snapshot임을 제목과 표에 함께 표시한다.
6. canonical graph 메트릭은 graph fingerprint가 바뀌면 새 결과 identity를 생성한다.
7. lint 결과와 coverage ratio는 하나의 숫자로 합산하지 않는다. 필요하면 별도 scorecard에서
   각 plane을 나란히 표시한다.

## Migration order

| Phase | Action | Exit condition |
| --- | --- | --- |
| 1 | 문서 용어와 상태를 이 계약에 맞춰 정리 | 주요 coverage 문서가 metric ID와 상태를 참조 |
| 2 | legacy DB/Istanbul 결과에 source identity 추가 | 재현 가능한 report 생성 |
| 3 | execution·test·documentation evidence를 canonical node ID로 투영 | graph fingerprint와 direct/inferred 경계 보존 |
| 4 | direct evidence가 있는 metric만 convention 정책에 연결 | `CoverageMetricGate`가 inferred를 `unsupported`로 차단 |
| 5 | trend/baseline 저장소 추가 | 동일 metric ID·단위·입력 identity로 diff 가능 |

Phase 1 문서 정리는 완료되었고, Phase 2로 Istanbul report source identity, immutable report
저장, fileMetrics 보존, canonical node file/function attribution을 구현했다. 이어서
`test.symbol`, `documentation.symbol`의 canonical projection POC와 execution/documentation/
build report 출력 연결을 추가했으며, 세 metric plane 모두 현재 `report-only`다.
`CoverageMetricGate`는 direct evidence와 graph revision/fingerprint가 모두 있는 경우에만
warning/error 승격을 허용하고, inferred evidence는 `unsupported`로 차단한다.
`convention check --coverage-report-id --coverage-gate`가 이 resolver를 제품 gate에 연결하며,
`CoverageMetricPolicy`는 report identity와 metric별 판단을 history replay에 보존한다. 기존
coverage analyzer와 문서는 이관 전까지 삭제하지 않고 legacy/partial 또는 historical 상태로
유지한다. Phase 5 trend/baseline 저장소와 explicit compare/list/read 운영 경로도 현재
source-checkout 및 packed canary에서 구현되었으며, LSP 기반 동기화는 이 계약의 범위가 아니다.

### Baseline and trend persistence

`src/metrics/CoverageMetricBaseline.ts`는 metric snapshot을 content-addressed
`coverage-baseline:sha256:*` revision으로 만든다. `CoverageMetricBaselineRepository`는 이
revision을 immutable payload로 보존하며, workspace와 baseline ID를 함께 pin으로 사용한다.
같은 payload는 idempotent하게 재사용되고, 다른 payload가 같은 ID를 주장하면 거부된다.

비교는 metric ID와 `fraction` 단위, adapter ID, input kind, report format, workspace를
고정했을 때만 수행한다. canonical graph를 사용한 경우에는 graph revision과 graph fingerprint도
입력 경계에 포함한다. 실행 report의 digest와 capture time은 관측값이므로 trend 비교를 막지
않지만, graph revision이 바뀌거나 현재 관측에서 metric이 빠지면 결과를 `uncomparable`로
남긴다. 비교 결과는 `improved`, `declined`, `unchanged`, `uncomparable`과 ratio delta를
함께 제공한다.

현재 baseline API는 저장·읽기·순수 비교까지 제공하며, CLI에서 “현재 baseline”을 자동으로
선택하는 mutable pointer는 만들지 않는다. 운영자는 `coverage-baseline`으로 명시적인 baseline
ID를 저장·비교·조회한다. `list|read`는 baseline DB를 read-only로 열고 active baseline을
추정하지 않는다.

동일하게 `coverage-report list|read`는 `CoverageMetricReportRepository`의 immutable report를
workspace와 exact report ID로 조회한다. `list`는 report pin만, `read`는 source identity와
metric/file metric payload를 반환하며 report DB를 read-only로 연다. 따라서 baseline을 만들거나
convention gate에 연결하기 전에 실제 저장된 report 입력을 CLI에서 검증할 수 있다.

```bash
tsdoc-edge coverage-baseline save \
  --report-id coverage-report:<source-identity> \
  --report-db .tsdoc/coverage-metrics.db \
  --baseline-db .tsdoc/coverage-baselines.db \
  --json

tsdoc-edge coverage-baseline compare \
  --report-id coverage-report:<source-identity> \
  --baseline-id coverage-baseline:sha256:<digest> \
  --report-db .tsdoc/coverage-metrics.db \
  --baseline-db .tsdoc/coverage-baselines.db \
  --json

tsdoc-edge coverage-baseline list \
  --workspace <workspace-id> \
  --baseline-db .tsdoc/coverage-baselines.db --json

tsdoc-edge coverage-baseline read \
  --workspace <workspace-id> \
  --baseline-id coverage-baseline:sha256:<digest> \
  --baseline-db .tsdoc/coverage-baselines.db --json
```

canonical graph 입력을 기준선에 포함하려면 `--graph-revision`과
`--graph-fingerprint`를 함께 지정한다. 두 값 중 하나만 지정하는 입력은 거부한다.

## Related documents

- [[CoverageReportCommand]]: `documentation.symbol` report
- [[Test Coverage]]: `test.symbol` relationship
- [[TestCoverageAnalyzer]]: test relationship extraction
- [[Integration Verification]]: `test.integration` design
- [[CodeHealthMetrics]]: `quality.health` summary
- [[Relationship System Roadmap]]: relationship implementation history; not a current metric baseline
- [[Convention Pack Check]]: `graph.policy` gate integration
