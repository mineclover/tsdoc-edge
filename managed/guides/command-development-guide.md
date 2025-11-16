---
title: CLI Command Development Guide
type: guide
category: development
status: active
canonical: true
---

# [[CLI Command Development Guide]]

> **Step-by-step guide** to developing new CLI commands for TSDoc Edge

Learn how to create, test, and integrate new commands into the TSDoc Edge CLI.

## Overview

TSDoc Edge uses the **Command Pattern** for all CLI commands. Each command:
- Extends [[BaseCommand]] (`src/commands/BaseCommand.ts:57`)
- Registers in [[CommandRegistry]] (`src/commands/CommandRegistry.ts:33`)
- Integrates via `cli.ts` main entry point

**Total Commands**: 86 commands (as of 2025-11-14)

---

## Step 1: Understand BaseCommand

### Core Pattern

All commands inherit from [[BaseCommand]] which provides:

**Abstract Methods** (must implement):
```typescript
// src/commands/BaseCommand.ts:64
abstract execute(args: string[]): Promise<CommandResult>;
abstract getName(): string;
abstract getDescription(): string;
```

**Utility Methods** (can use):
```typescript
// src/commands/BaseCommand.ts:86-100
printHeader(title: string): void          // Print section headers
printSection(title: string): void         // Print subsection titles
printError(message: string): void         // Print error messages
printSuccess(message: string): void       // Print success messages
```

**Example Implementation**: [[StatsCommand]] (`src/commands/StatsCommand.ts:39`)

---

## Step 2: Create Your Command File

### File Structure

Create `src/commands/YourCommand.ts`:

```typescript
/**
 * Your Command - Brief description
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';

/**
 * Command for [purpose]
 *
 * @public
 * @responsibility [What this command does]
 * @contract [Input/output contract]
 * @doc [[YourCommand]]
 *
 * @problem [What problem does this solve?]
 * @solves [How does it solve it?]
 * @context [When is it used?]
 *
 * @functionality
 * - [Feature 1]
 * - [Feature 2]
 * - [Feature 3]
 *
 * @depends [Dependencies]
 * @depType internal
 * @depReason [Why these dependencies?]
 */
export class YourCommand extends BaseCommand {
  private dbManager?: DatabaseManager;

  constructor(dbManager?: DatabaseManager) {
    super();
    this.dbManager = dbManager;
  }

  getName(): string {
    return 'your-command';
  }

  getDescription(): string {
    return 'Brief description for CLI help';
  }

  async execute(args: string[]): Promise<CommandResult> {
    // Implementation here
    return { exitCode: 0 };
  }
}
```

### Real Example: StatsCommand

See [[StatsCommand]] implementation at `src/commands/StatsCommand.ts:39-100`

**Key patterns**:
1. **Constructor injection**: Optional DatabaseManager for testability
2. **TSDoc documentation**: Complete with @responsibility, @problem, @solves
3. **Error handling**: Returns CommandResult instead of process.exit()

---

## Step 3: Implement Execute Method

### Pattern 1: Simple Query Command

For read-only database queries:

```typescript
async execute(args: string[]): Promise<CommandResult> {
  this.printHeader('Command Title');

  const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');

  if (!fs.existsSync(dbPath)) {
    this.printError('Database not found. Run "tsdoc-edge build src" first.');
    return { exitCode: 1, message: 'Database not found' };
  }

  const dbManager = this.dbManager || new DatabaseManager(dbPath);

  try {
    const results = dbManager.query(/* your query */);
    this.printResults(results);
    return { exitCode: 0 };
  } catch (error) {
    this.printError(error.message);
    return { exitCode: 1, error };
  }
}
```

**Example**: [[DepsCommand]] (`src/commands/DepsCommand.ts`)

---

### Pattern 2: Analysis Command

For commands that analyze and modify data:

```typescript
async execute(args: string[]): Promise<CommandResult> {
  this.printHeader('Analysis Title');

  // 1. Validate prerequisites
  const dbPath = this.validateDatabase();
  if (!dbPath) return { exitCode: 1 };

  // 2. Load analyzer
  const analyzer = new YourAnalyzer(dbManager);

  // 3. Run analysis
  this.printSection('Running analysis...');
  const results = await analyzer.analyze();

  // 4. Save results
  this.printSection('Saving results...');
  await this.saveResults(results);

  // 5. Display summary
  this.printSummary(results);

  return { exitCode: 0 };
}
```

