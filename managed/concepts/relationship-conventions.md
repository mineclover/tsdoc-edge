# [[Relationship Conventions]]

**Purpose**: Guidelines for declaring relationships in code to minimize documentation while maximizing semantic connections

**Philosophy**: Relationships > Explanations

---

## Core Principle

**Bad** (Document-heavy):
```typescript
/**
 * DatabaseManager handles database connections.
 * It uses DatabaseConfig for configuration.
 * It depends on ConnectionPool for connection management.
 * Related to SymbolRegistry for symbol storage.
 */
export class DatabaseManager {}
```

**Good** (Relationship-heavy):
```typescript
/**
 * Database connection lifecycle manager
 * @relatedTo DatabaseConfig - Configuration
 * @relatedTo ConnectionPool - Resource pooling
 * @relatedTo SymbolRegistry - Symbol persistence
 * @doc [[DatabaseArchitecture]]
 */
export class DatabaseManager {}
```

**Impact**: 4 lines → 4 semantic relationships (queryable, navigable, trackable)

---

## Naming Conventions (Auto-generates Relationships)

### 1. Domain Prefix Pattern

**Convention**: `{Domain}{Role}`

```typescript
// Database domain - auto-linked
DatabaseManager
DatabaseConfig
DatabaseConnection
DatabaseSchema

// User domain - auto-linked
UserService
UserRepository
UserValidator
UserDTO
```

**Result**: Automatic `naming-pattern-relation` for all symbols in domain

### 2. Feature Module Pattern

**Convention**: Place related symbols in feature directory

```
src/analyzer/
  ├── TestCoverageAnalyzer.ts
  ├── ConceptualRelationAnalyzer.ts
  └── ASTSymbolExtractor.ts
```

**Result**: Automatic `feature-grouping` relationships

### 3. Test Naming Pattern

**Convention**: Match implementation symbol names

```typescript
// Implementation
export class DatabaseManager {}

// Test - auto-linked by name
describe('DatabaseManager', () => {
  it('should initialize schema', () => {});
});
```

**Result**: Automatic `test-coverage` relationship

---

## Explicit Relationship Tags

### @relatedTo - Semantic Links

**Format**: `@relatedTo SymbolName - Brief context`

**Use when**:
- Conceptual relationship not inferrable from structure
- Cross-domain connections
- Design pattern relationships

```typescript
/**
 * @relatedTo EventBus - Publishes lifecycle events
 * @relatedTo ConfigLoader - Loads initial config
 * @relatedTo Logger - Audit trail
 */
export class ApplicationBootstrap {}
```

**Don't**:
```typescript
// ❌ Too verbose
@relatedTo DatabaseManager - This class uses DatabaseManager to manage database connections

// ✅ Concise
@relatedTo DatabaseManager - Persistence
```

### @doc - Documentation Links

**Format**: `@doc [[DocumentName]]`

**Use when**:
- Linking to workflow documentation
- Referencing architecture decisions
- Connecting to feature specs

```typescript
/**
 * @doc [[BuildWorkflow]]
 * @doc [[SymbolExtraction]]
 */
export class ASTSymbolExtractor {}
```

### @scenario - Test Context

**Format**: `@scenario Description matching feature workflow`

**Use for**: High-level test scenarios

```typescript
/**
 * @scenario Database initialization with schema migration
 * @doc [[BuildWorkflow]]
 */
describe('database initialization', () => {
  it('should create tables from schema', () => {});
});
```

---

## Relationship Type Selection Guide

### When to Use Each Type

| Relationship | When to Use | How Created |
|-------------|-------------|-------------|
| **naming-pattern** | Symbols in same domain | Automatic (naming) |
| **explicit-semantic** | Cross-domain concepts | `@relatedTo` tag |
| **feature-grouping** | Feature boundary | File structure |
| **code-dependency** | Import/require | Automatic (AST) |
| **test-coverage** | Test → implementation | Automatic (imports) |
| **contains** | Test hierarchy | Automatic (nesting) |
| **covers-scenario** | Test → scenario | Automatic (matching) |
| **doc-reference** | Code ↔ docs | `@doc` tag |

### Decision Tree

```
Need to link symbols?
├─ Same domain (User*, Database*)?
│  └─ Use: naming-pattern (automatic)
├─ Different domains but conceptually related?
│  └─ Use: @relatedTo (explicit-semantic)
├─ Same feature/module?
│  └─ Use: feature-grouping (automatic)
├─ Test → implementation?
│  └─ Use: test-coverage (automatic)
└─ Link to documentation?
   └─ Use: @doc (doc-reference)
```

---

## Documentation Compression Patterns

### Pattern 1: Replace Description with Relationship

**Before**:
```markdown
# DatabaseManager

The DatabaseManager class manages database connections.
It works with DatabaseConfig to load configuration.
It uses ConnectionPool for connection pooling.
Related symbols: SymbolRegistry, QueryBuilder.
```

**After**:
```markdown
# [[DatabaseManager]]

Connection lifecycle manager.

**Related**: [[DatabaseConfig]] • [[ConnectionPool]] • [[SymbolRegistry]]
```

**Savings**: 5 lines → 1 line + relationships (queryable)

### Pattern 2: Replace Usage Examples with Test Links

**Before**:
```markdown
# FileScanner

Example usage:
\`\`\`typescript
const scanner = new FileScanner();
const files = scanner.scan('src/');
\`\`\`
```

