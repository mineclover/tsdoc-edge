# [[Work Context Workflow]]

**Document Type**: Essential Workflow
**Status**: Active
**Last Updated**: 2025-11-23
**Primary Symbols**: [[WorkContextCommand]], DesignContextCommand

## Purpose

**작업자 중심의 핵심 워크플로우**: "이 파일 작업하려면 뭘 봐야 하지?"에 대한 단일 명령어 답변.

모든 분석 기능의 궁극적 목표는 **작업자가 파일을 수정하기 전에 필요한 모든 컨텍스트를 즉시 제공**하는 것입니다.

TSDoc Edge는 두 가지 컨텍스트 명령어를 제공합니다:
- **`work-context`** (wc): 관계 그래프 중심 + LLM 출력 지원 (일반 작업용)
- **`design-context`** (dc): 설계 의사결정 추적 (contracts, decisions, error patterns)

---

## The Problem

코드 작업 전 필요한 정보:
1. 📄 **관련 문서**: 이 코드의 기획서/명세서는?
2. 🔗 **의존 타입**: 이 코드가 사용하는 타입들은?
3. 🧪 **테스트**: 이 코드를 테스트하는 파일은?
4. ⚠️ **영향 범위**: 이 코드를 수정하면 어디가 영향받지?

**기존 방식**: 4개 명령어를 따로따로 실행
```bash
tsdoc-edge parse src/services/UserService.ts
tsdoc-edge deps user-service
tsdoc-edge test-relationships | grep user-service
tsdoc-edge who-uses user-service
```

**문제**: 너무 많은 단계, 정보가 분산됨.

---

## The Solution

### 단일 명령어로 모든 컨텍스트 제공

TSDoc Edge는 두 가지 컨텍스트 명령어를 제공합니다:

#### 1. `work-context` (추천) - 관계 그래프 + LLM

```bash
# 사람이 읽기 편한 형식 (기본)
tsdoc-edge work-context <file-path>
tsdoc-edge wc <file-path>

# LLM 친화적 형식
tsdoc-edge wc <file-path> --llm

# LLM 컨텍스트를 파일로 저장
tsdoc-edge wc <file-path> --llm --output context.txt
```

**특징**:
- 관계 밀도 (relationship density)
- 커버리지 통계 (test/documentation coverage)
- 영향 분석 (impact analysis)
- 의미론적 이웃 (semantic neighbors)
- **LLM 출력 모드** (AI 어시스턴트 통합)
- 실행 가능한 권장사항
- 영어 출력

**사용 사례**:
- 일반적인 개발 작업
- AI 어시스턴트와 협업
- 빠른 컨텍스트 파악

#### 2. `design-context` - 설계 의사결정 추적

```bash
tsdoc-edge design-context <file-path>
tsdoc-edge dc <file-path>
```

**특징**:
- 계약 (contracts: preconditions, postconditions, invariants)
- 설계 결정 (design decisions)
- 에러 패턴 (common pitfalls)
- 통합 관계 (unified relationships)
- 관계 통계 (relationship stats)
- 한국어 출력

**사용 사례**: 복잡한 비즈니스 로직, 계약 중심 코드, 아키텍처 리뷰

---

## Usage

### Option 1: work-context (추천 - 일반 작업)

```bash
# 사람이 읽기 편한 형식
tsdoc-edge work-context src/services/UserService.ts
tsdoc-edge wc src/services/UserService.ts

# LLM 친화적 형식 (Claude, GPT 등에 복사-붙여넣기)
tsdoc-edge wc src/services/UserService.ts --llm

# 파일로 저장
tsdoc-edge wc src/services/UserService.ts --llm --output context.txt
```

### Option 2: design-context (설계 추적)

```bash
tsdoc-edge design-context src/services/UserService.ts
tsdoc-edge dc src/services/UserService.ts
```

### 출력 예시: design-context (설계 추적)

