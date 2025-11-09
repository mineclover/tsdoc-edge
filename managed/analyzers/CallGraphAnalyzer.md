# [[CallGraphAnalyzer]]

**Source**: `src/analyzer/CallGraphAnalyzer.ts`

## Purpose

함수/메서드 호출 관계를 AST 분석으로 자동 탐지하여 실행 흐름 파악 가능하게 함.

## Problem & Solution

**Problem**: 함수가 서로를 호출하지만 명시적 관계 문서 없음
- A가 B를 호출하는지 코드 읽어야 앎
- 실행 흐름 파악 어려움
- 영향 분석 불가능

**Solution**: AST의 `ts.isCallExpression` 분석으로 자동 탐지

## Detection Strategy

### 1. Call Types

**Direct Call**:
```typescript
foo()  // Direct function call
```

**Method Call**:
```typescript
obj.method()  // Property access + call
this.analyze()
```

**Constructor Call**:
```typescript
new MyClass()
```

### 2. Call Resolution

**Process**:
1. AST traversal로 모든 call expression 찾기
2. Call target 식별 (function name, property access)
3. Symbol database에서 target symbol 조회
4. Caller-callee relationship 생성

## Output: CallSite

```typescript
interface CallSite {
  callerSymbolId: string;    // 호출하는 심볼
  callerName: string;
  targetName: string;         // 호출되는 함수명
  targetSymbolId?: string;    // 타겟 심볼 (resolved)
  objectName?: string;        // obj.method()의 obj
  filePath: string;           // 호출 위치
  line: number;
  callType: 'direct' | 'method' | 'constructor' | 'unknown';
}
```

## Use Cases

### 1. Impact Analysis
"이 함수를 수정하면 어디에 영향을 주나?"
→ Call graph의 reverse traversal

### 2. Execution Flow
"이 기능이 어떤 순서로 실행되나?"
→ Call chain following

### 3. Dead Code Detection
"호출되지 않는 함수는?"
→ 0 incoming calls

## Related

- [[Call Relationships]]: 생성되는 관계 타입
- [[Pipeline]]: Data flow와 결합
- [[Work Context]]: 영향 분석에 사용
