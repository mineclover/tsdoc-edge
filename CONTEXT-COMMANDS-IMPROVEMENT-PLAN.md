# Context Commands Improvement Plan

**Date**: 2025-11-25
**Version**: 0.12.1
**Based on**: CONTEXT-COMMANDS-ANALYSIS.md

---

## Executive Summary

TSDoc Edge has 4 context commands providing comprehensive code context from different entry points. This plan prioritizes improvements to unify the experience, add missing features, and enhance usability.

**Timeline**: 3 phases (Quick Wins → Medium Priority → Long-term)

### ✅ Phase 1 Implementation Status

**Completed**: 2025-11-25 (commit d097208)

All Phase 1 Quick Wins have been successfully implemented:
1. ✅ `context` command now supports `--llm` flag for LLM-friendly output
2. ✅ `design-context` command now supports `--llm` flag for design context in LLM format
3. ✅ `work-context` command now supports `--category` filtering (documentation, structural, verification)

**Key Features Added**:
- LLMs.txt format output for AI assistants
- Comprehensive markdown formatting with clear sections
- Category-based filtering to focus on specific relationship types
- Backward compatible (all existing functionality preserved)

**Usage Examples**:
```bash
# Symbol context in LLM format
tsdoc-edge context class-databasemanager --llm

# Design context in LLM format
tsdoc-edge design-context src/storage/DatabaseManager.ts --llm

# Work context filtered by category
tsdoc-edge wc src/commands/BuildCommand.ts --category structural
tsdoc-edge wc file.ts --category documentation,verification
```

---

## Phase 1: Quick Wins (Priority: HIGH)

### 1.1 Add --llm Flag to context Command

**Goal**: Enable LLM-friendly output for symbol-based context

**Implementation**:
- **File**: `src/commands/ContextCommand.ts`
- **Changes**:
  ```typescript
  // Add to options parsing
  const llmMode = args.includes('--llm');

  // Use LLMsTextGenerator if --llm flag present
  if (llmMode) {
    const generator = new LLMsTextGenerator();
    const output = generator.generate(contextData);
    console.log(output);
  }
  ```
- **Dependencies**: Already have `LLMsTextGenerator`
- **Estimated effort**: 2-3 hours

**Usage**:
```bash
tsdoc-edge context class-databasemanager --llm
tsdoc-edge context class-foo --depth 2 --llm > context.txt
```

**Testing**:
- Test with various symbol types (class, function, interface)
- Test with --depth and filtering options
- Verify LLMs.txt format compliance

---

### 1.2 Add --llm Flag to design-context Command

**Goal**: Enable LLM-friendly output for design decision context

**Implementation**:
- **File**: `src/commands/DesignContextCommand.ts`
- **Changes**: Similar to 1.1, integrate LLMsTextGenerator
- **Estimated effort**: 2-3 hours

**Usage**:
```bash
tsdoc-edge design-context src/storage/DatabaseManager.ts --llm
```

**Benefits**:
- Consistent LLM format across all context commands
- Design context becomes AI-friendly
- Supports automated documentation workflows

---

### 1.3 Add Filtering to work-context Command

**Goal**: Allow users to focus on specific relationship types or categories

**Implementation**:
- **File**: `src/commands/WorkContextCommand.ts`
- **Changes**:
  ```typescript
  // Add new options
  const typeFilter = args.find(a => a.startsWith('--type='))?.split('=')[1]?.split(',');
  const categoryFilter = args.find(a => a.startsWith('--category='))?.split('=')[1]?.split(',');

  // Filter results before output
  if (typeFilter || categoryFilter) {
    context.relationships = context.relationships.filter(rel => {
      if (typeFilter && !typeFilter.includes(rel.type)) return false;
      if (categoryFilter && !categoryFilter.includes(rel.category)) return false;
      return true;
    });
  }
  ```
- **Estimated effort**: 3-4 hours

