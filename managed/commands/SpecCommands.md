---
title: Specification Commands
type: reference
category: commands
status: active
canonical: true
---

# [[SpecCommands]]

> Commands for managing specification documents and versioning

## Overview

Specification commands help manage versioned documentation with proper lifecycle tracking.

The current grouped surface is `tsdoc-edge spec`. It keeps the legacy flat commands available
while making managed-spec extraction and saved SpecGraph inspection explicit:

```bash
tsdoc-edge spec extract --workspace-root . --spec-db .tsdoc/spec-graph.db
tsdoc-edge spec graph status --spec-db .tsdoc/spec-graph.db --json
tsdoc-edge spec graph list --spec-db .tsdoc/spec-graph.db --json
tsdoc-edge spec graph read --spec-db .tsdoc/spec-graph.db --revision-id <revision-id> --json
```

`spec extract` is the only writer for the derived SpecGraph projection; the Markdown files under
`managed/specs/` remain the authored SSOT. The `spec graph` operations are read-only.

**Sources**: `src/commands/SpecCommand.ts`, `src/commands/SpecExtractCommand.ts`,
`src/commands/SpecGraphCommand.ts`

## Version Management

### [[SpecBumpCommand]]

Increments the semantic version (`major`, `minor`, or `patch`) recorded in a specification document YAML frontmatter.

```bash
tsdoc-edge spec-bump <file> [options]
  --major             Bump major version
  --minor             Bump minor version
  --patch             Bump patch version (default)
```

**Source**: `src/commands/SpecBumpCommand.ts`

### [[SpecDiffCommand]]

Compares structural and content differences between two revisions of a managed specification document.

```bash
tsdoc-edge spec-diff <file> [options]
  --from <version>    Base version
  --to <version>      Target version
```

**Source**: `src/commands/SpecDiffCommand.ts`

### [[SpecHistoryCommand]]

Displays the version and status transition history of a specification document from Git and spec metadata.

```bash
tsdoc-edge spec-history <file> [options]
  --limit <n>         Number of versions to show
```

**Source**: `src/commands/SpecHistoryCommand.ts`

## Status & Metrics Management

### [[SpecStatusCommand]]

Inspects and transitions a specification document lifecycle status (`draft`, `review`, `approved`, `active`, `deprecated`, `archived`).

```bash
tsdoc-edge spec-status <file> [status]
  --reason <text>     Reason for status change
```

**Source**: `src/commands/SpecStatusCommand.ts`

### [[SpecMetricsCommand]]

Reports multi-dimensional specification completeness, conformance, and code-binding metrics across managed specs.

```bash
tsdoc-edge spec-metrics [options]
  --dir <path>        Specification directory (default: managed/specs)
  --json              Emit machine-readable JSON metrics report
```

**Source**: `src/commands/SpecMetricsCommand.ts`

### validate-spec

Validate specification completeness.

```bash
tsdoc-edge validate-spec <file> [options]
  --strict            Strict validation mode
```

**Source**: `src/commands/ValidateSpecCommand.ts`

## Related

- [[ValidationFeatures]] - Documentation validation
- [[Guides & Tutorials]] - Specification workflow guides

---

## Backlinks

### Referenced By

- [[CLI Commands]] → managed/CLI-COMMANDS.md:46
- [[Commands Index]] → managed/COMMANDS.md:139
- [[AuthoredProjectSpecifications]] → managed/specs/index.md:119

### Implemented By

- SpecCommands → src/commands/SpecBumpCommand.ts:1

