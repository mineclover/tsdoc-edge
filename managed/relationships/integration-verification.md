---
title: Integration Verification
type: relationship
category: verification
status: partial
canonical: true
phase: 3
---

# [[Integration Verification]]

> **Type**: `integration-verification` | **Status**: ⚠️ Partial (legacy analyzer, not canonical graph)

Track integration points verified by integration tests.

**Metric contract**: [[Coverage Metrics Contract]] / `test.integration`.

이 문서의 coverage 예시는 설계·계획 데이터다. 실제 실행 결과를 현재 baseline으로 사용하려면
테스트 실행 evidence와 source identity를 계약 형식으로 먼저 기록해야 한다.

**Implementation**: `src/analyzer/IntegrationVerificationAnalyzer.ts`.
현재 analyzer는 legacy `SymbolGraph`와 test-file discovery를 사용하며 canonical graph revision,
실행 결과 evidence, persisted metric report를 제공하지 않는다.

## Definition

**Integration verification** relationships document that the connection between two or more components has been validated through integration testing.

**Pattern**: `A↔B connection verified by IntegrationTest`

**Key Characteristics**:
- **Multi-component**: Tests interaction between components
- **Contract verification**: Validates interface contracts
- **End-to-end**: Tests real integration, not mocks
- **Evidence-based**: Provides test execution proof

## Category

**Category**: `verification`
**Direction**: `undirected` (test verifies bidirectional integration)
**Strength**: `strong` (explicit verification)

## Examples

### 1. **Service Integration Test**
```typescript
/**
 * @integrationTest
 * @verifies UserController <-> UserService
 */
describe('User Management Integration', () => {
  it('should create user through full stack', async () => {
    const controller = new UserController(userService);
    const result = await controller.createUser(userData);
    expect(result).toBeDefined();
  });
});
```

### 2. **Database Integration Test**
```typescript
/**
 * @integrationTest
 * @verifies UserService <-> DatabaseRepository
 */
describe('Database Integration', () => {
  it('should persist and retrieve user', async () => {
    await userService.createUser(user);
    const retrieved = await userService.findUser(user.id);
    expect(retrieved).toEqual(user);
  });
});
```

### 3. **API Integration Test**
```typescript
/**
 * @integrationTest
 * @verifies Frontend <-> Backend API
 */
describe('API Integration', () => {
  it('should handle complete checkout flow', async () => {
    const response = await apiClient.post('/checkout', orderData);
    expect(response.status).toBe(200);
    expect(response.data.orderId).toBeDefined();
  });
});
```

### 4. **Message Queue Integration**
```typescript
/**
 * @integrationTest
 * @verifies Producer <-> Consumer
 */
describe('Message Queue Integration', () => {
  it('should process messages end-to-end', async () => {
    await producer.send(message);
    const received = await consumer.receive();
    expect(received).toEqual(message);
  });
});
```

## Detection Strategies

### 1. **Test File Analysis**
```typescript
// Integration test files
describe('Integration: AuthService <-> Database', () => {
  // Real database connection
  // No mocks for integration
});
```

### 2. **Test Tags**
```typescript
/**
 * @test integration
 * @verifies ComponentA, ComponentB
 * @integrationPoint service-to-database
 */
```

### 3. **Test Naming Conventions**
```typescript
// Naming pattern indicates integration test
test/integration/auth-service-database.test.ts
test/integration/api-client-backend.test.ts
```

### 4. **Setup/Teardown Analysis**
```typescript
beforeAll(async () => {
  // Spin up real database
  await setupTestDatabase();
  await startTestServer();
  // Integration test setup
});
```

## Planned Implementation

### Analyzer: `IntegrationVerificationAnalyzer`

**Detection Methods**:
1. **Test discovery**: Find integration test files
2. **AST parsing**: Extract tested components
3. **Coverage mapping**: Map tests to integrations
4. **Execution tracking**: Record test results
5. **Contract validation**: Verify interface contracts

