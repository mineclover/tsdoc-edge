# [[InitCommand]]

**Source**: `src/commands/Phase4Commands.ts:153`

## Purpose

Initialize TSDoc Edge configuration for a new project by creating `.tsdoc.config.json` and setting up required directories.

## Usage

```bash
tsdoc-edge init [options]
```

### Options

- `--name=<project-name>`: Set project name (default: current directory name)
- `--version=<version>`: Set project version (default: "1.0.0")
- `--force`: Overwrite existing configuration file

## Examples

### Basic Initialization

```bash
# Initialize with defaults
tsdoc-edge init

# Output:
# ✅ Configuration file created successfully!
#
# Configuration file:
#    /path/to/project/.tsdoc.config.json
#
# Project Settings:
#    Name: my-project
#    Version: 1.0.0
```

### Custom Project Name

```bash
tsdoc-edge init --name=my-awesome-lib --version=2.1.0
```

### Force Overwrite

```bash
# Overwrite existing configuration
tsdoc-edge init --force
```

## What It Does

### 1. Creates Configuration File

Generates `.tsdoc.config.json` with default settings:

```json
{
  "project": {
    "name": "my-project",
    "version": "1.0.0"
  },
  "paths": {
    "commentsDir": ".tsdoc/comments",
    "databasePath": ".tsdoc/symbols.db",
    "jsonlDir": ".tsdoc/jsonl",
    "outputDir": ".tsdoc/output"
  },
  "parsing": {
    "includePrivate": false,
    "includeInternal": false
  },
  "storage": {
    "enableJsonl": true,
    "enableDatabase": true
  }
}
```

### 2. Creates Required Directories

Automatically creates directory structure:

```
.tsdoc/
├── comments/      # TSDoc comment storage
├── jsonl/         # JSONL export files
├── output/        # Analysis output
└── symbols.db     # SQLite database
```

### 3. Provides Next Steps

Displays guided next steps:
```
Next steps:
  1. Customize your configuration in .tsdoc.config.json
  2. Build database: tsdoc-edge build src
  3. Validate your project: tsdoc-edge validate
```

## Configuration File

### Project Section

```json
{
  "project": {
    "name": "my-project",    // Project identifier
    "version": "1.0.0"        // Semantic version
  }
}
```

### Paths Section

```json
{
  "paths": {
    "commentsDir": ".tsdoc/comments",      // TSDoc comment storage
    "databasePath": ".tsdoc/symbols.db",   // SQLite database
    "jsonlDir": ".tsdoc/jsonl",            // JSONL exports
    "outputDir": ".tsdoc/output"           // Analysis results
  }
}
```

### Parsing Section

```json
{
  "parsing": {
    "includePrivate": false,    // Parse @private symbols
    "includeInternal": false    // Parse @internal symbols
  }
}
```

### Storage Section

```json
{
  "storage": {
    "enableJsonl": true,      // Export to JSONL (version control)
    "enableDatabase": true    // Store in SQLite (fast queries)
  }
}
```

## Workflow Integration

### Initial Project Setup

```bash
# 1. Initialize configuration
tsdoc-edge init --name=my-lib

# 2. Customize settings (optional)
vi .tsdoc.config.json

# 3. Build symbol database
tsdoc-edge build src

# 4. Validate project
tsdoc-edge validate
```

### Add to Existing Project

```bash
# 1. Initialize (force if needed)
tsdoc-edge init --force

# 2. Build from existing source
tsdoc-edge build src

# 3. Generate documentation
tsdoc-edge index-docs managed
```

## Implementation Details

### Directory Creation

```typescript
// From ConfigManager
ensureDirectories(): void {
  const config = this.get();
  const dirs = [
    config.paths.commentsDir,
    config.paths.jsonlDir,
    config.paths.outputDir,
    path.dirname(config.paths.databasePath)
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}
```

### Configuration Detection

```typescript
// Check if already initialized
if (configManager.exists() && !hasForce) {
  return this.failure('Configuration already exists');
}
```

### Default Values