**Example**: [[AnalyzeCallsCommand]] (`src/commands/AnalyzeCallsCommand.ts`)

---

### Pattern 3: Documentation Command

For commands that work with managed docs:

```typescript
async execute(args: string[]): Promise<CommandResult> {
  this.printHeader('Documentation Command');

  // 1. Load doc registry
  const registry = new DocumentSymbolRegistry();
  await registry.loadFromDirectory('managed');

  // 2. Process documents
  const docs = registry.getAllDocuments();
  for (const doc of docs) {
    // Process each doc
  }

  // 3. Update backlinks
  const generator = new BacklinkGenerator();
  await generator.updateBacklinks('managed');

  return { exitCode: 0 };
}
```

**Example**: [[IndexDocsCommand]] (`src/commands/IndexDocsCommand.ts`)

---

## Step 4: Add Command Options

### Using Arguments

Parse command-line arguments:

```typescript
async execute(args: string[]): Promise<CommandResult> {
  // Check for flags
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');

  // Extract values
  const typeIndex = args.findIndex(a => a.startsWith('--type='));
  const type = typeIndex >= 0 ? args[typeIndex].split('=')[1] : 'all';

  // Positional arguments
  const [targetSymbol] = args.filter(a => !a.startsWith('-'));

  if (!targetSymbol) {
    this.printError('Missing required argument: symbol name');
    return { exitCode: 1 };
  }

  // Use parsed values
  if (dryRun) {
    console.log('Dry run mode - no changes will be made');
  }

  // ... implementation
}
```

**Example**: [[UpdateBacklinksCommand]] uses `--dry-run` flag

---

### Help Text

Add help display:

```typescript
getName(): string {
  return 'your-command';
}

getDescription(): string {
  return 'Brief description';
}

protected getUsage(): string {
  return `
Usage: tsdoc-edge your-command [options] <arguments>

Arguments:
  <symbol>          Symbol name to process

Options:
  --dry-run         Show changes without applying
  --verbose, -v     Show detailed output
  --type=<type>     Filter by type (class|function|interface)
  --help, -h        Show this help message

Examples:
  tsdoc-edge your-command BuildCommand
  tsdoc-edge your-command --dry-run AnalyzeCommand
  tsdoc-edge your-command --type=class DatabaseManager
`;
}

async execute(args: string[]): Promise<CommandResult> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(this.getUsage());
    return { exitCode: 0 };
  }

  // ... rest of implementation
}
```

---

## Step 5: Register Command

### Update cli.ts

Add your command to `src/cli.ts`:

**Step 5.1**: Import your command

```typescript
// src/cli.ts (top of file)
import { YourCommand } from './commands/YourCommand';
```

**Step 5.2**: Register in main()

```typescript
// src/cli.ts:138 (inside main function)
async function main(): Promise<void> {
  const registry = new CommandRegistry();

  // ... other commands
  registry.register(new YourCommand());

  // ... rest of registration
}
```

**Reference**: See `src/cli.ts:139-145` for registration examples

---

### Export from index.ts

Add your command to `src/commands/index.ts`:

```typescript
export { YourCommand } from './YourCommand';
```

This enables:
```typescript
import { YourCommand } from './commands';
```

---

## Step 6: Test Your Command

### Manual Testing

```bash
# Build TypeScript
npm run build

# Run command
node dist/cli.js your-command --help
node dist/cli.js your-command test-arg

# Use npx for development
npx ts-node src/cli.ts your-command test-arg
```

### Automated Testing

Create `src/__tests__/commands/YourCommand.test.ts`:

```typescript
import { YourCommand } from '../../commands/YourCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('YourCommand', () => {
  let command: YourCommand;
  let mockDbManager: DatabaseManager;

  beforeEach(() => {
    // Setup mocks
    mockDbManager = {
      query: jest.fn(),
      // ... other methods
    } as any;

    command = new YourCommand(mockDbManager);
  });

  it('should return command name', () => {
    expect(command.getName()).toBe('your-command');
  });

  it('should return description', () => {
    expect(command.getDescription()).toBeTruthy();
  });

  it('should execute successfully with valid args', async () => {
    const result = await command.execute(['valid-arg']);
    expect(result.exitCode).toBe(0);
  });

  it('should fail with invalid args', async () => {
    const result = await command.execute([]);
    expect(result.exitCode).toBe(1);
  });
});
```

