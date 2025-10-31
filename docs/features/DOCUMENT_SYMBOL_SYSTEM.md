# [[DocumentSymbolSystem]]

> Wiki 스타일 [[]] 문법으로 문서와 코드를 양방향 연결

## 개요

문서에서 `[[Symbol]]` 문법으로 개념을 정의하고, 코드에서 `@doc [[Symbol]]` 태그로 연결하는 시스템입니다. Obsidian, Roam Research와 유사한 Wiki 스타일 문서 작성을 지원하며, SSOT(Single Source of Truth)를 보장합니다.

**해결하는 문제:**
- 문서 간 참조 일관성 유지
- 중복 정의 방지 (SSOT)
- 코드와 문서 동기화 자동화
- 사용되지 않는 문서 탐지

## 핵심 개념

### 1. 심볼 정의 (Symbol Definition)

#### Primary Definition (H1)
```markdown
# [[UserAuthentication]]

사용자 인증 시스템에 대한 전체 설명...
```

- 파일당 **하나의 Primary 정의만** 허용 (SSOT)
- 중복 정의 시 `validate-docs`에서 에러

#### Auxiliary Definition (H2+)
```markdown
## [[UserAuthentication]]

추가 섹션 또는 세부 설명...
```

- 같은 심볼을 여러 파일에서 보조 정의 가능
- Primary 없는 Auxiliary는 에러 (orphaned)

### 2. 심볼 참조 (Symbol Reference)

#### 문서 내 참조
```markdown
인증 시스템은 [[UserAuthentication]]에서 정의되며,
[[SessionManagement]]와 연계됩니다.
```

#### 섹션 지정 참조
```markdown
자세한 내용은 [[UserAuthentication#Implementation]]을 참조하세요.
```

### 3. 코드 연결 (Code Connection)

```typescript
/**
 * User authentication service
 *
 * @doc [[UserAuthentication]]
 * @public
 */
export class AuthService {
  /**
   * Login with credentials
   *
   * @doc [[UserAuthentication#Login]]
   */
  login(username: string, password: string) {
    // ...
  }
}
```

## 핵심 산출물

