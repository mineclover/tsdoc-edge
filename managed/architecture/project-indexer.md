---
title: ProjectIndexer
type: architecture
category: core
status: active
canonical: true
---

# [[ProjectIndexer]]

## 결정

배치 CLI와 LSP가 각자 그래프를 만들고 각자 저장하는 구조를 종료한다.
`ProjectIndexer`가 코드 그래프를 조립하는 유일한 경로가 되고, 모든 소비자는
동일한 canonical graph revision을 조회한다.

```text
@ttsc/graph (compiler-resolved producer, TypeScript 7.0 compatibility target)
  -> ttsc-graph-router raw artifact/cache boundary
  -> TtscGraphRouterArtifactAdapter
     |-> ProjectIndexer (production saved-file v1)
     `-> TtscSemanticGraphProvider (raw ProviderSnapshot, partial occurrence capability)
         -> ProviderSnapshotNormalizer (workspace/namespace identity + fact topology)
         -> ProviderProjectIndexer (provider canary compatibility projection)
  -> GraphRepository (single persisted graph)
  -> BuildCommand / LSP / work-context
```

graph-router를 TypeScript 파서로 재구현하지 않는다. 컴파일러 사실 생산은
`@ttsc/graph`가 소유하고, router는 구성·캐시·artifact 전달 경계를 소유한다.
`ProjectIndexer`는 이 raw dump를 TypeScript AST 타입이 없는 JSON 계열 계약으로
받는다.

## Canonical graph 계약과 전환층

- 목표 canonical node id는
  `workspaceId + graphNamespace + source path + qualifiedName + kind`를 결합한다.
- `providerInstanceId + providerNodeId`는 별도 producer identity로 보존하며 provider가
  canonical ID를 직접 결정하지 않는다.
- Provider-local ID는 collision suffix가 아니다. 서로 다른 provider node가 같은
  workspace/namespace/path/qualifiedName/kind tuple을 주장하면 normalization을 거부한다.
  Provider는 같은 semantic declaration을 collapse하고 별개 entity에는 stable
  qualified-name disambiguator를 제공해야 한다.
- node/edge kind와 evidence 좌표, 알 수 없는 producer 필드를 손실 없이 보존한다.
- 같은 node id와 존재하지 않는 endpoint는 저장 전에 오류로 처리한다.
- 반복 `(kind, from, to)` 관찰은 `FactOccurrence`로 각각 보존하고 하나의
  `TopologyEdge` 및 `CanonicalProjectGraph.edges` compatibility projection으로 집계한다.
- 노드와 엣지를 결정적으로 정렬하고 fact-content fingerprint를 생성한다.
- `GraphMemory`나 router projection은 canonical 입력이 아니다. 합성된 구조가 없는
  raw `GraphDump`만 입력으로 사용한다.

기존 random UUID와 `filename-type-name` legacy id는 전환 기간의 alias일 뿐,
배치/LSP 동등성 판단 키로 사용하지 않는다.

현재 production saved refresh는 아직 adapter가 `ProjectGraphSource`를 통해
`ProjectIndexer`로 직접 들어가는 v1 경로도 유지한다. 이 경로에서는 producer의
`path#qualifiedName:kind`가 canonical ID와 `sourceId`를 겸하고 edge가
`(kind, from, to)` compatibility topology로 저장된다. 새 `src/provider/` 경계는 이
가정을 제거하기 위한 additive canary이며, Build/LSP cutover 전까지 두 경로의
differential parity가 필요하다.

직접 v1 경로도 convention/spec plane과의 결합을 위해 `workspaceId`와
`graphNamespace`를 graph provenance에 저장한다. 기본값은 각각 router `repoId`와
`ttsc:<repoId>`이며, `repoId` 자체의 기본값은 프로젝트 루트 디렉터리명이다.
Build에서는 `--graph-workspace=<id>`와 `--graph-namespace=<id>`가
`TSDOC_EDGE_GRAPH_WORKSPACE`와 `TSDOC_EDGE_GRAPH_NAMESPACE`보다 우선한다. LSP의
saved-file refresh는 같은 coordinator를 사용하되 환경변수로 같은 값을 받아, Build가
만든 revision과 동일한 workspace/namespace identity를 유지한다.

`CanonicalProjectGraph` v1의 `tsconfigPath` 필수 필드도 같은 compatibility debt다.
공통 `ProviderSnapshot`에는 tsconfig가 없고 TypeScript provider config에만 존재하며,
normalizer가 v1 assembler에 전달할 때만 `compatibilityTsconfigPath` bridge를 사용한다.

## TypeScript 7.0 호환 목표와 안정화 기준

