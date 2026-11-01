---
title: SystemStatusCommand
type: command
category: commands
status: active
canonical: true
source: src/commands/SystemStatusCommand.ts
tags:
  - command
  - observability
  - 3-plane-status
---

# [[SystemStatusCommand]]

**Source**: `src/commands/SystemStatusCommand.ts`

Executive 3-plane workspace health and synchronization dashboard (`tsdoc-edge system-status [--json]`) uniting the Enrichment/Symbol DB (`.tsdoc.db`), Canonical `@ttsc/graph` DB (`.tsdoc/canonical-graph.db`), and Managed Checkpoint / `SpecGraph` plane (`managed/`, `.tsdoc/spec-graph.db`).

## 7-Aspect Specification

- **Purpose**: Provide a single read-only command to verify whether all three SSOT planes are present, synchronized, and healthy.
- **Input**: Optional `--json` flag (`validateAllowedFlags(args, ['--json'], [])`).
- **Output**: Human dashboard or structured JSON reporting:
  1. Symbol & Enrichment DB counts (`.tsdoc.db` symbols, documented ratio, unified relationships).
  2. Canonical `@ttsc/graph` active revision ID, internal/external node counts, and canonical edge counts.
  3. Managed `[[Checkpoint]]` definitions, active `SpecGraphRevision` requirement/binding counts, and aggregate `CodeHealthChecker` score/grade.
- **Context**: Consumes `GraphRepository`, `SpecGraphRepository`, `DatabaseManager`, `DocumentSymbolRegistry`, and `CodeHealthChecker`.
- **Logic**: Opens existing persistence planes read-only (never auto-creates missing SQLite files) and aggregates cross-plane telemetry deterministically.
- **Effect**: Strictly read-only (zero disk writes).
- **Scope**: Core top-level CLI command (`system-status`), paired with [[StatsCommand]] and [[HealthCommand]].

## CLI Usage

```bash
tsdoc-edge system-status
tsdoc-edge system-status --json
```

## Related Concepts

- [[StatsCommand]]
- [[HealthCommand]]
- [[SyncCommand]]
- [[CliCommandSurfaceSpecification]]

---

## Backlinks

### Implemented By

- SystemStatusCommand → src/commands/SystemStatusCommand.ts:33

