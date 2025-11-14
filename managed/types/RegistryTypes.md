# [[RegistryTypes]]

**Source**: `src/types/registry/registry.ts`

## Purpose

Minimal schema for symbol identification in JSONL storage.

## Source Reference

Points to code location:
```typescript
interface SourceRef {
  filePath: string;          // Relative to project root
  symbolName: string;        // Symbol name
  type?: SymbolType;         // Quick lookup
  line?: number;             // Approximate (may change)
  memberOf?: string;         // Parent symbol ID
  memberType?: 'instance' | 'static' | 'inner';
  qualifiedName?: string;    // JSDoc convention
  depth?: number;            // Hierarchy depth
  sourceHash?: string;       // Change detection
}
```

## Qualified Names (JSDoc Convention)

### Instance Members
```
ClassName#methodName
UserService#createUser
```

### Static Members
```
ClassName.methodName
UserService.getInstance
```

### Inner/Private
```
ClassName~helperName
UserService~validateInput
```

### Top-Level
```
functionName
processData
```

## Member Types

### Instance
- Belongs to class instance
- Access: `obj.method()`
- Notation: `Class#method`

### Static
- Belongs to class itself
- Access: `Class.method()`
- Notation: `Class.method`

### Inner
- Private/nested function
- Not directly accessible
- Notation: `Class~helper`

## Hierarchy Depth

```
Depth 0: Top-level (class, function, interface)
Depth 1: Method, property of a class
Depth 2: Nested function inside a method
Depth 3+: Deeper nesting
```

### Example

```typescript
class UserService {              // depth: 0
  createUser() {                  // depth: 1
    function validate() {         // depth: 2
      function checkEmail() {     // depth: 3
        // ...
      }
    }
  }
}
```

## Dependency Relation

Tracks symbol dependencies:
```typescript
interface DependencyRelation {
  targetId: string;          // Target symbol ID
  type: 'import' | 'extends' | 'implements' | 'uses';
  filePath?: string;         // Where defined
}
```

## Symbol Registry Entry

Complete registry entry:
```typescript
interface SymbolRegistryEntry {
  id: string;                // Unique ID
  source: SourceRef;         // Code location
  dependencies: DependencyRelation[];
  tags: string[];            // Categorization
  metadata: Record<string, unknown>;
}
```

## JSONL Storage Format

Each line is one symbol:
```jsonl
{"id":"user-service","source":{"filePath":"src/services/UserService.ts","symbolName":"UserService","type":"class","line":10},"dependencies":[{"targetId":"user-repository","type":"import"}]}
{"id":"create-user","source":{"filePath":"src/services/UserService.ts","symbolName":"createUser","type":"method","memberOf":"user-service","memberType":"instance","qualifiedName":"UserService#createUser","depth":1},"dependencies":[]}
```

## Change Detection

### Source Hash

```typescript
sourceHash: "abc123def456"
// SHA-256 of file content
// Detects when file changes
```

### Usage

```typescript
const newHash = computeHash(fileContent);
if (entry.source.sourceHash !== newHash) {
  // File changed, re-parse symbols
}
```

## Use Cases

### Fast Lookup by File
```typescript
const symbols = registry.filter(e =>
  e.source.filePath === 'src/services/UserService.ts'
);
```

### Find Members of Class
```typescript
const methods = registry.filter(e =>
  e.source.memberOf === 'user-service'
);
```

### Detect Changes
```typescript
const changed = registry.filter(e =>
  computeHash(readFile(e.source.filePath)) !== e.source.sourceHash
);
```

## Symbol Count

3 interfaces

## Related

- [[SymbolRegistryManager]]: Registry implementation
- [[DatabaseManager]]: JSONL sync
- [[Symbol]]: Full symbol type

---

## Backlinks

### Referenced By

- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:362
- [[DatabaseManager]] → /home/user/tsdoc-edge/managed/core-components/DatabaseManager.md:363
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:310
- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:311
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:121
- [[Symbol]] → /home/user/tsdoc-edge/managed/types/Symbol.md:122

