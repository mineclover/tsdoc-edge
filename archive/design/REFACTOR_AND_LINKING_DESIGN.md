# 리팩토링 & 링킹 시스템 설계

> 파일 이동 시 참조 자동 업데이트 + 문서-코드 양방향 링크

## 목표

### 1. 파일 이동 시 참조 자동 업데이트 (LSP-like)
```typescript
// Before: src/utils/parser.ts
export class Parser { }

// After: src/core/parser.ts (파일 이동)
// → 모든 import 문 자동 업데이트
// import { Parser } from '../utils/parser'
// ↓
// import { Parser } from '../core/parser'
```

### 2. 문서-코드 심볼 양방향 링크
```typescript
/**
 * User authentication service
 * @see docs/AUTH_GUIDE.md  ← 코드에서 문서로
 * @relatedTo UserRepository
 */
export class AuthService { }
```

```markdown
<!-- docs/AUTH_GUIDE.md -->
# Authentication Guide

## Core Components
- [AuthService](src/services/AuthService.ts#AuthService)  ← 문서에서 코드로
- [UserRepository](src/repositories/UserRepository.ts#UserRepository)
```

---

## 아키텍처

### 컴포넌트 구조

```
┌─────────────────────────────────────────────────────────┐
│                   FileRefactorer                         │
│  - 파일 이동 감지                                          │
│  - Import 경로 업데이트                                    │
│  - 심볼 ID 재매핑                                         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                 ImportPathUpdater                        │
│  - AST 기반 import 문 파싱                                │
│  - 상대 경로 계산 및 업데이트                               │
│  - TypeScript Compiler API 활용                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   DocCodeLinker                          │
│  - 문서 내 코드 링크 추출                                  │
│  - 코드 내 문서 참조 추출                                  │
│  - 양방향 인덱스 구축                                      │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   LinkValidator                          │
│  - 끊어진 링크 탐지                                        │
│  - 자동 수정 제안                                         │
│  - CI/CD 검증 지원                                        │
└─────────────────────────────────────────────────────────┘
```

---

## 1. FileRefactorer 설계

### 책임
- 파일 이동/이름 변경 추적
- 영향받는 모든 import 문 업데이트
- 심볼 ID 재매핑 (SymbolRegistry)
- 문서 링크 자동 수정

### 인터페이스

```typescript
/**
 * File refactoring operations
 */
export interface FileRefactorer {
  /**
   * Move file and update all references
   *
   * @param oldPath - Current file path
   * @param newPath - New file path
   * @returns Refactoring result with updated files
   */
  moveFile(oldPath: string, newPath: string): RefactorResult;

  /**
   * Rename symbol and update all usages
   *
   * @param filePath - File containing symbol
   * @param oldName - Current symbol name
   * @param newName - New symbol name
   * @returns Refactoring result
   */
  renameSymbol(
    filePath: string,
    oldName: string,
    newName: string
  ): RefactorResult;

  /**
   * Preview refactoring changes (dry-run)
   */
  preview(operation: RefactorOperation): RefactorPreview;
}

export interface RefactorResult {
  success: boolean;
  updatedFiles: Array<{
    path: string;
    changes: Array<{
      line: number;
      oldText: string;
      newText: string;
    }>;
  }>;
  errors: RefactorError[];
}

export interface RefactorOperation {
  type: 'move' | 'rename';
  target: string;
  destination: string;
}
```

### 구현 단계

