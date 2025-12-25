---
title: Analyzer Development Guide
type: guide
category: development
status: active
canonical: true
---

# [[Analyzer Development Guide]]

> **Step-by-step guide** to developing new analyzers for TSDoc Edge

Learn how to create custom analyzers to detect new relationship types and extract insights from your TypeScript codebase.

## Overview

Analyzers in TSDoc Edge detect **relationships between symbols** by analyzing:
- **AST** (Abstract Syntax Tree) - Structure and syntax
- **Type System** - Type signatures and constraints
- **Symbol Graph** - Existing symbols and relationships

**Core Analyzer Types**:
1. **Structural Analyzers**: Detect code structure (imports, inheritance, composition)
2. **Behavioral Analyzers**: Detect runtime behavior (calls, data flow, events)
3. **Type Analyzers**: Detect type relationships (dependencies, constraints, chains)
4. **Quality Analyzers**: Detect code health (coverage, documentation, complexity)

**Examples**: [[CallGraphAnalyzer]], [[IODependencyAnalyzer]], [[CodeHealthChecker]]

---

## Step 1: Understand Analyzer Pattern

### Core Pattern

All analyzers follow this pattern:

```typescript
export class YourAnalyzer {
  private graph: SymbolGraph;
  private program?: ts.Program;
  private typeChecker?: ts.TypeChecker;

  constructor(graph: SymbolGraph, program?: ts.Program) {
    this.graph = graph;
    this.program = program;
    if (program) {
      this.typeChecker = program.getTypeChecker();
    }
  }

  /**
   * Main analysis method
   * @returns Array of relationships detected
   */
  analyze(): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];

    // 1. Iterate through symbols
    for (const [symbolId, symbol] of this.graph.symbols.entries()) {
      // 2. Extract relevant data
      const data = this.extractData(symbol);

      // 3. Find relationships
      const rels = this.findRelationships(symbol, data);

      // 4. Add to results
      relationships.push(...rels);
    }

    return relationships;
  }

  private extractData(symbol: Symbol): any {
    // Extract relevant data from symbol
  }

  private findRelationships(symbol: Symbol, data: any): UnifiedRelationship[] {
    // Find and create relationships
  }
}
```

**Reference**: [[CallGraphAnalyzer]] (`src/analyzer/CallGraphAnalyzer.ts:44`)

---

## Step 2: Create Your Analyzer File

### File Structure

Create `src/analyzer/YourAnalyzer.ts`:

```typescript
/**
 * Your Analyzer
 *
 * @doc [[YourAnalyzer]]
 * @packageDocumentation
 * @responsibility [What relationships does this detect?]
 *
 * @problem [What problem does this solve?]
 * @solves [How does it solve it?]
 * @context [When is this needed?]
 *
 * @functionality
 * - [Detection method 1]
 * - [Detection method 2]
 * - [Output format]
 */

import * as ts from 'typescript';
import type { SymbolGraph, Symbol } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Your Analyzer
 *
 * @public
 * @responsibility [Responsibility statement]
 * @requires SymbolGraph
 */
export class YourAnalyzer {
  private graph: SymbolGraph;
  private program?: ts.Program;
  private typeChecker?: ts.TypeChecker;

  constructor(graph: SymbolGraph, program?: ts.Program) {
    this.graph = graph;
    this.program = program;
    if (program) {
      this.typeChecker = program.getTypeChecker();
    }
  }

  /**
   * Analyze and detect relationships
   *
   * @returns Array of detected relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    // Implementation here
    return [];
  }
}
```

---

## Step 3: Implement Analysis Logic

### Pattern 1: AST-Based Analysis (Behavioral)

For detecting runtime behavior (calls, data flow, events):