**Confidence Scoring**:
- `1.0`: Explicit `@integrationTest` tag with components
- `0.9`: Integration test file in `/integration` directory
- `0.8`: Test imports multiple components without mocks
- `0.7`: Test has real database/service setup
- `0.6`: Inferred from test name

### Command: `tsdoc-edge analyze-integration`

**Usage**:
```bash
# Find all integration verifications
tsdoc-edge analyze-integration

# Find unverified integrations
tsdoc-edge analyze-integration --find-gaps

# Validate integration coverage
tsdoc-edge analyze-integration --coverage

# Show integration test map
tsdoc-edge analyze-integration --map

# Run and track integration tests
tsdoc-edge analyze-integration --run-tests
```

### Storage Schema

```typescript
{
  type: 'integration-verification',
  from: ['UserController', 'UserService'],
  to: 'UserControllerServiceIntegrationTest',
  direction: 'undirected',
  strength: 'strong',
  category: 'verification',
  evidence: [{
    type: 'test',
    source: 'test/integration/user-management.test.ts',
    lineNumber: 15,
    snippet: 'should create user through full stack',
    confidence: 1.0
  }],
  properties: {
    testFile: 'test/integration/user-management.test.ts',
    testName: 'User Management Integration',
    integrationPoints: ['UserController', 'UserService', 'UserRepository'],
    lastRun: '2025-11-11T10:30:00Z',
    status: 'passed',
    executionTime: 1250,
    coverage: 0.85
  }
}
```

## Integration Test Types

### 1. **Vertical Integration**
```typescript
// Tests full stack slice
test('Checkout Flow Integration', () => {
  // CheckoutController → CheckoutService → OrderRepository → Database
});
```

### 2. **Horizontal Integration**
```typescript
// Tests service-to-service communication
test('Auth + User Service Integration', () => {
  // AuthService ↔ UserService
});
```

### 3. **External System Integration**
```typescript
// Tests integration with external services
test('Payment Gateway Integration', () => {
  // PaymentService → Stripe API
});
```

### 4. **Event-Driven Integration**
```typescript
// Tests event pub/sub
test('Order Events Integration', () => {
  // OrderService → EventBus → NotificationService
});
```

## Use Cases

### 1. **Integration Coverage Analysis**
```bash
# Which integrations are tested?
tsdoc-edge analyze-integration --coverage-report
```

### 2. **Gap Detection**
```bash
# Which integrations lack tests?
tsdoc-edge analyze-integration --find-gaps
```

### 3. **Contract Validation**
```bash
# Verify all interface contracts are tested
tsdoc-edge analyze-integration --validate-contracts
```

### 4. **CI/CD Integration**
```bash
# Track integration test results
tsdoc-edge analyze-integration --track-results
```

## Benefits

1. **Confidence**: Know integrations are tested
2. **Documentation**: Integration points are documented
3. **Safety**: Refactoring impact is known
4. **Quality**: Interface contracts are validated
5. **Regression**: Integration breakage is detected

## Anti-Patterns

### ❌ **Mock-Heavy "Integration" Test**
```typescript
// BAD: Not a real integration test
describe('Integration Test', () => {
  const mockService = jest.mock(UserService);  // Too many mocks!
  const mockRepo = jest.mock(UserRepository);
  // This is a unit test, not integration
});
```

### ❌ **Untested Integration**
```typescript
// BAD: Critical integration without test
class PaymentProcessor {
  async processPayment(amount: number) {
    await stripeAPI.charge(amount);  // No integration test!
  }
}
```

### ❌ **Flaky Integration Test**
```typescript
// BAD: Test depends on timing
test('Event Integration', async () => {
  eventBus.emit('order-created');
  await sleep(100);  // Race condition!
  expect(notificationSent).toBe(true);
});
```

