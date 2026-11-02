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

### work-context

Provide comprehensive pre-edit context (`--human` or `--llm`) for a target source file, replacing legacy `context` and `context-to-llm` commands.

```bash
tsdoc-edge work-context <file> [--human | --llm]
```

**Source**: `src/commands/WorkContextCommand.ts`

### [[DesignContextCommand]]

Displays inline ADR decisions (`@decision`, `@rationale`, `@consequences`) and `@contract` invariants for a target file.

```bash
tsdoc-edge design-context <file>
```

**Source**: `src/commands/DesignContextCommand.ts`

### [[SyncCommand]]

Synchronizes code symbols, canonical `@ttsc/graph` revisions, managed checkpoints, executable `SpecGraph`, and Markdown backlinks in a single command (`--dry-run`, `--check`, `--json`).

```bash
tsdoc-edge sync [--force] [--dry-run] [--check] [--json]
```

**Source**: `src/commands/SyncCommand.ts`

## Document Commands

### symbol query

Unified code symbol (`@ttsc/graph`) and `[[Symbol]]` document checkpoint lookup, replacing legacy `find-doc`.

```bash
tsdoc-edge symbol query <name>
```

**Source**: `src/commands/SymbolQueryCommand.ts`

### docs find-unused

Find unused documents.

```bash
tsdoc-edge docs find-unused [path]
```

**Source**: `src/commands/FindUnusedDocsCommand.ts`

### docs symbols

List document symbols.

```bash
tsdoc-edge docs symbols [path]
```

**Source**: `src/commands/DocSymbolsCommand.ts`

### [[ValidateGeneratedDocsCommand]]

Verifies that generated Markdown documentation remains synchronized with current TypeScript TSDoc comments.

```bash
tsdoc-edge validate generated [path]
```

**Source**: `src/commands/ValidateGeneratedDocsCommand.ts`

### [[ValidateTsdocCommand]]

Validates all TypeScript TSDoc comments and `tsdoc.json` strictly against `@microsoft/tsdoc` v0 rules.

```bash
tsdoc-edge validate tsdoc [path] [--strict] [--json]
```

**Source**: `src/commands/ValidateTsdocCommand.ts`

## Symbol & Checkpoint Commands

### [[SymbolRenameCommand]]

Renames a `[[Symbol]]` document checkpoint and updates all incoming Markdown and `@doc` references atomically.

```bash
tsdoc-edge symbol rename <old> <new>
```

**Source**: `src/commands/SymbolRenameCommand.ts`

## Code Quality Commands

### symbol find-method

Find methods by name.

```bash
tsdoc-edge symbol find-method <name>
```

**Source**: `src/commands/FindMethodCommand.ts`

### [[CoreApiCommand]]

Lists public exported API symbols alongside their immediate upstream and downstream dependencies.

```bash
tsdoc-edge symbol core-api [options]
```

**Source**: `src/commands/CoreApiCommand.ts`

### [[CheckDuplicatesCommand]]

Scans managed Markdown specifications for duplicate or near-duplicate content using similarity thresholds.

```bash
tsdoc-edge spec duplicates [path]
```

**Source**: `src/commands/CheckDuplicatesCommand.ts`

### validate

Validates TSDoc conventions, `@contract` / `@responsibility` completeness, and connectivity rules across TypeScript sources (consolidating legacy `without-contract` and `without-responsibility` checks).

```bash
tsdoc-edge validate [path]
```

**Source**: `src/commands/ValidateCommand.ts`

### [[LintCommand]]

Runs unified TSDoc syntax, convention, and documentation connectivity checks across TypeScript sources.

```bash
tsdoc-edge lint [path] [options]
```

**Source**: `src/commands/LintCommand.ts`

### [[FixCommand]]

Automatically repairs common TSDoc formatting, missing modifier, and document link issues in target files.

```bash
tsdoc-edge docs fix [path] [options]
```

**Source**: `src/commands/FixCommand.ts`

## Planning Commands

### [[PlansCommand]]

Lists structured engineering backlog plans extracted from `@privateRemarks` and enhanced symbol documentation.

```bash
tsdoc-edge docs plans [path]
```

**Source**: `src/commands/PlansCommand.ts`

### [[TodosCommand]]

Aggregates and lists engineering `TODO` items extracted from `@privateRemarks` across indexed files.

```bash
tsdoc-edge docs todos [path]
```

**Source**: `src/commands/TodosCommand.ts`

## Ontology Commands

### ontology list

List ontology nodes and relationships.

```bash
tsdoc-edge ontology list [options]
```

**Source**: `src/commands/OntologyListCommand.ts`

### ontology stats

Show ontology statistics.

```bash
tsdoc-edge ontology stats
```

**Source**: `src/commands/OntologyStatsCommand.ts`

## System Commands

### [[SystemStatusCommand]]

Displays an executive summary of database state, indexed symbol counts, doc checkpoints, and health scores.

```bash
tsdoc-edge system-status
```

**Source**: `src/commands/SystemStatusCommand.ts`

### docs

Unified managed documentation lifecycle command group (`index`, `backlinks`, `check-links`, `symbols`, `find-unused`, `generate`, `fix`, `move`, `plans`, `todos`).

```bash
tsdoc-edge docs <subcommand> [options]
```

**Source**: `src/commands/DocsCommand.ts`

### coverage-baseline

저장된 source-identified report를 immutable baseline으로 저장하거나, 명시한 baseline ID와
비교한다.

```bash
tsdoc-edge coverage-baseline save \
  --report-id <coverage-report-id> \
  --report-db .tsdoc/coverage-metrics.db \
  --baseline-db .tsdoc/coverage-baselines.db

tsdoc-edge coverage-baseline compare \
  --report-id <coverage-report-id> \
  --baseline-id <coverage-baseline-id> \
  --report-db .tsdoc/coverage-metrics.db \
  --baseline-db .tsdoc/coverage-baselines.db

tsdoc-edge coverage-baseline list \
  --workspace <workspace-id> \
  --baseline-db .tsdoc/coverage-baselines.db --json

tsdoc-edge coverage-baseline read \
  --workspace <workspace-id> \
  --baseline-id <coverage-baseline-id> \
  --baseline-db .tsdoc/coverage-baselines.db --json
```

`--json`은 baseline ID, 입력 identity, metric별 `improved|declined|unchanged|uncomparable`
결과를 출력한다. `list|read`는 baseline DB를 read-only로 열어 exact baseline pin/payload를
조회한다. canonical graph 기준선을 사용할 때는 `--graph-revision`과
`--graph-fingerprint`를 함께 지정해야 하며, graph 입력 경계가 바뀐 비교는 자동으로
`uncomparable` 처리된다.

**Source**: `src/commands/CoverageBaselineCommand.ts`

### move

Move document and update references.

```bash
tsdoc-edge docs move <from> <to>
```

**Source**: `src/commands/MoveCommand.ts`

## Related

- [[Commands Index]] - All commands by category
- [[CLI Commands]] - Alphabetical command reference

---

## Backlinks

### Referenced By

- [[Commands Index]] → managed/COMMANDS.md:110

### Implemented By

- UtilityCommands → src/commands/WorkContextCommand.ts:1

