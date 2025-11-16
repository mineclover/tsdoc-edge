# [[UnusedDocumentDetector]]

**Source**: `src/spec/UnusedDocumentDetector.ts`

## Purpose

Detect unused and stale specification documents for cleanup.

## Detection Criteria

### Unused Documents

- 0 incoming references (not linked by any doc)
- Not in active or approved status
- No code connections
- Not an index or navigation page

### Stale Documents

Time-based thresholds:
- **Draft**: 90 days without updates
- **Deprecated**: 90 days in deprecated state
- **Review**: 60 days without approval

## Analysis Process

### 1. Build Reference Map

Scan all markdown files:
- Extract `[[Symbol]]` references
- Build incoming reference count
- Identify orphaned documents

### 2. Check Staleness

For each document:
- Parse git last modified date
- Compare against threshold
- Check status transitions

### 3. Classify Results

- **Safe to delete**: 0 refs, deprecated, stale
- **Archive candidate**: Few refs, draft, stale
- **Review needed**: Active but stale

## Unused Document Result

```typescript
{
  filePath: "managed/concepts/old-feature.md",
  reason: "orphaned",
  incomingRefs: 0,
  lastModified: "2024-08-15",
  status: "deprecated",
  recommendation: "safe-to-delete"
}
```

## Recommendations

### Safe to Delete
- 0 references
- Deprecated or draft status
- Stale for 90+ days
- No code connections

### Archive
- Few references (1-2)
- Draft status
- Stale but potentially useful

### Review
- Many references but stale content
- Needs update or deprecation decision

## Usage

```bash
# Detect unused docs
tsdoc-edge find-unused-docs managed

# Only show safe-to-delete
tsdoc-edge find-unused-docs managed --safe-only
```

## Symbol Count

1 class, 1 interface

## Related

- [[FindUnusedDocsCommand]]: CLI detection command
- [[SpecStatusManager]]: Manages document status
- [[DocumentSymbolParser]]: Parses document references

---

## Backlinks

### Referenced By

- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:165
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:166
- [[DocumentSymbolParser]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolParser.md:167
- [[SpecTypes]] → /home/user/tsdoc-edge/managed/types/SpecTypes.md:125
- [[SpecTypes]] → /home/user/tsdoc-edge/managed/types/SpecTypes.md:140
- [[SpecTypes]] → /home/user/tsdoc-edge/managed/types/SpecTypes.md:141
- [[SpecContentSimilarityChecker]] → /home/user/tsdoc-edge/managed/utilities/SpecContentSimilarityChecker.md:75
- [[SpecContentSimilarityChecker]] → /home/user/tsdoc-edge/managed/utilities/SpecContentSimilarityChecker.md:92
- [[SpecContentSimilarityChecker]] → /home/user/tsdoc-edge/managed/utilities/SpecContentSimilarityChecker.md:93
- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:88
- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:89
- [[SpecStatusManager]] → /home/user/tsdoc-edge/managed/utilities/SpecStatusManager.md:90

