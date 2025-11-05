# CONV-02: Summary Section 필수

## 규칙 설명

모든 TSDoc 주석은 **summary section(요약 섹션)**을 반드시 포함해야 합니다.
Summary는 함수, 클래스, 메서드가 무엇을 하는지 간단히 설명합니다.

**우선순위**: MUST (필수)

## ✅ 올바른 예시

```typescript
/**
 * Validates TSDoc comments against defined conventions
 *
 * @public
 */
export class ConventionValidator {
  // ...
}
```

```typescript
/**
 * Get the parser instance
 *
 * @returns TSDocParser instance
 * @public
 */
getParser(): TSDocParser {
  return this.parser;
}
```

## ❌ 잘못된 예시

```typescript
/**
 * @public
 */
export class ConventionValidator {
  // ...
}
```

```typescript
/**
 * @returns TSDocParser instance
 * @public
 */
getParser(): TSDocParser {
  return this.parser;
}
```

## 이유

1. **문서의 핵심**: Summary는 코드를 이해하는 가장 중요한 첫 정보입니다.
2. **IDE 지원**: 대부분의 IDE는 summary를 자동완성 도구팁에 표시합니다.
3. **검색 가능성**: 문서 생성 도구는 summary를 기반으로 검색 인덱스를 생성합니다.

## 작성 가이드

- **1-2문장**으로 간결하게 작성
- **동사로 시작** (예: "Validates...", "Creates...", "Returns...")
- **구현 세부사항보다 목적**에 집중

## 검증 에러

Summary가 없을 때 발생하는 에러:
```
❌ TSDoc comment must include a summary section
```

## 참고

- [TSDoc 공식 문서 - Summary](https://tsdoc.org/)
