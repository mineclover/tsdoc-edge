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
# [[SymbolName]]
```
- H1 레벨
- Canonical definition
- 심볼당 1개만 허용

### 2. Auxiliary Definition
```markdown
## [[SymbolName]]
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

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:62
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:184
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:393
- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:394
- [[CoverageReportCommand]] → /home/user/tsdoc-edge/managed/commands/CoverageReportCommand.md:111
- [[CoverageReportCommand]] → /home/user/tsdoc-edge/managed/commands/CoverageReportCommand.md:135
- [[CoverageReportCommand]] → /home/user/tsdoc-edge/managed/commands/CoverageReportCommand.md:136
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:87
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:167
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:168
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:169
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:170
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:171
- [[Symbol Reference System]] → /home/user/tsdoc-edge/managed/concepts/symbol-reference-system.md:168
- [[Symbol Reference System]] → /home/user/tsdoc-edge/managed/concepts/symbol-reference-system.md:176
- [[Symbol Reference System]] → /home/user/tsdoc-edge/managed/concepts/symbol-reference-system.md:177
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:60
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:153
- [[CLI Runner]] → /home/user/tsdoc-edge/managed/core-components/CLIRunner.md:154
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:107
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:108
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:109
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:120
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:168
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:169
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:170
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:171
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:172
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:46
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:182
- [[AutoIndexing]] → /home/user/tsdoc-edge/managed/features/auto-indexing.md:183
- [[CLI Command Development Guide]] → /home/user/tsdoc-edge/managed/guides/command-development-guide.md:82
- [[CLI Command Development Guide]] → /home/user/tsdoc-edge/managed/guides/command-development-guide.md:274
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:105
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:64
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:95
- [[Document Symbol Parser]] → /home/user/tsdoc-edge/managed/parsers/DocumentSymbolParser.md:96
- [[DocumentSymbol]] → /home/user/tsdoc-edge/managed/types/DocumentSymbol.md:75
- [[DocumentSymbol]] → /home/user/tsdoc-edge/managed/types/DocumentSymbol.md:83
- [[DocumentSymbol]] → /home/user/tsdoc-edge/managed/types/DocumentSymbol.md:84
- [[FeatureTypes]] → /home/user/tsdoc-edge/managed/types/FeatureTypes.md:82
- [[FeatureTypes]] → /home/user/tsdoc-edge/managed/types/FeatureTypes.md:91
- [[FeatureTypes]] → /home/user/tsdoc-edge/managed/types/FeatureTypes.md:92
- [[DocCodeLinker]] → /home/user/tsdoc-edge/managed/utilities/DocCodeLinker.md:53
- [[DocCodeLinker]] → /home/user/tsdoc-edge/managed/utilities/DocCodeLinker.md:64
- [[DocCodeLinker]] → /home/user/tsdoc-edge/managed/utilities/DocCodeLinker.md:65

