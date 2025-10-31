# [[문서 심볼]] 시스템 설계

> 문서 기반 드리븐 개발을 위한 Wiki 스타일 심볼 정의 및 연결 시스템

## 개요

mdoc-tools의 문서 드리븐 개념을 계승하여, TSDoc 기반 코드와 마크다운 문서를 양방향으로 연결하는 **[[문서 심볼]]** 시스템을 구현합니다.

### 핵심 개념

```markdown
# [[Authentication]]          ← 정의 (Definition)
인증 시스템 전체 개요

## [[Authentication]] 구현    ← 보조 정의 (Auxiliary)
상세 구현 내용

[[Authentication]]을 사용    ← 참조 (Reference)

## Code References
- [AuthService](src/services/AuthService.ts)   ← 하위 모듈
- [UserRepository](src/repositories/UserRepository.ts)

## Backlinks
자동 생성됨 ↓
- [[Login System]] → docs/login.md
- AuthService → src/services/AuthService.ts
```

---

## 문법 규칙

### 1. H1 정의 (Primary Definition)

```markdown
# [[DocumentSymbol]]
```

**규칙:**
- H1 레벨에서만 문서 심볼 정의 가능
- 파일당 **하나의 H1 [[]]** 정의만 허용 (SSOT)
- 이 문서는 해당 심볼의 "소유자(owner)" 문서가 됨

**예시:**
```markdown
# [[Authentication System]]

사용자 인증 및 권한 관리를 담당하는 시스템입니다.

## Components
- Login
- Session Management
- Authorization
```

### 2. H2+ 보조 정의 (Auxiliary Definition)

```markdown
## [[DocumentSymbol]]
### [[DocumentSymbol]]
```

**규칙:**
- H2 이하에서는 **기존 정의에 내용을 추가**하는 역할
- 반드시 다른 문서에 H1 정의가 존재해야 함
- 같은 파일 내에서 H1과 H2+ 중복 정의 가능

**예시:**
```markdown
# Implementation Details

## [[Authentication System]]
인증 시스템의 구현 세부사항...

### Flow
1. 사용자 로그인
2. 토큰 발급
```

### 3. 인라인 참조 (Reference)

```markdown
[[DocumentSymbol]]
```

**규칙:**
- 헤딩 외의 모든 위치에서 사용
- 정의된 문서로 링크됨
- 참조 카운트 추적됨

**예시:**
```markdown
로그인 프로세스는 [[Authentication System]]에서 처리됩니다.
```

---

## 코드-문서 연결

### 1. 문서 → 코드 (하위 모듈)

```markdown
# [[Authentication System]]

## Code References
- [AuthService](src/services/AuthService.ts#AuthService)
- [login](src/services/AuthService.ts#AuthService.login)
```

**규칙:**
- H1 [[]] 정의 하위의 코드 참조는 "하위 모듈"로 간주
- 코드는 해당 문서 심볼의 구현체가 됨

### 2. 코드 → 문서 (Backlink)

```typescript
/**
 * User authentication service
 *
 * @doc [[Authentication System]]
 * @responsibility Handle user login and session
 */
export class AuthService {
  /**
   * User login
   * @doc [[Authentication System#Login]]
   */
  login() {}
}
```

**규칙:**
- TSDoc에서 `@doc [[SymbolName]]` 태그 사용
- 코드가 어떤 문서 심볼과 연결되는지 명시
- 섹션 지정 가능: `[[Symbol#Section]]`
- 자동으로 Backlink 생성

---

## Backlink 자동 생성

### 구조

```markdown
# [[Authentication System]]

... 본문 ...

---

## Backlinks

### Referenced By

- [[Payment System]] → /Users/junwoobang/project/tsdoc-edge/docs/DOCUMENT_SYMBOL_DESIGN.md:535
- [[Payment System]]#Processing → /Users/junwoobang/project/tsdoc-edge/docs/DOCUMENT_SYMBOL_DESIGN.md:541

# 중복 정의 검사
tsdoc-edge validate-docs

# 출력:
# ❌ Duplicate definitions:
#   - [[Authentication]]:
#     1. docs/auth.md:1 (primary)
#     2. docs/login.md:1 (duplicate) ← 에러
#
# ❌ Orphaned auxiliary definitions:
#   - [[NonExistent]] in docs/test.md:15
#     → No primary definition found
#
# ✅ Valid definitions: 42
```

---

## 타입 정의

