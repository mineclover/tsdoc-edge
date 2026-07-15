---
title: Semantic Graph Spec Governance Roadmap
type: workflow
category: workflows
status: active
canonical: true
---

# [[Semantic Graph Spec Governance Roadmap]]

> TypeScript 7 canonical graph를 구현 증거로 사용해 spec, code, test의 정합성을 검증하는
> 현재 실행 로드맵. 완료 checkpoint는 [[Semantic Graph Spec Governance Completed Work]],
> 날짜별 변경은 [[Semantic Graph Spec Governance Changelog]]에서 관리한다.

**Status**: Active implementation and release qualification
**Reference provider**: `ttsc` + `@ttsc/graph`
**Compatibility target**: TypeScript 7 semantics
**Primary consumers**: CLI, LSP, CI, `work-context`
**Last reviewed**: 2026-07-14

이 문서는 아직 해야 할 일, 보류 항목, release blocker와 각 항목의 다음 proof만 소유한다.
완료된 구현 설명과 과거 결정은 이 문서에 다시 복사하지 않는다.

## 한 화면 상태

| 구분 | 현재 상태 |
| --- | --- |
| Now | Node 24 Ubuntu/macOS 실제 release qualification과 C2 capability owner matrix |
| Next | mutating CodeAction contract → validator → protocol acceptance matrix → stable release 판정 |
| Active | external release qualification, C2 owner evidence 수집 |
| Deferred | ttsc graph-lint/spec parity for unsaved LSP, mutating CodeAction implementation/unsaved spec authoring, historical Explain/Open |
| Release | workflow wiring 완료; 실제 runtime/packed matrix 통과 전 stable release NO-GO |
| No-go | 두 번째 runner/provider, generic adapter/DSL, convention distribution registry |

## 제품 목표와 비목표

M1은 [[AuthoredProjectSpecifications]]를 포함한 project가 작성한 spec, code, test evidence와 TSDoc enrichment를 하나의 saved CLI/CI
check에서 정확한 revision pin으로 검증하는 것이다. 모든 input은 같은 check/report/gate
identity에 들어가야 하며, managed document가 project spec/binding의 authored SSOT가 된다.

유지할 비목표:

- legacy와 canonical graph의 영구 이중 SSOT
- graph-router 안의 spec lifecycle 또는 TSDoc parser 재구현
- 첫 release의 모든 언어, framework와 test runner 지원
- C2 판정 전 TS5 Compiler API consumer 일괄 제거
- LSP를 별도 graph producer로 유지하는 dual-write 경로

## 핵심 설계 결정

1. `ttsc` provider는 raw snapshot/delta와 compiler fact를 소유한다.
2. `ProviderSnapshotNormalizer`와 `ProjectIndexer`가 canonical identity와 revision을 만든다.
3. `GraphRepository`는 canonical code revision만 저장하며 legacy symbol DB와 분리된다.
4. code, spec, evidence, enrichment, policy와 overlay는 서로 다른 의미·revision plane이다.
5. `EffectiveAnalysisService`가 exact input을 합성한 뒤 binding/evaluator를 실행한다.
6. LSP는 canonical/effective view의 consumer이며 저장 graph producer가 아니다.
7. compiler version은 provider provenance가 보고할 때만 기록하고 dependency 버전으로 추정하지 않는다.
8. legacy production path는 C2 owner 판정과 external full pilot 전까지 제거하지 않는다.

## 현재 capability 상태

