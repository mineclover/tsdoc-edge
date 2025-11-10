# [[IdGenerator]]

**Source**: `src/utils/IdGenerator.ts`

## Purpose

Generate unique short IDs for symbol identification.

## ID Generation Modes

### Sequential Mode (Default)
- Generates: 001, 002, 003, ...
- Predictable order
- Easier to read
- Used for document IDs

### Random Mode
- Generates: a3f, b2k, x9w, ...
- Unpredictable order
- Collision resistance
- Used for temporary IDs

## Configuration

```typescript
const generator = new IdGenerator({
  mode: 'sequential',  // or 'random'
  length: 3,           // Initial ID length
  charset: '0123456789abcdefghijklmnopqrstuvwxyz'
});
```

## Collision Prevention

### Used ID Tracking
- Maintains Set of used IDs
- Prevents duplicates
- Checks before assignment

### Auto-Length Increase
When capacity exhausted:
- Increases length automatically
- Sequential: 999 → 1000
- Random: zzz → aaaa

### Capacity Calculation
For charset size 36 (0-9a-z):
- Length 3: 46,656 IDs
- Length 4: 1,679,616 IDs
- Length 5: 60,466,176 IDs

## API

### generate()
```typescript
const id = generator.generate();
// Returns: "001" (sequential) or "a3f" (random)
```

### isUsed(id)
```typescript
const used = generator.isUsed("001");
// Returns: boolean
```

### reset()
```typescript
generator.reset();
// Clears all used IDs and counter
```

### getCapacity()
```typescript
const capacity = generator.getCapacity();
// Returns: max IDs for current length
```

## Use Cases

### Document IDs
```typescript
// Sequential for documents
const docIdGen = new IdGenerator({ mode: 'sequential' });
const id = docIdGen.generate(); // "001"
```

### Symbol IDs
```typescript
// Use file path + name instead
// IdGenerator not typically used for symbols
// Symbols use kebab-case from name
```

### Temporary References
```typescript
// Random for temp IDs
const tempIdGen = new IdGenerator({ mode: 'random' });
const tempId = tempIdGen.generate(); // "x7k"
```

## Symbol Count

1 class, 1 interface

## Related

- (Planned: IdCommand for CLI ID generation)
- (Planned: IdNewCommand for new document IDs)
- [[DocumentSymbol]]: Document symbol system

---

## Backlinks

### Referenced By

- [[SymbolRegistryManager]] → /home/user/tsdoc-edge/managed/storage/SymbolRegistryManager.md:221

