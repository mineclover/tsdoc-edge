# [[SELF-IMPROVEMENT-PROCESS]]: TSDoc Edge Self-Improvement Process

Generated: 2025-11-09

## Overview

TSDoc Edge의 자기 개선 프로세스는 **고아 코드**, **고아 문서**, **고아 심볼**, **잘못된 참조**를 자동으로 탐지하고 수정하는 체계적인 워크플로우입니다.

## Core Principles

### 1. SSOT (Single Source of Truth)

**원칙**: 모든 정보는 단일 출처를 가진다

- **Canonical Definition**: H1 `# [[Symbol]]`으로 정의 (primary)
- **Inline Reference**: 본문에 `[[Symbol]]`만 작성하면 참조
- **Auxiliary Definition**: H2 `## [[Symbol]]`은 참조 + 추가 설명 오버라이드
- **No Duplicates**: 각 심볼은 정확히 하나의 H1 canonical 정의를 가짐

**참조 방식**:
```markdown
# [[BuildCommand]]  ← Canonical (primary definition)

Some text about [[BuildCommand]] here.  ← Simple reference
More info on [[ParseCommand]].  ← Simple reference

## [[BuildCommand]]  ← Auxiliary (reference + override explanation)
Custom explanation specific to this document...
```

**검증**:
```bash
tsdoc-edge validate-docs managed
# ❌ orphaned_auxiliary: H2 정의만 있고 H1 없음
# ❌ missing_primary: 참조되었지만 정의되지 않음
```

### 2. Hierarchical Coverage

**원칙**: 파일 레벨 연결이 모든 심볼에 cascade

```markdown
**Source**: `src/cli.ts`
```

이 한 줄이 `src/cli.ts`의 모든 심볼(1592개)을 자동으로 연결

**검증**:
```bash
tsdoc-edge coverage-report --hierarchical
# 100.0% (1,592 / 1,592 symbols)
```

### 3. Bidirectional Linking

**원칙**: 문서 ↔ 코드 양방향 추적

- **Doc → Code**: `**Source**: \`path\`` 패턴
- **Code → Doc**: `@doc [[Symbol]]` TSDoc 태그

**검증**:
```bash
tsdoc-edge work-context <file-path>
# Shows: 관련 문서 + 의존 타입 + 호출자/피호출자
```

## Process Workflow

### Phase 1: 색인 (Indexing)

**Command**: `tsdoc-edge index-docs managed`

**What It Does**:
1. **문서 스캔**: 모든 `.md` 파일 탐색
2. **Primary 정의 추출**: H1 `# [[Symbol]]` 파싱
3. **Auxiliary 정의 추출**: H2 `## [[Symbol]]` 파싱 (오버라이드 설명용)
4. **Inline 참조 추출**: 본문의 `[[Symbol]]` 참조 수집
5. **코드 연결 생성**: `**Source**: \`path\`` 패턴 감지

**Output**: `.tsdoc/doc-symbols.json`
```json
{
  "symbols": ["BuildCommand", "CLI Runner", ...],
  "statistics": {
    "totalDefinitions": 157,      // Primary (H1)
    "totalAuxiliaries": 57,       // Auxiliary (H2)
    "totalReferences": 1210,      // Inline [[Symbol]]
    "totalCodeConnections": 143
  }
}
```

**Rules**:
- H1 `# [[Symbol]]`: Primary definition (canonical SSOT)
- H2 `## [[Symbol]]`: Auxiliary definition (참조 + 컨텍스트별 설명 오버라이드)
- `[[Symbol]]`: Inline reference (단순 참조만)
- Source 패턴은 자동으로 code connection 생성
- 87% automation rate (125 / 143 connections)

### Phase 2: 검증 (Validation)

**Command**: `tsdoc-edge validate-docs managed`

**What It Checks**:

#### 1. Orphaned Auxiliary
```markdown
## [[Event Flow]]  ← H2 auxiliary 정의만 있음 (오버라이드 설명)
(설명 내용...)
```
**Error**: Auxiliary definition has no primary (H1) definition

