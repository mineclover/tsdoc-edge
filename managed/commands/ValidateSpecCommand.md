# [[ValidateSpecCommand]]

**Source**: `src/commands/Phase4Commands.ts:349`

## Purpose

Validate specification completeness across documentation files by measuring design and implementation scores using the [[Module Specification Framework]].

## Usage

```bash
tsdoc-edge validate-spec [docs-dir]
```

### Arguments

- `docs-dir`: Documentation directory to validate (default: `managed`)

## Examples

### Basic Validation

```bash
$ tsdoc-edge validate-spec managed

================================================================================
Validating Specification Completeness
================================================================================

Summary
────────────────────────────────────────────────────────────────
Total specifications: 156
Complete: 142
Incomplete: 14

Score Breakdown:
  Design Score:         87%
  Implementation Score: 79%
  Total issues: 45

Complete Specifications
────────────────────────────────────────────────────────────────
✅ BuildCommand.md
   Design: 95%  Implementation: 90%
✅ SymbolQueryCommand.md
   Design: 92%  Implementation: 88%
... and 140 more

Incomplete Specifications
────────────────────────────────────────────────────────────────
⚠️  DeprecatedCommand.md
   Design: 45%  Implementation: 30%
⚠️  ExperimentalFeature.md
   Design: 60%  Implementation: 50%
... and 12 more
```

### Specific Directory

```bash
tsdoc-edge validate-spec managed/commands
```

## Specification Completeness

### Module Specification Framework

Validates documentation against the 7-aspect framework:

```markdown
1. Purpose   - Why does this exist?
2. Input     - What does it accept?
3. Output    - What does it produce?
4. Context   - What does it depend on?
5. Logic     - How does it work?
6. Effect    - What side effects?
7. Scope     - What's its public interface?
```

### Scoring System

**Design Score** (0-100%):
- Purpose section present: 20%
- Responsibility defined: 15%
- Problem/Solution sections: 15%
- Use cases documented: 15%
- Examples provided: 15%
- Integration documented: 10%
- Configuration explained: 10%

**Implementation Score** (0-100%):
- Input/Parameters documented: 20%
- Output/Return values documented: 20%
- Logic/Algorithm explained: 20%
- Side effects documented: 15%
- Error handling described: 15%
- Performance considerations: 10%

**Overall Completeness**: Both scores ≥ 70%

### Color Coding

- **Green (≥80%)**: Complete and well-documented
- **Yellow (60-79%)**: Adequate but needs improvement
- **Red (<60%)**: Incomplete, requires documentation

## Validation Rules

### Complete Specification

```markdown
# SymbolName

## Purpose
Clear explanation of why this exists...

## Input
Parameters and constraints...

## Output
Return values and results...

## Context
Dependencies and integration...

## Logic
Algorithm and implementation...

## Effect
Side effects and state changes...

## Scope
Public API and interfaces...
```

**Result**: ✅ Complete (Design: 95%, Implementation: 90%)

### Incomplete Specification

```markdown
# SymbolName

## Purpose
Vague description...

(Missing Input, Output, Logic sections)
```

**Result**: ⚠️ Incomplete (Design: 40%, Implementation: 25%)

## Report Structure

### Summary Section

Shows aggregate metrics:
- Total specifications analyzed
- Complete vs incomplete count
- Average design score
- Average implementation score
- Total issues across all specs

### Complete Specifications

Lists well-documented modules:
- File name
- Design score (green if ≥80%)
- Implementation score (green if ≥80%)
- Shows top 5, indicates if more exist

### Incomplete Specifications

Lists modules needing work:
- File name
- Design score (red/yellow if <80%)
- Implementation score (red/yellow if <80%)
- Shows top 5, indicates if more exist

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All specifications complete (≥70% both scores) |
| 1 | One or more incomplete specifications |
| 2 | Path not found or validation error |

## Integration

### CI/CD Pipeline

```yaml
# .github/workflows/docs-quality.yml
name: Documentation Quality

on: [push, pull_request]

jobs:
  validate-specs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm install
      - name: Validate specifications
        run: tsdoc-edge validate-spec managed
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Validate specification completeness
tsdoc-edge validate-spec managed || {
  echo "❌ Specification validation failed"
  echo "Fix incomplete specifications before committing"
  exit 1
}
```

### Quality Gates

```bash
# scripts/quality-gate.sh

# Run validation
tsdoc-edge validate-spec managed > validation.txt 2>&1

# Check for incomplete specs
if grep -q "Incomplete: [1-9]" validation.txt; then
  echo "❌ Found incomplete specifications"
  cat validation.txt
  exit 1
fi

echo "✅ All specifications complete"
```

## Implementation Details

### Validation Algorithm

