# [[ParseTypes]]

**Source**: `src/types/core/parse.ts`

## Purpose

Core type system for TSDoc parsing and validation.

## Parsed Doc Comment

See implementation: [[ParsedDocComment]]

**Key Properties**:
- `docComment`: TSDoc AST structure
- `filePath`: Source file path
- `symbolName`: Symbol name
- `validationResults`: Validation results array
- `isValid`: Whether comment passes all validation rules

## Validation Result

See implementation: [[ValidationResult]]

**Key Properties**:
- `ruleId`: Rule identifier
- `severity`: error | warning | info
- `message`: Human-readable message
- `location`: Line and column position (optional)

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

See implementation: [[ParseResult]]

**Key Properties**:
- `filePath`: File path
- `comments`: All parsed comments
- `errors`: Parse errors

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

- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:72
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:73
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:74
- [[ModuleSpecTagParser]] → /home/user/tsdoc-edge/managed/parser/ModuleSpecTagParser.md:45
- [[ModuleSpecTagParser]] → /home/user/tsdoc-edge/managed/parser/ModuleSpecTagParser.md:46
- [[ModuleSpecTagParser]] → /home/user/tsdoc-edge/managed/parser/ModuleSpecTagParser.md:47
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:64
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:65
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:66