```typescript
/**
 * Example: Call Graph Analysis
 * Based on: src/analyzer/CallGraphAnalyzer.ts:92
 */
analyze(): UnifiedRelationship[] {
  if (!this.program) {
    console.warn('No TypeScript program provided');
    return [];
  }

  const relationships: UnifiedRelationship[] = [];
  const callSites: CallSite[] = [];

  // Step 1: Extract data from AST
  for (const [symbolId, symbol] of this.graph.symbols.entries()) {
    if (symbol.type === 'function' || symbol.type === 'method') {
      const sites = this.extractCallSites(symbol);
      callSites.push(...sites);
    }
  }

  // Step 2: Resolve targets and create relationships
  for (const site of callSites) {
    const targetSymbol = this.resolveTarget(site);
    if (targetSymbol) {
      const relationship = this.createRelationship(site, targetSymbol);
      relationships.push(relationship);
    }
  }

  // Step 3: Deduplicate
  return this.deduplicateRelationships(relationships);
}

/**
 * Extract call sites from symbol's AST
 */
private extractCallSites(symbol: Symbol): CallSite[] {
  const callSites: CallSite[] = [];
  const sourceFile = this.getSourceFile(symbol.filePath);

  if (!sourceFile) return callSites;

  // Find the symbol's node in the AST
  const symbolNode = this.findSymbolNode(sourceFile, symbol);
  if (!symbolNode) return callSites;

  // Walk the AST and find CallExpression nodes
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callSite = this.analyzeCallExpression(node, symbol);
      if (callSite) {
        callSites.push(callSite);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(symbolNode);

  return callSites;
}
```

**Reference**: [[CallGraphAnalyzer]] (`src/analyzer/CallGraphAnalyzer.ts:92-134`)

---

### Pattern 2: Type-Based Analysis (Data Flow)

For detecting type relationships (I/O deps, type chains):

```typescript
/**
 * Example: I/O Dependency Analysis
 * Based on: src/analyzer/IODependencyAnalyzer.ts:44
 */
analyze(): UnifiedRelationship[] {
  const relationships: UnifiedRelationship[] = [];

  // Step 1: Build type maps (producers and consumers)
  const { producers, consumers } = this.buildTypeMaps();

  // Step 2: Match producers with consumers
  for (const [typeName, producerSymbols] of producers.entries()) {
    const consumerSymbols = consumers.get(typeName);

    if (!consumerSymbols) continue;

    for (const producer of producerSymbols) {
      for (const consumer of consumerSymbols) {
        // Don't relate a symbol to itself
        if (producer.symbolId === consumer.symbolId) continue;

        // Create relationship
        const relationship = this.createIODependency(
          producer,
          consumer,
          typeName
        );

        relationships.push(relationship);
      }
    }
  }

  return relationships;
}

/**
 * Build producer and consumer maps
 */
private buildTypeMaps(): {
  producers: Map<string, ProducerInfo[]>;
  consumers: Map<string, ConsumerInfo[]>;
} {
  const producers = new Map();
  const consumers = new Map();

  for (const [symbolId, symbol] of this.graph.symbols.entries()) {
    // Extract return type (producer)
    const returnType = this.extractReturnType(symbol);
    if (returnType && !this.isPrimitiveType(returnType)) {
      if (!producers.has(returnType)) {
        producers.set(returnType, []);
      }
      producers.get(returnType)!.push({
        symbolId,
        symbolName: symbol.name,
        returnType
      });
    }

    // Extract parameter types (consumer)
    const paramTypes = this.extractParameterTypes(symbol);
    for (const paramType of paramTypes) {
      if (!this.isPrimitiveType(paramType)) {
        if (!consumers.has(paramType)) {
          consumers.set(paramType, []);
        }
        consumers.get(paramType)!.push({
          symbolId,
          symbolName: symbol.name,
          paramType
        });
      }
    }
  }

  return { producers, consumers };
}
```

**Reference**: [[IODependencyAnalyzer]] (`src/analyzer/IODependencyAnalyzer.ts:44-124`)

---

### Pattern 3: Graph-Based Analysis (Structural)

For analyzing existing relationships:

```typescript
/**
 * Example: Dependency Chain Analysis
 */
analyze(): UnifiedRelationship[] {
  const relationships: UnifiedRelationship[] = [];

  // Step 1: Get existing dependencies
  const dependencies = this.graph.getRelationshipsByType('code-dependency');

  // Step 2: Find chains (A → B → C)
  for (const dep1 of dependencies) {
    // Find dependencies starting from dep1.to
    const nextDeps = dependencies.filter(d => d.from === dep1.to);

    for (const dep2 of nextDeps) {
      // Found a chain: dep1.from → dep1.to → dep2.to
      const chain = this.createChainRelationship(dep1, dep2);
      relationships.push(chain);
    }
  }

  return relationships;
}
```

---

## Step 4: Create Relationships

### Relationship Format

All analyzers return `UnifiedRelationship[]`:

See implementation: [[UnifiedRelationships]]

**Core Fields**:
- `id`: Unique ID (format: "type-from-to")
- `type`: Relationship type ("calls", "io-dependency", etc.)
- `category`: Category ("behavioral", "data-flow", etc.)
- `from`, `to`: Source and target symbol IDs
- `direction`: 'unidirectional' or 'bidirectional'
- `strength`: 'strong', 'medium', or 'weak'
- `evidence`: Array of supporting evidence
- `metadata`: Additional type-specific data (optional)

For complete specification, see [[Relationship Standard Format]]

### Creating a Relationship

```typescript
private createRelationship(
  from: Symbol,
  to: Symbol,
  metadata?: any
): UnifiedRelationship {
  return {
    id: `your-type-${from.id}-${to.id}`,
    type: 'your-relationship-type',
    category: 'behavioral', // or 'structural', 'data-flow', etc.
    from: from.id,
    to: to.id,
    direction: 'unidirectional',
    strength: this.calculateStrength(from, to),
    evidence: [{
      type: 'ast-analysis',
      source: from.filePath,
      line: from.location.line,
      description: `${from.name} relates to ${to.name}`,
      confidence: 0.9
    }],
    metadata: {
      ...metadata,
      detectedBy: 'YourAnalyzer',
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Calculate relationship strength
 */
private calculateStrength(from: Symbol, to: Symbol): 'strong' | 'medium' | 'weak' {
  // Example: Based on confidence score
  const confidence = this.calculateConfidence(from, to);

  if (confidence > 0.8) return 'strong';
  if (confidence > 0.5) return 'medium';
  return 'weak';
}
```

---

## Step 5: Add Helper Methods

### Common Helper Patterns

#### 1. Type Extraction

```typescript
/**
 * Extract return type from symbol
 */
private extractReturnType(symbol: Symbol): string | null {
  if (!this.typeChecker || !symbol.typeSignature) {
    return null;
  }

  // Parse type signature for return type
  const match = symbol.typeSignature.match(/:\s*([^=>;]+)/);
  return match ? match[1].trim() : null;
}

/**
 * Extract parameter types
 */
private extractParameterTypes(symbol: Symbol): string[] {
  if (!symbol.typeSignature) return [];

  const params: string[] = [];
  // Parse parameters from type signature
  const match = symbol.typeSignature.match(/\(([^)]*)\)/);
  if (!match) return params;

  const paramStr = match[1];
  const paramList = paramStr.split(',');

  for (const param of paramList) {
    const typeMatch = param.match(/:\s*([^=]+)/);
    if (typeMatch) {
      params.push(typeMatch[1].trim());
    }
  }

  return params;
}

/**
 * Check if type is primitive
 */
private isPrimitiveType(typeName: string): boolean {
  const primitives = ['string', 'number', 'boolean', 'void', 'any', 'unknown', 'never'];
  return primitives.includes(typeName.toLowerCase());
}
```

#### 2. AST Navigation

```typescript
/**
 * Get source file for a path
 */
private getSourceFile(filePath: string): ts.SourceFile | undefined {
  if (!this.program) return undefined;

  const normalized = filePath.replace(/\\/g, '/');

  for (const sourceFile of this.program.getSourceFiles()) {
    if (sourceFile.fileName.replace(/\\/g, '/').endsWith(normalized)) {
      return sourceFile;
    }
  }

  return undefined;
}

/**
 * Find symbol's AST node
 */
private findSymbolNode(sourceFile: ts.SourceFile, symbol: Symbol): ts.Node | null {
  let found: ts.Node | null = null;

  const visit = (node: ts.Node) => {
    // Check if this node matches the symbol
    if (this.nodeMatchesSymbol(node, symbol)) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

/**
 * Check if AST node matches symbol
 */
private nodeMatchesSymbol(node: ts.Node, symbol: Symbol): boolean {
  // Match by type and name
  if (symbol.type === 'function' && ts.isFunctionDeclaration(node)) {
    return node.name?.getText() === symbol.name;
  }

  if (symbol.type === 'class' && ts.isClassDeclaration(node)) {
    return node.name?.getText() === symbol.name;
  }

  // Add more type checks as needed

  return false;
}
```

