---
title: ttsc Platform Specification
type: project-spec
category: specifications
status: active
canonical: true
source: src/indexer/TtscGraphRouterArtifactAdapter.ts
tags:
  - ttsc
  - platform-spec
  - domain-boundary
---

# [[TtscPlatformSpecification]]

`ttsc`(`0.34.3`), 네이티브 Go TypeScript 컴파일러(`typescript-native` / `tsgo 7.0.2`), `@ttsc/lint`(`0.34.3`), `@ttsc/graph`(`ttsc-graph-router` raw artifact `1.1.0`)가 **독립적으로 소유하는 컴파일·체크·자동수정·플러그인 호스트·원시 컴파일러 그래프 아티팩트 규격**을 정의합니다. 본 명세는 `@microsoft/tsdoc` 표준 어휘([[TSDocStandardSpecification]])나 `tsdoc-edge`의 제품 거버넌스 도메인([[TsdocEdgePlatformSpecification]])과 독립된 컴파일러·정적분석 플랫폼 계층입니다.

```tsdoc-spec
{
  "requirements": [
    {
      "id": "REQ-TTSC-RAW-GRAPH-ARTIFACT-BOUNDARY",
      "title": "ttsc graph-router raw compiler-fact artifacts must be ingested strictly through versioned contract validation",
      "tags": ["ttsc", "graph-router", "raw-artifact"]
    },
    {
      "id": "REQ-TTSC-SEMANTIC-PROVIDER-ISOLATION",
      "title": "ttsc semantic graph provider must preserve producer provenance and raw compiler facts without synthesizing spec semantics",
      "tags": ["ttsc", "provider", "provenance"]
    }
  ],
  "edges": [
    {
      "kind": "contains",
      "from": "spec:TtscPlatformSpecification",
      "to": "REQ-TTSC-RAW-GRAPH-ARTIFACT-BOUNDARY"
    },
    {
      "kind": "contains",
      "from": "spec:TtscPlatformSpecification",
      "to": "REQ-TTSC-SEMANTIC-PROVIDER-ISOLATION"
    }
  ],
  "bindings": [
    {
      "id": "BIND-TTSC-RAW-GRAPH-ARTIFACT-BOUNDARY",
      "kind": "implementation",
      "specNodeId": "REQ-TTSC-RAW-GRAPH-ARTIFACT-BOUNDARY",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/indexer/TtscGraphRouterArtifactAdapter.ts#TtscGraphRouterArtifactAdapter:class"
      }
    },
    {
      "id": "BIND-TTSC-SEMANTIC-PROVIDER-ISOLATION",
      "kind": "implementation",
      "specNodeId": "REQ-TTSC-SEMANTIC-PROVIDER-ISOLATION",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/provider/TtscSemanticGraphProvider.ts#TtscSemanticGraphProvider:class"
      }
    }
  ]
}
```

## 개요 (Purpose)

`tsgo` 네이티브 컴파일 파이프라인 위에서 **단일 패스 타입체크·린트(`check` / `fix`)·LSP(`ttscserver`)·컴파일러 해석 그래프(`@ttsc/graph`)** 를 제공하는 외부 플랫폼의 고유 계약과 확장 SPI를 명확히 분리합니다.

- **존재 이유**: TypeScript 7 호환 네이티브 AST 및 타입 체커를 단일 Go 프로세스 안에서 실행하고, Go 소스 플러그인(contributor)과 원시 심볼/엣지 덤프를 결정론적으로 공급합니다.
- **비소유(Non-Scope) 경계**:
  - `tsdoc.json`에 등록되는 서드파티 커스텀 태그의 의미나 `@microsoft/tsdoc`의 `DocComment` JS 클래스 계층은 소유하지 않습니다(→ [[TSDocStandardSpecification]]).
  - `managed/` 명세 생명주기(`draft` → `active`), `tsdoc-spec` 요구사항·바인딩 적합성 판정, `work-context` / `design-context` 컨텍스트 조립은 소유하지 않습니다(→ [[TsdocEdgePlatformSpecification]]).
  - 설정 파일에 `format` 블록을 선언하지 않는 한 코드 포맷팅 권한을 주장하지 않으며(`ttsc format` 비활성), 포맷팅은 Biome이 소유합니다(→ [[Lint Governance]]).

## 핵심 개념 (Core Concepts: Input · Context · Logic)

### 1. 컴파일러 드라이버 및 CLI 계약 (Input)

