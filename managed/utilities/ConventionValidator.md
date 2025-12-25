---
title: ConventionValidator
type: utility
category: utility
status: active
canonical: true
---

# ConventionValidator

**Source**: `src/validator/ConventionValidator.ts`

## Purpose

Validate TSDoc comments against naming and documentation conventions.

## Validation Rules

### Rule 1: Summary Required

All symbols must have summary:
```typescript
/**
 * This is the summary section
 */
```

**Severity**: Error

### Rule 2: Public Tag

Public APIs should have `@public` tag:
```typescript
/**
 * @public
 */
export class UserService { }
```

**Severity**: Warning

### Rule 3: Parameter Documentation

Functions must document all parameters:
```typescript
/**
 * @param userId - User identifier
 * @param options - Configuration options
 */
```

**Severity**: Error

### Rule 4: Return Documentation

Functions returning non-void must have `@returns`:
```typescript
/**
 * @returns User object or null
 */
```

**Severity**: Error

### Rule 5: Naming Conventions

- Classes: PascalCase
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Interfaces: PascalCase with 'I' prefix (optional)

**Severity**: Warning

## Symbol-Specific Conventions

### Functions

Required:
- Summary
- `@param` for each parameter
- `@returns` (if non-void)
- `@public` (if exported)

### Classes

Required:
- Summary
- Constructor documentation
- Method documentation
- `@public` (if exported)

### Interfaces

Required:
- Summary
- Property documentation
- `@public` (if exported)

### Types

Required:
- Summary
- Usage description
- `@public` (if exported)

### Enums

Required:
- Summary
- Member documentation
- `@public` (if exported)

### Variables

Required:
- Summary
- `@public` (if exported constant)

## Validation Result

See implementation: ValidationResult

**Key Properties**:
- `ruleId`: Rule identifier
- `severity`: 'error', 'warning', or 'info'
- `message`: Validation message
- `location`: Source location (line, column) if applicable

## Convention Enforcement

### Strict Mode

All rules enforced as errors:
- Missing summary: Error
- Missing `@public`: Error
- Missing parameter docs: Error
- Missing return docs: Error
- Naming violations: Error

### Normal Mode

Gradual enforcement:
- Missing summary: Error
- Missing `@public`: Warning
- Missing parameter docs: Error
- Missing return docs: Error
- Naming violations: Warning

## Symbol Type Inference

Infers from symbol name:
- `*Service`, `*Manager`, `*Controller` → class
- `I*`, `*Interface` → interface
- `*Type`, `*Config` → type
- `*Enum` → enum
- UPPER_CASE → constant
- camelCase → function/variable

## Validation Process

1. Parse TSDoc comment
2. Infer symbol type
3. Apply type-specific rules
4. Check conventions
5. Generate validation results
6. Assign severity levels

## Example Validation

### Valid Comment

```typescript
/**
 * User service for account management
 *
 * @public
 * @param userId - User identifier
 * @param options - Configuration options
 * @returns User object or null if not found
 */
export async function getUser(
  userId: string,
  options?: GetUserOptions
): Promise<User | null> {
  // Implementation
}
```

**Result**: ✓ Valid

### Invalid Comment

```typescript
/**
 * @param userId
 */
export async function getUser(userId: string): Promise<User> {
  // Implementation
}
```

**Result**: ✗ Invalid
- Error: Missing summary
- Error: Missing @returns
- Error: Missing parameter description
- Warning: Missing @public tag

## Integration

### ValidateCommand

```bash
tsdoc-edge validate
# Runs convention validation on all files
```

### Pre-commit Hook

```bash
tsdoc-edge validate --strict
# Blocks commit on errors
```

### CI/CD

```bash
tsdoc-edge validate --strict --json > report.json
# Machine-readable output
```

## Symbol Count

1 class, 1 type

## Related

- ModuleSpecValidator: Validates module specs
- StrictModeValidator: Strict mode enforcement
- [[ValidateCommand]]: CLI validation

---

## Backlinks

### Referenced By

- TSDoc Edge Documentation → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:238

