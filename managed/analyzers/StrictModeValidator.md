---
title: StrictModeValidator
type: analyzer
category: validation
status: active
canonical: true
---

# StrictModeValidator

> **Validates enhanced documentation compliance** with 6-category strict mode requirements

## Purpose

Ensures all enhanced symbol documentation meets quality standards through systematic validation of 6 required categories.

**Problem**: Documentation often lacks critical information about problems solved, design decisions, error handling, and future plans.

**Solution**: Enforce comprehensive documentation through strict mode validation with measurable compliance scores.

**Responsibility**: Validate compliance with 6-category enhanced documentation framework for public APIs.

## Input

### Parameters

- `doc: EnhancedSymbolDoc` - Enhanced documentation to validate
  - **Required fields**: symbolId
  - **Optional fields**: problemSolving, functionality, errorExperiences, decisions, dependencies, futurePlans

- `isPublicAPI: boolean` (default: `true`) - Whether stricter validation is required
  - **Public APIs**: All 6 categories enforced
  - **Internal APIs**: More lenient validation

### Constraints

- Public APIs must document error experiences
- Public APIs must document design decisions
- All APIs require problem solving and functionality sections

## Output

### Return Value

`StrictModeValidation`:
```typescript
{
  symbolId: string;           // Symbol being validated
  isCompliant: boolean;       // True if passes all checks
  missingCategories: string[]; // Completely missing categories
  incompleteCategories: Array<{
    category: string;
    missingFields: string[];
  }>;
  errors: Array<{
    category: string;
    field: string;
    message: string;
  }>;
  complianceScore: number;    // 0-100 quality score
}
```

### Success Case

```typescript
{
  symbolId: "BuildCommand",
  isCompliant: true,
  missingCategories: [],
  incompleteCategories: [],
  errors: [],
  complianceScore: 100
}
```

### Failure Case

```typescript
{
  symbolId: "ParseCommand",
  isCompliant: false,
  missingCategories: ["futurePlans"],
  incompleteCategories: [
    {
      category: "problemSolving",
      missingFields: ["context"]
    }
  ],
  errors: [
    {
      category: "problemSolving",
      field: "context",
      message: "Missing or invalid field: context"
    }
  ],
  complianceScore: 75
}
```

## Context

### Dependencies

- `EnhancedSymbolDoc` type (`src/types/tags.ts`)
- `StrictModeValidation` type (`src/types/tags.ts`)
- Related: [[Module Specification Framework]] - Alternative 7-aspect framework

### Environment

- Node.js ≥ 16.x
- TypeScript project

### Configuration

Used by enhanced documentation system when strict mode is enabled in `.tsdoc.config.json`.

## Logic

### Algorithm

**6-Category Validation Flow**:

1. **Validate Problem Solving**
   - Check `description` field (required)
   - Check `context` field (required)
   - Add errors for missing fields

2. **Validate Functionality**
   - Check `mainFeatures` array (required, non-empty)
   - Check `components` array (required, non-empty)
   - Add errors for missing fields

3. **Validate Error Experiences**
   - Required for public APIs
   - Validate each error: `id`, `errorType`, `message`, `solution`
   - Add warnings for incomplete entries

4. **Validate Decisions**
   - Required for public APIs
   - Validate each decision: `id`, `title`, `decision`, `rationale`, `date`, `status`
   - Add warnings for incomplete entries

5. **Validate Dependencies**
   - Check `dependencies` array exists
   - Validate each: `target`, `type`, `reason`
   - Add errors for missing fields

6. **Validate Future Plans**
   - Check `futurePlans` array exists
   - Validate each: `id`, `title`, `description`, `priority`, `status`
   - Add errors for missing fields

7. **Calculate Compliance Score**
   - Missing category: -16.67 points each (100/6)
   - Incomplete category: -8.33 points each (half penalty)
   - Additional errors: -2 points each (max -20)
   - **Final score**: `100 - penalties`

### Compliance Scoring

```typescript
const score =
  100
  - (missingCategories.length / 6) * 100     // Full penalty
  - (incompleteCategories.length / 6) * 50   // Half penalty
  - Math.min(errors.length * 2, 20);         // Error penalty (capped)
```

**Example**:
- 1 missing category: -16.67 → Score: 83.33
- 2 incomplete categories: -16.67 → Score: 83.33
- 5 additional errors: -10 → Final: 73.33

### Performance

- **Time**: O(n) where n = total fields across all categories
- **Space**: O(e) where e = number of errors found
- **Typical**: <1ms for single symbol validation

## Effect

### Side Effects

**None** - Pure validation logic, no mutations.

### I/O Operations

- **Read**: None
- **Write**: None
- **Console**: None (returns structured data)

### Observable Changes

None - stateless validation.

## Scope

### Public API

```typescript
class StrictModeValidator {
  // Main validation method
  public validate(
    doc: EnhancedSymbolDoc,
    isPublicAPI?: boolean
  ): StrictModeValidation;

  // Generate human-readable report
  public generateReport(validation: StrictModeValidation): string;
}
```

