---
title: CallGraphAnalyzer
type: analyzer
category: relationships
status: active
canonical: true
aliases: [Call Graph Analyzer, CallAnalyzer, CallRelationshipAnalyzer]
---

# [[CallGraphAnalyzer]]

> **Detects function call relationships** via AST analysis for execution flow understanding

Also known as: **Call Graph Analyzer**, **CallAnalyzer**, **CallRelationshipAnalyzer**

## Purpose

Automatically detect and analyze function/method call relationships to enable execution flow understanding and impact analysis.

**Problem**: Functions call each other but relationships are implicit
- Need to read code to understand who calls what
- Execution flow is unclear
- Impact analysis is impossible

**Solution**: Automatic detection via `ts.isCallExpression` AST analysis

**Responsibility**: Detect and analyze function call relationships using TypeScript AST

## Input

### Constructor Parameters

- `graph: SymbolGraph` - Symbol graph for relationship storage
- `program?: ts.Program` - TypeScript program for AST access (optional)

### analyze() Parameters

None - analyzes all symbols in the graph

### Constraints

- **Requires TypeScript program**: Must call `setProgram()` before `analyze()`
- **Source files only**: Skips `.d.ts` declaration files
- **Static analysis only**: Cannot detect dynamic calls (`eval`, `Function()`)

## Output

### Return Value

`UnifiedRelationship[]` - Array of call relationships

### CallSite Interface

```typescript
interface CallSite {
  callerSymbolId: string;    // Symbol making the call
  callerName: string;        // Caller's name
  targetName: string;        // Name of called function
  targetSymbolId?: string;   // Resolved target symbol ID
  objectName?: string;       // Object for method calls (obj.method())
  filePath: string;          // File where call occurs
  line: number;              // Line number
  callType: 'direct' | 'method' | 'constructor' | 'unknown';
}
```

### UnifiedRelationship Output

```typescript
{
  id: "rel-call-123",
  type: "calls",
  from: "BuildCommand#execute",
  to: "DatabaseManager#saveSymbols",
  direction: "unidirectional",
  strength: "strong",
  category: "behavioral",
  evidence: [{
    type: "code",
    source: "src/commands/BuildCommand.ts",
    lineNumber: 50,
    snippet: "await this.db.saveSymbols(symbols);",
    confidence: 1.0
  }],
  discoveredBy: "ast-parsing",
  confidence: 1.0,
  properties: {
    callType: "method",
    objectName: "this.db"
  },
  filePath: "src/commands/BuildCommand.ts",
  line: 50,
  createdAt: "2025-11-09T00:00:00Z",
  updatedAt: "2025-11-09T12:00:00Z"
}
```

## Context

### Dependencies

- **TypeScript Compiler API** (`typescript`) - AST parsing
- `SymbolGraph` (`src/types/graph.ts`) - Symbol storage
- `UnifiedRelationship` (`src/types/relationships.ts`) - Relationship format

### Environment

- Node.js ≥ 16.x
- TypeScript project with valid `tsconfig.json`
- Compiled source files available

## Logic

### Algorithm

**Call Detection Flow**:

1. **Traverse AST**
   ```typescript
   for (const sourceFile of program.getSourceFiles()) {
     ts.forEachChild(sourceFile, visit);
   }
   ```

2. **Identify Call Expressions**
   ```typescript
   function visit(node: ts.Node) {
     if (ts.isCallExpression(node)) {
       extractCallSite(node);
     }
     ts.forEachChild(node, visit);
   }
   ```

3. **Extract Call Information**
   - Caller: Find containing function/method
   - Target: Resolve expression (identifier, property access)
   - Location: File path and line number
   - Type: Direct, method, or constructor call

4. **Resolve Target Symbol**
   ```typescript
   const targetSymbol = graph.findSymbolByName(targetName);
   if (targetSymbol) {
     callSite.targetSymbolId = targetSymbol.id;
   }
   ```

5. **Create Relationship**
   ```typescript
   const relationship: UnifiedRelationship = {
     type: 'calls',
     from: callerSymbolId,
     to: targetSymbolId,
     // ... other fields
   };
   ```

6. **Return Results**
   - Array of all detected call relationships
   - Sorted by file and line number

### Call Type Detection

**Direct Call**:
```typescript
foo();              // Identifier → direct
bar(arg1, arg2);    // Identifier with args → direct
```

**Method Call**:
```typescript
obj.method();       // PropertyAccessExpression → method
this.process();     // this.property → method
user.save();        // object.method → method
```

**Constructor Call**:
```typescript
new MyClass();      // NewExpression → constructor
new User(data);     // Constructor with args
```

**Unknown**:
```typescript
func[dynamicKey](); // Element access → unknown
eval('code');       // Dynamic execution → unknown (skipped)
```

### Performance

