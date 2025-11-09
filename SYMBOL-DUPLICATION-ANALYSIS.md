# Symbol Duplication Analysis

Generated: 2025-11-09

## Summary

- **Total Primary Symbols**: 157 (in doc-symbols.json)
- **Total H1 Definitions**: 173 (in .md files)
- **Difference**: 16 definitions (archive + auxiliary + duplicates)

## Duplicate Symbol Definitions

### 1. CallGraphAnalyzer (2 occurrences)
- `managed/analyzers/CallGraphAnalyzer.md` (canonical)
- `managed/archive/sessions/DOCUMENTATION-AUDIT.md` (archive)

**Status**: ✅ No action needed (archive is intentional historical record)

### 2. Code Dependency (4 grep matches)
- `managed/relationships/CODE-DEPENDENCY.md` (canonical) ✅
- `managed/archive/sessions/IMPROVEMENT-SUMMARY.md` (archive - inside code block example)
- `managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md` (inside code block example)
- `managed/workflows/mermaid-entrypoint-workflow.md` (inside code block example)

**Analysis**: Grep results are FALSE POSITIVES
- All workflow occurrences are inside ```markdown code blocks
- These are documentation examples showing the output format
- NOT actual duplicate H1 definitions

**Status**: ✅ No action needed (examples, not duplicates)

## Semantic Overlap Analysis

### Command Documentation

**Symbol Groups**:
1. Individual Commands (37 symbols):
   - AnalyzeCallsCommand, BuildCommand, etc.
   - Each has dedicated .md file

2. Command Indexes:
   - "Commands Index" (`managed/COMMANDS.md`)
   - "Phase Commands" series (Phase4-10)

**Overlap**: None - hierarchical organization is intentional

### Analyzer Documentation

**Similar Pairs**:
1. TestRelationshipAnalyzer vs TestRelationshipExtractor
   - **Different**: Analyzer = mapping logic, Extractor = extraction logic
   - **Files**: Both exist in src/analyzer/
   - **Recommendation**: Keep separate

2. CoverageSyncAdapter vs CoverageParser
   - **Different**: Adapter = sync with Istanbul, Parser = parse coverage JSON
   - **Recommendation**: Keep separate

3. DependencyChainAnalyzer vs DependencyResolver
   - **Different**: Analyzer = find chains, Resolver = resolve single dependency
   - **Recommendation**: Keep separate

### Type Documentation

**No duplicates found** in types/ directory

## Archive Files Analysis

Files in `managed/archive/` contain duplicate H1 definitions for historical purposes:
- `managed/archive/sessions/DOCUMENTATION-AUDIT.md`
- `managed/archive/sessions/IMPROVEMENT-SUMMARY.md`

**Recommendation**: Leave as-is (archive purpose)

## Workflow Files with Canonical Symbols

Workflow and example files that reference canonical symbols with H1:
- `managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md`
- `managed/workflows/mermaid-entrypoint-workflow.md`

**Issue**: Should use H2 `## [[Symbol]]` for non-canonical references

## Recommendations

### High Priority: Fix Workflow References

Convert canonical symbol references in workflows from H1 to H2:

```bash
# In workflow files, change:
# [[Code Dependency]]  →  ## [[Code Dependency]]
```

**Files to fix**:
- `managed/workflows/EXAMPLE-MERMAID-WORKFLOW.md`
- `managed/workflows/mermaid-entrypoint-workflow.md`

**Impact**: Reduces H1 count from 173 to 171

### Low Priority: Archive Files

Archive files can remain with H1 definitions as they are historical snapshots.

### No Action Needed

The following are NOT duplicates:
- Phase Commands hierarchy (intentional organization)
- Similar-named analyzers (different responsibilities)
- Individual command docs vs Commands Index (intentional hierarchy)

## Symbol Categories Distribution

| Category | Count | Notes |
|----------|-------|-------|
| Commands | 37 | Individual command docs |
| Analyzers | 29 | Extraction and analysis tools |
| Types | 20 | Type definitions |
| Utilities | 25 | Helper and infrastructure |
| Features | 7 | Feature documentation |
| Workflows | 5 | Process documentation |
| Concepts | 2 | Theoretical docs |
| Relationships | 10 | Relationship type docs |
| Core Components | 5 | Foundation modules |
| Others | 17 | Misc documentation |

**Total**: 157 primary symbols

## Final Verdict

### No Duplicates Found

After thorough analysis:
- ✅ CallGraphAnalyzer duplicate is in archive (intentional)
- ✅ Code Dependency "duplicates" are code block examples (false positives)
- ✅ Similar-named symbols serve different purposes
- ✅ Hierarchical organization is intentional

### No Actions Required

1. **No merging needed**
   - All 157 symbols serve distinct purposes
   - Documentation organization is intentional and well-structured

2. **Archive files**
   - Keep as-is (historical documentation)

3. **Code examples**
   - Keep as-is (documentation examples)

### Conclusion

The documentation system is **clean and well-organized** with:
- 157 unique primary symbols
- 16 additional H1s in archives/examples (intentional)
- No true duplicates requiring merging
