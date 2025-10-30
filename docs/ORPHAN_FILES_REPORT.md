# Orphan File Analysis Report

Generated: 2025-10-31

## Summary

- **Total Files**: 49
- **Entry Points**: 2 (src/index.ts, src/cli.ts)
- **Reachable from Entry**: 31 files (67.3%)
- **Type-Only Files**: 11 files (legitimate)
- **True Orphans**: 5 files (10.2%)

## Entry Point Coverage

67.3% of files are reachable from entry points, which is a healthy coverage for a library with multiple use cases.

## True Orphan Files

### 1. src/analyzer/ASTSymbolExtractor.ts

**Status**: ⚠️ Not exported from public API, but used in demo

**Details**:
- Symbols: 22
- Exported: 3 (ExtractedSymbol, ExtractionResult, ASTSymbolExtractor)
- Types: interface, class, property, method

**Usage**:
- Used in `demo/analyze-self.ts`
- Critical for AST-based symbol extraction

**Recommendation**:
✅ **Export from src/index.ts** if this is intended to be part of the public API.
```typescript
export { ASTSymbolExtractor } from './analyzer/ASTSymbolExtractor';
export type { ExtractedSymbol, ExtractionResult } from './analyzer/ASTSymbolExtractor';
```

---

### 2. src/analyzer/DependencyResolver.ts

**Status**: ⚠️ Not exported from public API, but used in demo

**Details**:
- Symbols: 9
- Exported: 2 (ImportInfo, DependencyResolver)
- Types: interface, class, property, method

**Usage**:
- Used in `demo/analyze-self.ts`
- Critical for resolving import dependencies

**Recommendation**:
✅ **Export from src/index.ts** if this is intended to be part of the public API.
```typescript
export { DependencyResolver } from './analyzer/DependencyResolver';
export type { ImportInfo } from './analyzer/DependencyResolver';
```

---

### 3. src/analyzer/DataFlowAnalyzer.ts

**Status**: ⚠️ Not exported from public API, used only in demo

**Details**:
- Symbols: 15
- Exported: 1 (DataFlowAnalyzer)
- Types: class, method

**Usage**:
- Used in `demo/analyze-data-flow.ts`
- Analyzes data flow patterns

**Recommendation**:
🤔 **Decision needed**: Is this intended to be public API?
- If YES → Export from src/index.ts
- If NO → Consider moving to demo/lib/ or mark as internal

---

### 4. src/scanner/FileScanner.ts

**Status**: ⚠️ Not exported from public API, used only in tests

**Details**:
- Symbols: 21
- Exported: 3 (ScannerConfig, ScanResult, FileScanner)
- Types: interface, class, property, method

**Usage**:
- Used in `src/__tests__/FileScanner.test.ts`
- Full codebase scanning functionality

**Recommendation**:
🤔 **Decision needed**: Is this intended to be public API?
- If YES → Export from src/index.ts
- If NO → Consider deprecating or moving to internal utilities

---

### 5. src/utils/index.ts

**Status**: ❌ True orphan - Not used anywhere

**Details**:
- Symbols: 4
- Exported: 4 functions
- Types: function

**Usage**:
- ❌ Not imported by any file
- Completely isolated

**Recommendation**:
🗑️ **Consider removing** if truly unused, or:
✅ **Export from src/index.ts** if these are utility functions for public use:
```typescript
export * from './utils';
```

**Functions in utils/index.ts:**
```bash
# Check what functions exist:
grep -E "^export (function|const)" src/utils/index.ts
```

---

## Type-Only Files (Legitimate)

These 11 files contain only type definitions and are legitimate:

1. src/types/analysis/quality.ts
2. src/types/config/config.ts
3. src/types/core/parse.ts
4. src/types/domain/data-flow.ts
5. src/types/domain/interface.ts
6. src/types/feature/feature.ts
7. src/types/graph/graph.ts
8. src/types/registry/registry.ts
9. src/types/state/comment.ts
10. src/types/statistics.ts
11. src/types/tags/base.ts
12. src/types/tags/enhanced.ts

These are already exported via `export type *` in src/index.ts.

---

## Recommendations Summary

### High Priority

1. **Export ASTSymbolExtractor and DependencyResolver** from src/index.ts
   - These are fundamental to the new AST-based analysis
   - Currently only accessible via demo

2. **Review utils/index.ts**
   - Determine if it's needed
   - If not, remove it
   - If yes, export from main index

### Medium Priority

3. **Clarify DataFlowAnalyzer's role**
   - Is it experimental? → Keep in demo
   - Is it production? → Export from index

4. **Clarify FileScanner's role**
   - If it's a public feature → Export it
   - If it's internal → Mark as such

---

## Analysis Method

This report was generated using:
1. AST-based symbol extraction (ASTSymbolExtractor)
2. Dependency resolution (DependencyResolver)
3. Entry point reachability analysis
4. Import graph traversal from entry points (index.ts, cli.ts)

**Tool**: `demo/find-orphans.ts`
**Command**: `npx ts-node demo/find-orphans.ts`
