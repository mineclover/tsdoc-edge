# TSDoc Fold/Unfold System Design

## 개요

TSDoc 주석이 길어질 경우 코드 가독성이 떨어지는 문제를 해결하기 위해, 주석을 프로그래밍적으로 접고 펼칠 수 있는 시스템을 제공합니다.

## 핵심 개념

### 1. 양방향 변환
```
TypeScript (TSDoc) ←→ Markdown (Storage)
```

### 2. 상태 관리
- **Expanded** (펼침): 전체 주석 표시
- **Collapsed** (접힘): 최소한의 주석만 표시

### 3. 마크다운 기반 저장소
- 각 파일의 주석 상태를 `.tsdoc-comments/` 디렉토리에 마크다운으로 저장
- Git으로 버전 관리 가능

## 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                   사용자 요청                          │
│  "collapse src/index.ts:48" (특정 주석 접기)           │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│              CommentStateManager                     │
│  - 상태 파일 로드/저장                                  │
│  - 접기/펼치기 상태 관리                                │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│              TSDocExporter                          │
│  TypeScript 파일에서 TSDoc 주석 추출                   │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│           Markdown Storage                          │
│  .tsdoc-comments/src/index.ts.md                   │
│  - 주석 내용                                          │
│  - 상태 (expanded/collapsed)                        │
│  - 위치 (line, column)                              │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│              TSDocImporter                          │
│  마크다운 상태에 따라 TypeScript 파일 업데이트           │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│            Updated TypeScript File                  │
│  접힌 주석 또는 펼쳐진 주석 적용                         │
└─────────────────────────────────────────────────────┘
```

## 마크다운 포맷

### 파일 구조
```
.tsdoc-comments/
  └── src/
      ├── index.ts.md
      ├── parser/
      │   └── TSDocParser.ts.md
      └── validator/
          └── ConventionValidator.ts.md
```

### 마크다운 포맷 예시

```markdown
# src/index.ts

Last Updated: 2025-10-29T20:30:00Z

## Comment 1: TSDocEdge Class

**Location**: Line 48, Column 0
**Symbol**: TSDocEdge
**Status**: `expanded`

### Full Comment

\`\`\`typescript
/**
 * Main entry point for TSDoc Edge
 * @public
 */
\`\`\`

### Collapsed Form

\`\`\`typescript
/** Main entry point for TSDoc Edge */
\`\`\`

---

## Comment 2: constructor

**Location**: Line 58, Column 2
**Symbol**: constructor
**Status**: `collapsed`

### Full Comment

\`\`\`typescript
/**
 * Creates a new TSDocEdge instance
 *
 * @public
 */
\`\`\`

### Collapsed Form

\`\`\`typescript
/** Creates a new TSDocEdge instance */
\`\`\`

---

## Comment 3: processFile

**Location**: Line 72, Column 2
**Symbol**: processFile
**Status**: `expanded`

### Full Comment

\`\`\`typescript
/**
 * Process a source file: parse, validate, and generate documentation
 *
 * @param filePath - Path to the source file
 * @param sourceCode - Source code content
 * @returns Markdown documentation string
 * @public
 */
\`\`\`

### Collapsed Form

\`\`\`typescript
/** Process a source file: parse, validate, and generate documentation */
\`\`\`
```

## 접힌 주석 규칙

### 1. Summary만 남김
```typescript
// Expanded
/**
 * Parse a TypeScript source file and extract all TSDoc comments
 *
 * @param filePath - Path to the source file
 * @param sourceCode - Source code content
 * @returns Parse result containing all doc comments
 * @public
 */

// Collapsed
/** Parse a TypeScript source file and extract all TSDoc comments */
```

### 2. 최소한의 정보 유지
- Summary 첫 문장만 유지
- 모든 태그 제거
- 한 줄 형식으로 변환

### 3. 특수 마커
```typescript
/** @collapsed - Full doc in .tsdoc-comments/src/index.ts.md:48 */
```

## CLI 명령어