**Usage**:
```bash
# Focus on structural relationships only
tsdoc-edge work-context file.ts --category structural

# Focus on specific relationship types
tsdoc-edge work-context file.ts --type code-dependency,test-coverage

# Combined with LLM mode
tsdoc-edge wc file.ts --category structural --llm
```

**Benefits**:
- Reduces noise when exploring specific aspects
- Matches filtering capabilities of context command
- More flexible workflow

---

## Phase 2: Medium Priority

### 2.1 Merge design-context into work-context

**Goal**: Simplify command structure by consolidating file-based context

**Current Problem**:
- Both commands take file path as input
- Users confused about when to use which
- Duplicate code for file analysis

**Proposed Solution**:
```bash
# Default behavior (current work-context)
tsdoc-edge work-context file.ts

# Add design-focused information
tsdoc-edge work-context file.ts --design

# Combined with other flags
tsdoc-edge wc file.ts --design --llm --category structural
```

**Implementation**:
- **Files**: `src/commands/WorkContextCommand.ts`, `DesignContextCommand.ts`
- **Approach**:
  1. Add `--design` flag to WorkContextCommand
  2. When flag present, include design-specific analyzers:
     - TSDocParser for contracts (preconditions, postconditions, invariants)
     - ADR extraction
     - Error pattern analysis
  3. Keep DesignContextCommand for backward compatibility (deprecated)
  4. Add deprecation warning to design-context command

**Migration Path**:
```typescript
// In DesignContextCommand.execute()
console.warn(
  colors.yellow('⚠ Warning: design-context is deprecated.') + '\n' +
  colors.dim('Use: tsdoc-edge work-context <file> --design')
);
```

**Estimated effort**: 1-2 days

**Benefits**:
- Single command for all file-based context
- Reduced confusion
- Easier to maintain

---

### 2.2 Add Batch Processing

**Goal**: Generate context for multiple files at once

**Usage**:
```bash
# Process all TypeScript files in directory
tsdoc-edge work-context 'src/**/*.ts' --llm --output contexts/

# Process specific files
tsdoc-edge work-context src/file1.ts src/file2.ts src/file3.ts --llm

# With glob patterns
tsdoc-edge wc 'src/commands/**/*.ts' --batch --llm
```

**Implementation**:
- **File**: `src/commands/WorkContextCommand.ts`
- **Changes**:
  ```typescript
  // Detect batch mode
  const isBatch = args.includes('--batch') || args.length > 1 || hasGlob(args[0]);

  if (isBatch) {
    const files = expandGlob(args);
    for (const file of files) {
      const context = await analyzeFile(file);
      const outputPath = getOutputPath(file, outputDir);
      fs.writeFileSync(outputPath, generateOutput(context));
      console.log(`✓ ${file} → ${outputPath}`);
    }
  }
  ```
- **Dependencies**:
  - Use `glob` package for pattern expansion
  - Add progress indicator for large batches
- **Estimated effort**: 1 day

**Benefits**:
- Bulk context generation for documentation
- Prepare context for entire feature areas
- CI/CD integration (generate contexts on commit)

---

### 2.3 Smart Unified context Command

**Goal**: Auto-detect input type (file path vs symbol ID)

**Current Problem**:
- Users must know which command to use
- `work-context` for files, `context` for symbols

**Proposed Solution**:
```bash
# Auto-detect: file path → work-context behavior
tsdoc-edge ctx src/storage/DatabaseManager.ts

# Auto-detect: symbol ID → context behavior
tsdoc-edge ctx class-databasemanager

# Still support explicit mode
tsdoc-edge ctx file.ts --mode file
tsdoc-edge ctx class-foo --mode symbol
```

