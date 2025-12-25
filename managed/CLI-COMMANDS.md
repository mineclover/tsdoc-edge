---
title: CLI Commands Reference
type: reference
category: cli
status: active
canonical: true
---

# [[CLI Commands]]

Alphabetically organized reference of all 61+ TSDoc Edge CLI commands with complete usage syntax, options, and examples.

> **Quick Reference**: Complete CLI command reference organized alphabetically with usage and examples

## Overview

TSDoc Edge provides 61+ commands for analyzing, querying, and managing TypeScript documentation. This document serves as the canonical reference for all CLI commands.

See also: [[Commands Index]] for commands organized by category.

---

## analyze-calls

Analyze call relationships between functions and methods.

```bash
tsdoc-edge analyze-calls [source-dir]
```

**Detection**: Behavioral relationship analyzer
**Output**: Call graph with caller → callee relationships
**Relationship Type**: [[Call Relationships]]

**See**: [[AnalyzeCallsCommand]]

---

## build

Build the symbol database by extracting all symbols and relationships from source code.

```bash
tsdoc-edge build <source-directory>
```

**Features**:
- Incremental build support (only processes changed files)
- Extracts symbols, relationships, and TSDoc comments
- Creates SQLite database and JSONL registry

**Example**:
```bash
tsdoc-edge build src
tsdoc-edge build --full src  # Force full rebuild
```

**See**: [[BuildCommand]]

---

## check-links

Check for broken links in documentation files.

```bash
tsdoc-edge check-links [docs-directory]
```

**Features**:
- Validates `[[Symbol]]` references
- Detects broken internal links
- Suggests fixes for common typos
- Categorizes issues by type and file

**Example**:
```bash
tsdoc-edge check-links managed
tsdoc-edge check-links --fail-on-broken managed  # Exit with error if broken links found
```

**Configuration**: `.tsdoc.config.json` → `linkCheck`

**See**: [[CheckLinksCommand]]

---

## generate-docs

Generate documentation from code symbols and templates.

```bash
tsdoc-edge generate-docs [options]
```

**Features**:
- Template-based documentation generation
- Symbol-driven content
- Automatic cross-references
- Customizable output formats

**Example**:
```bash
tsdoc-edge generate-docs --template api
tsdoc-edge generate-docs --symbols "class-*" --output docs/api
```

**See**: GenerateDocsCommand

---

## id-new

Generate a new unique symbol ID for documentation.

```bash
tsdoc-edge id-new <symbol-name>
```

**Features**:
- Kebab-case ID generation
- Collision detection
- Type prefix support

**Example**:
```bash
tsdoc-edge id-new "UserService"
# Output: class-userservice

tsdoc-edge id-new "calculateTotal"
# Output: function-calculatetotal
```

**See**: IdNewCommand

---

## init

Initialize TSDoc Edge in a project.

```bash
tsdoc-edge init [options]
```

**Features**:
- Creates `.tsdoc/` directory structure
- Generates default configuration (`.tsdoc.config.json`)
- Sets up managed documentation directory
- Optionally installs git hooks

**Example**:
```bash
tsdoc-edge init
tsdoc-edge init --with-hooks  # Also install git hooks
tsdoc-edge init --managed-dir docs  # Custom docs directory
```

**See**: [[InitCommand]]

---

## parse

Parse a TypeScript file and display its structure and TSDoc comments.

```bash
tsdoc-edge parse <file-path>
```

**Features**:
- Display symbol hierarchy
- Show TSDoc tags and comments
- Validate TSDoc syntax
- Export as JSON

**Example**:
```bash
tsdoc-edge parse src/services/UserService.ts
tsdoc-edge parse src/services/UserService.ts --json > output.json
```

**See**: [[ParseCommand]]

---

## suggest

Suggest documentation improvements and missing @doc tags.

```bash
tsdoc-edge suggest [source-directory]
```

**Features**:
- Identifies symbols missing documentation
- Suggests @doc tag additions
- Detects incomplete TSDoc comments
- Prioritizes by symbol importance

**Example**:
```bash
tsdoc-edge suggest src
tsdoc-edge suggest src --min-connections 5  # Only suggest for well-connected symbols
```

**See**: [[SuggestCommand]]

---

## update-backlinks

Update bidirectional `[[Symbol]]` backlinks in documentation files.

```bash
tsdoc-edge update-backlinks [docs-directory]
```

**Features**:
- Scans for `[[Symbol]]` references
- Generates "Referenced By" sections
- Creates bidirectional navigation
- Maintains backlink accuracy

**Example**:
```bash
tsdoc-edge update-backlinks managed
tsdoc-edge update-backlinks --clean managed  # Remove orphaned backlinks
```

**See**: [[UpdateBacklinksCommand]]

---

## update-symbol-refs

Update code symbol footnote references in documentation.

```bash
tsdoc-edge update-symbol-refs [docs-directory]
```

**Features**:
- Resolves `[^SymbolName]` footnotes
- Updates symbol locations (file:line)
- Tracks unresolved references
- Batch document updates

**Example**:
```bash
tsdoc-edge update-symbol-refs managed
```