#### Phase 1: Import 경로 업데이트
```typescript
class FileRefactorer {
  /**
   * Step 1: 파일 이동 시 영향받는 파일 찾기
   */
  private findAffectedFiles(movedFile: string): string[] {
    // DependencyResolver로 의존성 역추적
    const dependents = this.dependencyResolver.getDependents(movedFile);
    return dependents;
  }

  /**
   * Step 2: Import 경로 업데이트
   */
  private updateImportPaths(
    affectedFile: string,
    oldPath: string,
    newPath: string
  ): FileEdit[] {
    const sourceFile = ts.createSourceFile(
      affectedFile,
      fs.readFileSync(affectedFile, 'utf-8'),
      ts.ScriptTarget.Latest
    );

    const edits: FileEdit[] = [];

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isImportDeclaration(node)) {
        const importPath = (node.moduleSpecifier as ts.StringLiteral).text;

        if (this.isRelativeImport(importPath, oldPath)) {
          const newImportPath = this.calculateNewPath(
            affectedFile,
            oldPath,
            newPath,
            importPath
          );

          edits.push({
            start: node.moduleSpecifier.getStart(),
            end: node.moduleSpecifier.getEnd(),
            newText: `'${newImportPath}'`,
          });
        }
      }
    });

    return edits;
  }

  /**
   * Step 3: 경로 재계산
   */
  private calculateNewPath(
    importingFile: string,
    oldExportPath: string,
    newExportPath: string,
    currentImportPath: string
  ): string {
    const importingDir = path.dirname(importingFile);
    const relativePath = path.relative(importingDir, newExportPath);

    // Remove .ts extension
    return relativePath.replace(/\.ts$/, '');
  }
}
```

#### Phase 2: 심볼 ID 재매핑
```typescript
class FileRefactorer {
  /**
   * Step 4: SymbolRegistry 업데이트
   */
  private remapSymbolIds(oldPath: string, newPath: string): void {
    const registry = this.symbolRegistryManager;

    // 이동한 파일의 모든 심볼 찾기
    const symbols = registry.getSymbolsByFile(oldPath);

    for (const symbol of symbols) {
      // ID는 유지, filePath만 업데이트
      registry.updateSymbolPath(symbol.id, newPath);
    }
  }
}
```

#### Phase 3: 문서 링크 업데이트
```typescript
class FileRefactorer {
  /**
   * Step 5: 문서 내 링크 업데이트
   */
  private updateDocumentLinks(oldPath: string, newPath: string): void {
    const linker = this.docCodeLinker;

    // 문서에서 이 파일로 가는 모든 링크 찾기
    const links = linker.findLinksToFile(oldPath);

    for (const link of links) {
      const updated = link.text.replace(oldPath, newPath);
      this.updateMarkdownFile(link.docPath, link.line, updated);
    }
  }
}
```

---

## 2. DocCodeLinker 설계

### 책임
- 마크다운 문서 내 코드 링크 파싱
- TSDoc 주석 내 문서 참조 파싱
- 양방향 인덱스 구축
- 링크 유효성 검증

### 링크 형식

#### 문서 → 코드
```markdown
# Authentication Guide

## Core Services
- [AuthService](src/services/AuthService.ts#AuthService)
  - 클래스로 직접 점프
- [login method](src/services/AuthService.ts#AuthService.login)
  - 메서드로 직접 점프
- [UserRepository](src/repositories/UserRepository.ts)
  - 파일 전체
```

#### 코드 → 문서
```typescript
/**
 * Authentication service
 *
 * @see docs/AUTH_GUIDE.md - 전체 가이드
 * @see docs/AUTH_GUIDE.md#authentication-flow - 특정 섹션
 * @link docs/API_REFERENCE.md#auth-endpoints - API 문서
 */
export class AuthService {
  /**
   * User login
   * @see docs/AUTH_GUIDE.md#login-process
   */
  login() { }
}
```

### 인터페이스

