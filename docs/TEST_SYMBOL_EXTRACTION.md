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

### Phase 1: Type Definitions ✅

**Status**: Implemented

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

### Phase 2: AST Parser ✅

**Status**: Implemented

**File**: `src/parser/TestSymbolParser.ts` (566 lines)

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

### Phase 3: FileScanner Integration ✅

**Status**: Implemented

**Modification**: Remove test file exclusion from FileScanner

**File**: `src/scanner/FileScanner.ts`

**Before**:
```typescript
exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.spec.ts']
```

**After**:
```typescript
exclude: ['**/node_modules/**', '**/dist/**']
// Test files now included
```

### Phase 4: Build Command Integration ✅

**Status**: Implemented

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

### Phase 5: Relationship Extraction ✅

**Status**: Implemented

**File**: `src/analyzer/TestCoverageAnalyzer.ts` (376 lines)

**Responsibilities**:
- Parse test code AST for implementation symbol references
- Create `test-coverage` relationships
- Create `contains` relationships for suite hierarchy
- Create `covers-scenario` relationships

### Phase 6: Validation and Utility Tools ✅

**Status**: Implemented

**Scripts Created**:

1. **`scripts/validate-test-coverage.ts`** - Test Coverage Validator
   - Finds public APIs without test coverage
   - Shows tested vs untested symbols
   - Groups by symbol type (classes, functions, interfaces)
   - Provides coverage percentage and recommendations

2. **`scripts/find-untested-symbols.ts`** - Priority-Based Untested Symbol Finder
   - Prioritizes untested symbols by criticality
   - Scoring based on: type, module, export status, naming patterns
   - Groups by module with average priority
   - Recommends which symbols to test first

3. **`scripts/visualize-test-hierarchy.ts`** - Test Hierarchy Visualizer
   - Tree-based visualization of test suite structure
   - Shows parent-child relationships
   - Displays test scenarios, suites, and cases
   - Analyzes nesting depth and test distribution

4. **`scripts/check-test-symbols.ts`** - Database Statistics
   - Symbol counts by type
   - Sample test symbols from database
   - Validates symbol extraction

5. **`scripts/check-test-relationships.ts`** - Relationship Validation
   - Test-coverage relationship statistics
   - Contains relationship validation
   - Most tested symbols report

### Phase 7: Import-Based Symbol Resolution ✅

**Status**: Implemented

**Problem**: Phase 6 revealed only 0.4% public symbol coverage (2/496 symbols) due to strict variable name matching.

**Solution**: Analyze import statements in test files to determine which symbols are being tested, regardless of variable names used internally.

**Implementation**:

1. **`src/analyzer/ImportAnalyzer.ts`** (240 lines)
   - Parses TypeScript import statements using ts-morph
   - Extracts imported symbols with their local names and module paths
   - Resolves imports to potential symbol IDs (e.g., `FileScanner` → `file-scanner`, `class-filescanner`)
   - Filters type-only imports (not actual test coverage)
   - Provides import map for quick symbol lookup

2. **`src/analyzer/TestCoverageAnalyzer.ts`** - Enhanced
   - Added `matchImportedSymbols()` method
   - Dual-strategy symbol matching:
     1. Import-based (e.g., `import { FileScanner }` → `class-filescanner`)
     2. Variable name patterns as fallback
   - Import analysis with caching for performance
   - Multi-prefix symbol ID matching (`class-`, `interface-`, `function-`)

3. **`src/__tests__/analyzer/ImportAnalyzer.test.ts`** (18 tests)
   - Tests for named imports, default imports, namespace imports
   - Type-only import filtering
   - Symbol ID resolution
   - PascalCase to kebab-case conversion

**Results**: **Massive Improvement!**

| Metric | Before (Phase 6) | After (Phase 7) | Improvement |
|--------|------------------|-----------------|-------------|
| **Public Symbol Coverage** | 0.4% (2/496) | **20.7% (103/498)** | **51x** |
| **Test Case Coverage** | 4.0% (80/1,986) | **96.7% (1,920/1,986)** | **24x** |
| **Tested Symbols** | 2 | **103** | **51.5x** |
| **Relationships** | 5,854 | **11,107** | **1.9x** |

