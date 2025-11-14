# [[SpecTypes]]

**Source**: `src/types/spec.ts`

## Purpose

Type system for specification document management and quality assessment.

## Spec Status

Document lifecycle states:
```typescript
type SpecStatus = 'draft' | 'review' | 'approved' | 'active' | 'deprecated' | 'archived';
```

### Status Meanings

- **draft**: Work in progress
- **review**: Ready for peer review
- **approved**: Reviewed and accepted
- **active**: Currently in use (canonical)
- **deprecated**: Replaced by newer version
- **archived**: No longer relevant

## Spec Metadata

Document metadata:
```typescript
interface SpecMetadata {
  primary: string;           // Document symbol name
  version: string;           // Document version
  status: SpecStatus;
  category: string;          // Classification
  tags: string[];            // Search tags
  lastUpdated: string;       // ISO timestamp
  authors?: string[];
  reviewers?: string[];
}
```

## Spec Requirements

Quality requirements:
```typescript
interface SpecRequirements {
  requiredSections: string[];      // Must have
  recommendedSections: string[];   // Should have
  minScenarios: number;            // Min usage scenarios
  minCodeReferences: number;       // Min code links
  minExamples: number;             // Min examples
}
```

### Default Requirements

```typescript
{
  requiredSections: ['개요', '핵심 개념', '핵심 산출물', '사용 시나리오'],
  recommendedSections: ['CLI 명령어', '관련 기능', '가이드'],
  minScenarios: 3,
  minCodeReferences: 5,
  minExamples: 2
}
```

## Spec Completeness Result

Comprehensive quality assessment:
```typescript
interface SpecCompletenessResult {
  filePath: string;
  score: number;                   // Overall (0-100) - DEPRECATED
  designScore: number;             // Design quality (0-100)
  implementationScore: number;     // Implementation quality (0-100)
  isComplete: boolean;
  breakdown: {
    design: DesignMetrics;
    implementation: ImplementationMetrics;
  };
  missingSections: string[];
  suggestions: string[];
}
```

### Design Metrics

Quality measured without code:
- **Structure**: Required/recommended sections
- **Scenarios**: Usage scenario completeness
- **Examples**: Example quality
- **Clarity**: Writing clarity

### Implementation Metrics

Quality requiring code connections:
- **Code References**: Links to implementation
- **Coverage**: Symbol coverage
- **Traceability**: Bi-directional links
- **Consistency**: Code-doc alignment

## Content Similarity

Duplicate detection:
```typescript
interface ContentSimilarity {
  file1: string;
  file2: string;
  overallSimilarity: number;       // 0-1
  sectionMatches: SectionMatch[];
  recommendation: 'merge' | 'reference' | 'keep-separate';
}

interface SectionMatch {
  section1: string;
  section2: string;
  similarity: number;              // 0-1
  recommendation: string;
}
```

## Unused Document

Orphaned document detection:
```typescript
interface UnusedDocument {
  filePath: string;
  reason: 'orphaned' | 'stale' | 'duplicate';
  incomingRefs: number;            // How many refs
  lastModified: string;
  status: SpecStatus;
  recommendation: 'delete' | 'archive' | 'review';
}
```

### Detection Criteria

- **orphaned**: 0 incoming references
- **stale**: No updates in 90+ days
- **duplicate**: High similarity to other doc

## Spec Status Transition

Status change validation:
```typescript
interface SpecStatusTransition {
  from: SpecStatus;
  to: SpecStatus;
  allowed: boolean;
  reason?: string;                 // Why not allowed
  requiredScore?: number;          // Min score needed
  currentScore?: number;
}
```

### Transition Rules

```typescript
{
  'draft → review': { requiredScore: 50 },
  'review → approved': { requiredScore: 80 },
  'approved → active': { requiredScore: 80 },
  'active → deprecated': { requiredScore: 0 },
  'deprecated → archived': { requiredScore: 0 }
}
```

## Scoring Algorithm

### Design Score (0-100)

- Required sections: 40 points
- Recommended sections: 20 points
- Scenarios: 20 points
- Examples: 20 points

### Implementation Score (0-100)

- Code references: 40 points
- Symbol coverage: 30 points
- Bi-directional links: 20 points
- Consistency: 10 points

### Overall Score

```
overallScore = (designScore × 0.5) + (implementationScore × 0.5)
```

## Usage

### Validate Spec
```bash
tsdoc-edge validate-spec managed/features/work-context.md
# Shows completeness score and missing sections
```

### Check Status
```bash
tsdoc-edge spec-status managed/features/work-context.md
# Shows current status and valid transitions
```

### Find Duplicates
```bash
tsdoc-edge check-duplicates managed
# Finds similar documents
```

### Find Unused
```bash
tsdoc-edge find-unused-docs managed
# Finds orphaned/stale docs
```

## Symbol Count

1 type, 6 interfaces

## Related

- [[SpecCompletenessValidator]]: Validates completeness
- [[SpecStatusManager]]: Manages status transitions
- [[UnusedDocumentDetector]]: Finds orphaned docs
- [[SpecContentSimilarityChecker]]: Detects duplicates

---

## Backlinks

### Referenced By

- [[SpecCompletenessValidator]] → /home/user/tsdoc-edge/managed/utilities/SpecCompletenessValidator.md:90
- [[SpecCompletenessValidator]] → /home/user/tsdoc-edge/managed/utilities/SpecCompletenessValidator.md:91
- [[SpecCompletenessValidator]] → /home/user/tsdoc-edge/managed/utilities/SpecCompletenessValidator.md:92
- [[SpecContentSimilarityChecker]] → /home/user/tsdoc-edge/managed/utilities/SpecContentSimilarityChecker.md:89
- [[SpecContentSimilarityChecker]] → /home/user/tsdoc-edge/managed/utilities/SpecContentSimilarityChecker.md:90
- [[SpecContentSimilarityChecker]] → /home/user/tsdoc-edge/managed/utilities/SpecContentSimilarityChecker.md:91
- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:75
- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:76
- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:77
- [[UnusedDocumentDetector]] → /home/user/tsdoc-edge/managed/utilities/UnusedDocumentDetector.md:90
- [[UnusedDocumentDetector]] → /home/user/tsdoc-edge/managed/utilities/UnusedDocumentDetector.md:91
- [[UnusedDocumentDetector]] → /home/user/tsdoc-edge/managed/utilities/UnusedDocumentDetector.md:92