```typescript
export interface DocCodeLinker {
  /**
   * Build bidirectional index
   */
  buildIndex(
    codeFiles: string[],
    docFiles: string[]
  ): LinkIndex;

  /**
   * Find all links from docs to code
   */
  findCodeLinks(docPath: string): CodeLink[];

  /**
   * Find all links from code to docs
   */
  findDocLinks(codePath: string): DocLink[];

  /**
   * Get related documents for a symbol
   */
  getRelatedDocs(symbolId: string): DocumentReference[];

  /**
   * Get related symbols for a document
   */
  getRelatedSymbols(docPath: string): SymbolReference[];
}

export interface CodeLink {
  /** 문서 파일 경로 */
  docPath: string;
  /** 문서 내 라인 */
  docLine: number;
  /** 링크 텍스트 */
  text: string;
  /** 타겟 파일 경로 */
  targetFile: string;
  /** 타겟 심볼 이름 (옵션) */
  targetSymbol?: string;
  /** 타겟 멤버 (옵션, Class#method) */
  targetMember?: string;
}

export interface DocLink {
  /** 코드 파일 경로 */
  codePath: string;
  /** 코드 내 라인 */
  codeLine: number;
  /** 심볼 이름 */
  symbolName: string;
  /** 태그 타입 (@see, @link) */
  tagType: string;
  /** 타겟 문서 경로 */
  targetDoc: string;
  /** 문서 내 섹션 (옵션) */
  targetSection?: string;
}

export interface LinkIndex {
  /** 코드 → 문서 매핑 */
  codeToDoc: Map<string, DocLink[]>;
  /** 문서 → 코드 매핑 */
  docToCode: Map<string, CodeLink[]>;
  /** 심볼 → 문서 매핑 */
  symbolToDoc: Map<string, string[]>;
  /** 문서 → 심볼 매핑 */
  docToSymbol: Map<string, string[]>;
}
```

### 구현

```typescript
class DocCodeLinker {
  /**
   * 마크다운 링크 파싱
   */
  private parseMarkdownLinks(docPath: string): CodeLink[] {
    const content = fs.readFileSync(docPath, 'utf-8');
    const links: CodeLink[] = [];

    // Regex: [text](path#symbol)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

    let match;
    let lineNumber = 1;

    for (const line of content.split('\n')) {
      while ((match = linkRegex.exec(line)) !== null) {
        const [, text, target] = match;

        // src/services/AuthService.ts#AuthService.login
        const [filePath, anchor] = target.split('#');

        if (this.isCodeFile(filePath)) {
          const [symbolName, memberName] = anchor
            ? anchor.split('.')
            : [undefined, undefined];

          links.push({
            docPath,
            docLine: lineNumber,
            text,
            targetFile: filePath,
            targetSymbol: symbolName,
            targetMember: memberName,
          });
        }
      }
      lineNumber++;
    }

    return links;
  }

  /**
   * TSDoc @see, @link 태그 파싱
   */
  private parseDocTags(codePath: string): DocLink[] {
    const sourceFile = ts.createSourceFile(
      codePath,
      fs.readFileSync(codePath, 'utf-8'),
      ts.ScriptTarget.Latest
    );

    const links: DocLink[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node)) {
        const jsDocTags = ts.getJSDocTags(node);

        for (const tag of jsDocTags) {
          if (tag.tagName.text === 'see' || tag.tagName.text === 'link') {
            const comment = tag.comment as string;

            // "docs/AUTH_GUIDE.md#section"
            if (comment && this.isDocFile(comment)) {
              const [docPath, section] = comment.split('#');

              links.push({
                codePath,
                codeLine: node.getStart(),
                symbolName: this.getSymbolName(node),
                tagType: tag.tagName.text,
                targetDoc: docPath.trim(),
                targetSection: section?.trim(),
              });
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return links;
  }
}
```

---

## 3. LinkValidator 설계

### 책임
- 끊어진 링크 탐지
- 링크 타겟 존재 여부 검증
- 자동 수정 제안
- CI/CD 검증 리포트 생성

### 인터페이스

