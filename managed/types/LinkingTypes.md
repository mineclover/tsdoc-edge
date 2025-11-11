# [[LinkingTypes]]

**Source**: `src/types/core/linking.ts`

## Purpose

Type system for bidirectional doc-code linking and validation.

## Code Link (Doc → Code)

Link from documentation to source code:
```typescript
interface CodeLink {
  docPath: string;         // Source doc file
  docLine: number;         // Line in doc
  text: string;            // Link text
  targetFile: string;      // Target source file
  targetSymbol?: string;   // Symbol name
  targetMember?: string;   // Member (Class#method)
}
```

## Doc Link (Code → Doc)

Link from source code to documentation:
```typescript
interface DocLink {
  codePath: string;        // Source code file
  codeLine: number;        // Line in code
  symbolName: string;      // Symbol being documented
  tagType: string;         // @see, @link, @doc
  targetDoc: string;       // Target markdown file
  targetSection?: string;  // Section anchor
}
```

## Link Index

Bidirectional mapping between code and docs:
```typescript
interface LinkIndex {
  codeToDoc: Map<string, DocLink[]>;
  docToCode: Map<string, CodeLink[]>;
  symbolToDoc: Map<string, string[]>;
  docToSymbol: Map<string, string[]>;
}
```

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
```typescript
interface LinkValidationResult {
  type: 'broken' | 'valid' | 'outdated';
  link: CodeLink | DocLink;
  issue?: string;          // Description of problem
  suggestion?: string;     // How to fix
}
```

### Validation Types

- **broken**: Target doesn't exist
- **valid**: Link works correctly
- **outdated**: Target moved/renamed

## Link Validation Report

Summary of all link validations:
```typescript
interface LinkValidationReport {
  totalLinks: number;
  brokenLinks: LinkValidationResult[];
  validLinks: number;
  fixableLinks: number;    // Auto-fixable count
}
```

## Fix Result

Result of applying a fix to a broken link:
```typescript
interface FixResult {
  link: CodeLink | DocLink;
  originalText: string;    // Before fix
  fixedText: string;       // After fix
  applied: boolean;        // Successfully applied?
}
```

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

- [[CheckLinksCommand]] → /home/user/tsdoc-edge/managed/commands/CheckLinksCommand.md:32
- [[DocCodeLinker]] → /home/user/tsdoc-edge/managed/utilities/DocCodeLinker.md:64
- [[LinkValidator]] → /home/user/tsdoc-edge/managed/utilities/LinkValidator.md:74

