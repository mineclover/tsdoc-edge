---
tsdoc: managed
version: 1.0.0
status: draft
primary: APIName
category: api
tags:
  - api
  - public
lastUpdated: YYYY-MM-DD
---

# [[APIName]]
> API 한 줄 설명

## 개요
API에 대한 전체적인 설명을 작성합니다. 이 API가 무엇을 하는지, 어떤 용도로 사용되는지 명확히 기술합니다.

**주요 용도:**
- 용도 1
- 용도 2
- 용도 3

## 핵심 개념

### 1. 핵심 개념 1
개념 설명

### 2. 핵심 개념 2
개념 설명

## 핵심 산출물

### API 인터페이스
- MainAPI[^sym-001] - 주요 API 인터페이스
  - 메서드 1
  - 메서드 2
  - 메서드 3

## 사용 시나리오

### 시나리오 1: 기본 사용법
```typescript
import { APIName } from 'package';

// 사용 예시
const api = new APIName(options);
const result = await api.method();
```

**결과:**
```typescript
// 예상 결과
{
  status: 'success',
  data: {...}
}
```

### 시나리오 2: 고급 사용법
```typescript
// 고급 사용 예시
const result = await api.advancedMethod({
  option1: 'value1',
  option2: 'value2'
});
```

## API Reference

### Class: APIName

#### Constructor
```typescript
constructor(options?: APIOptions)
```

**Parameters:**
- `options` (optional) - 설정 옵션
  - `option1`: string - 옵션 1 설명
  - `option2`: number - 옵션 2 설명

#### Methods

##### method1
```typescript
method1(param: ParamType): Promise<ReturnType>
```

**Parameters:**
- `param`: ParamType - 매개변수 설명

**Returns:**
- `Promise<ReturnType>` - 반환값 설명

**Throws:**
- `ErrorType` - 에러 발생 조건

**Example:**
```typescript
const result = await api.method1(param);
```

##### method2
```typescript
method2(param1: Type1, param2: Type2): ReturnType
```

**Parameters:**
- `param1`: Type1 - 매개변수 1 설명
- `param2`: Type2 - 매개변수 2 설명

**Returns:**
- `ReturnType` - 반환값 설명

## 타입 정의

### APIOptions
```typescript
interface APIOptions {
  option1?: string;
  option2?: number;
  option3?: boolean;
}
```

### ParamType
```typescript
interface ParamType {
  field1: string;
  field2: number;
}
```

### ReturnType
```typescript
interface ReturnType {
  status: 'success' | 'error';
  data?: any;
  error?: string;
}
```

## 에러 처리

### ErrorType
```typescript
class ErrorType extends Error {
  code: string;
  details?: any;
}
```

**에러 코드:**
- `ERROR_CODE_1` - 에러 설명
- `ERROR_CODE_2` - 에러 설명

## 모범 사례

### Best Practice 1
```typescript
// 좋은 예시
const api = new APIName({
  option1: 'recommended-value'
});
```

### Best Practice 2
```typescript
// 권장 패턴
try {
  const result = await api.method();
  // 성공 처리
} catch (error) {
  // 에러 처리
}
```

## 성능 고려사항

### 1. 고려사항 1
설명

### 2. 고려사항 2
설명

## 관련 API

- [[RelatedAPI1]] - 관계 설명
- [[RelatedAPI2]] - 관계 설명

## 가이드

## Symbol References

[^sym-001]: [APIName](../../src/api/APIName.ts#APIName)

---

## Backlinks

### Referenced By

자동 생성됨

### Implemented By

자동 생성됨
