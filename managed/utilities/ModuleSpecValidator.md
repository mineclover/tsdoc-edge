---
title: ModuleSpecValidator
type: utility
category: utility
status: active
canonical: true
---

# ModuleSpecValidator

**Source**: `src/validator/ModuleSpecValidator.ts`

## Purpose

Validate module specifications for completeness and quality against the 7-aspect framework.

## Module Specification Framework

Every module should define 7 aspects:
1. **Purpose**: Why it exists
2. **Input**: Parameters, constraints
3. **Output**: Return values, results
4. **Context**: Dependencies, environment
5. **Logic**: Algorithm, flow
6. **Effect**: Side effects, state changes
7. **Scope**: Public interface, exports

## Validation Rules

### Required Sections

- **Purpose**: Must not be "TODO" or empty
- **Input**: Parameter descriptions required
- **Output**: Return description required
- **Logic**: Algorithm description (not TODO)

### Optional Sections

- **Context**: Dependencies encouraged
- **Effect**: Side effects if applicable
- **Scope**: Public API definition

## Validation Options

See implementation: ValidationOptions

**Key Properties**:
- `minConfidence`: Minimum confidence score (0-1, default: 0.7)
- `requirePurpose`: Require purpose section (default: true)
- `requireParamDescriptions`: Require parameter docs
- `requireReturnDescription`: Require return value docs
- `requireDependencies`: Require dependency listing
- `requireLogicDescription`: Require algorithm description
- `strictMode`: Treat TODO as error

## Validation Result

See implementation: ModuleSpecValidationResult

**Key Properties**:
- `isValid`: Whether spec passes validation
- `score`: Completeness score (0-100)
- `issues`: List of validation issues
- `passed`: Sections that passed validation
- `failed`: Sections that failed validation

## Validation Issue

See implementation: ValidationIssue

**Key Properties**:
- `section`: Which section has the issue
- `severity`: 'error', 'warning', or 'info'
- `message`: Issue description
- `suggestion`: How to fix (optional)

## Scoring System

### Perfect Score (100)

All sections complete:
- Purpose: Clear and specific (20 points)
- Input: All params documented (15 points)
- Output: Return value documented (15 points)
- Context: Dependencies listed (15 points)
- Logic: Algorithm described (15 points)
- Effect: Side effects noted (10 points)
- Scope: Public API defined (10 points)

### Penalty Deductions

- Missing purpose: -20 points
- TODO markers: -5 points each
- Missing param docs: -3 points each
- Empty sections: -10 points each

## Common Issues

### Missing Purpose
```typescript
{
  section: 'Purpose',
  severity: 'error',
  message: 'Purpose section is empty or TODO',
  suggestion: 'Describe why this module exists and what problem it solves'
}
```

### Incomplete Input
```typescript
{
  section: 'Input',
  severity: 'warning',
  message: 'Parameter "userId" has no description',
  suggestion: 'Add @param tag with description'
}
```

### TODO Markers
```typescript
{
  section: 'Logic',
  severity: strictMode ? 'error' : 'warning',
  message: 'Section contains TODO marker',
  suggestion: 'Complete the logic description'
}
```

## Validation Modes

### Normal Mode
- TODOs are warnings
- Allows partial completion
- Score reflects quality

### Strict Mode
- TODOs are errors
- Blocks incomplete specs
- Enforces 100% completion

## Usage

### Validate Single Module
```bash
tsdoc-edge validate-spec src/services/UserService.ts
```

### Validate All Modules
```bash
tsdoc-edge validate
# Includes spec validation
```

### CI/CD Integration
```bash
tsdoc-edge validate-spec --strict
# Fails build on incomplete specs
```

## Integration

### Pre-commit Hook
- Validates changed files
- Blocks on errors
- Warns on incomplete sections

### ValidateCommand
- Full codebase validation
- Grouped by module
- Actionable report

## Symbol Count

1 class, 4 interfaces, 1 type

## Related

- ModuleSpecGenerator: Generates module specs
- [[ValidateSpecCommand]]: CLI validation
- [[ValidateCommand]]: Overall validation

---

## Backlinks

### Referenced By

- [[ValidateSpecCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/ValidateSpecCommand.md:151
- [[Module Specification Framework]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/module-specification-framework.md:222
- ModuleSpecTagTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/ModuleSpecTagTypes.md:150
- ModuleSpecTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/ModuleSpecTypes.md:176
- ConventionValidator → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/ConventionValidator.md:180