**Run tests**:
```bash
npm test -- YourCommand.test.ts
```

---

## Step 7: Document Your Command

### Create Command Documentation

Create `managed/commands/YourCommand.md`:

```markdown
---
title: YourCommand
type: command
category: [category]
status: active
---

# [[YourCommand]]

> **Brief description** of what the command does

Command for [detailed purpose].

## Usage

\`\`\`bash
tsdoc-edge your-command [options] <arguments>
\`\`\`

## Arguments

- `<argument>`: Description

## Options

- `--flag`: Description
- `--option=<value>`: Description

## Examples

### Example 1: Basic Usage

\`\`\`bash
tsdoc-edge your-command example-arg
\`\`\`

### Example 2: With Options

\`\`\`bash
tsdoc-edge your-command --flag example-arg
\`\`\`

## Implementation

**File**: `src/commands/YourCommand.ts`

**Dependencies**:
- [[BaseCommand]] (`src/commands/BaseCommand.ts`)
- [[DatabaseManager]] (`src/storage/DatabaseManager.ts`)

## Related Commands

- [[RelatedCommand1]]
- [[RelatedCommand2]]

## Related Documentation

- [[Feature Name]] - Related feature
- [[Analyzer Name]] - Used analyzer
```

### Index Documentation

Add to `managed/COMMANDS.md`:

```markdown
### your-command

**File**: [[YourCommand]] (`managed/commands/YourCommand.md`)

Brief description.

\`\`\`bash
tsdoc-edge your-command <args>
\`\`\`
```

---

## Best Practices

### 1. Error Handling

**DO**: Return structured errors
```typescript
return { exitCode: 1, error: new Error('Description'), message: 'User message' };
```

**DON'T**: Use process.exit()
```typescript
// ❌ Bad - prevents testing
process.exit(1);
```

### 2. Database Access

**DO**: Accept optional DatabaseManager in constructor
```typescript
constructor(dbManager?: DatabaseManager) {
  this.dbManager = dbManager;
}

// In execute:
const dbManager = this.dbManager || new DatabaseManager(dbPath);
```

**Benefit**: Enables dependency injection for testing

### 3. Output Formatting

**DO**: Use BaseCommand helpers
```typescript
this.printHeader('Main Title');
this.printSection('Section Title');
this.printSuccess('Success message');
this.printError('Error message');
```

**DO**: Use color constants
```typescript
import { colors } from './BaseCommand';
console.log(`${colors.green}Success${colors.reset}`);
```

### 4. Documentation

**DO**: Complete TSDoc
```typescript
/**
 * @public
 * @responsibility What it does
 * @contract Input/output contract
 * @problem What problem it solves
 * @solves How it solves it
 * @functionality Bullet points
 * @depends Dependencies
 */
```

**DO**: Add @doc references
```typescript
/** @doc [[YourCommand]] */
```

### 5. Validation

**DO**: Validate early
```typescript
if (!requiredArg) {
  this.printError('Missing required argument');
  return { exitCode: 1 };
}
```

**DO**: Check prerequisites
```typescript
if (!fs.existsSync(dbPath)) {
  this.printError('Database not found. Run "tsdoc-edge build src" first.');
  return { exitCode: 1 };
}
```

---

## Complete Example: HelloCommand

Here's a complete, simple command:

```typescript
/**
 * Hello Command - Greet the user
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Simple greeting command
 *
 * @public
 * @responsibility Greet user with optional name
 * @contract Takes optional name, outputs greeting
 * @doc [[HelloCommand]]
 *
 * @problem Need simple example command
 * @solves Demonstrates minimal command pattern
 * @context Tutorial and testing
 *
 * @functionality
 * - Greet user
 * - Accept optional name
 * - Show help
 */
export class HelloCommand extends BaseCommand {
  getName(): string {
    return 'hello';
  }

  getDescription(): string {
    return 'Greet the user';
  }

  protected getUsage(): string {
    return `
Usage: tsdoc-edge hello [name]

Arguments:
  [name]    Optional name to greet (default: World)

Options:
  --help    Show this help

Examples:
  tsdoc-edge hello
  tsdoc-edge hello Alice