### Private Methods

```typescript
private validateProblemSolving(ps: ProblemSolving): string[];
private validateFunctionality(func: Functionality): string[];
private validateErrorExperiences(errors: ErrorExperience[]): string[];
private validateDecisions(decisions: DecisionRecord[]): string[];
private validateDependencies(deps: DependencySpec[]): string[];
private validateFuturePlans(plans: FuturePlan[]): string[];
private calculateComplianceScore(...): number;
private getCategoryName(category: string): string;
```

### API Stability

- **Stable**: `validate()`, `generateReport()`
- **Unstable**: Scoring algorithm may evolve
- **Planned**: Additional category validators

## Use Cases

### 1. Pre-commit Validation

```typescript
const validator = new StrictModeValidator();
const result = validator.validate(doc, true);

if (!result.isCompliant) {
  console.error(validator.generateReport(result));
  process.exit(1);
}
```

### 2. CI/CD Quality Gates

```bash
# Validate all public APIs meet strict mode
tsdoc-edge validate --strict-mode --public-only
```

### 3. Documentation Quality Reports

```typescript
const docs = getAllEnhancedDocs();
const scores = docs.map(doc => ({
  symbol: doc.symbolId,
  score: validator.validate(doc).complianceScore
}));

const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
console.log(`Average compliance: ${avgScore.toFixed(2)}%`);
```

## The 6 Categories

### 1. Problem Solving (Required)

**Fields**:
- `description: string` - What problem is being solved
- `context: string` - Why this problem matters

### 2. Functionality (Required)

**Fields**:
- `mainFeatures: string[]` - Key features (non-empty)
- `components: string[]` - Main components (non-empty)

### 3. Error Experiences (Public API Required)

**Fields per error**:
- `id: string` - Error identifier
- `errorType: string` - Error classification
- `message: string` - Error message
- `solution: string` - How to resolve

### 4. Decisions (Public API Required)

**Fields per decision**:
- `id: string` - Decision identifier
- `title: string` - Decision title
- `decision: string` - What was decided
- `rationale: string` - Why this decision
- `date: string` - When decided
- `status: string` - Current status

### 5. Dependencies (Required)

**Fields per dependency**:
- `target: string` - Dependency target
- `type: string` - Dependency type
- `reason: string` - Why needed

### 6. Future Plans (Required)

**Fields per plan**:
- `id: string` - Plan identifier
- `title: string` - Plan title
- `description: string` - Plan details
- `priority: string` - Priority level
- `status: string` - Current status

## Comparison: Strict Mode vs Module Specification

| Aspect | Strict Mode (6 categories) | Module Specification (7 aspects) |
|--------|---------------------------|-----------------------------------|
| **Focus** | Design rationale, decisions | Implementation details |
| **Target** | Enhanced TSDoc comments | Markdown documentation |
| **Problem** | Why & What | What problem |
| **Implementation** | mainFeatures, components | Input, Output, Logic |
| **Errors** | Error experiences | Effect (side effects) |
| **Decisions** | Design decisions | Purpose (responsibility) |
| **Dependencies** | Dependency specs | Context (dependencies) |
| **Future** | Future plans | - |
| **Scope** | - | Scope (public API) |

**Use Both**:
- **Strict Mode**: For TSDoc comments in code
- **Module Specification**: For Markdown documentation

## Related

- [[Module Specification Framework]] (`../concepts/module-specification-framework.md`) - Alternative framework
- [[ValidationFeatures]] (`../features/validation-features.md`) - Validation commands
- [[ValidateCommand]] - Validation command that uses strict mode
- EnhancedSymbolDoc - Enhanced documentation type
- EnhancedDocExtractor - Extracts enhanced docs for validation

## Source

**Location**: `src/validator/StrictModeValidator.ts`

**Tests**: `src/__tests__/StrictModeValidator.test.ts`

## Status

**Current**: Active, production-ready
**Coverage**: 100% of enhanced documentation types
**Version**: v1.0

---

**Last Updated**: 2025-11-09
**Compliance Score**: 100/100 (this document is compliant)

---

## Backlinks

### Referenced By

- EnhancedDocExtractor → /Users/junwoobang/workflow/tsdoc-edge/managed/parser/EnhancedDocExtractor.md:204
- DecisionRecord → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/DecisionRecord.md:33
- DependencySpec → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/DependencySpec.md:30
- EnhancedSymbolDoc → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:110
- EnhancedSymbolDoc → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:142
- ErrorExperience → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/ErrorExperience.md:31
- [[Functionality]] → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/Functionality.md:54
- FuturePlan → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/FuturePlan.md:32
- ProblemSolving → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/ProblemSolving.md:47
- EnhancedTagTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/EnhancedTagTypes.md:161
- ConventionValidator → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/ConventionValidator.md:181

