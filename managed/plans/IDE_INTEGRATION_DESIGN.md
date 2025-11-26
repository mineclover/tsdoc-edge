---
title: IDE Integration Design
type: design-plan
status: draft
priority: medium
created: 2025-11-26
---

# [[IDE Integration Design]]

TSDoc Edge의 IDE/에디터 통합을 위한 설계 문서

## 목표

CLI 도구의 강력한 분석 기능을 IDE에서 실시간으로 활용할 수 있게 하여, 개발자가 파일을 열자마자 필요한 컨텍스트를 자동으로 제공

## 현재 상태

### 이미 지원되는 통합
- **VS Code Tasks**: `.vscode-template/` 디렉토리에 14개 태스크 정의
- **Git Hooks**: pre-commit hook으로 critical symbol 변경 감지
- **Shell Aliases**: 터미널 단축키 (`rel-before`, `rel-critical` 등)

### 제한 사항
- 실시간 분석 없음 (매번 CLI 실행 필요)
- 인라인 힌트/코드렌즈 없음
- 문서 심볼 자동완성 없음

---

## 제안 아키텍처

### Phase 1: VS Code Extension (권장)

```
┌─────────────────────────────────────────────────────────┐
│  VS Code Extension                                       │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ CodeLens Provider │  │ Hover Provider  │               │
│  └────────┬────────┘  └────────┬────────┘               │
│           │                    │                         │
│           ▼                    ▼                         │
│  ┌─────────────────────────────────────────────┐        │
│  │           TSDoc Edge CLI Wrapper             │        │
│  │  (spawn tsdoc-edge wc --json)               │        │
│  └─────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  TSDoc Edge CLI                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│  │ SQLite  │  │ Symbol  │  │ Analyzer │                 │
│  │ DB      │  │ Graph   │  │ Engine   │                 │
│  └─────────┘  └─────────┘  └─────────┘                 │
└─────────────────────────────────────────────────────────┘
```

### 핵심 기능

#### 1. CodeLens (파일 레벨 인사이트)
```typescript
// 클래스/함수 위에 표시
// 📚 2 docs | 🔗 5 deps | 🧪 87% coverage | ⚠️ HIGH IMPACT (278 affected)
export class BuildCommand extends BaseCommand {
```

#### 2. Hover 정보
```typescript
// [[Symbol]] 위에 마우스 올리면
// ┌──────────────────────────────────┐
// │ 📄 BuildCommand                  │
// │ managed/commands/build.md        │
// │                                   │
// │ Dependencies: 5                   │
// │ Used by: 14 files                │
// │ Test coverage: 0%                │
// │                                   │
// │ [View Context] [View Docs]       │
// └──────────────────────────────────┘
```

#### 3. 자동완성
```typescript
// @doc [[  <- 여기서 자동완성
// ┌──────────────────────────────────┐
// │ [[BuildCommand]]                  │
// │ [[WorkContextCommand]]            │
// │ [[SymbolGraphBuilder]]            │
// │ [[DatabaseManager]]               │
// └──────────────────────────────────┘
```

#### 4. 문제 패널 통합
```
Problems (3)
├── ⚠️ BuildCommand.ts: No test coverage
├── ⚠️ UserService.ts: Missing @doc tag
└── ❌ types.ts: Orphan symbol detected
```

---

## Phase 2: LSP Server (고급)

Language Server Protocol을 통해 모든 에디터 지원

### LSP Server 구조
```typescript
// src/lsp/TsDocEdgeLSP.ts
export class TsDocEdgeLSP {
  // 필수 capabilities
  capabilities = {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: { triggerCharacters: ['['] },
    hoverProvider: true,
    codeLensProvider: { resolveProvider: true },
    documentSymbolProvider: true,
    workspaceSymbolProvider: true,
  };

  // work-context 결과 캐시
  private contextCache: Map<string, WorkContext>;

  onHover(params: HoverParams): Hover { ... }
  onCompletion(params: CompletionParams): CompletionItem[] { ... }
  onCodeLens(params: CodeLensParams): CodeLens[] { ... }
}
```

### 지원 에디터
- VS Code (네이티브)
- Neovim (nvim-lspconfig)
- Sublime Text (LSP plugin)
- JetBrains IDEs (LSP support)

---

## 구현 단계

### Step 1: JSON 출력 모드 추가
```bash
# 현재
tsdoc-edge wc src/file.ts --llm

# 추가 필요
tsdoc-edge wc src/file.ts --json
tsdoc-edge relationship-metrics --json
```

### Step 2: VS Code Extension 개발
```
tsdoc-edge-vscode/
├── src/
│   ├── extension.ts       # 진입점
│   ├── providers/
│   │   ├── codeLens.ts
│   │   ├── hover.ts
│   │   └── completion.ts
│   └── cli/
│       └── wrapper.ts     # CLI 래퍼
├── package.json
└── README.md
```

### Step 3: LSP Server 개발
```
src/lsp/
├── server.ts              # LSP 서버 메인
├── capabilities/
│   ├── hover.ts
│   ├── completion.ts
│   └── codeLens.ts
└── cache/
    └── contextCache.ts    # 결과 캐싱
```

---

## 예상 효과

| 기능 | CLI (현재) | Extension (Phase 1) | LSP (Phase 2) |
|------|-----------|---------------------|---------------|
| 컨텍스트 확인 | 수동 실행 | 파일 열 때 자동 | 실시간 |
| 문서 심볼 이동 | `find-doc` | Ctrl+Click | 네이티브 |
| 영향 분석 | 명령어 실행 | CodeLens 클릭 | 인라인 표시 |
| 자동완성 | 없음 | `[[` 트리거 | 완전 통합 |

---

## 참고 자료

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- 현재 VS Code 템플릿: `.vscode-template/`

---

## 관련 문서

- [[Work Context Workflow]]
- [[Relationship Types]]
- [[CLI Commands Reference]]
