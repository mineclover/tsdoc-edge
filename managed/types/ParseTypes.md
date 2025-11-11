# [[ParseTypes]]

**Source**: `src/types/core/parse.ts`

## Purpose

Core type system for TSDoc parsing and validation.

## Parsed Doc Comment

Represents a single parsed TSDoc comment:
```typescript
interface ParsedDocComment {
  docComment: DocComment;      // TSDoc AST
  filePath: string;            // Source file
  symbolName: string;          // Symbol name
  validationResults: ValidationResult[];
  isValid: boolean;            // Passes all rules?
}
```

## Validation Result

Single validation rule result:
```typescript
interface ValidationResult {
  ruleId: string;              // Rule identifier
  severity: 'error' | 'warning' | 'info';
  message: string;             // Human-readable
  location?: {
    line: number;
    column: number;
  };
}
```

### Severity Levels

- **error**: Must fix (blocks commit)
- **warning**: Should fix (allows commit)
- **info**: Optional improvement

### Common Rule IDs

- `tsdoc/missing-summary`: No summary section
- `tsdoc/missing-param`: Missing @param tag
- `tsdoc/missing-returns`: Missing @returns tag
- `tsdoc/invalid-tag`: Unrecognized tag
- `tsdoc/malformed-comment`: Syntax error
- `ssot/missing-contract`: No @contract tag (public API)
- `ssot/missing-responsibility`: No @responsibility tag

## Parse Result

Result of parsing an entire file:
```typescript
interface ParseResult {
  filePath: string;
  comments: ParsedDocComment[];  // All comments
  errors: Error[];               // Parse errors
}
```

## Parsing Flow

1. **File Read**: Load source file
2. **AST Parse**: TypeScript compiler parses code
3. **Comment Extract**: Find JSDoc/TSDoc comments
4. **TSDoc Parse**: Parse comment structure
5. **Validation**: Run validation rules
6. **Result**: Return ParseResult with all comments

## Validation Example

```typescript
{
  docComment: { /* TSDoc AST */ },
  filePath: 'src/services/UserService.ts',
  symbolName: 'UserService',
  validationResults: [
    {
      ruleId: 'tsdoc/missing-param',
      severity: 'error',
      message: 'Missing @param tag for parameter "userId"',
      location: { line: 42, column: 5 }
    },
    {
      ruleId: 'ssot/missing-contract',
      severity: 'warning',
      message: 'Public API should have @contract tag',
      location: { line: 40, column: 1 }
    }
  ],
  isValid: false
}
```

## Error Handling

### Parse Errors
- TypeScript syntax errors
- Malformed TSDoc syntax
- Encoding issues
- File read errors

### Validation Errors
- Missing required tags
- Invalid tag format
- Inconsistent documentation
- Broken references

## Integration

### TSDocParser
```typescript
const parser = new TSDocParser();
const result = parser.parseFile(filePath, source);
// Returns: ParseResult
```

### ValidateCommand
```bash
tsdoc-edge validate
# Runs validation on all files
# Shows errors and warnings
```

### Pre-commit Hook
- Validates changed files only
- Blocks commit on errors
- Shows warnings but allows commit

## Symbol Count

3 interfaces

## Related

- [[TSDocParser]]: Parser implementation
- [[ValidateCommand]]: CLI validation
- [[ModuleSpecTagParser]]: Custom tag parsing

---

## Backlinks

### Referenced By

- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:40
- [[ModuleSpecTagParser]] → /home/user/tsdoc-edge/managed/parser/ModuleSpecTagParser.md:35
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:40

