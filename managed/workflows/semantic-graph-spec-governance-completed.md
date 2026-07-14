---
title: Semantic Graph Spec Governance Completed Work
type: workflow
category: workflows
status: active
canonical: true
---

# [[Semantic Graph Spec Governance Completed Work]]

이 문서는 [[Semantic Graph Spec Governance Roadmap]]에서 완료된 checkpoint와 실제 proof를
보존하는 reference 문서다. 아직 다음 gate가 남은 항목도 구현 checkpoint 자체가 닫혔다면
여기에 기록하고, 남은 작업은 roadmap의 active backlog에서만 관리한다.

## 완료 기준

`proven`은 범위를 붙여 기록한다. source-checkout proof, packed external proof와 실제
Node/OS release matrix 통과를 서로 확대 해석하지 않는다.

| 범위 | 상태 | 다음 gate |
| --- | --- | --- |
| P4.0 TS7 test lane | `proven` (repository-local) | Node/OS release qualification |
| P4.1 Jest evidence | `proven` (source-checkout) | Node/OS release qualification |
| P4.2 naming evaluator | `proven` (source-checkout) | Node/OS release qualification |
| P4.3 TSDoc enrichment | `proven` (source-checkout) | 승인된 추가 provider가 생길 때만 별도 checkpoint; generic adapter/DSL은 no-go |
| P4.4 managed-spec extraction | `proven` (source-checkout) | Node/OS release qualification |
| P4.5 durable result history | `proven` (source-checkout) | packed external proof and Node/OS release qualification |
| Analysis input revision store caller | `proven` (source-checkout) | retention policy review and Node/OS release qualification |
| Read-only input revision inspection | `proven` (source-checkout) | retention policy review and Node/OS release qualification |
| Canonical graph revision inspection | `proven` (source-checkout) | Node/OS release qualification |
| Spec graph revision inspection | `proven` (source-checkout) | Node/OS release qualification |
| Coverage report inspection | `proven` (source-checkout) | Node/OS release qualification |
| Coverage baseline inspection | `proven` (source-checkout) | Node/OS release qualification |
| Coverage metric contract and gate | `proven` (source-checkout) | Node/OS release qualification |
| LSP saved spec experience | `proven` (source-checkout) | historical view |
| LSP effective code overlay | `proven` (source-checkout) | ttsc graph-lint/spec parity와 mutating CodeAction은 별도 gate |
| ttsc provider/canonical graph early canary | `proven` (packed early canary) | Node/OS release qualification |
| Packed external saved CLI/CI pilot | `proven` (core fixture) | Node/OS release matrix |
| External library public API pilot | `proven` (packed + self repository) | Node/OS release matrix |
| C1 legacy baseline | `proven` (versioned fixtures) | C2 owner 판정 |
| C0 canonical safety proof | `proven` (source-checkout) | GraphDelta는 LSP 재개 후, 나머지는 Node/OS release matrix |
| ttsc test process-group hardening | `proven` (source-checkout) | clean-install native-crash-free matrix |
| Release preflight envelope inspector | `proven` (source-checkout) | external matrix and native-crash-free matrix |

## Checkpoint proof

### P4.0 — TS7 test lane

