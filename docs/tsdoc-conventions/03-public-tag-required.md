# CONV-03: Public API는 @public 태그 필수

## 규칙 설명

외부에 노출되는 **public API**(클래스, 함수, 메서드, 타입)는 반드시 `@public` 태그를 명시해야 합니다.

**우선순위**: MUST (필수)

## ✅ 올바른 예시

```typescript
/**
 * Parser for extracting and parsing TSDoc comments from TypeScript source files
 *
 * @public
 */
export class TSDocParser {
  // ...
}
```

```typescript
/**
 * Process a source file: parse, validate, and generate documentation
 *
 * @param filePath - Path to the source file
 * @param sourceCode - Source code content
 * @returns Markdown documentation string
 * @public
 */
processFile(filePath: string, sourceCode: string): string {
  // ...
}
```

```typescript
/**
 * Symbol information extracted from source code
 *
 * @public
 */
export interface Symbol {
  id: string;
  name: string;
  // ...
}
```

## ❌ 잘못된 예시

```typescript
/**
 * Parser for extracting and parsing TSDoc comments from TypeScript source files
 */
export class TSDocParser {
  // ...
}
```

```typescript
/**
 * Process a source file: parse, validate, and generate documentation
 *
 * @param filePath - Path to the source file
 * @returns Markdown documentation string
 */
processFile(filePath: string, sourceCode: string): string {
  // ...
}
```

## 예외 사항

`@public` 태그가 **필요 없는** 경우:

1. **Private 멤버**: `private` 키워드로 선언된 멤버
2. **Internal API**: `_`로 시작하는 심볼 (관례상 private)
3. **내부 헬퍼 함수**: export되지 않은 함수

```typescript
/**
 * Internal helper function
 */
private getSymbolName(node: ts.Node): string {
  // @public 태그 불필요
}
```

## 이유

1. **API 가시성 명확화**: 어떤 심볼이 공개 API인지 명확히 구분
2. **문서 생성 도구**: API 문서 생성 시 public 심볼만 선택적으로 포함
3. **버전 관리**: 공개 API 변경은 breaking change로 관리 필요

## 관련 태그

- `@public`: 공개 API (외부 사용 가능)
- `@internal`: 내부 API (같은 프로젝트 내에서만 사용)
- `@private`: 비공개 (문서화하지 않음)

## 검증 에러

`@public` 태그가 없을 때 발생하는 경고:
```
⚠️ Public API should have @public tag
```

## 참고

- [TSDoc - Release Tags](https://tsdoc.org/)
- [API Extractor - Release Tags](https://api-extractor.com/)
