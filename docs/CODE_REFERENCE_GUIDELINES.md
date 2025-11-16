# Code Reference Guidelines

> **SSOT Principle**: Code definitions exist only in source files. Documentation references code through symbols.

This document describes how documentation files reference code implementations in the TSDoc Edge project.

## Table of Contents

1. [Core Principle](#core-principle)
2. [Reference Patterns](#reference-patterns)
3. [Code Block Guidelines](#code-block-guidelines)
4. [Code Type Classification](#code-type-classification)
5. [Validation](#validation)
6. [Examples](#examples)

---

## Core Principle

### Single Source of Truth (SSOT)

**Rule**: Code definitions exist in ONE place only - the source code.

**Documentation Role**:
- Explain purpose, context, and usage
- Reference implementations via symbols
- Provide examples and workflows
- **NOT** duplicate interface/type definitions

**Why**:
- Eliminates synchronization problems
- Reduces documentation maintenance burden
- Single authoritative source for type definitions
- Database-driven resolution prevents broken references

---

## Reference Patterns

### 1. Symbol Reference Pattern

**Format**: `[[SymbolName]]`

**Usage**: Link to another documented symbol or concept

**Examples**:
```markdown
This component uses [[DatabaseManager]] for persistence.
See [[SymbolGraph]] for the underlying data structure.
Implements the [[ModuleSpec]] framework.
```

**Resolution**:
- Searches `.tsdoc/symbols.db` for matching symbol
- Resolves to exact file path and line number
- Enables click-through navigation

### 2. Implementation Reference Pattern

**Format**:
```markdown
See implementation: [[SymbolName]]

**Key Properties**:
- `propertyName`: Description
- `anotherProperty`: Description
```

**Usage**: Replace code blocks with concise property descriptions

**Before** (Redundant):
```markdown
```typescript
interface UserService {
  getUser(id: string): Promise<User>;
  createUser(data: CreateUserData): Promise<User>;
  updateUser(id: string, data: UpdateUserData): Promise<User>;
  deleteUser(id: string): Promise<void>;
}
```
```

**After** (SSOT):
```markdown
See implementation: [[UserService]]

**Key Methods**:
- `getUser(id)`: Retrieve user by ID
- `createUser(data)`: Create new user
- `updateUser(id, data)`: Update existing user
- `deleteUser(id)`: Delete user
```

### 3. Inline Symbol Reference

**Format**: Use symbol names inline with backticks

**Examples**:
```markdown
The `UserService` extends [[BaseService]] and implements `IUserService`.
Returns a [[ValidationResult]] indicating success or failure.
```

---

## Code Block Guidelines

### When to KEEP Code Blocks

✅ **Keep** code blocks for:

1. **Usage Examples**
   ```typescript
   // Good: Shows how to use the API
   const manager = new DatabaseManager();
   const symbol = manager.getSymbol('user-service');
   ```

2. **Configuration Examples**
   ```json
   // Good: Shows configuration structure
   {
     "paths": {
       "src": "src/",
       "docs": "managed/"
     }
   }
   ```

3. **Algorithm Explanations**
   ```typescript
   // Good: Illustrates complex logic
   function calculateScore(metrics: Metrics): number {
     return (metrics.docQuality * 0.5) + (metrics.testCoverage * 0.5);
   }
   ```

4. **Design Proposals**
   ```typescript
   // Good: Proposes new API design
   interface ProposedAPI {
     // New feature: batch operations
     batchUpdate(ids: string[], data: UpdateData): Promise<Result[]>;
   }
   ```

5. **Workflow Demonstrations**
   ```typescript
   // Good: Shows multi-step process
   const extractor = new ASTSymbolExtractor();
   const result = extractor.extract('src/');
   const builder = new SymbolGraphBuilder();
   builder.buildFromResult(result);
   ```

### When to REMOVE Code Blocks

❌ **Remove** code blocks for:

1. **Interface/Type Definitions** (Already in src/)
   ```typescript
   // Bad: Duplicates src/types/graph/graph.ts
   interface Symbol {
     id: string;
     name: string;
     type: SymbolType;
     // ...
   }
   ```
   **Replace with**: `See implementation: [[Symbol]]`

2. **Class Implementations** (Already in src/)
   ```typescript
   // Bad: Duplicates src/storage/DatabaseManager.ts
   class DatabaseManager {
     constructor(dbPath: string) { /* ... */ }
     getSymbol(id: string): Symbol | null { /* ... */ }
   }
   ```
   **Replace with**: `See implementation: [[DatabaseManager]]`

3. **Enum Definitions** (Already in src/)
   ```typescript
   // Bad: Duplicates source
   enum SymbolType {
     FUNCTION = 'function',
     CLASS = 'class',
     // ...
   }
   ```
   **Replace with**: `See implementation: [[SymbolType]]`

4. **Type Aliases** (Already in src/)
   ```typescript
   // Bad: Duplicates source
   type RelationshipType =
     | 'code-dependency'
     | 'inheritance'
     | 'implementation';
   ```
   **Replace with**: `See implementation: [[RelationshipType]]`

---

## Code Type Classification

All code is classified into 3 categories for dependency analysis:

### 1. 타입 코드 (Type Code)

**Location**: `src/types/` directory

**Contents**: TypeScript interfaces, types, enums

**Count**: 170 symbols (7% of total)

**Examples**:
- `src/types/graph/graph.ts` - Symbol, SymbolGraph
- `src/types/relationships/unified.ts` - UnifiedRelationship
- `src/types/config/config.ts` - TsdocEdgeConfig

**Reference Pattern**:
```markdown
See implementation: [[SymbolGraph]]

**Properties**:
- `symbols`: Map of all symbols (indexed by ID)
- `relationships`: All relationship edges
```

### 2. 구현 코드 (Implementation Code)

**Location**: All src/ files except types/ and tests/

**Contents**: Classes, functions, actual implementations

**Count**: 2,218 symbols (93% of total)

**Examples**:
- `src/storage/DatabaseManager.ts` - DatabaseManager class
- `src/graph/SymbolGraphBuilder.ts` - SymbolGraphBuilder class
- `src/analyzer/CodeHealthChecker.ts` - CodeHealthChecker class

**Reference Pattern**:
```markdown
See implementation: [[DatabaseManager]]

**Core Methods**:
- `insertSymbol(symbol)`: Store symbol in database
- `getSymbol(id)`: Retrieve symbol by ID
```

### 3. 테스트 코드 (Test Code)

**Location**: `__tests__/` directories or `.test.ts` files

**Contents**: Test suites, test cases, test scenarios

**Count**: 0 (not yet indexed - implementation pending)

**Symbol Types**:
- `test-suite`: describe() blocks
- `test-case`: it() or test() blocks
- `test-scenario`: @testScenario JSDoc tags

**Current Status**: Test files are excluded by FileScanner configuration

**Reason**: FileScanner excludes test patterns by default:
```typescript
// src/scanner/FileScanner.ts:138
exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.spec.ts']
```

**Test Files Available** (19 files in `src/__tests__/`):
- ASTSymbolExtractor.test.ts
- CodeHealthChecker.test.ts
- ConnectivityValidator.test.ts
- DatabaseManager.test.ts
- DocumentSymbolParser.test.ts
- RelationshipIndex.test.ts
- SymbolGraphBuilder.test.ts
- SymbolRegistry.test.ts
- TSDocSymbolParser.test.ts
- (and 10 more)

**Implementation Plan**: See [[TEST_SYMBOL_EXTRACTION]] for detailed extraction strategy

**Key Features** (When Implemented):
- Hierarchical test suite structure (describe nesting)
- Test coverage relationships (test → implementation)
- Test scenario tracking (@testScenario tags)
- Usage example extraction from test code

**To Enable Test Indexing**:
1. Modify FileScanner to include test files
2. Implement TestSymbolParser (see docs/TEST_SYMBOL_EXTRACTION.md)
3. Rebuild database with `tsdoc-edge build src --force`

---

## Validation

### Automated Validation Scripts

**1. Validate All Symbol References**
```bash
npx ts-node scripts/validate-symbol-refs.ts
```
Checks all `[[Symbol]]` references across documentation

**2. Validate Recent Changes**
```bash
npx ts-node scripts/validate-recent-changes.ts
```
Validates only recently modified files

**3. Check for Duplicates**
```bash
npx ts-node scripts/check-symbol-duplicates.ts
```
Finds duplicate code block definitions

**4. Analyze Code Types**
```bash
npx ts-node scripts/analyze-code-types.ts
```
Shows distribution of Type/Implementation/Test code

### Validation Results

**Target**: 100% valid symbol references

**Current Status** (as of 2025-11-16):
- Total "See implementation:" references: 29
- Found in database: 29 (100%)
- Missing: 0 (0%)

✅ All symbol references are valid!

---

## Examples

### Example 1: Type Documentation

**File**: `managed/types/Symbol.md`

**Before**:
```markdown
## Structure

```typescript
interface Symbol {
  id: string;
  name: string;
  type: SymbolType;
  filePath: string;
  line: number;
  column: number;
  isExported: boolean;
  isPublic: boolean;
  summary?: string;
  tests: string[];
  designDecisions: string[];
}
```
```

**After**:
```markdown
## Structure

See implementation: [[Symbol]]

**Core Properties**:
- `id`: Unique identifier (kebab-case)
- `name`: Symbol name as appears in code
- `type`: Symbol type (function, class, interface, etc.)
- `filePath`: Source file path
- `line`, `column`: Location in file
- `isExported`: Whether symbol is exported
- `isPublic`: Whether symbol is public (@public tag)
- `summary`: TSDoc summary (optional)
- `tests`: Related test files
- `designDecisions`: Related design decisions
```

### Example 2: Utilities Documentation

**File**: `managed/utilities/SymbolSearchEngine.md`

**Before**:
```markdown
## Query Interface

```typescript
interface SymbolQuery {
  namePattern?: string;
  type?: SymbolType[];
  filePath?: string;
  isPublic?: boolean;
  hasDoc?: boolean;
  hasTests?: boolean;
  hasContract?: boolean;
  hasResponsibility?: boolean;
  dependencies?: string[];
  dependents?: string[];
}
```
```

**After**:
```markdown
## Query Interface

See implementation: [[SymbolQuery]]

**Key Properties**:
- `namePattern`: Regex pattern for symbol names
- `type`: Filter by symbol types (function, class, etc.)
- `filePath`: File path pattern
- `isPublic`: Public API only?
- `hasDoc`: Documented symbols only?
- `hasTests`: Tested symbols only?
- `hasContract`: Has @contract tag?
- `hasResponsibility`: Has @responsibility tag?
- `dependencies`: Must depend on these symbols
- `dependents`: Must be used by these symbols
```

### Example 3: Relationship Documentation

**File**: `managed/relationships/STANDARD-FORMAT.md`

**Before**:
```markdown
## Type Definitions

```typescript
type RelationshipType =
  | 'code-dependency'
  | 'inheritance'
  | 'implementation'
  | 'io-dependency'
  // ... 23 more types
```
```

**After**:
```markdown
## Type Definitions

See implementation: [[RelationshipType]]

**27 Relationship Types**:

1. **Structural** (3): code-dependency, inheritance, implementation
2. **Data Flow** (3): io-dependency, pipeline, event-flow
3. **Behavioral** (5): calls, callback, collaboration, composition, temporal-order
4. **Alternative** (2): substitution, fallback
5. **Constraint** (3): mutual-exclusion, co-requirement, circular-dependency
6. **Semantic** (4): conceptual-relation, feature-grouping, doc-reference, enhancement
7. **Verification** (2): test-coverage, integration-verification
8. **Type System** (2): type-dependency, generic-constraint
9. **Architectural** (2): layer-dependency, module-boundary
```

---

## Database-Driven Resolution

All symbol references are resolved through the SQLite database:

**Database**: `.tsdoc/symbols.db`

**Schema**:
```sql
CREATE TABLE symbols (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  line INTEGER NOT NULL,
  column INTEGER NOT NULL,
  is_exported INTEGER NOT NULL,
  is_public INTEGER NOT NULL,
  summary TEXT
);
```

**Query Example**:
```typescript
const symbol = db.getSymbol('database-manager');
// Returns: {
//   id: 'database-manager',
//   name: 'DatabaseManager',
//   type: 'class',
//   filePath: 'src/storage/DatabaseManager.ts',
//   line: 86,
//   ...
// }
```

**Benefits**:
- Fast lookups (O(log n) with indexes)
- Guaranteed consistency
- Automatic validation
- Version control friendly (JSONL backup)

---

## Migration Path

### For Existing Documentation

1. **Identify Code Blocks**: Run `scripts/find-code-blocks.ts`
2. **Check if in Source**: Run `scripts/extract-interfaces-from-docs.ts`
3. **Replace with References**: Use "See implementation: [[Symbol]]" pattern
4. **Add Key Properties**: List only essential properties with descriptions
5. **Validate**: Run `scripts/validate-symbol-refs.ts`

### For New Documentation

1. **Start with Purpose**: Explain why the symbol exists
2. **Reference Implementation**: Use `[[Symbol]]` pattern
3. **Highlight Key Aspects**: List important properties/methods
4. **Provide Usage**: Show practical examples
5. **Never Duplicate**: Don't copy definitions from source

---

## Benefits

### For Developers

✅ **Single authoritative source** - No confusion about which definition is correct
✅ **Always up-to-date** - Changes to code automatically reflect in references
✅ **Fast navigation** - Click through to exact source location
✅ **Better search** - Find all references to a symbol instantly

### For Documentation

✅ **Reduced maintenance** - No need to sync documentation with code changes
✅ **Smaller files** - 30%+ reduction in documentation size
✅ **Clearer focus** - Documentation explains "why" not "what"
✅ **Validated references** - 100% of symbols guaranteed to exist

### For the Project

✅ **Enforces SSOT** - Architectural principle becomes practical reality
✅ **Scalable** - Works for projects of any size
✅ **Git-friendly** - Fewer merge conflicts, cleaner diffs
✅ **Automated QA** - Validation scripts catch broken references

---

## Related Documentation

- [[CODE_TYPE_CLASSIFICATION]] - Details on 3-way code classification
- [[Symbol]] - Core symbol type definition
- [[DatabaseManager]] - Symbol database management
- [[DocumentSymbolParser]] - `[[Symbol]]` syntax parser
- [[SymbolSearchEngine]] - Symbol query and search

---

**Last Updated**: 2025-11-16
**Status**: Active
**Category**: Development Guidelines
