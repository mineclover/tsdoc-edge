---
title: Base Symbol Doc
type: type
category: primary-types
status: active
canonical: true
---

# BaseSymbolDoc

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Base type for symbol documentation with core metadata fields.

## Type Definition

See BaseSymbolDoc implementation in source code.

## Fields

- **symbolId**: Symbol identifier
- **createdAt**: When documentation was created
- **updatedAt**: Last update timestamp
- **version**: Documentation version

## Usage

Extended by EnhancedSymbolDoc which adds:
- `problemSolving`: Problem-solving documentation
- `functionality`: Functionality details
- `errorExperiences`: Known errors and solutions
- `decisions`: Design decisions
- `dependencies`: Dependency specifications
- `futurePlans`: Future development plans

## Related

- EnhancedSymbolDoc - Extends this base type
- ProblemSolving - Category 1
- [[Functionality]] - Category 2

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- BaseSymbolDoc → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/BaseSymbolDoc.md:11
- EnhancedSymbolDoc → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:27
- EnhancedSymbolDoc → /Users/junwoobang/workflow/tsdoc-edge/managed/primary-types/EnhancedSymbolDoc.md:130

