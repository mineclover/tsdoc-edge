# Convention-Feature Mapping

> **Complete mapping** of TSDoc conventions to TSDoc Edge CLI commands and features

**Purpose**: Understand which CLI commands validate, enforce, or auto-fix each TSDoc convention
**Target Audience**: Developers, Quality Engineers, CI/CD Administrators
**Last Updated**: 2025-11-09

---

## Table of Contents

1. [Overview](#overview)
2. [Convention Mapping](#convention-mapping)
3. [Validation Commands](#validation-commands)
4. [Auto-Fix Commands](#auto-fix-commands)
5. [Enforcement Strategies](#enforcement-strategies)
6. [Integration Examples](#integration-examples)

---

## Overview

TSDoc Edge provides **7 core conventions** with corresponding CLI commands for **validation**, **auto-fixing**, and **enforcement**.

### Convention Categories

| Category | Conventions | Auto-Fixable | Commands |
|----------|-------------|--------------|----------|
| **MUST (Required)** | 5 | ✅ 4/5 | validate, fix |
| **SHOULD (Recommended)** | 2 | ❌ 0/2 | suggest, manual |

### Automation Matrix

| Convention | Detection | Auto-Fix | Manual | Validation |
|-----------|-----------|----------|--------|------------|
| CONV-01 | ✅ | ✅ | ❌ | validate |
| CONV-02 | ✅ | ⚠️ | ✅ | validate, undocumented |
| CONV-03 | ✅ | ✅ | ❌ | validate, undocumented |
| CONV-04 | ✅ | ✅ | ❌ | validate, suggest |
| CONV-05 | ✅ | ✅ | ❌ | validate, suggest |
| CONV-06 | ✅ | ❌ | ✅ | without-contract |
| CONV-07 | ✅ | ❌ | ✅ | without-contract |

**Legend**:
- ✅ Fully supported
- ⚠️ Partial (adds template only)
- ❌ Not supported

---

## Convention Mapping

### CONV-01: Blank Line Before Tags

**Convention**: Summary section과 태그 사이 빈 줄 필수

**Reference**: `reference/tsdoc-conventions/01-blank-line-before-tags.md`

#### ✅ Correct Example
```typescript
/**
 * Creates a new user in the system
 *                                    ← Blank line required
 * @param userData - User data object
 * @returns Created user
 */
```

#### ❌ Incorrect Example
```typescript
/**
 * Creates a new user in the system
 * @param userData - User data object  ← Missing blank line
 * @returns Created user
 */
```

#### CLI Commands

**Detection**:
```bash
tsdoc-edge validate src
# Output: ❌ Missing blank line before tags (12 locations)
```

**Auto-Fix**:
```bash
tsdoc-edge fix src
# ✓ Added blank line before tags (12 locations)
```

**Validation**:
```bash
tsdoc-edge validate src
# ✓ All TSDoc comments properly formatted
```

#### Features
- ✅ **Auto-fixable**: `fix` command adds blank lines automatically
- ✅ **Validation**: `validate` command detects violations
- ✅ **Pre-commit**: Blocked by Git hook if enabled

#### Configuration
```json
{
  "validation": {
    "requireBlankLineBeforeTags": true
  }
}
```

---

### CONV-02: Summary Required

**Convention**: Summary Section 필수

**Reference**: `reference/tsdoc-conventions/02-summary-required.md`

#### ✅ Correct Example
```typescript
/**
 * Creates a new user in the system with validation
 *
 * @param userData - User data object
 */
```

#### ❌ Incorrect Example
```typescript
/**
 * @param userData - User data object  ← Missing summary
 */
```

#### CLI Commands

**Detection**:
```bash
tsdoc-edge undocumented
# Output:
# ❌ Missing summary:
#    src/services/UserService.ts:45 - createUser
```

**Partial Auto-Fix**:
```bash
tsdoc-edge fix src
# ✓ Added template summary (TODO: Add meaningful summary)
# ⚠️ Manual edit required: Replace template with actual description
```

**Validation**:
```bash
tsdoc-edge validate src
# ❌ 12 symbols missing meaningful summary
# ⚠️ 5 symbols have template summary (TODO)
```

#### Features
- ⚠️ **Partially auto-fixable**: Adds template only, requires manual completion
- ✅ **Detection**: `undocumented` and `validate` commands
- ✅ **Suggestions**: `suggest` command provides guidance
- ⚠️ **Manual Required**: Must write meaningful summary

#### Manual Completion
```bash
# After auto-fix, edit files to replace:
# "TODO: Add meaningful summary"
# with actual description
```

#### Quality Impact
```bash
# Check improvement
tsdoc-edge health src

# Before: 67/100 (missing summaries)
# After auto-fix: 72/100 (templates added)
# After manual edit: 85/100 (meaningful summaries)
```

---

### CONV-03: Public API Tag Required

**Convention**: Public API는 @public 태그 필수

**Reference**: `reference/tsdoc-conventions/03-public-tag-required.md`

#### ✅ Correct Example
```typescript
/**
 * Creates a new user in the system
 *
 * @public
 * @param userData - User data object
 * @returns Created user
 */
export class UserService { ... }
```

#### ❌ Incorrect Example
```typescript
/**
 * Creates a new user in the system
 *
 * @param userData - User data object  ← Missing @public
 * @returns Created user
 */
export class UserService { ... }
```

#### CLI Commands

**Detection**:
```bash
# Find all undocumented public APIs
tsdoc-edge undocumented --visibility=public

# Output:
# ❌ Missing @public tag:
#    src/services/UserService.ts:45 - UserService (exported)
#    src/utils/validation.ts:12 - validateEmail (exported)
```

**Auto-Fix**:
```bash
tsdoc-edge fix src --filter=public
# ✓ Added @public tag (23 exported symbols)
```

**Validation**:
```bash
tsdoc-edge validate src --check-public
# ✓ All exported symbols have @public tag
```

#### Features
- ✅ **Fully auto-fixable**: Detects exports and adds @public
- ✅ **Smart detection**: Uses TypeScript AST to identify exported symbols
- ✅ **Priority filtering**: `--visibility=public` focuses on public API
- ✅ **Pre-commit enforcement**: Blocks commits without @public tags

#### Quality Impact
```bash
# Public API documentation rate
tsdoc-edge coverage-report --public-only

# Before: 45% (45/100 public symbols)
# After: 100% (100/100 public symbols) ✓
```

---

### CONV-04: Returns Tag Required

**Convention**: 함수는 @returns 태그 필수

**Reference**: `reference/tsdoc-conventions/04-returns-tag-required.md`

#### ✅ Correct Example
```typescript
/**
 * Creates a new user
 *
 * @param userData - User data
 * @returns Created user instance
 */
function createUser(userData: UserData): User { ... }
```

#### ❌ Incorrect Example
```typescript
/**
 * Creates a new user
 *
 * @param userData - User data
 */
function createUser(userData: UserData): User { ... }  ← Missing @returns
```

#### CLI Commands

**Detection**:
```bash
# Find functions missing @returns
tsdoc-edge suggest src --type=missing-returns

# Output:
# ❌ Missing @returns:
#    src/services/UserService.ts:67 - createUser
#    Suggestion: Add @returns tag with description of User return type
```

**Auto-Fix**:
```bash
tsdoc-edge fix src
# ✓ Added @returns tag (42 functions)
# ⚠️ Return descriptions may need refinement
```

**Validation**:
```bash
tsdoc-edge validate src --strict
# ✓ All non-void functions have @returns tag
```

#### Features
- ✅ **Fully auto-fixable**: Infers return type from TypeScript
- ✅ **Type-aware**: Skips void/undefined functions
- ✅ **Smart descriptions**: Generates basic description from type name
- ⚠️ **Manual refinement**: May need more detailed descriptions

#### Auto-Generated Examples
```typescript
// Auto-generated @returns descriptions:

@returns User                    // For return type: User
@returns Array of items          // For return type: Item[]
@returns Promise resolving to ID // For return type: Promise<string>
@returns True if valid           // For return type: boolean
```

---

### CONV-05: Parameter Documentation Required

**Convention**: 파라미터 문서화 필수

**Reference**: `reference/tsdoc-conventions/05-parameter-documentation.md`

#### ✅ Correct Example
```typescript
/**
 * Creates a new user
 *
 * @param userData - User registration data
 * @param options - Optional creation settings
 * @returns Created user instance
 */
function createUser(
  userData: UserData,
  options?: CreateOptions
): User { ... }
```

#### ❌ Incorrect Example
```typescript
/**
 * Creates a new user
 *
 * @returns Created user instance
 */
function createUser(userData: UserData, options?: CreateOptions): User { ... }
// ← Missing @param tags
```

#### CLI Commands

**Detection**:
```bash
# Find functions with undocumented parameters
tsdoc-edge suggest src --type=missing-params

# Output:
# ❌ Missing parameter docs:
#    src/services/UserService.ts:67 - createUser
#    Missing: @param userData
#    Missing: @param options
```

**Auto-Fix**:
```bash
tsdoc-edge fix src
# ✓ Added @param tags (85 parameters)
# ✓ Included type information
# ✓ Marked optional parameters
```

**Validation**:
```bash
tsdoc-edge validate src
# ✓ All parameters documented (347/347)
```

#### Features
- ✅ **Fully auto-fixable**: Extracts parameter names and types from TypeScript
- ✅ **Type-aware**: Includes type information in description
- ✅ **Optional handling**: Correctly marks optional parameters
- ✅ **Destructuring support**: Handles destructured parameters

#### Auto-Generated Examples
```typescript
// Auto-generated @param descriptions:

@param userData - UserData object              // For: userData: UserData
@param options - Optional CreateOptions        // For: options?: CreateOptions
@param id - User identifier (string)           // For: id: string
@param isActive - Boolean flag                 // For: isActive: boolean
@param items - Array of Item objects           // For: items: Item[]
```

---

### CONV-06: Precondition/Postcondition Recommended

**Convention**: @precondition, @postcondition 사용 권장

**Reference**: `reference/tsdoc-conventions/06-precondition-postcondition.md`

#### ✅ Correct Example
```typescript
/**
 * Processes a payment transaction
 *
 * @param amount - Payment amount in cents
 * @returns Payment confirmation
 *
 * @precondition amount > 0
 * @precondition User must be authenticated
 * @precondition Sufficient account balance
 * @postcondition Payment record created in database
 * @postcondition User balance updated
 * @postcondition Confirmation email sent
 */
function processPayment(amount: number): PaymentResult { ... }
```

#### ❌ Incorrect Example
```typescript
/**
 * Processes a payment transaction
 *
 * @param amount - Payment amount in cents
 * @returns Payment confirmation
 */
function processPayment(amount: number): PaymentResult { ... }
// ← Missing preconditions/postconditions
```

#### CLI Commands

**Detection**:
```bash
# Find functions without contract specifications
tsdoc-edge without-contract

# Output:
# ⚠️ Missing contract specifications:
#    src/services/PaymentService.ts:45 - processPayment
#    Suggestion: Add @precondition and @postcondition tags
```

**Suggestions**:
```bash
tsdoc-edge suggest src --type=contract

# Output:
# 💡 Contract suggestions:
#    processPayment: Consider documenting:
#    - Input validation preconditions
#    - State change postconditions
#    - Side effects (DB writes, emails, etc.)
```

**Validation**:
```bash
tsdoc-edge validate src --check-contracts

# Output:
# ⚠️ 42 public functions missing contract specifications
# ℹ️ Contracts are recommended but not required
```

#### Features
- ❌ **Not auto-fixable**: Requires domain knowledge
- ✅ **Detection**: `without-contract` command identifies gaps
- ✅ **Suggestions**: `suggest` provides guidance
- ✅ **Quality metric**: Tracked in health score (bonus points)

#### Manual Workflow
```bash
# 1. Identify functions needing contracts
tsdoc-edge without-contract | head -20

# 2. Prioritize critical functions
# - Payment processing
# - Authentication
# - Data validation
# - State mutations

# 3. Add contracts manually
# Focus on business logic, not simple getters/setters

# 4. Verify improvement
tsdoc-edge health src --compare
# Bonus points for contract documentation
```

#### Quality Impact
```bash
# Health score breakdown:
# Base score: 75/100
# + Contract documentation: +8 points
# Final score: 83/100

# Functions with contracts: 23/156 (15%)
# Critical functions with contracts: 18/20 (90%) ✓
```

---

### CONV-07: Contract Documentation Recommended

**Convention**: @contract 사용 권장

**Reference**: `reference/tsdoc-conventions/07-contract-documentation.md`

#### ✅ Correct Example
```typescript
/**
 * Validates user input data
 *
 * @param userData - User data to validate
 * @returns True if valid
 *
 * @contract
 * **Description**: Ensures user data meets all validation rules
 *
 * **Preconditions**:
 * - userData must be non-null object
 * - email field must be present
 * - password field must be present
 *
 * **Postconditions**:
 * - Returns true only if all validation passes
 * - Throws ValidationError if invalid
 * - Does not modify input data
 *
 * **Invariants**:
 * - Function is pure (no side effects)
 * - Same input always produces same output
 */
function validateUser(userData: UserData): boolean { ... }
```

#### ❌ Incorrect Example
```typescript
/**
 * Validates user input data
 *
 * @param userData - User data to validate
 * @returns True if valid
 */
function validateUser(userData: UserData): boolean { ... }
// ← Missing @contract specification
```

#### CLI Commands

**Detection**:
```bash
# Find functions without @contract tag
tsdoc-edge without-contract --type=missing-contract-tag

# Output:
# ⚠️ Missing @contract tag (recommended for complex functions):
#    src/validators/UserValidator.ts:23 - validateUser
#    src/services/PaymentService.ts:45 - processPayment
#    src/core/AuthService.ts:67 - authenticate
```

**Suggestions**:
```bash
tsdoc-edge suggest src --type=contract --complexity=high

# Output:
# 💡 Contract documentation recommended:
#
# validateUser (complexity: high, cyclomatic: 12)
#   Reason: Complex validation logic
#   Suggestion: Document contract with:
#   - Input validation rules
#   - Error conditions
#   - Purity guarantees
#
# processPayment (complexity: high, side-effects: 3)
#   Reason: Multiple side effects detected
#   Suggestion: Document contract with:
#   - State changes
#   - Database writes
#   - External API calls
```

**Validation**:
```bash
tsdoc-edge validate src --check-contracts --strict

# Output:
# ⚠️ Contract gaps detected:
#    12 high-complexity functions missing @contract
#    8 functions with side effects missing contract
#
# Recommended Actions:
#    1. Add @contract to validateUser (cyclomatic: 12)
#    2. Add @contract to processPayment (side-effects: DB, Email, API)
#    3. Add @contract to authenticate (security-critical)
```

#### Features
- ❌ **Not auto-fixable**: Requires deep understanding of business logic
- ✅ **Smart detection**: Identifies candidates by complexity and side effects
- ✅ **Guidance**: Provides specific suggestions for what to document
- ✅ **Quality tracking**: Premium quality indicator in health score

#### Contract Template

**Use this template for @contract documentation**:
```typescript
/**
 * @contract
 * **Description**: [One-line summary of contract]
 *
 * **Preconditions**:
 * - [Input validation rule 1]
 * - [Input validation rule 2]
 * - [State requirement]
 *
 * **Postconditions**:
 * - [Output guarantee 1]
 * - [State change 1]
 * - [Side effect 1]
 *
 * **Invariants**:
 * - [Invariant condition 1]
 * - [Invariant condition 2]
 *
 * **Exceptions**:
 * - [ErrorType]: [Condition that triggers this error]
 */
```

#### When to Add @contract

**Required** for:
- ✅ Payment processing
- ✅ Authentication/authorization
- ✅ Data validation (complex rules)
- ✅ Database transactions
- ✅ External API calls
- ✅ State machines
- ✅ Cryptographic operations

**Optional** for:
- ⚠️ Simple getters/setters
- ⚠️ Pure utility functions (low complexity)
- ⚠️ Well-typed functions with no side effects

#### Quality Impact
```bash
# Premium quality indicator:
# Functions with @contract: 18/156 (12%)
# Critical functions with @contract: 18/20 (90%) ✓

# Health score boost:
# Base: 78/100
# + @precondition/@postcondition: +5 points
# + @contract: +8 points
# Final: 91/100 (Grade: A-)
```

---

## Validation Commands

### Complete Validation Stack

```bash
# 1. TSDoc Syntax Validation
tsdoc-edge validate src
# Checks: CONV-01, CONV-02, CONV-03, CONV-04, CONV-05

# 2. Documentation Completeness
tsdoc-edge undocumented
tsdoc-edge undocumented --visibility=public
# Checks: CONV-02, CONV-03

# 3. Contract Validation
tsdoc-edge without-contract
# Checks: CONV-06, CONV-07

# 4. Symbol Reference Validation
tsdoc-edge validate-symbol-refs managed
# Checks: SSOT compliance, broken references

# 5. Specification Validation
tsdoc-edge validate-spec managed
# Checks: Spec completeness, required sections

# 6. Overall Health
tsdoc-edge health src
# Aggregates all checks into 0-100 score
```

### Validation Levels

#### Level 1: Basic (Default)
```bash
tsdoc-edge validate src
# Checks: Syntax, required tags
```

#### Level 2: Strict
```bash
tsdoc-edge validate src --strict
# Checks: Basic + parameter descriptions quality
```

#### Level 3: Comprehensive
```bash
tsdoc-edge analyze src
# Checks: All validations + quality metrics + recommendations
```

---

## Auto-Fix Commands

### Fixable Conventions

| Convention | Fix Command | Success Rate |
|-----------|-------------|--------------|
| CONV-01 | `fix` | 100% ✓ |
| CONV-02 | `fix` (template) | 80% (needs manual) |
| CONV-03 | `fix --filter=public` | 100% ✓ |
| CONV-04 | `fix` | 95% ✓ |
| CONV-05 | `fix` | 98% ✓ |
| CONV-06 | Manual | N/A |
| CONV-07 | Manual | N/A |

### Auto-Fix Workflow

```bash
# 1. Preview changes (dry run)
tsdoc-edge fix src --dry-run

# 2. Apply auto-fixes
tsdoc-edge fix src

# 3. Review generated templates
grep -r "TODO: Add" src/

# 4. Complete manual fixes
# Edit files to replace TODOs with actual content

# 5. Validate
tsdoc-edge validate src

# 6. Measure improvement
tsdoc-edge stats src --compare
```

### Recursive Improvement

```bash
# Iteratively improve to target score
tsdoc-edge improve src --target-score=85

# Process:
# 1. Auto-fix all fixable issues
# 2. Check score
# 3. Suggest next fixes
# 4. Repeat until target reached or manual fixes needed
```

---

## Enforcement Strategies

### Strategy 1: Pre-commit Hook (Recommended)

```bash
# Install hook
tsdoc-edge install-hook

# Configure thresholds (.tsdoc.config.json)
{
  "preCommit": {
    "enabled": true,
    "threshold": 50,           // Block if score < 50
    "warningThreshold": 30,    // Warn if score < 30
    "failOnMissing": false,    // Don't fail on missing docs
    "checkPublicOnly": true    // Only check public API
  }
}
```

**What Gets Blocked**:
- ❌ Missing @public on exported symbols (CONV-03)
- ❌ Missing @returns on public functions (CONV-04)
- ❌ Missing @param on public functions (CONV-05)
- ❌ Health score < threshold

**What Gets Warned**:
- ⚠️ Missing blank lines (CONV-01) - auto-fixable
- ⚠️ Template summaries (CONV-02) - needs manual
- ⚠️ Missing contracts (CONV-06, CONV-07) - optional

---

### Strategy 2: CI/CD Pipeline

```yaml
# .github/workflows/quality.yml
name: Documentation Quality

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci

      - name: Build Database
        run: npx tsdoc-edge build src

      # Check CONV-01, 02, 03, 04, 05
      - name: Validate TSDoc
        run: npx tsdoc-edge validate src --strict

      # Check CONV-03 (public API)
      - name: Check Public API Coverage
        run: |
          UNDOC=$(npx tsdoc-edge undocumented --visibility=public | wc -l)
          if [ $UNDOC -gt 0 ]; then
            echo "❌ $UNDOC undocumented public APIs"
            exit 1
          fi

      # Check CONV-06, 07 (contracts - warning only)
      - name: Check Contracts (Warning)
        run: |
          npx tsdoc-edge without-contract
        continue-on-error: true

      # Overall health (CONV-01 through 07)
      - name: Health Check
        run: |
          SCORE=$(npx tsdoc-edge health src --json | jq .score)
          if [ $SCORE -lt 80 ]; then
            echo "❌ Health score too low: $SCORE/100"
            exit 1
          fi
```

**Enforcement Levels**:
- **BLOCK**: CONV-01, 03, 04, 05 (auto-fixable)
- **WARN**: CONV-02 (template summaries)
- **INFO**: CONV-06, 07 (contracts - recommended)

---

### Strategy 3: Pull Request Bot

```yaml
# .github/workflows/pr-comment.yml
name: PR Documentation Report

on: pull_request

jobs:
  comment:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx tsdoc-edge build src

      - name: Generate Report
        id: report
        run: |
          npx tsdoc-edge health src --json > health.json
          npx tsdoc-edge stats src --json > stats.json

      - name: Post Comment
        uses: actions/github-script@v6
        with:
          script: |
            const health = require('./health.json');
            const stats = require('./stats.json');

            const body = `
            ## 📊 Documentation Quality Report

            **Health Score**: ${health.score}/100 (${health.grade})

            **Convention Compliance**:
            - ✅ CONV-01 (Blank lines): ${health.conv01}%
            - ✅ CONV-02 (Summaries): ${health.conv02}%
            - ✅ CONV-03 (@public): ${health.conv03}%
            - ✅ CONV-04 (@returns): ${health.conv04}%
            - ✅ CONV-05 (@param): ${health.conv05}%
            - ⚠️ CONV-06 (Contracts): ${health.conv06}%
            - ⚠️ CONV-07 (@contract): ${health.conv07}%

            **Actions Needed**:
            ${health.suggestions.join('\n')}
            `;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

---

## Integration Examples

### Example 1: New Project Setup

```bash
# 1. Initialize
tsdoc-edge init --name=new-project

# 2. Build database
tsdoc-edge build src

# 3. Check baseline
tsdoc-edge health src --save
# Score: 45/100 (Many violations)

# 4. Auto-fix everything possible (CONV-01, 03, 04, 05)
tsdoc-edge fix src
# Score: 68/100 (+23 points)

# 5. Complete manual fixes (CONV-02)
# Replace "TODO: Add summary" with actual descriptions
# Score: 78/100 (+10 points)

# 6. Add contracts for critical functions (CONV-06, 07)
tsdoc-edge without-contract --complexity=high
# Manually add 12 contracts
# Score: 85/100 (+7 points)

# 7. Enable pre-commit hook
tsdoc-edge install-hook

# 8. Verify
tsdoc-edge validate src
# ✓ All conventions satisfied
```

---

### Example 2: Legacy Project Improvement

```bash
# Incremental improvement over 4 weeks

# Week 1: Public API only
tsdoc-edge undocumented --visibility=public
tsdoc-edge fix src --filter=public
# Public API: 100% documented ✓

# Week 2: Core services
tsdoc-edge fix src/services
tsdoc-edge improve src/services --target-score=75

# Week 3: Utilities and helpers
tsdoc-edge fix src/utils
tsdoc-edge fix src/helpers

# Week 4: Add contracts to critical functions
tsdoc-edge without-contract --filter=payment,auth,validation
# Manually add contracts

# Final score: 45 → 82 (+37 points)
```

---

### Example 3: PR Review Workflow

```bash
# Before approving PR:

# 1. Check modified files only
git diff --name-only main | xargs tsdoc-edge validate

# 2. Verify public API compliance
git diff --name-only main | \
  xargs tsdoc-edge undocumented --visibility=public

# 3. Check health delta
tsdoc-edge stats src --compare

# 4. Block PR if:
# - Public API undocumented
# - Health score decreased
# - Conventions violated
```

---

## Summary Table

### Convention Quick Reference

| ID | Convention | Auto-Fix | Command | Required | Impact |
|----|-----------|----------|---------|----------|--------|
| **CONV-01** | Blank line before tags | ✅ Yes | `fix` | Must | Low (formatting) |
| **CONV-02** | Summary required | ⚠️ Template | `fix` | Must | High (readability) |
| **CONV-03** | @public tag | ✅ Yes | `fix --filter=public` | Must | High (API docs) |
| **CONV-04** | @returns tag | ✅ Yes | `fix` | Must | Medium (clarity) |
| **CONV-05** | @param docs | ✅ Yes | `fix` | Must | Medium (clarity) |
| **CONV-06** | Pre/postconditions | ❌ No | Manual | Should | High (contracts) |
| **CONV-07** | @contract tag | ❌ No | Manual | Should | Very High (quality) |

### Command Quick Reference

| Task | Command | Checks |
|------|---------|--------|
| Validate all | `validate src` | CONV-01,02,03,04,05 |
| Find undocumented | `undocumented` | CONV-02,03 |
| Find missing contracts | `without-contract` | CONV-06,07 |
| Auto-fix | `fix src` | CONV-01,03,04,05 |
| Get suggestions | `suggest src` | All |
| Check health | `health src` | All + metrics |
| Install hook | `install-hook` | Enforcement |

---

## Next Steps

1. **Read**: [Documentation Quality Improvement Guide](DOCUMENTATION_QUALITY_IMPROVEMENT_GUIDE.md)
2. **Practice**: Run through examples on your project
3. **Configure**: Set up pre-commit hooks and CI/CD
4. **Customize**: Adjust thresholds based on project needs
5. **Monitor**: Track quality metrics over time

---

**Last Updated**: 2025-11-09
**Version**: 1.0.0
**Maintainer**: TSDoc Edge Team
