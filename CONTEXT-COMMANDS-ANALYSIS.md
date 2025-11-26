# Context Commands Analysis

**Analysis of TSDoc Edge context discovery commands**

---

## Overview

TSDoc Edge provides **4 context commands** for different entry points:

1. **`work-context`** (alias: `wc`) - File-based context
2. **`context`** - Symbol-based context
3. **`design-context`** - Design decision context
4. **`context-to-llm`** - LLM format converter

---

## Command 1: work-context (Primary)

**Purpose**: Provide comprehensive context before editing a file

### Usage

```bash
tsdoc-edge work-context <file-path> [options]
# Alias
tsdoc-edge wc <file-path> [options]

Options:
  --llm              Generate LLM-friendly context (LLMs.txt format)
  --output <file>    Save output to file
  --depth <n>        Context depth for LLM mode (default: 2)
```

### What It Provides

Based on relationship graph analysis:
- 📄 **Symbols**: All symbols defined in the file
- 📚 **Documentation**: Related documentation symbols
- 🔗 **Dependencies**: What this file depends on
- 👥 **Used By**: What depends on this file
- 🧪 **Tests**: Test files covering this code
- 🔀 **Type Flows**: Type dependencies and chains
- 📊 **Relationships**: All relationship types

### Implementation

- **Command**: `src/commands/WorkContextCommand.ts`
- **Analyzers**:
  - `EnhancedWorkContextAnalyzer` - Core analysis
  - `EntryPointContextAggregator` - Context aggregation
- **Output**: `LLMsTextGenerator` for --llm format

### Examples

```bash
# Human-readable format
tsdoc-edge work-context src/storage/DatabaseManager.ts

# LLM-friendly format
tsdoc-edge wc src/commands/BuildCommand.ts --llm

# Save to file
tsdoc-edge wc src/analyzer/Parser.ts --llm --output context.txt
```

### Use Cases

1. **Before editing a file**: Get all context needed
2. **Code review**: Understand file's role in system
3. **LLM context**: Provide comprehensive context to AI assistants

---

## Command 2: context

**Purpose**: Show relationship context for a specific symbol

### Usage

```bash
tsdoc-edge context <symbol-id> [options]

Options:
  --depth <n>          Traverse N hops (default: 1)
  --type <types>       Filter by relationship types (comma-separated)
  --category <cats>    Filter by categories (comma-separated)
  --min-confidence <n> Minimum confidence (0-1)
```

### What It Provides

Based on relationship graph traversal:
- 🔗 **Direct relationships**: All 1-hop connections
- 📊 **Relationship types**: Grouped by type and category
- 🎯 **Filtered results**: By type, category, or confidence
- 🕸️ **Multi-hop traversal**: With --depth option

### Implementation

- **Command**: `src/commands/ContextCommand.ts`
- **Query Engine**: `RelationshipQueryEngine`
- **Database**: Queries `unified_relationships` table

### Examples

```bash
# Basic context
tsdoc-edge context class-databasemanager

# Multi-hop traversal
tsdoc-edge context class-databasemanager --depth 2

# Filter by type
tsdoc-edge context class-buildcommand --type doc-reference,test-coverage
```

### Use Cases

1. **Symbol exploration**: Understand a specific symbol's connections
2. **Dependency analysis**: Find all relationships
3. **Impact assessment**: See what's affected by changes

---

## Command 3: design-context

**Purpose**: Provide design decision and contract context

### Usage

```bash
tsdoc-edge design-context <file-path>
```

### What It Provides

Design-focused context:
- 📜 **Contracts**: Preconditions, postconditions, invariants
- 🏛️ **Design Decisions**: ADR (Architecture Decision Records)
- ⚠️ **Error Patterns**: Known pitfalls and common mistakes
- 📊 **Relationship Statistics**: Density, explicit/inferred ratios
- 🧪 **Tests**: Test coverage information
- 🔗 **Dependencies**: Type flows and dependencies

### Implementation

- **Command**: `src/commands/DesignContextCommand.ts`
- **Parsers**: TSDocParser, DocumentSymbolParser
- **Graph**: SymbolGraphBuilder
- **Focus**: Design documentation and contracts

### Examples

```bash
# Get design context for a file
tsdoc-edge design-context src/storage/DatabaseManager.ts
```

### Use Cases

1. **Design review**: Understand design decisions
2. **Contract verification**: Check preconditions/postconditions
3. **Error prevention**: Learn from known pitfalls
4. **Architecture understanding**: See ADRs and rationale

---

## Command 4: context-to-llm

**Purpose**: Convert context to LLM-friendly format

### Usage

```bash
tsdoc-edge context-to-llm <input-file> [options]
```

### What It Provides

- Converts any context output to LLMs.txt format
- Structured for AI consumption
- Includes metadata and relationships

### Implementation

- **Command**: `src/commands/ContextToLLMCommand.ts`
- **Generator**: `LLMsTextGenerator`

---

## Comparison Matrix

| Feature | work-context | context | design-context | context-to-llm |
|---------|-------------|---------|----------------|----------------|
| **Input** | File path | Symbol ID | File path | File |
| **Output** | Comprehensive | Relationships | Design docs | LLM format |
| **LLM Format** | ✅ (--llm) | ❌ | ❌ | ✅ |
| **Depth Control** | ✅ | ✅ | ❌ | N/A |
| **Filtering** | ❌ | ✅ | ❌ | N/A |
| **Contracts** | ❌ | ❌ | ✅ | N/A |
| **Design Decisions** | ❌ | ❌ | ✅ | N/A |
| **Aliases** | wc | - | - | - |
| **Primary Use** | Editing prep | Symbol explore | Design review | LLM input |

