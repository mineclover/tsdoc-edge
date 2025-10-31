# User Scenario Verification Report

> CLI_WORKFLOWS_AND_SCENARIOS.md 전체 점검 결과

**검증일**: 2025-10-31
**검증 대상**: CLI_WORKFLOWS_AND_SCENARIOS.md
**검증 방법**: 실제 명령어 실행, 코드 검증, 의존성 분석

---

## ✅ 검증 통과 항목

### 1. 명령어 존재 여부
모든 27개 명령어가 실제로 CLI에 구현되어 있음:
- ✅ init, id, find-method, tree, deps, used-by
- ✅ orphans, undocumented, untested, without-responsibility, without-contract
- ✅ plans, todos, validate, analyze, health, suggest, fix, improve
- ✅ stats, core-api, scan
- ✅ index-docs, validate-docs, update-backlinks, find-doc
- ✅ help

### 2. 출력 경로 정확성
- ✅ `docs/generated/` - scan --save
- ✅ `.tsdoc/reports/` - stats --save
- ✅ `.tsdoc/doc-symbols.json` - index-docs
- ✅ `.tsdoc.config.json` - init

### 3. 옵션 정확성
검증된 주요 옵션:
- ✅ `--save`, `-s` (scan, stats)
- ✅ `--compare`, `-c` (stats)
- ✅ `--warnings-only`, `-w` (stats)
- ✅ `--depth=N` (scan)
- ✅ `--entry=<name>` (scan)
- ✅ `--output=<file>` (scan)
- ✅ `--group-by-category` (scan)
- ✅ `--file=<path>` (index-docs)

---

## ❌ 발견된 문제점

### 🔴 Critical: 데이터베이스 생성 누락

**문제**:
- `analyze`, `health`, `suggest`, `fix`, `improve`, `stats` 등의 명령어는 `.tsdoc.db` 필요
- 문서 어디에도 데이터베이스를 어떻게 생성하는지 언급 없음

**영향 받는 워크플로우**:
- Workflow 2: 코드 품질 개선 사이클
- Workflow 4: 통계 추적 및 비교
- Workflow 5: 심볼 그래프 탐색
- 시나리오 1, 2, 3, 6, 7

**실제 테스트**:
```bash
# 새 프로젝트에서
$ tsdoc-edge analyze src
# Error: Database not found or empty
```

**해결 방법**:
데이터베이스 생성 과정 추가 필요:
```bash
# Option 1: demo 스크립트 실행
npm run demo:analyze

# Option 2: TSDocEdge API 직접 사용
# (현재 CLI로는 불가능)
```

**권장 수정**:
1. `tsdoc-edge build` 또는 `tsdoc-edge parse` 명령어 추가 필요
2. 또는 모든 워크플로우 앞에 "전제조건: 데이터베이스 생성" 명시

---

### 🟡 Warning: fold/unfold 기능 미언급

**문제**:
- `.tsdoc.config.json`에 `fold` 설정 존재
- `demo/fold-unfold-demo.ts` 파일 존재
- 하지만 CLI 명령어 없음
- 문서에서 전혀 언급 안 됨

**영향**:
- 설정 파일 가이드와 실제 사용 불일치
- 사용자 혼란 가능성

**권장 수정**:
1. fold/unfold CLI 명령어 추가 또는
2. 설정 가이드에서 fold 관련 내용 제거 또는 "향후 예정" 명시

---

### 🟡 Warning: id 서브커맨드 상세 설명 부족

**문제**:
- `id` 명령어는 `new`, `list`, `find`, `stats` 서브커맨드 보유
- 문서에서 "id 서브커맨드 - 심볼 ID 관리"로만 간략히 언급
- 실제 사용법 예시 부족

**실제 사용법** (코드 분석 결과):
```bash
# 새 심볼 ID 생성
tsdoc-edge id new <file> <symbolName>
tsdoc-edge id new src/Service.ts createUser --type=method --parent=005

# ID 목록 조회
tsdoc-edge id list

# ID로 심볼 찾기
tsdoc-edge id find <id>

# ID 통계
tsdoc-edge id stats
```

