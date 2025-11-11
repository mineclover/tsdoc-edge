# [[SSOT]]

**Acronym**: Single Source of Truth

## Purpose

Enforce exactly one canonical definition for each symbol across documentation and code to prevent inconsistency, duplication, and conflicting information.

## Principle

**Core Rule**: For any concept, class, function, or documentation symbol, there must be **exactly one** authoritative primary definition.

```
One Symbol = One Primary Definition = One Source of Truth
```

## Application in TSDoc Edge

### 1. Documentation Symbols

**Three-Tier Notation**:
```markdown
# [[Symbol]]        # H1: Primary (SSOT) - exactly ONE per symbol
## [[Symbol]]       # H2+: Auxiliary (context-specific) - multiple allowed
[[Symbol]]          # Inline: Reference - unlimited
```

**Enforcement**:
- [[DocumentSymbolRegistry]]: Validates exactly one H1 per symbol
- [[ValidateSymbolRefsCommand]]: Detects duplicate H1 definitions
- [[SymbolFixCommand]]: Auto-converts duplicates to H2 auxiliaries

**Example Violation**:
```markdown
# File 1: managed/commands/BuildCommand.md
# [[BuildCommand]]  ← Primary #1 (VALID)

# File 2: managed/COMMANDS.md
# [[BuildCommand]]  ← Primary #2 (VIOLATION: Duplicate H1)
```

**Resolution**:
```markdown
# File 2: managed/COMMANDS.md (after fix)
## [[BuildCommand]]  ← Auxiliary (context-specific explanation)
```

### 2. Code Symbols

**@doc Tag Linking**:
```typescript
/**
 * Build TypeScript project with symbol extraction
 * @doc [[BuildCommand]]
 */
export class BuildCommand extends BaseCommand {
  // Implementation
}
```

**SSOT Flow**:
```
Code Symbol → @doc tag → Documentation Symbol (H1) → SSOT
```

**Validation**:
- Every `@doc` tag must point to exactly one H1 primary definition
- [[CoverageReportCommand]]: Measures SSOT coverage percentage

### 3. Database Schema

**Symbol Table**:
```sql
CREATE TABLE symbols (
  symbol_id TEXT PRIMARY KEY,  -- Unique identifier (SSOT)
  name TEXT UNIQUE,             -- One name per symbol
  file_path TEXT,               -- Canonical source file
  definition_type TEXT          -- 'primary' for SSOT
);
```

**Constraint**: `UNIQUE(name, definition_type='primary')` ensures one SSOT per symbol.

## Benefits

### 1. Consistency

**Problem Without SSOT**:
```
File A: BuildCommand builds TypeScript projects
File B: BuildCommand compiles source code
File C: BuildCommand analyzes dependencies
```
→ Which is correct? Conflicting definitions create confusion.

**With SSOT**:
```
managed/commands/BuildCommand.md (PRIMARY):
  BuildCommand builds TypeScript projects and extracts symbols

Other files reference [[BuildCommand]] without redefining
```
→ Single authoritative definition.

### 2. Refactoring Safety

When renaming a symbol:
```bash
# 1. Update SSOT (primary definition)
# 2. All references automatically point to new name
# 3. No orphaned or conflicting definitions
```

**Without SSOT**: Must hunt down and update all duplicates → easy to miss some.

### 3. Documentation Quality

**Metrics**:
```bash
tsdoc-edge coverage-report --hierarchical
# Output:
#   Total symbols: 1,511
#   Documented (SSOT): 1,511 (100%)
#   Coverage: 100.0%
```

**SSOT Coverage** = (Symbols with primary H1) / (Total symbols)

### 4. Trust

Developers can trust that:
- Primary definition is the official specification
- Auxiliary definitions don't contradict the primary
- References always resolve to authoritative source

## SSOT Validation

### Validation Rules

| Rule | Check | Violation | Fix |
|------|-------|-----------|-----|
| **R1: Unique Primary** | Max 1 H1 per symbol | Duplicate H1s | Convert duplicate to H2 |
| **R2: Primary Exists** | Every reference has H1 | Missing primary | Create H1 definition |
| **R3: Auxiliary Anchored** | Every H2 has H1 | Orphaned H2 | Create H1 or convert to inline |
| **R4: Code-Doc Link** | @doc points to H1 | Broken @doc tag | Update or create H1 |

### Validation Workflow

```bash
# 1. Detect violations
tsdoc-edge validate-symbol-refs managed

# 2. Preview auto-fixes
tsdoc-edge symbol-fix managed --dry-run

# 3. Apply fixes
tsdoc-edge symbol-fix managed --yes

# 4. Verify SSOT compliance
tsdoc-edge coverage-report --hierarchical
```

## Implementation

### Components