#### 3. Relationship Deduplication

```typescript
/**
 * Remove duplicate relationships
 */
private deduplicateRelationships(relationships: UnifiedRelationship[]): UnifiedRelationship[] {
  const seen = new Set<string>();
  const unique: UnifiedRelationship[] = [];

  for (const rel of relationships) {
    const key = `${rel.type}-${rel.from}-${rel.to}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(rel);
    }
  }

  return unique;
}
```

---

## Step 6: Integrate with Command

### Create Analysis Command

Create a command to run your analyzer:

```typescript
// src/commands/AnalyzeYourCommand.ts

import { BaseCommand, type CommandResult } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../utilities/SymbolGraphBuilder';
import { YourAnalyzer } from '../analyzer/YourAnalyzer';

export class AnalyzeYourCommand extends BaseCommand {
  getName(): string {
    return 'analyze-your-feature';
  }

  getDescription(): string {
    return 'Analyze your custom relationships';
  }

  async execute(args: string[]): Promise<CommandResult> {
    this.printHeader('Analyzing Your Feature');

    // 1. Load database
    const dbManager = new DatabaseManager('.tsdoc/symbols.db');

    // 2. Build symbol graph
    this.printSection('Building symbol graph...');
    const builder = new SymbolGraphBuilder(dbManager);
    const graph = builder.buildGraph();

    // 3. Create TypeScript program (if needed for AST analysis)
    const program = this.createProgram(['src']);

    // 4. Run analyzer
    this.printSection('Running analysis...');
    const analyzer = new YourAnalyzer(graph, program);
    const relationships = analyzer.analyze();

    // 5. Save to database
    this.printSection('Saving relationships...');
    for (const rel of relationships) {
      dbManager.insertRelationship(rel);
    }

    // 6. Display results
    console.log(`\nFound ${relationships.length} relationships`);

    return { exitCode: 0 };
  }

  private createProgram(paths: string[]): ts.Program {
    // Create TypeScript program from paths
    // Implementation similar to BuildCommand
  }
}
```

**Reference**: [[AnalyzeCallsCommand]] (`src/commands/AnalyzeCallsCommand.ts`)

---

## Step 7: Test Your Analyzer

### Unit Tests

Create `src/__tests__/analyzer/YourAnalyzer.test.ts`:

```typescript
import { YourAnalyzer } from '../../analyzer/YourAnalyzer';
import type { SymbolGraph } from '../../types/graph';

describe('YourAnalyzer', () => {
  let analyzer: YourAnalyzer;
  let mockGraph: SymbolGraph;

  beforeEach(() => {
    mockGraph = {
      symbols: new Map([
        ['symbol-a', {
          id: 'symbol-a',
          name: 'SymbolA',
          type: 'function',
          filePath: '/test/a.ts',
          // ... other properties
        }],
        ['symbol-b', {
          id: 'symbol-b',
          name: 'SymbolB',
          type: 'function',
          filePath: '/test/b.ts',
          // ... other properties
        }]
      ]),
      relationships: []
    };

    analyzer = new YourAnalyzer(mockGraph);
  });

  it('should detect relationships', () => {
    const results = analyzer.analyze();
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('your-relationship-type');
  });

  it('should handle empty graph', () => {
    mockGraph.symbols.clear();
    const results = analyzer.analyze();
    expect(results).toHaveLength(0);
  });

  it('should deduplicate relationships', () => {
    const results = analyzer.analyze();
    const uniqueKeys = new Set(results.map(r => `${r.from}-${r.to}`));
    expect(uniqueKeys.size).toBe(results.length);
  });
});
```

### Integration Tests

```typescript
describe('YourAnalyzer Integration', () => {
  it('should analyze real codebase', async () => {
    // 1. Build real symbol graph
    const dbManager = new DatabaseManager(':memory:');
    const extractor = new ASTSymbolExtractor();
    const symbols = await extractor.extractFromDirectory('src/commands');

    // 2. Create graph
    const builder = new SymbolGraphBuilder(dbManager);
    const graph = builder.buildGraph();

    // 3. Run analyzer
    const analyzer = new YourAnalyzer(graph);
    const results = analyzer.analyze();

    // 4. Verify results
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.type === 'your-relationship-type')).toBe(true);
  });
});
```

---

## Best Practices

### 1. Performance Optimization

**DO**: Use Map/Set for fast lookups
```typescript
const typeMap = new Map<string, Symbol[]>();

