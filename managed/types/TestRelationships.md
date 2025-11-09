# [[TestRelationships]]

**Source**: `src/types/analysis/test-relationships.ts`

## Purpose

Type system for test-code relationship analysis and verification.

## Test Symbol Usage

Tracks how production symbols are used in tests:
```typescript
interface TestSymbolUsage {
  testFilePath: string;
  importedSymbols: ImportedSymbol[];
  usagePatterns: UsagePattern[];
}
```

## Imported Symbol

Symbol imported from production code into test:
```typescript
interface ImportedSymbol {
  symbolName: string;      // Name as imported
  symbolId: string | null; // Resolved ID
  fromModule: string;      // Module path
  line: number;            // Import line
}
```

## Usage Pattern

How symbol is used in test code:
```typescript
interface UsagePattern {
  symbolId: string;
  lineNumber: number;
  usageType: 'import' | 'instantiation' | 'method-call'
           | 'dependency-injection' | 'property-access';
  codeSnippet?: string;
  relatedSymbols?: string[];
}
```

### Usage Types

- **import**: Symbol imported but not used yet
- **instantiation**: `new ClassName()`
- **method-call**: `object.method()`
- **dependency-injection**: Passed as constructor/method argument
- **property-access**: `object.property`

## Verified Relationship

Relationship confirmed by test evidence:
```typescript
interface VerifiedRelationship {
  source: string;          // Source symbol ID
  target: string;          // Target symbol ID
  verifiedBy: string;      // Test file path
  strength: 'weak' | 'medium' | 'strong';
  evidence: RelationshipEvidence[];
}
```

### Verification Strength

- **Strong**: Multiple test cases, explicit assertions
- **Medium**: Single test case, clear usage
- **Weak**: Import only, no direct usage

## Relationship Evidence

Proof of relationship in test:
```typescript
interface RelationshipEvidence {
  lineNumber: number;
  codeSnippet: string;
  pattern: 'dependency-injection' | 'method-call'
         | 'property-access' | 'co-occurrence';
}
```

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
