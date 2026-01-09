# Contributing to TSDoc Edge

Thank you for your interest in contributing to TSDoc Edge!

## Development Setup

```bash
# Clone the repository
git clone https://github.com/junwoobang/tsdoc-edge.git
cd tsdoc-edge

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

## Development Workflow

1. Create a feature branch from `master`
2. Make your changes
3. Run linting: `npm run lint`
4. Run tests: `npm test`
5. Submit a pull request

## Code Style

- We use [Biome](https://biomejs.dev/) for linting and formatting
- Run `npm run check` to auto-fix issues
- All public APIs must have TSDoc comments

## Output Builder Convention

When creating CLI commands that output structured data:

### Use XmlBuilder for Structured Output

```typescript
import { XmlBuilder } from '../output/XmlBuilder';
import { MyCommandSchema } from '../output/schemas';

// Define schema
export const MyCommandSchema: OutputSchema = {
  root: 'my-data',
  sections: {
    source: { name: 'string', type: 'string' },
    items: arrayOf('item', { id: 'string', value: 'number' }),
  },
};

// Use in command
new XmlBuilder(MyCommandSchema)
  .section('source', { name: 'Foo', type: 'class' })
  .section('items', [{ id: 'a', value: 1 }])
  .print();
```

### Schema Types

1. **ObjectSchema**: Simple objects
2. **ArraySchema**: Arrays with auto-indexing via `arrayOf()`
3. **GroupedArraySchema**: Grouped data via `groupedArrayOf()`

### Benefits

- **Auto-escape**: XML entities automatically escaped
- **Consistent formatting**: Uniform indentation and structure
- **Parseable**: Use `XmlParser` to convert XML → JSON
- **Schema validation**: Type-safe data structures

### When NOT to Use

- Complex nested documents (use custom generators like `XMLContextGenerator`)
- Human-only output (use console.log with colors)

See `src/output/SPEC.md` for complete specification.

## Stable Symbol Identifier System

TSDoc Edge uses a 3-tier identifier system to track symbols across refactorings:

### Identifier Types

1. **UUID** (Permanent): Never changes, even if symbol is renamed or moved
   - Format: Standard UUID v4
   - Use for: Linking metadata, enrichments, cross-references
   - Example: `ed889a35-e927-4f39-82b5-59b37198a477`

2. **Local Path** (File-Scoped): Changes when file is moved or symbol is renamed
   - Format: `relative/path/to/file.ts::SymbolName` or `file.ts::Class.method`
   - Use for: File-based navigation and tracking
   - Example: `packages/agent-server/src/client/rag-client.ts::RagClient`

3. **Global Path** (Export-Scoped): Only present for exported symbols
   - Format: `@package/scope::SymbolName`
   - Use for: Import path resolution and public API tracking
   - Example: `@agent-town/agent-server::RagClient`

4. **Scope** (Package Boundary): Defines uniqueness domain
   - Format: `@package/scope` or `package/submodule`
   - Use for: Uniqueness validation within scope
   - Example: `@agent-town/agent-server`

5. **Legacy ID** (Deprecated): Name-based ID for backwards compatibility
   - Format: `filename-type-symbolname`
   - Use for: Existing code compatibility only
   - Example: `rag-client-class-ragclient`

### Usage in Code

```typescript
import { SymbolIdentifierGenerator } from '../analyzer/SymbolIdentifierGenerator';

const idGenerator = new SymbolIdentifierGenerator(process.cwd());

// Generate all identifiers
const identifiers = idGenerator.generateIdentifiers(
  filePath,
  symbolName,
  symbolType,
  isExported,
  parentSymbol
);

// Store symbol with identifiers
const symbol: Symbol = {
  id: identifiers.legacyId,      // For backwards compat
  uuid: identifiers.uuid,         // Permanent reference
  localPath: identifiers.localPath,
  globalPath: identifiers.globalPath, // Only if exported
  scope: identifiers.scope,
  name: symbolName,
  type: symbolType,
  // ... other fields
};
```

### Database Schema

```sql
CREATE TABLE symbols (
    id TEXT PRIMARY KEY,           -- Legacy ID
    uuid TEXT UNIQUE,              -- Permanent UUID
    local_path TEXT,               -- File::Symbol path
    global_path TEXT,              -- @scope::Symbol path
    scope TEXT,                    -- Package/module scope
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    -- ... other fields
);
```

### Benefits

- **Refactoring Resilience**: UUIDs track symbols across renames and moves
- **Structured Paths**: Semantic addressing via local/global paths
- **Scope Isolation**: Package-based uniqueness validation
- **Backwards Compatible**: Optional fields enable gradual migration
- **Future-Proof**: Foundation for metadata enrichment and tracking

### Use Cases

1. **Rename Tracking**: UUID remains constant when symbol is renamed
2. **Move Tracking**: UUID and globalPath unchanged when file moves
3. **Metadata Linking**: Enrichments link to UUID, not name-based ID
4. **Scope Validation**: Prevent duplicate exports within same scope
5. **Cross-References**: Stable references across project boundaries

See `/tmp/identifier-system-results.md` for implementation details and test results.

## Testing

- Tests are located in `src/__tests__/`
- Use the naming convention `<ModuleName>.test.ts`
- Run specific tests: `npm test -- --testPathPattern=<pattern>`

## Commit Messages

Use clear, descriptive commit messages:
- `feat: add new feature`
- `fix: resolve bug in X`
- `docs: update README`
- `refactor: improve X`
- `test: add tests for X`

## Pull Requests

- Keep PRs focused on a single change
- Update documentation if needed
- Ensure all tests pass
- Add tests for new functionality

## Reporting Issues

- Use the issue templates provided
- Include reproduction steps
- Provide environment details (OS, Node version, etc.)

## Questions?

Open an issue with the `question` label.
