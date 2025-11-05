# CONV-06: @precondition, @postcondition 사용 권장

## 규칙 설명

중요한 함수나 메서드에는 `@precondition`(사전조건)과 `@postcondition`(사후조건)을 명시하여 계약(contract)을 문서화하는 것을 권장합니다.

**우선순위**: SHOULD (권장) - Public API와 핵심 컴포넌트에 적용

## ✅ 올바른 예시

```typescript
/**
 * Add a symbol to the graph
 *
 * @param symbol - Symbol to add
 * @precondition Symbol must have unique ID
 * @postcondition Symbol is indexed and searchable
 * @public
 */
addSymbol(symbol: Symbol): void {
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
 * @precondition Symbol ID must be unique
 * @postcondition Symbol is stored in database and indexed in FTS
 * @public
 */
insertSymbol(symbol: Symbol, jsonlLine: number): boolean {
  // ...
}
```

```typescript
/**
 * Import data from JSONL file
 *
 * @param filePath - Path to JSONL file
 * @returns Number of records imported
 * @precondition File must exist and be valid JSONL format
 * @postcondition Database is updated with imported data
 * @public
 */
importFromJSONL(filePath: string): number {
  // ...
}
```

## 사용 시기

### @precondition (사전조건)

함수 실행 **전**에 반드시 만족해야 하는 조건:

- **필수 입력 검증**: "Symbol ID must be unique"
- **리소스 상태**: "Database connection must be established"
- **데이터 형식**: "File must be valid JSON format"
- **범위 제약**: "Index must be within bounds"

### @postcondition (사후조건)

함수 실행 **후**에 보장되는 상태:

- **상태 변경**: "Symbol is indexed and searchable"
- **리소스 정리**: "All temporary files are deleted"
- **불변 조건 유지**: "Graph remains acyclic"
- **데이터 일관성**: "Database and cache are synchronized"

## 실전 예시

### 데이터베이스 작업
```typescript
/**
 * Initialize database schema
 *
 * @precondition Database connection is established
 * @postcondition All tables and indexes are created
 */
private initializeSchema(): void {
  // ...
}
```

### 그래프 알고리즘
```typescript
/**
 * Add a relationship between symbols
 *
 * @param relationship - Relationship to add
 * @precondition Both from and to symbols must exist in graph
 * @postcondition Relationship is tracked in adjacency lists
 * @public
 */
addRelationship(relationship: SymbolRelationship): void {
  // ...
}
```

### 파일 처리
```typescript
/**
 * Export all data to JSONL format
 *
 * @returns Path to exported JSONL file
 * @precondition Database must contain data
 * @postcondition JSONL file is created with one JSON object per line
 * @public
 */
exportToJSONL(): string {
  // ...
}
```

## Contract Programming

Precondition과 Postcondition은 **Design by Contract** 패러다임의 핵심입니다:

```
함수 = 계약 (Contract)
- Precondition: 호출자가 보장해야 할 것
- Postcondition: 함수가 보장하는 것
```

## 이유

1. **명확한 책임 분리**: 호출자와 함수의 책임을 명확히 구분
2. **버그 예방**: 조건 위반 시 빠르게 문제 감지 가능
3. **테스트 작성 가이드**: 테스트 케이스 작성의 기준 제공
4. **유지보수성**: 함수의 동작을 명확히 이해하여 안전한 수정 가능

## 관련 태그

- `@precondition`: 사전조건
- `@postcondition`: 사후조건
- `@invariant`: 불변 조건 (항상 참이어야 하는 조건)
- `@contract`: 전체 계약 설명

## 참고

- [Design by Contract - Wikipedia](https://en.wikipedia.org/wiki/Design_by_contract)
- tsdoc-edge STRICT_MODE_GUIDE.md
