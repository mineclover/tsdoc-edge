---
title: Usage Scenarios
type: guide
category: guides
status: active
canonical: true
updated: 2025-12-26
---

# [[Usage Scenarios]]

> **대표적인 TSDoc Edge 사용 시나리오** - 실제 개발 상황별 활용 가이드

각 시나리오는 독립적으로 따라할 수 있으며, 관련 문서 링크를 통해 상세 정보를 확인할 수 있습니다.

---

## 시나리오 1: 새 프로젝트 시작

### 상황
TypeScript 프로젝트에서 TSDoc Edge를 처음 설정하고 싶습니다.

### 단계

```bash
# 1. 초기화
tsdoc-edge init

# 2. 소스 코드 분석
tsdoc-edge build src

# 3. 시스템 상태 확인
tsdoc-edge system-status
```

### 예상 결과
```
TSDoc Edge | Symbols: 1,500 | Relationships: 15,000 | Types: 19 | Health: B
```

### 다음 단계
- [[Quick Start Guide]] - 상세 설정
- [[Build Pipeline Guide]] - 빌드 파이프라인 이해

---

## 시나리오 2: 파일 수정 전 컨텍스트 파악

### 상황
`UserService.ts` 파일을 수정해야 합니다. 영향 범위를 먼저 파악하고 싶습니다.

### 단계

```bash
# 1. 파일 컨텍스트 확인
tsdoc-edge wc src/services/UserService.ts

# 2. LLM과 협업할 경우
tsdoc-edge wc src/services/UserService.ts --llm
```

### 예상 결과
```
Work Context: UserService.ts

📊 Summary
  Symbols:              12
  Relationships:        85
  Relationship Density: 7.08
  Test Coverage:        85.0% (2 tests)

📦 Dependencies
  This file depends on 5 other file(s)

🔗 Impact Analysis
  8 file(s) depend on this file

💡 Recommendations
  • High impact file - review changes carefully
```

### 다음 단계
- [[Work Context Workflow]] - 상세 워크플로우
- 관련 테스트 파일 확인 후 수정 진행

---

## 시나리오 3: 리팩토링 영향 분석

### 상황
`DatabaseManager` 클래스를 리팩토링하려고 합니다. 영향받는 코드를 파악해야 합니다.

### 단계

```bash
# 1. 누가 이 심볼을 사용하는지 확인
tsdoc-edge who-uses DatabaseManager

# 2. 상세 영향 분석 (심볼 ID 필요 시)
tsdoc-edge relationship-impact class-databasemanager

# 3. 관련 파일의 컨텍스트 확인
tsdoc-edge wc src/storage/DatabaseManager.ts
```

### 예상 결과
```
Found 27 symbols matching "DatabaseManager":
  • DatabaseManager (class) in src/storage/DatabaseManager.ts
  • DatabaseManager.db (property) ...

This file depends on 5 other file(s)
15 file(s) depend on this file
```

### 체크리스트
- [ ] 의존하는 15개 파일 확인
- [ ] 관련 테스트 파일 업데이트
- [ ] 인터페이스 변경 시 문서 업데이트

### 다음 단계
- [[Relationship Analysis Guide]] - 관계 분석 상세

---

## 시나리오 4: 문서 품질 점검

### 상황
프로젝트 문서가 코드와 동기화되어 있는지 확인하고 싶습니다.

### 단계

```bash
# 1. 문서 심볼 검증
tsdoc-edge validate-symbol-refs

# 2. 미사용 문서 찾기
tsdoc-edge find-unused-docs

# 3. 백링크 업데이트
tsdoc-edge update-backlinks

# 4. 전체 문서 검증
tsdoc-edge validate-docs
```

### 예상 결과
```
Symbol Registry Statistics
  Unique symbols: 213
  Total definitions: 293
  Total references: 2055
  Broken references: 0

✓ All document symbols are valid
```

### 문제 해결
- **Broken references**: 누락된 문서 생성 또는 참조 수정
- **Unused docs**: 삭제하거나 코드와 연결

### 다음 단계
- [[Document Symbol System]] - 문서 심볼 시스템

---

## 시나리오 5: 코드 건강 상태 점검

### 상황
특정 디렉토리의 코드 품질을 점검하고 싶습니다.

### 단계

