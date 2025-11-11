---
tsdoc: managed
version: 1.0.0
status: active
primary: AutoIndexing
category: feature
tags:
  - automation
  - workflow
lastUpdated: 2025-01-15
---

# [[AutoIndexing]]
> 파일 저장 시 자동으로 문서 심볼 인덱스 업데이트

## 개요
마크다운 파일이나 TypeScript 코드를 수정할 때마다 수동으로 `index-docs`를 실행하는 대신, 파일 저장 시점에 자동으로 인덱스를 업데이트합니다. 증분 업데이트 방식으로 빠른 성능을 제공합니다.

**해결하는 문제:**
- 수동 인덱싱의 번거로움
- 인덱스와 코드/문서 간 불일치
- 대규모 문서 변경 시 느린 재인덱싱
- Git commit 전 인덱스 누락
## 핵심 개념

### 1. 증분 업데이트 (Incremental Update)
**전체 스캔 (Full Scan):**
```bash
tsdoc-edge index-docs docs
# → 42개 마크다운 파일 모두 파싱
# → 실행 시간: ~2-5초
```
**증분 업데이트 (Incremental):**
```bash
tsdoc-edge index-docs --file=docs/API.md
# → 1개 파일만 파싱
# → 실행 시간: ~0.1초 (20-50배 빠름)
```
**동작 방식:**
1. 기존 인덱스 로드 (`.tsdoc/doc-symbols.json`)
2. 해당 파일의 구 심볼 제거 (`unregisterFile`)
3. 새 심볼 파싱 및 등록
4. 인덱스 저장

### 2. 자동화 방법
**A. Git Hook** - Commit 시 자동 업데이트
- Pre-commit hook으로 스테이징된 파일 감지
- 증분 업데이트 실행
- 인덱스 파일 자동 스테이징
**B. VSCode Task** - 파일 저장 시 자동 실행
- Run on Save extension
- 백그라운드 실행

**C. File Watcher** - 실시간 감시
- fswatch 기반
- 개발 중 계속 실행
**D. GitHub Actions** - CI/CD 통합
- PR 시 자동 검증
- 변경 파일만 업데이트

## 핵심 산출물

### Document Indexing Commands

**[[IndexDocsCommand]]** - `tsdoc-edge index-docs [dir] [--file=<path>]`
- 문서 심볼 인덱스 생성/업데이트
- `--file`: 증분 업데이트 (단일 파일)
- 전체 스캔 또는 증분 모드
- **Impl**: `src/commands/IndexDocsCommand.ts:39`

**[[UpdateBacklinksCommand]]** - `tsdoc-edge update-backlinks`
- `[[Symbol]]` 역방향 링크 업데이트
- 심볼 참조 추적 및 Backlinks 섹션 생성
- **Impl**: `src/commands/UpdateBacklinksCommand.ts:40`

**[[ValidateSymbolRefsCommand]]** - `tsdoc-edge validate-symbol-refs <path>`
- `[[Symbol]]` 참조 검증
- 정의되지 않은 심볼 탐지
- **Impl**: `src/commands/ValidateSymbolRefsCommand.ts:71`

**[[UpdateSymbolRefsCommand]]** - `tsdoc-edge update-symbol-refs <path>`
- `[[Symbol]]` 참조 자동 수정
- 누락된 참조 추가
- **Impl**: `src/commands/UpdateSymbolRefsCommand.ts:40`

### Supporting Components

