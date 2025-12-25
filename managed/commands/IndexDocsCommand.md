---
title: Index Docs Command
type: command
category: commands
status: active
canonical: true
---

# [[IndexDocsCommand]]

**Source**: `src/commands/IndexDocsCommand.ts`

## Purpose

Markdown 문서의 `[[Symbol]]` notation을 파싱하여 문서 심볼 레지스트리 구축.

## Workflow

```bash
tsdoc-edge index-docs managed
```

**Process**:
1. **File Discovery**: `.md` 파일 탐색
2. **Symbol Parsing**: `[[Symbol]]` 추출
3. **Classification**: Primary vs Auxiliary vs Reference
4. **Code Connection**: 문서-코드 링크 탐지
5. **Registry Update**: `.tsdoc/doc-symbols.json` 저장

## Symbol Types

### 1. Primary Definition
```markdown
# SymbolName
```
- H1 레벨
- Canonical definition
- 심볼당 1개만 허용

### 2. Auxiliary Definition
```markdown
## SymbolName
## [[SymbolName#Section]]
```
- H2+ 레벨
- Non-canonical reference
- 여러 개 가능

### 3. Inline Reference
```markdown
See [[OtherSymbol]] for details.
Related: [[Concept#Section]]
```
- 문서 간 링크
- Navigation network 형성

## Code Connection

**Auto-detection**:
```markdown
**Source**: `src/analyzer/CallGraphAnalyzer.ts`
```

→ 문서 심볼과 코드 파일 자동 연결 (Docs → Code direction)

## Current State

**Statistics**:
- Primary definitions: 38개
- Auxiliary definitions: 51개
- References: 946개
- Code connections: 16개
- Avg references per symbol: 24.9

## Related

- [[DocumentSymbolParser]]: 파싱 로직
- [[DocumentSymbolRegistry]]: 레지스트리 관리
- [[Document Symbol System]]: 전체 시스템 설명

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:83
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:247
- [[CoverageReportCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/CoverageReportCommand.md:111
- [[Document Symbol System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/document-symbol-system.md:87
- [[Symbol Reference System]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/symbol-reference-system.md:170
- [[DocumentSymbolRegistry]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/DocumentSymbolRegistry.md:120
- [[AutoIndexing]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/auto-indexing.md:46
- [[CLI Command Development Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/command-development-guide.md:82
- [[CLI Command Development Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/command-development-guide.md:274
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:105
- [[Document Symbol Parser]] → /Users/junwoobang/workflow/tsdoc-edge/managed/parser/DocumentSymbolParser.md:71
- DocumentSymbol → /Users/junwoobang/workflow/tsdoc-edge/managed/types/DocumentSymbol.md:101
- FeatureTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/FeatureTypes.md:99
- [[DocCodeLinker]] → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/DocCodeLinker.md:53

