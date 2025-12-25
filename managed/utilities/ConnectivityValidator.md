---
title: ConnectivityValidator
type: utility
category: utility
status: active
canonical: true
---

# ConnectivityValidator

**Source**: `src/validator/ConnectivityValidator.ts`

## Purpose

Validate connectivity and completeness of documentation across the codebase to ensure SSOT compliance.

## Validation Strategy

### Weighted Penalty System

Different issues have different impact:
- **Untested code**: 25% penalty (critical)
- **Missing documentation**: 20% penalty
- **Orphaned symbols**: 20% penalty
- **Missing contract**: 15% penalty (public APIs)
- **Missing responsibility**: 15% penalty
- **Broken links**: 5% penalty

**Rationale**: Prioritizes high-impact issues first

## Connectivity Analysis

### Analysis Components

See implementation: ConnectivityAnalysis

**Key Properties**:
- `undocumentedSymbols`: Symbols without TSDoc comments
- `untestedSymbols`: Symbols with no test coverage
- `orphanedSymbols`: Symbols with no incoming dependencies
- `brokenLinks`: Doc links with missing targets
- `circularDeps`: Circular dependency chains
- `missingContracts`: Public APIs without @contract tag
- `missingResponsibilities`: Symbols without @responsibility tag
- `score`: Overall connectivity score (0-100)

## Validation Checks

### 1. Documentation Coverage
```typescript
const undocumented = validator.findUndocumented();
// Symbols without TSDoc comments
```

### 2. Test Coverage
```typescript
const untested = validator.findUntested();
// Symbols with no test files
```

### 3. Orphaned Symbols
```typescript
const orphans = validator.findOrphans();
// Symbols with no incoming dependencies
// Potential dead code
```

### 4. Broken Links
```typescript
const brokenLinks = validator.validateLinks();
// Doc→Code links with missing targets
// Code→Doc links with missing files
```

### 5. Circular Dependencies
```typescript
const cycles = validator.detectCircularDeps();
// A → B → C → A
```

### 6. Contract Validation
```typescript
const noContract = validator.findMissingContracts();
// Public APIs without @contract tag
```

### 7. Responsibility Validation
```typescript
const noResponsibility = validator.findMissingResponsibilities();
// Symbols without @responsibility tag
```

## Score Calculation

### Perfect Score (100)
- All symbols documented
- All symbols tested
- No orphaned code
- All links valid
- No circular dependencies
- All public APIs have contracts

### Scoring Formula
```
score = 100
  - (undocumented% × 20)
  - (untested% × 25)
  - (orphaned% × 20)
  - (missingContract% × 15)
  - (missingResponsibility% × 15)
  - (brokenLinks% × 5)
```

### Example Scores

- **90-100**: Excellent
- **80-89**: Good
- **70-79**: Fair
- **60-69**: Poor
- **<60**: Critical

## Detailed Validation Report

See implementation: DetailedValidationReport

**Key Properties**:
- `overallScore`: Overall connectivity score (0-100)
- `issues`: All validation issues found
- `groupedByFile`: Issues grouped by file path
- `groupedByType`: Issues grouped by type
- `summary`: Issue counts by severity (error, warning, info)

## Usage

### Full Analysis
```bash
tsdoc-edge validate
# Runs all connectivity checks
# Shows detailed report
```

### Specific Checks
```bash
# Test coverage only
tsdoc-edge untested

# Orphaned symbols only
tsdoc-edge orphans

# Link validation only
tsdoc-edge check-links
```

## Integration

### Pre-commit Hook
- Validates changed files only
- Blocks on critical issues
- Warns on moderate issues

### CI/CD Pipeline
- Full validation on PR
- Fails build if score < threshold
- Generates coverage report

## Symbol Count

1 class

## Related

- [[SymbolGraphBuilder]]: Provides graph data
- SymbolSearchEngine: Finds problematic symbols
- [[ValidateCommand]]: CLI validation

---

## Backlinks

### Referenced By

- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:238
- [[CoreWorkflow]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/core-workflow.md:129
- [[ValidationFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/validation-features.md:109

