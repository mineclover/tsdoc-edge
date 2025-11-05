# 문서 기반 의존성 분석 (Document-Based Dependency Analysis)

> 문서를 시작점으로 한 전체 시스템 의존성 추적 가이드

## 개요

TSDoc Edge는 문서에서 언급하는 `[[Symbol]]`을 추적하여 구현 코드와 그 의존성까지 자동으로 분석합니다. 이를 통해:

- ✅ 문서만 읽고도 전체 시스템 구조 파악
- ✅ 변경 시 영향 범위 자동 분석
- ✅ 리팩토링 계획 수립 지원
- ✅ 코드와 문서의 일관성 검증

## 핵심 기능

### 1. 문서 → 심볼 → 코드 추적

**워크플로우**:
```
📄 문서 읽기
   ↓
🔍 [[Symbol]] 참조 발견
   ↓
🔗 심볼 정의 찾기
   ↓
💻 코드 구현체 확인
   ↓
📦 의존성 분석
```

**예시**:
```bash
# 1. 문서에서 심볼 확인
cat docs/managed/features/core-workflow.md
# → [[DocumentSymbolSystem]] 발견

# 2. 심볼 추적
tsdoc-edge find-doc DocumentSymbolSystem

# 출력:
# Defined in: docs/managed/features/document-symbol-system.md
# Implemented by:
#   - DocumentSymbolParser → src/doc-symbol/DocumentSymbolParser.ts
#   - DocumentSymbolRegistry → src/doc-symbol/DocumentSymbolRegistry.ts
```

### 2. 영향 범위 분석 (Impact Analysis)

특정 심볼을 변경할 때 영향받는 모든 위치를 자동으로 찾습니다.

**사용법**:
```bash
# 영향 분석 스크립트 실행
bash /tmp/test_impact_analysis.sh DocumentSymbolSystem

# 출력:
# 📊 변경 시 영향:
#    ├─ 코드 파일: 2개 (직접 수정)
#    ├─ 문서 파일: 32개 (검토/업데이트)
#    └─ 연관 기능: 5개 (간접 영향)
```

**분석 항목**:
1. **심볼 정의 위치**: Primary 정의 문서
2. **코드 구현체**: `@doc [[Symbol]]` 태그가 있는 클래스/함수
3. **문서 참조**: 이 심볼을 언급하는 모든 문서
4. **연관 기능**: 이 심볼에 의존하는 다른 기능
5. **권장 작업 순서**: 변경 시 따라야 할 단계

### 3. 의존성 트리 생성

**사용법**:
```bash
# 의존성 트리 분석
bash /tmp/test_dependency_tree.sh DocumentSymbolSystem

# 출력:
# [[DocumentSymbolSystem]]
#      │
#      ├── DocumentSymbolParser
#      │   ├── ConfigManager
#      │   └── FrontmatterParser
#      └── DocumentSymbolRegistry
```

### 4. 역의존성 추적

"이 심볼을 누가 사용하는가?"를 추적합니다.

**CLI 명령어**:
```bash
tsdoc-edge find-doc DocumentSymbolSystem

# Referenced by (32):
#   - CORE_FEATURES_V2.md:136
#   - managed/features/core-workflow.md:82
#   - managed/features/validation-features.md:95
#   ...
```

## 실전 사용 시나리오

### 시나리오 1: 신규 기능 이해하기

**목표**: `[[AnalysisFeatures]]`가 무엇인지, 어떻게 구현되어 있는지 파악

**단계**:
```bash
# 1. 심볼 찾기
tsdoc-edge find-doc AnalysisFeatures

# 2. 문서 읽기
cat docs/managed/features/analysis-features.md

# 3. 구현 코드 확인
# → CodeHealthChecker.ts, DocumentationAnalyzer.ts

# 4. 의존성 확인
bash /tmp/test_dependency_tree.sh AnalysisFeatures
```