이 명령어들은 내부적으로:
- [DocumentSymbolRegistry.unregisterFile()](../../src/doc-symbol/DocumentSymbolRegistry.ts#DocumentSymbolRegistry) - 기존 심볼 제거
- [DocumentSymbolRegistry.import()](../../src/doc-symbol/DocumentSymbolRegistry.ts#DocumentSymbolRegistry) - 기존 인덱스 로드
- [DocumentSymbolRegistry.export()](../../src/doc-symbol/DocumentSymbolRegistry.ts#DocumentSymbolRegistry) - 새 인덱스 저장

### 설정 파일
**Git Hook:**
- `examples/git-hooks/pre-commit`
**VSCode:**
- `examples/vscode/settings.json` - Run on Save 설정
- `examples/vscode/tasks.json` - Task 정의

**GitHub Actions:**
- `examples/github-actions/update-doc-index.yml`

## 성능 비교
| 방법 | 파일 수 | 실행 시간 | 사용 시점 |
|------|---------|-----------|-----------|
| **증분 업데이트** | 1 | ~0.1s | ✅ 개발 중 (자주 저장) |
| **전체 스캔** | 100 | ~2-5s | 초기 설정, CI/CD |
| **전체 스캔** | 500 | ~10-20s | 대규모 변경 |

**권장 사항:**
- 로컬 개발: 증분 업데이트 (Git hook, VSCode)
- CI/CD: 변경 파일만 증분 또는 전체 스캔
- 대규모 변경: 수동으로 전체 스캔

## 사용 시나리오
### 시나리오 1: Git Hook으로 자동화

**설치:**
```bash
cp examples/git-hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```
**동작:**
```bash
# 문서 수정
vim docs/features/NEW_FEATURE.md
# Git add
git add docs/features/NEW_FEATURE.md
# Commit 시도
git commit -m "docs: add new feature"
# → Pre-commit hook 실행
# 🔍 Updating document symbol index...
#   → docs/features/NEW_FEATURE.md
# ✅ Index updated and staged
# [main abc123] docs: add new feature
```
### 시나리오 2: VSCode 저장 시 자동 실행

**설정 (.vscode/settings.json):**
```json
{
  "emeraldwalk.runonsave": {
    "commands": [{
      "match": "docs/.*\\.md$",
      "cmd": "npx tsdoc-edge index-docs --file=${file}",
      "isAsync": true
    }]
  }
}
```

**동작:**
- `docs/*.md` 파일 저장
- 백그라운드에서 자동으로 `index-docs --file` 실행
- 0.1초 내 완료

### 시나리오 3: GitHub Actions (CI/CD)
**워크플로우:**
```yaml
- name: Update document index (incremental)
  run: |
    # 변경된 마크다운 파일 찾기
    CHANGED_MD=$(git diff --name-only $BASE $HEAD | grep "^docs/.*\.md$")
    for file in $CHANGED_MD; do
      if [ -f "$file" ]; then
        npx tsdoc-edge index-docs --file="$file"
      fi
    done

- name: Commit updated index
  uses: stefanzweifel/git-auto-commit-action@v4
  with:
    file_pattern: ".tsdoc/doc-symbols.json"
```
### 시나리오 4: File Watcher (개발 모드)

**스크립트 (scripts/watch-docs.sh):**
```bash
#!/bin/bash
fswatch -o docs | while read file; do
  CHANGED=$(echo "$file" | grep "\.md$")
  if [ -n "$CHANGED" ]; then
    echo "📝 Detected change: $CHANGED"
    npx tsdoc-edge index-docs --file="$CHANGED"
  fi
done
```
**실행:**
```bash
npm run watch:docs
# → 백그라운드에서 계속 실행
# → docs/ 폴더 변경 감지
```
## CLI 옵션

```bash
# 증분 업데이트 (단일 파일)
tsdoc-edge index-docs --file=<path>
# 전체 스캔
tsdoc-edge index-docs [dir]
# 코드 파일도 재스캔 (@doc 태그 업데이트)
tsdoc-edge index-docs docs --scan-code
```

## 인덱스 파일 구조
`.tsdoc/doc-symbols.json`:
```json
{
  "timestamp": "2025-10-31T17:30:00.000Z",
  "statistics": {
    "totalDefinitions": 12,
    "totalReferences": 150,
    "totalCodeConnections": 25
  },
  "symbols": ["CoreWorkflow", "AnalysisFeatures", ...],
  "registryData": {
    "definitions": [...],
    "references": [...],
    "codeConnections": [...]
  }
}
```

**특징:**
- JSON 형식으로 Git 친화적
- 증분 업데이트 가능 (export/import 지원)
- 타임스탬프로 최신성 확인

## 자동화 설정 비교
| 방법 | 장점 | 단점 | 권장 |
|------|------|------|------|
| **Git Hook** | Commit 전 자동 보장 | Git hook 설치 필요 | ✅ 팀 전체 |
| **VSCode Task** | 저장 시 즉시 | 에디터 의존적 | ✅ 개인 |
| **File Watcher** | 실시간 | 백그라운드 프로세스 | 개발 모드 |
| **GitHub Actions** | CI/CD 통합 | 약간의 지연 | ✅ PR 검증 |
**최적 조합:**
- 로컬: Git Hook + VSCode Task
- CI/CD: GitHub Actions

## 트러블슈팅
### 1. 인덱스가 업데이트되지 않음

```bash
# 인덱스 확인
cat .tsdoc/doc-symbols.json
# 강제 전체 재생성
rm -rf .tsdoc/doc-symbols.json
tsdoc-edge index-docs docs
```
### 2. Git hook이 실행되지 않음

```bash
# 권한 확인
ls -l .git/hooks/pre-commit
# 권한 부여
chmod +x .git/hooks/pre-commit
# 테스트
git add docs/test.md
git commit -m "test"
```
### 3. "File not found" 오류

```bash
# 상대 경로 사용
tsdoc-edge index-docs --file=docs/API.md  # ✅
# 절대 경로는 안 됨
tsdoc-edge index-docs --file=/Users/.../docs/API.md  # ❌
```

## 통합 워크플로우
**실제 프로젝트 설정 예시:**

```bash
# 1. 초기 인덱스 생성
tsdoc-edge index-docs docs
# 2. Git hook 설치
cp examples/git-hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# 3. VSCode 설정 (선택)
# .vscode/settings.json 참조

# 4. GitHub Actions 설정
# .github/workflows/update-doc-index.yml 참조

# 5. 개발 플로우
# - 파일 저장 → VSCode가 자동 업데이트
# - Git commit → Hook이 인덱스 스테이징
# - Git push → GitHub Actions가 검증
```
## 관련 기능

- [[DocumentSymbolSystem]] - [[]] 심볼 시스템
- [[ValidationFeatures]] - 인덱스 검증
- [[CoreWorkflow]] - 메인 문서화 파이프라인
## 가이드

**상세 사용법:** [AUTO_INDEXING_GUIDE.md](../AUTO_INDEXING_GUIDE.md)
- 각 방법별 상세 설정
- 예시 파일 전체
- 성능 최적화 팁
- 워크플로우 통합

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /home/user/tsdoc-edge/managed/README.md:183
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:82
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:83
- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:36
- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:37
- [[UpdateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateSymbolRefsCommand.md:32
- [[UpdateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateSymbolRefsCommand.md:33
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:59
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:60
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:148
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:291
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:330
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:331
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:332
- [[CoreFeatures]] → /home/user/tsdoc-edge/managed/features/core-features-catalog.md:333
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:196
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:197
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:198
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:92
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:102
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:125
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:126
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:127
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:128
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:129
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:130
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:131
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:204
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:259
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:260
- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:261
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:267
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:343

