# [[CoreWorkflow]]

> 소스 파일 처리부터 문서 생성까지의 핵심 파이프라인

## 개요

TSDoc Edge의 메인 워크플로우는 TypeScript 소스 코드를 스캔하여 TSDoc 주석을 파싱하고, 컨벤션 규칙을 검증한 후 마크다운 문서를 생성하는 파이프라인입니다.

**해결하는 문제:**
- TypeScript 프로젝트의 자동 문서화
- TSDoc 표준 기반 일관된 문서 생성
- 커스텀 태그 지원으로 확장 가능한 문서화

## 워크플로우 단계

```
1. 파일 스캔 → TypeScript 파일 수집
2. TSDoc 파싱 → 주석 추출 및 구조화
3. 컨벤션 검증 → 프로젝트 규칙 적용
4. 문서 생성 → 마크다운 출력
```

## 핵심 산출물

### 1. 진입점
- [TSDocEdge](../../src/index.ts#TSDocEdge) - 메인 클래스, 전체 파이프라인 통합

**주요 메서드:**
- `processFile(filePath, sourceCode)` - 파일 하나 처리
- `getParser()`, `getValidator()`, `getGenerator()` - 내부 컴포넌트 접근

### 2. 파일 스캔
- [FileScanner](../../src/scanner/FileScanner.ts#FileScanner) - 프로젝트 디렉토리 스캔

**기능:**
- Glob 패턴 기반 파일 탐색
- `node_modules`, `dist` 등 제외 패턴 지원
- 재귀적 디렉토리 스캔

### 3. TSDoc 파싱
- [TSDocParser](../../src/parser/TSDocParser.ts#TSDocParser) - TSDoc 주석 파싱

**기능:**
- TSDoc 표준 태그 지원 (35개)
- 커스텀 태그 지원 (`@responsibility`, `@contract`, `@testScenario` 등)
- TypeScript Compiler API 기반 정확한 파싱

### 4. 컨벤션 검증
- [ConventionValidator](../../src/validator/ConventionValidator.ts#ConventionValidator) - 프로젝트 규칙 검증

**검증 항목:**
- 필수 태그 확인
- 포맷 규칙 검증
- Public API 문서화 강제

### 5. 문서 생성
- [MarkdownGenerator](../../src/generator/MarkdownGenerator.ts#MarkdownGenerator) - 기본 마크다운 생성
- [EnhancedMarkdownGenerator](../../src/generator/EnhancedMarkdownGenerator.ts#EnhancedMarkdownGenerator) - 확장 메타데이터 포함

**출력 형식:**
- 구조화된 마크다운
- 계약, 책임, 테스트 시나리오 포함
- 설계 결정 및 미래 계획

## 사용 예시

### 프로그래밍 방식

```typescript
import { TSDocEdge } from 'tsdoc-edge';

const edge = new TSDocEdge();
const markdown = edge.processFile('src/api/UserService.ts', sourceCode);

console.log(markdown);
```

### CLI 방식

```bash
# 전체 프로젝트 문서화
tsdoc-edge analyze src

# 특정 파일 검증
tsdoc-edge validate src/api/UserService.ts
```

## 관련 기능

- [[AnalysisFeatures]] - 코드 건강도 및 문서 품질 분석
- [[ValidationFeatures]] - 엄격 모드 및 연결성 검증
- [[SymbolGraphFeatures]] - 심볼 의존성 그래프 구축
- [[DocumentSymbolSystem]] - 문서 심볼 [[]] 시스템

## CLI 명령어

```bash
# 초기 설정
tsdoc-edge init

# 문서 생성 및 분석
tsdoc-edge analyze src
tsdoc-edge health src
tsdoc-edge stats src

# 검증
tsdoc-edge validate
tsdoc-edge undocumented
```

---

## Backlinks

### Referenced By

- [[CoreFeatures]] → /Users/junwoobang/project/tsdoc-edge/docs/CORE_FEATURES_V2.md:16
- [[CoreFeatures]] → /Users/junwoobang/project/tsdoc-edge/docs/CORE_FEATURES_V2.md:413
- [[DocumentSymbolSystem]] → /Users/junwoobang/project/tsdoc-edge/docs/DOCUMENTATION_REVIEW_SUMMARY.md:42
- [[DocumentSymbolSystem]] → /Users/junwoobang/project/tsdoc-edge/docs/DOCUMENTATION_REVIEW_SUMMARY.md:92
- [[DocumentSymbolSystem]] → /Users/junwoobang/project/tsdoc-edge/docs/DOCUMENTATION_REVIEW_SUMMARY.md:135
- [[DocumentSymbolSystem]] → /Users/junwoobang/project/tsdoc-edge/docs/DOCUMENTATION_REVIEW_SUMMARY.md:149
- [[UserAuthentication]] → /Users/junwoobang/project/tsdoc-edge/docs/FEATURE_DOCS_STRATEGY.md:138
- [[UserAuthentication]] → /Users/junwoobang/project/tsdoc-edge/docs/FEATURE_DOCS_STRATEGY.md:178
- [[UserAuthentication]] → /Users/junwoobang/project/tsdoc-edge/docs/FEATURE_DOCS_STRATEGY.md:229
- [[AnalysisFeatures]] → /Users/junwoobang/project/tsdoc-edge/docs/features/ANALYSIS_FEATURES.md:391
- [[AutoIndexing]] → /Users/junwoobang/project/tsdoc-edge/docs/features/AUTO_INDEXING.md:308
- [[NewFeature]] → /Users/junwoobang/project/tsdoc-edge/docs/features/DOCUMENT_SYMBOL_SYSTEM.md:170
- [[NewFeature]] → /Users/junwoobang/project/tsdoc-edge/docs/features/DOCUMENT_SYMBOL_SYSTEM.md:283
- [[SymbolGraphFeatures]] → /Users/junwoobang/project/tsdoc-edge/docs/features/SYMBOL_GRAPH.md:281
- [[ValidationFeatures]] → /Users/junwoobang/project/tsdoc-edge/docs/features/VALIDATION_FEATURES.md:394

### Implemented By

- TSDocEdge → /Users/junwoobang/project/tsdoc-edge/src/index.ts:94

