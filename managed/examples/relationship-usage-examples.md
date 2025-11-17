# [[Relationship Usage Examples]]

**Purpose**: Practical examples of using tsdoc relationship types for documentation and code navigation

**Status**: Active
**Created**: 2025-11-17

---

## Overview

This document provides practical examples of how to leverage tsdoc's relationship types for better code navigation, documentation, and understanding.

## Semantic Relationships

### 1. Naming Pattern Relations

**Use Case**: Discover all symbols in a specific domain

```bash
# Query database for all Database-related symbols
npx ts-node -e "
import { DatabaseManager } from './src/storage/DatabaseManager';
const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

const query = \`
  SELECT DISTINCT from_symbols, to_symbols, properties
  FROM unified_relationships
  WHERE type = 'naming-pattern-relation'
  AND properties LIKE '%\"domain\":\"Database\"%'
  LIMIT 10
\`;

const results = db['db'].prepare(query).all();
console.log('Database Domain Symbols:');
results.forEach(r => console.log(\`  \${r.from_symbols} ~ \${r.to_symbols}\`));
db.close();
"
```

**Example Output**:
```
Database Domain Symbols:
  DatabaseManager ~ DatabaseConfig
  DatabaseManager ~ DatabaseConnection
  DatabaseConfig ~ DatabaseConnection
  ...
```

**Navigation Pattern**:
1. Start with any symbol (e.g., `DatabaseManager`)
2. Find all naming-pattern relationships
3. Discover entire domain cluster
4. Navigate between related symbols

---

### 2. Explicit Semantic Relations

**Use Case**: Follow developer-declared semantic links

**Code Example** - Declaring relationships:
```typescript
/**
 * Main database connection manager
 * @relatedTo DatabaseConfig - Configuration source
 * @relatedTo ConnectionPool - Resource management
 * @relatedTo QueryBuilder - Query construction
 */
export class DatabaseManager {
  constructor(
    private config: DatabaseConfig,
    private pool: ConnectionPool
  ) {}
}
```

**Query Example**:
```bash
# Find all explicit semantic links from DatabaseManager
npx ts-node -e "
import { DatabaseManager } from './src/storage/DatabaseManager';
const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

const query = \`
  SELECT from_symbols, to_symbols, properties, description
  FROM unified_relationships
  WHERE type = 'explicit-semantic-relation'
  AND from_symbols LIKE '%DatabaseManager%'
\`;

const results = db['db'].prepare(query).all();
console.log('Explicit links from DatabaseManager:');
results.forEach(r => {
  const desc = r.properties ? JSON.parse(r.properties).relationDescription : '';
  console.log(\`  → \${r.to_symbols}\${desc ? \` (\${desc})\` : ''}\`);
});
db.close();
"
```

**Navigation Pattern**:
1. Read symbol's `@relatedTo` tags
2. Follow explicit links to related concepts
3. Understand intentional relationships
4. Discover domain knowledge

---

### 3. Feature Grouping

**Use Case**: Understand feature boundaries and components

**Query Example**:
```bash
# Find all symbols in the analyzer feature
npx ts-node -e "
import { DatabaseManager } from './src/storage/DatabaseManager';
const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

const query = \`
  SELECT DISTINCT from_symbols, to_symbols
  FROM unified_relationships
  WHERE type = 'feature-grouping'
  AND properties LIKE '%\"feature\":\"analyzer\"%'
  LIMIT 20
\`;

const results = db['db'].prepare(query).all();
const symbols = new Set();
results.forEach(r => {
  symbols.add(r.from_symbols);
  symbols.add(r.to_symbols);
});

console.log('Analyzer Feature Components:');
Array.from(symbols).forEach(s => console.log(\`  - \${s}\`));
db.close();
"
```

**Example Output**:
```
Analyzer Feature Components:
  - TestCoverageAnalyzer
  - ConceptualRelationAnalyzer
  - ASTSymbolExtractor
  - FeatureGroupingAnalyzer
  - NamingPatternRelationAnalyzer
  ...
```

**Navigation Pattern**:
1. Identify feature from file path
2. Find all feature-grouping relationships
3. Discover all symbols in feature
4. Understand feature scope

---

## Test Relationships

### 4. Test Coverage

