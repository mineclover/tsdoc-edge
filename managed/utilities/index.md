---
title: Utilities Index
type: index
category: utilities
status: active
canonical: true
---

# [[Utilities Index]]

> 유틸리티 모듈 - 재사용 가능한 핵심 기능

## Overview

TSDoc Edge 시스템의 유틸리티 모듈을 기능별로 정리한 인덱스입니다. 각 유틸리티는 특정 기능(그래프 구축, 검증, 생성 등)을 캡슐화합니다.

**총 18개 유틸리티**

---

## Graph Utilities (그래프 관련)

### [[SymbolGraphBuilder]]
**Path**: `SymbolGraphBuilder.md`
**Priority**: ⭐⭐⭐ Critical

심볼 의존성 그래프를 구축하는 핵심 유틸리티.

**Key Methods**:
- `buildGraph()`: 그래프 생성
- `addSymbol()`: 심볼 추가
- `addRelationship()`: 관계 추가
- `getGraph()`: 그래프 조회

**Used By**: BuildCommand, AnalyzeCommand, All graph-based commands

**Input**: Symbols + Relationships
**Output**: Symbol dependency graph

---

### [[SymbolSearchEngine]]
**Path**: `SymbolSearchEngine.md`
**Priority**: ⭐⭐⭐ Critical

그래프 내 심볼 검색 엔진.

**Key Methods**:
- `search(query)`: 조건 기반 검색
- `findByName(name)`: 이름 검색
- `findByType(type)`: 타입 검색
- `findByImportance(level)`: 중요도 검색

**Query Types**:
- Name pattern matching
- Type filtering
- Importance filtering
- Relationship filtering

**Used By**: Query commands (deps, used-by, who-uses)

---

## Validation Utilities (검증 관련)

### [[ConventionValidator]]
**Path**: `ConventionValidator.md`
**Priority**: ⭐⭐⭐ Critical

프로젝트 컨벤션 검증 유틸리티.

**Validates**:
- TSDoc 주석 필수 태그
- Naming conventions
- File structure
- Public API documentation

**Used By**: ValidateCommand, BuildCommand (validation phase)

**Rules Source**: `.tsdoc.config.json` validation rules

---

### [[ConnectivityValidator]]
**Path**: `ConnectivityValidator.md`
**Priority**: ⭐⭐ High

문서-코드 연결성 검증 유틸리티.

**Validates**:
- Orphaned documents (code 없는 문서)
- Orphaned code (문서 없는 코드)
- Broken [[Symbol]] references
- Missing backlinks

**Used By**: ValidateSymbolRefsCommand, ConnectivityCommand

---

### [[LinkValidator]]
**Path**: `LinkValidator.md`
**Priority**: ⭐⭐ High

문서 내 링크 검증 유틸리티.

