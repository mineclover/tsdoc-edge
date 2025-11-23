# [[LinkingTypes]]

**Source**: `src/types/core/linking.ts`

## Purpose

Type system for bidirectional doc-code linking and validation.

## Code Link (Doc → Code)

Link from documentation to source code:

See implementation: [[CodeLink]]

**Key Properties**:
- `docPath`: Source doc file
- `docLine`: Line in doc
- `text`: Link text
- `targetFile`: Target source file
- `targetSymbol`: Symbol name (optional)
- `targetMember`: Member (Class#method) (optional)

## Doc Link (Code → Doc)

Link from source code to documentation:

See implementation: [[DocLink]]

**Key Properties**:
- `codePath`: Source code file
- `codeLine`: Line in code
- `symbolName`: Symbol being documented
- `tagType`: @see, @link, @doc
- `targetDoc`: Target markdown file
- `targetSection`: Section anchor (optional)

## Link Index

Bidirectional mapping between code and docs:

See implementation: [[LinkIndex]]

**Key Properties**:
- `codeToDoc`: Map from code files to doc links
- `docToCode`: Map from doc files to code links
- `symbolToDoc`: Map from symbols to doc files
- `docToSymbol`: Map from doc files to symbols

### Index Usage

```typescript
// Find docs for a code file
const docs = index.codeToDoc.get('src/services/UserService.ts');

// Find code for a doc file
const code = index.docToCode.get('managed/features/user-service.md');

// Find docs for a symbol
const symbolDocs = index.symbolToDoc.get('user-service');

// Find symbols in a doc
const symbols = index.docToSymbol.get('managed/features/user-service.md');
```

## Link Validation Result

Result of validating a single link:

See implementation: [[LinkValidationResult]]

**Key Properties**:
- `type`: 'broken', 'valid', or 'outdated'
- `link`: CodeLink or DocLink
- `issue`: Description of problem (optional)
- `suggestion`: How to fix (optional)

### Validation Types

- **broken**: Target doesn't exist
- **valid**: Link works correctly
- **outdated**: Target moved/renamed

## Link Validation Report

Summary of all link validations:

See implementation: [[LinkValidationReport]]

**Key Properties**:
- `totalLinks`: Total number of links
- `brokenLinks`: Broken link validation results
- `validLinks`: Number of valid links
- `fixableLinks`: Auto-fixable count

## Fix Result

Result of applying a fix to a broken link:

See implementation: [[FixResult]]

**Key Properties**:
- `link`: CodeLink or DocLink
- `originalText`: Before fix
- `fixedText`: After fix
- `applied`: Successfully applied?

## Link Validation Flow

1. **Build Index**: Parse all docs and code
2. **Validate Links**: Check each link target exists
3. **Generate Report**: Summarize broken/valid/fixable
4. **Auto-Fix**: Apply fixes for outdated links
5. **Manual Review**: User fixes remaining issues

## Example Validation

```typescript
// Broken link
{
  type: 'broken',
  link: {
    docPath: 'managed/features/user-service.md',
    targetFile: 'src/services/User.ts', // Wrong path
    targetSymbol: 'UserService'
  },
  issue: 'File not found: src/services/User.ts',
  suggestion: 'Did you mean: src/services/UserService.ts?'
}

// Outdated link
{
  type: 'outdated',
  link: { /* ... */ },
  issue: 'Symbol renamed from UserRepo to UserRepository',
  suggestion: 'Update link to UserRepository'
}
```

## Symbol Count

6 interfaces

## Related

- [[DocCodeLinker]]: Creates link index
- [[LinkValidator]]: Validates and fixes links
- [[CheckLinksCommand]]: CLI validation

---

## Backlinks

### Referenced By

- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:38
- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:39
- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:40
- [[DocCodeLinker]] → /home/user/tsdoc-edge/managed/utilities/DocCodeLinker.md:68
- [[DocCodeLinker]] → /home/user/tsdoc-edge/managed/utilities/DocCodeLinker.md:69
- [[DocCodeLinker]] → /home/user/tsdoc-edge/managed/utilities/DocCodeLinker.md:70
- [[LinkValidator]] → /home/user/tsdoc-edge/managed/utilities/LinkValidator.md:76
- [[LinkValidator]] → /home/user/tsdoc-edge/managed/utilities/LinkValidator.md:77
- [[LinkValidator]] → /home/user/tsdoc-edge/managed/utilities/LinkValidator.md:78

