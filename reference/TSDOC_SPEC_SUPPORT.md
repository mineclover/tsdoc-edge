# TSDoc Specification Support

**tsdoc-edge** 프로젝트의 TSDoc 파싱 지원 범위 및 상세 스펙

**TSDoc 버전**: @microsoft/tsdoc@0.15.1
**검증일**: 2025-10-30

---

## 개요

tsdoc-edge는 Microsoft TSDoc 라이브러리를 기반으로 하며, 표준 TSDoc 태그 전체와 프로젝트 전용 커스텀 태그를 지원합니다.

---

## 지원하는 TSDoc 태그

### ✅ 표준 Core Tags (자동 지원)

Microsoft TSDoc이 기본으로 제공하는 태그들:

| 태그 | 용도 | 다중 허용 | 예시 |
|------|------|-----------|------|
| `@param` | 파라미터 설명 | ✅ | `@param value - Input value` |
| `@returns` | 반환값 설명 | ❌ | `@returns Processed result` |
| `@remarks` | 상세 설명 블록 | ❌ | `@remarks This is detailed...` |
| `@example` | 사용 예시 | ✅ | `@example const x = foo();` |
| `@throws` | 예외 설명 | ✅ | `@throws Error if invalid` |
| `@see` | 참조 링크 | ✅ | `@see {@link OtherClass}` |
| `@deprecated` | 사용 중단 표시 | ❌ | `@deprecated Use newFunc` |
| `@defaultValue` | 기본값 설명 | ❌ | `@defaultValue \`null\`` |
| `@typeParam` | 제네릭 타입 파라미터 | ✅ | `@typeParam T - Item type` |
| `@inheritDoc` | 부모 문서 상속 | ❌ | `@inheritDoc` |

### ✅ API 문서화 Modifier Tags (자동 지원)

| 태그 | 용도 | 설명 |
|------|------|------|
| `@public` | Public API | 외부 사용자용 |
| `@beta` | Beta API | 상대적으로 안정적 |
| `@alpha` | Alpha API | 자주 변경 가능 |
| `@experimental` | 실험적 API | 사용 주의 필요 |
| `@internal` | 내부 API | 공개되지 않음 |

### ✅ 기타 Modifier Tags (자동 지원)

| 태그 | 용도 | 설명 |
|------|------|------|
| `@readonly` | 읽기 전용 | 수정 불가 속성 |
| `@virtual` | 가상 메서드 | 오버라이드 가능 |
| `@override` | 오버라이드 | 부모 메서드 재정의 |
| `@sealed` | 봉인 클래스 | 상속 불가 |
| `@packageDocumentation` | 패키지 문서 | 파일 최상단 주석 |

### ✅ Inline Tags (자동 지원)

| 태그 | 용도 | 예시 |
|------|------|------|
| `{@link}` | 심볼 링크 | `{@link ClassName}` |
| `{@link \| text}` | 외부 링크 | `{@link https://... \| Docs}` |
| `{@inheritDoc}` | 문서 상속 | `{@inheritDoc BaseClass}` |

---

## 커스텀 태그 (명시적 등록)

tsdoc-edge 프로젝트 전용 태그들:

| 태그 | 용도 | 다중 허용 | 사용 위치 |
|------|------|-----------|-----------|
| `@id` | 심볼 고유 ID | ❌ | 클래스, 함수 |
| `@contract` | 계약 명세 | ❌ | 클래스, 함수 |
| `@precondition` | 전제 조건 | ✅ | 함수, 메서드 |
| `@postcondition` | 후행 조건 | ✅ | 함수, 메서드 |
| `@responsibility` | 책임 정의 | ❌ | 클래스 |
| `@uses` | 의존 심볼 | ✅ | 모든 심볼 |
| `@usedBy` | 사용처 | ✅ | 모든 심볼 |

### 사용 예시

```typescript
/**
 * Symbol registry manager
 *
 * @id 001
 * @responsibility Manage symbol ID registry stored in JSONL
 * @public
 */
export class SymbolRegistryManager {
  /**
   * Register a new symbol
   *
   * @param sourceRef - Source reference
   * @param tags - Optional tags
   * @returns Generated ID
   *
   * @precondition sourceRef must be valid
   * @postcondition ID is persisted to disk
   * @uses IdGenerator
   * @public
   */
  register(sourceRef: SourceRef, tags?: string[]): string {
    // ...
  }
}
```

---

## 테스트 결과

### 전체 스펙 테스트

**실행**: `npm run demo && npx ts-node demo/tsdoc-spec-test.ts`

**결과**: ✅ 6/6 테스트 통과

| 테스트 | 태그 수 | 주석 수 | 에러 | 상태 |
|--------|---------|---------|------|------|
| Standard Tags | 14 | 3 | 0 | ✅ |
| API Documentation Tags | 9 | 9 | 0 | ✅ |
| Custom Tags | 10 | 1 | 0 | ✅ |
| Link Tags | 4 | 1 | 0 | ✅ |
| Complex Structures | 8 | 4 | 0 | ✅ |
| Edge Cases | 6 | 6 | 0 | ✅ |