TS7 typecheck → AOT test compilation → JavaScript-only Jest 실행 경로를 고정했다. 현재 emitted
test surface는 235 suites / 3,072 tests이며, canonical/spec graph inspection을 포함한
targeted suites와 test typecheck는 통과했다.
이전 macOS Node 24 실행에서는 in-band와 `--maxWorkers=2`가 각각 native `SIGSEGV`로
종료된 기록이 있어 이 조건은 [[TS7 Test Compilation Lane]]의 외부 native-crash/reproducibility
gate로 남긴다.
로컬 `verify:release-preflight`가 전체 사전 단계 후 in-band native `SIGSEGV`로 중단된
직후, in-band와 `--maxWorkers=2` 단독 재실행은 각각 233 suites/3,059 tests를 통과했다.
따라서 preflight는 간헐 crash를 숨기지 않고 실패로 기록하며, 이 로컬 결과도 외부
Ubuntu/macOS 반복 matrix를 대체하지 않는다.
이후 canonical-safety proof를 포함한 14-step `verify:release-preflight`가 통과했고, 두 full
test lane도 각각 233 suites/3,059 tests를 통과했다. 이는 source-checkout 운영 gate proof이며
실제 GitHub Ubuntu/macOS 반복 matrix의 대체 증거는 아니다. 이후 `convention check`의
input-revision 저장/overwrite 보호 회귀 테스트와 read-only inspection 회귀 테스트까지의
이전 full in-band 기록은 233 suites / 3,062 tests passed이다.
가장 최근 동일 preflight 재실행은 ttsc/provider/canonical-safety/differential/C2 단계까지
통과한 뒤 macOS arm64 Node 24.18.0/V8 13.6/ABI 137의 in-band Jest가 `SIGSEGV`(exit 139)로
종료됐다. 실패 envelope는 `.test-results/test-runtime-failure-12310.json`에 exact command와
runtime을 보존하며, 간헐 native crash를 green으로 완화하지 않고 Node/OS release matrix
blocker로 유지한다.
canonical graph operator 회귀 테스트를 추가한 뒤의 독립 `npm test -- --runInBand`도 같은
Node/V8 native `SIGSEGV`로 종료됐고, 최신 진단 envelope는
`.test-results/test-runtime-failure-48224.json`이다. 새 command suite 자체는 targeted
2 suites/21 tests를 통과했으므로 기능 회귀와 runtime blocker를 분리한다.
최신 로컬 `npm run verify:release-preflight`는 Jest `silent`와
`workerIdleMemoryLimit: 256MB` 설정, parser source 연결과 document disposition 계약까지
반영한 뒤 ttsc/provider/canonical-safety/differential/C2 사전 단계와 in-band/worker-2 각각
236 suites/3,080 tests를 통과했다. contract `1.2` evidence는
`.test-results/release-preflight-35241.json`에 보존된다. 이는 local macOS arm64
단일 실행의 green proof이며, 외부 Ubuntu/macOS 반복 matrix와 clean-install native-crash-free
조건을 대체하지 않으므로 stable release promotion과 C2 owner 승격은 계속 보류한다.
이후 `npm run verify:release-preflight-repeat` 기본 2회 실행도 두 attempt 모두 contract `1.2`
15/15 단계와 in-band/worker-2 각각 236 suites/3,080 tests를 통과했다. repeat summary는
`.test-results/release-preflight-repeat-1783991103596-69830.json`에 보존되며, local repeat
gate를 닫았지만 외부 Ubuntu/macOS matrix와 C2 owner 승격은 여전히 별도 조건이다.

```bash
npm run typecheck
npm test -- --runInBand
```

### P4.1~P4.5 — conformance inputs and history

Evidence, naming, TSDoc enrichment, managed spec, retained input과 durable result history가
같은 revision-pinned convention check/gate 경로에 연결됐다. malformed input, source digest,
duplicate binding, tamper/collision과 retained replay canary가 source-checkout에서 통과했다.

P4.4 managed spec promotion is now wired: `spec extract` stores the Markdown projection, a
policy-only convention pack selects it with `--spec-db`, and managed-mode duplicate JSON spec
authoring is rejected. The resulting check retains the managed extractor provenance and exact
SpecGraph revision.
`spec graph status|list|read` exposes the same active marker, retained summary and exact payload
read-only while keeping managed Markdown as the authored SSOT.

Coverage metric persistence and operation wiring is also closed for the current ttsc-centered
product scope: source-identified reports are immutable, baselines are explicit and comparable, and
`convention check --coverage-report-id --coverage-gate` rejects inferred evidence from warning/error
gates while retaining the exact metric decision for replay. Explicit
`--coverage-thresholds metric.id=fraction` declarations also produce deterministic violated findings
for direct evidence below the minimum and retain the threshold in replay.

Retention lifecycle is now closed for the current product scope. `convention retention` exposes an
explicit list/pin/unpin/GC workflow, keeps exact historical lookup separate from the current
summary view, skips pinned rows, and records a payload digest in a versioned tombstone before
physical deletion. Read-only access to pre-retention history schemas remains compatible and does
not make legacy rows silently eligible for GC.

The exact input revision store now has a production-shaped CLI caller: `convention check
--input-revisions-db <file>` persists the three evidence/enrichment/policy pins emitted by the
check. The store remains pointer-free and is not read by retained replay; the durable history
envelope remains the historical authority. Source-checkout coverage includes write/read identity
and output overwrite protection. `convention inputs list|read` adds read-only metadata and exact
payload inspection without introducing an active pointer.

```bash
npm run test:run -- --runTestsByPath src/__tests__/storage/ConventionCheckHistoryRepository.test.ts --silent
```

```bash
npm run poc:convention
```

세부 계약은 [[Convention Pack Check]], [[TS7 Test Compilation Lane]],
[[Semantic Graph Analysis and Relationship Model]]이 소유한다.

### ttsc provider and canonical graph