**Pattern**:
```markdown
This feature uses the UserService[^UserService] to authenticate.

[^UserService]: src/services/UserService.ts:15
```

**See**: [[UpdateSymbolRefsCommand]]

---

## validate-docs

Validate documentation quality and completeness.

```bash
tsdoc-edge validate-docs [docs-directory]
```

**Features**:
- Check documentation coverage
- Validate symbol references
- Detect broken links
- Verify documentation structure
- Quality metrics and scoring

**Example**:
```bash
tsdoc-edge validate-docs managed
tsdoc-edge validate-docs --min-score 80 managed  # Fail if score < 80
```

**Checks**:
- ✓ H1 headers with `[[Symbol]]`
- ✓ Frontmatter completeness
- ✓ Internal link validity
- ✓ Code example syntax
- ✓ Backlink accuracy

**See**: [[ValidateDocsCommand]]

---

## validate-spec

Validate specification completeness using the 7-aspect framework.

```bash
tsdoc-edge validate-spec [options]
```

**Features**:
- Checks 7 aspects: Purpose, Input, Output, Context, Logic, Effect, Scope
- Generates completeness scores
- Identifies missing aspects
- Tracks specification evolution

**7 Aspects**:
1. **Purpose**: Why the module exists
2. **Input**: Parameters and constraints
3. **Output**: Return values and results
4. **Context**: Dependencies and environment
5. **Logic**: Algorithm and implementation
6. **Effect**: Side effects and state changes
7. **Scope**: Public interface and visibility

**Example**:
```bash
tsdoc-edge validate-spec src
tsdoc-edge validate-spec --min-aspects 5 src  # Require at least 5/7 aspects
```

**See**: [[ValidateSpecCommand]]

---

## work-context

Display complete context needed before modifying a file.

```bash
tsdoc-edge work-context <file-path>
```

**Features**:
- Show file dependencies (imports/exports)
- List symbols defined in file
- Display related documentation
- Show who uses this file
- Provide modification impact analysis

**Example**:
```bash
tsdoc-edge work-context src/services/UserService.ts
```

**Output Sections**:
1. **File Overview**: Path, type, exports
2. **Dependencies**: What this file imports
3. **Dependents**: Who imports this file
4. **Symbols**: Classes, functions, interfaces
5. **Documentation**: Related `[[Symbol]]` docs
6. **Impact Analysis**: Change risk assessment

**See**: [[WorkContextCommand]]

---

## Related Documentation

- [[Commands Index]]: All commands organized by category
- [[BuildCommand]]: Detailed build command documentation
- [[WorkContextCommand]]: Work context workflow
- [[Relationship Types]]: All 26 relationship types

---

**Last Updated**: 2025-11-11

---

## Backlinks

### Referenced By

- [[CLI Command Development Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/command-development-guide.md:344

### Implemented By

- CheckDuplicatesCommand (check-duplicates) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/CheckDuplicatesCommand.ts:68
- CheckLinksCommand (check-links) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/CheckLinksCommand.ts:40
- CoreApiCommand (core-api) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/CoreApiCommand.ts:40
- DepsCommand (deps) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/DepsCommand.ts:39
- FindDocCommand (find-doc) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/FindDocCommand.ts:69
- FindMethodCommand (find-method) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/FindMethodCommand.ts:39
- FindUnusedDocsCommand (find-unused-docs) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/FindUnusedDocsCommand.ts:39
- GenerateDocsCommand (generate-docs) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/GenerateDocsCommand.ts:19
- IdNewCommand (id-new) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/IdNewCommand.ts:17
- InitCommand (init) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/InitCommand.ts:16
- OrphansCommand (orphans) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/OrphansCommand.ts:40
- ParseCommand (parse) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/ParseCommand.ts:39
- PlansCommand (plans) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/PlansCommand.ts:38
- RebuildIndexCommand (rebuild-index) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/RebuildIndexCommand.ts:35
- SpecBumpCommand (spec-bump) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/SpecBumpCommand.ts:39
- SpecDiffCommand (spec-diff) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/SpecDiffCommand.ts:39
- SpecHistoryCommand (spec-history) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/SpecHistoryCommand.ts:39
- SpecStatusCommand (spec-status) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/SpecStatusCommand.ts:67
- StatsCommand (stats) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/StatsCommand.ts:37
- SuggestCommand (suggest) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/SuggestCommand.ts:17
- TodosCommand (todos) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/TodosCommand.ts:38
- TreeCommand (tree) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/TreeCommand.ts:53
- UndocumentedCommand (undocumented) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/UndocumentedCommand.ts:41
- UpdateBacklinksCommand (update-backlinks) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/UpdateBacklinksCommand.ts:42
- UpdateSymbolRefsCommand (update-symbol-refs) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/UpdateSymbolRefsCommand.ts:42
- UsedByCommand (used-by) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/UsedByCommand.ts:39
- ValidateDocsCommand (validate-docs) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/ValidateDocsCommand.ts:40
- ValidateSpecCommand (validate-spec) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/ValidateSpecCommand.ts:17
- WhoUsesCommand (who-uses) → /Users/junwoobang/workflow/tsdoc-edge/src/commands/WhoUsesCommand.ts:37

