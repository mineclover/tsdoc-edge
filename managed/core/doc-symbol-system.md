---
title: doc-symbol-system
type: system
category: core
status: active
canonical: true
---

# [[Document Symbol System]]

> `[[Symbol]]` 표기법으로 문서와 코드를 양방향 연결하는 SSOT 시스템

---

## 개요

Document Symbol System은 마크다운 문서에서 `[[Symbol]]` 표기법을 파싱하고, 코드 심볼과 양방향 연결을 관리합니다. 하나의 심볼은 하나의 정의만 가질 수 있으며(SSOT), 역참조(Backlinks)를 자동 생성합니다.

**핵심 가치**: 문서 ↔ 코드 양방향 추적, 자동 Backlinks, 중복 정의 방지

---

## Module Specification

### Purpose
문서 심볼의 정의, 참조, 역참조를 관리하여 문서-코드 일관성 보장

### Input
- 마크다운 문서 (`.md`)
- `[[Symbol]]` 표기법
- Mermaid 다이어그램

### Output
- `ParsedDocSymbols`: 파싱된 문서 심볼
- `DocumentSymbolRegistry`: 중앙 레지스트리
- 자동 생성된 Backlinks 섹션
- 각주 참조 (`[^sym-001]`)

### Context
- H1 `# [[Symbol]]`은 Primary 정의 (유일)
- H2+ `## [[Symbol]]`은 Auxiliary (보조)
- 인라인 `[[Symbol]]`은 Reference (참조)
- SSOT: 하나의 심볼 = 하나의 정의

### Logic
```
1. 문서 파싱 → [[]] 표기법 추출
2. 레지스트리 등록 → Primary 중복 검사
3. 코드 연결 → 심볼 ID 매칭
4. Backlinks 수집 → 역참조 추적
5. 검증 → 끊어진 링크 탐지
```

### Effect
- 문서 파일 수정 (Backlinks 삽입)
- 레지스트리 갱신

### Scope
- `DocumentSymbolParser`: [[]] 파싱
- `DocumentSymbolRegistry`: 중앙 레지스트리
- `BacklinkGenerator`: Backlinks 생성
- `SymbolReferenceGenerator`: 각주 생성
- `SymbolReferenceResolver`: 참조 해석
- `TSDocSymbolParser`: TSDoc 심볼 파싱
- `MermaidSymbolExtractor`: Mermaid 심볼 추출

---

## 핵심 컴포넌트

### [[DocumentSymbolParser]]

마크다운에서 `[[Symbol]]` 추출

```typescript
/**
 * @doc [[Document Symbol System]]
 * @functionality [[]] 표기법 파싱, 헤딩/인라인/각주 구분
 */
class DocumentSymbolParser {
  parse(filePath: string): ParsedDocSymbols | null
  extractHeadingSymbols(): DocumentSymbol[]
  extractInlineReferences(): DocumentSymbol[]
  extractCodeReferences(): CodeReference[]
  extractSymbolFootnotes(): SymbolFootnoteRef[]
}
```

**Source**: `src/doc-symbol/DocumentSymbolParser.ts`

### [[DocumentSymbolRegistry]]

SSOT 원칙을 강제하는 중앙 레지스트리

```typescript
/**
 * @doc [[Document Symbol System]]
 * @problem 여러 문서에서 동일 심볼 중복 정의
 * @solves Primary 정의 유일성 강제
 * @context SSOT(Single Source of Truth) 원칙
 */
class DocumentSymbolRegistry {
  registerDocument(symbols: ParsedDocSymbols): void
  getDefinition(name: string): DocumentSymbol | undefined
  getAuxiliaries(name: string): DocumentSymbol[]
  getReferences(name: string): DocumentSymbol[]
  addCodeConnection(docSymbol: string, connection: CodeConnection): void
  validate(): DocSymbolValidation
}
```

**Source**: `src/doc-symbol/DocumentSymbolRegistry.ts`

### [[Parser Components]]

자동 Backlinks 섹션 생성