첫 호환 목표는 ttsc-ex의 `typescript@7.0.x`, `ttsc`, `@ttsc/graph`, graph-router
조합이다.
저장소의 기본 build, typecheck, watch lane은 `ttsc@0.18.4`와 native TypeScript
`7.0.2` 정식판을 사용한다. 기존 TypeScript Compiler API 코드는 별도의
`typescript@5.9.x` 런타임에 남긴다. TypeScript 7은 루트 Compiler API export가
달라 현재 AST 기반 코드와 `ts-jest`를 동시에 깨뜨리므로, build compiler 전환과
runtime API 전환을 분리한다.

Test transformer는 [[TS7 Test Compilation Lane]] P4.0에서 별도로 정리했다. source/test를
`ttsc`/TypeScript 7로 `.test-dist`에 선컴파일하고 Jest가 JavaScript만 실행하며,
`ts-jest`는 제거됐다. 이 결정은 test toolchain의 TS5 결합을 제거하지만, legacy
analyzer·문서 변환기·LSP syntax overlay가 직접 사용하는 `typescript@5.9.x` runtime
제거를 의미하지 않는다.

graph-router raw artifact contract `1.0.0`은 raw fact plane, saved-file snapshot,
합성 구조 없음, unsaved buffer 없음, one-based evidence, unknown field 보존을
명시한다. adapter는 계약 version/capability와 producer·router·cache·project·tsconfig
provenance를 모두 검증한다. `typescriptCompatibilityTarget: "7.0"`은 전환 정책이지
실제 compiler version provenance가 아니다. 실제 compiler version은 여전히 `null`이며,
현재 dump는 `diagnosticsCollected: false`다. diagnostic이 제공되면 adapter는 실제 router
형식의 숫자 code, line/column, origin, node를 canonical diagnostic으로 정규화하고
`GraphRepository`의 별도 diagnostics plane에 저장한다.
Canonical `fingerprint`는 node/edge content equality key이며 provenance identity가
아니다. producer/binary/router fingerprint, refreshedAt, config와 tsconfig는 별도
`provenance`로 보존해 분석 projection에도 함께 전달한다.
저장 revision id는 content fingerprint와 계약·producer·router·capability 같은 안정된
semantic provenance만 결합한다. refresh timestamp, cache fingerprint, 머신별 binary/config
경로는 metadata에는 보존하지만 동일 content의 revision identity를 바꾸지 않는다.

안정화 완료는 단순 typecheck가 아니라 다음을 모두 의미한다.

1. graph-router가 대상 프로젝트 자체의 `ttsc` 설치 없이 raw artifact를 만든다.
2. fresh dump와 반복 dump의 정렬된 node/edge fingerprint가 같다.
3. unknown kind, evidence, external node가 손실되지 않는다.
4. legacy AST adapter가 지원하는 공통 fixture는 canonical id 기준 parity를 통과한다.
5. full build와 저장된 파일의 LSP refresh가 같은 graph revision을 만든다.
6. 삭제·rename 시 node와 incident edge가 같은 transaction에서 제거된다.

## LSP 정책

저장된 파일은 graph-router를 `refresh: true`로 다시 읽는다. 현재 cache fingerprint는
이미 dirty인 파일의 연속 내용 변경을 완전히 구분하지 못하기 때문이다.

graph-router package가 현재 private workspace package이므로 설치·배포 계약이 생기기
전까지 adapter에는 `artifact-source`의 절대 경로나 file URL을 `moduleSpecifier`로
명시해야 한다.

미저장 버퍼는 TS5 syntax-only extractor가 canonical-id `GraphDelta`로 메모리에만
유지하며 SQLite에 쓰지 않는다. owner-qualified identity가 저장 graph와 일치하면 기존
canonical id와 incident edge를 보존한다. 삭제·rename endpoint의 edge는 제거하고,
새 symbol 또는 rename된 symbol의 새 edge는 저장 후 whole-project router refresh에서
확정한다. `TtscGraphRouterArtifactAdapter`는 content override를 명시적으로 거부해 raw
saved-file artifact와 overlay를 섞지 못하게 한다.

Provider가 one-document delta를 제공하는 경우 `DeltaNormalizer`는 같은 snapshot
normalizer와 fact/topology identity를 사용해 `GraphDelta`를 만든다. Base provider
snapshot이 다르면 `rebase-required`, 문서 소유 범위를 벗어난 변경이면
`fallback-required`를 반환한다. 현재 ttsc saved provider facade는 incremental delta를
`unsupported`로 선언하므로 production LSP는 기존 syntax overlay를 계속 사용한다.

생성된 provider-origin `GraphDelta`는 `sourceContext`에 base/next provider snapshot ID,
provider delta ID, base/next provider identity digest와 capability digest를 보존한다. 이
context는 delta digest에 참여하며 apply 시 persisted base provenance와 exact-match
검증된다. `NormalizedProviderDelta`는 authoritative fact/topology diff와 typed state를
별도로 보유한다.