```
================================================================================
Work Context: UserService.ts
================================================================================

📄 src/services/UserService.ts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 관련 문서 (2개)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • [[User Management System]]
    → managed/features/user-management.md

  • [[Authentication Flow]]
    → managed/workflows/authentication.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 의존 타입 (5개)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  User              → src/types/User.ts
  UserDTO           → src/types/UserDTO.ts
  DatabaseManager   → src/storage/DatabaseManager.ts
  ValidationError   → src/errors/ValidationError.ts
  Logger            → src/utils/Logger.ts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 테스트 (2개)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ src/__tests__/services/UserService.test.ts
     → 커버리지: 87%

  🔗 src/__tests__/integration/user-flow.test.ts
     → 통합 테스트

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  영향 범위 (8개 파일이 이 파일 사용)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  UserController    → src/controllers/UserController.ts
  AuthService       → src/services/AuthService.ts
  AdminService      → src/services/AdminService.ts
  ... 5 more

  ⚠️  수정 시 위 8개 파일 영향 받음

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 요약
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  심볼: 12개
  문서: 2개
  의존: 5개
  테스트: 2개
  영향: 8개 파일
```

### 출력 예시: work-context (관계 + 통계)

```
================================================================================
Work Context: DocReferenceAnalyzer.ts
================================================================================

📄 src/analyzer/DocReferenceAnalyzer.ts

📊 Summary
────────────────────────────────────────────────────────────────────────────────
  Symbols:              8
  Relationships:        47
  Relationship Density: 5.88
  Test Coverage:        0.0% (0 tests)
  Documentation:        75.0% (36 docs)

🔤 Symbols
────────────────────────────────────────────────────────────────────────────────
  Total: 8 (3 exported, 3 public)

  DocReferenceAnalyzer (class) [exported, public]
  DocReferenceAnalyzer.graph (property)
  DocReferenceAnalyzer.parser (property)
  DocReferenceAnalyzer.analyze (method) [exported, public]
  ...

📄 Documentation
────────────────────────────────────────────────────────────────────────────────
  [[Symbol]]
    Referenced by: DocReferenceAnalyzer, DocReferenceAnalyzer.graph +2

⚠ ️ No test coverage found

📦 Dependencies
────────────────────────────────────────────────────────────────────────────────
  This file depends on 5 other file(s)

  src/types/graph/graph.ts
  src/types/relationships/unified.ts
  ...

🔗 Impact Analysis
────────────────────────────────────────────────────────────────────────────────
  1 file(s) depend on this file

  src/commands/AnalyzeDocReferenceCommand.ts

💡 Recommendations
────────────────────────────────────────────────────────────────────────────────
  • Low test coverage (0.0%) - consider adding tests
```

### 출력 예시: work-context --llm (LLM 친화적)

```markdown

> **Entry Point Type**: file
> **Generated**: 2025-11-23T15:59:17.218Z
> **Depth**: 2 levels

---

## Summary

**DocReferenceAnalyzer** is a `class`: Analyzes doc reference relationships (@doc [[Symbol]])

## Location

- **File**: `src/analyzer/DocReferenceAnalyzer.ts`
- **Line**: 49
- **Type**: `class`
- **Visibility**: Public API
- **Exported**: Yes

## Purpose

Analyzes doc reference relationships (@doc [[Symbol]])

## Dependencies

This symbol depends on 4 other symbol(s):

### import

- `interface-symbolgraph` (code-dependency)
- `interface-unifiedrelationship` (code-dependency)
- `class-tsdocsymbolparser` (code-dependency)
- `interface-codeconnection` (code-dependency)

## Usage

**1** symbol(s) use this:

- **class-analyzedocreferencecommand** (code-dependency)
  - Relationship: import

## Documentation References

### This Code References Documentation

- [[Symbol]] at src/analyzer/DocReferenceAnalyzer.ts:49
- [[FeatureName]] at src/analyzer/DocReferenceAnalyzer.ts:49
...

### Documentation That References This Code

- [[FeatureName]] _(inferred)_
- [[ComponentName]] _(inferred)_
...

## Test Coverage

⚠️ **No tests found for this symbol.**

## Change Impact Analysis

⚠️ **Modifying this symbol will affect:**

- **1** symbols directly
- **6** file(s)
- **42** documentation page(s)

**Recommendation**: Review all affected components before making changes.

---

## Generation Metadata

- Generated by: TSDoc Edge
- Total relationships: 47
  - Explicit: 41
  - Inferred: 6
- Context depth: 2 level(s)
- Generated at: 2025-11-23T15:59:17.218Z
```