| Component | Purpose | SSOT Role |
|-----------|---------|-----------|
| [[DocumentSymbolRegistry]] | Symbol registry | Enforces unique H1 |
| [[ValidateSymbolRefsCommand]] | Validation | Detects duplicates |
| [[SymbolFixCommand]] | Auto-repair | Converts duplicates to H2 |
| [[CoverageReportCommand]] | Metrics | Measures SSOT coverage |
| [[SSOTCompletenessCalculator]] | Analysis | Calculates completeness score |

### Detection Algorithm

```typescript
// Pseudocode: SSOT validation
function validateSSOT(symbols: Symbol[]): Violation[] {
  const violations: Violation[] = [];
  const primaryMap = new Map<string, string[]>(); // symbol → files

  for (const symbol of symbols) {
    if (symbol.type === 'primary') {
      if (!primaryMap.has(symbol.name)) {
        primaryMap.set(symbol.name, []);
      }
      primaryMap.get(symbol.name).push(symbol.file);
    }
  }

  // Check for duplicates
  for (const [name, files] of primaryMap) {
    if (files.length > 1) {
      violations.push({
        type: 'duplicate_primary',
        symbol: name,
        files: files,
        fix: `Convert duplicates in ${files.slice(1)} to H2 auxiliary`
      });
    }
  }

  return violations;
}
```

## Examples

### Example 1: Duplicate Detection

**Before**:
```
managed/commands/BuildCommand.md:1
  # [[BuildCommand]]  ← Primary #1

managed/README.md:45
  # [[BuildCommand]]  ← Primary #2 (DUPLICATE)
```

**Validation Output**:
```
❌ Duplicate H1 definition for [[BuildCommand]]:
  1. managed/commands/BuildCommand.md:1 (CANONICAL)
  2. managed/README.md:45 (DUPLICATE)

💡 Fix: Convert managed/README.md:45 to H2 auxiliary
```

**After Fix**:
```
managed/README.md:45
  ## [[BuildCommand]]  ← Auxiliary (context-specific)
```

### Example 2: Coverage Measurement

```bash
$ tsdoc-edge coverage-report --hierarchical

Overall Coverage
────────────────────────────────────────────────────────────────
  Total symbols: 1,511
  Documented (SSOT): 1,511
  Coverage: 100.0%

✅ All symbols have exactly one primary definition (SSOT compliant)
```

## Configuration

```json
{
  "ssot": {
    "enforceUniqueH1": true,
    "requirePrimaryForReferences": true,
    "autoFixDuplicates": false,
    "coverageThreshold": 95.0
  }
}
```

## Related

- [[Symbol Reference System]]: Three-tier notation system
- [[Document Symbol System]]: Implementation of SSOT for docs
- [[DocumentSymbolRegistry]]: SSOT enforcement engine
- [[SSOTCompletenessCalculator]]: SSOT coverage calculation
- [[ValidateSymbolRefsCommand]]: SSOT validation command

## See Also

- Single Source of Truth principle
- Canonical source concept
- Documentation consistency patterns
- Symbol reference validation

---

## Backlinks

### Referenced By

- [[MissingLinkDetector]] → /home/user/tsdoc-edge/managed/analyzers/MissingLinkDetector.md:22
- [[MissingLinkDetector]] → /home/user/tsdoc-edge/managed/analyzers/MissingLinkDetector.md:31
- [[PreCommitChecker]] → /home/user/tsdoc-edge/managed/analyzers/PreCommitChecker.md:22
- [[PreCommitChecker]] → /home/user/tsdoc-edge/managed/analyzers/PreCommitChecker.md:32
- [[SSOTCompletenessCalculator]] → /home/user/tsdoc-edge/managed/analyzers/SSOTCompletenessCalculator.md:22
- [[SSOTCompletenessCalculator]] → /home/user/tsdoc-edge/managed/analyzers/SSOTCompletenessCalculator.md:30
- [[SSOTCompletenessCalculator]] → /home/user/tsdoc-edge/managed/analyzers/SSOTCompletenessCalculator.md:31
- [[SSOTCompletenessCalculator]] → /home/user/tsdoc-edge/managed/analyzers/SSOTCompletenessCalculator.md:32
- [[CoverageReportCommand]] → /home/user/tsdoc-edge/managed/commands/CoverageReportCommand.md:135
- [[CoverageReportCommand]] → /home/user/tsdoc-edge/managed/commands/CoverageReportCommand.md:136
- [[Phase8Commands]] → /home/user/tsdoc-edge/managed/commands/Phase8Commands.md:21
- [[Phase8Commands]] → /home/user/tsdoc-edge/managed/commands/Phase8Commands.md:30
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:224
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:225
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:37
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:38
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:39
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:57
- [[WorkContextCommand]] → /home/user/tsdoc-edge/managed/commands/WorkContextCommand.md:72
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:175
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:221
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:236
- [[Symbol Reference System]] → /home/user/tsdoc-edge/managed/concepts/symbol-reference-system.md:180
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:171
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:172
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:173