- **주요 실행 모드**:
  - `ttsc -p <tsconfig>`: 타입체크 + 자동 탐색된 check-stage 플러그인(`error` 게이트) + JS/d.ts emit 수행.
  - `ttsc check` / `ttsc fix`: emit 없이 모든 등록 규칙을 검사하거나 `FixReporter`의 `TextEdit`를 원자적으로 적용.
  - `ttsc prepare` / `ttsc cache paths --json`: `@ttsc/lint` 및 contributor Go 소스를 사전 컴파일하고 CI 캐시 경로(`node_modules/.cache/ttsc`, `go-build`)를 노출.
  - `ttscserver`: 에디터/IDE 세션용 LSP 서버(저장 상태 진단, Quick Fix, `HintRule` 자동완성, `ProjectInputRule` 파일 감시 무효화).
- **자동 플러그인 탐색 (`0.34.3`)**: 설치된 패키지의 `package.json#ttsc.plugin`(`{ "transform": "@ttsc/lint" }`)을 자동 감지하여 별도 `tsconfig.plugins` 선언이 없어도 루트 `lint.config.mjs`를 로드합니다.

### 2. `@ttsc/lint` Go `rule` SPI 및 내장 규칙 네임스페이스 (Context)

`@ttsc/lint`는 내장 규칙(`typescript/*` 타입 인지 규칙, `jsdoc/*` 기본 주석 구조 규칙) 외에 Go 소스 contributor가 구현할 수 있는 정식 인터페이스를 제공합니다.

| SPI 인터페이스 | 역할 및 수명주기 |
| --- | --- |
| `rule.ProjectRule` + `ProjectInputRule` + `ProjectInputObservationRule` | Program 사이클당 1회 실행; `ProjectInputFile` / `ProjectInputGlob` 선언으로 비-TS 파일(`tsdoc.json`, `managed/**/*.md`)을 읽고 변경 시 `ttscserver` 캐시를 자동 무효화하며 `ctx.SetState(...)`로 불변 상태를 공유 |
| `rule.Rule` + `TypeAwareRule` + `OptionsRule` | 파일/AST 노드 단위 검사; `NeedsTypeChecker() == false` 선언 시 체커 직렬화 없이 병렬 AST 패스에서 실행 |
| `FixReporter` / `SuggestionReporter` | `ctx.ReportRangeFix`(무손실 `ttsc fix` 자동수정) 및 `ctx.ReportRangeSuggestion`(에디터 선택형 Quick Fix) 발행 |
| `rule.HintRule` | `ttscserver` 전용 풀(pull) 방식 자동완성(`HintScopeJSDoc` 등, 배치 `ttsc check` 오버헤드 0) |
| `rule.GraphRule` | 고정 어휘 아티팩트 노드(`markdown_document`, `markdown_section`, `prisma_*`, `swagger_operation`)를 호스트 그래프에 발행 |

- **단일 수명주기 제약**: 서드파티 contributor는 동일 규칙 이름에 `ProjectRule`과 파일 `Rule`을 동시에 등록할 수 없으므로(충돌 시 `ProjectRule` 드롭), 상태 생산자 규칙과 파일 검사 규칙의 이름을 분리하고 `ctx.ProjectResult(...)`로 조회해야 합니다.

### 3. `@ttsc/graph` 및 `ttsc-graph-router` 원시 아티팩트 계약 (Logic)

- **원시 컴파일러 사실(Raw Fact Plane)**: `@ttsc/graph`는 컴파일러가 해석한 심볼 노드(`@ttsc/graph:path#qualifiedName:kind`)와 호출·참조·상속 엣지 및 1-based 소스 좌표를 `ITtscGraphDump`로 생산합니다.
- **경계 불변식**: `ttsc-graph-router` raw artifact contract `1.1.0`은 저장된 파일 기준(saved-file snapshot)의 순수 컴파일러 사실만 담으며, 합성된 도메인 관계나 명세 생명주기 상태를 절대 포함하지 않습니다. `tsdoc-edge` 측 어댑터[^TtscGraphRouterArtifactAdapter]와 프로바이더[^TtscSemanticGraphProvider]는 이 계약을 검증한 뒤 정규화 계층[^ProviderSnapshotNormalizer]으로 전달합니다.

## 핵심 산출물 (Output · Effect · Scope)

