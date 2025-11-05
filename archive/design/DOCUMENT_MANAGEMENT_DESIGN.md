# Document Management System Design

> TSDoc Edge가 관리하는 문서를 명확히 식별하고 오염을 방지하는 시스템

## 문제 정의

### 현재 문제점

1. **문서 혼재**
   - 실제 관리 문서 (features/)
   - 가이드 문서 (docs/)
   - 예시/템플릿 문서 (FEATURE_DOCS_STRATEGY.md 등)
   - 설계 문서 등이 모두 섞여 있음

2. **Backlinks 오염**
   - 예시 코드 블록 안의 `[[Symbol]]`도 실제 참조로 인식
   - 템플릿 심볼이 실제 심볼의 Backlinks에 추가됨

3. **관리 범위 불명확**
   - 어떤 문서가 TSDoc Edge 관리 대상인지 식별 불가
   - 수동 문서와 자동 생성 문서 구분 안 됨

## 해결 방안

### 1. Config 기반 문서 영역 지정

#### 설정 추가 (.tsdoc.config.json)

```json
{
  "documentManagement": {
    "enabled": true,
    "managedDirs": [
      "docs/managed"
    ],
    "excludeDirs": [
      "docs/examples",
      "docs/templates"
    ],
    "requireFrontmatter": true,
    "strictMode": false
  }
}
```

**옵션 설명:**
- `enabled`: 문서 관리 시스템 활성화 여부
- `managedDirs`: TSDoc Edge가 관리하는 문서 디렉토리 (필수)
- `excludeDirs`: 명시적 제외 디렉토리 (예시, 템플릿 등)
- `requireFrontmatter`: frontmatter 없는 파일 무시 여부
- `strictMode`: strict 모드 (frontmatter 없으면 에러)

### 2. YAML Frontmatter 기반 식별

#### Frontmatter 구조

```yaml
---
tsdoc: managed
version: 1.0.0
status: active
primary: DocumentSymbolSystem
category: feature
tags:
  - core
  - documentation
lastUpdated: 2025-01-15
---

# [[DocumentSymbolSystem]]

문서 내용...
```

**필수 필드:**
- `tsdoc`: `managed` (TSDoc Edge 관리 대상 표시)

**선택 필드:**
- `version`: 문서 버전
- `status`: `active`, `draft`, `deprecated`, `archived`
- `primary`: Primary 심볼 명시 (검증용)
- `category`: `feature`, `guide`, `design`, `reference`
- `tags`: 분류 태그
- `lastUpdated`: 마지막 업데이트 시간 (자동 갱신)

#### 예시/템플릿 문서 표시

```yaml
---
tsdoc: example
purpose: template
---

# [[FeatureName]]

예시 내용...
```

### 3. Parser 개선

#### 코드 블록 무시

```typescript
class DocumentSymbolParser {
  parse(filePath: string): ParsedDocSymbols {
    const content = fs.readFileSync(filePath, 'utf-8');

    // 1. Frontmatter 파싱
    const { metadata, body } = this.parseFrontmatter(content);

    // 2. 관리 대상 체크
    if (!this.isManagedDocument(filePath, metadata)) {
      return null; // 또는 빈 결과
    }

    // 3. 코드 블록 제거
    const contentWithoutCodeBlocks = this.removeCodeBlocks(body);

    // 4. [[]] 파싱 (코드 블록 제외된 내용에서)
    return this.parseSymbols(contentWithoutCodeBlocks, filePath);
  }

  private removeCodeBlocks(content: string): string {
    // ``` ... ``` 블록 제거
    return content.replace(/```[\s\S]*?```/g, '');
  }

  private isManagedDocument(filePath: string, metadata: any): boolean {
    const config = ConfigManager.getInstance().getConfig();
    const docMgmt = config.documentManagement;

    if (!docMgmt?.enabled) return true; // 비활성화 시 모두 파싱

    // 1. managedDirs 체크
    const isInManagedDir = docMgmt.managedDirs.some(dir =>
      filePath.includes(dir)
    );

    // 2. excludeDirs 체크
    const isExcluded = docMgmt.excludeDirs?.some(dir =>
      filePath.includes(dir)
    );

    if (isExcluded) return false;

    // 3. Frontmatter 체크
    if (docMgmt.requireFrontmatter) {
      return metadata?.tsdoc === 'managed';
    }

    return isInManagedDir;
  }
}
```

## 폴더 구조 제안

### Before

```
docs/
├── features/                    # 실제 관리 문서
│   ├── CORE_WORKFLOW.md
│   └── DOCUMENT_SYMBOL_SYSTEM.md
├── FEATURE_DOCS_STRATEGY.md     # 가이드 (예시 포함)
├── CLI_WORKFLOWS_AND_SCENARIOS.md
└── ...
```

### After

```
docs/
├── managed/                     # TSDoc Edge 관리 문서 (SSOT)
│   ├── features/                # 기능 정의 (Primary symbols)
│   │   ├── core-workflow.md
│   │   ├── document-symbol-system.md
│   │   ├── analysis-features.md
│   │   └── validation-features.md
│   ├── guides/                  # 사용 가이드 (보조 문서)
│   │   ├── dependency-analysis.md
│   │   └── auto-indexing.md
│   └── design/                  # 설계 문서
│       └── symbol-hierarchy.md
│
├── examples/                    # 예시 문서 (관리 제외)
│   ├── feature-template.md
│   └── guide-template.md
│
├── reference/                   # 레퍼런스 (수동 관리)
│   ├── tsdoc-conventions/
│   └── tsdoc-spec-support.md
│
└── generated/                   # 자동 생성 (CLI 출력)
    └── ...
```

