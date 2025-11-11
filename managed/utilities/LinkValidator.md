# [[LinkValidator]]

**Source**: `src/linking/LinkValidator.ts`

## Purpose

Validate doc-code links and suggest automatic fixes for broken links.

## Validation Targets

### Doc → Code Links
- File path existence
- Symbol references validity
- Relative path correctness

### Code → Doc Links
- @doc tag targets exist
- Documentation files accessible
- Markdown file validity

## Validation Report

For each broken link:
- Link type (doc→code or code→doc)
- Source location (file, line)
- Target location (expected path)
- Break reason (file not found, symbol missing, etc.)
- Suggested fix (auto-fixable or manual)

## Auto-Fix Capabilities

### Fixable Issues
- Outdated file paths (file moved)
- Renamed symbols (refactoring)
- Case sensitivity errors
- Relative path errors

### Manual Issues
- Deleted files
- Completely removed symbols
- Ambiguous references
- Multiple candidates

## Usage

```typescript
const validator = new LinkValidator(linker, extractor, projectRoot);
const report = validator.validateAll(codeFiles, docFiles);

// Auto-fix broken links
const fixes = validator.autoFix(report);
```

## Fix Results

Returns:
- Number of links fixed
- Number requiring manual intervention
- List of applied changes
- Remaining issues

## Symbol Count

1 class, 4 interfaces

## Related

- [[DocCodeLinker]]: Creates link index
- [[CheckLinksCommand]]: CLI validation command
- [[UpdateBacklinksCommand]]: Updates backlinks

---

## Backlinks

### Referenced By

- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:37
- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:38
- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:41
- [[UpdateBacklinksCommand]] → /home/user/tsdoc-edge/managed/commands/UpdateBacklinksCommand.md:42
- [[LinkingTypes]] → /home/user/tsdoc-edge/managed/types/LinkingTypes.md:68
- [[LinkingTypes]] → /home/user/tsdoc-edge/managed/types/LinkingTypes.md:79
- [[DocCodeLinker]] → /home/user/tsdoc-edge/managed/utilities/DocCodeLinker.md:51
- [[DocCodeLinker]] → /home/user/tsdoc-edge/managed/utilities/DocCodeLinker.md:67
- [[DocCodeLinker]] → /home/user/tsdoc-edge/managed/utilities/DocCodeLinker.md:68
- [[DocCodeLinker]] → /home/user/tsdoc-edge/managed/utilities/DocCodeLinker.md:69

