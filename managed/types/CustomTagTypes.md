---
title: Custom Tag Types
type: type
category: types
status: active
canonical: true
---

# [[CustomTagTypes]]

**Source**: `src/types/tags/base.ts`

## Purpose

Custom TSDoc tags for enhanced connectivity and traceability.

## Custom Tag Definitions (`CUSTOM_TAGS` — 22 Active Tags)

Code-space structural, call, and type dependencies (`implementation`, `inheritance`, `calls`, `code-dependency`, `type-dependency`) are deterministically projected from TypeScript AST and `@ttsc/graph`, while standard API documentation tags are owned by `@microsoft/tsdoc` (29 standard tags). `CUSTOM_TAGS` defines the 22 irreducible `tsdoc-edge` block tags:

### Checkpoint Routing
- `@doc`: SSOT document checkpoint reference (`@doc [[Checkpoint]]`)

### Purpose & Design-by-Contract Tags
- `@responsibility`: Core design responsibility of the symbol
- `@problem`: Problem statement addressed by the symbol
- `@solves`: Solution approach
- `@context`: Runtime environment or domain assumptions
- `@contract`: Overall behavioral contract summary
- `@precondition`: Condition that must hold before execution
- `@postcondition`: Guarantee that holds after execution
- `@invariant`: Property that always holds across state transitions

### Module Specification Logic & Side-Effect Tags
- `@functionality`: Summary of capabilities provided
- `@algorithm`: Processing steps or algorithmic approach
- `@complexity`: Time and space complexity characteristics
- `@sideEffect`: External I/O or state mutation (`filesystem`, `database`, `network`, `state`, `process`)

### Inline ADR Triad Tags
- `@decision`: Architectural or design choice made
- `@rationale`: Engineering reasoning behind the choice
- `@consequences`: Trade-offs and downstream implications

### Non-AST Semantic Relationship & Governance Tags
- `@relatedTo`: Non-AST semantic relationship between symbols
- `@enhances`: Capability extension or enhancement target
- `@requires`: Co-requirement relationship
- `@feature`: Domain feature grouping label
- `@testScenario`: Behavioral test scenario covered
- `@deadcode`: Intentional dead-code / retention marker (deprecation uses standard `@deprecated` with `{@link}`, external tracker links use standard `@see`, and runtime coverage comes from `CoverageParser`)

## Symbol Relationship

See implementation: SymbolRelationship

**Key Properties**:
- `type`: Relationship type (relatedTo, dependsOn, usedBy, implements, extends)
- `from`: Source symbol ID
- `to`: Target symbol ID
- `filePath`: Where relationship is defined

### Example

```typescript
{
  type: 'dependsOn',
  from: 'user-service',
  to: 'user-repository',
  description: 'Requires repository for data access',
  filePath: 'src/services/UserService.ts',
  line: 15
}
```

## Contract Specification

See implementation: ContractSpec

**Key Properties**:
- `symbolName`: Symbol name
- `description`: Contract description
- `preconditions`: Must be true before execution
- `postconditions`: Must be true after execution
- `invariants`: Always true during execution

### Example

```typescript
{
  symbolName: 'createUser',
  description: 'Creates new user account',
  preconditions: [
    'Email must be valid format',
    'Email not already registered',
    'Password meets strength requirements'
  ],
  postconditions: [
    'User exists in database',
    'Confirmation email sent',
    'User ID is unique'
  ],
  invariants: [
    'Database connection is active',
    'Transaction is open'
  ],
  complexity: 'O(1) time, O(1) space'
}
```

## Test Mapping

See implementation: TestMapping

**Key Properties**:
- `symbolId`: Symbol identifier
- `testFile`: Test file path
- `testCases`: Test case descriptions
- `coverage`: Coverage percentage (0-100%)

### Example

```typescript
{
  symbolId: 'user-service',
  testFile: 'src/__tests__/UserService.test.ts',
  testSuite: 'UserService',
  testCases: [
    'should create user with valid data',
    'should reject duplicate email',
    'should validate password strength'
  ],
  coverage: 85,
  lastRun: '2025-11-09T12:00:00.000Z'
}
```

## Responsibility Specification

See implementation: ResponsibilitySpec

**Key Properties**:
- `symbolName`: Symbol name
- `responsibility`: Primary responsibility
- `scope`: Areas of concern
- `boundaries`: What it doesn't do

### Example

```typescript
{
  symbolName: 'UserService',
  responsibility: 'Manage user account lifecycle',
  scope: [
    'User creation and deletion',
    'Profile updates',
    'Authentication coordination'
  ],
  boundaries: [
    'Does not handle password hashing (delegates to AuthService)',
    'Does not send emails (delegates to EmailService)',
    'Does not validate business rules (delegates to validators)'
  ]
}
```

## Design Decision

See implementation: DesignDecision

**Key Properties**:
- `id`: Unique identifier
- `title`: Decision title
- `context`: Why decision needed
- `decision`: What was decided
- `alternatives`: Other options considered
- `rationale`: Why chosen
- `status`: Decision status (proposed, accepted, deprecated, superseded)

### Example

```typescript
{
  id: 'DD-001',
  title: 'Use JWT for authentication',
  context: 'Need stateless authentication for microservices',
  decision: 'Implement JWT-based authentication with refresh tokens',
  alternatives: [
    'Session-based authentication',
    'OAuth2 with external provider',
    'API keys'
  ],
  rationale: 'JWT provides stateless auth, works across services, industry standard',
  consequences: [
    'Pro: No session storage needed',
    'Pro: Scales horizontally',
    'Con: Cannot revoke tokens before expiry',
    'Con: Token size larger than session ID'
  ],
  status: 'accepted'
}
```

## Usage in TSDoc

### Relationship Tags & `@ttsc/graph` Integration

```typescript
import type { UserRepository } from '../repositories/UserRepository';

/**
 * User service for account management
 * @doc [[CustomTagTypes]]
 * @relatedTo AuthService - Coordinates authentication checks
 * @requires AuditLogger - Requires audit trail support in production
 */
export class UserService {
  constructor(private readonly repo: UserRepository) {}
}
```

### Contract Tags

```typescript
/**
 * Create new user account
 * @contract Creates user with validation
 * @precondition Email must be valid format
 * @precondition Email not already registered
 * @postcondition User exists in database
 * @postcondition Confirmation email sent
 * @invariant Database connection active
 */
async createUser(email: string, password: string): Promise<User> { }
```

### Testing Tags & AST Test Discovery

Test-to-source links are discovered automatically from test AST imports/calls by `TestRelationshipExtractor`, and runtime coverage metrics are parsed by `CoverageParser`:

```typescript
/**
 * User service
 * @testScenario Create user with valid data
 * @testScenario Reject duplicate email
 */
export class UserService { }
```

## Symbol Count

4 interfaces, 1 const object

## Related

- [[TSDocParser]]: Parses custom tags
- ModuleSpecTagParser: Extracts tag values
- [[ValidateCommand]]: Validates tag presence

---

## Backlinks

### Referenced By

- [[Types Index]] → managed/types/index.md:21

### Implemented By

- CustomTagTypes → src/types/tags/base.ts:1

