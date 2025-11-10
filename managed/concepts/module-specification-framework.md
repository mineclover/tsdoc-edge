# [[Module Specification Framework]]

## Purpose

Systematic 7-aspect framework for documenting modules, ensuring completeness and consistency across all documentation.

## Problem

Traditional documentation is often incomplete:
- **Missing context**: Why does this module exist?
- **Unclear contracts**: What inputs/outputs are valid?
- **Hidden dependencies**: What does this rely on?
- **Undocumented behavior**: How does it actually work?
- **Unknown side effects**: What else changes?
- **Ambiguous scope**: What's public vs private?

## Solution

7-aspect specification framework that captures all essential information:

```markdown
## 1. Purpose
Why does this exist?

## 2. Input
What does it accept? (Parameters, constraints)

## 3. Output
What does it produce? (Return values, results)

## 4. Context
What does it depend on? (Dependencies, environment)

## 5. Logic
How does it work? (Algorithm, implementation)

## 6. Effect
What side effects occur? (State changes, I/O)

## 7. Scope
What's the public interface? (API surface, visibility)
```

## The 7 Aspects

### 1. Purpose

**Question**: Why does this module exist?

**Contains**:
- **Problem**: What problem does it solve?
- **Solution**: How does it solve it?
- **Responsibility**: What is its single responsibility?
- **Use cases**: When should it be used?

**Example**:
```markdown
## Purpose

**Problem**: TypeScript projects lack automated documentation consistency checks.

**Solution**: Parse TSDoc comments and validate completeness against the 7-aspect framework.

**Responsibility**: Validate specification completeness across all documentation files.

**Use Cases**:
- Pre-commit hooks to ensure documentation quality
- CI/CD pipelines for documentation validation
- Manual documentation audits
```

### 2. Input

**Question**: What does it accept?

**Contains**:
- **Parameters**: Function/method parameters
- **Types**: TypeScript type definitions
- **Constraints**: Valid ranges, formats, preconditions
- **Edge cases**: Boundary conditions

**Example**:
```markdown
## Input

### Parameters

- `docsDir: string` - Documentation directory to validate (default: `managed`)
  - **Constraint**: Must be a valid directory path
  - **Edge case**: Empty directory → no errors, just warning

### Constraints

- Directory must exist
- Must contain at least one .md file
- Files must be UTF-8 encoded
```

### 3. Output

**Question**: What does it produce?

**Contains**:
- **Return values**: What's returned?
- **Types**: Return type definitions
- **Success cases**: Normal outputs
- **Error cases**: Failure modes
- **Side outputs**: Logs, files, etc.

**Example**:
```markdown
## Output

### Return Value

`CommandResult`:
- `success: boolean` - Whether validation passed
- `message: string` - Summary message
- `data?: ValidationResults` - Detailed results

### Success Case

```typescript
{
  success: true,
  message: "All specifications complete",
  data: {
    total: 156,
    complete: 156,
    incomplete: 0
  }
}
```

### Error Case

```typescript
{
  success: false,
  message: "14 incomplete specifications",
  data: { /* ... */ }
}
```
```

### 4. Context

**Question**: What does it depend on?

**Contains**:
- **Dependencies**: External modules/libraries
- **Environment**: Runtime requirements
- **Configuration**: Settings, environment variables
- **State**: Global state dependencies

**Example**:
```markdown
## Context

### Dependencies

- [[SpecCompletenessValidator]]: Core validation logic
- [[ModuleSpecValidator]]: Spec parsing
- [[FileSystem]]: File I/O operations

### Environment

- Node.js ≥ 16.x
- File system access
- UTF-8 locale

### Configuration

Reads from `.tsdoc.config.json`:
```json
{
  "validation": {
    "strictMode": false,
    "requireExamples": false
  }
}
```
```

### 5. Logic

**Question**: How does it work?

**Contains**:
- **Algorithm**: Step-by-step process
- **Data flow**: How data transforms
- **Control flow**: Branches, loops, conditions
- **Performance**: Time/space complexity

**Example**:
```markdown
## Logic

### Algorithm

1. **Scan directory**: Find all .md files recursively
2. **Parse each file**: Extract H1-H7 sections
3. **Score design**: Check Purpose, Responsibility, Use Cases (0-100)
4. **Score implementation**: Check Input, Output, Logic, Effects (0-100)
5. **Classify**: Complete if both scores ≥ 70%
6. **Aggregate**: Calculate summary statistics
7. **Report**: Display results with color coding

### Data Flow

```
Files → Parser → Sections → Scorer → Results → Reporter → Console
```

### Performance

- **Time**: O(n×m) where n=files, m=avg lines per file
- **Space**: O(k) where k=total sections
- **Typical**: ~500ms for 200 files
```

