# [[Document Symbol System]]

**Core Components**: `src/doc-symbol/`

## Purpose

Enable bidirectional linking between documentation files using `[[Symbol]]` notation with SSOT (Single Source of Truth) enforcement and automatic backlink management.

## Problem

Traditional documentation systems have several issues:
- **Broken Links**: Manual URL/path management leads to broken links
- **No Backlinks**: Can't find who references a document
- **No Validation**: Orphaned pages and dead links go unnoticed
- **Weak SSOT**: Multiple definitions of same concept

## Solution

Symbol-based linking system with three-tier notation:

### 1. Symbol Notation

```markdown
# [[PrimarySymbol]]        # H1: Primary definition (SSOT, exactly one)
## [[AuxiliarySymbol]]     # H2+: Auxiliary definition (context-specific, multiple allowed)
See [[Reference]]          # Inline: Reference (unlimited)
```

**Enforcement**: Each symbol must have exactly one H1 primary definition.

### 2. Core Components

| Component | Purpose | Source |
|-----------|---------|--------|
| [[DocumentSymbolParser]] | Extract symbols from markdown | `src/doc-symbol/DocumentSymbolParser.ts` |
| [[DocumentSymbolRegistry]] | Enforce SSOT validation | `src/doc-symbol/DocumentSymbolRegistry.ts` |
| [[BacklinkGenerator]] | Generate automatic backlinks | `src/doc-symbol/BacklinkGenerator.ts` |
| [[SymbolLinkResolver]] | Resolve references to files | `src/doc-symbol/SymbolLinkResolver.ts` |

### 3. Validation Rules

```typescript
// Enforced by DocumentSymbolRegistry
1. Exactly one H1 primary per symbol (SSOT)
2. H2 auxiliary must have corresponding H1
3. All inline references must have H1 definition
4. No duplicate H1s (conflict detection)
```

## Workflow

### Indexing Workflow

```typescript
1. Scan documentation directory
   └─ For each .md file:
      a. Parse with DocumentSymbolParser
      b. Extract H1, H2, inline symbols
      c. Store in DocumentSymbolRegistry

2. Validate SSOT compliance
   └─ Check for:
      • Duplicate H1 definitions
      • Orphaned H2 auxiliaries
      • Broken inline references
      • Missing primary definitions

3. Generate backlinks
   └─ For each symbol:
      • Find all incoming references
      • Create "Referenced By" section
      • Update primary definition file
```

### Validation Workflow

```bash
# 1. Index documentation
tsdoc-edge index-docs managed

# 2. Validate symbol references
tsdoc-edge validate-symbol-refs managed

# 3. Update backlinks
tsdoc-edge update-backlinks managed

# 4. Fix common issues
tsdoc-edge symbol-fix managed --dry-run
```

## Features

### Automatic Backlinks

**Primary Definition** (`managed/commands/BuildCommand.md`):
```markdown
# [[BuildCommand]]

...

## Referenced By
- [[SELF-IMPROVEMENT-PROCESS]]: Build workflow step
- [[Work Context Workflow]]: Context gathering example
```

**Auto-generated**: Updated by `update-backlinks` command.

### Symbol Promotion

Convert H2 auxiliary to H1 primary when needed:

```bash
# Before: managed/COMMANDS.md
## [[NewCommand]]
This command does X...

# After: managed/commands/NewCommand.md
# [[NewCommand]]
This command does X...
```

**Command**: `tsdoc-edge promote-symbol managed "NewCommand"`

### Duplicate Detection

```bash
tsdoc-edge validate-symbol-refs managed
```

**Output**:
```
❌ Duplicate H1 definition for [[BuildCommand]]:
  1. managed/commands/BuildCommand.md:1
  2. managed/COMMANDS.md:45 (DUPLICATE)

💡 Use symbol-fix to convert duplicate to H2 auxiliary
```

### Similarity Search

```bash
tsdoc-edge symbol-query managed similar "BuildCmd"
```

**Output**:
```
Similar symbols (edit distance ≤ 2):
  1. BuildCommand (distance: 3)
  2. BaseCommand (distance: 5)
```

## Integration

### CLI Commands

| Command | Purpose | Source |
|---------|---------|--------|
| [[IndexDocsCommand]] | Index documentation symbols | `src/commands/IndexDocsCommand.ts` |
| [[UpdateBacklinksCommand]] | Generate backlink sections | `src/commands/UpdateBacklinksCommand.ts` |
| [[ValidateSymbolRefsCommand]] | Validate SSOT compliance | `src/commands/ValidateSymbolRefsCommand.ts` |
| [[SymbolQueryCommand]] | Search and explore symbols | `src/commands/SymbolQueryCommand.ts` |
| [[SymbolFixCommand]] | Auto-fix common issues | `src/commands/SymbolFixCommand.ts` |
| [[PromoteSymbolCommand]] | Promote H2 to H1 | `src/commands/PromoteSymbolCommand.ts` |
| [[CheckLinksCommand]] | Check link validity | `src/commands/CheckLinksCommand.ts` |

### Storage

Symbols stored in two formats:

1. **SQLite** (`.tsdoc/symbols.db`): Fast queries
   ```sql
   CREATE TABLE doc_symbols (
     symbol_name TEXT PRIMARY KEY,
     definition_type TEXT,  -- 'primary' or 'auxiliary'
     file_path TEXT,
     line_number INTEGER
   );
   ```

