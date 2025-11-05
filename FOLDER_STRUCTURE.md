# 프로젝트 문서 폴더 구조

> TSDoc Edge 문서 관리 시스템 구조 및 사용 가이드

## 폴더 구조

```
project-root/
├── managed/                     # ✅ TSDoc Edge 관리 문서 (SSOT)
│   ├── features/                # 기능 정의 (Primary symbols)
│   │   ├── core-workflow.md
│   │   ├── document-symbol-system.md
│   │   ├── analysis-features.md
│   │   ├── validation-features.md
│   │   ├── symbol-graph.md
│   │   └── auto-indexing.md
│   ├── guides/                  # 사용 가이드 (보조 문서)
│   └── design/                  # 설계 문서
│
├── examples/                    # ⚠️  예시/템플릿 (관리 제외)
│   └── feature-docs-strategy.md
│
├── reference/                   # 📚 레퍼런스 (수동 관리)
│   ├── tsdoc-conventions/
│   ├── CLI_ADVANCED_FEATURES.md
│   └── TSDOC_SPEC_SUPPORT.md
│
├── archive/                     # 📦 과거 문서 보관
│   ├── guides/                  # 이전 가이드
│   ├── design/                  # 이전 설계 문서
│   ├── reports/                 # 리포트 및 감사
│   ├── analysis/                # 분석 및 통계
│   └── deprecated/              # 더 이상 사용하지 않는 문서
│
├── data/                        # 💾 JSONL 데이터
├── generated/                   # 🔧 자동 생성 (CLI 출력)
└── output/                      # 📤 출력 파일
```

## 폴더 설명

### 📁 `managed/` - 관리 대상 문서

**용도**: TSDoc Edge가 자동으로 관리하는 문서들

**특징**:
- 모든 문서에 YAML frontmatter 포함 (`tsdoc: managed`)
- [[Symbol]] 정의 및 참조 SSOT 보장
- Backlinks 자동 생성
- 코드-문서 양방향 연결

**하위 폴더**:
- `features/`: 기능 정의 문서 (Primary symbols)
- `guides/`: 사용 가이드
- `design/`: 설계 문서

**Frontmatter 예시**:
```yaml
---
tsdoc: managed
version: 1.0.0
status: active
primary: CoreWorkflow
category: feature
tags:
  - core
  - pipeline
---
```

### 📁 `examples/` - 예시 문서

**용도**: 템플릿, 예시 코드, 가이드 문서

**특징**:
- TSDoc Edge 관리 대상 **제외**
- 예시 코드의 `[[Symbol]]`은 실제 참조로 인식하지 않음
- `tsdoc: example` frontmatter 사용 (선택)

**사용 시나리오**:
- 문서 작성 템플릿
- 기능 설명용 예시
- 튜토리얼

### 📁 `reference/` - 레퍼런스 문서

**용도**: 컨벤션, 스펙, 표준 문서

**특징**:
- TSDoc Edge 관리 대상 **제외**
- 수동으로 유지관리
- 변경 빈도 낮음

**내용**:
- TSDoc 컨벤션
- 스펙 문서
- 표준 정의

### 📁 `generated/` - 자동 생성 문서

**용도**: CLI 명령어로 생성된 문서

**특징**:
- `scan`, `stats` 등 명령어 출력
- 자동 갱신
- Git ignore 권장

### 📁 `data/` - JSONL 데이터

**용도**: Symbol metadata JSONL 파일

**특징**:
- Git 버전 관리
- CLI로 자동 생성
- 데이터베이스 동기화

## 사용 가이드

### 1. 신규 기능 문서 작성

```bash
# 1. 문서 생성
cat > managed/features/new-feature.md << 'EOF'
---
tsdoc: managed
version: 1.0.0
status: active
primary: NewFeature
category: feature
tags:
  - core
---

# [[NewFeature]]

기능 설명...
EOF

# 2. 인덱스 업데이트
npx tsdoc-edge index-docs managed

# 3. 검증
npx tsdoc-edge validate-docs
```

### 2. 예시 문서 작성