## 전환 상태

| 단계 | 상태 | 산출물 |
| --- | --- | --- |
| Raw artifact API | 구현 | graph-router contract `1.0.0` / capability / provenance |
| Repository ttsc compiler lane | 구현 | `scripts/run-ttsc.cjs` / `tsconfig.ttsc.json` |
| TS7 test compilation lane | wiring cutover; runtime qualification pending | `tsconfig.test.ttsc.json` / `.test-dist` / JavaScript-only Jest |
| TS-version-neutral contract | 구현 | `src/indexer/contracts.ts` |
| Canonical assembler | 구현 | `src/indexer/ProjectIndexer.ts` |
| graph-router adapter | 구현 | `src/indexer/TtscGraphRouterArtifactAdapter.ts` |
| Public provider contract/facade | kernel 구현 | `src/provider/contracts.ts`, `TtscSemanticGraphProvider.ts` |
| Provider snapshot/delta normalization | kernel 구현 | `ProviderProjectIndexer`, namespaced ID/collision rejection, rebase/fallback outcome, GraphDelta source pin, compatibility projection |
| Fact occurrence/topology | kernel 구현 | lossless occurrence identity와 aggregation; DB plane 미연결 |
| Canonical graph analysis | 구현 | 방향 명시 query, impact, metrics, ontology projection |
| Structural analyzer cutover | 구현 | raw fact query + canonical snapshot 저장, legacy projection read-only |
| Legacy AST parity adapter | 구현 | 실제 `ASTSymbolExtractor` identity와 alias parity 검증 |
| Alias/diagnostics plane | 구현 | collision-safe alias, router diagnostic 정규화, revision identity 포함 |
| Atomic GraphRepository | 구현 | schema-v1 read compatibility와 v2 CAS 승격, rollback, rename/delete cleanup |
| BuildCommand cutover | 부분 구현 | canonical refresh 선행, legacy enrichment 유지 |
| LSP saved-file cutover | 구현 | single-flight/coalesced whole-project refresh, protocol save/watch registration |
| TS5 syntax unsaved overlay | 부분 구현 | provider source context 없음, syntax extractor identity와 제한된 relationship coverage; 신규 edge는 save refresh 대기 |
| Semantic provider delta | kernel 구현 | source context와 authoritative fact/topology diff 생성; 현재 ttsc facade는 incremental delta `unsupported` |

BuildCommand와 LSP saved-file은 같은 coordinator와 repository를 사용한다. alias hop은
work-context의 XML/LLM/human 형식과 relationship query/impact에 연결되었다. canonical ID와
파일 경로는 legacy DB 없이도 직접 조회할 수 있다. Alias 후보는 실제 `ASTSymbolExtractor`
출력과 대조하므로 accessor처럼 legacy peer가 없는 node를 거짓으로 매핑하지 않으며, fresh
router 기준 materialized alias parity는 mismatch 0이다. 남은 완료 조건은 이 parity 검증을
release gate로 승격하고 신규/rename overlay edge를 saved-file refresh 전에도 표현하는 것이다.

`build --canonical-graph --canonical-only`는 같은 coordinator를 사용하되 legacy symbol DB와
registry를 열지 않는다. `npm run poc:convention`은 이 경계로 실제 router revision을 임시
DB에 저장하고 committed convention pack의 pass/fail/invalid-pin/exact-replay를 검증한다.

현재 TS5 정리 범위도 구분한다. 별도 legacy build/typecheck/watch lane,
`ImplementationAnalyzer`, Build의 중복 `InheritanceAnalyzer` pass, 사용되지 않던
TypeChecker 초기화와 `ts-jest`는 제거되었다. 그러나 구문·문서 변환기와 LSP 미저장
버퍼 extractor가 Compiler API를 사용하므로 `typescript@5.9.x` runtime dependency
자체는 아직 제거 대상이 아니다. [[TS7 Test Compilation Lane]]은 repository wiring cutover
증거와 남은 Node engines/native dependency 정렬 및 clean-install release gate를 소유한다.

Canonical structural source graph는 별도 revision tables에 영속화한다. projection을
legacy `unified_relationships`에 복제하지 않고, revision-scoped alias table을 통해
legacy id에서 canonical id로 이동한다. alias와 diagnostics 내용도 revision identity에
포함되어 graph content가 같더라도 additive plane이 바뀌면 새 revision이 된다.

## 관련 문서

- [[Semantic Graph Analysis and Relationship Model]]
- [[Semantic Graph Spec Governance Roadmap]]
- [[TS7 Test Compilation Lane]]
- [[Build Pipeline Guide]]
- [[LSP Integration]]
- [[Symbol Graph System]]
- [[DatabaseManager]]
