# CONV-04: 함수는 @returns 태그 필수

## 규칙 설명

반환값이 있는 모든 함수와 메서드는 `@returns` 태그로 반환값을 문서화해야 합니다.

**우선순위**: MUST (필수)

## ✅ 올바른 예시

```typescript
/**
 * Parse a TypeScript source file and extract all TSDoc comments
 *
 * @param filePath - Path to the source file
 * @param sourceCode - Source code content
 * @returns Parse result containing all doc comments
 * @public
 */
parseFile(filePath: string, sourceCode: string): ParseResult {
  // ...
}
```

```typescript
/**
 * Check if doc comment has a summary section
 *
 * @param docComment - TSDoc comment
 * @returns True if summary exists
 */
private hasSummary(docComment: DocComment): boolean {
  return docComment.summarySection.nodes.length > 0;
}
```

## ❌ 잘못된 예시

```typescript
/**
 * Parse a TypeScript source file and extract all TSDoc comments
 *
 * @param filePath - Path to the source file
 * @param sourceCode - Source code content
 * @public
 */
parseFile(filePath: string, sourceCode: string): ParseResult {
  // ...
}
```

```typescript
/**
 * Check if doc comment has a summary section
 *
 * @param docComment - TSDoc comment
 */
private hasSummary(docComment: DocComment): boolean {
  return docComment.summarySection.nodes.length > 0;
}
```

## 예외 사항

`@returns` 태그가 **필요 없는** 경우:

### 1. void 함수
```typescript
/**
 * Close database connection
 *
 * @public
 */
close(): void {
  this.db.close();
}
```

### 2. Constructor
```typescript
/**
 * Creates a new TSDocParser instance
 *
 * @public
 */
constructor() {
  this.parser = new MicrosoftTSDocParser();
}
```

### 3. Setter
```typescript
/**
 * Set the validation mode
 *
 * @param mode - Validation mode
 */
set validationMode(mode: string) {
  this._mode = mode;
}
```

## 작성 가이드

### 기본 형식
```typescript
@returns 반환값에 대한 간단한 설명
```

### 복잡한 반환값
```typescript
/**
 * Search symbols by various criteria
 *
 * @param query - Search query
 * @returns Search result containing:
 *   - `results`: Array of matching symbols
 *   - `totalCount`: Total number of matches
 *   - `hasMore`: Whether more results exist
 */
```

### 조건부 반환값
```typescript
/**
 * Get symbol by ID
 *
 * @param id - Symbol ID
 * @returns Symbol data or null if not found
 */
getSymbol(id: string): Symbol | null {
  // ...
}
```

## 이유

1. **API 이해도 향상**: 함수가 무엇을 반환하는지 명확히 이해
2. **타입만으로 부족**: 타입 시그니처는 "무엇"을 반환하지만, `@returns`는 "의미"를 설명
3. **IDE 지원**: 함수 호출 시 반환값 설명을 도구팁으로 표시

## 검증 에러

`@returns` 태그가 없을 때 발생하는 에러:
```
❌ Function must document return value with @returns tag
```

## 참고

- [TSDoc - @returns](https://tsdoc.org/)
