---
title: Test Relationships
type: type
category: types
status: active
canonical: true
---

# [[TestRelationships]]

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

### TestRelationshipsCommand
```bash
tsdoc-edge test-relationships
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
# Reports documentation.symbol coverage; it does not include Istanbul execution coverage
```

## Symbol Count

5 interfaces

## Related

- [[UntestedCommand]]: Analyze test relationships
- [[UntestedCommand]]: Show test coverage
- [[CoverageReportCommand]]: Coverage metrics

---

## Backlinks

### Referenced By

- [[Types Index]] → managed/types/index.md:20

### Implemented By

- TestRelationships → src/types/analysis/test-relationships.ts:1
- TestSymbolUsage → src/types/analysis/test-relationships.ts:15
- ImportedSymbol → src/types/analysis/test-relationships.ts:29
- UsagePattern → src/types/analysis/test-relationships.ts:45
- VerifiedRelationship → src/types/analysis/test-relationships.ts:68
- RelationshipEvidence → src/types/analysis/test-relationships.ts:86
- RelationshipCoverage → src/types/analysis/test-relationships.ts:100
- UnverifiedRelationship → src/types/analysis/test-relationships.ts:124
- TestRelationshipAnalysis → src/types/analysis/test-relationships.ts:144