**After**:
```markdown
# [[FileScanner]]

**Tests**: [[test-suite:file-scanner]]
**Examples**: See test cases for usage patterns
```

**Benefit**: Tests serve as living documentation

### Pattern 3: Replace Architecture Diagrams with Relationship Queries

**Before**:
```markdown
## Database Architecture

[Complex diagram showing DatabaseManager → DatabaseConfig → ConnectionPool]
```

**After**:
```typescript
// Query relationships
findRelated('DatabaseManager', { type: 'naming-pattern' })
// → DatabaseConfig, ConnectionPool, DatabaseSchema
```

**Benefit**: Always up-to-date, queryable, navigable

---

## Inference Rules (Auto-generate Relationships)

### Rule 1: Naming Transitivity

```
If: UserService ~ UserRepository (naming-pattern)
And: UserRepository ~ UserValidator (naming-pattern)
Then: UserService ~ UserValidator (naming-pattern, transitive)
```

### Rule 2: Test Coverage Inheritance

```
If: TestSuite contains TestCase
And: TestCase covers Implementation
Then: TestSuite covers Implementation (transitive)
```

### Rule 3: Dependency Closure

```
If: A → B (code-dependency)
And: B → C (code-dependency)
Then: A depends on C (transitive, indirect)
```

### Rule 4: Feature Co-membership

```
If: A in feature X (feature-grouping)
And: B in feature X (feature-grouping)
Then: A ~ B (feature-grouping)
```

---

## Code Review Checklist

### ✅ Good Relationship Hygiene

- [ ] New symbols follow domain naming convention
- [ ] Cross-domain relationships declared with `@relatedTo`
- [ ] Tests linked to feature docs with `@doc`
- [ ] Public APIs document related symbols
- [ ] File structure reflects feature boundaries

### ❌ Anti-Patterns

- ❌ Long prose descriptions instead of relationships
- ❌ Undeclared cross-domain dependencies
- ❌ Tests not linked to documentation
- ❌ Mixing unrelated symbols in same directory
- ❌ Using `@relatedTo` for same-domain symbols (use naming)

---

## Migration Strategy

### Existing Code → Relationship-First

**Step 1**: Identify implicit relationships in documentation
```markdown
# Old doc
"UserService uses UserRepository for data access"
```

**Step 2**: Convert to explicit relationship
```typescript
/**
 * @relatedTo UserRepository - Data access
 */
export class UserService {}
```

**Step 3**: Remove redundant documentation
```markdown
# New doc
[[UserService]] - Authentication logic
(See relationships for dependencies)
```

### Metrics

Track relationship density:
```
Relationship Density = Total Relationships / Total Symbols
Target: > 3.0 (each symbol has 3+ connections)

Current: 11,293 relationships / 5,172 symbols = 2.18
Goal: 15,000+ relationships (3.0+ density)
```

---

## Examples

### Example 1: Well-Connected Symbol

```typescript
/**
 * Test coverage analyzer and relationship extractor
 *
 * @relatedTo TestSymbolParser - Symbol extraction
 * @relatedTo TestCoverageUnifier - Coverage unification
 * @relatedTo DatabaseManager - Persistence
 * @doc [[TestingArchitecture]]
 * @doc [[BuildWorkflow]]
 */
export class TestCoverageAnalyzer {
  // Naming: Test* domain (auto-linked to TestSymbolParser, etc.)
  // Feature: analyzer/ (auto-linked to other analyzers)
  // Tests: test-suite:test-coverage-analyzer (auto-linked)
}
```

**Total connections**: 10+
- 3 explicit-semantic (@relatedTo)
- 2 doc-reference (@doc)
- 5+ naming-pattern (Test* domain)
- 3+ feature-grouping (analyzer/)
- 1 test-coverage

### Example 2: Minimal Doc, Maximum Relationships

```markdown
# [[TestCoverageAnalyzer]]

Extracts test-implementation relationships.

**Domain**: Test
**Feature**: Analyzer
**Related**: [[TestSymbolParser]] • [[DatabaseManager]]
**Docs**: [[TestingArchitecture]]
**Tests**: [[test-suite:test-coverage-analyzer]]
```

**Total**: 5 lines, 10+ queryable connections

---

## Tooling Support

### CLI Commands

```bash
# Find all relationships for a symbol
tsdoc-edge relationships TestCoverageAnalyzer

# Find symbols with low relationship density
tsdoc-edge analyze --low-connectivity

# Suggest relationships based on code structure
tsdoc-edge suggest-relationships DatabaseManager

# Validate relationship conventions
tsdoc-edge lint --relationships
```

### IDE Integration (Future)

- Autocomplete for `@relatedTo` (suggest symbols in context)
- Show relationship graph on hover
- Navigate to related symbols (Cmd+Click)
- Warning for undeclared cross-domain dependencies

---

## Success Metrics

### Quantitative

- **Relationship Density**: > 3.0 per symbol
- **Semantic Coverage**: > 30% of relationships are semantic
- **Doc-Code Links**: > 50% of public symbols linked to docs
- **Test Coverage**: > 80% of symbols have test relationships

### Qualitative

- Can navigate entire domain from any symbol
- Can find feature scope in 1 query
- Can understand dependencies without reading code
- Documentation serves as index, not explanation

---

## See Also

- [[Relationship Ontology]] - Type definitions
- [[Relationship Usage Examples]] - Query patterns
- [[BuildCommand]] - How relationships are extracted