// Fast lookup: O(1)
const symbols = typeMap.get(typeName) || [];
```

**DO**: Single-pass when possible
```typescript
// Build both maps in one iteration
for (const [id, symbol] of this.graph.symbols.entries()) {
  // Collect data for both producers and consumers
}
```

**DON'T**: Nested loops without filtering
```typescript
// ❌ Bad: O(n²)
for (const sym1 of symbols) {
  for (const sym2 of symbols) {
    // No filtering
  }
}

// ✅ Good: Filter early
for (const sym1 of symbols) {
  const candidates = this.filterCandidates(sym1);
  for (const sym2 of candidates) {
    // Smaller set
  }
}
```

---

### 2. Confidence Scoring

**DO**: Provide confidence scores
```typescript
private calculateConfidence(from: Symbol, to: Symbol): number {
  let confidence = 0.5; // Base confidence

  // Increase confidence based on evidence
  if (this.sameFile(from, to)) confidence += 0.2;
  if (this.strongTypeMatch(from, to)) confidence += 0.3;

  return Math.min(confidence, 1.0);
}
```

**DO**: Use evidence array
```typescript
evidence: [{
  type: 'type-signature',
  source: from.filePath,
  line: from.location.line,
  description: 'Return type matches parameter type',
  confidence: 0.9
}]
```

---

### 3. Error Handling

**DO**: Handle missing data gracefully
```typescript
analyze(): UnifiedRelationship[] {
  if (!this.program) {
    console.warn('YourAnalyzer: No program provided, limited analysis');
    return this.fallbackAnalysis();
  }

  // Full analysis with program
}
```

**DO**: Validate symbols
```typescript
private isValidSymbol(symbol: Symbol): boolean {
  return symbol.type === 'function'
    && symbol.typeSignature
    && !symbol.isExternal;
}
```

---

### 4. Documentation

**DO**: Complete TSDoc
```typescript
/**
 * Your Analyzer
 *
 * @public
 * @responsibility Detect [relationship type] via [method]
 * @requires SymbolGraph, optional TypeScript Program
 *
 * @problem [What problem does this solve?]
 * @solves [How does it solve it?]
 * @context [When is this needed?]
 *
 * @functionality
 * - [Feature 1]
 * - [Feature 2]
 * - [Performance characteristics]
 *
 * @example
 * ```typescript
 * const analyzer = new YourAnalyzer(graph, program);
 * const relationships = analyzer.analyze();
 * ```
 */
