---
tsdoc: managed
version: 1.0.0
status: active
primary: ValidationFeatures
category: feature
tags:
  - validation
  - quality
lastUpdated: 2025-01-15
---

# [[ValidationFeatures]]
> 컨벤션, 연결성, 엄격 모드 검증

## 개요
프로젝트의 문서화 규칙(컨벤션)을 정의하고, 코드가 규칙을 준수하는지 자동으로 검증합니다. 심볼 간 연결성, 순환 의존성, 고아 심볼을 탐지하고, 엄격 모드에서 Public API 문서화를 강제합니다.

**해결하는 문제:**
- 일관되지 않은 문서화 스타일
- 필수 정보(계약, 책임) 누락
- 깨진 링크 및 고아 심볼
- 순환 의존성으로 인한 복잡도
- Public API의 문서 부족

## 핵심 개념
### 1. 컨벤션 (Convention)

프로젝트별 문서화 규칙:
**필수 태그:**
- `@public` API는 `@param`, `@returns` 필수
- `@contract` 있으면 `@precondition`, `@postcondition` 필수
- `@responsibility` 클래스/함수의 책임 명시
**권장 태그:**
- `@example` - 사용 예시
- `@testScenario` - 테스트 시나리오

### 2. 연결성 (Connectivity)
**고아 심볼 (Orphans):**
- 어디에도 사용되지 않는 심볼
- import하는 곳도, export하는 곳도 없음

**깨진 링크 (Broken Links):**
- Import 경로가 존재하지 않음
- 참조하는 심볼이 정의되지 않음
**순환 의존성 (Circular Dependency):**
- A → B → C → A 형태의 순환
- 테스트 및 빌드 복잡도 증가

### 3. 엄격 모드 (Strict Mode)
**Strict Level 1:**
- Public API 필수 문서화
**Strict Level 2:**
- Public API + Important 심볼 문서화
**Strict Level 3:**
- 모든 심볼 문서화 강제
## 핵심 산출물

### Convention Validation
- ConventionValidator[^sym-005] - 프로젝트 컨벤션 검증
  - 필수 태그 확인
  - 포맷 규칙 검증
  - `@param` 타입 일치 확인
  - `@returns` 존재 여부

### Connectivity Validation
- ConnectivityValidator[^ConnectivityValidator] - 연결성 검증
  - 고아 심볼 탐지
  - 깨진 링크 탐지
  - 순환 의존성 탐지
  - 연결성 점수 계산

### Strict Mode Validation
- StrictModeValidator[^sym-003] - 엄격 모드 규칙
  - Public API 필수 문서화
  - Critical 심볼 계약 필수
  - Importance 기반 필터링
## 사용 시나리오

### 시나리오 1: 전체 검증 (CI/CD)
```bash
tsdoc-edge validate
```

**출력 예시:**
```
🔍 Validation Report
Convention Violations (5):
  ❌ src/api/UserService.ts:15
     Missing @param documentation for 'userId'

  ❌ src/api/AuthController.ts:25
     @contract specified but missing @precondition

Connectivity Issues (3):
  ⚠️  Orphaned Symbols (2):
     - src/utils/oldHelper.ts:10 (helperFunction)
     - src/legacy/deprecated.ts:5 (OldClass)

  ❌ Circular Dependencies (1):
     - UserService → AuthService → UserService

Strict Mode Violations (2):
  ❌ Public API without documentation:
     - PaymentProcessor.charge (CRITICAL)
Total: 10 issues (7 errors, 3 warnings)
```
### 시나리오 2: 고아 심볼 찾기

```bash
tsdoc-edge orphans
```
**출력 예시:**
```
🔍 Orphaned Symbols (5)

src/utils/oldHelper.ts:
  - helperFunction (line 10)
  - processData (line 25)
src/legacy/deprecated.ts:
  - OldClass (line 5)
  - legacyMethod (line 30)

src/temp/experiment.ts:
  - experimentalFeature (line 8)

💡 Recommendation:
  - Remove unused code
  - Or add exports if needed
```

### 시나리오 3: 순환 의존성 탐지
```bash
tsdoc-edge validate --check-cycles
```

**출력 예시:**
```
🔄 Circular Dependencies (2)
Cycle 1 (length: 3):
  UserService
    → AuthService
    → SessionManager
    → UserService

Cycle 2 (length: 2):
  OrderService
    → PaymentService
    → OrderService

💡 Recommendation:
  - Extract shared interfaces
  - Use dependency injection
  - Introduce facade pattern
```
### 시나리오 4: Strict Mode 적용 (단계적)

**Step 1: Strict Level 1 (Public API만)**
```bash
# .tsdoc.config.json
{
  "strict": {
    "enabled": true,
    "level": 1,
    "requireDocumentation": ["public"]
  }
}
```
```bash
tsdoc-edge validate
# → Public API 6개만 문서화 요구
```
**Step 2: Strict Level 2 (+ Important)**
```json
{
  "strict": {
    "level": 2,
    "requireDocumentation": ["public", "important"]
  }
}
```

