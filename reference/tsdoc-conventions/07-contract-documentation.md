# CONV-07: @contract 사용 권장

## 규칙 설명

복잡한 비즈니스 로직이나 중요한 함수에는 `@contract` 태그로 계약(contract)의 전체적인 설명을 제공하는 것을 권장합니다.

**우선순위**: SHOULD (권장) - Public API와 핵심 컴포넌트에 적용

## ✅ 올바른 예시

```typescript
/**
 * Database manager for symbol and documentation storage
 *
 * @contract Manage database lifecycle and provide CRUD operations
 * @precondition Database file path must be valid
 * @postcondition Database is initialized with schema
 * @public
 */
export class DatabaseManager {
  // ...
}
```

```typescript
/**
 * Validate enhanced symbol documentation
 *
 * @param doc - Enhanced documentation to validate
 * @param isPublicAPI - Whether this is a public API (stricter requirements)
 * @returns Validation result
 * @contract Check all 6 required categories for strict mode compliance
 * @public
 */
validate(doc: EnhancedSymbolDoc, isPublicAPI: boolean): StrictModeValidation {
  // ...
}
```

```typescript
/**
 * Export all data to JSONL format
 *
 * @returns Path to exported JSONL file
 * @contract Export data in Git-friendly JSONL format with one JSON object per line
 * @postcondition JSONL file is created with all database records
 * @public
 */
exportToJSONL(): string {
  // ...
}
```

## @contract vs @precondition/@postcondition

| 태그 | 목적 | 사용 시점 |
|------|------|-----------|
| `@contract` | 전체 계약의 **개요** 설명 | 함수/클래스의 주요 책임 명시 |
| `@precondition` | **호출 전** 만족해야 할 조건 | 입력 검증, 상태 확인 |
| `@postcondition` | **실행 후** 보장되는 상태 | 결과 보장, 부수효과 명시 |

### 함께 사용하는 예시

```typescript
/**
 * Process CSV data with configurable strategies
 *
 * @param filePath - Path to CSV file
 * @param options - Processing options
 * @returns Processed data stream
 * @contract Process CSV data with streaming to avoid memory issues
 * @precondition File must exist and be readable
 * @precondition File size must be within limits
 * @postcondition Data is processed without memory leaks
 * @postcondition Progress is tracked and reported
 * @public
 */
process(filePath: string, options: ProcessOptions): AsyncGenerator<Data> {
  // ...
}
```

## 작성 가이드

### 클래스 레벨 Contract
클래스의 **전체적인 책임**을 명시:

```typescript
/**
 * Symbol graph builder for tracking relationships and connectivity
 *
 * @contract Build and maintain symbol graph structure with efficient lookups
 * @responsibility
 * - Maintain symbols and relationships
 * - Provide fast lookup by name, file, and dependencies
 * - Detect circular dependencies
 * @public
 */
export class SymbolGraphBuilder {
  // ...
}
```

### 메서드 레벨 Contract
메서드의 **핵심 약속**을 명시:

```typescript
/**
 * Initialize database schema
 *
 * @contract Create all required tables, indexes, and FTS5 virtual tables
 * @precondition Database connection is established
 * @postcondition All schema objects are created and ready for use
 */
private initializeSchema(): void {
  // ...
}
```

### 복잡한 알고리즘
알고리즘의 **보장사항**을 명시:

```typescript
/**
 * Detect circular dependencies in the graph
 *
 * @returns Array of circular dependency chains
 * @contract Use DFS to find all cycles in O(V+E) time complexity
 * @postcondition All cycles are detected without duplicates
 * @testScenario Simple cycle: A -> B -> A
 * @testScenario Complex cycle: A -> B -> C -> A
 * @testScenario No cycles
 * @public
 */
detectCircularDependencies(): string[][] {
  // ...
}
```

## 실전 예시

### 데이터 무결성
```typescript
/**
 * Insert enhanced documentation
 *
 * @param doc - Enhanced documentation
 * @param jsonlLine - Line number in JSONL file
 * @returns True if successful
 * @contract Store all 6 categories with referential integrity
 * @precondition Symbol must exist in database
 * @postcondition Documentation is stored and indexed for full-text search
 * @public
 */
insertEnhancedDoc(doc: EnhancedSymbolDoc, jsonlLine: number): boolean {
  // ...
}
```

### 성능 보장
```typescript
/**
 * Search symbols by text query using FTS5
 *
 * @param query - Search query
 * @returns Array of matching symbol IDs sorted by relevance
 * @contract Use FTS5 for efficient full-text search with ranking
 * @precondition Query must be valid FTS5 syntax
 * @postcondition Results are sorted by relevance score
 * @public
 */
searchSymbols(query: string): string[] {
  // ...
}
```

## 이유

1. **고수준 이해**: 구현 세부사항 없이 함수의 책임을 명확히 전달
2. **API 설계 검증**: Contract를 작성하면서 API 설계의 문제점 발견
3. **테스트 기준**: Contract가 테스트해야 할 핵심 요구사항 제공
4. **유지보수 가이드**: 수정 시 반드시 지켜야 할 불변 조건 명시

## 관련 태그

- `@contract`: 계약 개요
- `@responsibility`: 책임 명시 (tsdoc-edge 확장 태그)
- `@architecture`: 아키텍처 계층 명시 (tsdoc-edge 확장 태그)
- `@testScenario`: 검증해야 할 시나리오 (tsdoc-edge 확장 태그)

## 참고

- [Design by Contract - Bertrand Meyer](https://www.eiffel.org/doc/eiffel/ET-_Design_by_Contract_%28tm%29%2C_Assertions_and_Exceptions)
- tsdoc-edge STRICT_MODE_GUIDE.md
- tsdoc-edge 6-category documentation system
