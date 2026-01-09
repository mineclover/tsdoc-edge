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