```bash
tsdoc-edge validate
# → Public API + Important 25개 문서화 요구
```

**Step 3: Strict Level 3 (전체)**
```json
{
  "strict": {
    "level": 3,
    "requireDocumentation": ["all"]
  }
}
```
### 시나리오 5: PR 검증 (GitHub Actions)

```yaml
name: Documentation Validation

on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install
        run: npm ci
      - name: Validate Documentation
        run: |
          npx tsdoc-edge validate
          if [ $? -ne 0 ]; then
            echo "❌ Validation failed!"
            exit 1
          fi

      - name: Check for orphans
        run: |
          npx tsdoc-edge orphans --fail-on-orphans
```

## CLI 명령어

### Validation Commands

**[[ValidateCommand]]** - `tsdoc-edge validate [path]`
- 전체 검증 (컨벤션, 연결성, 엄격 모드)
- **Implementation Chain**:
  - Command: `src/commands/ValidateCommand.ts`
  - Validator: ConnectivityValidator (`src/validator/ConnectivityValidator.ts`)
  - Uses: [[SymbolGraphBuilder]], SymbolSearchEngine
  - Storage: DatabaseManager (`src/storage/DatabaseManager.ts`)

**[[ValidateDocsCommand]]** - `tsdoc-edge validate-docs <path>`
- 문서 검증 (링크, 구조, 메타데이터)
- **Implementation Chain**:
  - Command: `src/commands/ValidateDocsCommand.ts`
  - Parser: [[DocumentSymbolParser]] (`src/doc-symbol/DocumentSymbolParser.ts`)
  - Registry: [[DocumentSymbolRegistry]] (`src/doc-symbol/DocumentSymbolRegistry.ts`)
  - Validation: Registry.validate() for SSOT compliance

**[[ValidateSymbolRefsCommand]]** - `tsdoc-edge validate-symbol-refs <path>`
- `[[Symbol]]` 참조 검증 (정의 존재, 역방향 링크)
- **Implementation Chain**:
  - Command: `src/commands/ValidateSymbolRefsCommand.ts`
  - Extractor: [[MermaidSymbolExtractor]] (`src/doc-symbol/MermaidSymbolExtractor.ts`)
  - Uses: Levenshtein distance for similarity checking
  - Validates: Duplicate definitions, broken references, ambiguous references

**[[CheckLinksCommand]]** - `tsdoc-edge check-links`
- 깨진 링크 탐지 (import, 참조)
- **Implementation Chain**:
  - Command: `src/commands/CheckLinksCommand.ts`
  - Analyzer: [[MissingLinkDetector]] (`src/analyzer/MissingLinkDetector.ts`)
  - Uses: ConfigLoader (`src/utils/ConfigLoader.ts`)
  - Validates: Dependencies, symbol references, file paths

**CheckDuplicatesCommand (Planned)** - `tsdoc-edge check-duplicates`
- 중복 심볼 탐지
- **Implementation Chain**:
  - Command: `src/commands/Phase6Commands.ts` (planned)
  - Checker: SpecContentSimilarityChecker (`src/spec/SpecContentSimilarityChecker.ts`)
  - Analysis: Content similarity, section overlap detection
  - Suggestions: Merge, cross-reference, or keep separate

**[[OrphansCommand]]** - `tsdoc-edge orphans [--fail-on-orphans]`
- 고아 심볼 탐지
- **Implementation Chain**:
  - Command: `src/commands/Phase5Commands.ts`
  - Registry: SymbolRegistryManager (`src/registry/SymbolRegistryManager.ts`)
  - Storage: `.tsdoc/registry.jsonl`
  - Detects: Symbols with no incoming or outgoing references

**[[DetectCircularTypesCommand]]** - `tsdoc-edge detect-cycles`
- 순환 의존성 탐지
- **Implementation Chain**:
  - Command: `src/commands/TypeChainCommand.ts`
  - Analyzer: InterfaceAnalyzer, InterfaceDependencyMapper
  - Tracer: TypeChainTracer (`src/analyzer/TypeChainTracer.ts`)
  - Detection: Circular dependency graph traversal

**[[ValidateSpecCommand]]** - `tsdoc-edge validate-spec <spec-id>`
- 명세 검증 (완성도, 필수 섹션)
- **Implementation Chain**:
  - Command: `src/commands/Phase4Commands.ts`
  - Validator: [[SpecCompletenessValidator]] (`src/spec/SpecCompletenessValidator.ts`)
  - Checks: Design score, implementation score, required sections
  - Metrics: Section completion, TODO markers, quality thresholds
## 검증 규칙 설정

### .tsdoc.config.json 예시
```json
{
  "validation": {
    "convention": {
      "requireParamDocs": true,
      "requireReturnDocs": true,
      "requireResponsibility": true,
      "requireContract": false
    },
    "connectivity": {
      "checkOrphans": true,
      "checkBrokenLinks": true,
      "checkCycles": true,
      "maxCycleLength": 5
    },
    "strict": {
      "enabled": true,
      "level": 1,
      "requireDocumentation": ["public"],
      "requireContract": ["critical"],
      "requireTests": ["public"]
    }
  }
}
```