- **Time**: O(n×m) where n=files, m=avg nodes per file
- **Space**: O(k) where k=number of call sites
- **Typical**: ~500ms for 100 files, ~1,500 call sites

### Optimizations

- **Source file caching**: Pre-cache source files for faster lookup
- **Symbol name index**: Quick target symbol resolution
- **Normalized paths**: Handle Windows/Unix path differences

## Effect

### Side Effects

**None** - Pure analysis, no mutations

### I/O Operations

- **Read**: Source files via TypeScript program (in-memory)
- **Write**: None
- **Console**: Warning if no program provided

### Observable Changes

None - stateless analysis

## Scope

### Public API

```typescript
class CallGraphAnalyzer {
  // Constructor
  constructor(graph: SymbolGraph, program?: ts.Program);

  // Set TypeScript program
  setProgram(program: ts.Program): void;

  // Main analysis method
  analyze(): UnifiedRelationship[];
}
```

### Private Methods

```typescript
private extractCallSites(sourceFile: ts.SourceFile): CallSite[];
private findContainingSymbol(node: ts.Node): string | null;
private resolveCallTarget(expression: ts.Expression): string | null;
private createRelationship(callSite: CallSite): UnifiedRelationship;
```

### API Stability

- **Stable**: `constructor()`, `analyze()`, `setProgram()`
- **Unstable**: None
- **Planned**: Async call detection, callback chain tracking

## Use Cases

### 1. Impact Analysis

**Scenario**: Changing a function - who is affected?

```bash
# Find all callers of saveSymbols
tsdoc-edge deps DatabaseManager#saveSymbols --reverse --type=calls

# Output:
# Callers of DatabaseManager#saveSymbols:
# - BuildCommand#execute (src/commands/BuildCommand.ts:50)
# - WorkContextCommand#analyze (src/commands/WorkContextCommand.ts:120)
# - ValidateCommand#run (src/commands/ValidateCommand.ts:80)
```

### 2. Execution Flow Visualization

**Scenario**: Understand feature execution flow

```bash
# Trace call chain from entry point
tsdoc-edge tree BuildCommand#execute --type=calls

# Output:
# BuildCommand#execute
# ├── ASTSymbolExtractor#extract
# │   ├── TypeScript.createSourceFile
# │   └── TSDocParser#parse
# ├── DatabaseManager#saveSymbols
# │   └── better-sqlite3.insert
# └── SymbolGraphBuilder#build
#     ├── addSymbol
#     └── addRelationship
```

### 3. Dead Code Detection

**Scenario**: Find unused functions

```bash
# Find functions with zero callers
tsdoc-edge orphans --type=function

# Output:
# Orphaned functions (never called):
# - utils/legacy.ts:processOldFormat
# - helpers/unused.ts:debugHelper
# - temp/experimental.ts:experimentalFeature
```

### 4. Hotspot Identification

**Scenario**: Most-called functions (performance bottlenecks)

```typescript
const callGraph = analyzer.analyze();
const callCounts = new Map<string, number>();

callGraph.forEach(rel => {
  const count = callCounts.get(rel.to as string) || 0;
  callCounts.set(rel.to as string, count + 1);
});

const hotspots = Array.from(callCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log('Top 10 most-called functions:');
hotspots.forEach(([symbolId, count]) => {
  console.log(`  ${symbolId}: ${count} callers`);
});
```

## Example Output

### CallSite Example

```typescript
{
  callerSymbolId: "BuildCommand#execute",
  callerName: "execute",
  targetName: "saveSymbols",
  targetSymbolId: "DatabaseManager#saveSymbols",
  objectName: "this.db",
  filePath: "src/commands/BuildCommand.ts",
  line: 50,
  callType: "method"
}
```

### UnifiedRelationship Example

```typescript
{
  id: "rel-call-001",
  type: "calls",
  from: "BuildCommand#execute",
  to: "DatabaseManager#saveSymbols",
  direction: "unidirectional",
  strength: "strong",
  category: "behavioral",
  evidence: [
    {
      type: "code",
      source: "src/commands/BuildCommand.ts",
      lineNumber: 50,
      snippet: "await this.db.saveSymbols(allSymbols);",
      confidence: 1.0,
      context: "Main build execution flow"
    }
  ],
  discoveredBy: "ast-parsing",
  confidence: 1.0,
  filePath: "src/commands/BuildCommand.ts",
  line: 50,
  properties: {
    callType: "method",
    objectName: "this.db",
    isAsync: true,
    argumentCount: 1
  },
  createdAt: "2025-11-09T00:00:00Z",
  updatedAt: "2025-11-09T12:00:00Z",
  description: "BuildCommand persists extracted symbols"
}
```

## Limitations

### Cannot Detect

**Dynamic Calls**:
```typescript
const funcName = 'process';
obj[funcName]();  // Cannot resolve target

eval('foo()');    // Cannot analyze

const fn = Math.random() > 0.5 ? foo : bar;
fn();             // Cannot determine which function
```