- **Output**:
  - 컴파일 산출물(`dist/`, `.test-dist/`), 타입 및 check-stage 린트 진단(`TS...`), `ttsc fix` 소스 패치.
  - 컴파일된 Go 플러그인 바이너리(`node_modules/.cache/ttsc/plugins/<hash>/plugin`).
  - 원시 그래프 아티팩트(`@ttsc-ex/ttsc-graph-router/raw-graph-artifact`, 스키마 `@ttsc/graph/ITtscGraphDump`).
- **Effect**: 플러그인 캐시 디렉터리 및 빌드 출력 디렉터리 외에는 워크스페이스 도메인 DB(`.tsdoc.db`, `.tsdoc/canonical-graph.db`, `.tsdoc/spec-graph.db`)를 직접 변경하지 않습니다.
- **Scope**: [^TtscGraphRouterArtifactAdapter], [^TtscSemanticGraphProvider], [^ProviderSnapshotNormalizer], [^ProjectIndexer], [^GraphRepository]가 소비하는 컴파일러 기반 인프라 계층.

## 사용 시나리오 (Usage Scenarios)

### 시나리오 1: Go 소스 플러그인 사전 컴파일 및 캐시 경로 조회

CI 또는 로컬 클린 환경에서 `@ttsc/lint`와 프로젝트 contributor를 사전 링크하여 후속 빌드·테스트의 콜드 컴파일 지연을 제거합니다.

```bash
npm run ttsc:cache
npm run ttsc:prepare
```

### 시나리오 2: 단일 패스 빌드 `error` 게이트 및 백로그 래칫 검증

일반 빌드(`lint.config.mjs`)에서는 0건이 보장된 `error` 규칙만 강제하고, 린트 게이트(`tsconfig.lint.json` → `lint.ratchet.config.mjs`)에서는 잔여 `warn` 백로그 증가를 차단합니다.

```bash
npm run build
npm run lint:ttsc
```

### 시나리오 3: 원시 `@ttsc/graph` 덤프 수집 및 정규화 전달

[^TtscGraphRouterArtifactAdapter]가 `graph-router` 아티팩트의 프로듀서 버전과 스키마 계약을 검증한 뒤 [^TtscSemanticGraphProvider]와 [^ProjectIndexer]로 넘겨 정규 그래프 리비전을 생성합니다.

## CLI 명령어 (CLI Commands)

- `npm run ttsc:prepare`: `@ttsc/lint` + contributor Go 바이너리 사전 빌드.
- `npm run ttsc:check` / `npm run ttsc:fix`: 워크스페이스 check-stage 진단 및 자동수정 실행.
- `npm run lint:ttsc`: `tsconfig.lint.json` 기준 래칫 베이스라인 검증.

## 설계 결정 및 경계 가이드 (Design Decisions)

1. **2계층 설정 분리 (`lint.config.mjs` vs `lint.ratchet.config.mjs`)**: `0.34.3` 자동 탐색으로 인해 모든 `ttsc` 호출이 `lint.config.mjs`를 읽으므로, `lint.config.mjs`에는 100% 클린한 `error` 규칙만 두고 백로그 `warn` 규칙은 `extends: './lint.config.mjs'`를 사용하는 `lint.ratchet.config.mjs`로 격리합니다.
2. **원시 그래프와 정규 그래프의 분리**: `@ttsc/graph`의 로컬 노드 ID를 영속 DB 기본키로 직접 노출하지 않고, 항상 [^ProviderSnapshotNormalizer]에서 `workspaceId`와 `graphNamespace`(`ttsc:<repoId>`)를 결합한 정규 ID로 변환합니다.
3. **AST·그래프 사실과 중복되는 주석 태그 제거**: `@ttsc/graph`가 결정론적으로 산출하는 6종 정규 엣지(`implements`, `extends`, `calls`, `accesses`, `instantiates`, `type_ref`), `CanonicalNodeId`, TypeScript `import`/가시성 수식어가 코드 공간 의존성·식별자의 유일한 정본이므로, 수동 주석 태그 9종(`@implements`, `@extends`, `@uses`, `@usedBy`, `@dependsOn`, `@depends`, `@depType`, `@depReason`, `@id`)은 퇴출하고 관계 브리지로만 연결합니다.

## 관련 기능 (Related Concepts)

- [[AuthoredProjectSpecifications]]
- [[TSDocStandardSpecification]]
- [[TsdocEdgePlatformSpecification]]
- [[CrossSpecIntegrationContract]]
- [[ProjectIndexer]]
- [[Lint Governance]]
