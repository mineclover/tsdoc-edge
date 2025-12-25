---
title: Registry Types
type: type
category: types
status: active
canonical: true
---

# RegistryTypes

**Source**: `src/types/registry/registry.ts`

## Purpose

Minimal schema for symbol identification in JSONL storage.

## Source Reference

Points to code location:

See implementation: SourceRef

**Key Properties**:
- `filePath`: Relative to project root
- `symbolName`: Symbol name
- `type`: Quick lookup (optional)
- `line`: Approximate line number (may change) (optional)
- `memberOf`: Parent symbol ID (optional)
- `memberType`: 'instance', 'static', or 'inner' (optional)
- `qualifiedName`: JSDoc convention (optional)
- `depth`: Hierarchy depth (optional)
- `sourceHash`: Change detection hash (optional)

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

See implementation: DependencyRelation

**Key Properties**:
- `targetId`: Target symbol ID
- `type`: 'import', 'extends', 'implements', or 'uses'
- `filePath`: Where defined (optional)

## Symbol Registry Entry

Complete registry entry:

See implementation: SymbolRegistryEntry

**Key Properties**:
- `id`: Unique ID
- `source`: Code location
- `dependencies`: Dependency relations
- `tags`: Categorization tags
- `metadata`: Additional metadata

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
