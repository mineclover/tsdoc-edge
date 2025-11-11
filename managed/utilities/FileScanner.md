# [[FileScanner]]

**Source**: `src/scanner/FileScanner.ts`

## Purpose

Scan entire project directory and build comprehensive symbol database.

## Scanning Process

### 1. File Discovery
- Recursively traverse project directory
- Filter by file extensions (.ts, .tsx)
- Respect .gitignore patterns
- Exclude node_modules, dist, build

### 2. Symbol Extraction
- Parse TypeScript AST
- Extract TSDoc comments
- Identify symbol declarations
- Capture symbol metadata

### 3. Database Population
- Store symbols in SQLite
- Create JSONL backup
- Build relationship graph
- Generate symbol index

## Scanner Configuration

```typescript
interface ScannerConfig {
  include: string[];  // Glob patterns to include
  exclude: string[];  // Glob patterns to exclude
  followSymlinks: boolean;
  maxDepth: number;
}
```

## Scan Result

Returns:
- Total files scanned
- Total symbols extracted
- Symbols by type (class, function, etc.)
- Scan duration
- Errors encountered

## Symbol Types Detected

- Classes
- Interfaces
- Types
- Functions
- Methods
- Properties
- Enums
- Variables

## Performance

- Incremental scanning (only changed files)
- Parallel file processing
- Symbol cache for fast re-scans
- Progress reporting

## Symbol Count

1 class, 6 interfaces

## Related

- [[TSDocParser]]: Parses TSDoc comments
- [[ASTSymbolExtractor]]: Extracts symbols from AST
- [[BuildCommand]]: Triggers full scan

---

## Backlinks

### Referenced By

- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:261
- [[ASTSymbolExtractor]] → /home/user/tsdoc-edge/managed/analyzers/ASTSymbolExtractor.md:262
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:139
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:140
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:54
- [[TSDocParser]] → /home/user/tsdoc-edge/managed/parser/TSDocParser.md:55
- [[String Utilities]] → /home/user/tsdoc-edge/managed/utilities/StringUtilities.md:55
- [[String Utilities]] → /home/user/tsdoc-edge/managed/utilities/StringUtilities.md:77
- [[Utilities Index]] → /home/user/tsdoc-edge/managed/utilities/index.md:400

