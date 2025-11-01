# Configuration Guide

TSDoc Edge v0.4.0 introduces a flexible configuration system that allows you to customize file storage locations, validation rules, and generation options.

## Quick Start

### 1. Initialize Configuration

```bash
# Create .tsdoc.config.json in your project root
tsdoc-edge init

# With custom options
tsdoc-edge init --name=my-project --version=2.0.0

# Force overwrite existing config
tsdoc-edge init --force
```

This creates a `.tsdoc.config.json` file and all necessary directories.

### 2. Customize Configuration

Edit `.tsdoc.config.json` to suit your needs:

```json
{
  "project": {
    "name": "my-awesome-project",
    "version": "1.0.0",
    "rootDir": ".",
    "srcDirs": ["src", "lib"]
  },
  "paths": {
    "commentsDir": ".tsdoc-comments",
    "databasePath": ".tsdoc.db",
    "jsonlDir": "docs/data",
    "outputDir": "docs/output",
    "generatedDir": "docs/generated",
    "reportsDir": ".tsdoc/reports"
  },
  "fold": {
    "enabled": true,
    "autoExport": false,
    "excludePatterns": ["**/*.test.ts"]
  },
  "validation": {
    "strictMode": false,
    "minConnectivityScore": 70,
    "rules": {}
  },
  "generator": {
    "template": "enhanced",
    "includePrivate": false,
    "includeInternal": false
  }
}
```

## Configuration Options

### Project Settings

```typescript
{
  "project": {
    "name": string,           // Project name
    "version": string,        // Semantic version
    "rootDir": string,        // Root directory (default: ".")
    "srcDirs": string[]       // Source directories (default: ["src"])
  }
}
```

### Storage Paths

All paths are relative to the project root.

```typescript
{
  "paths": {
    "commentsDir": string,    // Markdown storage for folded comments
    "databasePath": string,   // SQLite database file
    "jsonlDir": string,       // JSONL export directory (for Git)
    "outputDir": string,      // Generated documentation output
    "generatedDir": string,   // Auto-generated docs (scan command)
    "reportsDir": string      // Analysis reports (stats, health)
  }
}
```

**Path Purposes:**

| Path | Purpose | Default | Used By |
|------|---------|---------|---------|
| `commentsDir` | Folded TSDoc comments storage | `.tsdoc-comments` | fold/unfold |
| `databasePath` | Symbol database | `.tsdoc.db` | All commands |
| `jsonlDir` | JSONL exports for Git | `docs/data` | export |
| `outputDir` | User documentation | `docs/output` | generate |
| `generatedDir` | Auto-generated analysis docs | `docs/generated` | scan --save |
| `reportsDir` | Statistics and health reports | `.tsdoc/reports` | stats --save |

**Examples:**

```json
{
  "paths": {
    "commentsDir": ".tsdoc",
    "databasePath": "data/tsdoc.db",
    "jsonlDir": "data/jsonl",
    "outputDir": "dist/docs",
    "generatedDir": "docs/generated",
    "reportsDir": ".tsdoc/reports"
  }
}
```

**Note:** `generatedDir` and `reportsDir` are automatically excluded from Git (added to `.gitignore`) to prevent committing temporary analysis files.

### Fold/Unfold System

**⚠️ Note**: CLI commands for fold/unfold are not currently implemented. This feature is available through the API only.

```typescript
{
  "fold": {
    "enabled": boolean,            // Enable fold/unfold (default: true)
    "autoExport": boolean,         // Auto-export on parse (default: false)
    "excludePatterns": string[]    // Glob patterns to exclude
  }
}
```

**API Usage** (programmatic only):

```typescript
import { CommentExporter, CommentImporter } from 'tsdoc-edge';

// Export (fold)
const exporter = new CommentExporter(config);
await exporter.exportFile('src/myFile.ts');

// Import (unfold)
const importer = new CommentImporter(config);
await importer.importFile('src/myFile.ts');
```

**Examples:**

```json
{
  "fold": {
    "enabled": true,
    "autoExport": false,
    "excludePatterns": [
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/node_modules/**"
    ]
  }
}
```

**Future**: CLI commands (`tsdoc-edge fold`, `tsdoc-edge unfold`) are planned for future releases.

### Validation Rules

```typescript
{
  "validation": {
    "strictMode": boolean,              // Enable strict mode (default: false)
    "minConnectivityScore": number,     // Min score 0-100 (default: 70)
    "rules": {
      [ruleName: string]: "error" | "warning" | "info" | "off"
    }
  }
}
```