**Top Tested Symbols**:
- SymbolRegistryManager: 194 tests
- DatabaseManager: 131 tests
- SymbolGraphBuilder: 127 tests
- CodeHealthChecker: 118 tests
- ConfigManager: 105 tests

### Phase 8: Test Scenario Relationships (covers-scenario) ✅

**Status**: Implemented

**Purpose**: Connect test cases to high-level test scenarios defined in `@testScenario` JSDoc tags.

**Implementation**:

1. **TestCoverageAnalyzer** - Added scenario matching logic
   - `matchTestCasesToScenario()` - Matches test cases to scenarios in the same file
   - `isSemanticallyRelated()` - Semantic similarity check (word overlap)
   - `calculateScenarioMatchConfidence()` - Confidence scoring based on word overlap

2. **Semantic Matching Algorithm**:
   - Normalizes scenario and test case names
   - Counts significant word matches (>3 letters)
   - Requires at least 2 matching words
   - Confidence: 0.5 + (word_overlap * 0.5)

3. **BuildCommand Integration**:
   - Inserts covers-scenario relationships into database
   - Logs scenario coverage statistics

**Example**:
```typescript
/**
 * @testScenario Database initialization with schema
 * @testScenario Symbol insertion and retrieval
 */

describe('DatabaseManager', () => {
  // These test cases automatically match to scenarios:
  it('should create database file', () => {})
    // → covers "Database initialization with schema"
  it('should insert symbol', () => {})
    // → covers "Symbol insertion and retrieval"
});
```

**Results**:
- **Scenario Coverage: 17/34 scenarios covered (50%)**
- Creates covers-scenario relationships with confidence 0.5-1.0
- Enables scenario-based test tracking

---

## Implementation Results

**Completed**: 2025-11-17 (Phases 1-8)

### Final Statistics (Phase 8)

**Test Symbols Indexed**: 2,680 total
- Test Suites: 674
- Test Cases: 1,986
- Test Scenarios: 34

**Test Files Processed**: 50+ test files in `src/__tests__/`

### Relationship Statistics

**Total Relationships**: ~11,200+
- Test-Coverage Relationships: **5,253** (test-case → implementation symbol)
- Contains Relationships: **2,489** (test hierarchy)
- Covers-Scenario Relationships: **~50** (test-case → test-scenario)
- Document Relationships: 465
- Implementation Relationships: 4,041

### Coverage Analysis

**Public Symbol Coverage**: **20.7% (103/498 symbols)**
- Tested Classes: 103
- Top tested:
  - `SymbolRegistryManager`: 194 test cases
  - `DatabaseManager`: 131 test cases
  - `SymbolGraphBuilder`: 127 test cases
  - `CodeHealthChecker`: 118 test cases
  - `ConfigManager`: 105 test cases
- Untested: 395 public symbols (79.3%)

**Test Case Coverage**: **96.7% (1,920/1,986 test cases linked to implementation)**

**Scenario Coverage**: **50% (17/34 scenarios covered)**

### Key Achievements

✅ **Import-based symbol resolution** - 51x improvement in symbol coverage
✅ **Comprehensive test extraction** - 2,680 test symbols indexed (including 34 scenarios)
✅ **High test case linkage** - 96.7% of test cases linked to implementation
✅ **Scenario tracking** - 50% of test scenarios covered by test cases
✅ **Dual-strategy matching** - Import analysis + variable name patterns
✅ **Performance optimized** - Import analysis caching, ~2.5min full build
✅ **Complete test hierarchy** - All parent-child relationships preserved
✅ **Semantic scenario matching** - Automatic test-scenario relationship extraction

### Sample Test Hierarchy

```
📄 storage/DatabaseManager.test.ts
   Test Scenarios:
   │  📋 Database initialization with schema
   │  📋 Symbol insertion and retrieval
   │
   Test Hierarchy:
   └─ 📦 DatabaseManager
      ├─ 📦 Database Initialization
      │  ├─ ✓ should create database file
      │  └─ ✓ should initialize schema
      └─ 📦 Symbol Operations
         ├─ ✓ should insert symbol
         └─ ✓ should retrieve symbol by ID
```

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

**Last Updated**: 2025-11-17
**Status**: ✅ Implemented (All 8 Phases Complete)
**Category**: Development Guidelines

**Achievements**:
- 51x improvement in test coverage detection through import-based symbol resolution
- 50% scenario coverage with semantic matching
