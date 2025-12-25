---
title: Spec Types
type: type
category: types
status: active
canonical: true
---

# SpecTypes

**Source**: `src/types/spec.ts`

## Purpose

Type system for specification document management and quality assessment.

## Spec Status

Document lifecycle states:

See implementation: SpecStatus

**Values**:
- `draft`: Work in progress
- `review`: Ready for peer review
- `approved`: Reviewed and accepted
- `active`: Currently in use (canonical)
- `deprecated`: Replaced by newer version
- `archived`: No longer relevant

### Status Meanings

- **draft**: Work in progress
- **review**: Ready for peer review
- **approved**: Reviewed and accepted
- **active**: Currently in use (canonical)
- **deprecated**: Replaced by newer version
- **archived**: No longer relevant

## Spec Metadata

Document metadata:

See implementation: SpecMetadata

**Key Properties**:
- `primary`: Document symbol name
- `version`: Document version
- `status`: Spec status
- `category`: Classification
- `tags`: Search tags
- `lastUpdated`: ISO timestamp
- `authors`: Authors (optional)
- `reviewers`: Reviewers (optional)

## Spec Requirements

Quality requirements:

See implementation: SpecRequirements

**Key Properties**:
- `requiredSections`: Must have sections
- `recommendedSections`: Should have sections
- `minScenarios`: Min usage scenarios
- `minCodeReferences`: Min code links
- `minExamples`: Min examples

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

See implementation: SpecCompletenessResult

**Key Properties**:
- `filePath`: File path
- `score`: Overall score (0-100) - DEPRECATED
- `designScore`: Design quality (0-100)
- `implementationScore`: Implementation quality (0-100)
- `isComplete`: Is complete?
- `breakdown`: Design and implementation metrics
- `missingSections`: Missing sections
- `suggestions`: Improvement suggestions

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

See implementation: ContentSimilarity

**Key Properties**:
- `file1`: First file path
- `file2`: Second file path
- `similarity`: Similarity score (0-1)
- `overlappingSections`: Array of overlapping sections with similarity scores
- `suggestion`: 'merge', 'cross-reference', or 'keep-separate'
- `reason`: Reason for suggestion

## Unused Document

Orphaned document detection:

See implementation: UnusedDocument

**Key Properties**:
- `filePath`: File path
- `reason`: 'orphaned', 'stale', or 'duplicate'
- `incomingRefs`: How many refs
- `lastModified`: Last modified date
- `status`: Spec status
- `recommendation`: 'delete', 'archive', or 'review'

### Detection Criteria

- **orphaned**: 0 incoming references
- **stale**: No updates in 90+ days
- **duplicate**: High similarity to other doc

## Spec Status Transition

Status change validation:

See implementation: SpecStatusTransition

**Key Properties**:
- `from`: From status
- `to`: To status
- `allowed`: Is allowed?
- `reason`: Why not allowed (optional)
- `requiredScore`: Min score needed (optional)
- `currentScore`: Current score (optional)

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
- SpecStatusManager: Manages status transitions
- [[UnusedDocumentDetector]]: Finds orphaned docs
- SpecContentSimilarityChecker: Detects duplicates
