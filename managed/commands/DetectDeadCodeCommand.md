# [[DetectDeadCodeCommand]]

**Source**: `src/commands/DetectDeadCodeCommand.ts`

## Purpose

Detect unused code (dead code) by analyzing call graphs and dependency relationships.

## Detection Strategy

Uses three metrics to identify dead code:
- **Incoming calls**: Symbols never called by other code
- **Incoming dependencies**: Symbols never imported/referenced
- **Entry point awareness**: Excludes commands, CLI, exports

## Confidence Levels

### High Confidence (Safe to Delete)
- 0 incoming calls AND 0 incoming dependencies
- Not an entry point or test file
- Completely isolated from codebase

### Medium Confidence (Likely Unused)
- 0 incoming calls but some dependencies exist
- May be imported but never actually used
- Needs manual verification

### Low Confidence (Test Only)
- Only used in test files
- May be necessary for testing infrastructure
- Review before deletion

## Usage

```bash
# Show only high-confidence dead code
tsdoc-edge detect-dead-code --high

# Show high and medium confidence
tsdoc-edge detect-dead-code --medium

# Show all candidates
tsdoc-edge detect-dead-code --all
```

## Output

For each dead code symbol:
- Symbol name and type
- File location
- Confidence level
- Deletion recommendations
- Safety warnings

## Safety Checks

Automatically excludes:
- Entry points (commands, CLI, main exports)
- Test files
- Public API contracts

Warns about:
- Dynamic usage (reflection, eval)
- Runtime configuration
- Plugin systems
- Conditional imports

## Related

- [[CoverageReportCommand]]: Identifies undocumented code
- [[AnalyzeCallsCommand]]: Call graph analysis
- [[AnalyzeTypesCommand]]: Type dependency analysis