```bash
# 1. 특정 디렉토리 건강 점검
tsdoc-edge health src/commands

# 2. 전체 분석
tsdoc-edge analyze src

# 3. 미문서화 심볼 찾기
tsdoc-edge undocumented

# 4. 고아 코드 찾기
tsdoc-edge orphans
```

### 예상 결과
```
❌ Overall Health: F (25/100)

   📝 Documentation Quality: 42/100
   🧪 Test Coverage: 0/100

💡 Recommendations
   ❌ Urgent action required: Add more test coverage
```

### 개선 우선순위
1. 테스트 커버리지 추가
2. 문서화 보완
3. 고아 코드 정리

### 다음 단계
- [[Codebase Health Report]] - 건강 리포트 상세

---

## 시나리오 6: 관계 시스템 이해

### 상황
프로젝트의 의존성 구조를 전체적으로 파악하고 싶습니다.

### 단계

```bash
# 1. 시스템 상태 개요
tsdoc-edge system-status

# 2. 관계 통계 상세
tsdoc-edge relationship-stats

# 3. 온톨로지 구조
tsdoc-edge ontology-stats

# 4. 중요 심볼 (허브) 찾기
tsdoc-edge relationship-metrics --top 10
```

### 예상 결과
```
Quick Stats
  Symbols:        5,247
  Relationships:  70,892
  Types:          19 (8 categories)
  Graph Density:  13.51 rels/symbol

Relationship Distribution
  semantic        ███████░░░░░░░░░░░░░ 25,266 (35.6%)
  data-flow       ██████░░░░░░░░░░░░░░ 22,131 (31.2%)
  testing         ███░░░░░░░░░░░░░░░░░ 11,933 (16.8%)
```

### 인사이트
- **높은 그래프 밀도**: 코드가 잘 연결되어 있음
- **semantic 비중 높음**: 기능별 그룹핑이 잘 되어 있음
- **testing 비중**: 테스트 커버리지 상태

### 다음 단계
- [[Relationship Types]] - 19개 관계 타입 상세

---

## 시나리오 7: CI/CD 통합

### 상황
CI 파이프라인에서 문서 품질을 자동 검증하고 싶습니다.

### 단계

```bash
# .github/workflows/docs.yml 또는 CI 스크립트

# 1. 빌드
tsdoc-edge build src

# 2. 문서 검증 (실패 시 CI 중단)
tsdoc-edge validate-docs
tsdoc-edge validate-symbol-refs

# 3. 상태 리포트 (compact 모드)
tsdoc-edge system-status --compact
```

### GitHub Actions 예시

```yaml
name: Documentation Check
on: [push, pull_request]

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24.x'
      - run: npm ci
      - run: npx tsdoc-edge build src
      - run: npx tsdoc-edge validate-docs
      - run: npx tsdoc-edge system-status --compact
```

### 다음 단계
- CI 실패 시 알림 설정
- PR 코멘트로 상태 리포트 추가

---

## 시나리오 8: 새 기능 개발 시작

### 상황
새로운 기능을 개발하기 전에 관련 코드와 문서를 파악하고 싶습니다.

### 단계

```bash
# 1. 관련 심볼 검색
tsdoc-edge who-uses Authentication

# 2. 관련 파일들의 컨텍스트 확인
tsdoc-edge wc src/services/AuthService.ts
tsdoc-edge wc src/middleware/authMiddleware.ts

# 3. 관련 문서 확인
# (work-context 출력에서 Documentation 섹션 참조)

# 4. 테스트 파일 확인
# (work-context 출력에서 Test Coverage 섹션 참조)
```

### 체크리스트
- [ ] 관련 기존 코드 파악
- [ ] 영향받는 파일 목록 작성
- [ ] 테스트 계획 수립
- [ ] 문서 업데이트 계획

### 문서 확장 워크플로우

새 기능 개발 시 문서를 함께 작성하는 방법:

#### Step 1: 문서 파일 생성

```bash
# 기능 문서 생성 (managed/features/ 디렉토리)
touch managed/features/my-new-feature.md
```

#### Step 2: 문서 템플릿 작성

```markdown
---
title: My New Feature
type: feature
category: features
status: draft
updated: 2025-12-26
---

# [[MyNewFeature]]

> 한 줄 요약

## Purpose

이 기능이 해결하는 문제와 목적

## Usage

### Basic Usage
\`\`\`typescript
// 사용 예시
\`\`\`

## Implementation

**Source**: `src/path/to/implementation.ts`

### Key Components
- [[RelatedComponent1]] - 역할
- [[RelatedComponent2]] - 역할

## Related

- [[ExistingFeature]] - 관련 기능
- [[SomeCommand]] - 관련 명령어
```

