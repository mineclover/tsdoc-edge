# Test Symbol Extraction Strategy

> **Purpose**: Define how test code is parsed and indexed as symbols in the TSDoc Edge system

## Overview

Test code represents a critical part of codebase documentation - it demonstrates usage, validates behavior, and establishes contracts. This document defines how test structures are extracted as symbols.

## Table of Contents

1. [Test Symbol Types](#test-symbol-types)
2. [Extraction Rules](#extraction-rules)
3. [Hierarchical Structure](#hierarchical-structure)
4. [Symbol ID Generation](#symbol-id-generation)
5. [Relationships](#relationships)
6. [Implementation Plan](#implementation-plan)

---

## Test Symbol Types

### 1. Test Suite (`test-suite`)

**Source**: `describe()` blocks

**Purpose**: Group related test cases into logical collections

**Properties**:
- `id`: Generated kebab-case ID
- `name`: Suite name from describe argument
- `type`: `'test-suite'`
- `filePath`: Test file path
- `line`, `column`: Location in file
- `parentSymbol`: Parent suite ID (for nested suites)
- `summary`: Extracted from JSDoc or inferred

**Example**:
```typescript
describe('DatabaseManager', () => {
  describe('Symbol Operations', () => {
    // Nested suite
  });
});
```

**Extracted Symbols**:
```typescript
{
  id: 'database-manager-test-suite',
  name: 'DatabaseManager',
  type: 'test-suite',
  filePath: 'src/__tests__/DatabaseManager.test.ts',
  line: 17,
  parentSymbol: null
}

{
  id: 'database-manager-symbol-operations-test-suite',
  name: 'Symbol Operations',
  type: 'test-suite',
  filePath: 'src/__tests__/DatabaseManager.test.ts',
  line: 56,
  parentSymbol: 'database-manager-test-suite'
}
```

### 2. Test Case (`test-case`)

**Source**: `it()` or `test()` blocks

**Purpose**: Individual test specification

**Properties**:
- `id`: Generated kebab-case ID
- `name`: Test description from it/test argument
- `type`: `'test-case'`
- `filePath`: Test file path
- `line`, `column`: Location in file
- `parentSymbol`: Parent suite ID
- `summary`: Test description (extracted from name)

**Example**:
```typescript
describe('Symbol Operations', () => {
  test('should insert symbol', () => {
    // Test implementation
  });

  it('should retrieve symbol by ID', () => {
    // Test implementation
  });
});
```

**Extracted Symbols**:
```typescript
{
  id: 'database-manager-symbol-operations-should-insert-symbol-test-case',
  name: 'should insert symbol',
  type: 'test-case',
  filePath: 'src/__tests__/DatabaseManager.test.ts',
  line: 71,
  parentSymbol: 'database-manager-symbol-operations-test-suite'
}

{
  id: 'database-manager-symbol-operations-should-retrieve-symbol-by-id-test-case',
  name: 'should retrieve symbol by ID',
  type: 'test-case',
  filePath: 'src/__tests__/DatabaseManager.test.ts',
  line: 76,
  parentSymbol: 'database-manager-symbol-operations-test-suite'
}
```

### 3. Test Scenario (`test-scenario`)

**Source**: `@testScenario` JSDoc tag

**Purpose**: High-level test scenario documentation

**Properties**:
- `id`: Generated from file name
- `name`: Scenario description
- `type`: `'test-scenario'`
- `filePath`: Test file path
- `line`: JSDoc location
- `summary`: Full scenario description

**Example**:
```typescript
/**
 * DatabaseManager tests
 * @testScenario Database initialization with schema
 * @testScenario Symbol insertion and retrieval
 * @testScenario Enhanced documentation storage
 */
```

**Extracted Symbols**:
```typescript
{
  id: 'database-manager-database-initialization-with-schema-scenario',
  name: 'Database initialization with schema',
  type: 'test-scenario',
  filePath: 'src/__tests__/DatabaseManager.test.ts',
  line: 3
}

{
  id: 'database-manager-symbol-insertion-and-retrieval-scenario',
  name: 'Symbol insertion and retrieval',
  type: 'test-scenario',
  filePath: 'src/__tests__/DatabaseManager.test.ts',
  line: 4
}
```

---

## Extraction Rules

### Rule 1: Hierarchical Parsing

**Pattern**: Parse `describe` blocks recursively to build test suite hierarchy

**Algorithm**:
```typescript
function extractTestSuites(ast: Node, parentId: string | null): TestSuite[] {
  const suites: TestSuite[] = [];

  // Find all describe() calls
  const describeBlocks = findCallExpressions(ast, 'describe');

  for (const block of describeBlocks) {
    const suiteName = extractStringArgument(block, 0);
    const suiteId = generateTestId(suiteName, parentId, 'test-suite');

    const suite: TestSuite = {
      id: suiteId,
      name: suiteName,
      type: 'test-suite',
      parentSymbol: parentId,
      // ... other properties
    };

    suites.push(suite);

    // Recursively extract nested suites
    const nested = extractTestSuites(block.body, suiteId);
    suites.push(...nested);
  }

  return suites;
}
```

### Rule 2: Test Case Extraction

**Pattern**: Find all `it()` and `test()` calls within suite scope

**Algorithm**:
```typescript
function extractTestCases(ast: Node, suiteId: string): TestCase[] {
  const cases: TestCase[] = [];

  // Find all it() and test() calls
  const testBlocks = [
    ...findCallExpressions(ast, 'it'),
    ...findCallExpressions(ast, 'test')
  ];

  for (const block of testBlocks) {
    const testName = extractStringArgument(block, 0);
    const testId = generateTestId(testName, suiteId, 'test-case');

    cases.push({
      id: testId,
      name: testName,
      type: 'test-case',
      parentSymbol: suiteId,
      // ... other properties
    });
  }

  return cases;
}
```

### Rule 3: Scenario Tag Extraction

**Pattern**: Parse JSDoc comments for `@testScenario` tags

**Algorithm**:
```typescript
function extractTestScenarios(fileContent: string, filePath: string): TestScenario[] {
  const scenarios: TestScenario[] = [];
  const jsdoc = parseJSDoc(fileContent);

  for (const tag of jsdoc.tags) {
    if (tag.tag === 'testScenario') {
      const scenarioId = generateTestId(tag.value, filePath, 'test-scenario');

      scenarios.push({
        id: scenarioId,
        name: tag.value,
        type: 'test-scenario',
        filePath,
        line: tag.line,
        summary: tag.value
      });
    }
  }

  return scenarios;
}
```

### Rule 4: Ignore Lifecycle Hooks

**Pattern**: Do NOT extract `beforeEach`, `afterEach`, `beforeAll`, `afterAll`

**Reason**: Setup/teardown code is not a testable behavior, just test infrastructure

**Ignored Patterns**:
- `beforeEach(() => {})`
- `afterEach(() => {})`
- `beforeAll(() => {})`
- `afterAll(() => {})`

---

## Hierarchical Structure

### Example Test File

```typescript
/**
 * DatabaseManager tests
 * @testScenario Database initialization with schema
 * @testScenario Symbol insertion and retrieval
 */

describe('DatabaseManager', () => {
  describe('Database Initialization', () => {
    test('should create database file', () => {});
    test('should create jsonl directory', () => {});
  });

  describe('Symbol Operations', () => {
    test('should insert symbol', () => {});
    test('should retrieve symbol by ID', () => {});
  });
});
```

### Extracted Symbol Tree

```
DatabaseManager.test.ts
├── test-scenario: Database initialization with schema
├── test-scenario: Symbol insertion and retrieval
└── test-suite: DatabaseManager
    ├── test-suite: Database Initialization
    │   ├── test-case: should create database file
    │   └── test-case: should create jsonl directory
    └── test-suite: Symbol Operations
        ├── test-case: should insert symbol
        └── test-case: should retrieve symbol by ID
```

---

## Symbol ID Generation

### ID Format

**Pattern**: `{file-base}-{suite-chain}-{name}-{type}`

**Components**:
1. **file-base**: Test file name without `.test.ts` (e.g., `database-manager`)
2. **suite-chain**: Parent suite names joined (e.g., `symbol-operations`)
3. **name**: Test/suite name (e.g., `should-insert-symbol`)
4. **type**: Symbol type suffix (e.g., `test-case`)

### Examples

**Test Suite**:
```typescript
describe('DatabaseManager', () => {})
// ID: database-manager-test-suite
```

**Nested Test Suite**:
```typescript
describe('DatabaseManager', () => {
  describe('Symbol Operations', () => {})
})
// ID: database-manager-symbol-operations-test-suite
```

**Test Case**:
```typescript
describe('DatabaseManager', () => {
  describe('Symbol Operations', () => {
    test('should insert symbol', () => {})
  })
})
// ID: database-manager-symbol-operations-should-insert-symbol-test-case
```

**Test Scenario**:
```typescript
/**
 * @testScenario Database initialization with schema
 */
// ID: database-manager-database-initialization-with-schema-scenario
```

### ID Generation Algorithm

```typescript
function generateTestId(
  name: string,
  parentId: string | null,
  type: 'test-suite' | 'test-case' | 'test-scenario'
): string {
  const kebabName = toKebabCase(name);

  if (type === 'test-scenario') {
    const fileBase = extractFileBase(filePath);
    return `${fileBase}-${kebabName}-scenario`;
  }

  if (parentId) {
    // Remove type suffix from parent ID
    const parentBase = parentId.replace(/-test-suite$/, '');
    return `${parentBase}-${kebabName}-${type}`;
  }

  return `${kebabName}-${type}`;
}
```

---

## Relationships

### 1. Test Coverage (`test-coverage`)

**From**: Test case → Implementation symbol

**Detection**: Parse test code for references to implementation symbols

**Example**:
```typescript
test('should insert symbol', () => {
  const result = dbManager.insertSymbol(testSymbol, 0);
  expect(result).toBe(true);
});
```

**Relationship**:
```typescript
{
  from: 'database-manager-symbol-operations-should-insert-symbol-test-case',
  to: 'database-manager', // Class symbol
  type: 'test-coverage',
  metadata: {
    testedMethod: 'insertSymbol'
  }
}
```

### 2. Hierarchical (`contains`)

**From**: Test suite → Child suites/cases

**Detection**: Parent-child structure from AST

**Example**:
```typescript
{
  from: 'database-manager-test-suite',
  to: 'database-manager-symbol-operations-test-suite',
  type: 'contains'
}

{
  from: 'database-manager-symbol-operations-test-suite',
  to: 'database-manager-symbol-operations-should-insert-symbol-test-case',
  type: 'contains'
}
```

### 3. Scenario Coverage (`covers-scenario`)

**From**: Test case → Test scenario

**Detection**: Match test case to scenario by semantic similarity

**Example**:
```typescript
{
  from: 'database-manager-symbol-operations-should-insert-symbol-test-case',
  to: 'database-manager-symbol-insertion-and-retrieval-scenario',
  type: 'covers-scenario'
}
```

---

## Implementation Plan

### Phase 1: Type Definitions

**File**: `src/types/test-symbols.ts`

```typescript
export interface TestSymbol extends Symbol {
  type: 'test-suite' | 'test-case' | 'test-scenario';
  parentSymbol?: string; // Parent test suite ID
}

export interface TestSuite extends TestSymbol {
  type: 'test-suite';
  childSuites: string[]; // Child suite IDs
  testCases: string[]; // Test case IDs
}

export interface TestCase extends TestSymbol {
  type: 'test-case';
  testedSymbols: string[]; // Implementation symbols tested
}

export interface TestScenario extends TestSymbol {
  type: 'test-scenario';
  coveredBy: string[]; // Test case IDs covering this scenario
}
```

### Phase 2: AST Parser

**File**: `src/parser/TestSymbolParser.ts`

**Responsibilities**:
- Parse TypeScript test files using ts-morph
- Extract describe/it/test blocks
- Build hierarchical test suite structure
- Generate test symbol IDs
- Extract @testScenario tags from JSDoc

**Key Methods**:
```typescript
class TestSymbolParser {
  extractTestSymbols(filePath: string): TestSymbol[];
  extractTestSuites(ast: Node, parentId?: string): TestSuite[];
  extractTestCases(ast: Node, suiteId: string): TestCase[];
  extractTestScenarios(content: string, filePath: string): TestScenario[];
}
```

### Phase 3: FileScanner Integration

**Modification**: Remove test file exclusion from FileScanner

**File**: `src/scanner/FileScanner.ts:138`

**Before**:
```typescript
exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.spec.ts']
```

**After**:
```typescript
exclude: ['**/node_modules/**', '**/dist/**']
// Test files now included
```

### Phase 4: Build Command Integration

**File**: `src/commands/BuildCommand.ts`

**Enhancement**: Detect test files and route to TestSymbolParser

```typescript
for (const file of files) {
  if (isTestFile(file)) {
    const testSymbols = testParser.extractTestSymbols(file);
    for (const symbol of testSymbols) {
      db.insertSymbol(symbol);
    }
  } else {
    // Existing implementation code parsing
  }
}
```

### Phase 5: Relationship Extraction

**File**: `src/analyzer/TestCoverageAnalyzer.ts`

**Responsibilities**:
- Parse test code AST for implementation symbol references
- Create `test-coverage` relationships
- Create `contains` relationships for suite hierarchy
- Create `covers-scenario` relationships

### Phase 6: Validation

**Scripts**:
- `scripts/validate-test-coverage.ts` - Check all public APIs have tests
- `scripts/list-test-symbols.ts` - List all extracted test symbols
- `scripts/analyze-test-hierarchy.ts` - Visualize test suite structure

---

## Benefits

### For Developers

✅ **Test Discovery** - Find all tests for a symbol instantly
✅ **Coverage Tracking** - See which symbols lack test coverage
✅ **Test Navigation** - Jump from implementation to tests
✅ **Hierarchy Visualization** - Understand test organization

### For Documentation

✅ **Usage Examples** - Tests serve as live usage documentation
✅ **Behavior Contracts** - Tests define expected behavior
✅ **Regression Prevention** - Document edge cases in tests

### For the Project

✅ **Quality Metrics** - Measure test coverage at symbol level
✅ **Impact Analysis** - See which tests break when changing code
✅ **Test Debt** - Identify untested critical paths

---

## Related Documentation

- [[FileScanner]] - File discovery and filtering
- [[TSDoc Symbol Parser]] - Implementation code parsing
- [[Symbol]] - Base symbol type
- [[SymbolGraph]] - Symbol relationship graph
- [[CODE_REFERENCE_GUIDELINES]] - How documentation references code

---

**Last Updated**: 2025-11-16
**Status**: Proposed (Not Yet Implemented)
**Category**: Development Guidelines
