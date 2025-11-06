# Changelog

All notable changes to TSDoc Edge will be documented in this file.

## [0.12.0] - 2025-01-06

### Added - Type Chain Analysis System 🔥

**New Features:**
- **TypeChainTracer**: Complete type dependency chain analysis and visualization
  - `findChain()`: Find paths between two types with multiple path support
  - `buildDependencyTree()`: Build complete dependency trees from root types
  - `findRootTypes()`: Identify entry point types (no incoming dependencies)
  - `findLeafTypes()`: Identify leaf types (no outgoing dependencies)
  - `detectCircularDependencies()`: Detect and report circular type dependencies
  - Filter options: maxDepth, includeExternal, dependencyTypes, dataFlow, includePrimitives

**New CLI Commands:**
1. `type-chain <source> [target] [options]`
   - Visualize type dependency chains between types
   - Show complete dependency trees with `--tree` flag
   - Filter by depth, external types, primitives
   - Display relationship types (composition, extends, parameter, return)

2. `find-roots [options]`
   - Find root types (architectural entry points)
   - Display dependency counts for each root
   - Identify leaf types (terminal types)

3. `detect-cycles [options]`
   - Detect all circular type dependencies
   - Provide refactoring recommendations
   - Help identify architectural issues

**Best Practices:**
- Promotes explicit type reuse over implicit field duplication
- Encourages composition over duplication
- Provides architectural insights through type relationships

**Type Definitions:**
- Added `src/types/domain/type-chain.ts` with complete type chain types:
  - `TypeChain`, `TypeChainStep`, `TypeDependencyNode`
  - `TypeChainAnalysisResult`, `TypeChainOptions`

**Test Coverage:**
- 85 comprehensive tests (100% passing)
- Tests for all public methods
- Tests for all filter options
- Edge cases: cycles, deep chains, large graphs

**Documentation:**
- Updated README with Type Chain Tracer section
- Usage examples for all three commands
- Best practices for type architecture

### Improved

**Test Coverage Enhancement:**
- Total tests: 1,926 (from 1,453)
- Test suites: 85 (from 74)
- Coverage: 60% file coverage (from 31%)
- Health score: B (72/100, from C 62/100)

**New Test Suites:**
- `TypeChainTracer.test.ts`: 85 tests
- `CodeHealthChecker.test.ts`: 48 tests
- `TestCoverageAnalyzer.test.ts`: 46 tests
- `CoverageSyncAdapter.test.ts`: 40 tests
- `CoverageParser.test.ts`: 35 tests
- `DomainStructureAnalyzer.test.ts`: 27 tests
- `StatsHistoryManager.test.ts`: 35 tests
- `TrackableStatsCollector.test.ts`: 35 tests
- `Phase4Commands.test.ts`: 45 tests
- `Phase5Commands.test.ts`: 47 tests
- `Phase6Commands.test.ts`: 60 tests

**Bug Fixes:**
- Fixed `TestCoverageAnalyzer` path matching for `src/module/File.ts` → `src/__tests__/module/File.test.ts` pattern
- Fixed cycle detection algorithm in TypeChainTracer (string comparison bug)
- Fixed BaseCommand abstract method implementations in all command classes
- Fixed Jest configuration to exclude `src/types/` from test detection

### Performance

- Type chain analysis: O(V + E) graph traversal
- Cycle detection: Optimized DFS with memoization
- Handles 100+ type graphs efficiently

### API Changes

**New Exports:**
```typescript
export { TypeChainTracer } from './analyzer/TypeChainTracer';
export * from './types/domain/type-chain';
```

**New Commands:**
- `type-chain`: TypeChainCommand
- `find-roots`: FindRootTypesCommand
- `detect-cycles`: DetectCircularTypesCommand

---

## [0.11.1] - 2025-01-05

### Added - Separated Design/Implementation Scoring 🔥

