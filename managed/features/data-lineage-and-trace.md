---
title: Data Lineage and Slicing
type: feature
category: analysis
status: active
canonical: true
source: src/graph-analysis/DataTraceService.ts
tags:
  - data-trace
  - lineage
  - ast-slicing
  - canonical-graph
  - provenance
---

# [[Data Lineage and Slicing]]

**Source**: `src/graph-analysis/DataTraceService.ts`

`DataTraceService`와 `DataTraceCommand`(`tsdoc-edge symbol trace` / `tsdoc-edge relationship trace` / MCP `tsdoc_trace_data`)는 인간 및 AI 코드 작성자가 추적하고자 하는 데이터를 **3가지 상호보완적 계층(3-Tier Data Trace)** 으로 정밀 추적합니다.

## 1. Purpose (존재 이유)

단일 심볼 호출 그래프만으로는 다음 세 가지 데이터 추적 질문을 동시에 답하기 어렵습니다:
1. **Tier 1 (Type & Field Flow — `type-flow`)**: 특정 인터페이스/클래스/타입(`DTO`) 또는 특정 필드(`DTO.field`)를 누가 생성(`producer`)하고, 변환(`transformer`)하며, 변이(`writer`)하고, 읽고(`reader`), 소비(`consumer`)하는가? 직접 호출 경로가 없는 두 명령이나 모듈이 어떤 공유 상태/저장소(`junctionsBetween`)를 통해 데이터를 주고받는가?
2. **Tier 2 (Cross-Boundary Domain Lineage — `boundary-lineage`)**: `[[Checkpoint]]` 문서 및 규범 `SpecGraph` 바인딩(`BIND-*`), `@samchon/typespec-evidence` 상수(`*EntityRoot`, `*AspectOf`, `*Storage`, `*Strategy`, `*Promotable`, `*Representation`, `*LookupKey`), `oa-sdk` 출처 메타데이터(`@oa-*`, `.oa-trace.json`, `UI:|FSM:|TX:|SYS:` 텔레메트리 심볼), 그리고 Repository Read/Write 브리지를 권한 경계 간 동일시(`same-as` 붕괴) 없이 방향성 있는 계보로 어떻게 연결하는가?
3. **Tier 3 (Code-Level AST Dataflow Slicing — `code-slice`)**: 함수 내부에서 특정 매개변수(`func(param)`)나 필드(`obj.field`)가 어떤 지역 변수/구조분해 할당(`DESTRUCTURE`)을 거쳐 변이(`WRITE`)되거나 다른 함수 인자(`PASS_AS_ARG`: `arg[i] -> callee.param[i]`)로 전달되고 반환(`RETURN`)되는가? 그 과정에서 `any`, 이중 단언(`as unknown as T`), 미검증 역직렬화(`JSON.parse`), 동적 인덱싱(`obj[key]`) 같은 **신뢰 상실 경계(Trust-Loss Boundary)** 를 지나는가?

## 2. Architecture & Ecosystem Alignment

### Tier 1: TypeScript Type & Field Flow (`TypeFieldFlowReport`)
- `@ttsc/graph` 정본 노드(`signature`, `literals`, `enumMembers`, `objectMembers`, `modifiers`)와 엣지(`type_ref`, `accesses`, `instantiates`, `calls`, `implements`, `overrides`, `dispatches`)를 결합합니다.
- 컨테이너 이중 귀속 필터링(Container Double-Attribution Filtering)과 온디맨드 AST L-value/R-value 판별을 통해 각 사용처를 `writer`, `producer`, `transformer`, `reader`, `consumer`, `accessor` 역할로 정확히 분류합니다.
- `junctionsBetween(from, to)`: 직접 호출 엣지가 없는 생산자(`SpecExtractCommand.execute`)와 소비자(`ConventionCheckCommand.execute`)가 공유하는 상태/저장소(`SpecGraphRepository`, `SpecGraphRevision`) 접합점을 자동 발견합니다.

### Tier 2: Cross-Boundary Domain Lineage (`CrossBoundaryLineageReport`)
- **Hard Anti-Collapse Rule** (`[[GraphAndPersistencePlaneSpecification]]`): 서로 다른 권한 경계(TypeSpec/OpenAPI/DB/DTO/ViewModel)를 휴리스틱 이름 매칭이나 `same-as`로 합치지 않고, `derives-from`, `projects-to`, `adapts-to`, `aspect-of`, `stored-in`, `promotes-to`, `represents-id`, `lookup-key-for`, `replaces`, `persists-to`, `reads-from`, `governs`, `emits-telemetry` 방향성 관계로만 기록합니다.
- 인식 대상:
  - `tsdoc-edge`: `@doc [[Checkpoint]]`, `@contract`, `@invariant`, `@sideEffect`, `SpecGraph` 바인딩(`BIND-*`)
  - `@samchon/typespec-evidence`: `TypeSpec source: <file.tsp>#<Symbol>`, `@evidence`, `## @evidence`, `@evidenceReview`, `*EntityRoot`, `*AspectOf`, `*Storage`, `*Strategy`, `*Promotable`, `*Representation`, `*LookupKey`
  - `oa-sdk`: `@oa-pointer`, `@oa-source`, `@oa-id`, `@oa-trace-id`, `@oa-replaces`, `@oa-requirement`, `@derivedFrom`, `@storageRef`, `@intent`, `.oa-trace.json`, `@oa-sdk/telemetry` (`UI:|FSM:|TX:|SYS:`)
  - **Persistence / Repository Bridge**: 동일 `*Repository` / `*Store` 클래스의 쓰기 메서드(`replace*`, `save*`, `insert*`, `write*`) 호출자와 읽기 메서드(`read*`, `get*`, `find*`, `list*`) 호출자를 교차 연결합니다.