---

## Command Comparison

### 기능 비교표

| 기능 | work-context | design-context |
|------|-------------|----------------|
| **심볼 정보** | ✅ | ✅ |
| **의존성** | ✅ | ✅ |
| **테스트 매핑** | ✅ | ✅ |
| **영향 범위** | ✅ | ✅ |
| **문서 참조** | ✅ (양방향) | ✅ (@doc 태그) |
| **관계 밀도** | ✅ | ✅ |
| **커버리지 통계** | ✅ | ❌ |
| **의미론적 이웃** | ✅ | ❌ |
| **실행 가능한 권장사항** | ✅ | ✅ |
| **계약 (Contracts)** | ❌ | ✅ |
| **설계 결정** | ❌ | ✅ |
| **에러 패턴** | ❌ | ✅ |
| **LLM 출력 모드** | ✅ | ❌ |
| **출력 언어** | 영어 | 한국어 |
| **출력 스타일** | 간결 | 매우 상세 |
| **별칭** | wc | dc |

### 언제 어떤 명령어를 사용할까?

#### `work-context` 사용 권장 (기본 추천)

- 일반적인 개발 작업
- 빠른 컨텍스트 파악
- AI 어시스턴트(Claude, GPT)와 협업
- 관계 그래프 기반 분석
- 통계/메트릭 중심 분석
- 영어 출력 선호

#### `design-context` 사용 권장

- 계약(contract) 중심 코드 작업
- 설계 결정(design decision) 추적 필요
- 알려진 에러 패턴 확인 필요
- 매우 상세한 메타데이터 필요
- 아키텍처 리뷰
- 한국어 출력 선호

---

## LLM Integration Workflow

### AI 어시스턴트와 협업하기

**시나리오**: Claude/GPT에게 코드 리뷰, 리팩토링, 버그 수정 요청

#### Step 1: 컨텍스트 생성

```bash
# LLM 친화적 형식으로 컨텍스트 생성
tsdoc-edge wc src/services/UserService.ts --llm --output context.txt
```

#### Step 2: AI 어시스턴트에게 전달

```
[복사-붙여넣기 또는 파일 업로드]

Hi Claude, here's the full context for UserService.ts:

<paste context.txt contents>

Please review this code and suggest improvements focusing on:
1. Error handling
2. Test coverage
3. Documentation quality
```

#### Step 3: AI 피드백 반영

```bash
# AI 제안사항 반영 후 재분석
tsdoc-edge wc src/services/UserService.ts

# 개선 확인
# - Test Coverage: 0.0% → 85.0%
# - Documentation: 50.0% → 90.0%
# - Relationship Density: 2.1 → 5.8
```

### LLM 출력 포맷 특징

**구조화된 마크다운**:
- LLM이 파싱하기 쉬운 명확한 섹션 구분
- 계층적 정보 구조
- 명확한 레이블 (`##`, `###`, `-`, `*`)

**완전한 컨텍스트**:
- 모든 의존성 나열
- 양방향 문서 참조 (Code → Doc, Doc → Code)
- 명시적/추론 관계 구분
- 영향 분석 포함

**메타데이터**:
- 생성 시간
- 관계 깊이
- 명시적/추론 관계 개수
- 총 관계 개수

### Example AI Prompt Templates

#### 1. 코드 리뷰 요청

```
Context for review:
<tsdoc-edge wc --llm output>

Please review this code and check for:
- Potential bugs
- Missing error handling
- Test coverage gaps
- Documentation improvements
- Architectural concerns
```

#### 2. 리팩토링 계획

```
I want to refactor this file:
<tsdoc-edge wc --llm output>

Impact analysis shows:
- 8 files depend on this
- 42 documentation pages reference it

Please suggest a safe refactoring strategy that:
1. Minimizes breaking changes
2. Maintains backward compatibility
3. Improves maintainability
```

#### 3. 테스트 생성

```
This file has 0% test coverage:
<tsdoc-edge wc --llm output>

Please generate unit tests covering:
- All public methods
- Edge cases
- Error scenarios
```

---

## Information Gathered

### 1. 📚 관련 문서

**출처**: `@doc [[Symbol]]` 태그 파싱