**Examples:**

```json
{
  "validation": {
    "strictMode": true,
    "minConnectivityScore": 85,
    "rules": {
      "require-documentation": "error",
      "require-tests": "warning",
      "require-responsibility": "info"
    }
  }
}
```

### Generator Options

```typescript
{
  "generator": {
    "template": "basic" | "enhanced" | "strict",  // Template type
    "includePrivate": boolean,                    // Include private symbols
    "includeInternal": boolean                    // Include internal symbols
  }
}
```

**Examples:**

```json
{
  "generator": {
    "template": "strict",
    "includePrivate": false,
    "includeInternal": false
  }
}
```

### Link Checking Options

Configure how the `check-links` command validates documentation references.

```typescript
{
  "linkCheck": {
    "checkTypes": Array<"dependency" | "relatedProblem" | "symbol" | "file">,
    "externalModules": string[],      // External modules to exclude
    "excludePatterns": string[],      // Glob patterns to exclude
    "enableSuggestions": boolean,     // Enable typo suggestions
    "maxSuggestionDistance": number,  // Max Levenshtein distance for suggestions
    "failOnBroken": boolean          // Exit with error code if broken links found
  }
}
```

**Default Configuration:**

```json
{
  "linkCheck": {
    "checkTypes": ["dependency", "relatedProblem", "symbol", "file"],
    "externalModules": ["fs", "path", "typescript", "node:fs", "node:path", "node:util"],
    "excludePatterns": [],
    "enableSuggestions": true,
    "maxSuggestionDistance": 3,
    "failOnBroken": false
  }
}
```

**Examples:**

**1. CI/CD Setup (Fail on Broken Links)**

```json
{
  "linkCheck": {
    "failOnBroken": true,
    "externalModules": [
      "fs", "path", "typescript",
      "node:*",        // All Node.js built-ins
      "@types/*",      // All TypeScript type definitions
      "react", "express"  // Project dependencies
    ]
  }
}
```

**2. Minimal Checking (Dependencies Only)**

```json
{
  "linkCheck": {
    "checkTypes": ["dependency"],
    "enableSuggestions": false
  }
}
```

**3. Custom External Modules**

```json
{
  "linkCheck": {
    "externalModules": [
      "fs", "path", "typescript",
      "node:*",           // All node: prefixed modules
      "@myorg/*",         // All internal packages
      "lodash", "axios"   // Known external dependencies
    ]
  }
}
```

**Using with CLI:**

```bash
# Uses configuration from .tsdoc.config.json
tsdoc-edge check-links src

# Exit code 0: No broken links
# Exit code 1: Broken links found (if failOnBroken: true)
```

**CI/CD Integration:**

```yaml
# .github/workflows/docs.yml
- name: Check Documentation Links
  run: |
    tsdoc-edge check-links src
    # Fails build if broken links found
```

## Programmatic Usage

### Using ConfigManager in Code

```typescript
import { ConfigManager } from 'tsdoc-edge';

// Get singleton instance
const config = ConfigManager.getInstance();

// Read configuration
const projectName = config.get().project.name;
const commentsDir = config.get().paths.commentsDir;

// Resolve paths
const absolutePath = config.resolvePath(commentsDir);
// Returns: /absolute/path/to/project/.tsdoc-comments

// Update configuration
config.update('paths', {
  commentsDir: '.tsdoc-custom'
});

// Validate configuration
const validation = config.validate();
if (!validation.valid) {
  console.error('Invalid config:', validation.errors);
}

// Ensure directories exist
config.ensureDirectories();
```

### Using Config with Other Classes

#### CommentStateManager

```typescript
import { CommentStateManager, ConfigManager } from 'tsdoc-edge';

// Option 1: Use config automatically
const manager = new CommentStateManager();
// Uses config.paths.commentsDir

// Option 2: Override with custom path
const customManager = new CommentStateManager('/custom/path');
```

#### DatabaseManager

```typescript
import { DatabaseManager, ConfigManager } from 'tsdoc-edge';

// Option 1: Use config automatically
const db = new DatabaseManager();
// Uses config.paths.databasePath and config.paths.jsonlDir

// Option 2: Override with custom paths
const customDb = new DatabaseManager('/custom/db.sqlite', '/custom/jsonl');
```

## Common Scenarios

### 1. Different Configs for Different Environments

