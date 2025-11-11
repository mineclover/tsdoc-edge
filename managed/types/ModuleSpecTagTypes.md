# [[ModuleSpecTagTypes]]

**Source**: `src/types/tags/module-spec-tags.ts`

## Purpose

Custom TSDoc tags for 7-part module specification framework.

## Algorithm Documentation

From `@algorithm` tag:
```typescript
interface AlgorithmDoc {
  description: string;       // Algorithm description
  steps?: string[];          // Pseudocode steps
}
```

### Example

```typescript
/**
 * @algorithm Binary search with recursion
 * @algorithm Step 1: Check middle element
 * @algorithm Step 2: Recurse on left or right half
 */
```

## Complexity Documentation

From `@complexity` tag:
```typescript
interface ComplexityDoc {
  notation: string;          // "O(n)", "O(log n)", etc.
  explanation?: string;      // Why this complexity
}
```

### Example

```typescript
/**
 * @complexity O(log n) - Binary search halves input each iteration
 */
```

## Side Effect Documentation

From `@sideEffect` tag:
```typescript
interface SideEffectDoc {
  type: 'filesystem' | 'database' | 'network' | 'state' | 'process' | 'other';
  description: string;
  operation?: string;        // "read", "write", "delete"
}
```

### Example

```typescript
/**
 * @sideEffect filesystem - Writes user data to disk
 * @sideEffect database - Creates user record
 * @sideEffect network - Sends confirmation email
 */
```

## Mutation Documentation

From `@mutates` tag:
```typescript
interface MutationDoc {
  target: string;            // What state mutated
  description: string;       // How it changes
}
```

### Example

```typescript
/**
 * @mutates userCache - Adds new user to cache
 * @mutates sessionStore - Creates new session
 */
```

## I/O Documentation

From `@io` tag:
```typescript
interface IODoc {
  type: 'file' | 'network' | 'database' | 'console' | 'other';
  description: string;
}
```

### Example

```typescript
/**
 * @io file - Reads configuration from config.json
 * @io database - Queries user table
 * @io network - Fetches external API data
 */
```

## Scope Documentation

From `@scope` tag:
```typescript
interface ScopeDoc {
  description: string;
  accessLevel?: 'public' | 'private' | 'protected' | 'internal';
}
```

### Example

```typescript
/**
 * @scope Public API - Exported for external use
 * @scope Internal - Only used within this module
 */
```

## Module Spec Tags

Complete tag set:
```typescript
interface ModuleSpecTags {
  algorithm?: AlgorithmDoc;
  complexity?: ComplexityDoc;
  sideEffects?: SideEffectDoc[];
  mutations?: MutationDoc[];
  io?: IODoc[];
  scope?: ScopeDoc;
}
```

## Tag Names Constants

```typescript
const MODULE_SPEC_TAG_NAMES = {
  ALGORITHM: '@algorithm',
  COMPLEXITY: '@complexity',
  SIDE_EFFECT: '@sideEffect',
  MUTATES: '@mutates',
  IO: '@io',
  SCOPE: '@scope',
  PURE: '@pure',
  IDEMPOTENT: '@idempotent'
};
```

## Complete Example

```typescript
/**
 * Binary search implementation
 *
 * @algorithm Binary search with recursion
 * @algorithm Step 1: Check if array empty (base case)
 * @algorithm Step 2: Compare target with middle element
 * @algorithm Step 3: Recurse on appropriate half
 *
 * @complexity O(log n) time, O(log n) space for call stack
 *
 * @sideEffect none - Pure function
 * @pure This function has no side effects
 *
 * @scope Public API - Exported utility function
 *
 * @param arr Sorted array to search
 * @param target Value to find
 * @returns Index of target or -1 if not found
 */
function binarySearch<T>(arr: T[], target: T): number {
  // Implementation
}
```

## Impure Function Example

```typescript
/**
 * Save user to database and send email
 *
 * @algorithm 1. Validate user data
 * @algorithm 2. Insert into database
 * @algorithm 3. Send confirmation email
 * @algorithm 4. Update cache
 *
 * @complexity O(1) time, O(1) space
 *
 * @sideEffect database - Inserts user record
 * @sideEffect network - Sends HTTP request to email service
 * @sideEffect state - Updates userCache map
 *
 * @mutates userCache - Adds user to in-memory cache
 *
 * @io database - Writes to users table
 * @io network - POST to email API
 *
 * @scope Public API - Main user creation endpoint
 */
async function saveUser(user: User): Promise<void> {
  // Implementation
}
```

## Pure vs Impure Markers

### Pure Function

```typescript
/**
 * @pure No side effects or mutations
 * @idempotent Same input always produces same output
 */
function add(a: number, b: number): number {
  return a + b;
}
```

### Impure Function

```typescript
/**
 * @sideEffect state - Modifies counter
 * @mutates counter - Increments value
 */
let counter = 0;
function increment(): void {
  counter++;
}
```

## Integration with 7-Part Framework

Maps to framework sections:

1. **Purpose**: From `@responsibility`, `@problem`, `@solves`
2. **Input**: From `@param` tags
3. **Output**: From `@returns` tags
4. **Context**: From `@depends`, `@io`
5. **Logic**: From `@algorithm`, `@complexity`
6. **Effect**: From `@sideEffect`, `@mutates`
7. **Scope**: From `@scope`, `@public`

## Symbol Count

7 interfaces, 1 const object

## Related

- [[ModuleSpecTypes]]: 7-part framework
- [[ModuleSpecTagParser]]: Parses these tags
- [[ModuleSpecValidator]]: Validates completeness

---

## Backlinks

### Referenced By

- [[ModuleSpecTagParser]] → /home/user/tsdoc-edge/managed/parser/ModuleSpecTagParser.md:34
- [[ModuleSpecTypes]] → /home/user/tsdoc-edge/managed/types/ModuleSpecTypes.md:103
- [[ModuleSpecValidator]] → /home/user/tsdoc-edge/managed/utilities/ModuleSpecValidator.md:131