| Surface | Maturity | 현재 증거 | 다음 gate |
| --- | --- | --- | --- |
| Saved canonical graph | `proven` (source-checkout) | router → indexer → repository + `canonical-graph status|list|read` | release matrix |
| GraphDelta workspace view | `proven` (read-only) | content-addressed delta, multi-file effective composition, dirty/save generation guards와 LSP query 회귀 테스트 | ttsc graph-lint/spec parity smoke |
| All-surface structural equivalence | `deferred` | CLI/CI saved path 우선, LSP 비교 보류 | LSP 재개 후 position/name/ID/impact equivalence |
| Legacy baseline/differential | `proven` (C1 + broader fixtures) | versioned work-context comparator, parity 4/0 and 6/0, DB 불변 | C2 owner 판정 |
| Public provider boundary | `proven` (packed early canary) | provider snapshot/delta, packed canonical pilot, revision inspection | release matrix |
| Spec repository | `proven` (source-checkout) | `spec extract` + `spec graph status|list|read` + `convention check --spec-db` | release matrix |
| Managed-doc extraction | `proven` (source-checkout) | `spec extract` + policy-only pack + duplicate/provenance gate | release matrix |
| Convention loop | `proven` (packed core fixture) | implementation/verification/naming/TSDoc/evidence check | release matrix |
| Coverage metric report/baseline gate | `proven` (source-checkout) | immutable report list/read, baseline save/compare/list/read, direct-evidence convention gate | release matrix |
| Evidence revision/store | `proven` (source-checkout) | `convention check --input-revisions-db` + read-only `convention inputs list|read` | retention policy review / release matrix |
| Jest evidence check | `proven` (source-checkout) | source-mapped artifact와 status/exit canary | Node/OS release qualification |
| Naming evaluator | `proven` (source-checkout) | location-aware evaluator, replay canary와 1,014/0 migration proof | Node/OS release qualification |
| Enrichment revision/store | `proven` (source-checkout) | TSDoc enrichment와 exact store/read-only inspection | 승인된 추가 provider가 생길 때만 별도 checkpoint |
| Durable result history | `proven` (source-checkout) | append-only bundle, retained replay와 pin/tombstone GC | Node/OS release qualification |
| LSP spec experience | `proven` (source-checkout) | saved diagnostic/graph-lint projection, managed-doc action, effective overlay query path | ttsc parity와 historical view |
| Packed package consumer | `proven` (packed canary) | fresh install/init/build/work-context | release matrix |
| External library pilot | `proven` (packed + self) | CLI/public API parity, report/baseline list/read, retention lifecycle, persisted state 불변 | release matrix |

완료 proof의 상세와 정확한 명령은 [[Semantic Graph Spec Governance Completed Work]]에 있다.

## Active backlog

### R1 — Node/OS release qualification

`release.yml`은 다음 순서로 publish를 차단한다.

1. Ubuntu/macOS × Node 24에서 runtime contract와 `typecheck`를 실행한다.
2. `--runInBand`와 `--maxWorkers=2`, 두 번의 반복 test를 실행한다.
3. 별도 Ubuntu/macOS job에서 clean build와 fresh packed-consumer canary를 실행한다.
4. publish job에서도 platform toolchain/lint와 qualified in-band smoke test를 재확인한다.
5. 모든 matrix와 publish preflight가 통과한 뒤에만 publish를 시작한다.

로컬에서 재현할 수 있는 preflight는 다음과 같다.

```bash
npm run verify:release-preflight
npm run verify:release-preflight-repeat
```

이 명령은 성공/실패 모두 `.test-results/release-preflight-<pid>.json`에 contract `1.2`
단계별 envelope를 저장한다. 다른 경로가 필요하면
`TSDOC_EDGE_RELEASE_PREFLIGHT_OUTPUT=/path/to/evidence.json`으로 지정할 수 있다. 실패
envelope는 `failedStep`, exit code와 완료된 단계까지 보존하며, 이 artifact도 외부 runner
matrix 통과를 대체하지 않는다.

저장된 envelope는 다음 read-only inspector로 재실행 없이 검증할 수 있다. 인자를 생략하면
가장 최근 파일을 선택하며, 운영 handoff에서는 `--path`로 exact 파일을 고정한다.
evidence를 저장하지 못하면 preflight도 성공하지 않으며, 이 스크립트는 호출 위치와 무관하게
repository root에서 각 단계를 실행한다.

```bash
npm run verify:release-preflight-envelope
npm run verify:release-preflight-envelope -- --path .test-results/release-preflight-41285.json
```

외부 qualification은 현재 CI의 `workflow_dispatch`로 선택한 branch를 기준으로 수동 실행할 수
있다. 이 진입점도 push/PR matrix와 같은 Ubuntu/macOS × in-band/worker-2 × 2회 계약을
사용하지만, 실제 runner 결과가 저장되기 전에는 release proof로 간주하지 않는다.

```bash
gh workflow run CI --repo mineclover/tsdoc-edge --ref <branch>
gh run watch --repo mineclover/tsdoc-edge <run-id> --exit-status
npm run verify:external-release-matrix -- --run-id <run-id> --sha <candidate-sha>
```

`verify:external-release-matrix`는 8개 test matrix job과 `publish-check`의 완료·성공 상태,
workflow 이름과 candidate SHA를 read-only로 확인한다. 현재 원격에 남아 있는 과거 CI run은
실패 상태이므로 release evidence로 인정하지 않는다.