**Implementation**:
- **New File**: `src/commands/UnifiedContextCommand.ts`
- **Detection Logic**:
  ```typescript
  function detectInputType(input: string): 'file' | 'symbol' {
    // If it's a valid file path, treat as file
    if (fs.existsSync(input) || input.includes('/') || input.endsWith('.ts') || input.endsWith('.md')) {
      return 'file';
    }

    // If it matches symbol ID pattern (e.g., class-foo, function-bar)
    if (/^(class|function|interface|type|enum)-[a-z0-9-]+$/i.test(input)) {
      return 'symbol';
    }

    // Default: try as symbol first, fallback to file
    return 'symbol';
  }
  ```
- **Estimated effort**: 1-2 days

**Migration**:
- Add `ctx` as new alias
- Keep existing commands for backward compatibility
- Document new unified command as recommended approach

**Benefits**:
- Simplified user experience
- One command to learn
- Natural workflow

---

## Phase 3: Long-term

### 3.1 Interactive Context Explorer

**Goal**: REPL-style interface for exploring contexts

**Vision**:
```bash
$ tsdoc-edge context --interactive

TSDoc Edge Context Explorer
> start: class-databasemanager

DatabaseManager (Class)
├─ 23 relationships
├─ 5 dependencies
└─ 12 used by

> explore dependencies
1. class-sqlitedatabase
2. class-jsonlwriter
3. interface-dbconfig
4. type-queryresult
5. function-validateschema

> select 1

SqliteDatabase (Class)
├─ 15 relationships
├─ 8 dependencies

> back

> filter --type test-coverage
3 test coverage relationships found

> depth 2
Expanding to 2 hops...

> export context.json
✓ Exported to context.json

> quit
```

**Implementation**:
- **New File**: `src/commands/InteractiveContextCommand.ts`
- **Dependencies**:
  - `inquirer` for interactive prompts
  - `blessed` or `ink` for terminal UI
- **Features**:
  - Navigation commands: explore, back, select, filter
  - Export commands: export json/markdown/llm
  - Visualization: tree view, graph view
- **Estimated effort**: 1-2 weeks

**Benefits**:
- Exploratory context discovery
- Rapid relationship traversal
- Educational tool for understanding codebase

---

### 3.2 Context Diff

**Goal**: Compare context between git branches or commits

**Usage**:
```bash
# Compare context for a file between branches
tsdoc-edge context-diff src/storage/DatabaseManager.ts main..feature

# Compare specific symbols
tsdoc-edge context-diff class-databasemanager main..feature

# Show what relationships changed
tsdoc-edge context-diff file.ts --show relationships HEAD~10..HEAD
```

**Output**:
```
Context Diff: src/storage/DatabaseManager.ts (main → feature)

Symbols:
  + class-databasemanager-new-method
  - class-databasemanager-old-method
  ~ class-databasemanager (modified)

Relationships:
  + 3 new code-dependency relationships
  - 1 removed test-coverage relationship
  ~ 2 modified doc-reference relationships

Documentation:
  ~ managed/features/database.md (updated references)

Summary:
  +5 additions, -2 removals, ~3 modifications
```

**Implementation**:
- **New File**: `src/commands/ContextDiffCommand.ts`
- **Approach**:
  1. Checkout both versions using git
  2. Generate context for both
  3. Compare symbol lists, relationships, documentation
  4. Present diff in readable format
- **Estimated effort**: 1 week

**Benefits**:
- Understand impact of changes
- Code review tool
- Track context evolution over time

---

### 3.3 Context Caching

**Goal**: Speed up repeated context queries

**Current Problem**:
- Every context query re-analyzes from scratch
- Slow for large files or deep traversals

**Solution**:
- Cache context results in SQLite database
- Invalidate cache on file changes
- Use file modification time + hash for cache key

**Implementation**:
- **New Table**: `context_cache`
  ```sql
  CREATE TABLE context_cache (
    cache_key TEXT PRIMARY KEY,
    file_path TEXT,
    mtime INTEGER,
    hash TEXT,
    context_type TEXT,
    context_data TEXT,
    created_at INTEGER
  );
  ```
