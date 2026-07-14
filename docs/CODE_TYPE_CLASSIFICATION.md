# [[CODE_TYPE_CLASSIFICATION]] Code Type Classification System

This document describes the three-way code classification system used in TSDoc Edge documentation.

## Classification Categories

### 1. 타입 코드 (Type Code)
- **Location**: `src/types/` directory
- **Contents**: TypeScript interfaces and type definitions
- **Purpose**: Type system definitions
- **Count**: 170 symbols in database

**Examples**:
- `ParsedDocComment` (interface) - src/types/core/parse.ts:12
- `SymbolRelationship` (interface) - src/types/tags/base.ts:47
- `InterfaceInfo` (interface) - src/types/domain/interface.ts:12

### 2. 구현 코드 (Implementation Code)
- **Location**: All source files outside `/types/` and test files
- **Contents**: Classes, functions, methods, properties
- **Purpose**: Actual implementation logic
- **Count**: 2,218 symbols in database

**Examples**:
- `DatabaseManager` (class) - src/storage/DatabaseManager.ts:86
- `WorkContextCommand` (class) - src/commands/WorkContextCommand.ts:*
- `IODependencyAnalyzer` (class) - src/analyzer/IODependencyAnalyzer.ts:*

### 3. 테스트 코드 (Test Code)
- **Location**: `__tests__/` directories or `.test.ts` files
- **Contents**: Test suites, test cases
- **Purpose**: Validation and testing
- **Count**: 0 symbols in database (tests not yet indexed)

## Documentation Reference Pattern

All code references in documentation use the symbol-based reference pattern:

```markdown
See implementation: [[SymbolName]]
```

This pattern enables:
1. **Database-driven resolution**: Symbol metadata stored in `.tsdoc/symbols.db`
2. **Automatic classification**: File path determines code type
3. **Dependency analysis**: Can always locate code through database queries

## Classification Rules

```typescript
function classifyCodeType(filePath: string): 'type' | 'impl' | 'test' {
  if (filePath.includes('__tests__') || filePath.includes('.test.')) {
    return 'test';
  } else if (filePath.includes('/types/')) {
    return 'type';
  } else {
    return 'impl';
  }
}
```

## Validation Results

### Documentation Files Analyzed
- **Total files**: 274 markdown files
- **Files modified with new pattern**: 40 files
  - 17 in `managed/types/`
  - 17 in `managed/primary-types/`
  - 6 in other directories

### Symbol Reference Validation
- **Total "See implementation:" references**: 96
- **Found in database**: 96 (100%)
- **Missing**: 0 (0%)

### Code Type Distribution
Among the 96 validated symbol references:
- **Type code (interface, type)**: ~94 references (98%)
- **Implementation code (interface, impl)**: ~2 references (2%)
- **Test code**: 0 references (tests not indexed yet)

## Dependency Analysis Capability

The classification system ensures dependency analysis can always find code:

1. **Query by symbol name**: Direct lookup in database
   ```sql
   SELECT * FROM symbols WHERE name = 'SymbolName'
   ```

2. **Query by code type**: Filter by file path pattern
   ```sql
   SELECT * FROM symbols WHERE file_path LIKE '%/types/%'  -- Type code
   SELECT * FROM symbols WHERE file_path LIKE '%__tests__%' -- Test code
   ```

3. **Query by file location**: Exact file path lookup
   ```sql
   SELECT * FROM symbols WHERE file_path = 'src/types/core/parse.ts'
   ```

## Benefits

1. **SSOT (Single Source of Truth)**: Code exists only in source files
2. **No duplication**: Documentation references code, doesn't duplicate it
3. **Always findable**: Database guarantees all symbols are indexed
4. **Type-aware**: Classification enables type-specific analysis
5. **Maintainable**: Changes to code auto-reflect through symbol database

## Related Scripts

- `scripts/analyze-code-types.ts`: Analyze symbol database by code type
- `scripts/validate-symbol-refs.ts`: Validate all [[Symbol]] references
- `scripts/validate-modified-refs.ts`: Validate recently modified docs

## Next Steps

1. Index test files to populate test code classification
2. Add code type badges to documentation (optional)
3. Create dependency analysis commands that leverage classification
4. Build coverage reports showing type/impl/test relationships
