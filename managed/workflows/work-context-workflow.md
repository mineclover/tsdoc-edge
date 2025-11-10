# [[Work Context Workflow]]

**Document Type**: Essential Workflow
**Status**: Active
**Last Updated**: 2025-11-07
**Primary Symbols**: [[WorkContextCommand]]

## Purpose

**작업자 중심의 핵심 워크플로우**: "이 파일 작업하려면 뭘 봐야 하지?"에 대한 단일 명령어 답변.

모든 분석 기능의 궁극적 목표는 **작업자가 파일을 수정하기 전에 필요한 모든 컨텍스트를 즉시 제공**하는 것입니다.

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

```bash
tsdoc-edge work-context <file-path>
```

---

## Usage

### 기본 사용법

```bash
tsdoc-edge work-context src/services/UserService.ts
```

### 출력 예시

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

- [[CLI Feedback Cycle]] - 전체 CLI 워크플로우
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

- [[Commands Index]] → /home/user/tsdoc-edge/managed/COMMANDS.md:221
- [[CoverageReportCommand]] → /home/user/tsdoc-edge/managed/commands/CoverageReportCommand.md:114
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:19
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:14
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:220
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:68
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:136
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:189
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:167
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:280
- [[Mermaid Entrypoint Workflow]] → /home/user/tsdoc-edge/managed/workflows/mermaid-entrypoint-workflow.md:299
- [[Relationship System Roadmap]] → /home/user/tsdoc-edge/managed/workflows/relationship-system-roadmap.md:400