**Specification Validation Enhancement:**
- Split spec completeness into two independent scores:
  - **Design Score** (0-100): Structure, scenarios, concept references
    - Can achieve 100% without any code
    - Supports design-first workflow
  - **Implementation Score** (0-100): Code references, examples
    - Measures code connectivity
    - Validates implementation completeness

**Score Calculation:**
```typescript
designScore =
  structure × 0.5 +           // 문서 구조 (50%)
  scenarios × 0.3 +           // 사용 시나리오 (30%)
  conceptReferences × 0.2     // [[Symbol]] 참조 (20%)

implementationScore =
  codeReferences × 0.7 +      // [^sym-XXX] 참조 (70%)
  examples × 0.3              // 코드 예시 (30%)
```

**Updated CLI Output:**
- `validate-spec` now shows both scores separately
- Color-coded score display (green/yellow/red)
- Clear breakdown of design vs implementation metrics

---

## [0.11.0] - 2025-01-04

### Added - Module Specification System

**7-Part Module Specification Framework:**
1. Purpose: Problem and existence reason
2. Input: Parameters, constraints, preconditions
3. Output: Return values, success/failure cases
4. Context: Dependencies, environment, requirements
5. Logic: Algorithm, internal operations
6. Effect: Side effects, external I/O
7. Scope: Public interface, exposed state

**New Commands:**
- `generate-docs`: Generate 7-part specifications for modules
- `validate-spec`: Validate specification completeness (0-100 score)
- `check-duplicates`: Detect duplicate content across specs
- `spec-status`: Manage specification lifecycle (draft/review/approved/active)
- `spec-history`: Track specification version history
- `spec-diff`: Compare specification versions
- `spec-bump`: Bump specification versions
- `find-unused-docs`: Detect unused/stale documents

---

## [0.10.0] - 2025-01-03

### Added - Enhanced Documentation System

**6-Category Documentation System:**
1. Problem Solving: What problem does this solve?
2. Functionality: What does this do?
3. Error Experiences: Known errors and solutions
4. Decisions: Architectural Decision Records (ADRs)
5. Dependencies: Why dependencies exist
6. Future Plans: Planned improvements (TODO tracking)

**New Commands:**
- `parse`: Extract enhanced docs from TSDoc comments
- `sync-coverage`: Sync Istanbul coverage to symbol metadata

**New Tags:**
- `@problem`, `@solves`, `@context`, `@functionality`
- `@errorExp`, `@decision`, `@rationale`, `@consequences`
- `@dependency`, `@plan`

---

## [0.9.0] - 2025-01-02

### Added - Command Modularization

**Complete CLI Refactoring:**
- Converted 45 commands to modular Command Pattern
- Each command in separate file with BaseCommand inheritance
- CommandRegistry for centralized command management
- Consistent error handling and output formatting

---

## [0.8.0] - 2025-01-01

### Added - Comprehensive CLI Tools

**45 CLI Commands:**
- Build, analyze, validate, health check
- Symbol exploration (deps, used-by, tree)
- Issue detection (orphans, undocumented, untested)
- Document management (index-docs, validate-docs, update-backlinks)
- Git integration (install-hook, pre-commit)

---

## [0.5.0] - 2024-12-30

### Added - Document Symbol System

**Wiki-Style Symbol References:**
- `[[SymbolName]]` for concept references
- `[^sym-XXX]` for code symbol footnotes
- Automatic backlink generation
- SSOT validation

---

## [0.4.0] - 2024-12-29

### Added - Configuration System

- `.tsdoc.config.json` support
- `init` command for project setup
- Customizable paths and validation rules

---

## [0.3.0] - 2024-12-28

### Added - Database Storage

- SQLite for fast symbol queries
- JSONL for Git-friendly versioning
- Hybrid storage strategy

---

## [0.2.0] - 2024-12-27

### Added - Enhanced Tags

- Custom TSDoc tags
- Contract specifications
- Responsibility tracking
- Test mapping

---

## [0.1.0] - 2024-12-26

### Added - Initial Release

- TSDoc parsing
- Convention validation
- Basic CLI commands
- Symbol registry