### 1. Export (추출)
```bash
# 전체 프로젝트 주석을 마크다운으로 추출
tsdoc-edge export

# 특정 파일만 추출
tsdoc-edge export src/index.ts
```

### 2. Import (적용)
```bash
# 마크다운 상태를 코드에 적용
tsdoc-edge import

# 특정 파일만 적용
tsdoc-edge import src/index.ts
```

### 3. Collapse (접기)
```bash
# 특정 주석 접기
tsdoc-edge collapse src/index.ts:48

# 파일 전체 접기
tsdoc-edge collapse src/index.ts

# 패턴으로 접기 (모든 private 메서드)
tsdoc-edge collapse --pattern "private"
```

### 4. Expand (펼치기)
```bash
# 특정 주석 펼치기
tsdoc-edge expand src/index.ts:48

# 파일 전체 펼치기
tsdoc-edge expand src/index.ts

# 모든 파일 펼치기
tsdoc-edge expand --all
```

### 5. Status (상태 확인)
```bash
# 전체 상태 확인
tsdoc-edge status

# 특정 파일 상태 확인
tsdoc-edge status src/index.ts
```

## 사용 시나리오

### 시나리오 1: 개발 중 주석 접기

```bash
# 1. 긴 주석이 방해되는 파일 확인
tsdoc-edge status src/validator/StrictModeValidator.ts

# 2. private 메서드 주석 모두 접기
tsdoc-edge collapse src/validator/StrictModeValidator.ts --pattern "private"

# 3. 코드 작업

# 4. 작업 완료 후 다시 펼치기
tsdoc-edge expand src/validator/StrictModeValidator.ts
```

### 시나리오 2: 코드 리뷰

```bash
# 1. 리뷰할 파일의 주석 접기 (핵심 로직에 집중)
tsdoc-edge collapse src/graph/SymbolGraphBuilder.ts

# 2. 특정 메서드만 펼쳐서 확인
tsdoc-edge expand src/graph/SymbolGraphBuilder.ts:150

# 3. 리뷰 완료 후 원상복구
tsdoc-edge expand src/graph/SymbolGraphBuilder.ts
```

### 시나리오 3: 팀 공유

```bash
# 1. 현재 접기 상태를 마크다운으로 저장
tsdoc-edge export

# 2. Git 커밋
git add .tsdoc-comments/
git commit -m "Update comment fold states"

# 3. 팀원이 동일한 상태 적용
git pull
tsdoc-edge import
```

## 데이터 구조

### CommentState Interface

```typescript
interface CommentState {
  filePath: string;
  line: number;
  column: number;
  symbol: string;
  status: 'expanded' | 'collapsed';
  fullComment: string;
  collapsedComment: string;
  lastUpdated: string;
}
```

### StateStorage Format

```typescript
interface StateStorage {
  version: string;
  lastUpdated: string;
  files: {
    [filePath: string]: {
      comments: CommentState[];
    };
  };
}
```

## 구현 우선순위

### Phase 1: 기본 기능
- [x] 아키텍처 설계
- [ ] TSDoc → Markdown exporter
- [ ] Markdown → TSDoc importer
- [ ] 접기/펼치기 로직

### Phase 2: CLI
- [ ] Export 명령어
- [ ] Import 명령어
- [ ] Collapse 명령어
- [ ] Expand 명령어

### Phase 3: 고급 기능
- [ ] Pattern 매칭 (접기 패턴)
- [ ] Status 명령어
- [ ] Watch 모드 (자동 동기화)
- [ ] VSCode 확장

## 장점

1. **가독성 향상**: 개발 중 불필요한 긴 주석 숨김
2. **유연성**: 필요할 때만 상세 문서 확인
3. **버전 관리**: 마크다운 파일로 상태 공유
4. **도구 독립성**: IDE 기능에 의존하지 않음
5. **팀 협업**: 동일한 접기 상태 공유 가능

## 참고

- TypeScript Compiler API (AST 파싱)
- TSDoc Parser (주석 구조 분석)
- 파일 위치 기반 식별 (filePath:line:column)