```typescript
// Pseudocode
function validateSpec(filePath: string): ValidationResult {
  const content = readFile(filePath);
  const sections = parseMarkdown(content);

  // Design score (0-100)
  const designScore = calculateDesignScore({
    hasPurpose: sections.has('Purpose'),
    hasResponsibility: sections.has('Responsibility'),
    hasProblemSolution: sections.has('Problem') && sections.has('Solution'),
    hasUseCases: sections.has('Usage') || sections.has('Examples'),
    hasExamples: sections.has('Examples'),
    hasIntegration: sections.has('Integration'),
    hasConfiguration: sections.has('Configuration')
  });

  // Implementation score (0-100)
  const implScore = calculateImplementationScore({
    hasInput: sections.has('Input') || sections.has('Parameters'),
    hasOutput: sections.has('Output') || sections.has('Returns'),
    hasLogic: sections.has('Logic') || sections.has('Algorithm'),
    hasEffect: sections.has('Effect') || sections.has('Side Effects'),
    hasErrorHandling: sections.has('Error Handling'),
    hasPerformance: sections.has('Performance')
  });

  return {
    filePath,
    designScore,
    implementationScore,
    isComplete: designScore >= 70 && implScore >= 70
  };
}
```

### Score Calculation

```typescript
function calculateDesignScore(sections: DesignSections): number {
  let score = 0;
  if (sections.hasPurpose) score += 20;
  if (sections.hasResponsibility) score += 15;
  if (sections.hasProblemSolution) score += 15;
  if (sections.hasUseCases) score += 15;
  if (sections.hasExamples) score += 15;
  if (sections.hasIntegration) score += 10;
  if (sections.hasConfiguration) score += 10;
  return score;
}
```

## Validator Component

Uses [[SpecCompletenessValidator]] for actual validation:

```typescript
const validator = new SpecCompletenessValidator();
const results = validator.validateMultiple(markdownFiles);
const summary = validator.getSummary(results);
```

## Related Commands

- [[ValidateDocsCommand]]: General documentation validation
- [[ValidateSymbolRefsCommand]]: Symbol reference validation
- [[HealthCommand]]: Overall project health check
- [[CoverageReportCommand]]: Documentation coverage metrics

## Related Components

- [[SpecCompletenessValidator]]: Core validation logic
- ModuleSpecValidator: Module spec parsing
- [[Module Specification Framework]]: 7-aspect specification system

## Workflow

### Documentation Improvement Cycle

```bash
# 1. Validate current state
tsdoc-edge validate-spec managed

# 2. Identify incomplete specs
# (Check report for yellow/red items)

# 3. Improve documentation
# (Add missing sections: Input, Output, Logic, etc.)

# 4. Re-validate
tsdoc-edge validate-spec managed

# 5. Iterate until all complete
```

### Targeting Specific Issues

```bash
# Find specs with low design scores
tsdoc-edge validate-spec managed | grep "Design: [0-5][0-9]%"

# Find specs with low implementation scores
tsdoc-edge validate-spec managed | grep "Implementation: [0-5][0-9]%"
```

## Best Practices

### 1. Maintain High Scores

```markdown
# Aim for ≥85% on both scores
- Design score ≥85%: Clear purpose, examples, integration
- Implementation score ≥85%: Complete I/O, logic, error handling
```

### 2. Balance Design and Implementation

```markdown
# Avoid:
Design: 95%, Implementation: 40% (over-conceptual)
Design: 35%, Implementation: 95% (over-technical)

# Prefer:
Design: 90%, Implementation: 85% (balanced)
```

### 3. Incremental Improvement

```bash
# Target incomplete specs first
tsdoc-edge validate-spec managed | grep "⚠️" -A 1

# Fix one at a time
# Verify improvement after each fix
```

## See Also

- [[Module Specification Framework]]: Complete framework guide
- [[SpecCompletenessValidator]]: Validator implementation
- ModuleSpecTypes: TypeScript type definitions
- Documentation quality standards

---

## Backlinks

### Referenced By

- [[CLI Commands]] → /Users/junwoobang/workflow/tsdoc-edge/managed/CLI-COMMANDS.md:255
- [[Module Specification Framework]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/module-specification-framework.md:155
- [[Module Specification Framework]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/module-specification-framework.md:220
- [[Module Specification Framework]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/module-specification-framework.md:229
- [[ValidationFeatures]] → /Users/junwoobang/workflow/tsdoc-edge/managed/features/validation-features.md:161
- [[CLI Command Development Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/command-development-guide.md:289
- ModuleSpecTypes → /Users/junwoobang/workflow/tsdoc-edge/managed/types/ModuleSpecTypes.md:177
- ModuleSpecValidator → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/ModuleSpecValidator.md:142
- [[SpecCompletenessValidator]] → /Users/junwoobang/workflow/tsdoc-edge/managed/utilities/SpecCompletenessValidator.md:61

