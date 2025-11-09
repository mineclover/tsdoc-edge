# [[IODependencyAnalyzer]]

**Source**: `src/analyzer/IODependencyAnalyzer.ts`

## Purpose

파일 I/O 의존성 분석.

## Detects

- fs.readFile / fs.writeFile
- fs.existsSync
- path.join operations
- File path patterns

## Related

- [[IO Dependency]]: I/O 의존성 관계
- [[Work Context]]: 파일 접근 정보
