# [[String Utilities]]

**Source**: `src/utils/index.ts`

## Purpose

Provide common string and file path manipulation utilities used across the TSDoc Edge codebase.

## Functions

### isEmptyOrWhitespace

Check if a string is empty or contains only whitespace.

```typescript
export function isEmptyOrWhitespace(str: string): boolean
```

**Usage**:
- Input validation
- String preprocessing
- Empty check before operations

### normalizeLineEndings

Normalize all line endings to LF (Unix style).

```typescript
export function normalizeLineEndings(text: string): string
```

**Behavior**:
- Converts `\r\n` (Windows) → `\n` (Unix)
- Converts `\r` (old Mac) → `\n` (Unix)
- Ensures consistent line ending format

**Used by**:
- File parsers
- TSDoc comment extraction
- Text comparison

### getFileExtension

Extract file extension from a file path.

```typescript
export function getFileExtension(filePath: string): string
```

**Returns**: Extension without dot (e.g., `"ts"`, `"md"`, `""`)

### isTypeScriptOrJavaScript

Check if a file is TypeScript or JavaScript based on extension.

```typescript
export function isTypeScriptOrJavaScript(filePath: string): boolean
```

**Supported extensions**: `.ts`, `.tsx`, `.js`, `.jsx`

**Used by**:
- [[FileScanner]]: Filter source files
- [[ASTSymbolExtractor]]: Determine parseable files
- [[BuildCommand]]: Validate input files

## Design

**Philosophy**: Pure functions with no side effects
**Pattern**: Single responsibility per function
**Performance**: O(n) string operations, optimized for small strings

## Symbol Count

4 utility functions

---

## Backlinks

### Referenced By

- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:212
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:93
- [[FileScanner]] → /home/user/tsdoc-edge/managed/utilities/FileScanner.md:76