**의미**:
- H2는 "참조 + 설명 오버라이드"를 위한 것
- 하지만 참조할 H1 primary definition이 없음
- orphaned (고아) 상태

**Solution**:
- Option 1: H1 primary definition 생성
- Option 2: H2를 inline reference `[[Event Flow]]`로 변경
- Option 3: 미구현 기능이면 roadmap으로 표시

#### 2. Missing Primary
```markdown
Some text [[NonExistentSymbol]] more text  ← Inline reference
```
**Error**: Reference to undefined symbol

**의미**:
- Inline `[[Symbol]]`로 참조했지만
- 어디에도 H1 `# [[Symbol]]` 정의가 없음
- Broken link 상태

**Solution**:
- Option 1: 심볼 이름 수정 (오타, 대소문자, 공백)
- Option 2: 해당 심볼에 대한 H1 primary definition 생성
- Option 3: 참조 제거 (불필요한 링크)

#### 3. No Code Implementation
```markdown
# [[Workflow Guide]]
**Source**: `path/to/nonexistent.ts`
```
**Warning**: Symbol has no code implementation

**Assessment**:
- Workflow/guide 문서는 정상 (코드가 없어도 됨)
- 코드 심볼인데 파일이 없으면 오류

### Phase 3: 고아 탐지 (Orphan Detection)

#### 3.1 고아 코드 (Orphan Code)

**Command**: `tsdoc-edge detect-dead-code --high`

**Detection Algorithm**:
```typescript
1. 진입점 식별:
   - Exported symbols (isExported, isPublic)
   - Commands (src/commands/)
   - Analyzers (src/analyzer/)
   - CLI entry point (src/cli.ts)
   - Types/interfaces (type system)

2. 다중 신호 분석:
   - Incoming calls (unified_relationships)
   - Incoming dependencies (code-dependency)
   - Type usage (type-dependency)
   - Inheritance relationships

3. 필터링:
   - Skip test files (*.test.ts)
   - Skip private members (properties, methods)
   - Skip type-only symbols

4. 신뢰도 점수:
   - High: 0 calls + 0 deps = safe to delete
   - Medium: 0 calls + some deps = review needed
   - Low: some calls, test-only = maybe test util
```

**Current Result**: 0 high-confidence candidates (100% accuracy)

#### 3.2 고아 문서 (Orphan Documents)

**Command**: `tsdoc-edge explore-entrypoint <entrypoint.md> --detect-orphans`

**Detection Algorithm**:
```typescript
1. 진입점에서 BFS 탐색:
   - 시작: entrypoint 문서
   - 탐색: [[Symbol]] 링크 따라가기
   - 발견: 연결된 모든 문서와 심볼

2. 고아 계산:
   - 전체 문서 - 발견된 문서 = 고아 문서
   - 전체 심볼 - 발견된 심볼 = 고아 심볼
   - 전체 파일 - 발견된 파일 = 고아 코드

3. 출력:
   - Orphaned files: 89 files
   - Orphaned symbols: 1,295 symbols
   - Unreachable from entrypoint
```

**Action**:
- 핵심 파일 → 진입점에 링크 추가
- 레거시 파일 → `managed/archive/` 이동
- 불필요한 파일 → 삭제

#### 3.3 고아 심볼 (Orphan Symbols)

**Detection**: `validate-docs`의 부산물

**Types**:
1. **orphaned_auxiliary**: H2 auxiliary 정의만 있고 H1 primary 없음
2. **missing_primary**: Inline 참조만 있고 H1 primary 없음

**차이점**:
```markdown
## [[EventFlow]]       ← orphaned_auxiliary (H2인데 H1이 없음)
Custom explanation...

Some text [[EventFlow]] here  ← missing_primary (inline인데 H1이 없음)
```

**Solution Patterns**:

```bash
# Pattern 1: 오타 수정 (inline reference)
[[IOAnalyzer]] → [[IODependencyAnalyzer]]

# Pattern 2: 공백 문제 (inline reference)
[[Document Symbol System]] → [[DocumentSymbolSystem]]

# Pattern 3: H1 생성 (orphaned auxiliary → add primary)
## [[NewFeature]] → 별도 파일에 # [[NewFeature]] 생성

# Pattern 4: H2를 inline으로 변경 (auxiliary → simple reference)
## [[NewFeature]] → [[NewFeature]] (본문에)

# Pattern 5: 제거 (불필요한 참조)
[[NonExistent]] → (delete reference)
```