**Validates**:
- Internal links (`[[Symbol]]`)
- External links (URLs)
- File path references
- Anchor links (#heading)

**Used By**: CheckLinksCommand, ValidateDocsCommand

---

### [[ModuleSpecValidator]]
**Path**: `ModuleSpecValidator.md`
**Priority**: ⭐⭐ High

모듈 명세서 검증 유틸리티 (7 Perspectives).

**Validates**:
- Purpose 명확성
- Input/Output 정의 완전성
- Context 의존성 일치
- Logic 설명 충분성
- Effect 부수효과 명시
- Scope 인터페이스 정의

**Used By**: ValidateSpecCommand, SpecAnalyzer

---

### [[SpecCompletenessValidator]]
**Path**: `SpecCompletenessValidator.md`
**Priority**: ⭐⭐ High

명세서 완성도 검증 및 점수 계산.

**Calculates**:
- Section completeness (7 perspectives)
- Tag completeness
- Example coverage
- Test coverage correlation

**Scoring**: 0-100% completeness score

**Used By**: SpecCommand, HealthCommand

---

## Specification Utilities (명세 관련)

### [[SpecStatusManager]]
**Path**: `SpecStatusManager.md`
**Priority**: ⭐⭐ High

명세서 상태 관리 유틸리티.

**Status Lifecycle**:
- Draft → Review → Approved → Active → Deprecated

**Key Methods**:
- `transition(spec, newStatus)`: 상태 전환
- `getHistory(spec)`: 상태 히스토리
- `validateTransition()`: 전환 검증

**Used By**: SpecCommand, StatusCommand

---

### [[SpecVersionManager]]
**Path**: `SpecVersionManager.md`
**Priority**: ⭐ Medium

명세서 버전 관리 유틸리티.

**Key Methods**:
- `createVersion()`: 새 버전 생성
- `compareVersions()`: 버전 비교
- `rollback()`: 롤백

**Used By**: SpecCommand, VersionCommand

---

### [[SpecContentSimilarityChecker]]
**Path**: `SpecContentSimilarityChecker.md`
**Priority**: ⭐ Medium

명세서 내용 유사도 검사 (중복 탐지).

**Algorithm**: Text similarity (Levenshtein, cosine similarity)

**Detects**:
- Duplicate specifications
- Similar content blocks
- Copy-paste sections

**Used By**: ValidateSpecCommand, SpecAnalyzer

---

## Generator Utilities (생성 관련)

### [[MermaidGenerator]]
**Path**: `MermaidGenerator.md`
**Priority**: ⭐⭐ High

Mermaid 다이어그램 생성 유틸리티.

**Generates**:
- Dependency graphs
- Call graphs
- Type hierarchies
- Relationship diagrams

**Output Format**: `.mmd` files

**Used By**: VisualizeDepsCommand, GenerateGraphCommand

---

### [[IdGenerator]]
**Path**: `IdGenerator.md`
**Priority**: ⭐⭐ High

고유 ID 생성 유틸리티.

**Generates**:
- Symbol IDs (kebab-case from names)
- Document IDs
- Relationship IDs
- UUID (fallback)

**Algorithm**: Name → kebab-case → uniqueness check

**Used By**: All symbol creation operations

---

## Connection Utilities (연결 관련)

### [[DocCodeLinker]]
**Path**: `DocCodeLinker.md`
**Priority**: ⭐⭐⭐ Critical

문서와 코드를 양방향 연결하는 유틸리티.

**Links**:
- `[[Symbol]]` → Code symbol
- TSDoc `@doc` tag → Documentation file
- Bidirectional traceability

**Strategies**:
- Name-based matching
- ID-based matching
- Fuzzy matching

**Used By**: BuildCommand, LinkCommand, ValidateCommand

---

## Detection Utilities (탐지 관련)

### [[UnusedDocumentDetector]]
**Path**: `UnusedDocumentDetector.md`
**Priority**: ⭐⭐ High

미사용 문서 탐지 유틸리티.

**Detects**:
- Documents with no backlinks
- Documents not referenced from code
- Documents not in any index

**Used By**: CleanupCommand, ValidateDocsCommand

---

### [[UsageTracker]]
**Path**: `UsageTracker.md`
**Priority**: ⭐ Medium

심볼 사용 추적 유틸리티.

**Tracks**:
- Symbol usage frequency
- Call counts
- Import counts
- Reference counts

**Used By**: AnalyzeCommand, ImportanceClassifier

---

## Scanning Utilities (스캔 관련)

### [[FileScanner]]
**Path**: `FileScanner.md`
**Priority**: ⭐⭐⭐ Critical

파일 스캔 및 필터링 유틸리티.

**Features**:
- Recursive directory scanning
- Glob pattern matching
- Exclude pattern filtering
- File type detection

**Used By**: BuildCommand, ParseCommand, All file-based commands

---

## Configuration Utilities (설정 관련)

### [[ConfigLoader]]
**Path**: `ConfigLoader.md`
**Priority**: ⭐⭐⭐ Critical

설정 파일 로드 및 파싱 유틸리티.

**Loads**:
- `.tsdoc.config.json`
- `package.json` (tsdoc section)
- Environment variables
- Default configuration

**Merging Strategy**: Env vars > config file > defaults

**Used By**: All commands (initialization phase)

---

## String Utilities (문자열 관련)

### [[String Utilities]]
**Path**: `StringUtilities.md`
**Priority**: ⭐ Low

문자열 처리 헬퍼 함수 모음.

**Functions**:
- `toKebabCase()`: kebab-case 변환
- `toCamelCase()`: camelCase 변환
- `sanitize()`: 특수문자 제거
- `truncate()`: 문자열 자르기

**Used By**: IdGenerator, Formatters, All text processing

---

## Utility Categories Matrix

| Category | Count | Usage | Priority |
|----------|-------|-------|----------|
| **Graph** | 2 | Core system | Critical |
| **Validation** | 5 | Quality assurance | Critical/High |
| **Specification** | 3 | Spec management | High/Medium |
| **Generator** | 2 | Output generation | High |
| **Connection** | 1 | Doc-Code linking | Critical |
| **Detection** | 2 | Quality checks | High/Medium |
| **Scanning** | 1 | File operations | Critical |
| **Configuration** | 1 | System setup | Critical |
| **String** | 1 | Text processing | Low |

---

## Common Patterns

### Builder Pattern
```typescript
// SymbolGraphBuilder
const graph = new SymbolGraphBuilder()
  .addSymbol(symbol1)
  .addSymbol(symbol2)
  .addRelationship(rel)
  .build();
```

### Validator Pattern
```typescript
// All validators
interface Validator {
  validate(target): ValidationResult;
}
```

### Manager Pattern
```typescript
// SpecStatusManager, SpecVersionManager
interface Manager<T> {
  create(item: T): void;
  update(item: T): void;
  delete(item: T): void;
  get(id: string): T;
}
```

---

## Usage by Feature

### Build System
Uses: FileScanner, SymbolGraphBuilder, DocCodeLinker, ConfigLoader, IdGenerator

### Validation System
Uses: ConventionValidator, ConnectivityValidator, LinkValidator, ModuleSpecValidator, SpecCompletenessValidator

### Query System
Uses: SymbolSearchEngine, SymbolGraphBuilder, UsageTracker

### Specification System
Uses: SpecStatusManager, SpecVersionManager, SpecContentSimilarityChecker, ModuleSpecValidator

### Documentation System
Uses: DocCodeLinker, UnusedDocumentDetector, MermaidGenerator

---

## Critical Utilities

Top 5 most important utilities:

1. **[[SymbolGraphBuilder]]** - Foundation of dependency analysis
2. **[[ConfigLoader]]** - System initialization
3. **[[FileScanner]]** - Source file discovery
4. **[[DocCodeLinker]]** - Traceability core
5. **[[SymbolSearchEngine]]** - Query foundation

---

## Integration Example

### Build Pipeline
```
FileScanner
  ↓ scan files
ASTSymbolExtractor
  ↓ extract symbols
IdGenerator
  ↓ generate IDs
SymbolGraphBuilder
  ↓ build graph
DocCodeLinker
  ↓ link docs
ConventionValidator
  ↓ validate
DatabaseManager
  ↓ store
```

---

## Related Documentation

- **[[Types Index]]** (`/managed/types/index.md`) - Types used by utilities
- **[[Primary Types Index]]** (`/managed/primary-types/index.md`) - Configuration types
- **[[Analyzers & Extractors]]** (`/managed/analyzers/index.md`) - Analysis components
- **[[Features Index]]** (`/managed/features/index.md`) - Features using utilities

---

## Backlinks

### Referenced By

- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:395
- [[Features Index]] → /home/user/tsdoc-edge/managed/features/index.md:250
- [[Primary Types Index]] → /home/user/tsdoc-edge/managed/primary-types/index.md:402
- [[Primary Types Index]] → /home/user/tsdoc-edge/managed/primary-types/index.md:416
- [[Primary Types Index]] → /home/user/tsdoc-edge/managed/primary-types/index.md:417
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:151
- [[Types Index]] → /home/user/tsdoc-edge/managed/types/index.md:347
- [[Types Index]] → /home/user/tsdoc-edge/managed/types/index.md:361
- [[Types Index]] → /home/user/tsdoc-edge/managed/types/index.md:362
- [[ConfigLoader]] → /home/user/tsdoc-edge/managed/utilities/ConfigLoader.md:109
- [[DocCodeLinker]] → /home/user/tsdoc-edge/managed/utilities/DocCodeLinker.md:76
- [[FileScanner]] → /home/user/tsdoc-edge/managed/utilities/FileScanner.md:85
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:261
- [[SymbolSearchEngine]] → /home/user/tsdoc-edge/managed/utilities/SymbolSearchEngine.md:136