## 검증 결과 타입
### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stats: {
    totalChecked: number;
    totalErrors: number;
    totalWarnings: number;
  };
}
interface ValidationError {
  type: 'missing_tag' | 'broken_link' | 'circular_dependency' | 'orphan';
  symbolName: string;
  filePath: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
}
```

## 에러 수준
### Error (검증 실패)
- `missing_tag`: 필수 태그 누락
- `broken_link`: 존재하지 않는 import
- `circular_dependency`: 순환 의존성
- `strict_violation`: Strict 모드 위반

### Warning (경고)
- `orphaned_symbol`: 고아 심볼
- `missing_optional_tag`: 권장 태그 누락
- `low_quality`: 문서 품질 낮음

## CI/CD 통합 패턴
### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit
# 스테이징된 TS 파일만 검증
STAGED_TS=$(git diff --cached --name-only --diff-filter=ACM | grep "\.ts$")
if [ -n "$STAGED_TS" ]; then
  echo "🔍 Validating TypeScript files..."
  for file in $STAGED_TS; do
    npx tsdoc-edge validate "$file" --quiet
    if [ $? -ne 0 ]; then
      echo "❌ Validation failed for: $file"
      exit 1
    fi
  done

  echo "✅ All files validated"
fi
```
### Pre-push Hook (전체 검증)

```bash
#!/bin/bash
# .git/hooks/pre-push
echo "🔍 Running full validation..."

npx tsdoc-edge validate
if [ $? -ne 0 ]; then
  echo "❌ Validation failed! Fix issues before pushing."
  exit 1
fi
echo "✅ Validation passed"
```
## 연결성 점수 계산

```
connectivity_score =
  (1.0 - orphan_rate) × 0.4 +
  (1.0 - broken_link_rate) × 0.3 +
  (1.0 - cycle_rate) × 0.3
orphan_rate = orphans / total_symbols
broken_link_rate = broken_links / total_imports
cycle_rate = symbols_in_cycles / total_symbols
```
**목표:**
- Connectivity Score ≥ 90% (우수)
- Connectivity Score ≥ 70% (양호)
- Connectivity Score < 70% (개선 필요)
## 관련 기능

- [[AnalysisFeatures]] - 코드 품질 및 통계 분석
- [[SymbolGraphFeatures]] - 의존성 그래프 구축
- [[CoreWorkflow]] - 메인 문서화 파이프라인
- DocumentSymbolSystem - 문서 심볼 SSOT 검증

## 가이드

## Symbol References

[^ConnectivityValidator]: [ConnectivityValidator](../../src/validator/ConnectivityValidator.ts#ConnectivityValidator)
[^sym-003]: [StrictModeValidator](../../src/validator/StrictModeValidator.ts#StrictModeValidator)
[^sym-005]: [ConventionValidator](../../src/validator/ConventionValidator.ts#ConventionValidator)


---

## Related

- [[CoreWorkflow]] - Build pipeline integration
- [[SymbolGraphFeatures]] - Connectivity analysis
- [[AnalysisFeatures]] - Code health metrics

---

## Backlinks

### Referenced By

- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:93
- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:237
- [[DocumentationAnalyzer]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/DocumentationAnalyzer.md:125
- StrictModeValidator → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/StrictModeValidator.md:238
- [[Analyzers & Extractors]] → /Users/junwoobang/workflow/tsdoc-edge/managed/analyzers/index.md:261
- [[ValidateCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/ValidateCommand.md:21
- [[ValidateDocsCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/ValidateDocsCommand.md:21
- [[AnalysisFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/analysis-features.md:258
- [[AutoIndexing]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/auto-indexing.md:164
- [[CoreFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/core-features-catalog.md:105
- [[CoreFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/core-features-catalog.md:295
- [[CoreWorkflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/core-workflow.md:141
- DocumentSymbolSystem → /Users/junwoobang/workflow/tsdoc-edge/managed/features/document-symbol-system.md:104
- [[Features Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/index.md:201
- [[SymbolGraphFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/symbol-graph.md:247
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:263
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:352
- [[Relationship Analysis Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/relationship-analysis-guide.md:332
- Quick Start Guide → /Users/junwoobang/workflow/tsdoc-edge/managed/quick-start.md:135
- [[Relationship Types]] → /Users/junwoobang/workflow/tsdoc-edge/managed/relationships/index.md:193
- [[DocumentationFixer]] → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/DocumentationFixer.md:22

### Implemented By

- ConnectivityValidator (Connectivity) → /Users/junwoobang/workflow/tsdoc-edge/src/validator/ConnectivityValidator.ts:43
- StrictModeValidator (StrictMode) → /Users/junwoobang/workflow/tsdoc-edge/src/validator/StrictModeValidator.ts:32