```typescript
export interface LinkValidator {
  /**
   * Validate all links in the codebase
   */
  validateAll(): ValidationReport;

  /**
   * Validate links in a specific document
   */
  validateDocument(docPath: string): ValidationResult[];

  /**
   * Validate links from a specific symbol
   */
  validateSymbol(symbolId: string): ValidationResult[];

  /**
   * Auto-fix broken links
   */
  autoFix(brokenLinks: ValidationResult[]): FixResult[];
}

export interface ValidationResult {
  type: 'broken' | 'valid' | 'outdated';
  link: CodeLink | DocLink;
  issue?: string;
  suggestion?: string;
}

export interface ValidationReport {
  totalLinks: number;
  brokenLinks: ValidationResult[];
  validLinks: number;
  fixableLinks: number;
}
```

### 검증 규칙

```typescript
class LinkValidator {
  /**
   * 1. 파일 존재 여부
   */
  private validateFileExists(link: CodeLink): ValidationResult {
    if (!fs.existsSync(link.targetFile)) {
      return {
        type: 'broken',
        link,
        issue: `File not found: ${link.targetFile}`,
        suggestion: this.findSimilarFiles(link.targetFile),
      };
    }
    return { type: 'valid', link };
  }

  /**
   * 2. 심볼 존재 여부
   */
  private validateSymbolExists(link: CodeLink): ValidationResult {
    if (!link.targetSymbol) {
      return { type: 'valid', link };
    }

    const symbols = this.symbolExtractor.extractFromFile(link.targetFile);
    const found = symbols.find((s) => s.name === link.targetSymbol);

    if (!found) {
      return {
        type: 'broken',
        link,
        issue: `Symbol not found: ${link.targetSymbol}`,
        suggestion: this.findSimilarSymbols(link.targetSymbol, symbols),
      };
    }

    return { type: 'valid', link };
  }

  /**
   * 3. 멤버 존재 여부
   */
  private validateMemberExists(link: CodeLink): ValidationResult {
    if (!link.targetMember) {
      return { type: 'valid', link };
    }

    // Class#method 형식 검증
    const symbols = this.symbolExtractor.extractFromFile(link.targetFile);
    const classSymbol = symbols.find((s) => s.name === link.targetSymbol);

    if (classSymbol && classSymbol.members) {
      const member = classSymbol.members.find(
        (m) => m.name === link.targetMember
      );

      if (!member) {
        return {
          type: 'broken',
          link,
          issue: `Member not found: ${link.targetSymbol}.${link.targetMember}`,
        };
      }
    }

    return { type: 'valid', link };
  }

  /**
   * 4. 자동 수정 제안
   */
  private suggestFix(result: ValidationResult): string | undefined {
    if (result.type !== 'broken') return undefined;

    const link = result.link as CodeLink;

    // 파일명이 비슷한 것 찾기
    const similar = this.findSimilarFiles(link.targetFile);
    if (similar.length > 0) {
      return `Did you mean: ${similar[0]}?`;
    }

    // 심볼명이 비슷한 것 찾기
    if (link.targetSymbol) {
      const symbols = this.getAllSymbols();
      const similar = this.findSimilarSymbols(link.targetSymbol, symbols);
      if (similar.length > 0) {
        return `Did you mean: ${similar[0].name}?`;
      }
    }

    return undefined;
  }
}
```

---

## CLI 명령어

### 파일 이동
```bash
# 파일 이동 (dry-run)
tsdoc-edge refactor move src/utils/parser.ts src/core/parser.ts --dry-run

# 실제 이동
tsdoc-edge refactor move src/utils/parser.ts src/core/parser.ts

# 출력:
# 📦 Moving: src/utils/parser.ts → src/core/parser.ts
#
# 📝 Files to update (3):
#   - src/services/AuthService.ts (line 5)
#     import { Parser } from '../utils/parser'
#     → import { Parser } from '../core/parser'
#
#   - src/controllers/UserController.ts (line 3)
#   - tests/parser.test.ts (line 1)
#
# 📄 Documents to update (1):
#   - docs/PARSER_GUIDE.md (line 12)
#     [Parser](src/utils/parser.ts)
#     → [Parser](src/core/parser.ts)
#
# ✅ All references updated successfully
```

