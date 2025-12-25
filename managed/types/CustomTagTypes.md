# CustomTagTypes

**Source**: `src/types/tags/base.ts`

## Purpose

Custom TSDoc tags for enhanced connectivity and traceability.

## Custom Tag Definitions

### Relationship Tags

Connect symbols to each other:
- `@relatedTo`: General relationship
- `@dependsOn`: Dependency relationship
- `@usedBy`: Reverse dependency
- `@implements`: Interface implementation
- `@extends`: Inheritance

### Contract Tags

Define behavioral contracts:
- `@contract`: Overall contract description
- `@precondition`: Must be true before execution
- `@postcondition`: Must be true after execution
- `@invariant`: Always true during execution

### Testing Tags

Link to tests:
- `@testedBy`: Test file/suite
- `@testScenario`: Test case description
- `@coverage`: Coverage percentage

### Design Tags

Document decisions:
- `@responsibility`: What it's responsible for
- `@designDecision`: Design choice made
- `@architecture`: Architectural pattern
- `@pattern`: Design pattern used

### Traceability Tags

Track evolution:
- `@requirement`: Business requirement
- `@issue`: GitHub issue number
- `@version`: Version introduced
- `@since`: Release version
- `@deprecatedInFavorOf`: Replacement symbol

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

### Relationship Tags

```typescript
/**
 * User service for account management
 * @relatedTo AuthService - Uses for authentication
 * @dependsOn UserRepository - Requires for data access
 * @usedBy UserController - Called by HTTP controller
 */
export class UserService { }
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

### Testing Tags

```typescript
/**
 * User service
 * @testedBy src/__tests__/UserService.test.ts
 * @testScenario Create user with valid data
 * @testScenario Reject duplicate email
 * @coverage 85%
 */
export class UserService { }
```

## Symbol Count

4 interfaces, 1 const object

## Related

- [[TSDocParser]]: Parses custom tags
- ModuleSpecTagParser: Extracts tag values
- [[ValidateCommand]]: Validates tag presence