### Phase 4: 수정 (Fixing)

#### 4.1 자동 수정

**Symbol Name Normalization**:
```bash
# 일괄 치환
sed -i 's/\[\[IOAnalyzer\]\]/[[IODependencyAnalyzer]]/g' file.md

# 파일 경로 수정
sed -i 's|src/graph/SymbolGraph\.ts|src/graph/SymbolGraphBuilder.ts|g' file.md
```

**Bulk Operations**:
```bash
for file in managed/**/*.md; do
  sed -i.bak 's/old/new/g' "$file"
done
```

#### 4.2 수동 수정

**Missing Symbol 생성**:
```markdown
# [[DepsCommand]]

**Source**: `src/commands/Phase5Commands.ts`

## Purpose
Show dependencies of a symbol.

## Usage
tsdoc-edge deps <symbol-name>
```

**Auxiliary → Primary 승격**:
```bash
tsdoc-edge promote-symbol managed/path/to/doc.md "Symbol Name"
```

### Phase 5: 재검증 (Re-validation)

**Cycle**:
```bash
1. tsdoc-edge index-docs managed
2. tsdoc-edge validate-docs managed
3. Check error reduction
4. Repeat until errors < threshold
```

**Progress Tracking**:
- Errors: 318 → 310 → 298 → ...
- References: 1,210 → 1,207 → ...
- Coverage: 100.0% (maintained)

## Validation Rules

### Rule 1: Symbol Definition Types

**세 가지 참조 방식**:
```markdown
# [[Symbol]]         ← Primary (H1): Canonical definition (SSOT)
## [[Symbol]]        ← Auxiliary (H2): 참조 + 컨텍스트별 설명 오버라이드
[[Symbol]]          ← Inline: 단순 참조만
```

**규칙**:
- H1 `# [[Symbol]]`은 전체 문서에서 정확히 1번만 등장
- H2 `## [[Symbol]]`은 여러 문서에서 여러 번 가능 (각 문서별 컨텍스트 설명)
- Inline `[[Symbol]]`은 제한 없음

### Rule 2: Reference Validity
```markdown
모든 [[Symbol]] 참조 (H2 또는 inline)는 반드시 # [[Symbol]] primary definition을 가져야 함
```

### Rule 3: Code Connection
```markdown
**Source**: `path` must point to an existing file OR be a doc-only symbol
```

### Rule 4: Naming Convention
```markdown
- Classes: PascalCase, no spaces (CallGraphAnalyzer)
- Commands: PascalCase, no spaces (BuildCommand)
- Features: Title Case, spaces allowed (CLI Runner)
- Workflows: Title Case, spaces allowed (Work Context Workflow)
```

### Rule 5: Archive Exception
```markdown
Files in managed/archive/ are exempt from validation
(Historical documentation, allowed to have errors)
```

## Metrics and Monitoring

### Coverage Metrics
```bash
tsdoc-edge coverage-report --hierarchical
```
- Overall: 100.0%
- By Category: Commands 100%, Analyzers 100%, Types 100%, Utilities 100%

### Validation Metrics
```bash
tsdoc-edge validate-docs managed
```
- Errors: 298 (target: < 50)
- Warnings: 205 (acceptable)

### Connection Metrics
```bash
tsdoc-edge index-docs managed
```
- Code Connections: 143
- Automation Rate: 87% (125 / 143)
- Document References: 1,207

### Dead Code Metrics
```bash
tsdoc-edge detect-dead-code --high
```
- High Confidence: 0 (target: 0)
- False Positives: 0% (target: < 5%)

## Improvement Cycle

