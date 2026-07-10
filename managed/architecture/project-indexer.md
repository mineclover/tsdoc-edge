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
  -> ProjectIndexer (identity + integrity + deterministic revision)
  -> GraphRepository (single persisted graph)
  -> BuildCommand / LSP / work-context
```

graph-router를 TypeScript 파서로 재구현하지 않는다. 컴파일러 사실 생산은
`@ttsc/graph`가 소유하고, router는 구성·캐시·artifact 전달 경계를 소유한다.
`ProjectIndexer`는 이 raw dump를 TypeScript AST 타입이 없는 JSON 계열 계약으로
받는다.

## Canonical graph 계약

- canonical node id는 `@ttsc/graph`의 `path#qualifiedName:kind` id다.
- producer id는 `sourceId`에도 보존한다.
- node/edge kind와 evidence 좌표, 알 수 없는 producer 필드를 손실 없이 보존한다.
- 같은 node id, 같은 `(kind, from, to)` edge, 존재하지 않는 endpoint는 저장 전에
  오류로 처리한다.
- 노드와 엣지를 결정적으로 정렬하고 fact-content fingerprint를 생성한다.
- `GraphMemory`나 router projection은 canonical 입력이 아니다. 합성된 구조가 없는
  raw `GraphDump`만 입력으로 사용한다.

기존 random UUID와 `filename-type-name` legacy id는 전환 기간의 alias일 뿐,
배치/LSP 동등성 판단 키로 사용하지 않는다.

## TypeScript 7.0 호환 목표와 안정화 기준

첫 호환 목표는 ttsc-ex의 `typescript@7.0.x`, `ttsc`, `@ttsc/graph`, graph-router
조합이다.
저장소의 기본 build, typecheck, watch lane은 `ttsc@0.16.8`과 native TypeScript
`7.0.2` 정식판을 사용한다. 기존 TypeScript Compiler API 코드는 별도의
`typescript@5.9.x` 런타임에 남긴다. TypeScript 7은 루트 Compiler API export가
달라 현재 AST 기반 코드와 `ts-jest`를 동시에 깨뜨리므로, build compiler 전환과
runtime API 전환을 분리한다.

graph-router raw artifact contract `1.0.0`은 raw fact plane, saved-file snapshot,
합성 구조 없음, unsaved buffer 없음, one-based evidence, unknown field 보존을
명시한다. adapter는 계약 version/capability와 producer·router·cache·project·tsconfig
provenance를 모두 검증한다. `typescriptCompatibilityTarget: "7.0"`은 전환 정책이지
실제 compiler version provenance가 아니다. 실제 compiler version은 여전히 `null`이며,
현재 dump는 `diagnosticsCollected: false`다. diagnostic plane이 활성화되면 별도 canonical
저장 계약을 구현하기 전까지 fail-closed한다.
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

미저장 버퍼는 TS5 syntax-only extractor가 메모리 overlay로 유지하며 SQLite에 쓰지
않는다. 저장 성공 후 whole-project router snapshot을 원자 교체하면서 해당 overlay를
제거한다. 현재 overlay symbol id는 아직 legacy 형식이므로 canonical-id 기반
`GraphDelta` 병합은 후속 단계다. `TtscGraphRouterArtifactAdapter`는 content override를
명시적으로 거부해 raw saved-file artifact와 overlay를 섞지 못하게 한다.

## 전환 상태

| 단계 | 상태 | 산출물 |
| --- | --- | --- |
| Raw artifact API | 구현 | graph-router contract `1.0.0` / capability / provenance |
| Repository ttsc compiler lane | 구현 | `scripts/run-ttsc.cjs` / `tsconfig.ttsc.json` |
| TS-version-neutral contract | 구현 | `src/indexer/contracts.ts` |
| Canonical assembler | 구현 | `src/indexer/ProjectIndexer.ts` |
| graph-router adapter | 구현 | `src/indexer/TtscGraphRouterArtifactAdapter.ts` |
| Canonical graph analysis | 구현 | 방향 명시 query, impact, metrics, ontology projection |
| Structural analyzer cutover | 구현 | raw fact query + canonical snapshot 저장, legacy projection read-only |
| Legacy AST parity adapter | 대기 | 기존 extractor를 canonical id로 투영 |
| Atomic GraphRepository | 구현 | stable revision identity, `BEGIN IMMEDIATE` CAS, read-only snapshot access, rollback, rename/delete cleanup |
| BuildCommand cutover | 부분 구현 | canonical refresh 선행, legacy enrichment 유지 |
| LSP saved-file cutover | 구현 | single-flight/coalesced whole-project refresh, protocol save/watch registration |
| Unsaved buffer overlay | 격리 구현 | query-surface 우선 적용과 DB write 제거, canonical-id GraphDelta 병합은 대기 |

BuildCommand와 LSP saved-file은 같은 coordinator와 repository를 사용한다. 남은 완료
조건은 legacy enrichment와 canonical id 사이의 alias/parity 계약, work-context 등
나머지 query consumer 전환, overlay의 canonical-id GraphDelta다.

현재 TS5 정리 범위도 구분한다. 별도 legacy build/typecheck/watch lane,
`ImplementationAnalyzer`, Build의 중복 `InheritanceAnalyzer` pass, 사용되지 않던
TypeChecker 초기화는 제거되었다. 그러나 구문·문서 변환기, `ts-jest`, LSP 미저장
버퍼 extractor가 Compiler API를 사용하므로 `typescript@5.9.x` runtime dependency
자체는 아직 제거 대상이 아니다.

Canonical structural source graph는 별도 revision tables에 영속화한다. 단, projection을
legacy `unified_relationships`에 복제하지는 않는다. legacy symbol id와 canonical id의
alias가 아직 없으므로 복제하면 query endpoint가 고아가 된다. 소비자는 canonical
revision을 직접 읽고, legacy enrichment는 명시적 alias 단계 전까지 별도로 유지한다.

## 관련 문서

- [[Build Pipeline Guide]]
- [[LSP Integration]]
- [[Symbol Graph]]
- [[DatabaseManager]]
