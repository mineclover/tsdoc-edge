---
title: SyncCommand
type: component
category: commands
status: active
canonical: true
source: src/commands/SyncCommand.ts
---

# [[SyncCommand]]

> Unified 1-step workspace synchronization pipeline across code symbols, canonical `@ttsc/graph` revisions, managed checkpoints, executable `SpecGraph`, and Markdown backlinks.

**Source**: `src/commands/SyncCommand.ts`

## Purpose

Eliminates multi-command indexing drift by orchestrating `build`, `docs index` / `validate docs`, `spec extract`, and `docs backlinks` in deterministic order, while supporting read-only `--dry-run` (`-n`), `--check` (CI gate), and `--json` reporting.

## Related Hubs

- [[UtilityCommands]]
- [[BuildCommand]]
- [[UpdateBacklinksCommand]]

---

## Backlinks

### Implemented By

- SyncCommand → src/commands/SyncCommand.ts:64