```

**DO**: Add inline comments for complex logic
```typescript
// Match producers with consumers via type name
// This creates a Cartesian product, so we filter early
for (const [typeName, producers] of producerMap) {
  const consumers = consumerMap.get(typeName);
  if (!consumers) continue; // Early filter: no matches possible
  // ...
}
```

---

## Relationship Types Reference

### Structural (Code Space)

- **code-dependency**: Import/export relationships
- **inheritance**: Class hierarchies
- **interface-impl**: Interface implementations
- **composition**: Component relationships

**Category**: `structural`

---

### Behavioral (Behavior Space)

- **calls**: Function calls
- **callback**: Callback patterns
- **event-flow**: Event handlers

**Category**: `behavioral`

---

### Data Flow (Data Space)

- **io-dependency**: Type flow (return → param)
- **pipeline**: Multi-step data transformations

**Category**: `data-flow`

---

### Type (Type Space)

- **type-dependency**: Type usage
- **generic-constraint**: Generic bounds

**Category**: `type-system`

---

### Quality (Meta Space)

- **test-coverage**: Test relationships
- **circular**: Circular dependencies

**Category**: `quality`

---

## Complete Example: CompositionAnalyzer

Here's a complete analyzer for detecting composition relationships:

```typescript
/**
 * Composition Analyzer
 *
 * @doc CompositionAnalyzer
 * @packageDocumentation
 * @responsibility Detect composition relationships (class has-a property)
 */

import * as ts from 'typescript';
import type { SymbolGraph, Symbol } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

export class CompositionAnalyzer {
  private graph: SymbolGraph;
  private program?: ts.Program;

  constructor(graph: SymbolGraph, program?: ts.Program) {
    this.graph = graph;
    this.program = program;
  }

  analyze(): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];

    for (const [symbolId, symbol] of this.graph.symbols.entries()) {
      if (symbol.type === 'class') {
        const compositions = this.detectComposition(symbol);
        relationships.push(...compositions);
      }
    }

    return relationships;
  }

  private detectComposition(classSymbol: Symbol): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];

    // Get class properties
    const properties = this.extractProperties(classSymbol);

    for (const prop of properties) {
      // Check if property type is a class in our graph
      const targetSymbol = this.findSymbolByName(prop.typeName);

      if (targetSymbol && targetSymbol.type === 'class') {
        const relationship: UnifiedRelationship = {
          id: `composition-${classSymbol.id}-${targetSymbol.id}`,
          type: 'composition',
          category: 'structural',
          from: classSymbol.id,
          to: targetSymbol.id,
          direction: 'unidirectional',
          strength: 'strong',
          evidence: [{
            type: 'property-declaration',
            source: classSymbol.filePath,
            line: prop.line,
            description: `${classSymbol.name} has property ${prop.name}: ${prop.typeName}`,
            confidence: 1.0
          }],
          metadata: {
            propertyName: prop.name,
            propertyType: prop.typeName,
            detectedBy: 'CompositionAnalyzer'
          }
        };

        relationships.push(relationship);
      }
    }

    return relationships;
  }

  private extractProperties(symbol: Symbol): Array<{
    name: string;
    typeName: string;
    line: number;
  }> {
    // Implementation: Parse class properties from AST or type signature
    return [];
  }

  private findSymbolByName(name: string): Symbol | undefined {
    for (const symbol of this.graph.symbols.values()) {
      if (symbol.name === name) {
        return symbol;
      }
    }
    return undefined;
  }
}
```

---

## Related Documentation

**Core**:
- [[CallGraphAnalyzer]] (`managed/analyzers/CallGraphAnalyzer.md`)
- [[IODependencyAnalyzer]] (`managed/analyzers/IODependencyAnalyzer.md`)
- [[CodeHealthChecker]] (`managed/analyzers/CodeHealthChecker.md`)

**Types**:
- [[UnifiedRelationships]] (`managed/types/UnifiedRelationships.md`)
- [[Symbol]] (`managed/types/Symbol.md`)

**Commands**:
- [[AnalyzeCallsCommand]] (`managed/commands/AnalyzeCallsCommand.md`)
- [[AnalyzeIOCommand]] (`managed/commands/AnalyzeIOCommand.md`)

**Guides**:
- [[CLI Command Development Guide]] (`managed/guides/command-development-guide.md`)
- [[Build Pipeline Guide]] (`managed/guides/build-pipeline-guide.md`)
- [[Relationship Analysis Guide]] (`managed/guides/relationship-analysis-guide.md`)

---

**Last Updated**: 2025-11-14
**Guide Type**: Development workflow for creating custom analyzers
**Audience**: Contributors extending TSDoc Edge analysis capabilities

---

## Backlinks

### Referenced By

- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:21
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:333

