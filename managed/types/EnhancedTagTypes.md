# [[EnhancedTagTypes]]

**Source**: `src/types/tags/enhanced.ts`

## Purpose

Extended documentation structure for comprehensive symbol documentation in Strict Mode.

## Problem Solving

Documents the problem context:
```typescript
interface ProblemSolving {
  description: string;       // Problem description
  context: string;           // What problem solved
  targetUseCase?: string;    // Intended use case
  relatedProblem?: string;   // Parent/related problem
}
```

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
```typescript
interface Functionality {
  mainFeatures: string[];    // Key features
  components: Component[];   // Sub-components
  io?: IOSpec;               // Input/output
  examples?: string[];       // Usage examples
}

interface Component {
  name: string;
  description: string;
  signature?: string;        // Function signature
}

interface IOSpec {
  inputs: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  outputs: Array<{
    name: string;
    type: string;
    description: string;
  }>;
}
```

## Error Experience

Documents known errors and solutions:
```typescript
interface ErrorExperience {
  id: string;                // Error identifier
  errorType: string;         // Error class/name
  scenario: string;          // When it happens
  rootCause: string;         // Why it happens
  solution: string;          // How to fix
  prevention?: string;       // How to prevent
  learnedFrom?: string;      // Source of knowledge
}
```

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
```typescript
interface DesignDecision {
  id: string;                // Decision identifier
  title: string;             // Decision summary
  context: string;           // Background/situation
  decision: string;          // What was decided
  alternatives: Alternative[];
  rationale: string;         // Why chosen
  consequences: string[];    // Trade-offs
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  date?: string;             // Decision date
  revisedBy?: string;        // Superseding decision
}

interface Alternative {
  name: string;
  pros: string[];
  cons: string[];
  rejected: boolean;
}
```

## Dependencies

Documents external dependencies:
```typescript
interface DependencyDoc {
  name: string;              // Dependency name
  version?: string;          // Version constraint
  type: 'npm' | 'internal' | 'external' | 'service';
  purpose: string;           // Why needed
  alternatives?: string[];   // Possible replacements
  critical: boolean;         // Required for core functionality?
}
```

## Future Plans

Documents roadmap and TODOs:
```typescript
interface FuturePlan {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'small' | 'medium' | 'large';
  blockers?: string[];       // Blocking issues
  relatedIssues?: string[];  // GitHub issues
  estimatedDate?: string;    // Target date
}
```

## Enhanced Symbol Documentation

Complete enhanced doc structure:
```typescript
interface EnhancedSymbolDoc {
  symbolId: string;
  problemSolving?: ProblemSolving;
  functionality?: Functionality;
  errorExperiences: ErrorExperience[];
  designDecisions: DesignDecision[];
  dependencies: DependencyDoc[];
  futurePlans: FuturePlan[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    authors?: string[];
  };
}
```

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

- [[ModuleSpecTypes]]: 7-part framework
- [[EnhancedDocExtractor]]: Extracts enhanced docs
- [[StrictModeValidator]]: Validates completeness

---

## Backlinks

### Referenced By

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:298
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:299
- [[EnhancedDocExtractor]] → /home/user/tsdoc-edge/managed/parser/EnhancedDocExtractor.md:272
- [[EnhancedDocExtractor]] → /home/user/tsdoc-edge/managed/parser/EnhancedDocExtractor.md:273
- [[ModuleSpecTypes]] → /home/user/tsdoc-edge/managed/types/ModuleSpecTypes.md:108
- [[ModuleSpecTypes]] → /home/user/tsdoc-edge/managed/types/ModuleSpecTypes.md:109

