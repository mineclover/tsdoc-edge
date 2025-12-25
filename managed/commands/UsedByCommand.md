---
title: Used By Command
type: command
category: commands
status: active
canonical: true
---

# [[UsedByCommand]]

**Source**: `src/commands/Phase5Commands.ts`

## Purpose

Show symbols that depend on a given symbol (reverse dependencies).

## Responsibility

Query the symbol registry to find all symbols that reference a target symbol by its ID.

## Input

### Command Syntax
```bash
tsdoc-edge used-by <symbol-id>
```

### Parameters
- `symbol-id` (required): Unique identifier of the symbol to check

### Examples
```bash
# Find what uses the symbol-graph-builder symbol
tsdoc-edge used-by symbol-graph-builder

# Find what uses the database-manager symbol
tsdoc-edge used-by database-manager
```

## Output

### Success Response
```
Symbols that use 'symbol-graph-builder':
- build-command (src/commands/BuildCommand.ts)
- analyze-calls-command (src/commands/AnalyzeCallsCommand.ts)
- work-context-command (src/commands/WorkContextCommand.ts)

Total: 3 symbols
```

### No Usages
```
No symbols use 'symbol-graph-builder'
```

### Error Cases
- Symbol ID not found: "Symbol 'unknown-symbol' not found in registry"
- Invalid format: "Symbol ID must be kebab-case"

## Context

### Dependencies
- **[[SymbolRegistryManager]]** (internal): Reverse dependency data
- **[[BaseCommand]]**: Command infrastructure

### Comparison: Registry vs Database

| Feature | UsedByCommand | [[WhoUsesCommand]] |
|---------|---------------|---------------------|
| **Lookup** | By symbol ID | By symbol name |
| **Source** | Registry (JSONL) | Database (SQLite) |
| **Speed** | Fast (in-memory) | Slower (query) |
| **Precision** | Exact ID match | Name-based search |
| **Use Case** | Known symbol ID | Name search |

## Logic

1. **Validate Input**: Check symbol ID format (kebab-case)
2. **Registry Lookup**: Call `SymbolRegistryManager.getUsedBy(symbolId)`
3. **Format Results**: Display reverse dependencies with file paths
4. **Count Total**: Show total number of dependent symbols

### Query Strategy
```typescript
// Registry stores bidirectional relationships
{
  "id": "symbol-graph-builder",
  "usedBy": ["build-command", "analyze-calls-command", ...]
}
```

## Effects

### Side Effects
- None (read-only query)

### Performance
- **Time**: O(1) registry lookup
- **Memory**: Minimal (returns reference list)

## Scope

### Public Interface
```typescript
interface UsedByCommandOptions {
  symbolId: string;
}
```

### Exit Codes
- `0`: Success (found usages or no usages)
- `1`: Error (symbol not found, invalid format)

## Related

### Similar Commands
- **[[DepsCommand]]**: Show forward dependencies (what symbol uses)
- **[[WhoUsesCommand]]**: Database-driven name-based reverse dependency search
- **[[OrphansCommand]]**: Find symbols with no dependencies or usages

### Workflows
- **[[Dependency Analysis]]**: Understanding symbol relationships
- **[[Impact Analysis]]**: Assess change impact before modifications
- **[[Work Context Workflow]]**: Get full context before editing

### Storage
- **[[SymbolRegistryManager]]**: JSONL storage layer
- **[[DatabaseManager]]**: Alternative SQL-based queries

## Implementation

### Source Location
`src/commands/Phase5Commands.ts` - Registry-based dependency commands

### Command Registration
```typescript
phase5Commands.push({
  command: 'used-by <symbol-id>',
  description: 'Show symbols that use a given symbol',
  action: async (symbolId: string) => {
    const registry = new SymbolRegistryManager();
    const usedBy = await registry.getUsedBy(symbolId);
    // Display results
  }
});
```

### Key Methods
- `SymbolRegistryManager.getUsedBy(id)`: Get reverse dependencies
- `SymbolRegistryManager.symbolExists(id)`: Validate symbol ID

## Use Cases

### 1. Impact Analysis
```bash
# Before modifying a symbol, check what depends on it
tsdoc-edge used-by database-manager

# Output shows all commands/analyzers that use it
# Assess whether changes will break dependents
```

### 2. Dead Code Detection
```bash
# Check if a symbol is actually used
tsdoc-edge used-by old-helper

# If no usages, consider for removal
```

### 3. API Surface Analysis
```bash
# Identify heavily-used symbols
tsdoc-edge used-by base-command

# High usage count → critical API, needs stability
```

### 4. Refactoring Planning
```bash
# List all dependents before refactoring
tsdoc-edge used-by symbol-extractor

# Plan migration path for all dependents
```

## Statistics

**Usage Frequency**: High (dependency analysis workflow)
**Typical Results**: 0-50 dependent symbols per query

---

## Backlinks

### Referenced By

- [[DepsCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/DepsCommand.md:104
- [[WhoUsesCommand]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/WhoUsesCommand.md:114
- [[Dead Code Detection]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/DeadCodeDetection.md:79
- [[Dependency Analysis]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/DependencyAnalysis.md:86
- [[Dependency Analysis]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/DependencyAnalysis.md:138
- [[Impact Analysis]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/ImpactAnalysis.md:97
- [[Impact Analysis]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/ImpactAnalysis.md:151

### Implemented By

- UsedByCommand → /Users/junwoobang/workflow/tsdoc-edge/src/commands/UsedByCommand.ts:39