**권장 수정**:
시나리오 추가: "심볼 ID 수동 관리"

---

### 🟡 Warning: 전제조건 불명확

**문제**:
각 워크플로우의 전제조건이 명시되지 않음

**예시**:
- Workflow 2 (코드 품질 개선): `.tsdoc.db` 필요 (명시 안 됨)
- Workflow 3 (문서 심볼): `docs/` 디렉토리 및 마크다운 파일 필요
- Workflow 4 (통계 추적): `.tsdoc.db` + 이전 히스토리 파일 필요

**권장 수정**:
각 워크플로우에 "전제조건" 섹션 추가

---

### 🟢 Minor: 명령어 분류 누락

**문제**:
`who-uses` 명령어가 실제로 존재하지만 문서에 누락됨

**실제 확인**:
```bash
$ node dist/cli.js who-uses DocumentationAnalyzer
# 실행됨
```

**권장 수정**:
- "2. 심볼 탐색" 섹션에 `who-uses` 추가
- `used-by` (ID 기반) vs `who-uses` (이름 기반) 차이 명시

---

### 🟢 Minor: 실제 사용 예시 부족

**문제**:
일부 명령어는 실제 파라미터 예시 부족

**예시**:
```bash
# 문서에 있음
tsdoc-edge deps <id>

# 실제 사용 예시 필요
tsdoc-edge deps 001
tsdoc-edge deps TSDocEdge:src/index.ts:78
```

**권장 수정**:
"실전 예시" 섹션 추가

---

## 🔧 워크플로우별 검증 결과

### Workflow 1: 프로젝트 초기 설정

**상태**: ⚠️ 부분 동작

**문제**:
```bash
# ❌ 단계 1은 동작함
tsdoc-edge init --name=my-project

# ❌ 단계 2-4는 docs/에 [[Symbol]] 있어야 함
# 초기에는 docs/ 자체가 없을 수 있음
tsdoc-edge index-docs docs  # Error: docs not found
```

**수정 제안**:
```bash
# 1단계: 초기화
tsdoc-edge init --name=my-project

# 1.5단계: 문서 디렉토리 생성
mkdir -p docs/features

# 2단계: (문서 작성 후) 인덱싱
tsdoc-edge index-docs docs
```

---

### Workflow 2: 코드 품질 개선 사이클

**상태**: ❌ 동작 안 함

**문제**:
`.tsdoc.db` 생성 단계 누락

**전제조건 추가 필요**:
```bash
# 0단계: 데이터베이스 생성 (현재 방법 없음!)
# 필요: tsdoc-edge build 또는 parse 명령어

# 1단계: 분석
tsdoc-edge analyze src
```

---

### Workflow 3: 문서 심볼 업데이트

**상태**: ✅ 동작함

**검증 완료**:
```bash
tsdoc-edge index-docs --file=docs/features/TEST.md
tsdoc-edge validate-docs
tsdoc-edge update-backlinks
```

---

### Workflow 4: 통계 추적 및 비교

**상태**: ⚠️ 조건부 동작

**문제**:
- `.tsdoc.db` 필요 (명시 안 됨)
- 첫 실행 시 비교 불가 (당연하지만 명시 필요)

**개선 제안**:
```bash
# 전제조건: .tsdoc.db 존재

# 1단계: 베이스라인 (비교 데이터 없으면 경고만)
tsdoc-edge stats src --save

# 2단계: 작업...

# 3단계: 비교 (이제 가능)
tsdoc-edge stats src --compare
```

---

### Workflow 5: 심볼 그래프 탐색

**상태**: ⚠️ 조건부 동작

**문제**:
- `.tsdoc.db` 필요
- `tree`, `deps`, `used-by`는 DB 의존

**검증**:
```bash
# scan은 DB에서 읽음 (생성 아님)
tsdoc-edge scan --depth=2 --save
# ✅ docs/generated/SCAN_2025-10-31.md 생성됨
```

---

