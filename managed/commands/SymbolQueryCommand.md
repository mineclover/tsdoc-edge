# [[SymbolQueryCommand]]

**Source**: `src/commands/SymbolQueryCommand.ts`

## Purpose

Query and explore document symbols (`[[Symbol]]` references) across the documentation system. Provides comprehensive search, inspection, and navigation capabilities for the symbol reference network.

## Usage

```bash
tsdoc-edge symbol-query <subcommand> [options]
```

## Subcommands

### `list` - List All Symbols

Display all defined symbols with their status and reference counts.

```bash
tsdoc-edge symbol-query managed list
tsdoc-edge symbol-query managed list --all              # Include symbols without primary
tsdoc-edge symbol-query managed list --pattern="Command" # Filter by regex pattern
```

**Output**:
- ✅ Symbols with primary H1 definition
- ❌ Symbols without primary (broken references)
- Reference count and auxiliary count for each symbol

### `search` - Search Symbols

Find symbols matching a search pattern (case-insensitive regex).

```bash
tsdoc-edge symbol-query managed search "Build"
tsdoc-edge symbol-query managed search ".*Command$"
```

**Use Cases**:
- Find all commands: `search "Command$"`
- Find all analyzers: `search "Analyzer$"`
- Find related symbols: `search "Type.*"`

### `info` - Symbol Details

Show comprehensive information about a specific symbol.

```bash
tsdoc-edge symbol-query managed info "BuildCommand"
tsdoc-edge symbol-query managed info "BuildCommand" --all  # Show all references
```

**Information Displayed**:
1. **Primary Definition** (H1): File location, source code path, context
2. **Auxiliary Definitions** (H2+): All auxiliary definitions with locations
3. **References**: All inline references grouped by file (default: first 10)
4. **Code Connection**: Source file path if documented

**Example Output**:
```
Symbol: [[BuildCommand]]
────────────────────────────────────────────────────────
✅ Primary Definition (H1):
   File: managed/commands/BuildCommand.md:1
   Source: src/commands/BuildCommand.ts

   # [[BuildCommand]]

   **Source**: `src/commands/BuildCommand.ts`
   ...

Auxiliary Definitions (H3): 1
   - managed/COMMANDS.md:10

References: 33
   managed/README.md
      L24: Run [[BuildCommand]] to extract symbols...
      L47: After [[BuildCommand]] completes...
   ...
```

### `backlinks` - Show Backlinks

List all documents that reference or define a symbol.

```bash
tsdoc-edge symbol-query managed backlinks "BuildCommand"
```

**Output**:
- Document file paths
- Number of auxiliary definitions in each document
- Number of inline references in each document

**Use Cases**:
- Find all documents that discuss a concept
- Identify documentation dependencies
- Plan refactoring impact

### `similar` - Find Similar Symbols

Find symbols with similar names (typo detection, related concepts).

```bash
tsdoc-edge symbol-query managed similar "BuildComand"  # Typo
tsdoc-edge symbol-query managed similar "TypeAnalyzer"  # Related
```

**Similarity Factors**:
- Levenshtein edit distance
- Substring matching
- Word overlap

**Use Cases**:
- Fix typos in references
- Discover related symbols
- Check for potential duplicates

### `stats` - Statistics

Show overall symbol system statistics.

```bash
tsdoc-edge symbol-query managed stats
```

**Metrics**:
- Total symbols indexed
- Symbols with primary definition
- Symbols without primary (errors)
- Total references
- Total auxiliary definitions
- Average references per symbol

## Implementation

### Architecture

```
SymbolQueryCommand
├── Index Building: Parse all markdown files
│   ├── DocumentSymbolParser: Extract [[Symbol]] references
│   └── SymbolInfo Map: In-memory index
├── Query Processing: Execute subcommand
│   ├── Pattern matching (regex)
│   ├── Similarity calculation (Levenshtein)
│   └── Result formatting
└── Output Rendering: Colorized console output
```

### Similarity Algorithm

Calculates a score based on:
1. **Substring match**: +50 points
2. **Levenshtein distance**: +20 - (distance × 2) points
3. **Word overlap**: +10 per shared word

Returns top N matches above threshold (score > 10).

### Performance

- **Index Time**: ~200ms for 190 documents
- **Query Time**: < 10ms (in-memory)
- **Memory**: ~5MB for 283 symbols

## Integration

### Used By

- [[SymbolFixCommand]]: Queries symbols for fix suggestions
- [[ValidateSymbolRefsCommand]]: Uses similar algorithm for suggestions
- Manual documentation exploration and navigation

### Depends On

- [[DocumentSymbolParser]]: Symbol extraction
- [[BaseCommand]]: CLI infrastructure

## Examples

### Workflow: Fix Broken Reference

```bash
# 1. Find symbol causing error
tsdoc-edge validate-symbol-refs managed 2>&1 | grep "missing_primary"

# 2. Search for similar symbols
tsdoc-edge symbol-query managed similar "SymolName"  # Typo

# 3. Get info about correct symbol
tsdoc-edge symbol-query managed info "SymbolName"

# 4. Fix reference in documentation
# (Edit file manually or use symbol-fix)
```

### Workflow: Explore Documentation Network

```bash
# 1. List all command symbols
tsdoc-edge symbol-query managed list --pattern="Command$"

# 2. Pick a command and see its usage
tsdoc-edge symbol-query managed info "WorkContextCommand"

# 3. Find all docs that discuss it
tsdoc-edge symbol-query managed backlinks "WorkContextCommand"
```

### Workflow: Find Documentation Gaps

```bash
# 1. Get statistics
tsdoc-edge symbol-query managed stats

# 2. List symbols without primary
tsdoc-edge symbol-query managed list | grep "❌"

# 3. Check each one
tsdoc-edge symbol-query managed info "<symbol-without-primary>"
```

## Testing

```bash
# Unit tests
npm test src/commands/SymbolQueryCommand.test.ts

# Integration tests
./scripts/test-symbol-query.sh

# Manual testing
tsdoc-edge symbol-query managed list
tsdoc-edge symbol-query managed search "Build"
tsdoc-edge symbol-query managed info "BuildCommand"
```

## See Also

- [[Symbol Reference System]]: Three-tier symbol system (H1/H2/inline)
- [[SymbolFixCommand]]: Auto-fix symbol issues
- [[ValidateSymbolRefsCommand]]: Validate symbol consistency
- [[DocumentSymbolParser]]: Symbol extraction implementation
- [[SELF-IMPROVEMENT-PROCESS]]: Validation workflow

---

## Backlinks

### Referenced By

- [[BaseCommand]] → /home/user/tsdoc-edge/managed/commands/BaseCommand.md:66
- [[BaseCommand]] → /home/user/tsdoc-edge/managed/commands/BaseCommand.md:67
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:180
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:206
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:218
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:219
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:220
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:221
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:222
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:223
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:224
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:225
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:38
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:39
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:40
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:41
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:90
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:143
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:177
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:178
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:179
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:180
- [[Symbol Reference System]] → /home/user/tsdoc-edge/managed/concepts/symbol-reference-system.md:180
- [[Symbol Reference System]] → /home/user/tsdoc-edge/managed/concepts/symbol-reference-system.md:181
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:111
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:112
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:113
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:114
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:121
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:170
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:171
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:71
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:72

