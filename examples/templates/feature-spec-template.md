---
tsdoc: managed
version: 1.0.0
status: draft
primary: FeatureName
category: feature
tags:
  - tag1
  - tag2
lastUpdated: YYYY-MM-DD
---

# [[FeatureName]]
> 한 줄 설명

## 개요
기능에 대한 전체적인 설명을 작성합니다. 이 기능이 무엇을 하는지, 왜 필요한지, 어떤 문제를 해결하는지 명확히 기술합니다.

**해결하는 문제:**
- 문제 1
- 문제 2
- 문제 3

## 핵심 개념
### 1. 개념 1

개념 1에 대한 상세 설명

### 2. 개념 2

개념 2에 대한 상세 설명

### 3. 개념 3

개념 3에 대한 상세 설명

## 핵심 산출물

### 주요 컴포넌트 1
- ComponentName[^sym-001] - 컴포넌트 설명
  - 주요 기능 1
  - 주요 기능 2

### 주요 컴포넌트 2
- AnotherComponent[^sym-002] - 컴포넌트 설명
  - 주요 기능 1
  - 주요 기능 2

## 사용 시나리오

### 시나리오 1: 시나리오 제목
```bash
# 명령어 예시
tsdoc-edge command
```

**출력 예시:**
```
출력 결과 예시
```

### 시나리오 2: 시나리오 제목

```bash
# 명령어 예시
tsdoc-edge command --option
```

**출력 예시:**
```
출력 결과 예시
```

## CLI 명령어
```bash
# 주요 명령어
tsdoc-edge command [options]

# 옵션
--option1     설명
--option2     설명
```

## 설정

### .tsdoc.config.json 예시
```json
{
  "feature": {
    "option1": "value1",
    "option2": "value2"
  }
}
```

## 데이터 타입

### MainType
```typescript
interface MainType {
  field1: string;
  field2: number;
  field3: boolean;
}
```

## 통합 패턴

### 패턴 1: 패턴 제목
```typescript
// 코드 예시
```

### 패턴 2: 패턴 제목
```typescript
// 코드 예시
```

## 관련 기능

- [[RelatedFeature1]] - 관계 설명
- [[RelatedFeature2]] - 관계 설명

## 가이드

## Symbol References

[^sym-001]: [ComponentName](../../src/path/to/Component.ts#ComponentName)
[^sym-002]: [AnotherComponent](../../src/path/to/AnotherComponent.ts#AnotherComponent)

---

## Backlinks

### Referenced By

자동 생성됨

### Implemented By

자동 생성됨
