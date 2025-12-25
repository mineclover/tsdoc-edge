# EnhancedTagTypes

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Extended documentation structure for comprehensive symbol documentation in Strict Mode.

## Problem Solving

Documents the problem context:

See implementation: ProblemSolving

**Key Properties**:
- `description`: Problem description
- `context`: What problem solved
- `targetUseCase`: Intended use case (optional)
- `relatedProblem`: Parent/related problem (optional)

### Example

```typescript
{
  description: "Users cannot recover forgotten passwords",
  context: "Account recovery without support tickets",
  targetUseCase: "Self-service password reset",
  relatedProblem: "Account security and access management"
}
```

## Functionality

Documents what the symbol does:

See implementation: [[Functionality]]

**Key Properties**:
- `mainFeatures`: Key features
- `components`: Sub-components
- `io`: Input/output specification (optional)
- `examples`: Usage examples (optional)

### Supporting Types

Component structure (inline type in [[Functionality]].components):
- `name`: Component name
- `description`: Component description
- `signature`: Function signature (optional)

IOSpec structure (inline type in [[Functionality]].io):
- `inputs`: Input specifications (name, type, description)
- `outputs`: Output specifications (name, type, description)

## Error Experience

Documents known errors and solutions:

See implementation: ErrorExperience

**Key Properties**:
- `id`: Error identifier
- `errorType`: Error class/name
- `scenario`: When it happens
- `rootCause`: Why it happens
- `solution`: How to fix
- `prevention`: How to prevent (optional)
- `learnedFrom`: Source of knowledge (optional)

### Example

```typescript
{
  id: "ERR_INVALID_TOKEN",
  errorType: "AuthenticationError",
  scenario: "JWT token expired or malformed",
  rootCause: "Token TTL exceeded or signature mismatch",
  solution: "Refresh token or re-authenticate",
  prevention: "Implement automatic token refresh before expiry",
  learnedFrom: "Production incident #123"
}
```

## Design Decisions

Documents architectural choices:

See implementation: DesignDecision

**Key Properties**:
- `id`: Decision identifier
- `title`: Decision summary
- `context`: Background/situation
- `decision`: What was decided
- `alternatives`: Alternative options considered
- `rationale`: Why chosen
- `consequences`: Trade-offs
- `status`: 'proposed', 'accepted', 'deprecated', or 'superseded'
- `date`: Decision date (optional)
- `revisedBy`: Superseding decision (optional)

Note: The `alternatives` field in the documentation contains an array of alternative options as strings. For structured alternatives, use the DesignDecision interface with the `consequences` field to describe trade-offs.

## Dependencies

Documents external dependencies:

See implementation: DependencySpec

**Key Properties**:
- `name`: Dependency name
- `version`: Version constraint (optional)
- `type`: 'npm', 'internal', 'external', or 'service'
- `purpose`: Why needed
- `alternatives`: Possible replacements (optional)
- `critical`: Required for core functionality?

## Future Plans

Documents roadmap and TODOs:

See implementation: FuturePlan

**Key Properties**:
- `id`: Plan identifier
- `title`: Plan title
- `description`: Plan description
- `priority`: 'high', 'medium', or 'low'
- `effort`: 'small', 'medium', or 'large'
- `blockers`: Blocking issues (optional)
- `relatedIssues`: GitHub issues (optional)
- `estimatedDate`: Target date (optional)

## Enhanced Symbol Documentation

Complete enhanced doc structure:

See implementation: EnhancedSymbolDoc

**Key Properties**:
- `symbolId`: Symbol identifier
- `problemSolving`: Problem context (optional)
- `functionality`: Functionality details (optional)
- `errorExperiences`: Error experiences
- `designDecisions`: Design decisions
- `dependencies`: Dependencies
- `futurePlans`: Future plans
- `metadata`: Metadata (createdAt, updatedAt, version, authors)

## Strict Mode Requirements

In strict mode, symbols must have:
- Problem solving context
- Functionality description
- At least one example
- Error handling docs
- Design decision rationale

## Usage

### Generate Enhanced Docs
```bash
tsdoc-edge generate-docs src/services/UserService.ts --enhanced
```

### Validate Enhanced Docs
```bash
tsdoc-edge validate --strict
# Checks for enhanced doc completeness
```

### Improve Docs
```bash
tsdoc-edge improve src/services/UserService.ts
# AI-assisted enhancement
```

## Symbol Count

6 interfaces

## Related

- ModuleSpecTypes: 7-part framework
- EnhancedDocExtractor: Extracts enhanced docs
- StrictModeValidator: Validates completeness