```typescript
/**
 * @doc [[Document Symbol System]]
 * @depends DocumentSymbolRegistry
 * @depType runtime
 * @depReason 역참조 정보 조회
 */
class BacklinkGenerator {
  generateBacklinks(symbolName: string): string
  collectBacklinks(symbolName: string): Backlink[]
  updateDocument(filePath: string): boolean
}
```

**Source**: `src/doc-symbol/BacklinkGenerator.ts`

### SymbolReferenceGenerator

각주 형식 참조 생성

```typescript
/**
 * @doc [[Document Symbol System]]
 * @functionality 심볼 참조를 각주로 변환
 */
class SymbolReferenceGenerator {
  generateSymbolReferences(parsed: ParsedDocSymbols): string
  updateDocument(filePath: string): boolean
}
```

**Source**: `src/doc-symbol/SymbolReferenceGenerator.ts`

### SymbolReferenceResolver

심볼 참조를 코드/문서 위치로 해석

```typescript
/**
 * @doc [[Document Symbol System]]
 * @functionality 심볼 이름 → 파일:라인 변환
 */
class SymbolReferenceResolver {
  resolve(symbolName: string): ResolvedReference | null
  resolveToCode(symbolName: string): CodeLocation | null
  resolveToDoc(symbolName: string): DocLocation | null
}
```

**Source**: `src/doc-symbol/SymbolReferenceResolver.ts`

---

## [[]] 표기법

### 기본 문법

```markdown
# [[Feature Name]]                    <!-- Primary (H1) - 유일한 정의 -->

## [[Helper Concept]]                 <!-- Auxiliary (H2+) - 보조 정의 -->

This feature uses [[Related Feature]]  <!-- Reference (inline) - 참조 -->

See also:
- [[Another Feature]]
- [[Yet Another]]

## References
[^sym-001]: SymbolName - 설명    <!-- Footnote reference -->
```

### 심볼 유형

| 유형 | 문법 | 설명 |
|------|------|------|
| Primary | `# [[Name]]` | H1, 유일한 정의, SSOT |
| Auxiliary | `## [[Name]]` | H2-H6, 보조 정의 |
| Reference | `[[Name]]` | 인라인, 다른 심볼 참조 |
| Footnote | `[^sym-N]: [[Name]]` | 각주 형식 참조 |

### 코드 참조

```markdown
<!-- 소스 파일 참조 -->
See implementation at `src/services/UserService.ts:42`

<!-- 심볼 ID 참조 -->
Related to `@id user-service`
```

---

## 데이터 구조

### DocumentSymbol

```typescript
interface DocumentSymbol {
  name: string           // 심볼 이름
  type: 'primary' | 'auxiliary' | 'reference'
  filePath: string       // 문서 파일 경로
  line: number           // 정의 라인
  level: number          // 헤딩 레벨 (1-6)
  content?: string       // 섹션 내용
  section?: string       // 상위 섹션 이름
}
```

### ParsedDocSymbols

```typescript
interface ParsedDocSymbols {
  filePath: string                    // 문서 파일 경로
  primary?: DocumentSymbol            // Primary 정의 (0-1개)
  auxiliaries: DocumentSymbol[]       // Auxiliary 정의 (0+개)
  references: DocumentSymbol[]        // 참조 (0+개)
  codeReferences: CodeReference[]     // 코드 참조
  symbolFootnoteRefs: SymbolFootnoteRef[]  // 각주 참조
  sourceFilePath?: string             // 연결된 소스 파일
}
```

### DocSymbolValidation

```typescript
interface DocSymbolValidation {
  valid: boolean
  errors: Array<{
    type: 'duplicate-primary' | 'broken-reference' | 'orphan-symbol'
    symbolName: string
    message: string
    locations: string[]
  }>
  warnings: Array<{
    type: 'no-backlinks' | 'no-code-connection'
    symbolName: string
    message: string
  }>
}
```

---

## 설계 의사결정

### ADR-007: SSOT via Primary Symbol]]

