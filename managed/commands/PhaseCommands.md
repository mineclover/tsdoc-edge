---
title: Phase Commands
type: command
category: commands
status: active
canonical: true
---

# [[Phase Commands]]

**Source**: `src/commands/registerCliCommands.ts`

Historical phase command modules (`Phase4Commands`..`Phase10Commands`) were consolidated into the 20 canonical top-level CLI commands registered in `src/commands/registerCliCommands.ts`.

## Overview

| Phase | Focus | Key Features |
|-------|-------|--------------|
| Phase 4 | Type Analysis | Interface mapping, type chains, generic constraints |
| Phase 5 | Test Coverage | Test relationships, coverage sync, integration mapping |
| Phase 6 | Code Health | Health metrics, quality scoring, maintainability |
| Phase 7 | Data Flow | Execution paths, call chains, data tracking |
| Phase 8 | SSOT Validation | Completeness, missing links, reliability |
| Phase 10 | System Mgmt | Pre-commit, stats history, monitoring |

## Phase 4: Type Analysis

**Source**: `src/commands/registerCliCommands.ts`

Analyzes type dependencies and interface relationships.

**Commands**:
- `relationship analyze --type=types` - Type dependency analysis
- `relationship type-chain` - Type inheritance chains
- `relationship cycles` - Circular type detection

**Related**: [[Type Dependency]], [[TypeDependencyAnalyzer]]

## Phase 5: Test Coverage

**Source**: `src/commands/registerCliCommands.ts`

Tracks test relationships and integration coverage.

**Commands**:
- `relationship analyze --type=tests` - Test-to-code mapping
- `coverage-report` - Coverage reporting
- `coverage-baseline` - Immutable baseline comparison

**Related**: [[Test Coverage]], [[Integration Test Traceability]]

## Phase 6: Code Health

**Source**: `src/commands/registerCliCommands.ts`

Analyzes code quality and maintainability.

**Commands**:
- `health` - Overall health scoring
- `stats` - Quality metrics

**Related**: [[CodeHealthChecker]], [[AnalysisFeatures]]

## Phase 7: Data Flow

**Source**: `src/commands/registerCliCommands.ts`

Tracks data flow and execution paths.

**Commands**:
- `relationship analyze --type=calls` - Call graph analysis
- `relationship analyze --type=chains` - Dependency chains

**Related**: [[CallGraphAnalyzer]], [[Call Relationships]]

## Phase 8: SSOT Validation

**Source**: `src/commands/registerCliCommands.ts`

Validates documentation completeness and SSOT compliance.

**Commands**:
- `docs check-links` - Link validation
- `validate docs` - Document validation

**Related**: [[SSOT]], [[Analyzers & Extractors]]

## Phase 10: System Management

**Source**: `src/commands/registerCliCommands.ts`

System-level management and validation.

**Commands**:
- Pre-commit hooks
- Statistics tracking

**Related**: [[Analyzers & Extractors]], [[Analyzers & Extractors]]

## See Also

- [[CLI Commands]] - Full command reference
- [[BuildCommand]] - Core build command
- [[HealthCommand]] - Main analysis entry point

---

## Backlinks

### Referenced By

- [[Commands Index]] → managed/COMMANDS.md:185
- [[TSDoc Edge Documentation]] → managed/README.md:108
- [[QueryCommands]] → managed/commands/QueryCommands.md:136

### Implemented By

- Phase Commands → src/commands/registerCliCommands.ts:1