```typescript
/**
 * User management service
 *
 * @doc [[User Management System]]
 * @doc [[Authentication Flow]]
 */
export class UserService {
  // ...
}
```

**제공 정보**:
- 문서 제목 (Symbol 참조)
- 문서 파일 경로
- 존재 여부 확인

**활용**: 기획/명세서 즉시 열어보기

---

### 2. 🔗 의존 타입

**출처**: `dependencies` 테이블 쿼리

**제공 정보**:
- 타입/클래스 이름
- 타입 분류 (interface, class, type)
- 정의된 파일 경로

**활용**:
- 이 파일이 사용하는 타입 파악
- 타입 정의 파일로 바로 이동

---

### 3. 🧪 테스트

**출처**: `test_mappings` 테이블

**제공 정보**:
- 테스트 파일 경로
- 테스트 타입 (unit / integration)
- 커버리지 비율 (if available)

**활용**:
- 수정 후 어떤 테스트 실행해야 하는지
- 테스트 부족 여부 파악

---

### 4. ⚠️ 영향 범위

**출처**: Reverse dependency 쿼리

**제공 정보**:
- 이 파일을 사용하는 파일들
- 사용처 심볼 이름
- 파일 경로

**활용**:
- 리팩토링 영향 범위 파악
- Breaking change 예측

---

## Real-World Scenarios

### 시나리오 1: 버그 수정

```bash
# 1. 버그 리포트: "UserService.getUser가 null 반환"
tsdoc-edge work-context src/services/UserService.ts

# Output 분석:
# - 문서: [[User Management System]] 확인 → 기대 동작 이해
# - 의존: User, UserDTO 타입 확인
# - 테스트: UserService.test.ts 확인 → 재현 가능한 테스트 작성
# - 영향: UserController, AuthService 등 8개 파일 → 수정 후 영향 확인
```

**결과**: 5분 안에 모든 컨텍스트 파악 완료

---

### 시나리오 2: 새 기능 추가

```bash
# 1. 작업: UserService에 deleteUser 메서드 추가
tsdoc-edge work-context src/services/UserService.ts

# Output 분석:
# - 문서: 기획서에서 삭제 정책 확인
# - 의존: User, ValidationError 타입 → 검증 로직 필요
# - 테스트: 기존 테스트 패턴 참고
# - 영향: 8개 파일에서 사용 중 → cascade delete 고려
```

**결과**: 설계 결정 전 필요한 정보 모두 확보

---

### 시나리오 3: 리팩토링

```bash
# 1. 작업: UserService를 UserRepository + UserDomain으로 분리
tsdoc-edge work-context src/services/UserService.ts

# Output 분석:
# - 문서: 기존 설계 의도 파악
# - 의존: 5개 타입 → 각각 어디로 이동할지 결정
# - 테스트: 2개 → 분리 후 어떻게 재구성할지
# - 영향: 8개 파일 → 모두 수정 필요, 단계적 마이그레이션 계획
```

**결과**: 안전한 리팩토링 계획 수립

---

## Integration with Other Commands

### Before: work-context로 파악
```bash
tsdoc-edge work-context src/services/UserService.ts
```

### After: 상세 분석 (필요시)
```bash
# 타입 변환 체인 상세 추적
tsdoc-edge type-chain User UserDTO

# 의존성 트리 시각화
tsdoc-edge visualize tree user-service

# 테스트 커버리지 상세
tsdoc-edge test-relationships | grep user-service
```

**철학**:
- `work-context` = 빠른 개요 (80% use case)
- 개별 명령어 = 깊은 분석 (20% use case)

---

## Implementation Details

### Data Sources

```typescript
interface WorkContext {
  filePath: string;
  symbols: Symbol[];                    // DB: symbols WHERE file_path
  relatedDocs: DocReference[];          // Parse: @doc [[Symbol]]
  dependencies: Dependency[];           // DB: dependencies WHERE symbol_id
  typeFlows: TypeFlow[];                // DB: unified_relationships (io-dependency)
  tests: TestFile[];                    // DB: test_mappings
  usedBy: Usage[];                      // DB: dependencies WHERE target (reverse)
}
```

### Performance

**Typical execution time**: <500ms

