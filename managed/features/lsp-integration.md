# [[LSP Integration]]

## 요약
- **목적**: VS Code 등 LSP 클라이언트에서 TSDoc Edge 분석 결과를 실시간으로 활용
- **진입점**: `src/lsp/server.ts:61-100` - LSP 서버 초기화 및 기능 등록
- **의존성**: `vscode-languageserver`, `better-sqlite3`, `src/lsp/service.ts`

## 지원하는 LSP 프로토콜

### textDocument/hover
`src/lsp/server.ts:115-139`에서 구현. 커서 위치의 심볼 정보와 영향 분석을 마크다운으로 제공합니다.

```ts
const hoverInfo = tsdocService.getHoverInfo(filePath, line, character)
```

표시 내용:
- 심볼 이름 및 타입
- 요약 정보
- Downstream/Upstream 카운트
- 관계 타입 통계

### textDocument/codeLens
`src/lsp/server.ts:142-165`에서 구현. 각 심볼 위에 영향 범위를 인라인으로 표시합니다.

```ts
title: `↓${downstream} ↑${upstream}`
```

캐싱: `src/lsp/service.ts:262-310`에서 5초 TTL로 파일별 캐싱

### textDocument/codeAction
`src/lsp/server.ts:197-298`에서 구현. 컨텍스트 기반 액션을 제공합니다.

제공하는 액션:
- 영향 분석 (downstream/upstream)
- 관련 심볼 탐색
- 순환 의존성 경로 표시
- 레이어 위반 상세 정보

고영향 경고: downstream > 10일 경우 자동 경고 액션 추가 (`server.ts:235-245`)

### textDocument/documentLink
`src/lsp/server.ts:301-371`에서 구현. 마크다운 내 `[[Symbol]]` 참조를 클릭 가능한 링크로 변환합니다.

지원 패턴:
- `[[SymbolName]]` - 문서 심볼 참조
- `@see SymbolName` - TSDoc 참조

### textDocument/definition
`src/lsp/server.ts:379-412`에서 구현. 심볼 정의로 이동합니다.

단어 추출: `server.ts:417-431`의 `getWordAtPosition()` 헬퍼 사용

### workspace/symbol
`src/lsp/server.ts:173-194`에서 구현. 워크스페이스 전체에서 심볼을 검색합니다.

제한: 최대 50개 결과 (`service.ts:327`)

### textDocument/publishDiagnostics
`src/lsp/server.ts:434-457`에서 문서 변경 시 자동 트리거됩니다.

진단 항목:
- 순환 의존성 (Warning)
- 레이어 위반 (Warning)
- 고영향 심볼 (Information)

## 서비스 아키텍처

### TsdocEdgeService
`src/lsp/service.ts:55-663`에서 LSP 서버와 SQLite 데이터베이스를 연결합니다.

#### 캐싱 전략
4가지 캐시 맵 운영 (`service.ts:61-64`):
- symbolCache
- codeLensCache
- diagnosticsCache
- impactCache

TTL: 5초 (실시간성과 성능 균형)

#### 주요 메서드

**getHoverInfo()**
`service.ts:152-218` - 심볼 정보 + 영향 분석

**getCodeLenses()**
`service.ts:262-310` - 파일 내 심볼의 영향 카운트

**getDiagnostics()**
`service.ts:348-430` - 순환 의존성, 레이어 위반, 고영향 심볼 검사

**getImpactAnalysis()**
`service.ts:490-539` - BFS로 의존성 그래프 탐색, maxDepth 파라미터로 깊이 제어

**getRelatedSymbols()**
`service.ts:548-598` - 직접 연결된 심볼 조회

**findSymbolByName()**
`service.ts:606-652` - 3단계 검색 (정확 일치 → 대소문자 무시 → 부분 일치)

#### 데이터베이스 쿼리
Prepared statements 캐싱: `service.ts:117-123`의 `getStatement()` 메서드로 쿼리 재컴파일 방지

주요 테이블:
- `symbols` - 심볼 정보
- `unified_relationships` - 심볼 간 관계

## 설정 및 실행

### 빌드
```bash
npm run build
```

LSP 서버 바이너리: `dist/lsp/server.js`

### 실행 방법
```bash
# 직접 실행 (stdio 모드)
node dist/lsp/server.js

# package.json 스크립트
npm run lsp
```

통신 프로토콜: stdio (LSP 표준)

### VS Code 연동

클라이언트 확장 생성이 필요합니다. package.json 설정 예시:

```json
{
  "contributes": {
    "configuration": {
      "type": "object",
      "title": "TSDoc Edge",
      "properties": {
        "tsdocEdge.enable": {
          "type": "boolean",
          "default": true
        }
      }
    }
  },
  "activationEvents": ["onLanguage:markdown", "onLanguage:typescript"]
}
```

클라이언트 코드에서 서버 시작:
```ts
const serverModule = context.asAbsolutePath('dist/lsp/server.js')
const serverOptions = { module: serverModule, transport: TransportKind.stdio }
```

### 데이터베이스 준비
LSP 서버는 `.tsdoc/symbols.db`를 readonly 모드로 읽습니다 (`service.ts:138`).

사전 빌드 필수:
```bash
tsdoc-edge build src
```

## 성능 최적화

### 캐시 무효화
파일 변경 시 해당 파일 캐시만 무효화: `service.ts:99-112`의 `invalidateFileCache()`

전체 무효화: `service.ts:89-94`의 `invalidateCache()` (DB 재빌드 후)

### Prepared Statements
동일 쿼리 반복 시 컴파일 비용 절약: `service.ts:69-70`의 statements 맵

### 쿼리 제한
- 심볼 검색: 최대 50개
- 관련 심볼: 기본 10개 (limit 파라미터로 조정 가능)
- 영향 분석: maxDepth로 탐색 깊이 제어

## 확장 가이드

### 새 프로토콜 추가
1. `server.ts`에 `connection.on*` 핸들러 추가
2. `service.ts`에 데이터 조회 메서드 구현
3. `server.ts:84-98`의 capabilities에 기능 등록

### 커스텀 진단 추가
`service.ts:348-430`의 `getDiagnostics()` 메서드에 쿼리 로직 추가:

```ts
const customStmt = this.getStatement('customCheck', `SELECT ...`)
const results = customStmt?.all(`%${fileName}`) || []
```

### 명령어 연동
`server.ts`의 CodeAction에서 `tsdoc.showImpactAnalysis` 같은 커스텀 명령어를 호출합니다.

클라이언트 확장에서 명령어 핸들러 구현:
```ts
vscode.commands.registerCommand('tsdoc.showImpactAnalysis', (symbolId, direction) => {
  // 분석 결과 표시
})
```

## 트러블슈팅

### 심볼을 찾을 수 없음
- `.tsdoc/symbols.db` 존재 확인
- `tsdoc-edge build` 재실행
- 파일 경로 정규화 (Windows `\` vs Unix `/`) - `service.ts:157, 266`에서 처리

### 캐시가 갱신되지 않음
- TTL 확인: `service.ts:67` (기본 5초)
- 수동 무효화: `invalidateFileCache()` 호출

### 성능 저하
- Prepared statements 캐시 확인: `service.ts:69-70`
- 쿼리 제한 조정: `searchSymbols()`, `getRelatedSymbols()` limit 파라미터
- 진단 빈도 조절: `server.ts:434` 변경 이벤트 디바운싱 고려