**Use Case**: Find which tests cover a specific implementation

**Query Example**:
```typescript
// Find all tests for DatabaseManager
const query = `
  SELECT from_symbols, to_symbols, confidence, description
  FROM unified_relationships
  WHERE type = 'test-coverage'
  AND to_symbols LIKE '%DatabaseManager%'
`;
```

**Example Output**:
```
Tests for DatabaseManager:
  test-case:should-initialize-schema → DatabaseManager (3 assertions)
  test-case:should-insert-symbol → DatabaseManager (5 assertions)
  test-case:should-retrieve-symbol → DatabaseManager (4 assertions)
```

**Reverse Query** - Find what a test covers:
```typescript
// What does this test cover?
const query = `
  SELECT to_symbols, description
  FROM unified_relationships
  WHERE type = 'test-coverage'
  AND from_symbols = 'test-case:should-initialize-schema'
`;
```

---

### 5. Test Hierarchy (Contains)

**Use Case**: Navigate test suite structure

**Query Example**:
```bash
# Get test suite hierarchy
npx ts-node -e "
import { DatabaseManager } from './src/storage/DatabaseManager';
const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

const query = \`
  SELECT from_symbols, to_symbols
  FROM unified_relationships
  WHERE type = 'contains'
  AND from_symbols LIKE '%test-suite:database-manager%'
\`;

const results = db['db'].prepare(query).all();
console.log('DatabaseManager Test Structure:');
results.forEach(r => {
  const child = r.to_symbols.replace(/[\[\]\"]/g, '');
  console.log(\`  \${r.from_symbols} → \${child}\`);
});
db.close();
"
```

**Example Output**:
```
DatabaseManager Test Structure:
  test-suite:database-manager → test-suite:initialization
  test-suite:database-manager → test-suite:symbol-operations
  test-suite:initialization → test-case:should-create-schema
  test-suite:initialization → test-case:should-connect
```

---

### 6. Scenario Coverage

**Use Case**: Check scenario test coverage

**Query Example**:
```bash
# Find all tests covering a scenario
npx ts-node -e "
import { DatabaseManager } from './src/storage/DatabaseManager';
const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

const query = \`
  SELECT from_symbols, confidence
  FROM unified_relationships
  WHERE type = 'covers-scenario'
  AND to_symbols LIKE '%database-initialization%'
\`;

const results = db['db'].prepare(query).all();
console.log('Tests covering database-initialization scenario:');
results.forEach(r => {
  console.log(\`  - \${r.from_symbols} (confidence: \${r.confidence})\`);
});
db.close();
"
```

---

## Structural Relationships

### 7. Code Dependencies

**Use Case**: Build dependency graph

**Query Example**:
```bash
# Find all dependencies of DatabaseManager
npx ts-node -e "
import { DatabaseManager } from './src/storage/DatabaseManager';
const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

const query = \`
  SELECT to_symbols
  FROM unified_relationships
  WHERE type = 'code-dependency'
  AND from_symbols LIKE '%DatabaseManager%'
\`;

const results = db['db'].prepare(query).all();
console.log('DatabaseManager dependencies:');
results.forEach(r => console.log(\`  - \${r.to_symbols}\`));
db.close();
"
```

**Reverse Query** - Who depends on this?
```bash
# Find all symbols that depend on DatabaseManager
const query = \`
  SELECT from_symbols
  FROM unified_relationships
  WHERE type = 'code-dependency'
  AND to_symbols LIKE '%DatabaseManager%'
\`;
```

---

### 8. Inheritance

**Use Case**: Navigate class hierarchies

**Query Example**:
```bash
# Find inheritance chain
npx ts-node -e "
import { DatabaseManager } from './src/storage/DatabaseManager';
const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

const query = \`
  SELECT from_symbols, to_symbols
  FROM unified_relationships
  WHERE type = 'inheritance'
\`;

const results = db['db'].prepare(query).all();
console.log('Inheritance relationships:');
results.forEach(r => {
  console.log(\`  \${r.from_symbols} extends \${r.to_symbols}\`);
});
db.close();
"
```

---

## Multi-Relationship Queries

### 9. Domain-Driven Exploration

**Use Case**: Explore a domain comprehensively