개별 단계만 재실행할 때는 다음 명령을 사용한다.

```bash
npm run verify:runtime-contract
npm run verify:platform-toolchain
npm run verify:document-validation
npm run verify:canonical-safety
npm run verify:release-qualification
npm run typecheck
npm run build
npm run verify:package-tarball
```

로컬 proof는 GitHub runner matrix 통과를 대체하지 않는다. 현재 source-checkout의 최신
`verify:release-preflight`는 contract `1.2`의 14/15 단계를 통과한 뒤 worker-2에서
`EnhancedDocExtractor.test.js`의 간헐 macOS arm64 Node 24 SIGSEGV로 중단됐으며, 실패
evidence는 `.test-results/release-preflight-82408.json`이다. 같은 시점의 in-band와 worker-2
단독 재실행은 각각 240 suites/3,093 tests를 통과했다.

로컬 반복 운영 명령 `npm run verify:release-preflight-repeat`는 각 시도의 envelope를
검증하고 crash를 숨기지 않는다. 최신 기본 2회 반복은 두 attempt 모두 contract `1.2`의
15/15 단계와 in-band/worker-2 각각 236 suites/3,080 tests를 통과했다. repeat summary는
`.test-results/release-preflight-repeat-1783991103596-69830.json`이며, 각 attempt의 exact
envelope도 함께 보존한다. 따라서 남은 R1 gate는 외부
Ubuntu/macOS × in-band/worker-2 × 2회 clean-install matrix와 native-crash-free 결과이며,
stable release와 C2 owner 승격은 그 결과 전까지 보류한다. 과거 실행 상세는
[[Semantic Graph Spec Governance Changelog]]와 [[Semantic Graph Spec Governance Completed Work]]에만 기록한다.

### C2 — Capability owner matrix

C1 fixture만으로 legacy analyzer 제거를 확대하지 않는다. capability별로 아래 envelope를
versioned artifact로 채운 뒤 owner를 판정한다.

현재 source-checkout candidate는
[`capability-owner-matrix.v1.json`](../../scripts/fixtures/capability-owner-matrix.v1.json)이며,
각 capability의 required evidence와 의도적 누락 failure canary를 다음 명령으로 검증한다.

```bash
npm run verify:c2-capability-matrix
```

외부 matrix가 통과한 뒤에만 C2 owner 승격 가능성을 함께 확인할 수 있다. 이 명령은 fixture나
production state를 변경하지 않고 `ownerPromotionEligible: true`를 산출한다.

```bash
npm run verify:c2-capability-matrix -- \
  --external-matrix-run-id <run-id> --external-matrix-sha <candidate-sha>
```

검증 결과는 4개 capability, 2개 versioned fixture와 9개 failure canary를 모두 확인하며,
matrix 자체나 production state를 변경하지 않는다. 또한 각 capability가 packed ttsc provider
canary contract `tsdoc-edge/ttsc-provider-packed-canary@1.6`를 참조하고, canary source가
동일한 contract ID/version과 요구 proof key를 선언하는지 정적으로 확인한다. 이는 source-checkout
계약 연결 검증이며 실제 외부 runner 실행 결과를 대체하지 않는다. 두 fixture는 기존 4-symbol class/method
slice와 6-symbol interface/class/function slice이며, 각각 differential comparator로 parity와
read-only state 불변까지 실행한다.

이 candidate는 canonical topology/identity의 owner 방향을 `superseded`, enrichment를
`retained`, work-context 결과를 `composed`로 기록한다. `status: candidate`이므로 실제
Ubuntu/macOS release matrix proof 전에는 legacy production removal을 승격하지 않는다.
broader fixture와 9개 failure canary의 source-checkout proof는 완료됐지만, 외부 runner
재현성까지 포함한 owner 승격은 아직 남아 있다.

| Required evidence | 내용 |
| --- | --- |
| Producer declaration | provider/legacy producer가 주장하는 capability와 version |
| Raw observation | 원본 artifact 또는 legacy output의 보존된 관찰 |
| Router-derived structure | router가 계산한 node/edge/diagnostic 구조 |
| Canonical mapping | canonical ID, evidence, revision과 mapping 결과 |
| Legacy parity | exact/normalized 차이, false positive/negative |
| Fixture | 재현 가능한 source와 expected output |
| Owner decision | `superseded` / `retained` / `composed` / `deprecated` / `unsupported` |

