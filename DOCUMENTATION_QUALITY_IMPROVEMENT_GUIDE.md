# Documentation Quality Improvement Guide

> **Complete step-by-step guide** for improving documentation quality in your TypeScript project using TSDoc Edge

**Target Audience**: Developers, Technical Writers, Project Maintainers
**Estimated Time**: 30 minutes to master
**Prerequisites**: TSDoc Edge installed, basic TypeScript knowledge

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Quality Improvement Workflow](#quality-improvement-workflow)
3. [Step-by-Step Guide](#step-by-step-guide)
4. [Common Issues & Solutions](#common-issues--solutions)
5. [Quality Metrics](#quality-metrics)
6. [Best Practices](#best-practices)
7. [Checklist](#checklist)

---

## Quick Start

### 30-Second Overview

```bash
# 1. Build symbol database
tsdoc-edge build src

# 2. Check current quality
tsdoc-edge health src

# 3. Find issues
tsdoc-edge undocumented
tsdoc-edge untested
tsdoc-edge orphans

# 4. Get suggestions
tsdoc-edge suggest src --limit=10

# 5. Auto-fix
tsdoc-edge fix src

# 6. Verify improvement
tsdoc-edge health src --compare
```

---

## Quality Improvement Workflow

### Complete Quality Improvement Cycle

```
┌─────────────────────────────────────────────────────────┐
│                    QUALITY CYCLE                         │
└─────────────────────────────────────────────────────────┘

1. INITIALIZE
   ├─ tsdoc-edge init
   └─ tsdoc-edge build src

2. ASSESS
   ├─ tsdoc-edge health src
   ├─ tsdoc-edge analyze src
   └─ tsdoc-edge stats --save

3. DETECT ISSUES
   ├─ tsdoc-edge undocumented
   ├─ tsdoc-edge untested
   ├─ tsdoc-edge orphans
   ├─ tsdoc-edge detect-dead-code
   ├─ tsdoc-edge without-responsibility
   └─ tsdoc-edge without-contract

4. GET CONTEXT (Before Fixing)
   ├─ tsdoc-edge work-context <file>
   └─ tsdoc-edge deps <symbol>

5. FIX ISSUES
   ├─ tsdoc-edge suggest src --limit=10
   ├─ tsdoc-edge fix src
   └─ Manual fixes (guided by suggestions)

6. VALIDATE IMPROVEMENTS
   ├─ tsdoc-edge validate src
   ├─ tsdoc-edge health src
   ├─ tsdoc-edge stats --compare
   └─ tsdoc-edge coverage-report

7. MAINTAIN QUALITY
   ├─ tsdoc-edge install-hook (pre-commit checks)
   └─ CI/CD integration
```

---

## Step-by-Step Guide

### Phase 1: Initialize & Assess

#### Step 1.1: Initialize Project

```bash
# Initialize TSDoc Edge configuration
tsdoc-edge init --name=my-project

# Creates .tsdoc.config.json with default settings
```

**Output**: `.tsdoc.config.json` created

**What This Does**:
- Sets up project configuration
- Defines paths for database, JSONL storage
- Configures validation rules

**Related Conventions**: N/A (setup only)

---

#### Step 1.2: Build Symbol Database

```bash
# Scan source files and build symbol database
tsdoc-edge build src

# For large projects (>500 files), use progress tracking
tsdoc-edge build src --verbose
```

**Output**:
```
✓ Scanned 156 files
✓ Extracted 1,427 symbols
✓ Detected 36,050+ relationships
✓ Saved to .tsdoc.db
```

**What This Does**:
- Parses all TypeScript files
- Extracts symbols (classes, functions, interfaces, etc.)
- Detects relationships (dependencies, calls, I/O flows)
- Builds queryable database

**Related Conventions**: All (foundation for validation)

---

#### Step 1.3: Assess Current Quality

```bash
# Overall health score (0-100)
tsdoc-edge health src

# Detailed analysis report
tsdoc-edge analyze src

# Project statistics
tsdoc-edge stats src --save
```

**Example Output**:
```
📊 Code Health Report
   Overall Score: 67/100 (Good)

   Documentation: 62.8% (98/156 symbols)
   Test Coverage: 45.2%
   Circular Dependencies: 0 ✓

   Issues Found:
   - Undocumented: 58 symbols
   - Untested: 85 symbols
   - Orphans: 12 symbols
```

**What This Does**:
- Calculates overall quality score
- Identifies documentation gaps
- Finds test coverage gaps
- Detects architectural issues

**Related Conventions**: CONV-02, CONV-03, CONV-04, CONV-05

---

### Phase 2: Detect Issues

#### Step 2.1: Find Undocumented Code

```bash
# All undocumented symbols
tsdoc-edge undocumented

# Only public API (most important)
tsdoc-edge undocumented --visibility=public

# Filter by type
tsdoc-edge undocumented --type=class
```

**Example Output**:
```
❌ Undocumented Symbols (58)

Public API (23):
  src/services/UserService.ts:45 - UserService
  src/utils/validation.ts:12 - validateEmail
  src/models/User.ts:8 - User

Internal (35):
  src/helpers/format.ts:22 - formatDate
  ...
```

**What This Does**:
- Scans all symbols for TSDoc comments
- Filters by visibility (public/private)
- Prioritizes public API

**Related Conventions**: CONV-02 (Summary required)

---

#### Step 2.2: Find Untested Code

```bash
# Symbols without test coverage
tsdoc-edge untested

# Only public API
tsdoc-edge untested --visibility=public

# With test coverage relationships
tsdoc-edge analyze-tests
```

**Example Output**:
```
🧪 Untested Symbols (85)

Critical (Public API):
  UserService - No tests found
  validateEmail - No tests found

Internal:
  formatDate - No tests found
  ...
```

**What This Does**:
- Identifies symbols without `@testedBy` tags
- Analyzes test coverage relationships
- Prioritizes public API

**Related Conventions**: N/A (quality metric)

---

#### Step 2.3: Find Orphaned Code

```bash
# Code that's never used
tsdoc-edge orphans

# Dead code detection (call graph based)
tsdoc-edge detect-dead-code

# Show dependency tree
tsdoc-edge deps <symbol-id>
```

**Example Output**:
```
🗑️ Orphaned Symbols (12)

  legacyParser - Never imported or called
  oldFormatter - Replaced by newFormatter
  ...

Suggested Actions:
  1. Delete if truly unused
  2. Add @deprecated if keeping for compatibility
  3. Check git history before removing
```

**What This Does**:
- Finds symbols never referenced
- Uses call graph for accurate detection
- Suggests cleanup actions

**Related Conventions**: N/A (cleanup)

---

#### Step 2.4: Find Missing Contracts

```bash
# Symbols without @responsibility tag
tsdoc-edge without-responsibility

# Symbols without contract specification
tsdoc-edge without-contract
```

**Example Output**:
```
📋 Missing Contracts (42)

Without @responsibility:
  UserService - No responsibility defined
  DataProcessor - No responsibility defined

Without @contract:
  validateUser - No pre/post conditions
  processPayment - No invariants defined
```

**What This Does**:
- Identifies missing @responsibility tags
- Finds functions without @precondition/@postcondition
- Highlights contract gaps

**Related Conventions**: CONV-06, CONV-07

---

### Phase 3: Get Context (Before Fixing)

#### Step 3.1: Work Context (Most Important!)

```bash
# Before modifying ANY file, get complete context
tsdoc-edge work-context src/services/UserService.ts
```

**Example Output**:
```
📚 Work Context: UserService.ts

Related Documents:
  ✓ [[User Management]] (managed/features/user-mgmt.md)
  ✓ [[Authentication System]] (managed/architecture/auth.md)

Dependent Types:
  → User (src/models/User.ts)
  → Database (src/core/Database.ts)
  → ValidationError (src/errors/ValidationError.ts)

Test Coverage:
  ✓ user.service.test.ts (87% coverage)
  ⚠ integration.test.ts (missing)

Impact Analysis (Who uses this):
  ← AuthController (3 methods)
  ← UserController (5 methods)
  ← AdminService (2 methods)

⚠ Warning: Changes will affect 3 modules!
```

**What This Does**:
- Shows related documentation
- Lists type dependencies
- Identifies test files
- Analyzes impact of changes
- **All analysis features exist to serve this command**

**Related Conventions**: All (complete context)

---

#### Step 3.2: Dependency Analysis

```bash
# What does this symbol depend on?
tsdoc-edge deps UserService

# Who uses this symbol?
tsdoc-edge used-by UserService
tsdoc-edge who-uses UserService

# Complete dependency tree
tsdoc-edge tree UserService

# Type dependency chain
tsdoc-edge type-chain UserDTO User
```

**What This Does**:
- Maps all dependencies
- Shows reverse dependencies
- Visualizes dependency trees
- Traces type chains

**Related Conventions**: N/A (context gathering)

---

### Phase 4: Fix Issues

#### Step 4.1: Get Automated Suggestions

```bash
# Get top 10 improvement suggestions
tsdoc-edge suggest src --limit=10

# For specific file
tsdoc-edge suggest src/services/UserService.ts

# Filter by issue type
tsdoc-edge suggest src --type=missing-params
```

**Example Output**:
```
💡 Improvement Suggestions

1. UserService.ts:45 - UserService (Priority: HIGH)
   Issue: Missing @public tag
   Suggestion: Add @public tag for public API

2. UserService.ts:67 - createUser (Priority: HIGH)
   Issue: Missing @param documentation
   Suggestion: Document 'userData' parameter

3. UserService.ts:67 - createUser (Priority: MEDIUM)
   Issue: Missing @returns documentation
   Suggestion: Document return type

Auto-fix available: 7/10 suggestions
Run: tsdoc-edge fix src/services/UserService.ts
```

**What This Does**:
- Analyzes code for documentation gaps
- Prioritizes issues
- Provides concrete fix suggestions
- Identifies auto-fixable issues

**Related Conventions**: All

---

#### Step 4.2: Auto-Fix Issues

```bash
# Dry run (preview changes)
tsdoc-edge fix src --dry-run

# Fix specific file
tsdoc-edge fix src/services/UserService.ts

# Fix entire directory
tsdoc-edge fix src

# Recursive improvement to target score
tsdoc-edge improve src --target-score=80
```

**Example Output**:
```
🔧 Auto-Fix Results

Fixed Issues:
  ✓ Added @public tag (3 symbols)
  ✓ Added @param tags (5 parameters)
  ✓ Added @returns tags (4 functions)
  ✓ Added blank line before tags (8 locations)

Manual Fixes Needed:
  ⚠ UserService.ts:67 - Add meaningful summary
  ⚠ validateEmail.ts:12 - Add @precondition for email format

Score Improvement: 67 → 78 (+11 points)
```

**What This Does**:
- Automatically adds missing tags
- Fixes formatting issues
- Generates template documentation
- Recursively improves to target score

**Related Conventions**: CONV-01, CONV-03, CONV-04, CONV-05

---

#### Step 4.3: Manual Fixes (Guided)

For issues that require human judgment:

1. **Missing Summaries** (CONV-02)
   ```typescript
   /**
    * TODO: Add meaningful summary  // ← Fix this
    *
    * @public
    * @param userData - User data object
    * @returns Created user
    */
   ```

   **Fix**:
   ```typescript
   /**
    * Creates a new user in the system with validation
    *
    * @public
    * @param userData - User data object
    * @returns Created user
    */
   ```

2. **Contract Specifications** (CONV-06, CONV-07)
   ```typescript
   /**
    * Validates and processes payment
    *
    * @param amount - Payment amount
    * @returns Payment result
    */
   ```

   **Fix**:
   ```typescript
   /**
    * Validates and processes payment
    *
    * @param amount - Payment amount
    * @returns Payment result
    *
    * @precondition amount > 0
    * @precondition User must be authenticated
    * @postcondition Payment record created
    * @postcondition User balance updated
    * @invariant Total balance consistency maintained
    */
   ```

**Related Conventions**: CONV-02, CONV-06, CONV-07

---

### Phase 5: Validate Improvements

#### Step 5.1: Run Validation

```bash
# TSDoc syntax validation
tsdoc-edge validate src

# Documentation validation
tsdoc-edge validate-docs managed

# Symbol reference validation
tsdoc-edge validate-symbol-refs managed

# Specification completeness
tsdoc-edge validate-spec managed
```

**Example Output**:
```
✓ Validation Passed

TSDoc Validation:
  ✓ 156/156 symbols valid
  ✓ 0 syntax errors

Documentation Validation:
  ✓ 0 broken references
  ✓ 0 duplicate definitions
  ✓ SSOT compliance: 100%

Specification Validation:
  ✓ 7/7 specs complete
  ✓ Average score: 92%
```

**What This Does**:
- Validates TSDoc syntax
- Checks symbol references
- Verifies SSOT compliance
- Measures spec completeness

**Related Conventions**: All

---

#### Step 5.2: Check Quality Metrics

```bash
# Compare before/after
tsdoc-edge stats src --compare

# New health score
tsdoc-edge health src

# Coverage report
tsdoc-edge coverage-report
```

**Example Output**:
```
📈 Improvement Summary

Before → After:
  Overall Score: 67 → 85 (+18) ✓
  Documentation: 62.8% → 94.2% (+31.4%) ✓
  Undocumented: 58 → 9 (-49) ✓

Coverage Report:
  @doc tag coverage: 94.2% (147/156 symbols)
  Test coverage: 68.5% (improved from 45.2%)

Grade: B → A
```

**What This Does**:
- Compares metrics before/after
- Calculates improvement delta
- Generates coverage report
- Assigns quality grade

**Related Conventions**: N/A (metrics)

---

### Phase 6: Maintain Quality

#### Step 6.1: Install Pre-commit Hook

```bash
# Install Git hook for automatic checks
tsdoc-edge install-hook
```

**What This Does**:
- Installs `.git/hooks/pre-commit`
- Runs validation before each commit
- Blocks commits with quality issues
- Configurable thresholds

**Configuration** (`.tsdoc.config.json`):
```json
{
  "preCommit": {
    "enabled": true,
    "threshold": 50,
    "warningThreshold": 30,
    "failOnMissing": false
  }
}
```

**Related Conventions**: All

---

#### Step 6.2: CI/CD Integration

```yaml
# .github/workflows/docs.yml
name: Documentation Quality

on: [push, pull_request]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Install Dependencies
        run: npm ci

      - name: Build Database
        run: npx tsdoc-edge build src

      - name: Quality Check
        run: |
          npx tsdoc-edge health src
          npx tsdoc-edge validate src
          npx tsdoc-edge coverage-report

      - name: Enforce Standards
        run: |
          UNDOC=$(npx tsdoc-edge undocumented --visibility=public | wc -l)
          if [ $UNDOC -gt 5 ]; then
            echo "❌ Too many undocumented public APIs: $UNDOC"
            exit 1
          fi
```

**Related Conventions**: All (automated enforcement)

---

## Common Issues & Solutions

### Issue 1: "Command not found: tsdoc-edge"

**Problem**: TSDoc Edge not installed or not in PATH

**Solution**:
```bash
# Global install
npm install -g tsdoc-edge

# Local install + npx
npm install tsdoc-edge
npx tsdoc-edge --help
```

---

### Issue 2: "No symbols found"

**Problem**: Database not built or outdated

**Solution**:
```bash
# Rebuild database
tsdoc-edge build src --force

# Check database status
ls -lh .tsdoc.db
```

---

### Issue 3: "Health score not improving"

**Problem**: Fixing wrong issues or missing manual fixes

**Solution**:
```bash
# 1. Identify root causes
tsdoc-edge analyze src

# 2. Prioritize public API
tsdoc-edge undocumented --visibility=public

# 3. Get specific suggestions
tsdoc-edge suggest src --limit=20

# 4. Focus on manual fixes
# Auto-fix handles only mechanical issues
# You must add meaningful summaries, contracts
```

---

### Issue 4: "Validation errors after fix"

**Problem**: Auto-fix created incomplete documentation

**Solution**:
```bash
# 1. Check validation errors
tsdoc-edge validate src --verbose

# 2. Review and complete documentation
# Auto-fix adds templates like "TODO: Add summary"
# You must replace with actual content

# 3. Re-validate
tsdoc-edge validate src
```

---

## Quality Metrics

### Understanding the Health Score (0-100)

```
Score = (Documentation × 0.4) +
        (Test Coverage × 0.3) +
        (Code Quality × 0.3)

Documentation:
  - Has TSDoc comment
  - Has summary
  - Has @public (if public)
  - Has @param (if function)
  - Has @returns (if function)
  - Has @responsibility (bonus)
  - Has @contract (bonus)

Test Coverage:
  - Has @testedBy tag
  - Test file exists
  - Coverage > 80%

Code Quality:
  - No orphaned symbols
  - No circular dependencies
  - No dead code
```

### Quality Grades

| Score | Grade | Status |
|-------|-------|--------|
| 90-100 | A | Excellent ✨ |
| 80-89 | B | Good ✓ |
| 70-79 | C | Fair ⚠ |
| 60-69 | D | Poor ❌ |
| 0-59 | F | Critical ❌❌ |

---

## Best Practices

### 1. Always Use `work-context` Before Editing

```bash
# NEVER edit a file without this first!
tsdoc-edge work-context <file-path>

# Understand:
# - Related docs
# - Dependencies
# - Impact
# - Tests
```

**Why**: Prevents breaking changes, ensures consistency

---

### 2. Prioritize Public API

```bash
# Focus on what users see
tsdoc-edge undocumented --visibility=public
tsdoc-edge suggest src --visibility=public
tsdoc-edge fix src --filter=public
```

**Why**: Public API documentation is most critical

---

### 3. Incremental Improvement

```bash
# Don't try to fix everything at once
# Use recursive improvement with realistic targets

# Week 1: Fix public API
tsdoc-edge improve src/services --target-score=70

# Week 2: Add contracts
tsdoc-edge without-contract | head -20

# Week 3: Add tests
tsdoc-edge untested --visibility=public
```

**Why**: Sustainable quality improvement

---

### 4. Commit Quality Snapshots

```bash
# Save baseline
tsdoc-edge stats src --save

# Make improvements
tsdoc-edge fix src

# Compare
tsdoc-edge stats src --compare

# Commit with metrics
git add .
git commit -m "docs: improve quality 67→85 (+18 points)"
```

**Why**: Track progress over time

---

### 5. Document Conventions in Your Project

```bash
# Create project-specific guide
# Reference TSDoc conventions
# Link to CLI commands

# Example: docs/CONTRIBUTING.md
## Documentation Standards
- Follow TSDoc conventions (see reference/tsdoc-conventions/)
- Run `tsdoc-edge validate` before committing
- Maintain health score > 80
```

**Why**: Onboard new contributors easily

---

## Checklist

### Daily Workflow

- [ ] `tsdoc-edge work-context <file>` before editing
- [ ] `tsdoc-edge validate src` before committing
- [ ] Check pre-commit hook results

### Weekly Review

- [ ] `tsdoc-edge health src` - track improvement
- [ ] `tsdoc-edge stats src --compare` - measure progress
- [ ] `tsdoc-edge undocumented --visibility=public` - prioritize fixes
- [ ] `tsdoc-edge orphans` - cleanup unused code

### Monthly Audit

- [ ] `tsdoc-edge analyze src` - comprehensive analysis
- [ ] `tsdoc-edge coverage-report` - SSOT coverage
- [ ] `tsdoc-edge validate-spec managed` - spec completeness
- [ ] Update quality targets based on progress

### Before Release

- [ ] Health score ≥ 80
- [ ] Public API 100% documented
- [ ] All validation passes
- [ ] CI/CD checks green

---

## Next Steps

1. **Read**: [TSDoc Conventions](reference/tsdoc-conventions/README.md)
2. **Read**: [Convention-Feature Mapping](CONVENTION_FEATURE_MAPPING.md)
3. **Practice**: Run through workflow on sample project
4. **Integrate**: Set up pre-commit hooks and CI/CD
5. **Maintain**: Establish regular quality review schedule

---

**Last Updated**: 2025-11-09
**Version**: 1.0.0
**Maintainer**: TSDoc Edge Team
