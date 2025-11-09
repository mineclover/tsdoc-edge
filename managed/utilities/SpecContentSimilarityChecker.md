# [[SpecContentSimilarityChecker]]

**Source**: `src/spec/SpecContentSimilarityChecker.ts`

## Purpose

Detect duplicate and similar content across specification documents.

## Similarity Detection

### Text Similarity Algorithm

Uses token-based comparison:
1. Tokenize both documents (words)
2. Build token frequency vectors
3. Calculate cosine similarity
4. Compare against thresholds

### Similarity Levels

- **High similarity** (≥70%): Likely duplicate
- **Medium similarity** (30-70%): Related content
- **Low similarity** (<30%): Distinct documents

## Section-by-Section Analysis

Compares documents at two levels:

### Document Level
- Overall similarity score
- Entire content comparison
- Metadata comparison

### Section Level
- Individual section matching
- Identify duplicate sections
- Find contradictions

## Detection Results

```typescript
{
  file1: "managed/features/work-context.md",
  file2: "managed/workflows/work-context-workflow.md",
  overallSimilarity: 0.45,
  sectionMatches: [
    {
      section1: "개요",
      section2: "Overview",
      similarity: 0.82,
      recommendation: "merge-or-reference"
    }
  ],
  recommendation: "consolidate-or-reference"
}
```

## Recommendations

### High Similarity (≥70%)
- **Exact duplicate**: Delete one, keep other
- **Near duplicate**: Merge into single doc
- **Intentional**: Add cross-references

### Medium Similarity (30-70%)
- **Related concepts**: Add `[[Symbol]]` references
- **Overlapping scope**: Refactor boundaries
- **Same examples**: Extract to shared doc

### Section-Level Actions
- Move duplicate sections to shared file
- Use `[[Symbol]]` to reference common content
- Update backlinks automatically

## Usage

```bash
# Check similarity between two docs
tsdoc-edge check-similarity doc1.md doc2.md

# Find all similar docs in directory
tsdoc-edge find-duplicates managed --threshold 0.7
```

## Thresholds Configuration

```typescript
const checker = new SpecContentSimilarityChecker({
  similarityThreshold: 0.3,      // Min to report
  highSimilarityThreshold: 0.7   // Consider duplicate
});
```

## Symbol Count

1 class, 2 interfaces, 1 type

## Related

- [[CheckDuplicatesCommand]]: CLI duplicate detection
- [[UnusedDocumentDetector]]: Find orphaned docs
- [[DocumentSymbolParser]]: Parse doc structure
