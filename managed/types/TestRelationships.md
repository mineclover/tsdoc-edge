# TestRelationships

**Source**: `src/types/analysis/test-relationships.ts`

## Purpose

Type system for test-code relationship analysis and verification.

## Test Symbol Usage

Tracks how production symbols are used in tests:

See implementation: TestSymbolUsage

**Key Properties**:
- `testFilePath`: Test file path
- `importedSymbols`: Imported symbols
- `usagePatterns`: Usage patterns

## Imported Symbol

Symbol imported from production code into test:

See implementation: ImportedSymbol

**Key Properties**:
- `symbolName`: Name as imported
- `symbolId`: Resolved ID (null if not resolved)
- `fromModule`: Module path
- `line`: Import line

## Usage Pattern

How symbol is used in test code:

See implementation: UsagePattern

**Key Properties**:
- `symbolId`: Symbol identifier
- `lineNumber`: Line number
- `usageType`: 'import', 'instantiation', 'method-call', 'dependency-injection', or 'property-access'
- `codeSnippet`: Code snippet (optional)
- `relatedSymbols`: Related symbols (optional)

### Usage Types

- **import**: Symbol imported but not used yet
- **instantiation**: `new ClassName()`
- **method-call**: `object.method()`
- **dependency-injection**: Passed as constructor/method argument
- **property-access**: `object.property`

## Verified Relationship

Relationship confirmed by test evidence:

See implementation: VerifiedRelationship

**Key Properties**:
- `source`: Source symbol ID
- `target`: Target symbol ID
- `verifiedBy`: Test file path
- `strength`: 'weak', 'medium', or 'strong'
- `evidence`: Relationship evidence

### Verification Strength

- **Strong**: Multiple test cases, explicit assertions
- **Medium**: Single test case, clear usage
- **Weak**: Import only, no direct usage

## Relationship Evidence

Proof of relationship in test:

See implementation: RelationshipEvidence

**Key Properties**:
- `lineNumber`: Line number
- `codeSnippet`: Code snippet
- `pattern`: 'dependency-injection', 'method-call', 'property-access', or 'co-occurrence'

### Evidence Patterns

- **dependency-injection**: `new Service(repo)` proves Service→Repo
- **method-call**: `service.save()` proves caller→Service
- **property-access**: `user.name` proves access relationship
- **co-occurrence**: Both used together, relationship unclear

## Usage in Analysis

### AnalyzeTestsCommand
```bash
tsdoc-edge analyze-tests
# Finds all test-production symbol relationships
```

### TestRelationshipsCommand
```bash
tsdoc-edge test-relationships src/services/UserService.ts
# Shows test coverage and usage patterns
```

### CoverageReportCommand
```bash
tsdoc-edge coverage-report --hierarchical
# Includes test coverage in metrics
```

## Symbol Count

5 interfaces

## Related

- [[AnalyzeTestsCommand]]: Analyze test relationships
- [[TestRelationshipsCommand]]: Show test coverage
- [[CoverageReportCommand]]: Coverage metrics