```typescript
/**
 * Document symbol definition
 */
export interface DocumentSymbol {
  /** Symbol name */
  name: string;

  /** Definition type */
  type: 'primary' | 'auxiliary' | 'reference';

  /** File path */
  filePath: string;

  /** Line number */
  line: number;

  /** Heading level (1-6, 0 for inline) */
  level: number;

  /** Content/description */
  content?: string;
}

/**
 * Document symbol registry
 */
export interface DocumentSymbolRegistry {
  /** Primary definitions (H1) */
  definitions: Map<string, DocumentSymbol>;

  /** Auxiliary definitions (H2+) */
  auxiliaries: Map<string, DocumentSymbol[]>;

  /** All references */
  references: Map<string, DocumentSymbol[]>;

  /** Code connections (@doc tags) */
  codeConnections: Map<string, CodeConnection[]>;
}

/**
 * Code connection to document symbol
 */
export interface CodeConnection {
  /** Symbol name from code */
  codeSymbol: string;

  /** File path */
  filePath: string;

  /** Line number */
  line: number;

  /** Target document symbol */
  docSymbol: string;

  /** Section (optional) */
  section?: string;
}

/**
 * Backlink entry
 */
export interface Backlink {
  /** Type */
  type: 'document' | 'code';

  /** Source symbol/code */
  source: string;

  /** File path */
  filePath: string;

  /** Line number */
  line: number;
}
```

---

## 구현 컴포넌트

### 1. DocumentSymbolParser

```typescript
/**
 * Parse [[]] symbols from markdown
 */
export class DocumentSymbolParser {
  /**
   * Parse document for [[]] symbols
   *
   * @param filePath - Markdown file path
   * @returns Parsed symbols
   */
  parse(filePath: string): ParsedDocSymbols;

  /**
   * Extract H1 [[]] definition
   */
  private extractPrimaryDefinition(content: string): DocumentSymbol | null;

  /**
   * Extract H2+ [[]] definitions
   */
  private extractAuxiliaryDefinitions(content: string): DocumentSymbol[];

  /**
   * Extract inline [[]] references
   */
  private extractReferences(content: string): DocumentSymbol[];
}
```

### 2. DocumentSymbolRegistry

```typescript
/**
 * Registry for document symbols with SSOT validation
 */
export class DocumentSymbolRegistry {
  /**
   * Register a document
   *
   * @throws {Error} If duplicate primary definition
   */
  registerDocument(symbols: ParsedDocSymbols): void;

  /**
   * Get definition for symbol
   */
  getDefinition(name: string): DocumentSymbol | undefined;

  /**
   * Get all references to symbol
   */
  getReferences(name: string): DocumentSymbol[];

  /**
   * Get code connections
   */
  getCodeConnections(name: string): CodeConnection[];

  /**
   * Validate SSOT rules
   */
  validate(): ValidationResult[];
}
```

### 3. TSDocSymbolParser

```typescript
/**
 * Parse @doc tags from TSDoc
 */
export class TSDocSymbolParser {
  /**
   * Parse @doc [[]] tags from code
   */
  parseCodeFile(filePath: string): CodeConnection[];

  /**
   * Extract @doc tags from JSDoc
   */
  private extractDocTags(node: ts.Node): string[];
}
```

### 4. BacklinkGenerator

```typescript
/**
 * Generate and update backlinks in documents
 */
export class BacklinkGenerator {
  /**
   * Generate backlinks for a document symbol
   */
  generateBacklinks(symbolName: string): string;

  /**
   * Update backlinks section in document
   *
   * @param filePath - Document path
   * @param backlinks - Backlink markdown
   */
  updateBacklinksSection(filePath: string, backlinks: string): void;

  /**
   * Find or create backlinks section
   */
  private findBacklinksSection(content: string): { start: number; end: number } | null;
}
```

---

## CLI 명령어

### 문서 심볼 인덱싱

```bash
# 모든 문서에서 [[]] 파싱 및 인덱스 생성
tsdoc-edge index-docs

# 출력:
# 🔍 Scanning documents...
#
# 📊 Summary:
#   Documents scanned: 42
#   Primary definitions: 38
#   Auxiliary definitions: 15
#   References: 124
#   Code connections: 56
#
# ✅ Index created: .tsdoc/doc-symbols.jsonl
```

### SSOT 검증

```bash
# 중복 정의 및 고아 참조 검사
tsdoc-edge validate-docs

# 옵션
tsdoc-edge validate-docs --fix  # 자동 수정 (가능한 경우)
```

### Backlink 생성