### Weekly Cycle
```bash
1. Monday: Run full validation
   tsdoc-edge validate-docs managed > weekly-report.txt

2. Tuesday-Thursday: Fix errors
   - Batch fix naming issues
   - Create missing documentation
   - Remove dead references

3. Friday: Re-index and verify
   tsdoc-edge index-docs managed
   tsdoc-edge coverage-report --hierarchical

4. Saturday: Dead code detection
   tsdoc-edge detect-dead-code --high

5. Sunday: Documentation review
   - Archive obsolete docs
   - Update roadmap
   - Plan next week
```

### Continuous Monitoring
```bash
# Pre-commit hook
tsdoc-edge validate-docs managed --strict

# CI/CD pipeline
tsdoc-edge coverage-report --hierarchical --json
tsdoc-edge detect-dead-code --high --json
```

## Success Criteria

### Achieved ✅
- [x] 100% documentation coverage
- [x] 0 dead code false positives
- [x] 87% automation rate
- [x] 189 documentation files
- [x] 157 primary symbols (no duplicates)

### In Progress 🔄
- [ ] Reduce validation errors to < 50
- [ ] Implement missing relationship types (7/17)
- [ ] Create all missing command docs

### Future Goals 🎯
- [ ] Real-time validation in editor
- [ ] Automatic link fix suggestions
- [ ] Visual documentation graph
- [ ] AI-powered documentation generation

## Tools and Commands

### Essential Commands
```bash
# Coverage
tsdoc-edge coverage-report --hierarchical

# Validation
tsdoc-edge validate-docs managed
tsdoc-edge validate-symbol-refs managed

# Indexing
tsdoc-edge index-docs managed

# Dead Code
tsdoc-edge detect-dead-code --high

# Work Context
tsdoc-edge work-context <file>

# Orphan Detection
tsdoc-edge explore-entrypoint <doc> --detect-orphans

# Symbol Management (NEW)
tsdoc-edge symbol-query managed list              # List all symbols
tsdoc-edge symbol-query managed search "pattern"  # Search symbols
tsdoc-edge symbol-query managed info "Symbol"     # Symbol details
tsdoc-edge symbol-query managed backlinks "Symbol" # Show backlinks
tsdoc-edge symbol-query managed similar "Symbol"  # Find similar
tsdoc-edge symbol-query managed stats             # Statistics

# Symbol Fixing (NEW)
tsdoc-edge symbol-fix managed --dry-run          # Preview fixes
tsdoc-edge symbol-fix managed --yes              # Apply fixes

# Symbol Promotion
tsdoc-edge promote-symbol <doc> <symbol>
```

### Helper Scripts
```bash
# Find missing symbols
node dist/cli.js validate-docs managed 2>&1 | grep "missing_primary" -A 2

# Count errors by type
node dist/cli.js validate-docs managed 2>&1 | grep "❌" | sort | uniq -c

# List defined symbols
cat .tsdoc/doc-symbols.json | jq -r '.symbols[]' | sort

# Batch rename
for f in managed/**/*.md; do sed -i 's/old/new/g' "$f"; done
```

## Related Documentation

- **[[Symbol Reference System]]** (`managed/concepts/symbol-reference-system.md`):
  - 상세한 `[[Symbol]]` 참조 시스템 설명
  - Primary (H1) vs Auxiliary (H2) vs Inline 차이점
  - 사용 예시와 best practices

- **[[FINAL-IMPROVEMENT-SUMMARY]]** (`FINAL-IMPROVEMENT-SUMMARY.md`):
  - 100% coverage 달성 과정
  - Dead code detection 정확도 개선
  - 통계 및 성과

- **[[CONTINUOUS-IMPROVEMENT-SUMMARY]]** (`CONTINUOUS-IMPROVEMENT-SUMMARY.md`):
  - 지속적 개선 활동
  - 검증 오류 감소 과정
  - Symbol duplication 분석

## Conclusion

This self-improvement process ensures:
- **Completeness**: 100% coverage, no missing documentation
- **Accuracy**: Valid references, correct symbol names
- **Cleanliness**: No orphans, no dead code
- **Automation**: 87% automated connections
- **Maintainability**: Clear rules, systematic validation

The system continuously improves itself by:
1. Detecting issues automatically
2. Providing clear fix guidance
3. Measuring progress
4. Maintaining quality standards

**See [[Symbol Reference System]] for detailed reference rules and examples.**
