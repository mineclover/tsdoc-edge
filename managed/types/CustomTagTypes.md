# [[CustomTagTypes]]

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

Relationship between symbols:
```typescript
interface SymbolRelationship {
  type: 'relatedTo' | 'dependsOn' | 'usedBy' | 'implements' | 'extends';
  from: string;              // Source symbol ID
  to: string;                // Target symbol ID
  description?: string;
  filePath: string;
  line?: number;
}
```

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

Behavioral contract:
```typescript
interface ContractSpec {
  symbolName: string;
  description: string;
  preconditions: string[];   // Before execution
  postconditions: string[];  // After execution
  invariants: string[];      // During execution
  complexity?: string;       // Time/space complexity
}
```

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

Link to test coverage:
```typescript
interface TestMapping {
  symbolId: string;
  testFile: string;          // Test file path
  testSuite?: string;        // Test suite name
  testCases: string[];       // Test case descriptions
  coverage: number;          // 0-100%
  lastRun?: string;          // ISO timestamp
}
```

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

What symbol is responsible for:
```typescript
interface ResponsibilitySpec {
  symbolName: string;
  responsibility: string;    // Primary responsibility
  scope: string[];           // Areas of concern
  boundaries: string[];      // What it doesn't do
}
```

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

Architectural choice documentation:
```typescript
interface DesignDecision {
  id: string;
  title: string;
  context: string;           // Why decision needed
  decision: string;          // What was decided
  alternatives: string[];    // Other options considered
  rationale: string;         // Why chosen
  consequences: string[];    // Trade-offs
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
}
```

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
- [[ModuleSpecTagParser]]: Extracts tag values
- [[ValidateCommand]]: Validates tag presence

---

## Backlinks

### Referenced By

- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:69
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:70
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:71
- [[ModuleSpecTagParser]] → /home/user/tsdoc-edge/managed/parser/ModuleSpecTagParser.md:39
- [[ModuleSpecTagParser]] → /home/user/tsdoc-edge/managed/parser/ModuleSpecTagParser.md:40
- [[ModuleSpecTagParser]] → /home/user/tsdoc-edge/managed/parser/ModuleSpecTagParser.md:41
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:61
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:62
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:63

