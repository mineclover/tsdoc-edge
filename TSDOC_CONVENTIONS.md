# TSDoc Minimum Conventions

This document defines the minimum TSDoc documentation requirements for different symbol types in the tsdoc-edge project.

## Overview

All public symbols must be documented with TSDoc comments. The level of documentation required depends on the symbol type and visibility.

## General Requirements

All TSDoc comments must include:
- Summary section (required for all public symbols)
- `@public` tag for public API symbols
- Proper formatting following TSDoc standard

## Symbol-Specific Requirements

### Functions

**Required:**
- Summary (1-2 sentences describing what the function does)
- `@param` for each parameter with description
- `@returns` for non-void return types
- `@public` tag if exported

**Recommended:**
- `@responsibility` describing the function's purpose
- `@contract` with preconditions and postconditions
- `@example` showing usage
- `@testedBy` linking to test file

**Example:**
```typescript
/**
 * Process user data and validate against schema
 *
 * @param userData - Raw user data object
 * @param schema - Validation schema
 * @returns Validated user object
 * @throws {ValidationError} If data doesn't match schema
 * @public
 * @responsibility Validate and transform user input data
 */
export function processUserData(userData: unknown, schema: Schema): User {
  // ...
}
```

### Classes

**Required:**
- Class summary (describing the class's purpose)
- Constructor documentation with `@param` for all parameters
- Public method documentation (same as functions)
- `@public` tag if exported

**Recommended:**
- `@responsibility` describing the class's role
- `@contract` describing class invariants
- `@architecture` describing design pattern used
- Method documentation should include `@returns` and `@param`

**Example:**
```typescript
/**
 * Manages user authentication and session state
 *
 * @public
 * @responsibility Handle user authentication lifecycle
 * @contract Ensures session is always valid or null
 * @architecture Singleton pattern for global session management
 */
export class AuthManager {
  /**
   * Creates a new AuthManager instance
   *
   * @param config - Authentication configuration
   * @public
   */
  constructor(config: AuthConfig) {
    // ...
  }

  /**
   * Authenticate user with credentials
   *
   * @param username - User's username
   * @param password - User's password
   * @returns Authentication token
   * @throws {AuthError} If credentials are invalid
   * @public
   */
  authenticate(username: string, password: string): string {
    // ...
  }
}
```

### Interfaces

**Required:**
- Interface summary
- Property documentation for all public properties
- `@public` tag if exported

**Recommended:**
- `@contract` describing interface constraints
- Examples of valid interface implementations

**Example:**
```typescript
/**
 * Configuration options for the data processor
 *
 * @public
 */
export interface ProcessorConfig {
  /**
   * Maximum number of items to process
   */
  maxItems: number;

  /**
   * Enable strict validation mode
   */
  strictMode?: boolean;

  /**
   * Custom validation function
   *
   * @param item - Item to validate
   * @returns True if valid
   */
  validator?: (item: unknown) => boolean;
}
```

### Type Aliases

**Required:**
- Type summary
- Description of when to use this type
- `@public` tag if exported

**Recommended:**
- `@example` showing valid values

**Example:**
```typescript
/**
 * User role in the system
 *
 * Determines access permissions and available features
 *
 * @public
 */
export type UserRole = 'admin' | 'user' | 'guest';
```

### Enums

**Required:**
- Enum summary
- Documentation for each enum member
- `@public` tag if exported

**Example:**
```typescript
/**
 * HTTP status codes
 *
 * @public
 */
export enum HttpStatus {
  /**
   * Request succeeded
   */
  OK = 200,

  /**
   * Resource not found
   */
  NOT_FOUND = 404,

  /**
   * Internal server error
   */
  INTERNAL_ERROR = 500,
}
```

### Variables and Constants

**Required:**
- Summary describing the variable's purpose
- `@public` tag if exported

**Recommended:**
- `@readonly` tag for constants
- Value range or constraints

**Example:**
```typescript
/**
 * Maximum number of retry attempts
 *
 * @public
 * @readonly
 */
export const MAX_RETRIES = 3;
```

## Custom Tags

tsdoc-edge supports additional custom tags for enhanced documentation:

### @responsibility
Describes what the symbol is responsible for in the system.

```typescript
/**
 * Data validator
 *
 * @responsibility Ensure data integrity before storage
 * @public
 */
```

### @contract
Defines preconditions, postconditions, and invariants.

```typescript
/**
 * Sort array in place
 *
 * @param arr - Array to sort
 * @returns Sorted array
 * @contract
 * @precondition Array must not be null
 * @postcondition Array elements are in ascending order
 * @postcondition Array length is unchanged
 * @public
 */
```

### @testedBy
Links to test file covering this symbol.

```typescript
/**
 * Calculate factorial
 *
 * @param n - Number to calculate factorial for
 * @returns Factorial of n
 * @testedBy __tests__/math.test.ts
 * @public
 */
```

### @relatedTo, @dependsOn, @usedBy
Establishes relationships between symbols.

```typescript
/**
 * Process payment
 *
 * @param payment - Payment information
 * @dependsOn PaymentValidator
 * @usedBy CheckoutController
 * @public
 */
```

## Validation Levels

### Error (Must Fix)
- Missing summary for public symbols
- Missing `@param` for function parameters
- Missing `@returns` for non-void functions
- Missing `@public` tag for exported symbols

### Warning (Should Fix)
- Missing responsibility for complex functions/classes
- Missing contract for functions with important preconditions
- Missing examples for public APIs
- Missing test references

### Info (Nice to Have)
- Missing architecture documentation
- Missing design decision references
- Missing related symbol links

## Documentation Quality Score

Symbols are scored on documentation quality (0-100):

- **0-30**: Critical - Missing required documentation
- **31-60**: Poor - Has basic docs but missing important details
- **61-80**: Good - Well-documented with most recommended fields
- **81-100**: Excellent - Comprehensive documentation with all fields

### Quality Calculation

```
Base score: 40 points for having a summary
+10 points: @public tag (for public symbols)
+10 points: All @param documented
+10 points: @returns documented (for non-void)
+10 points: @responsibility defined
+10 points: @contract defined
+5 points: @example provided
+5 points: @testedBy link
```

## Best Practices

1. **Write summaries first** - Always start with a clear one-sentence summary
2. **Use active voice** - "Processes data" not "Data is processed"
3. **Be specific** - "Validates email format" not "Validates input"
4. **Include examples** - Show how to use the symbol correctly
5. **Link related symbols** - Use @relatedTo, @dependsOn to show relationships
6. **Document edge cases** - Mention what happens with null/undefined/empty inputs
7. **Keep it up to date** - Update docs when code changes

## Tools

Use these tsdoc-edge tools to enforce conventions:

- `ConventionValidator` - Validates TSDoc against these conventions
- `DocumentationFixer` - Automatically adds missing documentation
- `DocumentationAnalyzer` - Analyzes quality and suggests improvements
- `RelatedDocsGenerator` - Generates implementation context documentation

## References

- [TSDoc Official Specification](https://tsdoc.org/)
- [TypeScript Documentation Guidelines](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
