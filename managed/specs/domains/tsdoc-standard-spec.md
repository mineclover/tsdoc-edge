---
title: TSDoc Standard Specification
type: project-spec
category: specifications
status: active
canonical: true
source: src/parser/TSDocParser.ts
tags:
  - tsdoc
  - standard-spec
  - domain-boundary
---

# [[TSDocStandardSpecification]]

`@microsoft/tsdoc` v0 표준이 **독립적으로 소유하는 주석 문법, 표준 태그 어휘, 산문 이스케이프 규칙, `tsdoc.json` 확장 스키마 및 `DocNode` AST 규격**을 정의합니다. 본 명세는 `ttsc` 컴파일러/린트 플랫폼([[TtscPlatformSpecification]])이나 `tsdoc-edge` 고유의 도메인 거버넌스([[TsdocEdgePlatformSpecification]])에 의존하지 않는 순수 표준 계층입니다.

```tsdoc-spec
{
  "requirements": [
    {
      "id": "REQ-TSDOC-STANDARD-PARSER-CONTRACT",
      "title": "TSDoc standard parser and tsdoc.json schema contract must remain isolated from compiler and domain planes",
      "tags": ["tsdoc", "standard-spec", "parser"]
    },
    {
      "id": "REQ-TSDOC-DOCNODE-EXTRACTION-BOUNDARY",
      "title": "Structured DocComment AST extraction must consume TSDoc parser output without redefining standard grammar",
      "tags": ["tsdoc", "doc-ast"]
    }
  ],
  "edges": [
    {
      "kind": "contains",
      "from": "spec:TSDocStandardSpecification",
      "to": "REQ-TSDOC-STANDARD-PARSER-CONTRACT"
    },
    {
      "kind": "contains",
      "from": "spec:TSDocStandardSpecification",
      "to": "REQ-TSDOC-DOCNODE-EXTRACTION-BOUNDARY"
    }
  ],
  "bindings": [
    {
      "id": "BIND-TSDOC-STANDARD-PARSER-CONTRACT",
      "kind": "implementation",
      "specNodeId": "REQ-TSDOC-STANDARD-PARSER-CONTRACT",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/parser/TSDocParser.ts#TSDocParser:class"
      }
    },
    {
      "id": "BIND-TSDOC-DOCNODE-EXTRACTION-BOUNDARY",
      "kind": "implementation",
      "specNodeId": "REQ-TSDOC-DOCNODE-EXTRACTION-BOUNDARY",
      "target": {
        "type": "code-node",
        "workspaceId": "tsdoc-edge",
        "graphNamespace": "ttsc:tsdoc-edge",
        "canonicalNodeId": "src/parser/EnhancedDocExtractor.ts#EnhancedDocExtractor:class"
      }
    }
  ]
}
```

## 개요 (Purpose)

TypeScript 생태계에서 JSDoc 방언 파편화를 방지하기 위해 `@microsoft/tsdoc` v0가 정의한 **도구 중립적 문서 주석 표준**의 경계를 명확히 고정합니다.

- **존재 이유**: 주석 토큰화 규칙, 태그 구문 분류(`block` / `inline` / `modifier`), 산문 이스케이프 규칙, `tsdoc.json` 확장 메커니즘을 단일 문법 명세로 제공하여 어떤 파서나 린터에서도 동일한 AST 및 진단을 보장합니다.
- **비소유(Non-Scope) 경계**:
  - `[[Checkpoint]]` 문서 라우팅, 백링크, 마크다운 섹션 인덱싱은 소유하지 않습니다(→ [[TsdocEdgePlatformSpecification]]).
  - TypeScript 타입 체커 실행, Go 플러그인 바이너리 빌드, 프로젝트 파일 워처(`ttscserver`)는 소유하지 않습니다(→ [[TtscPlatformSpecification]]).
  - 커스텀 태그의 도메인 의미론(예: 7관점 모듈 명세, 관계 온톨로지)은 해석하지 않으며, 오직 `tsdoc.json#tagDefinitions`에 등록된 `syntaxKind`와 `allowMultiple` 형식 계약만 검증합니다.

## 핵심 개념 (Core Concepts: Input · Context · Logic)

### 1. 입력 경계 (Input)