```
@decision H1 [[Symbol]]만 Primary 정의로 인정
@rationale
  - 하나의 심볼 = 하나의 정의 원칙
  - 중복 정의 시 어떤 것이 권위인지 모호
  - H1은 문서당 1개만 존재
@consequences
  - Primary 중복 시 오류
  - Auxiliary로 보조 설명 가능
  - 명확한 SSOT 보장
```

### ADR-008: Automatic Backlinks]]

```
@decision Backlinks 섹션 자동 생성
@rationale
  - 수동 관리 시 일관성 깨짐
  - 양방향 추적 필수
  - 문서 탐색성 향상
@consequences
  - 문서 파일 자동 수정
  - 빌드 시 항상 재생성
```

---

## 사용 시나리오

### 시나리오 1: 문서 심볼 파싱

```typescript
import { DocumentSymbolParser } from './doc-symbol/DocumentSymbolParser';

const parser = new DocumentSymbolParser();
const parsed = parser.parse('managed/features/auth.md');

if (parsed) {
  console.log(`Primary: ${parsed.primary?.name}`);
  console.log(`Auxiliaries: ${parsed.auxiliaries.length}개`);
  console.log(`References: ${parsed.references.length}개`);
}
```

### 시나리오 2: 레지스트리 검증

```typescript
import { DocumentSymbolRegistry } from './doc-symbol/DocumentSymbolRegistry';

const registry = new DocumentSymbolRegistry();

// 모든 문서 등록
documents.forEach(doc => {
  const parsed = parser.parse(doc);
  if (parsed) registry.registerDocument(parsed);
});

// 검증
const validation = registry.validate();
if (!validation.valid) {
  validation.errors.forEach(err => {
    console.error(`[ERROR] ${err.symbolName}: ${err.message}`);
  });
}
```

### 시나리오 3: Backlinks 생성

```typescript
import { BacklinkGenerator } from './doc-symbol/BacklinkGenerator';

const generator = new BacklinkGenerator(registry);

// 특정 심볼의 Backlinks 조회
const backlinks = generator.collectBacklinks('UserService');
console.log(`${backlinks.length}개 문서에서 참조됨`);

// 문서에 Backlinks 섹션 삽입
generator.updateDocument('managed/services/user-service.md');
```

### 시나리오 4: Mermaid 심볼 추출

```typescript
import { MermaidSymbolExtractor } from './doc-symbol/MermaidSymbolExtractor';

const extractor = new MermaidSymbolExtractor();
const symbols = extractor.extract(mermaidCode);

symbols.forEach(sym => {
  console.log(`다이어그램 심볼: ${sym.name}`);
});
```

---

## 자동 생성 예시

### Backlinks 섹션

```markdown
## Backlinks
<!-- 자동 생성됨 -->

이 심볼을 참조하는 문서:
- [[Authentication Guide]] (managed/guides/auth.md:15)
- [[API Reference]] (managed/api/users.md:42)
- [[Architecture Overview]] (managed/architecture/overview.md:88)
```

### 각주 참조

```markdown
## Symbol References
<!-- 자동 생성됨 -->

[^sym-001]: [[UserService]] - src/services/UserService.ts:10
[^sym-002]: [[UserRepository]] - src/repositories/UserRepository.ts:5
[^sym-003]: [[AuthMiddleware]] - src/middleware/auth.ts:20
```

---

## 관련 시스템

- [[Parser System]] - 마크다운 파싱
- [[Symbol Graph System]] - 코드 심볼 조회
- [[Storage System]] - 레지스트리 저장
- [[Validator System]] - 연결성 검증

---

## CLI 명령어

| 명령어 | 설명 |
|--------|------|
| `tsdoc-edge index-docs <path>` | 문서 심볼 인덱싱 |
| `tsdoc-edge doc-symbols` | 문서 심볼 목록 |
| `tsdoc-edge update-backlinks` | Backlinks 갱신 |
| `tsdoc-edge validate-links` | 링크 유효성 검증 |
| `tsdoc-edge find-unused-docs` | 미참조 문서 탐지 |

---

## Backlinks
<!-- 이 섹션은 자동 생성됩니다 -->
