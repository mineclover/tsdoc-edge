# Fold/Unfold System User Guide

## 개요

TSDoc Edge의 Fold/Unfold 시스템은 긴 주석으로 인한 코드 가독성 문제를 해결합니다.
주석을 프로그래밍적으로 접고 펼칠 수 있으며, 상태는 마크다운 파일로 저장되어 팀과 공유할 수 있습니다.

## 핵심 개념

### 양방향 변환
```
TypeScript (TSDoc) ←→ Markdown (Storage)
```

### 두 가지 상태
- **Expanded** (펼침): 전체 주석 표시
- **Collapsed** (접힘): Summary만 표시

### 마크다운 저장소
주석 상태는 `.tsdoc-comments/` 디렉토리에 마크다운으로 저장되며 Git으로 버전 관리할 수 있습니다.

## 빠른 시작

### 1. 주석 내보내기 (Export)

```typescript
import { CommentStateManager } from 'tsdoc-edge';

const manager = new CommentStateManager('.tsdoc-comments');

// 단일 파일 내보내기
const markdownPath = manager.exportFile('src/index.ts');
console.log(`Exported to: ${markdownPath}`);

// 전체 프로젝트 내보내기
const result = manager.exportAll('src');
console.log(`Exported ${result.filesExported} files`);
console.log(`Total comments: ${result.commentsExported}`);
```

### 2. 주석 접기 (Collapse)

```typescript
// 특정 패턴 매칭으로 접기
manager.collapse('src/index.ts', {
  pattern: '^get',  // get으로 시작하는 메서드
});

// Private 메서드만 접기
manager.collapse('src/index.ts', {
  privateOnly: true,
});

// 긴 주석만 접기 (5줄 이상)
manager.collapse('src/index.ts', {
  minLines: 5,
});
```

### 3. 주석 펼치기 (Expand)

```typescript
// 모든 주석 펼치기
manager.expand('src/index.ts', { all: true });

// 특정 패턴만 펼치기
manager.expand('src/index.ts', {
  pattern: 'constructor',
});
```

### 4. 코드에 적용 (Import)

```typescript
// 백업 파일로 생성 (안전)
const backupPath = manager.importFile('src/index.ts', false);
console.log(`Preview: ${backupPath}`);

// 원본 파일에 바로 적용 (주의!)
const updatedPath = manager.importFile('src/index.ts', true);

// 전체 프로젝트 적용
const result = manager.importAll(false); // false = backup mode
console.log(`Updated ${result.filesUpdated} files`);
```

### 5. 상태 확인 (Status)

```typescript
// 단일 파일 상태
const status = manager.getStatus('src/index.ts');
console.log(`Total: ${status.totalComments}`);
console.log(`Collapsed: ${status.collapsedComments}`);
console.log(`Expanded: ${status.expandedComments}`);

// 전체 프로젝트 상태
const allStatus = manager.getAllStatus();
allStatus.forEach(status => {
  console.log(`${status.filePath}: ${status.collapsedComments}/${status.totalComments}`);
});
```

## 실전 사용 예시

### 시나리오 1: 개발 중 주석 접기

```typescript
const manager = new CommentStateManager();

// 1. 긴 private 메서드 주석 모두 접기
manager.collapse('src/validator/StrictModeValidator.ts', {
  pattern: '^validate',
  minLines: 5,
});

// 2. 코드 적용
manager.importFile('src/validator/StrictModeValidator.ts', true);

// ... 코딩 작업 ...

// 3. 작업 완료 후 다시 펼치기
manager.expand('src/validator/StrictModeValidator.ts', { all: true });
manager.importFile('src/validator/StrictModeValidator.ts', true);
```

### 시나리오 2: 코드 리뷰

```typescript
// 리뷰할 파일들의 주석 접기
const filesToReview = [
  'src/graph/SymbolGraphBuilder.ts',
  'src/graph/SymbolSearchEngine.ts',
];

for (const file of filesToReview) {
  manager.exportFile(file);
  manager.collapse(file, {
    minLines: 10, // 긴 주석만 접기
  });
  manager.importFile(file, true);
}

// 리뷰 완료 후 원상복구
for (const file of filesToReview) {
  manager.expand(file, { all: true });
  manager.importFile(file, true);
}
```

### 시나리오 3: 팀 공유