**Queries**:
1. `SELECT * FROM symbols WHERE file_path = ?` (1 query)
2. `SELECT * FROM dependencies WHERE symbol_id IN (...)` (1 query)
3. `SELECT * FROM test_mappings WHERE symbol_id IN (...)` (1 query)
4. `SELECT * FROM dependencies WHERE target IN (...)` (1 query, reverse)
5. File parsing for `@doc` tags (1 file read)

**Total**: ~5 DB queries + 1 file read

---

## Configuration

### Document Search Paths

기본 검색 디렉토리:
```typescript
const managedDirs = [
  'managed/features',
  'managed/architecture',
  'managed/workflows',
  'managed/concepts'
];
```

`.tsdoc.config.json`에서 커스터마이즈 가능:
```json
{
  "documentManagement": {
    "managedDirs": [
      "managed",
      "docs/specs"
    ]
  }
}
```

---

## Limitations & Future Enhancements

### Current Limitations

1. **문서 찾기**: `@doc` 태그만 인식 (파일명 매칭 없음)
2. **타입 흐름**: 직접 의존성만 표시 (변환 체인 미표시)
3. **테스트 커버리지**: 매핑 테이블에 데이터 있을 때만

### Planned Enhancements

#### v2: 타입 체인 통합
```
🔗 의존 타입 (5개)
  User              → src/types/User.ts
  UserDTO           → src/types/UserDTO.ts

  💡 타입 흐름: UserDTO → User (변환: toUser())
                User → UserEntity (변환: toEntity())
```

#### v3: 스마트 문서 검색
```
📚 관련 문서 (3개)
  • [[User Management System]]  (명시적 @doc)
  • "User Service API"           (파일명 유사도)
  • "Authentication Flow"        (코드 참조 빈도)
```

#### v4: 인터랙티브 모드
```bash
tsdoc-edge work-context src/services/UserService.ts --interactive

# Interactive prompts:
# → Open document? [1] User Management System [2] Authentication Flow
# → Jump to dependency? [1] User.ts [2] UserDTO.ts
# → Run tests? [y/n]
```

---

## Best Practices

### 1. 작업 전 항상 실행

```bash
# 습관화
alias work="tsdoc-edge work-context"

# 사용
work src/services/UserService.ts
```

### 2. @doc 태그 작성

```typescript
/**
 * User management service
 *
 * @doc [[User Management System]]
 * @public
 */
export class UserService {
  // ...
}
```

### 3. PR 리뷰 시 활용

```bash
# 변경된 파일 체크
git diff --name-only main | while read file; do
  echo "=== $file ==="
  tsdoc-edge work-context "$file"
done
```

---

## Related Workflows

- CLI Feedback Cycle - 전체 CLI 워크플로우
- [[Document Symbol System]] - `@doc [[Symbol]]` 시스템
- [[CoreWorkflow]] - 빌드 → 분석 → 검증 흐름

---

## Related Commands

개별 명령어 (상세 분석 필요 시):
- `parse <file>` - TSDoc 파싱
- `deps <symbol>` - 의존성
- `who-uses <symbol>` - 역의존성
- `type-chain <from> <to>` - 타입 체인
- `test-relationships` - 테스트 매핑

---

**Document Owner**: CLI Team
**Last Review**: 2025-11-07
**Status**: ✅ Production Ready

---

## Backlinks

### Referenced By

- [[Commands Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/COMMANDS.md:282
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:118
- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:328
- [[CoverageReportCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/CoverageReportCommand.md:114
- [[UsedByCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/UsedByCommand.md:90
- [[Codebase Health Report]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/codebase-health-report.md:344
- [[CoreFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/core-features-catalog.md:19
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:14
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:294
- [[Quick Start Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:68
- [[Quick Start Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:136
- [[Quick Start Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:189
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:188
- [[Workflows Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/workflows/index.md:151
- [[Workflows Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/workflows/index.md:161
- [[Workflows Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/workflows/index.md:177
- [[Mermaid Entrypoint Workflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:282
- [[Mermaid Entrypoint Workflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:301
- [[Relationship System Roadmap]] → /Users/junwoobang/workflow/tsdoc-edge/managed/workflows/relationship-system-roadmap.md:402