첫 확장 대상은 structural topology, symbol identity/position, documentation/test enrichment,
work-context output이다. owner가 `retained` 또는 `composed`라는 것은 의미 owner를 뜻하며,
legacy production implementation을 영구 보존한다는 뜻이 아니다.

완료 gate:

- capability마다 최소 2개 versioned fixture와 실패 canary가 있다.
- canonical fact와 legacy enrichment의 차이가 limitation으로 기록된다.
- C2 결과가 없는 analyzer는 production removal 대상에서 제외된다.
- owner 판정 후 canonical/enrichment owner와 migration proof를 별도로 만든다.

### P4 — Remaining product wiring

- 현재 제품 범위의 TSDoc enrichment provider와 revision/store wiring은 완료로 본다.
- 추가 enrichment provider가 실제 제품 요구로 승인될 때만 typed contract와 별도 checkpoint를
  추가한다. generic adapter/DSL과 provider registry는 no-go로 유지한다.

## C0/C1/C2 경계

### C0 — Canonical safety boundary

- schema-v1, alias/revision identity와 canonical refresh rollback/non-mutation은
  `verify:canonical-safety` source-checkout proof로 처리됐다.
검증 명령은 `npm run verify:canonical-safety`다. 남은 C0 backlog는 다음 하나다.

- ttsc graph-lint/spec input과 unsaved effective overlay의 동일 사양 평가

### C1 — 완료된 첫 baseline

`work-context`를 대상으로 versioned source fixture → restored legacy output → canonical output
→ exact/normalized legacy-only/compiler-only comparison을 통과했다. 기존 4-symbol fixture와
broader 6-symbol fixture 모두 parity 및 DB 불변 proof를 가지며, 상세는 완료 문서로 이동했다.
active scope에는 C2 owner 판정만 남긴다.

### C2 — 현재 owner 판정

- `superseded`: compiler fact가 더 정확해 legacy production path 제거 후보
- `retained`: TSDoc Edge 고유 spec/document 기능
- `composed`: compiler fact와 enrichment/spec 의미가 모두 필요
- `deprecated`: 중복 또는 제품 가치가 낮아 migration 후 제거
- `unsupported`: provider capability가 없어 limitation/backlog로 유지

## 보류 및 명시적 no-go

- historical Explain/Open과 LSP history picker
- retention GC의 UI promotion
- mutating CodeAction과 unsaved spec authoring
- 두 번째 test runner/provider와 generic adapter/DSL
- convention distribution registry
- C2와 external full pilot 전 legacy analyzer 제거

## Release promotion 조건

1. 실제 Node 24 Ubuntu/macOS runtime/typecheck/test/packed matrix 통과
2. canonical saved graph와 ttsc provider input이 provenance, exact identity와 replay gate 통과
3. managed docs가 project spec/binding의 유일한 authored SSOT
4. evidence, enrichment, naming과 spec binding이 같은 check/report/gate pipeline 사용
5. CLI와 CI가 같은 saved `EffectiveAnalysisStamp`와 finding 표시; LSP extension은 별도 재개 gate
6. retained input으로 과거 conformance exact lookup/recompute 가능
7. external TypeScript library가 repository-specific 예외 없이 install/index/CI workflow 통과
8. C2 결과에 따른 legacy production path 제거 또는 canonical enrichment 이관

## 관련 문서와 소유권

| 문서 | 소유 범위 |
| --- | --- |
| [[Semantic Graph Analysis and Relationship Model]] | graph/spec/evidence identity, relation, direction과 revision 계약 |
| [[ProjectIndexer]] | router/provider/indexer/package 경계와 canonical projection |
| [[Convention Pack Check]] | pack, CLI, report/gate와 evidence handoff |
| [[TS7 Test Compilation Lane]] | test pipeline, parity, runtime qualification과 rollback |
| [[LSP Integration]] | saved/unsaved view, diagnostics와 CodeAction |
| [[Spec Management System]] | managed document lifecycle와 completeness |
| [[Work Context Workflow]] | legacy/canonical comparison vertical slice |
| [[Semantic Graph Spec Governance Completed Work]] | 완료 checkpoint와 proof |
| [[Semantic Graph Spec Governance Changelog]] | 날짜별 결정과 변경 |