**결과**: 문서만 읽고도 전체 구조 파악 완료

---

### 시나리오 2: 리팩토링 계획 수립

**목표**: `DocumentSymbolParser`를 개선하려고 할 때 영향 범위 파악

**단계**:
```bash
# 1. 영향 분석
bash /tmp/test_impact_analysis.sh DocumentSymbolSystem

# 출력:
# 📊 변경 시 영향:
#    ├─ 코드 파일: 2개
#    ├─ 문서 파일: 32개
#    └─ 연관 기능: 5개
# ⚠️  영향 범위: 중간 (신중하게 변경)

# 2. 연관 기능 확인
# → CoreWorkflow, ValidationFeatures, AutoIndexing 등

# 3. 테스트 전략 수립
# → DocumentSymbolParser 테스트 먼저 작성
# → 연관 기능들의 통합 테스트 검토
```

**권장 작업 순서**:
1. 📝 문서 업데이트
2. 💻 코드 변경
3. 🧪 테스트 실행
4. 🔍 참조 문서 검토
5. 🔄 백링크 갱신

---

### 시나리오 3: 버그 수정 영향 분석

**목표**: `FrontmatterParser`에서 버그를 수정했을 때 영향받는 곳 찾기

**단계**:
```bash
# 1. 이 모듈을 사용하는 코드 찾기
grep -r "FrontmatterParser" src/ --include="*.ts"

# 2. 관련 심볼 찾기
# → DocumentSymbolParser가 사용 중

# 3. DocumentSymbolSystem 영향 분석
bash /tmp/test_impact_analysis.sh DocumentSymbolSystem

# 4. 테스트 실행
npm test -- FrontmatterParser
npm test -- DocumentSymbolParser
```

---

### 시나리오 4: 새로운 기능 설계

**목표**: `[[CacheSystem]]` 기능을 추가할 때 어디에 통합해야 하는지 결정

**단계**:
```bash
# 1. 기존 기능들 확인
tsdoc-edge find-doc CoreWorkflow
tsdoc-edge find-doc SymbolGraphFeatures

# 2. 의존성 트리 분석
bash /tmp/test_dependency_tree.sh CoreWorkflow
bash /tmp/test_dependency_tree.sh SymbolGraphFeatures

# 3. 통합 지점 결정
# → SymbolGraphBuilder에 캐싱 레이어 추가
# → ConfigManager에 캐시 설정 추가

# 4. 문서 작성
cat > docs/managed/features/cache-system.md << 'EOF'
---
tsdoc: managed
version: 1.0.0
status: draft
primary: CacheSystem
category: feature
---

# [[CacheSystem]]

심볼 그래프 빌드 성능 향상을 위한 캐싱 시스템

## 관련 기능
- [[SymbolGraphFeatures]] - 메인 통합 지점
- [[CoreWorkflow]] - 워크플로우 최적화
EOF
```

## CLI 명령어 레퍼런스

### 심볼 찾기

```bash
# 심볼 정보 조회
tsdoc-edge find-doc <SymbolName>

# 예시
tsdoc-edge find-doc DocumentSymbolSystem
tsdoc-edge find-doc CoreWorkflow
tsdoc-edge find-doc AnalysisFeatures
```

### 문서 인덱싱

```bash
# 관리 문서 인덱싱
tsdoc-edge index-docs docs/managed

# 특정 파일만 증분 업데이트
tsdoc-edge index-docs --file=docs/managed/features/new-feature.md
```

### 문서 검증

```bash
# SSOT 검증
tsdoc-edge validate-docs

# 백링크 갱신
tsdoc-edge update-backlinks docs/managed
```

## 고급 사용법

### 스크립트를 통한 자동화

#### 영향 분석 자동화

