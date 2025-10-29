# CONV-01: Summary Section과 태그 사이 빈 줄 필수

## 규칙 설명

TSDoc summary section(요약)과 태그(`@param`, `@returns` 등) 사이에는 **반드시 빈 줄**을 삽입해야 합니다.

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
 * Creates a new TSDocParser instance
 *
 * @public
 */
constructor() {
  // ...
}
```

## ❌ 잘못된 예시

```typescript
/**
 * Parse a TypeScript source file and extract all TSDoc comments
 * @param filePath - Path to the source file
 * @param sourceCode - Source code content
 * @returns Parse result containing all doc comments
 * @public
 */
parseFile(filePath: string, sourceCode: string): ParseResult {
  // ...
}
```

## 이유

1. **Microsoft TSDoc 파서 요구사항**: TSDoc 파서는 빈 줄을 통해 summary section과 block tags를 구분합니다.
2. **가독성 향상**: 요약과 세부 태그를 시각적으로 명확히 구분할 수 있습니다.
3. **검증 도구 호환성**: 빈 줄이 없으면 summary section이 비어있다고 판단됩니다.

## 검증 에러

빈 줄이 없을 때 발생하는 에러:
```
⚠️ TSDoc comment must include a summary section
```

## 참고

- [TSDoc 공식 문서 - Comment Structure](https://tsdoc.org/)
- 프로젝트 내 검증 스크립트: `demo/self-validation.ts`