---

## Integration Analysis

### Strengths ✅

1. **Multiple Entry Points**: File, symbol, design-focused
2. **LLM Support**: Built-in --llm format for work-context
3. **Relationship Graph**: Leverages unified relationship system
4. **Comprehensive**: work-context provides everything needed
5. **Aliases**: `wc` for quick access
6. **Filtering**: context command supports type/category filters

### Gaps 🔍

1. **Inconsistent LLM Support**:
   - work-context: ✅ --llm flag
   - context: ❌ No LLM format
   - design-context: ❌ No LLM format

2. **No Unified Interface**:
   - work-context: File path
   - context: Symbol ID
   - design-context: File path
   - User must know which command for which input

3. **Duplicate Functionality**:
   - work-context and design-context both take file paths
   - Unclear when to use which

4. **Limited Filtering in work-context**:
   - context has type/category filters
   - work-context doesn't

5. **No Batch Processing**:
   - Can't get context for multiple files at once

---

## Recommendations

### Quick Wins

1. **Add LLM format to all commands**:
   ```bash
   tsdoc-edge context class-foo --llm
   tsdoc-edge design-context file.ts --llm
   ```

2. **Add filtering to work-context**:
   ```bash
   tsdoc-edge work-context file.ts --category structural
   tsdoc-edge work-context file.ts --type code-dependency
   ```

3. **Merge design-context into work-context**:
   ```bash
   tsdoc-edge work-context file.ts --design
   # Shows contracts, ADRs, error patterns in addition to relationships
   ```

4. **Add batch mode**:
   ```bash
   tsdoc-edge work-context src/**/*.ts --llm --output contexts/
   # Generates context for all files
   ```

### Medium Priority

5. **Unified context command**:
   ```bash
   # Auto-detect: file path vs symbol ID
   tsdoc-edge context src/file.ts
   tsdoc-edge context class-foo
   ```

6. **Smart defaults**:
   - If file path provided → work-context behavior
   - If symbol ID provided → context behavior
   - Add --design flag for design-context behavior

7. **Caching**:
   - Cache frequently accessed contexts
   - Invalidate on file changes

### Long-term

8. **Interactive mode**:
   ```bash
   tsdoc-edge context --interactive
   # Drop into REPL for exploring contexts
   ```

9. **Context diff**:
   ```bash
   tsdoc-edge context-diff file.ts main..feature
   # Show how context changed between branches
   ```

10. **Context export**:
    ```bash
    tsdoc-edge context file.ts --export json
    tsdoc-edge context file.ts --export markdown
    ```

---

## Current Status

### Implemented ✅

- ✅ work-context: File-based comprehensive context
- ✅ context: Symbol-based relationship context
- ✅ design-context: Design decision context
- ✅ context-to-llm: LLM format converter
- ✅ LLM format for work-context (--llm flag)
- ✅ Filtering for context command
- ✅ Alias: wc for work-context

### Missing ❌

- ❌ LLM format for context command
- ❌ LLM format for design-context command
- ❌ Filtering for work-context
- ❌ Unified interface
- ❌ Batch processing
- ❌ Caching

---

## Usage Examples

### Scenario 1: Before Editing a File

```bash
# Quick context
tsdoc-edge wc src/storage/DatabaseManager.ts

# For LLM
tsdoc-edge wc src/storage/DatabaseManager.ts --llm > context.txt
```

### Scenario 2: Exploring a Symbol

```bash
# Basic relationships
tsdoc-edge context class-databasemanager

# Deep exploration
tsdoc-edge context class-databasemanager --depth 3

# Filtered
tsdoc-edge context class-databasemanager --category structural,behavioral
```

### Scenario 3: Design Review

```bash
# Get design decisions and contracts
tsdoc-edge design-context src/commands/BuildCommand.ts
```

### Scenario 4: LLM Context Generation

```bash
# Generate comprehensive LLM context
tsdoc-edge wc src/analyzer/Parser.ts --llm --output parser-context.txt

# Convert existing context
tsdoc-edge context-to-llm existing-context.json
```

---

## Implementation Files

### Commands
- `src/commands/WorkContextCommand.ts` (~400 lines)
- `src/commands/ContextCommand.ts` (~300 lines)
- `src/commands/DesignContextCommand.ts` (~600 lines)
- `src/commands/ContextToLLMCommand.ts` (~200 lines)

### Analyzers
- `src/analyzer/EnhancedWorkContextAnalyzer.ts`
- `src/analyzer/EntryPointContextAggregator.ts`

### Query Engines
- `src/query/RelationshipQueryEngine.ts`

### Generators
- `src/generator/LLMsTextGenerator.ts`

---

## Conclusion

TSDoc Edge has a **comprehensive context system** with multiple entry points, but there are opportunities for improvement:

**Key Strengths**:
- Multiple specialized commands for different use cases
- LLM integration (work-context)
- Relationship graph integration
- Comprehensive file-based context (work-context)

**Key Opportunities**:
1. Unify LLM format across all commands
2. Add filtering to work-context
3. Consider merging or simplifying command structure
4. Add batch processing capability

**Priority**: The work-context command is the most important and well-implemented. Focus improvements there first.

---

**Last Updated**: 2025-11-25
**Version**: 0.12.1
