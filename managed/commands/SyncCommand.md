---
title: SyncCommand
type: command
category: commands
status: active
canonical: true
source: src/commands/SyncCommand.ts
tags:
  - command
  - ssot-sync
  - ci-gate
---

# [[SyncCommand]]

**Source**: `src/commands/SyncCommand.ts`

Unified 1-step workspace SSOT synchronization and CI drift-verification command (`tsdoc-edge sync`) orchestrating code symbol indexing, canonical `@ttsc/graph` promotion, `managed/` checkpoint validation, `SpecGraph` compilation, and Markdown backlink generation.

## 7-Aspect Specification

- **Purpose**: Eliminate multi-command synchronization drift across `.tsdoc.db`, `.tsdoc/canonical-graph.db`, `.tsdoc/spec-graph.db`, and `managed/**/*.md` `## Backlinks`.
- **Input**: Optional flags `--force` (`-f`), `--dry-run` (`-n`), `--check`, and `--json`.
- **Output**: Stage-by-stage synchronization summary (human or `--json`) with deterministic exit code (`0` when synchronized, non-zero on `--check` drift or validation error).
- **Context**: Orchestrates [[BuildCommand]] (`--canonical-graph`), [[IndexDocsCommand]], [[ValidateDocsCommand]], `SpecExtractCommand` ([[AuthoredProjectSpecifications]]), and [[UpdateBacklinksCommand]].
- **Logic**:
  - Default / `--force`: Executes code indexing + canonical `@ttsc/graph` snapshot promotion (`build`), indexes and validates `[[Checkpoint]]` SSOT integrity (`docs`), updates `## Backlinks` atomically across `managed/**/*.md` (`backlinks`), and finally compiles `managed/specs/**/*.md` `tsdoc-spec` blocks into `.tsdoc/spec-graph.db` (`specs`) so stored `SpecGraph` content digests match post-backlink file bytes in a single pass.
  - `--dry-run` / `--check`: Evaluates all stages in read-only mode without mutating SQLite stores or Markdown files; `--check` fails closed if any plane is missing or out of sync.
- **Effect**: Writes `.tsdoc.db`, `.tsdoc/canonical-graph.db`, `.tsdoc/spec-graph.db`, and `managed/` `## Backlinks` only when neither `--dry-run` nor `--check` is active.
- **Scope**: Primary top-level CLI lifecycle command (`sync`) governed by [[CliCommandSurfaceSpecification]].

## CLI Usage

```bash
tsdoc-edge sync
tsdoc-edge sync --check          # Read-only CI drift gate
tsdoc-edge sync --dry-run        # Preview pending updates without writing
tsdoc-edge sync --force --json   # Full rebuild with JSON report
```

## Related Concepts

- [[BuildCommand]]
- [[UpdateBacklinksCommand]]
- [[ValidateDocsCommand]]
- [[AuthoredProjectSpecifications]]
- [[CliCommandSurfaceSpecification]]

---

## Backlinks

### Referenced By

- [[SystemStatusCommand]] → managed/commands/SystemStatusCommand.md:44
- [[CliCommandSurfaceSpecification]] → managed/specs/domains/cli-command-surface-spec.md:402

### Implemented By

- SyncCommand → src/commands/SyncCommand.ts:77
- SyncStageReport → src/commands/SyncCommand.ts:29
- SyncPipelineReport → src/commands/SyncCommand.ts:42
- SyncCommandDependencies → src/commands/SyncCommand.ts:58

