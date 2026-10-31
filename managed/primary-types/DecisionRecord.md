---
title: Decision Record
type: type
category: primary-types
status: active
canonical: true
---

# [[DecisionRecord]]

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Type definition for decision record documentation (Architecture Decision Records).

## Type Definition

See DecisionRecord implementation in source code.

## Fields

- **id**: Decision identifier
- **title**: Decision title
- **decision**: What was decided
- **rationale**: Why this decision was made
- **alternatives**: Options considered and why rejected
- **consequences**: Consequences of this decision
- **date**: Date of decision
- **status**: proposed | accepted | deprecated | superseded
- **supersededBy**: What superseded this decision (if applicable)

## Usage

Used in EnhancedSymbolDoc as Category 4 (15 points).

**Property**: `decisions?: DecisionRecord[]`

## Validation

Part of StrictModeValidator scoring:
- Missing: -12.5 points
- Incomplete: -6.25 points

## Related

- EnhancedSymbolDoc - Parent type
- ProblemSolving - Category 1
- [[Functionality]] - Category 2
- ErrorExperience - Category 3
- DependencySpec - Category 5
- FuturePlan - Category 6

---

**Category**: Type Definition
**Status**: Active

---

## Backlinks

### Referenced By

- [[Primary Types Index]] → managed/primary-types/index.md:22

### Implemented By

- DecisionRecord → src/types/tags/enhanced.ts:1