```bash
#!/bin/bash
# pre-refactor-check.sh

SYMBOL="$1"

echo "🔍 리팩토링 사전 점검: [[$SYMBOL]]"
echo ""

# 1. 영향 분석
bash /tmp/test_impact_analysis.sh "$SYMBOL"

# 2. 테스트 커버리지 확인
echo ""
echo "🧪 테스트 커버리지:"
npm test -- --coverage --testNamePattern="$SYMBOL"

# 3. Git 변경 사항 확인
echo ""
echo "📝 최근 변경 이력:"
git log --oneline --grep="$SYMBOL" -5

echo ""
echo "✅ 사전 점검 완료. 리팩토링을 진행하세요."
```

#### 문서-코드 싱크 검증

```bash
#!/bin/bash
# verify-doc-code-sync.sh

echo "🔍 문서-코드 일치성 검증"
echo ""

# 1. 관리 문서의 모든 Primary 심볼 추출
SYMBOLS=$(grep "^primary:" docs/managed/features/*.md | sed 's/.*primary: //' | sort -u)

# 2. 각 심볼의 구현 코드 확인
for symbol in $SYMBOLS; do
  echo "📍 [[$symbol]]"

  IMPLS=$(tsdoc-edge find-doc "$symbol" 2>/dev/null | grep "Implemented by" -A 10 | grep "→")

  if [ -z "$IMPLS" ]; then
    echo "   ❌ 구현 코드 없음!"
  else
    echo "   ✅ 구현 코드 존재"
  fi
done

echo ""
echo "✅ 검증 완료"
```

## 성능 고려사항

### 대규모 프로젝트에서의 최적화

**문제**: 수백 개의 문서를 인덱싱할 때 느림

**해결책**:
```bash
# 1. managed 폴더만 인덱싱
tsdoc-edge index-docs docs/managed

# 2. 증분 업데이트 사용
tsdoc-edge index-docs --file=<변경된_파일>

# 3. Git hook으로 자동화
# → 커밋 시 변경된 파일만 재인덱싱
```

### 캐싱 전략

**인덱스 파일 재사용**:
```bash
# 인덱스 파일 위치
.tsdoc/doc-symbols.json

# CI/CD에서 캐싱
# GitHub Actions 예시:
- uses: actions/cache@v3
  with:
    path: .tsdoc
    key: doc-symbols-${{ hashFiles('docs/managed/**/*.md') }}
```

## 문제 해결

### Q: "Implemented by" 섹션이 비어있음

**원인**: 코드에 `@doc [[Symbol]]` 태그가 없음

**해결**:
```typescript
/**
 * Document symbol parser
 *
 * @doc [[DocumentSymbolSystem#Parser]]  ← 추가
 * @public
 */
export class DocumentSymbolParser {
  // ...
}
```

### Q: 의존성 트리가 불완전함

**원인**: 증분 업데이트로 인한 인덱스 불일치

**해결**:
```bash
# 전체 재인덱싱
tsdoc-edge index-docs docs/managed
```

### Q: 순환 의존성 탐지

**문제**: A → B → C → A 순환 참조

**해결**:
1. 의존성 트리 분석으로 순환 지점 찾기
2. 아키텍처 재설계 또는 의존성 역전(DIP) 적용

## 관련 문서

- [DOCUMENT_DEPENDENCY_TEST_REPORT.md](./DOCUMENT_DEPENDENCY_TEST_REPORT.md) - 테스트 결과
- [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) - 폴더 구조 가이드
- [[DocumentSymbolSystem]] - 문서 심볼 시스템
- [[CoreWorkflow]] - 핵심 워크플로우

## 결론

문서 기반 의존성 분석 기능을 통해:

✅ **문서가 곧 아키텍처 다이어그램**
- 문서만 읽으면 전체 시스템 구조 파악

✅ **안전한 리팩토링**
- 변경 전 영향 범위 자동 분석

✅ **SSOT 자동 유지**
- 문서-코드 불일치 자동 탐지

✅ **효율적인 협업**
- 신규 개발자도 빠르게 온보딩