### Tier 3: On-Demand AST Variable & Parameter Slicing (`CodeDataflowSliceReport`)
- `@ttsc/graph`가 좁혀준 후보 함수들에 대해서만 온디맨드로 TypeScript AST Def-Use 슬라이싱을 수행합니다.
- 추적 연산: `PARAM_IN`, `DESTRUCTURE`, `LOCAL_ALIAS`, `READ`, `WRITE`, `READ_WRITE`, `PASS_AS_ARG` (`argIndex` 및 피호출 함수의 `boundParamName` 매핑), `AWAIT_CALL`, `RETURN`.
- Fail-Closed 신뢰 상실 경계(`DataflowTrustBoundary`):
  - `boundary:any` (`type-erased`)
  - `boundary:double-assertion` (`as unknown as T` -> `type-erased`)
  - `boundary:unvalidated-deserialize` (검증 가드 없는 `JSON.parse` / `.json()` -> `unvalidated`)
  - `boundary:dynamic-index` (`obj[dynamicKey]` -> `indeterminate`)

## 3. CLI & MCP Usage

```bash
# 1. 특정 타입 또는 필드(DTO.field) 3계층 통합 추적
tsdoc-edge symbol trace SpecGraphRevision.bindings
tsdoc-edge symbol trace SpecGraphRevision --tier=type-flow

# 2. 두 심볼/명령 사이의 공유 상태 및 Repository 접합점 추적
tsdoc-edge relationship trace SpecExtractCommand.execute ConventionCheckCommand.execute

# 3. 특정 함수(매개변수)의 코드 레벨 AST 데이터흐름 슬라이싱
tsdoc-edge symbol trace "extractManagedSpecGraph(options)" --tier=code-slice

# 4. LLM 마크다운 또는 기계 판독 JSON 출력
tsdoc-edge symbol trace SpecGraphRepository --llm
tsdoc-edge symbol trace SpecGraphRepository --json
```

MCP 서버(`[[MCP Integration]]`)에서는 `tsdoc_trace_data` 도구로 동일한 3계층 추적을 호출할 수 있습니다.

## Related Documents

- [[GraphAndPersistencePlaneSpecification]] - 정본 그래프 및 영속 계층 규범 명세
- [[Semantic Graph Analysis and Relationship Model]] - `@ttsc/graph` 엣지 시맨틱 정책
- [[CliCommandSurfaceSpecification]] - 20개 최상위 CLI 명령 표면 규범 명세
- [[MCP Integration]] - MCP 도구 통합 명세

---

## Backlinks

### Referenced By

- [[Commands Index]] → managed/COMMANDS.md:73
- [[MCP Integration]] → managed/features/mcp-integration.md:66

### Implemented By

- Data Lineage and Slicing → src/graph-analysis/DataTraceService.ts:1
- DataTraceCommand → src/commands/DataTraceCommand.ts:37
- DataTraceServiceOptions → src/graph-analysis/DataTraceService.ts:61
- DataTraceService → src/graph-analysis/DataTraceService.ts:123
- formatDataTraceLlmMarkdown → src/graph-analysis/DataTraceService.ts:2619
- DataTraceTier → src/graph-analysis/data-trace-contracts.ts:19
- DataTraceOrigin → src/graph-analysis/data-trace-contracts.ts:27
- DataTraceAuthorityRole → src/graph-analysis/data-trace-contracts.ts:35
- DataTraceLineageState → src/graph-analysis/data-trace-contracts.ts:43
- DataTraceRole → src/graph-analysis/data-trace-contracts.ts:57
- DirectionalLineageRelation → src/graph-analysis/data-trace-contracts.ts:72
- TrustLossBoundaryKind → src/graph-analysis/data-trace-contracts.ts:93
- DataTraceRequest → src/graph-analysis/data-trace-contracts.ts:105
- DataTraceTargetNodeSummary → src/graph-analysis/data-trace-contracts.ts:128
- DataTraceFieldMember → src/graph-analysis/data-trace-contracts.ts:157
- DataTraceOutgoingTypeRef → src/graph-analysis/data-trace-contracts.ts:177
- DataTraceRoleUsage → src/graph-analysis/data-trace-contracts.ts:192
- DataTracePolymorphicBinding → src/graph-analysis/data-trace-contracts.ts:212
- DataTraceSharedJunction → src/graph-analysis/data-trace-contracts.ts:228
- TypeFieldFlowReport → src/graph-analysis/data-trace-contracts.ts:245
- DataTraceCheckpointBinding → src/graph-analysis/data-trace-contracts.ts:259
- DataTraceProvenanceLink → src/graph-analysis/data-trace-contracts.ts:275
- DataTraceEvidenceArtifact → src/graph-analysis/data-trace-contracts.ts:299
- DataTracePersistenceBridge → src/graph-analysis/data-trace-contracts.ts:322
- DataTraceTelemetrySymbol → src/graph-analysis/data-trace-contracts.ts:348
- CrossBoundaryLineageReport → src/graph-analysis/data-trace-contracts.ts:365
- DataflowSliceStep → src/graph-analysis/data-trace-contracts.ts:380
- DataflowTrustBoundary → src/graph-analysis/data-trace-contracts.ts:406
- FunctionDataflowSlice → src/graph-analysis/data-trace-contracts.ts:420
- CodeDataflowSliceReport → src/graph-analysis/data-trace-contracts.ts:437
- DataTraceReport → src/graph-analysis/data-trace-contracts.ts:449