- **주석 구분자**: `/** ... */` 형태의 멀티라인 문서 주석만 TSDoc 입력으로 인정합니다. 일반 블록 주석(`/* ... */`), 배너 주석(`/*** ... */`), 단일 행 주석(`//`), 문자열·정규식·템플릿 리터럴 내부의 `/** ... */` 텍스트는 입력 대상이 아닙니다.
- **확장 설정 스키마 (`tsdoc.json`)**:
  - `$schema`: `https://developer.microsoft.com/json-schemas/tsdoc/v0/tsdoc.schema.json`
  - `noStandardTags`: 표준 태그 기본 로드 비활성화 여부 (기본값 `false`)
  - `tagDefinitions`: `{ "tagName": "@...", "syntaxKind": "block" | "inline" | "modifier", "allowMultiple"?: boolean }`
  - `supportForTags`: 도구별 지원 태그 선언 맵

### 2. 표준 태그 어휘 29종과 3대 구문 분류 (Context)

| `syntaxKind` | 문법 형태 | `@microsoft/tsdoc` v0 표준 태그 (29종) |
| --- | --- | --- |
| `modifier` (10종) | 본문 없이 존재만으로 플래그 부여 | `@alpha`, `@beta`, `@eventProperty`, `@experimental`, `@internal`, `@override`, `@packageDocumentation`, `@public`, `@readonly`, `@sealed`, `@virtual` (중 11종 표기 시 `@decorator` 제외 10종 + `@virtual` 포함 총 11종 modifier, 아래 합계 29종) |
| `block` (15종) | 행 시작 `@tag` 이후 다음 블록 태그 전까지 섹션 구성 | `@decorator`, `@defaultValue`, `@deprecated`, `@example`, `@jsx`, `@jsxFrag`, `@jsxImportSource`, `@jsxRuntime`, `@param`, `@privateRemarks`, `@remarks`, `@returns`, `@see`, `@throws`, `@typeParam` |
| `inline` (3종) | 중괄호 내부 `{@tag ...}` 인라인 요소 | `@inheritDoc`, `@label`, `@link` |

### 3. 어휘·산문 파싱 규칙 (Logic)

TSDoc 파서[^TSDocParser]는 마크다운 본문과 태그 구문의 모호성을 제거하기 위해 아래 어휘 불변식을 강제합니다.