#### Step 3: 코드에 문서 연결

```typescript
/**
 * My New Feature implementation
 *
 * @doc [[MyNewFeature]]
 * @public
 */
export class MyNewFeature {
  // ...
}
```

#### Step 4: 검증 및 연결

```bash
# 1. 심볼 데이터베이스 업데이트
tsdoc-edge build src

# 2. 문서 인덱스 업데이트
tsdoc-edge index-docs managed

# 3. 심볼 참조 검증
tsdoc-edge validate-symbol-refs

# 4. 백링크 업데이트
tsdoc-edge update-backlinks
```

### 문서 구조 권장사항

| 디렉토리 | 용도 | 예시 |
|---------|------|------|
| `managed/features/` | 기능 명세 | `my-feature.md` |
| `managed/commands/` | CLI 명령어 | `MyCommand.md` |
| `managed/types/` | 타입 정의 | `MyType.md` |
| `managed/workflows/` | 워크플로우 | `my-workflow.md` |
| `managed/guides/` | 가이드 | `my-guide.md` |

### 문서 품질 체크리스트

- [ ] H1에 `# [[SymbolName]]` 형식 사용
- [ ] frontmatter에 `type`, `category`, `status` 포함
- [ ] 관련 문서 `[[Symbol]]` 링크 추가
- [ ] 코드에 `@doc [[SymbolName]]` 태그 추가
- [ ] `validate-symbol-refs` 통과
- [ ] `validate-docs` 통과

### 다음 단계
- 개발 완료 후 `tsdoc-edge build src` 재실행
- 문서 업데이트 후 `tsdoc-edge validate-docs`

---

## 시나리오 9: 일일 개발 루틴

### 상황
매일 개발 시작 전 프로젝트 상태를 빠르게 확인하고 싶습니다.

### 권장 루틴

```bash
# 1. 시스템 상태 한눈에 (1초)
tsdoc-edge ss --compact

# 2. 작업할 파일 컨텍스트 확인 (2초)
tsdoc-edge wc src/path/to/file.ts

# 3. 작업 완료 후
tsdoc-edge build src  # 변경사항 반영
tsdoc-edge ss         # 상태 확인
```

### 별칭 설정 (선택)

```bash
# ~/.bashrc 또는 ~/.zshrc
alias tss="npx tsdoc-edge ss --compact"
alias twc="npx tsdoc-edge wc"
```

---

## 시나리오 10: 코드 리뷰 지원

### 상황
PR 코드 리뷰 시 변경된 파일의 영향을 파악하고 싶습니다.

### 단계

```bash
# 1. 변경된 파일 목록 확인
git diff --name-only main

# 2. 각 파일의 영향 분석
for file in $(git diff --name-only main | grep '\.ts$'); do
  echo "=== $file ==="
  tsdoc-edge wc "$file" 2>/dev/null | head -20
done

# 3. 전체 상태 비교
tsdoc-edge system-status
```

### 리뷰 체크포인트
- [ ] 영향받는 파일들이 모두 업데이트되었는가?
- [ ] 테스트가 추가/수정되었는가?
- [ ] 문서가 업데이트되었는가?

---

## 명령어 요약

| 시나리오 | 핵심 명령어 |
|---------|------------|
| 시작 | `init`, `build`, `system-status` |
| 파일 수정 | `wc <file>` |
| 리팩토링 | `who-uses`, `relationship-impact` |
| 문서 검증 | `validate-docs`, `validate-symbol-refs` |
| 건강 점검 | `health`, `analyze`, `orphans` |
| 관계 분석 | `relationship-stats`, `ontology-stats` |
| CI/CD | `build`, `validate-docs`, `ss --compact` |

---

## 관련 문서

- [[TSDoc Edge User Guide]] - 종합 사용자 가이드
- [[Quick Start Guide]] - 빠른 시작
- [[Work Context Workflow]] - 핵심 워크플로우
- [[Commands Index]] - 전체 명령어 목록
- [[Relationship Types]] - 관계 타입 상세

---

**Last Updated**: 2025-12-26