**Indirect Calls**:
```typescript
setTimeout(() => process(), 1000);  // Callback not detected as direct call
promise.then(handleResult);         // Promise chain not tracked
```

**External Library Calls**:
```typescript
lodash.map(array, fn);  // External library, not tracked
```

### Workarounds

**For dynamic calls**: Use runtime tracing
**For callbacks**: Use [[Callback Pattern]] analyzer (planned)
**For external libraries**: Manual documentation

## Related

- [[Call Relationships]] (`../relationships/CALLS.md`) - Relationship type documentation
- [[SymbolGraphBuilder]] - Graph construction that uses this analyzer
- [[DatabaseManager]] (`../core-components/DatabaseManager.md`) - Stores relationships
- [[Unified Relationship Taxonomy]] (`../concepts/unified-relationship-taxonomy.md`) - Calls category
- [[Pipeline]] - Sequential call chains
- [[WorkContextCommand]] - Uses call graph for impact analysis

## Comparison: CallGraphAnalyzer vs Other Analyzers

| Aspect | CallGraphAnalyzer | ASTSymbolExtractor | DependencyResolver |
|--------|------------------|--------------------|--------------------|
| **Detects** | Function calls | Symbol definitions | Import statements |
| **Category** | Behavioral | Structural | Structural |
| **Confidence** | 1.0 (exact) | 1.0 (exact) | 1.0 (exact) |
| **AST Node** | CallExpression | Various declarations | ImportDeclaration |
| **Output** | calls relationships | Symbol objects | code-dependency |
| **Performance** | O(n×m) | O(n) | O(n) |

## Integration Example

```typescript
import { CallGraphAnalyzer } from './analyzer/CallGraphAnalyzer';
import { SymbolGraph } from './graph/SymbolGraph';
import * as ts from 'typescript';

// 1. Create TypeScript program
const program = ts.createProgram(['src/**/*.ts'], {
  target: ts.ScriptTarget.ES2020
});

// 2. Build symbol graph
const graph = new SymbolGraph();
// ... populate graph with symbols

// 3. Create analyzer
const analyzer = new CallGraphAnalyzer(graph, program);

// 4. Analyze calls
const callRelationships = analyzer.analyze();

console.log(`Detected ${callRelationships.length} call relationships`);

// 5. Store in database
for (const rel of callRelationships) {
  await db.saveRelationship(rel);
}

// 6. Query for impact analysis
const callers = callRelationships.filter(
  rel => rel.to === 'DatabaseManager#saveSymbols'
);

console.log(`saveSymbols is called by ${callers.length} functions`);
```

## Source

**Location**: `src/analyzer/CallGraphAnalyzer.ts`

**Tests**: `src/__tests__/CallGraphAnalyzer.test.ts`

## Status

**Current**: Active, production-ready
**Coverage**: Direct calls, method calls, constructor calls
**Version**: v1.0
**Typical output**: ~1,500 call relationships for medium project

---

**Last Updated**: 2025-11-09
**Call Types Supported**: 3 (direct, method, constructor)
**Average Confidence**: 1.0 (exact AST-based detection)

---

## Backlinks

### Referenced By

- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:169
- [[DataFlowAnalyzer]] → /home/user/tsdoc-edge/managed/analyzers/DataFlowAnalyzer.md:20
- [[Analyzers & Extractors]] → /home/user/tsdoc-edge/managed/analyzers/index.md:218
- [[AnalyzeCallsCommand]] → /home/user/tsdoc-edge/managed/commands/AnalyzeCallsCommand.md:21
- [[Phase7Commands]] → /home/user/tsdoc-edge/managed/commands/Phase7Commands.md:22
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:66
- [[Unified Relationship Taxonomy]] → /home/user/tsdoc-edge/managed/concepts/unified-relationship-taxonomy.md:472
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:214
- [[SymbolGraphFeatures]] → /home/user/tsdoc-edge/managed/features/symbol-graph.md:132
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:57
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:121
- [[Build Pipeline Guide]] → /home/user/tsdoc-edge/managed/guides/build-pipeline-guide.md:244
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:140
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:279
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:118
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:264
- [[Relationship Analysis Guide]] → /home/user/tsdoc-edge/managed/guides/relationship-analysis-guide.md:327
- [[Quick Start Guide]] → /home/user/tsdoc-edge/managed/quick-start.md:47
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:211
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:10
- [[Call Relationships]] → /home/user/tsdoc-edge/managed/relationships/CALLS.md:49
- [[Pipeline]] → /home/user/tsdoc-edge/managed/relationships/PIPELINE.md:18
- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:64
- [[SymbolGraphBuilder]] → /home/user/tsdoc-edge/managed/utilities/SymbolGraphBuilder.md:99