`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    // Handle help
    if (args.includes('--help')) {
      console.log(this.getUsage());
      return { exitCode: 0 };
    }

    // Get name (default to "World")
    const name = args[0] || 'World';

    // Print greeting
    this.printHeader('TSDoc Edge - Hello');
    console.log(`${colors.green}Hello, ${name}!${colors.reset}`);
    console.log();

    return { exitCode: 0 };
  }
}
```

**To integrate**:

1. Save as `src/commands/HelloCommand.ts`
2. Export in `src/commands/index.ts`:
   ```typescript
   export { HelloCommand } from './HelloCommand';
   ```
3. Import and register in `src/cli.ts`:
   ```typescript
   import { HelloCommand } from './commands/HelloCommand';
   // ...
   registry.register(new HelloCommand());
   ```
4. Build and test:
   ```bash
   npm run build
   node dist/cli.js hello Alice
   ```

---

## Command Categories

### Query Commands

**Purpose**: Read and display information

**Examples**:
- [[DepsCommand]] - Show dependencies
- [[WhoUsesCommand]] - Show reverse dependencies
- [[StatsCommand]] - Show statistics

**Pattern**: Read from database, format output

---

### Analysis Commands

**Purpose**: Analyze code and generate relationships

**Examples**:
- [[AnalyzeCallsCommand]] - Detect function calls
- [[AnalyzeIOCommand]] - Detect data flow
- [[AnalyzeChainsCommand]] - Detect dependency chains

**Pattern**: Load analyzer, run analysis, save results

---

### Build Commands

**Purpose**: Extract symbols and build database

**Examples**:
- [[BuildCommand]] - Build symbol database
- [[ParseCommand]] - Parse single file

**Pattern**: Use [[ASTSymbolExtractor]], save to database

---

### Documentation Commands

**Purpose**: Manage documentation

**Examples**:
- [[IndexDocsCommand]] - Index documentation files
- [[UpdateBacklinksCommand]] - Update backlinks
- [[ValidateDocsCommand]] - Validate documentation

**Pattern**: Load [[DocumentSymbolRegistry]], process docs, save

---

### Validation Commands

**Purpose**: Validate code quality and completeness

**Examples**:
- [[ValidateCommand]] - Full validation
- [[HealthCommand]] - Health check
- [[ValidateSpecCommand]] - Validate specifications

**Pattern**: Run checkers, report issues

---

## Troubleshooting

### Command not found

**Issue**: `Command "your-command" not found`

**Solutions**:
1. Check registration in `cli.ts:main()`
2. Verify export in `commands/index.ts`
3. Rebuild: `npm run build`

---

### Database errors

**Issue**: `Database not found` or `Cannot open database`

**Solutions**:
1. Run `tsdoc-edge build src` first
2. Check `.tsdoc/symbols.db` exists
3. Verify database path in command

---

### Import errors

**Issue**: `Cannot find module` during development

**Solutions**:
1. Use relative imports: `from './BaseCommand'`
2. Check TypeScript paths in `tsconfig.json`
3. Ensure file exists and is exported

---

## Related Documentation

**Core**:
- [[BaseCommand]] (`managed/commands/BaseCommand.md`)
- [[CommandRegistry]] (`managed/commands/CommandRegistry.md`)
- [[CLIRunner]] (`managed/core-components/CLIRunner.md`)

**Examples**:
- [[StatsCommand]] (`managed/commands/StatsCommand.md`)
- [[BuildCommand]] (`managed/commands/BuildCommand.md`)
- [[DepsCommand]] (`managed/commands/DepsCommand.md`)

**Features**:
- [[CoreWorkflow]] (`managed/features/core-workflow.md`)
- [[CLI Commands]] (`managed/CLI-COMMANDS.md`)

**Testing**:
- [[Integration Test Traceability]] (`managed/concepts/integration-test-traceability.md`)

---

**Last Updated**: 2025-11-14
**Guide Type**: Development workflow for creating new CLI commands
**Audience**: Contributors and developers extending TSDoc Edge

---

## Backlinks

### Referenced By

- [[Analyzer Development Guide]] → /home/user/tsdoc-edge/managed/guides/analyzer-development-guide.md:257
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:20
- [[Guides & Tutorials]] → /home/user/tsdoc-edge/managed/guides/index.md:331