- **Files**: `src/storage/ContextCache.ts`
- **Cache Strategy**:
  ```typescript
  class ContextCache {
    get(filePath: string, options: ContextOptions): Context | null {
      const key = this.generateKey(filePath, options);
      const cached = this.db.query('SELECT * FROM context_cache WHERE cache_key = ?', key);

      if (!cached) return null;

      // Check if file changed
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs > cached.mtime) {
        this.invalidate(key);
        return null;
      }

      return JSON.parse(cached.context_data);
    }

    set(filePath: string, options: ContextOptions, context: Context): void {
      const key = this.generateKey(filePath, options);
      const stat = fs.statSync(filePath);
      const hash = this.hashFile(filePath);

      this.db.run(
        'INSERT OR REPLACE INTO context_cache VALUES (?, ?, ?, ?, ?, ?, ?)',
        key, filePath, stat.mtimeMs, hash, options.type, JSON.stringify(context), Date.now()
      );
    }
  }
  ```
- **Estimated effort**: 3-4 days

**Benefits**:
- 10-100x speedup for repeated queries
- Better user experience
- Enables real-time context updates

---

### 3.4 Multiple Export Formats

**Goal**: Export context in various formats

**Formats**:
```bash
# JSON (structured data)
tsdoc-edge context file.ts --export json > context.json

# Markdown (human-readable)
tsdoc-edge context file.ts --export markdown > context.md

# LLMs.txt (AI-friendly)
tsdoc-edge context file.ts --export llm > context.txt

# GraphML (for Gephi)
tsdoc-edge context file.ts --export graphml > context.graphml

# Mermaid (diagrams)
tsdoc-edge context file.ts --export mermaid > diagram.mmd

# HTML (interactive)
tsdoc-edge context file.ts --export html > context.html
```

**Implementation**:
- **New Directory**: `src/exporters/`
- **Files**:
  - `JsonExporter.ts`
  - `MarkdownExporter.ts`
  - `LLMExporter.ts` (use existing LLMsTextGenerator)
  - `GraphMLExporter.ts` (use existing Gephi export)
  - `MermaidExporter.ts`
  - `HTMLExporter.ts`
- **Base Class**:
  ```typescript
  abstract class ContextExporter {
    abstract export(context: Context): string;

    protected formatSymbols(symbols: Symbol[]): any { }
    protected formatRelationships(rels: Relationship[]): any { }
  }
  ```
- **Estimated effort**: 1 week

**Benefits**:
- Flexibility for different use cases
- Integration with external tools
- Better visualization options

---

## Implementation Priority

### ✅ Phase 1: Quick Wins - COMPLETED (2025-11-25)
1. ✅ Analysis complete (CONTEXT-COMMANDS-ANALYSIS.md)
2. ✅ **Add --llm to context command** (1.1) - Completed (commit d097208)
3. ✅ **Add --llm to design-context command** (1.2) - Completed (commit d097208)
4. ✅ **Add filtering to work-context** (1.3) - Completed (commit d097208)

**Status**: All Phase 1 tasks complete
**Commit**: d097208
**Time Spent**: ~8 hours (planning + implementation + testing)

### Next Sprint
5. **Merge design-context into work-context** (2.1) - 1-2 days
6. **Add batch processing** (2.2) - 1 day

**Total**: 2-3 days

### Future Sprints
7. Unified context command (2.3) - 1-2 days
8. Context caching (3.3) - 3-4 days
9. Multiple export formats (3.4) - 1 week
10. Interactive explorer (3.1) - 1-2 weeks
11. Context diff (3.2) - 1 week

---

## Success Metrics

### Phase 1 Success Criteria
- ✅ All context commands support --llm flag
- ✅ work-context supports filtering (--type, --category)
- ✅ Documentation updated
- ✅ Tests passing

### Phase 2 Success Criteria
- ✅ Single command for file-based context (work-context)
- ✅ Batch processing supports glob patterns
- ✅ Unified context command auto-detects input type
- ✅ Backward compatibility maintained