provider snapshot/delta → normalizer → `ProjectIndexer` → `GraphRepository` 경계를 고정했다.
canonical ID는 namespaced relative path를 사용하고 compiler version은 provenance가 보고하지
않으면 `null`로 유지한다. LSP는 이 그래프의 별도 producer가 아니라 consumer로 남겼다.
운영자는 `canonical-graph status|list|read`로 active marker, retained revision metadata,
provenance와 exact graph envelope를 read-only로 확인할 수 있으며, 이 경로는 router를 다시
실행하거나 active pointer를 변경하지 않는다.

### Packed external saved CLI/CI pilot

fresh temporary consumer 두 곳에서 packed `tsdoc-edge`와 graph-router tarball을 설치하고,
canonical-only build, structural analysis, `work-context`, managed spec extraction, Jest
evidence, TSDoc enrichment, convention check와 legacy state 불변을 검증했다. 또한
`convention retention`의 list/pin/dry-run/unpin/GC lifecycle과 `coverage-report list|read`,
`coverage-baseline save/compare/list/read`(동일 graph revision/fingerprint와 exact report/baseline
payload)를 fresh packed consumer에서 검증했다.
`canonical-graph status|list|read`도 packed consumer의 active marker, retained summary와
exact revision payload와 packed ttsc graph-lint convention gate로 검증했으며 canary contract는
`1.6`으로 갱신했다.
packed `dist/index` public API 결과가 CLI와 같은 check/gate identity를 생성했다.

```bash
npm run poc:ttsc-core
npm run verify:ttsc-library-self
```

### Runtime and package contract

Node 24 engine, 실제 `better-sqlite3` native query와 packed file-set preflight를 추가했다.
`release.yml`에는 Ubuntu/macOS typecheck/test matrix와 별도 OS별 clean build/packed-consumer
qualification job을 연결했다. workflow wiring은 완료됐지만 실제 GitHub matrix 통과 전에는
stable release로 승격하지 않는다.

release qualification contract verifier는 두 workflow의 Ubuntu/macOS × in-band/worker ×
2회 matrix, 필수 ttsc/package/provider/canonical-safety/differential/C2 command, ttsc-ex
checkout/build, diagnostics artifact와 publish dependency wiring을 정적으로 확인한다. 이
검증은 실제 GitHub runner 결과를 대체하지 않는다.

```bash
npm run verify:release-preflight
npm run verify:runtime-contract
npm run verify:platform-toolchain
npm run verify:canonical-safety
npm run verify:package-tarball
npm run verify:release-qualification
npm run verify:release-preflight-envelope
```

### LSP effective overlay and current CodeAction

`GraphDelta`와 `EffectiveCodeGraphView`가 saved canonical revision 위에 dirty 파일 하나 이상을
결정론적으로 합성한다. LSP service는 이 effective view를 hover, code lens, workspace search,
impact, related-symbol, definition과 overlay diagnostics에 사용하며, save generation guard는
새 편집이 진행 중일 때 이전 refresh가 overlay를 지우지 못하게 한다. 현재 CodeAction은 이
read-only query 결과와 retained saved convention finding의 Explain/Open payload만 제공한다.
ttsc graph-lint/spec contract를 미저장 view에서 재평가하거나 source를 수정하는 action은
보류한다.

검증 범위:

```bash
npm run test:run -- --runInBand \\
  src/__tests__/lsp/GraphDelta.test.ts \\
  src/__tests__/lsp/LspCanonicalGraphRefresh.test.ts \\
  src/__tests__/lsp/SavedConventionProtocol.test.ts
```

### C1 — legacy baseline

versioned source fixture에서 legacy Build output과 canonical graph output을 각각 복원하고,
`work-context`를 legacy-only/compiler-only로 읽어 비교한다. 기존 fixture는 4개 매칭/0 mismatch,
broader fixture는 6개 매칭/0 mismatch이며 canonical·legacy DB와 registry는 byte-for-byte
불변이다.

```bash
npm run verify:work-context-differential
npm run verify:work-context-differential:broader
```

fixture와 limitation은 [work-context differential fixture](../../scripts/fixtures/work-context-differential.v1.json)와
runner([verify-work-context-differential.cjs](../../scripts/verify-work-context-differential.cjs))에
고정한다.

## 보존된 limitation

- legacy `work-context`는 canonical ID와 compiler edge kind를 노출하지 않는다.
- compiler-only `work-context`는 legacy documentation/test enrichment를 재현하지 않는다.
- LSP navigation과 historical Explain/Open은 아직 별도 gate다.
- C1 fixture만으로 모든 legacy analyzer의 owner를 판정하지 않는다.

위 limitation은 삭제하지 않고 [[Semantic Graph Spec Governance Roadmap]]의 C2 backlog에서
capability별로 `superseded`, `retained`, `composed`, `deprecated`, `unsupported` 중 하나로
판정한다.