### ✅ **Good Integration Test**
```typescript
// GOOD: Real components, no mocks, deterministic
describe('User Service Integration', () => {
  let db: Database;
  let service: UserService;

  beforeEach(async () => {
    db = await createTestDatabase();
    service = new UserService(db);
  });

  it('should persist user correctly', async () => {
    const user = await service.createUser(userData);
    const retrieved = await service.getUser(user.id);
    expect(retrieved).toEqual(user);
  });

  afterEach(async () => {
    await db.cleanup();
  });
});
```

## Integration Verification Levels

### 1. **Narrow Integration** (Component + Direct Dependency)
```typescript
// Tests one integration point
UserService → Database
```

### 2. **Feature Integration** (Feature Slice)
```typescript
// Tests feature vertical slice
Controller → Service → Repository → Database
```

### 3. **System Integration** (Cross-Feature)
```typescript
// Tests system-level integration
Auth Feature ↔ User Management Feature
```

### 4. **External Integration** (Third-Party)
```typescript
// Tests external service integration
PaymentService → Stripe API
```

## Differs From

| Relationship | Difference |
|--------------|------------|
| **Test Coverage** | Test coverage is unit tests, Integration verification is integration tests |
| **Calls** | Calls are code relationships, Integration verification is test validation |
| **Composition** | Composition is structure, Integration verification is test evidence |

## Integration with Other Relationships

**Verifies**:
- [[Call Relationships]]: Integration tests verify call relationships work
- [[Code Dependency]]: Tests verify dependencies are correct
- [[Collaboration]]: Tests validate collaboration patterns
- [[IO Dependency]]: Tests verify data flow works

**Complements**:
- [[Test Coverage]]: Unit tests + Integration tests = full coverage

## Metrics

```typescript
interface IntegrationMetrics {
  totalIntegrations: number;        // All integration points
  verifiedIntegrations: number;     // Tested integration points
  coverage: number;                 // Verification coverage %
  testCount: number;                // Number of integration tests
  averageExecutionTime: number;     // Avg test execution time (ms)
  successRate: number;              // Test pass rate
  unverifiedCritical: number;       // Critical integrations without tests
}
```

## Validation Rules

### 1. **Critical Integrations Must Be Tested**
```typescript
// Rule: External integrations require tests
if (integration.isExternal && !integration.hasTest) {
  warn('External integration lacks test');
}
```

### 2. **No Mock Abuse**
```typescript
// Rule: Integration tests should minimize mocking
if (test.mockCount > test.realCount) {
  warn('Too many mocks for integration test');
}
```

### 3. **Contract Validation**
```typescript
// Rule: Interface contracts must be verified
if (interface.implementationCount > 0 &&
    !hasIntegrationTest(interface)) {
  warn('Interface contract not verified');
}
```

## Documentation Template

```typescript
/**
 * Integration Test: User Management Stack
 *
 * @integrationTest
 * @verifies UserController, UserService, UserRepository, Database
 * @integrationPoints
 *   - Controller → Service (REST API)
 *   - Service → Repository (Data access)
 *   - Repository → Database (SQL)
 *
 * @testCoverage
 *   - User creation flow
 *   - User retrieval by ID
 *   - User update operations
 *   - Error handling
 *
 * @setupRequirements
 *   - Test database running
 *   - Test server initialized
 *   - Sample data loaded
 */
describe('User Management Integration', () => {
  // Integration tests...
});
```

## Related

- [[Test Coverage]] (`test-coverage.md`): Unit test relationship coverage
- [[Call Relationships]] (`CALLS.md`): Call relationships
- [[Code Dependency]] (`code-dependency.md`): Dependency verification
- [[Collaboration]] (`collaboration.md`): Collaboration validation

## Tags

`#verification` `#integration-testing` `#quality` `#contracts` `#testing` `#phase-3`

---

**Status**: 📋 Phase 3 (Planned)
**Priority**: High (critical for quality assurance)
**Estimated Effort**: 3-4 weeks
**Dependencies**: Test framework integration, test discovery, coverage analysis
