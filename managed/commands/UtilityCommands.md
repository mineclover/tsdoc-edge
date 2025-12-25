---
title: Utility Commands
type: reference
category: commands
status: active
canonical: true
---

# [[UtilityCommands]]

> Utility and helper commands for TSDoc Edge

## Context Commands

### context

Show current context information.

```bash
tsdoc-edge context
```

**Source**: `src/commands/ContextCommand.ts`

### context-to-llm

Generate LLM-friendly context for a file.

```bash
tsdoc-edge context-to-llm <file> [options]
```

**Source**: `src/commands/ContextToLLMCommand.ts`

### design-context

Show design decisions for a file.

```bash
tsdoc-edge design-context <file>
```

**Source**: `src/commands/DesignContextCommand.ts`

## Document Commands

### find-doc

Find document definitions.

```bash
tsdoc-edge find-doc <query>
```

**Source**: `src/commands/FindDocCommand.ts`

### find-unused-docs

Find unused documents.

```bash
tsdoc-edge find-unused-docs [path]
```

**Source**: `src/commands/FindUnusedDocsCommand.ts`

### doc-symbols

List document symbols.

```bash
tsdoc-edge doc-symbols [path]
```

**Source**: `src/commands/DocSymbolsCommand.ts`

### generate-docs

Generate markdown documentation.

```bash
tsdoc-edge generate-docs [path] [options]
```

**Source**: `src/commands/GenerateDocsCommand.ts`

### validate-generated-docs

Validate generated documentation.

```bash
tsdoc-edge validate-generated-docs [path]
```

**Source**: `src/commands/ValidateGeneratedDocsCommand.ts`

## Symbol ID Commands

### id

Manage symbol IDs.

```bash
tsdoc-edge id <action> [options]
```

**Source**: `src/commands/IdCommand.ts`

### id-new

Generate new symbol ID.

```bash
tsdoc-edge id-new [name]
```

**Source**: `src/commands/IdNewCommand.ts`

### symbol-rename

Rename a symbol across the codebase.

```bash
tsdoc-edge symbol-rename <old> <new>
```

**Source**: `src/commands/SymbolRenameCommand.ts`

## Code Quality Commands

### find-method

Find methods by name.

```bash
tsdoc-edge find-method <name>
```

**Source**: `src/commands/FindMethodCommand.ts`

### core-api

Show core API symbols.

```bash
tsdoc-edge core-api [options]
```

**Source**: `src/commands/CoreApiCommand.ts`

### check-duplicates

Check for duplicate content.

```bash
tsdoc-edge check-duplicates [path]
```

**Source**: `src/commands/CheckDuplicatesCommand.ts`

### without-contract

Find symbols missing contracts.

```bash
tsdoc-edge without-contract [path]
```

**Source**: `src/commands/WithoutContractCommand.ts`

### without-responsibility

Find symbols missing @responsibility.

```bash
tsdoc-edge without-responsibility [path]
```

**Source**: `src/commands/WithoutResponsibilityCommand.ts`

### fix

Auto-fix common issues.

```bash
tsdoc-edge fix [path] [options]
```

**Source**: `src/commands/FixCommand.ts`

### improve

Improve documentation quality.

```bash
tsdoc-edge improve [path]
```

**Source**: `src/commands/ImproveCommand.ts`

## Planning Commands

### plans

Show future plans from documentation.

```bash
tsdoc-edge plans [path]
```

**Source**: `src/commands/PlansCommand.ts`

### todos

Show TODO items from code.

```bash
tsdoc-edge todos [path]
```

**Source**: `src/commands/TodosCommand.ts`

## Ontology Commands

### ontology-list

List ontology nodes and relationships.

```bash
tsdoc-edge ontology-list [options]
```

**Source**: `src/commands/OntologyListCommand.ts`

### ontology-stats

Show ontology statistics.

```bash
tsdoc-edge ontology-stats
```

**Source**: `src/commands/OntologyStatsCommand.ts`

## System Commands

### scan

Scan directory for TypeScript files.

```bash
tsdoc-edge scan <path>
```

**Source**: `src/commands/ScanCommand.ts`

### sync-coverage

Sync Istanbul coverage data.

```bash
tsdoc-edge sync-coverage [path]
```

**Source**: `src/commands/SyncCoverageCommand.ts`

### test-examples

Extract test examples from code.

```bash
tsdoc-edge test-examples [path]
```

**Source**: `src/commands/TestExamplesCommand.ts`

### move

Move document and update references.

```bash
tsdoc-edge move <from> <to>
```

**Source**: `src/commands/MoveCommand.ts`

### rename

Rename document and update references.

```bash
tsdoc-edge rename <from> <to>
```

**Source**: `src/commands/RenameCommand.ts`

### rebuild-index

Rebuild FTS5 indexes.

```bash
tsdoc-edge rebuild-index
```

**Source**: `src/commands/RebuildIndexCommand.ts`

## Hook Commands

### install-hook

Install pre-commit hook.

```bash
tsdoc-edge install-hook
```

**Source**: `src/commands/InstallHookCommand.ts`

### uninstall-hook

Uninstall pre-commit hook.

```bash
tsdoc-edge uninstall-hook
```

**Source**: `src/commands/UninstallHookCommand.ts`

## Related

- [[Commands Index]] - All commands by category
- [[CLI Commands]] - Alphabetical command reference