**Development:**
```json
{
  "paths": {
    "commentsDir": ".tsdoc-dev",
    "databasePath": "dev.db",
    "jsonlDir": "dev/data"
  },
  "validation": {
    "strictMode": false
  }
}
```

**Production:**
```json
{
  "paths": {
    "commentsDir": ".tsdoc",
    "databasePath": "prod.db",
    "jsonlDir": "docs/data"
  },
  "validation": {
    "strictMode": true,
    "minConnectivityScore": 95
  }
}
```

### 2. Monorepo Setup

Each package can have its own config:

```
monorepo/
├── packages/
│   ├── frontend/
│   │   └── .tsdoc.config.json  (commentsDir: ".tsdoc-frontend")
│   ├── backend/
│   │   └── .tsdoc.config.json  (commentsDir: ".tsdoc-backend")
│   └── shared/
│       └── .tsdoc.config.json  (commentsDir: ".tsdoc-shared")
```

### 3. Custom Storage Location

Store all TSDoc data in a separate directory:

```json
{
  "paths": {
    "commentsDir": "tsdoc-storage/comments",
    "databasePath": "tsdoc-storage/db/tsdoc.db",
    "jsonlDir": "tsdoc-storage/jsonl",
    "outputDir": "tsdoc-storage/output"
  }
}
```

Add to `.gitignore`:
```
tsdoc-storage/db/
tsdoc-storage/output/
```

Keep in Git:
```
tsdoc-storage/comments/
tsdoc-storage/jsonl/
```

## Configuration Best Practices

### 1. Version Control

**Always commit:**
- `.tsdoc.config.json` - Project configuration
- `.tsdoc-comments/` - Folded comment states
- `docs/data/` - JSONL exports

**Never commit:**
- `.tsdoc.db` - SQLite database (binary, regenerable)
- `docs/output/` - Generated docs (build artifact)

### 2. Team Collaboration

Create a shared config:
```bash
# Team member 1
tsdoc-edge init --name=team-project
git add .tsdoc.config.json
git commit -m "Add TSDoc config"
git push

# Team member 2
git pull
# Config is automatically loaded
```

### 3. CI/CD Integration

```yaml
# .github/workflows/tsdoc.yml
name: TSDoc Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Validate TSDoc
        run: |
          # Config is loaded automatically
          npm run build
          npx tsdoc-edge validate
```

### 4. Migration from Old Setup

If you have existing TSDoc files without config:

```bash
# 1. Initialize config
tsdoc-edge init --name=existing-project

# 2. Move existing files (if any)
mv .tsdoc-comments-old .tsdoc-comments  # if you had custom location

# 3. Validate
tsdoc-edge validate
```

## Troubleshooting

### Config Not Found

```bash
Error: Config file not found
```

**Solution:**
```bash
tsdoc-edge init
```

### Invalid Config

```bash
Error: Invalid configuration: paths.commentsDir is required
```

**Solution:**
```bash
# Check config
cat .tsdoc.config.json

# Reinitialize
tsdoc-edge init --force
```

### Permission Denied

```bash
Error: EACCES: permission denied, mkdir '.tsdoc.db'
```

**Solution:**
```bash
# Check directory permissions
chmod +w .

# Or change config to use different location
{
  "paths": {
    "databasePath": "/tmp/tsdoc.db"
  }
}
```

## API Reference

### ConfigManager Methods

```typescript
class ConfigManager {
  // Get singleton instance
  static getInstance(projectRoot?: string): ConfigManager

  // Reset singleton (for testing)
  static reset(): void

  // Initialize new config
  init(options?: Partial<TsdocEdgeConfig>, force?: boolean): void

  // Get current config
  get(): TsdocEdgeConfig

  // Save config
  save(config: TsdocEdgeConfig): void

  // Resolve relative path
  resolvePath(relativePath: string): string

  // Check if config exists
  exists(): boolean

  // Create directories
  ensureDirectories(): void

  // Validate config
  validate(): { valid: boolean; errors: string[] }

  // Update section
  update<K extends keyof TsdocEdgeConfig>(
    section: K,
    value: Partial<TsdocEdgeConfig[K]>
  ): void

  // Get config path
  getConfigPath(): string

  // Get project root
  getProjectRoot(): string
}
```

## Examples

See working examples in:
- [examples/config-example.ts](../examples/config-example.ts)
- [demo/config-demo.ts](../demo/config-demo.ts)

---

**Version:** 0.4.0
**Last Updated:** 2025-10-30
