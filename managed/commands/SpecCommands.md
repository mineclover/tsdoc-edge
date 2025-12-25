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

## Version Management

### spec-bump

Bump specification version.

```bash
tsdoc-edge spec-bump <file> [options]
  --major             Bump major version
  --minor             Bump minor version
  --patch             Bump patch version (default)
```

**Source**: `src/commands/SpecBumpCommand.ts`

### spec-diff

Compare specification versions.

```bash
tsdoc-edge spec-diff <file> [options]
  --from <version>    Base version
  --to <version>      Target version
```

**Source**: `src/commands/SpecDiffCommand.ts`

### spec-history

Show version history of a specification.

```bash
tsdoc-edge spec-history <file> [options]
  --limit <n>         Number of versions to show
```

**Source**: `src/commands/SpecHistoryCommand.ts`

## Status Management

### spec-status

Manage specification status (draft, review, approved, deprecated).

```bash
tsdoc-edge spec-status <file> [status]
  --reason <text>     Reason for status change
```

**Source**: `src/commands/SpecStatusCommand.ts`

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

