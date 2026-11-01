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

### [[GenerateDocsCommand]]

Generates Markdown API and enhanced 6-category symbol documentation from annotated TypeScript sources.

```bash
tsdoc-edge generate-docs [path] [options]
```

**Source**: `src/commands/GenerateDocsCommand.ts`

### [[ValidateGeneratedDocsCommand]]

Verifies that generated Markdown documentation remains synchronized with current TypeScript TSDoc comments.

```bash
tsdoc-edge validate-generated-docs [path]
```

**Source**: `src/commands/ValidateGeneratedDocsCommand.ts`

### [[ValidateTsdocCommand]]

Validates all TypeScript TSDoc comments and `tsdoc.json` strictly against `@microsoft/tsdoc` v0 rules.

```bash
tsdoc-edge validate-tsdoc [path] [--strict] [--json]
```

**Source**: `src/commands/ValidateTsdocCommand.ts`

## Symbol ID Commands

### [[IdCommand]]

Queries, validates, and manages symbol identity entries in the workspace symbol registry.

```bash
tsdoc-edge id <action> [options]
```

**Source**: `src/commands/IdCommand.ts`

### [[IdNewCommand]]

Allocates a new unique symbol identifier in the JSONL symbol registry.

```bash
tsdoc-edge id-new [name]
```

**Source**: `src/commands/InitCommand.ts`

### [[SymbolRenameCommand]]

Renames a `[[Symbol]]` document checkpoint and updates all incoming Markdown and `@doc` references atomically.

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

### [[CoreApiCommand]]

Lists public exported API symbols alongside their immediate upstream and downstream dependencies.

```bash
tsdoc-edge core-api [options]
```

**Source**: `src/commands/CoreApiCommand.ts`

### [[CheckDuplicatesCommand]]

Scans managed Markdown specifications for duplicate or near-duplicate content using similarity thresholds.

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

### [[LintCommand]]

Runs unified TSDoc syntax, convention, and documentation connectivity checks across TypeScript sources.

```bash
tsdoc-edge lint [path] [options]
```

**Source**: `src/commands/LintCommand.ts`

### [[FixCommand]]

Automatically repairs common TSDoc formatting, missing modifier, and document link issues in target files.

```bash
tsdoc-edge fix [path] [options]
```

**Source**: `src/commands/FixCommand.ts`

### [[ImproveCommand]]

Analyzes documentation gaps and guides iterative TSDoc quality improvements across a source directory.

```bash
tsdoc-edge improve [path]
```

**Source**: `src/commands/ImproveCommand.ts`

## Planning & Task Commands

### [[PlansCommand]]

Lists structured engineering backlog plans extracted from `@privateRemarks` and enhanced symbol documentation.

```bash
tsdoc-edge plans [path]
```

**Source**: `src/commands/PlansCommand.ts`

### [[TodosCommand]]

Aggregates and lists engineering `TODO` items extracted from `@privateRemarks` across indexed files.

```bash
tsdoc-edge todos [path]
```

**Source**: `src/commands/TodosCommand.ts`

### [[TaskCommands]]

Provides CLI subcommands for tracking and updating documentation and refactoring task checklists.

```bash
tsdoc-edge task <list|add|done> [options]
```

**Source**: `src/commands/TaskCommands.ts`

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

### [[SystemStatusCommand]]

Displays an executive summary of database state, indexed symbol counts, doc checkpoints, and health scores.

```bash
tsdoc-edge system-status
```

**Source**: `src/commands/SystemStatusCommand.ts`

### scan

Scan directory for TypeScript files.

```bash
tsdoc-edge scan <path>
```

**Source**: `src/commands/ScanCommand.ts`

### [[SyncCoverageCommand]]

Parses Istanbul/NYC coverage reports and persists source-identified execution metrics with optional canonical graph projection.

```bash
tsdoc-edge sync-coverage [coverage-file] [options]

# options
--workspace <id>
--report-db <file>
--canonical-graph-db <file>
```

**Source**: `src/commands/SyncCoverageCommand.ts`

현재 명령은 Istanbul/NYC coverage JSON을 파싱하고 source identity와 분자·분모를 포함한
`execution.line|function|branch` report를 `.tsdoc/coverage-metrics.db`에 저장한다.
`--canonical-graph-db`를 지정하면 활성 ttsc graph revision에 file/function evidence를
추가로 투영하고 `report-only` 요약을 출력한다. graph DB에 활성 revision이 없으면 실패한다.

저장된 report는 `coverage-report list|read`로 read-only inspection할 수 있다.

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

### [[TestExamplesCommand]]

Extracts and displays executable code examples mined from unit and integration test suites.

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

### [[RebuildIndexCommand]]

Rebuilds SQLite FTS5 full-text search indexes for symbols and unified relationships.

```bash
tsdoc-edge rebuild-index
```

**Source**: `src/commands/RebuildIndexCommand.ts`

## Hook Commands

### [[InstallHookCommand]]

Installs the TSDoc Edge Git `pre-commit` quality gate hook into the local repository.

```bash
tsdoc-edge install-hook
```

**Source**: `src/commands/InstallHookCommand.ts`

### [[PreCommitRunCommand]]

Executes `PreCommitChecker` validation against staged files during Git `pre-commit` hook runs.

```bash
tsdoc-edge pre-commit-run
```

**Source**: `src/commands/PreCommitRunCommand.ts`

### [[UninstallHookCommand]]

Removes the TSDoc Edge Git `pre-commit` hook cleanly from `.git/hooks`.

```bash
tsdoc-edge uninstall-hook
```

**Source**: `src/commands/UninstallHookCommand.ts`

## Related

- [[Commands Index]] - All commands by category
- [[CLI Commands]] - Alphabetical command reference

---

## Backlinks

### Referenced By

- [[Commands Index]] → managed/COMMANDS.md:157
- [[SyncCommand]] → managed/commands/SyncCommand.md:22

### Implemented By

- UtilityCommands → src/commands/ContextCommand.ts:1