```typescript
function exploreDomain(domainName: string) {
  const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

  // 1. Find all symbols in domain (naming-pattern)
  const symbols = db.query(`
    SELECT DISTINCT from_symbols, to_symbols
    FROM unified_relationships
    WHERE type = 'naming-pattern-relation'
    AND properties LIKE '%"domain":"${domainName}"%'
  `);

  // 2. Find code dependencies between them
  const dependencies = db.query(`
    SELECT from_symbols, to_symbols
    FROM unified_relationships
    WHERE type = 'code-dependency'
    AND from_symbols IN (${symbolList})
    AND to_symbols IN (${symbolList})
  `);

  // 3. Find test coverage
  const tests = db.query(`
    SELECT from_symbols, to_symbols
    FROM unified_relationships
    WHERE type = 'test-coverage'
    AND to_symbols IN (${symbolList})
  `);

  return {
    symbols,
    dependencies,
    tests,
  };
}
```

---

### 10. Feature Context Discovery

**Use Case**: Get complete context for working on a feature

```typescript
function getFeatureContext(featureName: string) {
  const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

  // 1. Find all symbols in feature
  const featureSymbols = db.query(`
    SELECT DISTINCT from_symbols, to_symbols
    FROM unified_relationships
    WHERE type = 'feature-grouping'
    AND properties LIKE '%"feature":"${featureName}"%'
  `);

  // 2. Find external dependencies
  const externalDeps = db.query(`
    SELECT to_symbols
    FROM unified_relationships
    WHERE type = 'code-dependency'
    AND from_symbols IN (${featureSymbols})
    AND to_symbols NOT IN (${featureSymbols})
  `);

  // 3. Find test coverage
  const testCoverage = db.query(`
    SELECT from_symbols, to_symbols
    FROM unified_relationships
    WHERE type = 'test-coverage'
    AND to_symbols IN (${featureSymbols})
  `);

  // 4. Find related documentation
  const docs = db.query(`
    SELECT from_symbols, to_symbols
    FROM unified_relationships
    WHERE type = 'conceptual-relation'
    AND from_symbols IN (${featureSymbols})
    AND to_symbols LIKE '%doc:%'
  `);

  return {
    symbols: featureSymbols,
    externalDependencies: externalDeps,
    tests: testCoverage,
    documentation: docs,
  };
}
```

---

## Best Practices

### Declaring Relationships in Code

**1. Use @relatedTo for Semantic Links**:
```typescript
/**
 * @relatedTo RelatedSymbol - Brief description of relationship
 */
export class MyClass {}
```

**2. Use @doc for Documentation Links**:
```typescript
/**
 * @doc [[FeatureName]]
 * @doc [[WorkflowName]]
 */
export class MyClass {}
```

**3. Use Descriptive Test Names**:
```typescript
// Good: Matches scenario name
it('should initialize database with schema', () => {});

// Good: Clear domain
describe('DatabaseManager initialization', () => {});
```

**4. Follow Naming Conventions**:
```typescript
// Creates automatic naming-pattern relationships
UserService    // User domain
UserRepository // User domain
UserController // User domain
```

---

## CLI Commands

### Quick Relationship Queries

```bash
# Count relationships by type
npx ts-node -e "
import { DatabaseManager } from './src/storage/DatabaseManager';
const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');
const query = 'SELECT type, COUNT(*) as count FROM unified_relationships GROUP BY type';
console.table(db['db'].prepare(query).all());
db.close();
"

# Find specific relationship
npx ts-node -e "
import { DatabaseManager } from './src/storage/DatabaseManager';
const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');
const query = 'SELECT * FROM unified_relationships WHERE from_symbols LIKE \"%YourSymbol%\" LIMIT 10';
console.table(db['db'].prepare(query).all());
db.close();
"
```

---

## Future Enhancements

**Planned relationship types** (not yet implemented):
- `calls`: Function call relationships
- `io-dependency`: Data flow tracking
- `doc-reference`: Bidirectional doc-code links

**Planned queries**:
- Transitive relationship queries
- Relationship path finding
- Impact analysis
- Circular dependency detection

---

## See Also

- [[Relationship Ontology]] - Complete type definitions
- [[Work Context Workflow]] - Using relationships for context
- [[BuildCommand]] - How relationships are extracted