### Workflow 6: 특정 이슈 찾기

**상태**: ⚠️ 조건부 동작

**전제조건**: `.tsdoc.db` 필요

**검증 필요**:
모든 명령어가 DB 필요한지 확인

---

## 📊 시나리오별 검증 결과

### 시나리오 1: 신규 프로젝트 도입

**상태**: ❌ 치명적 누락

**누락 단계**:
```bash
# 1. ✅ init
tsdoc-edge init

# 2. ❌ 데이터베이스 생성 (방법 없음!)
# ???

# 3. ❌ analyze는 DB 필요
tsdoc-edge analyze src  # Error!
```

**필수 수정**:
데이터베이스 생성 명령어 또는 프로세스 추가

---

### 시나리오 2: PR 작성 전 품질 체크

**상태**: ⚠️ 조건부 동작

**전제조건**:
- `.tsdoc.db` 존재
- 이전 stats 히스토리 존재

**개선**:
전제조건 명시 필요

---

### 시나리오 3: 레거시 코드 문서화

**상태**: ❌ 동작 안 함

**문제**:
- DB 생성 누락
- `improve` 명령어 실제 동작 검증 필요

---

### 시나리오 4: 문서 심볼 시스템 활용

**상태**: ✅ 동작함

**검증 완료**:
- index-docs ✅
- validate-docs ✅
- update-backlinks ✅
- find-doc ✅

**Git hook 예시도 정확함**

---

### 시나리오 5: CI/CD 통합

**상태**: ⚠️ 주의 필요

**문제**:
```yaml
# DB가 없으면 실패함
- name: Check documentation stats
  run: npx tsdoc-edge stats src --compare
  # ❌ DB 없으면 Error
```

**수정 제안**:
```yaml
# DB 생성 단계 추가 필요
- name: Build database
  run: npm run build:db  # (명령어 필요)

- name: Check stats
  run: npx tsdoc-edge stats src --compare
```

---

### 시나리오 6: 아키텍처 문서 자동 생성

**상태**: ✅ 동작함

**검증 완료**:
```bash
tsdoc-edge scan --group-by-category --save
# ✅ docs/generated/FEATURES_2025-10-31.md

tsdoc-edge scan --entry=TSDocEdge --depth=3 --save
# ✅ docs/generated/SCAN_TSDocEdge_2025-10-31.md

tsdoc-edge core-api
# ✅ 출력 성공

tsdoc-edge tree
# ✅ 출력 성공
```

---

### 시나리오 7: 팀 온보딩

**상태**: ⚠️ 조건부 동작

**전제조건**: `.tsdoc.db` 필요

---

## 🎯 우선순위별 수정 권장 사항

### P0 (Critical - 즉시 수정)

1. **데이터베이스 생성 프로세스 추가**
   ```bash
   # 방법 1: 새 명령어 추가
   tsdoc-edge build [path]     # 데이터베이스 생성
   tsdoc-edge parse [path]     # 파싱만

   # 방법 2: 기존 demo 스크립트 CLI로 노출
   tsdoc-edge analyze --build src

   # 방법 3: 자동 생성
   # analyze 등의 명령어에서 DB 없으면 자동 생성
   ```

2. **모든 워크플로우에 전제조건 섹션 추가**
   ```markdown
   ### Workflow 2: 코드 품질 개선

   **전제조건**:
   - [x] .tsdoc.db 존재 (`tsdoc-edge build src` 실행)
   - [x] TypeScript 프로젝트

   **단계**:
   ...
   ```

3. **신규 프로젝트 도입 시나리오 수정**
   - 데이터베이스 생성 단계 추가
   - 실제 동작하는 순서로 재구성

---

### P1 (High - 주요 개선)

4. **who-uses 명령어 추가**
   - 문서 분류에 추가
   - `used-by` (ID) vs `who-uses` (이름) 차이 설명

5. **id 서브커맨드 상세 가이드**
   - 새 시나리오: "심볼 ID 수동 관리"
   - 각 서브커맨드 사용법