### Parser
- [DocumentSymbolParser](../../src/doc-symbol/DocumentSymbolParser.ts#DocumentSymbolParser) - 마크다운 [[]] 파싱
  - H1 primary 정의 추출
  - H2+ auxiliary 정의 추출
  - 인라인 참조 추출
  - 코드 링크 추출

- [TSDocSymbolParser](../../src/doc-symbol/TSDocSymbolParser.ts#TSDocSymbolParser) - 코드 @doc 태그 파싱
  - TypeScript Compiler API 사용
  - `@doc [[Symbol]]` 태그 추출
  - 섹션 지정 지원

### Registry & Validation
- [DocumentSymbolRegistry](../../src/doc-symbol/DocumentSymbolRegistry.ts#DocumentSymbolRegistry) - SSOT 검증 및 저장
  - 심볼 등록 및 인덱싱
  - 중복 primary 정의 방지
  - 고아 auxiliary 탐지
  - 미정의 참조 검증
  - 사용되지 않는 심볼 경고

**검증 규칙:**
- ❌ **Error**: 중복 primary 정의
- ❌ **Error**: Auxiliary without primary (orphaned)
- ❌ **Error**: 미정의 심볼 참조
- ⚠️  **Warning**: 사용되지 않는 정의
- ⚠️  **Warning**: 과도한 참조 (>20)
- ⚠️  **Warning**: 코드 구현 없음

### Backlink Generation
- [BacklinkGenerator](../../src/doc-symbol/BacklinkGenerator.ts#BacklinkGenerator) - 자동 백링크 생성
  - 양방향 참조 수집
  - 문서 최하단 자동 갱신
  - "Referenced By" / "Implemented By" 분류

## 사용 시나리오

### 시나리오 1: 새로운 기능 문서화

```bash
# 1. 문서 작성
cat > docs/features/NEW_FEATURE.md << 'EOF'
# [[NewFeature]]

새로운 기능 설명...

## [[NewFeature#Implementation]]
구현 세부사항...
EOF

# 2. 인덱스 업데이트
tsdoc-edge index-docs --file=docs/features/NEW_FEATURE.md

# 3. 검증
tsdoc-edge validate-docs
```

### 시나리오 2: 코드에서 문서 참조

```typescript
/**
 * Implements the new feature
 *
 * @doc [[NewFeature#Implementation]]
 */
export class NewFeatureImpl {
  // ...
}
```

```bash
# 전체 재인덱싱 (코드 변경 반영)
tsdoc-edge index-docs docs
```

### 시나리오 3: 백링크 자동 생성

```bash
# 특정 문서 백링크 업데이트
tsdoc-edge update-backlinks docs/features/NEW_FEATURE.md

# 모든 문서 백링크 업데이트
tsdoc-edge update-backlinks
```

결과:
```markdown
# [[NewFeature]]

...

---

## Backlinks

### Referenced By

- [[NewFeature]]#Implementation → /Users/junwoobang/project/tsdoc-edge/docs/features/DOCUMENT_SYMBOL_SYSTEM.md:137

# 심볼 정의 위치와 모든 참조 찾기
tsdoc-edge find-doc NewFeature
```

출력:
```
📍 Definition
  docs/features/NEW_FEATURE.md:1

📄 Document References (3)
  docs/features/CORE_WORKFLOW.md:45
  docs/features/ANALYSIS_FEATURES.md:12
  docs/README.md:100

💻 Code Implementations (2)
  src/features/NewFeatureImpl.ts:10
  src/utils/helper.ts:25
```

## CLI 명령어

```bash
# 인덱싱
tsdoc-edge index-docs [dir]              # 전체 스캔
tsdoc-edge index-docs --file=<path>      # 단일 파일 업데이트 (증분)

# 검증
tsdoc-edge validate-docs [dir]           # SSOT 규칙 검증

# 백링크
tsdoc-edge update-backlinks [path]       # 백링크 자동 생성

# 검색
tsdoc-edge find-doc <symbol>             # 심볼 찾기
```

## 인덱스 파일 구조

`.tsdoc/doc-symbols.json`:
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "statistics": {
    "totalDefinitions": 45,
    "totalAuxiliaries": 12,
    "totalReferences": 128,
    "totalCodeConnections": 67
  },
  "symbols": [
    "CoreWorkflow",
    "DocumentSymbolSystem",
    "AnalysisFeatures",
    "..."
  ],
  "registryData": {
    "definitions": [...],
    "auxiliaries": [...],
    "references": [...],
    "codeConnections": [...]
  }
}
```

## 자동화

### Git Hook으로 자동 인덱싱

```bash
# Pre-commit hook 설치
cp examples/git-hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

저장된 마크다운 파일만 증분 업데이트 → 빠른 성능

### VSCode 저장 시 자동 실행

```json
// .vscode/settings.json
{
  "emeraldwalk.runonsave": {
    "commands": [{
      "match": "docs/.*\\.md$",
      "cmd": "npx tsdoc-edge index-docs --file=${file}"
    }]
  }
}
```

자세한 내용: [[AutoIndexing]]

## 성능

| 작업 | 파일 수 | 실행 시간 | 권장 |
|------|---------|-----------|------|
| 증분 업데이트 (`--file`) | 1 | ~0.1s | ✅ 개발 중 |
| 전체 스캔 | 100 | ~2-5s | CI/CD |
| 전체 스캔 | 500 | ~10-20s | 초기 설정 |

## 관련 기능

- [[AutoIndexing]] - 파일 저장 시 자동 인덱스 업데이트
- [[CoreWorkflow]] - 메인 문서화 파이프라인
- [[ValidationFeatures]] - 연결성 및 SSOT 검증

## 설계 문서

전체 설계 및 구현 세부사항: [DOCUMENT_SYMBOL_DESIGN.md](../DOCUMENT_SYMBOL_DESIGN.md)

---

## Backlinks

_이 섹션은 자동 생성됩니다_