```bash
# examples 폴더에 작성 (자동으로 제외됨)
cat > examples/my-example.md << 'EOF'
---
tsdoc: example
purpose: Template for feature documentation
---

# Example Content

이 문서의 [[Symbol]] 참조는 실제 심볼로 인식되지 않습니다.
EOF
```

### 3. 문서 인덱싱

```bash
# 관리 문서만 인덱싱 (권장)
npx tsdoc-edge index-docs managed

# 특정 파일만 증분 업데이트
npx tsdoc-edge index-docs --file=managed/features/new-feature.md
```

### 4. 문서 검증

```bash
# SSOT 검증
npx tsdoc-edge validate-docs

# 심볼 검색
npx tsdoc-edge find-doc CoreWorkflow

# 백링크 갱신
npx tsdoc-edge update-backlinks managed
```

## Configuration

`.tsdoc.config.json`:
```json
{
  "documentManagement": {
    "enabled": true,
    "managedDirs": ["managed"],
    "excludeDirs": ["examples", "archive/deprecated", "reference"],
    "requireFrontmatter": false,
    "strictMode": false,
    "ignoreCodeBlocks": true
  }
}
```

**옵션 설명**:
- `enabled`: 문서 관리 시스템 활성화
- `managedDirs`: 관리 대상 디렉토리
- `excludeDirs`: 제외 디렉토리 (예시, 템플릿)
- `requireFrontmatter`: frontmatter 필수 여부
- `strictMode`: 엄격 모드 (frontmatter 없으면 에러)
- `ignoreCodeBlocks`: 코드 블록 내 `[[]]` 무시

## 마이그레이션 가이드

### 기존 문서를 managed로 이동

```bash
# 1. frontmatter 추가
cat > /tmp/add_frontmatter.sh << 'EOF'
#!/bin/bash
CONTENT=$(cat "$1")
cat > "$1" << FRONTMATTER
---
tsdoc: managed
version: 1.0.0
status: active
primary: $2
category: feature
---

$CONTENT
FRONTMATTER
EOF

# 2. 스크립트 실행
bash /tmp/add_frontmatter.sh docs/my-doc.md "MySymbol"

# 3. 파일 이동
mv docs/my-doc.md managed/features/

# 4. 재인덱싱
npx tsdoc-edge index-docs managed
```

## Best Practices

### ✅ DO

1. **managed 폴더**에 기능 문서 작성
2. **Frontmatter** 추가 (최소한 `tsdoc: managed`)
3. **Primary symbol** 명시 (`# [[SymbolName]]`)
4. **index-docs managed** 실행 (전체 스캔 방지)
5. **Backlinks 섹션** 자동 생성 영역 보존

### ❌ DON'T

1. managed 외부에 Primary symbol 정의
2. 예시 코드를 managed에 포함
3. Backlinks 섹션 수동 편집
4. Frontmatter 없이 관리 문서 작성
5. `index-docs docs` 전체 스캔 (혼란 초래)

## 문제 해결

### Q: 중복 Primary 정의 에러

```
Error: Duplicate primary definition for [[MySymbol]]
```

**원인**: 동일한 심볼을 여러 파일에서 H1으로 정의

**해결**:
1. managed 폴더 외부 파일 제거 또는 예시로 이동
2. Primary는 하나만, 나머지는 H2+ Auxiliary로 변경

### Q: 예시 문서가 인덱싱됨

**원인**: `index-docs docs` 실행

**해결**:
```bash
# managed 폴더만 인덱싱
npx tsdoc-edge index-docs managed
```

### Q: Backlinks가 오염됨

**원인**: 코드 블록 내 `[[Symbol]]`이 실제 참조로 인식

**해결**:
- Config에서 `ignoreCodeBlocks: true` 설정 (기본값)
- 또는 예시 문서를 `examples/`로 이동

## 관련 문서

- [DOCUMENT_MANAGEMENT_DESIGN.md](./DOCUMENT_MANAGEMENT_DESIGN.md) - 전체 설계
- [CONFIG_GUIDE.md](./CONFIG_GUIDE.md) - 설정 가이드
- [[DocumentSymbolSystem]] - 문서 심볼 시스템