### Phase 3 Success Criteria
- ✅ Interactive explorer functional
- ✅ Context diff provides meaningful comparisons
- ✅ Cache improves performance by 10x
- ✅ At least 5 export formats supported

---

## Breaking Changes

### None in Phase 1
All improvements are additive (new flags, new features)

### Phase 2: Deprecation Warnings
- `design-context` deprecated in favor of `work-context --design`
- Warning messages added
- Documentation updated
- Commands still functional

### Phase 3: Potential Breaking Changes
- None planned
- All features additive

---

## Testing Strategy

### Unit Tests
- Test each new flag/option independently
- Test filtering logic with various inputs
- Test batch processing with different glob patterns
- Test cache invalidation logic

### Integration Tests
- Test complete workflows (e.g., batch generate + validate)
- Test command combinations (e.g., --llm --design --filter)
- Test cross-command compatibility

### Performance Tests
- Benchmark cache performance
- Benchmark batch processing vs sequential
- Track query response times

### User Acceptance Tests
- Document real-world scenarios
- Get feedback from beta users
- Iterate based on usage patterns

---

## Documentation Updates

### Required Documentation
1. **Update Command Docs**:
   - `managed/commands/ContextCommand.md` - Add --llm flag
   - `managed/commands/DesignContextCommand.md` - Add --llm flag
   - `managed/commands/WorkContextCommand.md` - Add filtering options

2. **Update Workflows**:
   - `managed/workflows/work-context-workflow.md` - Add filtering examples
   - Create `managed/workflows/batch-context-generation.md`

3. **Update README.md**:
   - Add new command options to examples
   - Add batch processing examples

4. **Create New Guides**:
   - `CONTEXT-COMMANDS-QUICKSTART.md` - Simple getting started guide
   - `CONTEXT-COMMANDS-ADVANCED.md` - Advanced usage patterns

---

## Dependencies

### Existing Dependencies (No Changes)
- TypeScript Compiler API
- SQLite (better-sqlite3)
- Commander.js (CLI parsing)

### New Dependencies (Phase 2-3)
- `glob` (batch processing)
- `inquirer` or `blessed` (interactive mode)
- `mermaid` (diagram generation)

---

## Risk Assessment

### Low Risk
- Adding --llm flags (existing generator, just wire it up)
- Adding filtering (similar to context command)

### Medium Risk
- Merging design-context into work-context (need to ensure no feature loss)
- Batch processing (need good error handling for large sets)

### High Risk
- Unified context command (detection logic must be reliable)
- Caching (invalidation logic must be correct to avoid stale data)
- Interactive mode (complex UI, many edge cases)

---

## Rollback Plan

### For Each Phase
1. Keep feature flags for new functionality
2. Maintain backward compatibility
3. Use git tags for each phase release
4. Document rollback procedures

### Emergency Rollback
```bash
# If Phase 1 breaks something
git revert <phase-1-commits>
npm run build
npm test

# Communicate to users
echo "Rolled back to v0.12.1 due to issues with Phase 1"
```

---

## Conclusion

This improvement plan transforms TSDoc Edge's context system from a collection of specialized commands into a unified, powerful, and flexible context discovery platform.

**Phase 1** (Quick Wins) provides immediate value with minimal risk.
**Phase 2** (Medium Priority) simplifies the user experience and adds productivity features.
**Phase 3** (Long-term) establishes TSDoc Edge as a best-in-class context discovery tool.

**Estimated Total Effort**: 4-6 weeks
**Immediate Value**: Week 1 (Phase 1 complete)

---

**Next Steps**:
1. Review and approve this plan
2. Create GitHub issues for Phase 1 tasks
3. Begin implementation with 1.1 (--llm flag for context command)

---

**Author**: Claude Code
**Date**: 2025-11-25
**Version**: 1.0