2. **JSONL** (`.tsdoc/symbols.jsonl`): Version control
   ```json
   {"symbol":"BuildCommand","type":"primary","file":"managed/commands/BuildCommand.md","line":1}
   ```

## Configuration

```json
{
  "documentSymbols": {
    "enabled": true,
    "docsDir": "managed",
    "primaryPattern": "^# \\[\\[([^\\]]+)\\]\\]",
    "auxiliaryPattern": "^##+ \\[\\[([^\\]]+)\\]\\]",
    "inlinePattern": "\\[\\[([^\\]#]+)(?:#([^\\]]+))?\\]\\]",
    "backlinkSection": "## Referenced By",
    "validateOnBuild": true
  }
}
```

## Examples

### Create New Symbol

```bash
# 1. Create file with H1 primary
echo "# [[MyFeature]]\n\nFeature description..." > managed/features/MyFeature.md

# 2. Index
tsdoc-edge index-docs managed

# 3. Verify
tsdoc-edge symbol-query managed info "MyFeature"
```

### Fix Duplicate Symbols

```bash
# 1. Find duplicates
tsdoc-edge validate-symbol-refs managed | grep "Duplicate"

# 2. Preview fix
tsdoc-edge symbol-fix managed --type=duplicate-h1 --dry-run

# 3. Apply fix
tsdoc-edge symbol-fix managed --type=duplicate-h1 --yes
```

### Explore Symbol Graph

```bash
# Find all backlinks to a symbol
tsdoc-edge symbol-query managed backlinks "BuildCommand"

# Find similar symbols
tsdoc-edge symbol-query managed similar "BuildCmd"

# Get symbol statistics
tsdoc-edge symbol-query managed stats
```

## Benefits

1. **SSOT Enforcement**: Exactly one primary definition per symbol
2. **Automatic Backlinks**: See all references to a symbol
3. **Validation**: Catch broken links and orphaned pages
4. **Refactoring Safe**: Rename symbols with confidence
5. **Discovery**: Find related symbols easily
6. **Integration**: Works with code symbols via `@doc` tags

## Performance

- **Index**: ~200ms for 192 documents
- **Query**: <10ms for symbol lookup
- **Validation**: ~500ms for full validation
- **Memory**: ~5MB for symbol registry

## Related

- [[Symbol Reference System]]: Complete notation conventions
- [[SELF-IMPROVEMENT-PROCESS]]: Documentation improvement workflow
- [[SymbolQueryCommand]]: Symbol exploration tool
- [[SymbolFixCommand]]: Auto-repair broken references

## See Also

- Three-tier symbol notation (H1/H2/inline)
- SSOT validation and enforcement
- Automatic backlink generation
- Symbol promotion workflow

---

## Backlinks

### Referenced By

- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:21
- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:29
- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:30
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:23
- [[ExploreEntrypointCommand]] → /home/user/tsdoc-edge/managed/commands/ExploreEntrypointCommand.md:32
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:59
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:68
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:69
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:22
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:30
- [[PromoteSymbolCommand]] → /home/user/tsdoc-edge/managed/commands/PromoteSymbolCommand.md:31
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:222
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:223
- [[SymbolQueryCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolQueryCommand.md:171
- [[SymbolQueryCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolQueryCommand.md:172
- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:18
- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:27
- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:28
- [[UpdateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateSymbolRefsCommand.md:21
- [[UpdateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateSymbolRefsCommand.md:29
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:22
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:35
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:36
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:223
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:238
- [[SSOT]] → /home/user/tsdoc-edge/managed/concepts/ssot.md:140
- [[SSOT]] → /home/user/tsdoc-edge/managed/concepts/ssot.md:172
- [[Symbol Reference System]] → /home/user/tsdoc-edge/managed/concepts/symbol-reference-system.md:179
- [[BacklinkGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/BacklinkGenerator.md:23
- [[BacklinkGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/BacklinkGenerator.md:32
- [[BacklinkGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/BacklinkGenerator.md:33
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:112
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:170
- [[MermaidSymbolExtractor]] → /home/user/tsdoc-edge/managed/doc-symbols/MermaidSymbolExtractor.md:23
- [[MermaidSymbolExtractor]] → /home/user/tsdoc-edge/managed/doc-symbols/MermaidSymbolExtractor.md:32
- [[SymbolReferenceGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceGenerator.md:22
- [[SymbolReferenceGenerator]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceGenerator.md:30
- [[SymbolReferenceResolver]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceResolver.md:22
- [[SymbolReferenceResolver]] → /home/user/tsdoc-edge/managed/doc-symbols/SymbolReferenceResolver.md:32
- [[RelatedDocsGenerator]] → /home/user/tsdoc-edge/managed/generator/RelatedDocsGenerator.md:22
- [[RelatedDocsGenerator]] → /home/user/tsdoc-edge/managed/generator/RelatedDocsGenerator.md:30
- [[Doc Reference]] → /home/user/tsdoc-edge/managed/relationships/doc-reference.md:39
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:71
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:226
- [[Work Context Workflow]] → /home/user/tsdoc-edge/managed/workflows/work-context-workflow.md:256