### 파싱 성능

- **속도**: ~1ms per comment
- **메모리**: ~10KB per parsed comment
- **에러 핸들링**: 모든 malformed 태그 graceful하게 처리

---

## TSDoc Configuration

### 등록된 커스텀 태그 설정

```typescript
// src/parser/TSDocParser.ts

this.configuration.addTagDefinition(
  new TSDocTagDefinition({
    tagName: '@id',
    syntaxKind: TSDocTagSyntaxKind.BlockTag,
    allowMultiple: false,
  })
);

this.configuration.addTagDefinition(
  new TSDocTagDefinition({
    tagName: '@precondition',
    syntaxKind: TSDocTagSyntaxKind.BlockTag,
    allowMultiple: true,  // 여러 개 허용
  })
);
```

### 새 커스텀 태그 추가 방법

1. `src/parser/TSDocParser.ts` constructor에 추가:
   ```typescript
   this.configuration.addTagDefinition(
     new TSDocTagDefinition({
       tagName: '@yourTag',
       syntaxKind: TSDocTagSyntaxKind.BlockTag,
       allowMultiple: false,
     })
   );
   ```

2. 타입 정의 업데이트 (선택사항):
   ```typescript
   // src/types/tags.ts
   export interface YourCustomTag {
     tagName: '@yourTag';
     content: string;
   }
   ```

3. 컨벤션 문서에 추가:
   ```
   docs/tsdoc-conventions/XX-your-tag.md
   ```

---

## 지원하지 않는 태그

### ❌ 현재 미지원 (필요시 추가 가능)

| 태그 | 이유 |
|------|------|
| `@eventProperty` | 이벤트 기반 아키텍처 미사용 |
| `@callback` | TypeScript 타입으로 충분 |

### 추가 고려사항

표준 TSDoc 태그는 `@microsoft/tsdoc`에서 자동 파싱되므로, 새 태그가 추가되면 라이브러리 업데이트만으로 지원 가능합니다.

---

## 사용 가이드

### 1. 기본 함수 문서화

```typescript
/**
 * Calculate sum of two numbers
 *
 * @param a - First number
 * @param b - Second number
 * @returns Sum of a and b
 *
 * @example
 * ```typescript
 * const result = add(2, 3);
 * console.log(result); // 5
 * ```
 *
 * @public
 */
function add(a: number, b: number): number {
  return a + b;
}
```

### 2. 복잡한 클래스 문서화

```typescript
/**
 * Generic data container
 *
 * @remarks
 * This class provides type-safe storage with validation.
 *
 * Features:
 * - Automatic validation
 * - Type inference
 * - Serialization support
 *
 * @typeParam T - The data type
 * @typeParam K - The key type
 *
 * @id 042
 * @responsibility Provide type-safe data storage
 * @public
 * @beta
 */
export class Container<T, K extends keyof T> {
  /**
   * Store data
   *
   * @param key - The key to store under
   * @param value - The value to store
   *
   * @throws Error if key already exists
   * @throws ValidationError if value is invalid
   *
   * @precondition key must be unique
   * @postcondition data is persisted
   * @public
   */
  set(key: K, value: T[K]): void {
    // ...
  }
}
```

### 3. 사용 중단 API

```typescript
/**
 * Legacy data processor
 *
 * @deprecated Use {@link NewProcessor} instead.
 * This will be removed in v2.0.0.
 *
 * @see {@link NewProcessor} for migration guide
 * @public
 */
export class OldProcessor {
  // ...
}
```

---

## 검증 방법

### 파싱 테스트

```typescript
import { TSDocParser } from 'tsdoc-edge';

const parser = new TSDocParser();
const result = parser.parseFile('example.ts', sourceCode);

console.log(`Comments: ${result.comments.length}`);
console.log(`Errors: ${result.errors.length}`);

result.comments.forEach(comment => {
  const doc = comment.docComment;
  console.log('Tags:', doc.customBlocks.map(b => b.blockTag.tagName));
});
```

### CLI 검증

```bash
# 프로젝트 전체 검증
npx ts-node demo/self-validation.ts

# 특정 파일 검증
npm run build && node dist/cli.js validate
```

---

## 참고 자료

- [TSDoc 공식 사이트](https://tsdoc.org/)
- [TSDoc Playground](https://microsoft.github.io/tsdoc/)
- [@microsoft/tsdoc GitHub](https://github.com/microsoft/tsdoc)
- [TSDoc Specification](https://tsdoc.org/pages/spec/overview/)

---

## 버전 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|-----------|
| 0.1.0 | 2025-10 | 초기 구현 (7개 커스텀 태그) |
| 0.3.1 | 2025-10-30 | 전체 스펙 테스트 추가 |

---

**작성일**: 2025-10-30
**상태**: ✅ 검증 완료