```typescript
const projectName = nameArg
  ? nameArg.split('=')[1]
  : path.basename(process.cwd());

const projectVersion = versionArg
  ? versionArg.split('=')[1]
  : '1.0.0';
```

## Error Handling

### Configuration Already Exists

```bash
$ tsdoc-edge init

⚠️  Configuration file already exists at:
    /path/to/project/.tsdoc.config.json

Use --force to overwrite the existing configuration.
```

**Solution**: Use `--force` flag to overwrite.

### Invalid Options

```bash
$ tsdoc-edge init --name=

❌ Invalid project name
```

**Solution**: Provide valid project name.

## Configuration Options

### Minimal Configuration

```json
{
  "project": {
    "name": "my-project",
    "version": "1.0.0"
  }
}
```

### Full Configuration

```json
{
  "project": {
    "name": "my-project",
    "version": "1.0.0"
  },
  "paths": {
    "commentsDir": ".tsdoc/comments",
    "databasePath": ".tsdoc/symbols.db",
    "jsonlDir": ".tsdoc/jsonl",
    "outputDir": ".tsdoc/output"
  },
  "parsing": {
    "includePrivate": false,
    "includeInternal": false,
    "excludePatterns": ["**/*.test.ts", "**/*.spec.ts"]
  },
  "storage": {
    "enableJsonl": true,
    "enableDatabase": true
  },
  "documentSymbols": {
    "enabled": true,
    "docsDir": "managed"
  },
  "validation": {
    "strictMode": false,
    "requireExamples": false
  }
}
```

## Best Practices

### 1. Initialize Early

```bash
# First command in new project
git init
npm init -y
tsdoc-edge init
```

### 2. Version Control Configuration

```bash
# Add to git
git add .tsdoc.config.json
git commit -m "chore: Initialize TSDoc Edge configuration"

# Ignore generated files
echo ".tsdoc/symbols.db" >> .gitignore
echo ".tsdoc/output/" >> .gitignore
```

### 3. CI/CD Integration

```yaml
# .github/workflows/docs.yml
- name: Initialize TSDoc Edge
  run: tsdoc-edge init --name=${{ github.event.repository.name }}

- name: Build symbol database
  run: tsdoc-edge build src
```

## Related Commands

- [[BuildCommand]]: Build symbol database after initialization
- [[ValidateCommand]]: Validate project after setup
- [[HealthCommand]]: Check project health
- [[ConfigManager]]: Configuration management

## Configuration Manager

### Singleton Pattern

```typescript
const configManager = ConfigManager.getInstance();

// Check if initialized
if (configManager.exists()) {
  const config = configManager.get();
  console.log(config.project.name);
}
```

### Methods

| Method | Purpose |
|--------|---------|
| `init()` | Create configuration file |
| `exists()` | Check if config exists |
| `get()` | Load configuration |
| `ensureDirectories()` | Create required directories |
| `getConfigPath()` | Get config file path |

## See Also

- Configuration file structure
- Project initialization workflow
- Directory structure conventions
- [[ConfigManager]] implementation

---

## Backlinks

### Referenced By

- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:84
- [[BuildCommand]] → /home/user/tsdoc-edge/managed/commands/BuildCommand.md:85
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:43
- [[HealthCommand]] → /home/user/tsdoc-edge/managed/commands/HealthCommand.md:44
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:33
- [[ValidateCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateCommand.md:34
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:33
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:34
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:35
- [[ConfigManager]] → /home/user/tsdoc-edge/managed/config/ConfigManager.md:36
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:60
- [[CoreWorkflow]] → /home/user/tsdoc-edge/managed/features/core-workflow.md:171
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:81
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:86
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:116
- [[TsdocEdgeConfig]] → /home/user/tsdoc-edge/managed/primary-types/TsdocEdgeConfig.md:117
- [[ConfigLoader]] → /home/user/tsdoc-edge/managed/utilities/ConfigLoader.md:92
- [[ConfigLoader]] → /home/user/tsdoc-edge/managed/utilities/ConfigLoader.md:100