## 구현 계획

### Phase 1: Config 확장 (30분)

**작업:**
1. `DocumentManagementConfig` 인터페이스 추가
2. `TsdocEdgeConfig`에 통합
3. `DEFAULT_CONFIG`에 기본값 설정
4. ConfigManager 업데이트

**파일:**
- `src/types/config/config.ts`
- `src/config/ConfigManager.ts`

### Phase 2: Frontmatter Parser (1시간)

**작업:**
1. `FrontmatterParser` 클래스 생성
2. YAML 파싱 (gray-matter 라이브러리 사용)
3. 메타데이터 검증
4. 테스트 작성

**파일:**
- `src/parser/FrontmatterParser.ts`
- `src/__tests__/FrontmatterParser.test.ts`

### Phase 3: DocumentSymbolParser 개선 (1시간)

**작업:**
1. Frontmatter 파싱 통합
2. `isManagedDocument()` 메서드 추가
3. `removeCodeBlocks()` 메서드 추가
4. 기존 테스트 업데이트
5. 새로운 테스트 추가

**파일:**
- `src/doc-symbol/DocumentSymbolParser.ts`
- `src/__tests__/DocumentSymbolParser.test.ts`

### Phase 4: CLI 명령어 업데이트 (30분)

**작업:**
1. `index-docs` 명령어에 관리 범위 체크 추가
2. `validate-docs` 명령어에 frontmatter 검증 추가
3. 경고 메시지 개선

**파일:**
- `src/cli/commands/doc-symbol-commands.ts`

### Phase 5: 문서 재구성 (1시간)

**작업:**
1. `docs/managed/` 디렉토리 생성
2. 기존 features/ 문서 이동 및 frontmatter 추가
3. 예시 문서를 `docs/examples/`로 이동
4. `.tsdoc.config.json` 업데이트

### Phase 6: 테스트 및 검증 (30분)

**작업:**
1. 전체 테스트 실행
2. `tsdoc-edge index-docs` 실행 및 검증
3. Backlinks 오염 제거 확인
4. 문서 업데이트

## 사용 예시

### 1. 신규 관리 문서 생성

```bash
# docs/managed/features/new-feature.md
cat > docs/managed/features/new-feature.md << 'EOF'
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

새로운 기능 설명...
EOF

# 인덱싱
tsdoc-edge index-docs
```

### 2. 예시 문서 생성 (관리 제외)

```bash
# docs/examples/auth-example.md
cat > docs/examples/auth-example.md << 'EOF'
---
tsdoc: example
purpose: demonstration
---

# Authentication Example

예시 코드:
```typescript
/**
 * @doc [[UserAuthentication]]
 */
class AuthService {}
```
EOF

# 인덱싱 시 자동 제외됨
tsdoc-edge index-docs
```

### 3. Config 설정

```json
{
  "documentManagement": {
    "enabled": true,
    "managedDirs": [
      "docs/managed"
    ],
    "excludeDirs": [
      "docs/examples",
      "docs/templates",
      "docs/reference"
    ],
    "requireFrontmatter": true,
    "strictMode": false
  }
}
```

### 4. 검증

```bash
# 관리 문서 검증
tsdoc-edge validate-docs

# 출력:
# ✅ Managed Documents: 12
# ✅ Primary Definitions: 6
# ⚠️  Missing Frontmatter: 0
# ❌ Duplicate Primaries: 0
```

## 마이그레이션 가이드

### 기존 프로젝트 전환

```bash
# 1. 관리 디렉토리 생성
mkdir -p docs/managed/features
mkdir -p docs/managed/guides
mkdir -p docs/examples

# 2. 기존 문서 이동
mv docs/features/*.md docs/managed/features/

# 3. Frontmatter 일괄 추가 (스크립트)
npm run add-frontmatter docs/managed/**/*.md

# 4. 예시 문서 분리
mv docs/FEATURE_DOCS_STRATEGY.md docs/examples/

# 5. Config 업데이트
# .tsdoc.config.json에 documentManagement 섹션 추가

# 6. 재인덱싱
tsdoc-edge index-docs docs/managed

# 7. 검증
tsdoc-edge validate-docs
```

## 기대 효과

### 1. 명확한 관리 범위
- ✅ 관리 문서와 수동 문서 명확히 구분
- ✅ 예시/템플릿 문서 오염 방지
- ✅ 자동 생성 문서 분리

### 2. Backlinks 정확성
- ✅ 코드 블록 내 심볼 제외
- ✅ 실제 참조만 Backlinks에 반영
- ✅ 예시 문서 참조 제외

### 3. 확장성
- ✅ Frontmatter로 메타데이터 관리
- ✅ 버전, 상태, 카테고리 추적
- ✅ 자동화 워크플로우 구축 가능

### 4. 협업 개선
- ✅ 문서 상태 명확 (active, draft, deprecated)
- ✅ 관리 책임 명확
- ✅ 문서 품질 향상

## 관련 문서

- [[DocumentSymbolSystem]] - 문서 심볼 시스템
- [[CoreWorkflow]] - 핵심 워크플로우
- [[ValidationFeatures]] - 검증 기능

## 구현 체크리스트

- [ ] Phase 1: Config 확장
- [ ] Phase 2: Frontmatter Parser
- [ ] Phase 3: DocumentSymbolParser 개선
- [ ] Phase 4: CLI 명령어 업데이트
- [ ] Phase 5: 문서 재구성
- [ ] Phase 6: 테스트 및 검증
- [ ] 마이그레이션 가이드 작성
- [ ] README 업데이트