```bash
# 모든 문서의 Backlink 자동 생성/갱신
tsdoc-edge update-backlinks

# 특정 문서만
tsdoc-edge update-backlinks docs/auth.md

# 출력:
# 📝 Updating backlinks...
#
# ✅ Updated:
#   - docs/auth.md (5 backlinks)
#   - docs/login.md (3 backlinks)
#   - docs/session.md (2 backlinks)
#
# 📊 Total: 10 backlinks updated
```

### 문서 심볼 검색

```bash
# 심볼 정의 찾기
tsdoc-edge find-doc "Authentication"

# 출력:
# 📄 [[Authentication System]]
#   Defined in: docs/auth.md:1
#
#   Referenced by (8):
#     - docs/login.md:12
#     - docs/session.md:5
#     - docs/api.md:23
#     ...
#
#   Implemented by (3):
#     - src/services/AuthService.ts:15
#     - src/middleware/auth.ts:8
#     - src/controllers/AuthController.ts:12

# 역참조 찾기
tsdoc-edge backlinks "Authentication"

# 문서 심볼 그래프
tsdoc-edge doc-graph --output=docs/SYMBOL_GRAPH.md
```

---

## 워크플로우 예시

### 1. 새 기능 문서 작성

```markdown
# File: docs/payment.md

# [[Payment System]]

결제 처리 시스템

## Overview
사용자 결제를 안전하게 처리합니다.

## Dependencies
- [[Authentication System]]
- [[Order Management]]

## Code References
- [PaymentService](src/services/PaymentService.ts)
- [PaymentGateway](src/integrations/PaymentGateway.ts)
```

### 2. 코드 구현

```typescript
// File: src/services/PaymentService.ts

/**
 * Payment processing service
 *
 * @doc [[Payment System]]
 * @responsibility Process payments securely
 */
export class PaymentService {
  /**
   * Process payment
   * @doc [[Payment System#Processing]]
   */
  async processPayment() {
    // [[Authentication System]] 연동 필요
  }
}
```

### 3. 인덱싱 및 검증

```bash
# 인덱스 생성
tsdoc-edge index-docs

# 검증
tsdoc-edge validate-docs
# ✅ All clear

# Backlink 생성
tsdoc-edge update-backlinks
```

### 4. 결과

```markdown
# File: docs/payment.md (자동 업데이트됨)

# [[Payment System]]

...

---

## Backlinks

### Referenced By
- PaymentService → src/services/PaymentService.ts:5
- PaymentGateway → src/integrations/PaymentGateway.ts:3

### References
- [[Authentication System]] → docs/auth.md
- [[Order Management]] → docs/orders.md
```

---

## 데이터베이스 스키마

```sql
-- Document symbols table
CREATE TABLE doc_symbols (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT CHECK(type IN ('primary', 'auxiliary', 'reference')),
  file_path TEXT NOT NULL,
  line INTEGER NOT NULL,
  level INTEGER NOT NULL,
  content TEXT,
  created_at TEXT NOT NULL
);

-- References table
CREATE TABLE doc_references (
  id INTEGER PRIMARY KEY,
  symbol_name TEXT NOT NULL,
  source_file TEXT NOT NULL,
  source_line INTEGER NOT NULL,
  reference_type TEXT CHECK(reference_type IN ('document', 'code')),
  FOREIGN KEY (symbol_name) REFERENCES doc_symbols(name)
);

-- Code connections table
CREATE TABLE code_connections (
  id INTEGER PRIMARY KEY,
  code_symbol TEXT NOT NULL,
  code_file TEXT NOT NULL,
  code_line INTEGER NOT NULL,
  doc_symbol TEXT NOT NULL,
  section TEXT,
  FOREIGN KEY (doc_symbol) REFERENCES doc_symbols(name)
);
```

---

## 기대 효과

### 개발자 경험
- 📚 문서 중심 개발 워크플로우
- 🔗 코드-문서 양방향 연결
- 🎯 명확한 심볼 정의 및 소유권
- 🚀 자동화된 Backlink 관리

### 문서 품질
- ✅ SSOT 보장 (중복 정의 방지)
- 📊 참조 추적 및 영향 범위 파악
- 🔍 빠른 정의 검색
- 📈 문서 연결성 시각화

### 팀 협업
- 🤝 명확한 문서 소유권
- 💡 코드와 문서의 일관성
- 📝 자동화된 문서 유지보수

---

## 다음 단계

1. **Phase 1**: 기본 파싱 및 인덱싱
2. **Phase 2**: SSOT 검증
3. **Phase 3**: Backlink 자동 생성
4. **Phase 4**: CLI 통합
5. **Phase 5**: 시각화 및 그래프