### 심볼 이름 변경
```bash
# 심볼 이름 변경
tsdoc-edge refactor rename src/services/AuthService.ts AuthService UserAuthService

# 출력:
# 🔄 Renaming: AuthService → UserAuthService
#
# 📝 Usages to update (15):
#   - src/controllers/AuthController.ts (5 occurrences)
#   - src/middleware/auth.ts (2 occurrences)
#   - tests/auth.test.ts (8 occurrences)
#
# ✅ Renamed successfully
```

### 링크 검증
```bash
# 모든 링크 검증
tsdoc-edge validate-links

# 출력:
# 🔍 Validating links...
#
# 📊 Summary:
#   Total links: 142
#   ✅ Valid: 138
#   ❌ Broken: 4
#   🔧 Fixable: 2
#
# ❌ Broken links:
#   1. docs/AUTH_GUIDE.md:12
#      [AuthService](src/services/AuthService.ts)
#      → File not found
#      💡 Suggestion: Did you mean src/services/UserAuthService.ts?
#
#   2. src/services/UserService.ts:5
#      @see docs/USER_API.md
#      → Document not found
#
# 🔧 Auto-fixable (2):
#   Run: tsdoc-edge validate-links --fix

# 자동 수정
tsdoc-edge validate-links --fix

# 특정 문서만 검증
tsdoc-edge validate-links docs/AUTH_GUIDE.md
```

### 양방향 링크 조회
```bash
# 심볼의 관련 문서 찾기
tsdoc-edge links from-symbol AuthService

# 출력:
# 📄 Documents referencing AuthService:
#   - docs/AUTH_GUIDE.md (3 links)
#   - docs/API_REFERENCE.md (1 link)
#   - README.md (1 link)

# 문서의 관련 심볼 찾기
tsdoc-edge links from-doc docs/AUTH_GUIDE.md

# 출력:
# 🔗 Symbols referenced in docs/AUTH_GUIDE.md:
#   - AuthService (src/services/AuthService.ts)
#   - UserRepository (src/repositories/UserRepository.ts)
#   - AuthMiddleware (src/middleware/auth.ts)
```

---

## CI/CD 통합

### GitHub Actions

```yaml
name: Link Validation

on: [push, pull_request]

jobs:
  validate-links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Install
        run: npm install

      - name: Build
        run: npm run build

      - name: Validate Links
        run: |
          tsdoc-edge validate-links > link-report.txt
          if grep -q "❌ Broken" link-report.txt; then
            cat link-report.txt
            exit 1
          fi

      - name: Comment PR
        if: failure() && github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('link-report.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## ⚠️ Broken Links Detected\n\n\`\`\`\n${report}\n\`\`\``
            });
```

---

## 구현 우선순위

### Phase 1: 링크 검증 (즉시 유용)
1. ✅ DocCodeLinker 구현
2. ✅ LinkValidator 구현
3. ✅ CLI: `validate-links` 명령어

### Phase 2: 파일 이동
1. ⏳ FileRefactorer 구현
2. ⏳ ImportPathUpdater 구현
3. ⏳ CLI: `refactor move` 명령어

### Phase 3: 심볼 이름 변경
1. ⏳ SymbolRenamer 구현
2. ⏳ CLI: `refactor rename` 명령어

---

## 기대 효과

### 개발자 경험
- 📁 파일 이동 시 수동 import 수정 불필요
- 📝 문서와 코드 동기화 자동 검증
- 🔗 끊어진 링크 조기 발견
- 🔄 리팩토링 안전성 증가

### 문서 품질
- 📚 항상 최신 링크 유지
- 🎯 코드-문서 간 명확한 연결
- 🚀 문서 탐색 속도 향상

### 팀 협업
- 🤝 코드 리뷰 시 문서 영향도 확인
- 📊 CI/CD로 링크 검증 자동화
- 💡 리팩토링 두려움 감소
