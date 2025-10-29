# CONV-05: 파라미터 문서화 필수

## 규칙 설명

함수나 메서드의 모든 파라미터는 `@param` 태그로 문서화해야 합니다.

**우선순위**: MUST (필수)

## ✅ 올바른 예시

```typescript
/**
 * Visit a TypeScript AST node and extract TSDoc comments
 *
 * @param node - TypeScript AST node
 * @param filePath - Source file path
 * @param comments - Array to collect parsed comments
 * @param errors - Array to collect errors
 */
private visitNode(
  node: ts.Node,
  filePath: string,
  comments: ParsedDocComment[],
  errors: Error[]
): void {
  // ...
}
```

```typescript
/**
 * Insert a symbol into the database
 *
 * @param symbol - Symbol to insert
 * @param jsonlLine - Line number in JSONL file
 * @returns True if successful
 * @public
 */
insertSymbol(symbol: Symbol, jsonlLine: number): boolean {
  // ...
}
```

## ❌ 잘못된 예시

```typescript
/**
 * Visit a TypeScript AST node and extract TSDoc comments
 */
private visitNode(
  node: ts.Node,
  filePath: string,
  comments: ParsedDocComment[],
  errors: Error[]
): void {
  // ...
}
```

```typescript
/**
 * Insert a symbol into the database
 *
 * @param symbol - Symbol to insert
 * @returns True if successful
 */
insertSymbol(symbol: Symbol, jsonlLine: number): boolean {
  // jsonlLine 파라미터 문서화 누락
}
```

## 작성 가이드

### 기본 형식
```typescript
@param parameterName - 간단한 설명
```

### 옵셔널 파라미터
```typescript
/**
 * Create a new DatabaseManager
 *
 * @param dbPath - Path to SQLite database file
 * @param jsonlPath - Path to JSONL data directory (optional)
 */
constructor(dbPath: string, jsonlPath?: string) {
  // ...
}
```

### 복잡한 객체 파라미터
```typescript
/**
 * Search symbols by various criteria
 *
 * @param query - Search query object containing:
 *   - `name`: Symbol name to search
 *   - `type`: Symbol type filter
 *   - `filePath`: File path filter
 * @returns Array of matching symbols
 */
search(query: SearchQuery): Symbol[] {
  // ...
}
```

### 콜백 파라미터
```typescript
/**
 * Process data with progress callback
 *
 * @param data - Data to process
 * @param onProgress - Callback function called with progress percentage (0-100)
 * @returns Processed result
 */
process(data: any[], onProgress: (percent: number) => void): any[] {
  // ...
}
```

## 파라미터 순서

`@param` 태그는 **함수 시그니처와 동일한 순서**로 작성해야 합니다.

```typescript
// ✅ 올바른 순서
/**
 * @param first - First parameter
 * @param second - Second parameter
 * @param third - Third parameter
 */
function example(first: string, second: number, third: boolean) {}

// ❌ 잘못된 순서
/**
 * @param second - Second parameter
 * @param first - First parameter
 * @param third - Third parameter
 */
function example(first: string, second: number, third: boolean) {}
```

## 예외 사항

파라미터가 없는 함수는 `@param` 불필요:

```typescript
/**
 * Get all symbols
 *
 * @returns Array of all symbols
 */
getAllSymbols(): Symbol[] {
  // ...
}
```

## 이유

1. **파라미터 목적 명확화**: 타입만으로는 파라미터의 의미를 알 수 없음
2. **사용 예시 제공**: 어떤 값을 전달해야 하는지 이해
3. **IDE 지원**: 함수 호출 시 파라미터 설명을 도구팁으로 표시

## 검증 에러

파라미터 문서화가 누락되었을 때:
```
❌ Parameters must be documented: paramName1, paramName2
```

## 참고

- [TSDoc - @param](https://tsdoc.org/)
