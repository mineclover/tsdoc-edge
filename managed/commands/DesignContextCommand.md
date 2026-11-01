---
title: DesignContextCommand
type: command
category: commands
status: active
canonical: true
source: src/commands/DesignContextCommand.ts
tags:
  - command
  - design-context
  - adr
  - contracts
---

# [[DesignContextCommand]]

**Source**: `src/commands/DesignContextCommand.ts`

Focused pre-edit architectural decision and contract inspector (`tsdoc-edge design-context <file>` / `tsdoc-edge dc <file>`) uniting normative `SpecGraph` bindings with inline TSDoc `@contract` invariants and ADR triads (`@decision`, `@rationale`, `@consequences`).

## 7-Aspect Specification

- **Purpose**: Surface why a module was designed the way it is—its normative requirements, contractual preconditions/invariants, and historical architectural trade-offs—before an engineer or AI agent modifies it.
- **Input**: Target TypeScript file path (`<file-path>`) and optional `--json` flag (`validateAllowedFlags(args, ['--json'], [])`).
- **Output**: Human-readable terminal sections or deterministic JSON containing normative `SpecGraph` bindings (from `.tsdoc/spec-graph.db`), `@contract` / `@precondition` / `@postcondition` / `@invariant` clauses, `@decision` / `@rationale` / `@consequences` ADR records, and `@doc [[Checkpoint]]` references.
- **Context**: Complements [[WorkContextCommand]] (`wc`), reading `.tsdoc/canonical-graph.db` (`GraphRepository`), `.tsdoc/spec-graph.db` (`SpecGraphRepository`), `.tsdoc.db` (`DatabaseManager`), and live TSDoc AST via `EnhancedDocExtractor`.
- **Logic**: Resolves canonical `@ttsc/graph` nodes for the target file, joins active `SpecGraphRevision` bindings targeting those `CanonicalNodeId`s, and merges extracted TSDoc contract/ADR blocks without mutating workspace state.
- **Effect**: Strictly read-only (`readonly: true` SQLite access; zero disk writes).
- **Scope**: Core top-level CLI command (`design-context`, alias `dc`) and MCP `tsdoc_get_design_context` counterpart ([[MCP Integration]]).

## CLI Usage

```bash
tsdoc-edge design-context src/indexer/ProjectIndexer.ts
tsdoc-edge dc src/convention/ConventionCheckService.ts --json
```

## Related Concepts

- [[WorkContextCommand]]
- [[TsdocEdgePlatformSpecification]]
- [[CliCommandSurfaceSpecification]]
- [[MCP Integration]]

---

## Backlinks

### Referenced By

- [[MCP Integration]] → managed/features/mcp-integration.md:68
- [[CliCommandSurfaceSpecification]] → managed/specs/domains/cli-command-surface-spec.md:404

### Implemented By

- DesignContextCommand → src/commands/DesignContextCommand.ts:119