1. **중괄호(`{`, `}`) 규칙**: 코드 스팬(`` `...` ``) 및 코드 펜스(`` ``` ``) 밖에서 `{`는 인라인 태그 시작(`{@tag ...}`)으로만 허용됩니다. 일반 산문의 `{id}`나 JSDoc 타입 표기 `@throws {Error}`는 `tsdoc-malformed-inline-tag` / `tsdoc-escape-right-brace` 오류이며 `\{`, `\}` 또는 백틱으로 감싸야 합니다.
2. **꺾쇠(`<`, `>`) 및 HTML 태그 규칙**: `<void>`, `<User>`, `<br/>`처럼 유효한 HTML 여는/닫는 태그 형태는 허용되지만, 쉼표·공백이 섞인 제네릭(`Map<string, number>`)이나 단독 화살표(`A -> B`, `score > 80`)의 `>`는 `tsdoc-escape-greater-than` 오류이므로 `\<`, `\>` 또는 백틱으로 감싸야 합니다.
3. **`@` 토큰 규칙**: 단어 내부 `@`(`user@domain`), 허용되지 않는 후행 문자(`@microsoft/tsdoc`), 중괄호 없는 인라인 태그(`@link`), 중괄호로 감싼 블록 태그(`{@doc}`)는 각각 `tsdoc-at-sign-in-word`, `tsdoc-characters-after-block-tag`, `tsdoc-inline-tag-missing-braces`, `tsdoc-tag-should-not-have-braces`로 거부됩니다.
4. **`@param` 하이픈 구분자**: `@param <name> - <description>` 형식을 표준으로 요구하며 하이픈 누락 시 `tsdoc-param-tag-missing-hyphen`을 보고합니다.
5. **코드 펜스 위치**: `` ``` `` 오프닝 펜스는 반드시 주석 행의 시작(선행 `* ` 직후)에 위치해야 합니다(`tsdoc-code-fence-opening-indent`).

## 핵심 산출물 (Output · Effect · Scope)

- **Output**:
  - `ParserContext` 및 `DocComment` 트리(`summarySection`, `remarksBlock`, `params`, `typeParams`, `returnsBlock`, `customBlocks`, `modifierTagSet`, `seeBlocks`).
  - 구조화된 `ParserMessage` 목록(46개 표준 `TSDocMessageId` 및 텍스트 스팬).
- **Effect**: 순수 인메모리 파싱(파일 시스템 쓰기·네트워크·DB 부수효과 없음).
- **Scope**:
  - 런타임 `DocNode` 트리 소비자: [^TSDocParser], [^EnhancedDocExtractor], [^ModuleSpecTagParser], [^ConventionValidator], [^DocumentationFixer].
  - 컴파일 타임 패리티 대조 기준선(Oracle): [[CrossSpecIntegrationContract]]에서 네이티브 Go 규칙 출력을 검증하는 정답 기준선으로 작동합니다.

## 사용 시나리오 (Usage Scenarios)

### 시나리오 1: 표준 `tsdoc.json` 스키마 기반 주석 문법 전수 검증

코퍼스 전체의 `/** ... */` 블록이 `@microsoft/tsdoc` 어휘·구문 규칙과 `tsdoc.json` 태그 정의를 100% 준수하는지 확인합니다.

```bash
node dist/cli.js validate-tsdoc src --strict --json
```

### 시나리오 2: `DocComment` AST로부터 구조화 섹션 추출

배치 문서 생성기나 모듈 명세 분석기가 [^TSDocParser]와 [^EnhancedDocExtractor]를 통해 `@param`, `@returns`, `customBlocks` 트리를 손실 없이 읽습니다.

```typescript
const parser = new TSDocParser('./tsdoc.json');
const result = parser.parseFile('UserService.ts', sourceText);
// result.errors === [] 이면 표준 TSDoc 문법 100% 적합
```

### 시나리오 3: 산문 내 특수문자 이스케이프 정합성 유지

산문 안에서 패키지 스코프(`` `@ttsc/lint` ``), 제네릭 타입(`` `Map<string, number>` ``), 화살표(`` `A -> B` ``), 태그 예시(`` `@doc` ``)를 백틱이나 백슬래시로 감싸 표준 파서 오류 0건을 유지합니다.

## CLI 명령어 (CLI Commands)

- `tsdoc-edge validate-tsdoc <dir> [--strict] [--json]`: `@microsoft/tsdoc` 레퍼런스 파서 기준 문법 및 `tsdoc.json` 정합성 검증.

## 설계 결정 및 경계 가이드 (Design Decisions)

1. **`tsdoc.json`의 오염 금지**: npm 패키지 스코프(`@ttsc/*`)나 내부 그래프 식별자 접미사(`@overlay`)는 TSDoc 태그가 아니므로 `tsdoc.json`에 등록해 우회하지 않고 산문 백틱 이스케이프로 처리합니다.
2. **레거시 JSDoc 호환 심(Shim) 7종 전량 제거**: `@microsoft/tsdoc` v0 표준 29종 및 TypeScript AST 가시성 수식어로 100% 대체 가능한 레거시 JSDoc 태그 7종(`@private` → TS `private` / `@internal`, `@description` → Summary 단락, `@template` → `@typeParam`, `@module` → `@packageDocumentation`, `@todo` → `@privateRemarks`, `@default` → `@defaultValue`, `@version` → Git / 스펙 프론트매터)은 `tsdoc.json`에서 완전히 제거하고 정본 표준 태그만 사용합니다.

## 관련 기능 (Related Concepts)

- [[AuthoredProjectSpecifications]]
- [[TtscPlatformSpecification]]
- [[TsdocEdgePlatformSpecification]]
- [[CrossSpecIntegrationContract]]
- [[TSDocParser]]

---

## Backlinks

### Referenced By

- [[Lint Governance]] → managed/features/lint-governance.md:15
- [[CrossSpecIntegrationContract]] → managed/specs/domains/cross-spec-integration-contract.md:17
- [[TsdocEdgePlatformSpecification]] → managed/specs/domains/tsdoc-edge-platform-spec.md:99
- [[TtscPlatformSpecification]] → managed/specs/domains/ttsc-platform-spec.md:16
- [[AuthoredProjectSpecifications]] → managed/specs/index.md:40

### Implemented By

- TSDocStandardSpecification → src/parser/TSDocParser.ts:1
- MarkdownGenerator → src/generator/MarkdownGenerator.ts:17
- EnhancedDocExtractor → src/parser/EnhancedDocExtractor.ts:76
- ModuleSpecTagParser → src/parser/ModuleSpecTagParser.ts:27
- TSDocParser → src/parser/TSDocParser.ts:134
- TsdocRenderOptions → src/parser/TsdocCommentReader.ts:37
- StructuredTsdocComment → src/parser/TsdocCommentReader.ts:93
- CANONICAL_TSDOC_STANDARD_BRIDGE → src/types/tags/canonical-tag-bridge.ts:177