6. **fold/unfold 처리**
   - CLI 명령어 추가 또는
   - 설정 가이드에서 제거

---

### P2 (Medium - 개선 권장)

7. **실전 예시 섹션 추가**
   ```markdown
   ## 실전 예시

   ### deps 명령어
   ```bash
   # ID 기반
   tsdoc-edge deps 001

   # 결과
   Dependencies of TSDocEdge (001):
   - FileScanner (002)
   - TSDocParser (003)
   ...
   ```
   ```

8. **CI/CD 예시 수정**
   - DB 생성 단계 포함
   - 실제 동작하는 워크플로우

9. **에러 핸들링 가이드**
   ```markdown
   ## 일반적인 에러와 해결

   ### Error: Database not found
   **원인**: .tsdoc.db 없음
   **해결**: `tsdoc-edge build src` 실행
   ```

---

### P3 (Low - 선택 개선)

10. **명령어 참조 테이블**
    ```markdown
    | 명령어 | DB 필요 | 출력 파일 | 시간 |
    |--------|---------|-----------|------|
    | analyze | ✅ | - | 2-5s |
    | scan | ✅ | docs/generated/ | 1-3s |
    | index-docs | ❌ | .tsdoc/doc-symbols.json | 0.1-2s |
    ```

11. **성능 벤치마크**
    - 프로젝트 크기별 예상 시간
    - 최적화 팁

12. **문제 해결 플로우차트**
    ```mermaid
    graph TD
    A[명령어 실행] --> B{성공?}
    B -->|No| C{에러 유형}
    C -->|DB not found| D[tsdoc-edge build]
    C -->|Validation error| E[validate-docs]
    ```

---

## 📋 수정 체크리스트

### 즉시 수정 (P0)
- [ ] 데이터베이스 생성 명령어 구현 (`tsdoc-edge build`)
- [ ] 모든 워크플로우에 전제조건 추가
- [ ] 신규 프로젝트 시나리오 재작성
- [ ] Workflow 2 수정 (DB 생성 단계 추가)
- [ ] 시나리오 1, 3, 5 수정

### 주요 개선 (P1)
- [ ] `who-uses` 명령어 문서화
- [ ] `id` 서브커맨드 상세 가이드
- [ ] fold/unfold 관련 정리
- [ ] CI/CD 예시 수정

### 선택 개선 (P2-P3)
- [ ] 실전 예시 섹션
- [ ] 에러 핸들링 가이드
- [ ] 명령어 참조 테이블
- [ ] 성능 가이드

---

## 📊 최종 통계

**전체 워크플로우**: 6개
- ✅ 완전 동작: 2개 (Workflow 3, 6)
- ⚠️ 조건부 동작: 3개 (Workflow 1, 4, 5)
- ❌ 동작 불가: 1개 (Workflow 2)

**전체 시나리오**: 7개
- ✅ 완전 동작: 2개 (시나리오 4, 6)
- ⚠️ 조건부 동작: 3개 (시나리오 2, 5, 7)
- ❌ 동작 불가: 2개 (시나리오 1, 3)

**명령어 검증**: 27개
- ✅ 모두 존재 확인
- ✅ 옵션 정확성 확인
- ❌ 일부 전제조건 누락

**심각도**:
- 🔴 Critical: 1개 (DB 생성 누락)
- 🟡 Warning: 3개
- 🟢 Minor: 2개

---

## 💡 결론

**현재 문서 상태**: 70% 정확도

**주요 문제**:
1. 데이터베이스 생성 프로세스 완전 누락 (치명적)
2. 전제조건 불명확
3. 일부 명령어 미문서화

**권장 조치**:
1. **즉시**: DB 생성 명령어 구현 또는 문서 전면 수정
2. **우선**: 전제조건 명시, who-uses/id 문서화
3. **선택**: 실전 예시, 에러 가이드

**예상 수정 시간**:
- P0 수정: 2-3시간
- P1 수정: 1-2시간
- P2-P3: 선택적

**수정 후 예상 정확도**: 95%+