### 6. Effect

**Question**: What side effects occur?

**Contains**:
- **State changes**: What mutates?
- **I/O operations**: Files, network, database
- **External systems**: APIs, services
- **Observable changes**: What changes externally?

**Example**:
```markdown
## Effect

### Side Effects

**None** - This command is read-only.

### I/O Operations

- **Read**: All .md files in specified directory
- **Write**: None
- **Console**: Colored output to stdout/stderr

### Exit Codes

- `0`: All specifications complete
- `1`: One or more incomplete
- `2`: Validation error (path not found, etc.)
```

### 7. Scope

**Question**: What's the public interface?

**Contains**:
- **Public API**: Exported functions/classes
- **Private implementation**: Internal details
- **Stability**: API stability guarantees
- **Deprecation**: Deprecated features

**Example**:
```markdown
## Scope

### Public API

```typescript
class ValidateSpecCommand extends BaseCommand {
  public getName(): string;
  public getDescription(): string;
  public async execute(args: string[]): Promise<CommandResult>;
}
```

### Private Methods

```typescript
private findMarkdownFiles(dir: string): string[];
private colorizeScore(score: number): string;
```

### API Stability

- **Stable**: `execute()`, `getName()`, `getDescription()`
- **Unstable**: Internal scoring algorithm (may change)

### Deprecation

None
```

## Scoring System

[[ValidateSpecCommand]] uses this framework to score documentation:

### Design Score (0-100)

- **Purpose** section: 20 points
- **Responsibility** defined: 15 points
- **Problem/Solution** sections: 15 points
- **Use cases** documented: 15 points
- **Examples** provided: 15 points
- **Integration** documented: 10 points
- **Configuration** explained: 10 points

### Implementation Score (0-100)

- **Input/Parameters** documented: 20 points
- **Output/Returns** documented: 20 points
- **Logic/Algorithm** explained: 20 points
- **Side effects** documented: 15 points
- **Error handling** described: 15 points
- **Performance** considerations: 10 points

### Completeness

**Complete**: Both scores ≥ 70%
**Incomplete**: Either score < 70%

## Benefits

### 1. Consistency

All modules documented with same structure:
```
BuildCommand.md ← 7 aspects
ParseCommand.md ← 7 aspects
ValidateCommand.md ← 7 aspects
```

### 2. Completeness

No missing information - framework enforces coverage of all aspects.

### 3. Discoverability

Developers know where to find specific information:
- Need to know side effects? → Check **Effect** section
- Need to know dependencies? → Check **Context** section
- Need to know algorithm? → Check **Logic** section

### 4. Maintainability

Changes trigger obvious documentation updates:
```
Add parameter → Update Input section
Add dependency → Update Context section
Change algorithm → Update Logic section
```

## Tools

### Validation

```bash
# Validate all docs
tsdoc-edge validate-spec managed

# Show incomplete specs only
tsdoc-edge validate-spec managed | grep "⚠️"
```

### Generation

```bash
# Generate skeleton from code
tsdoc-edge generate-spec src/commands/NewCommand.ts
```

### Metrics

```bash
# Show completeness trend
tsdoc-edge health --spec-completeness
```

## Related

- [[ValidateSpecCommand]]: Validate framework compliance
- [[SpecCompletenessValidator]]: Core validation logic
- [[ModuleSpecValidator]]: Spec parsing
- [[ModuleSpecTypes]]: TypeScript type definitions

## Examples

See any command documentation in `managed/commands/` for complete examples:
- [[BuildCommand]]
- [[ValidateSpecCommand]]
- [[WorkContextCommand]]

## References

This framework is inspired by:
- **Literate Programming** (Donald Knuth): Documentation as primary artifact
- **Design by Contract** (Bertrand Meyer): Explicit preconditions/postconditions
- **Aspect-Oriented Documentation**: Multiple perspectives on same code

## Status

**Current**: Active, used for all command documentation
**Coverage**: 156/156 command docs (100%)
**Next**: Extend to analyzer/utility documentation

---

## Backlinks

### Referenced By

- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:55
- [[StrictModeValidator]] → /home/user/tsdoc-edge/managed/analyzers/StrictModeValidator.md:237
- [[ValidateSpecCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSpecCommand.md:7
- [[ValidateSpecCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSpecCommand.md:152
- [[ValidateSpecCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSpecCommand.md:180
- [[Work Context Reliability]] → /home/user/tsdoc-edge/managed/concepts/work-context-reliability.md:161
- [[EnhancedDocExtractor]] → /home/user/tsdoc-edge/managed/parser/EnhancedDocExtractor.md:208