```bash
# 1. 현재 접기 상태를 마크다운으로 저장
npm run fold:export

# 2. Git 커밋
git add .tsdoc-comments/
git commit -m "Update comment fold states"
git push

# 3. 팀원이 동일한 상태 적용
git pull
npm run fold:import
```

## 마크다운 포맷

생성된 마크다운 파일 구조:

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
```

## 접힌 주석 규칙

### Summary만 유지
```typescript
// Expanded (펼침)
/**
 * Parse a TypeScript source file and extract all TSDoc comments
 *
 * @param filePath - Path to the source file
 * @param sourceCode - Source code content
 * @returns Parse result containing all doc comments
 * @public
 */

// Collapsed (접힘)
/** Parse a TypeScript source file and extract all TSDoc comments */
```

### 특징
- Summary의 첫 문장만 유지
- 모든 태그 제거 (@param, @returns 등)
- 한 줄 형식으로 변환

## CLI 스크립트 (package.json)

```json
{
  "scripts": {
    "fold:export": "ts-node scripts/fold-export.ts",
    "fold:import": "ts-node scripts/fold-import.ts",
    "fold:collapse": "ts-node scripts/fold-collapse.ts",
    "fold:expand": "ts-node scripts/fold-expand.ts",
    "fold:status": "ts-node scripts/fold-status.ts"
  }
}
```

## API Reference

### CommentStateManager

#### Constructor
```typescript
constructor(storageDir: string = '.tsdoc-comments')
```

#### Methods

##### exportFile
```typescript
exportFile(filePath: string): string
```
단일 파일의 주석을 마크다운으로 내보냅니다.

##### exportAll
```typescript
exportAll(sourceDir: string, pattern?: string): ExportResult
```
디렉토리의 모든 파일을 내보냅니다.

##### importFile
```typescript
importFile(filePath: string, overwrite: boolean = false): string
```
마크다운 상태를 코드에 적용합니다.

##### importAll
```typescript
importAll(overwrite: boolean = false): ImportResult
```
모든 파일에 상태를 적용합니다.

##### collapse
```typescript
collapse(filePath: string, options?: CollapseOptions): void
```
주석을 접습니다.

##### expand
```typescript
expand(filePath: string, options?: ExpandOptions): void
```
주석을 펼칩니다.

##### getStatus
```typescript
getStatus(filePath: string): FileStatusSummary
```
파일의 상태를 조회합니다.

##### getAllStatus
```typescript
getAllStatus(): FileStatusSummary[]
```
모든 파일의 상태를 조회합니다.

## 주의사항

### 1. 백업 권장
```typescript
// ✅ 안전: 백업 파일로 먼저 확인
manager.importFile('src/index.ts', false);

// ⚠️  주의: 원본 파일 직접 수정
manager.importFile('src/index.ts', true);
```

### 2. Git 통합
`.gitignore`에 추가하지 말 것:
```gitignore
# .tsdoc-comments/ 는 커밋해야 팀과 공유 가능
# .tsdoc-comments/
```

### 3. 동기화
마크다운 파일과 소스 코드가 동기화되지 않을 수 있습니다. 주기적으로 `exportAll()`을 실행하세요.

## 데모 실행

```bash
# 전체 워크플로우 데모
npm run build
npx ts-node demo/fold-unfold-demo.ts

# 결과 확인
ls -la .tsdoc-comments-demo/
cat src/index.ts.backup
```

## 문제 해결

### 마크다운 파일이 없다는 에러
```typescript
// 해결: 먼저 export 실행
manager.exportFile('src/index.ts');
manager.collapse('src/index.ts', { pattern: 'get' });
```

### 주석이 적용되지 않음
```typescript
// 해결: import 실행 필요
manager.collapse('src/index.ts', { all: true });
manager.importFile('src/index.ts', true); // 이 단계 필수!
```

## 향후 계획

- [ ] CLI 명령어 도구 (`tsdoc-fold` 명령어)
- [ ] VSCode 확장 (GUI로 접기/펼치기)
- [ ] Watch 모드 (파일 변경 시 자동 동기화)
- [ ] 더 풍부한 패턴 매칭 (glob, 정규식)
- [ ] 그룹 단위 접기/펼치기

## 참고

- [설계 문서](./FOLD_UNFOLD_DESIGN.md)
- [데모 스크립트](../demo/fold-unfold-demo.ts)
- [API 타입 정의](../src/types/comment-state.ts)
