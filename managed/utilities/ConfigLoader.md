# [[ConfigLoader]]

**Source**: `src/utils/ConfigLoader.ts`

## Purpose

Load and validate TSDoc Edge configuration from `.tsdoc.config.json`.

## Configuration File

### File Name
`.tsdoc.config.json` (searched in project root)

### File Location
Search order:
1. Current working directory
2. Parent directories (up to git root)
3. Falls back to DEFAULT_CONFIG

## Loading Process

### 1. File Discovery
```typescript
const loader = new ConfigLoader(baseDir);
// Searches for .tsdoc.config.json
// Returns merged config with defaults
```

### 2. JSON Parsing
- Reads file content
- Parses JSON
- Validates structure

### 3. Config Merging
```typescript
// User config merged with defaults
const merged = mergeConfig(userConfig);
// Deep merge:
// - User values override defaults
// - Missing values use defaults
```

### 4. Path Resolution
- Resolve relative paths
- Make absolute from config dir
- Validate path existence

## Default Configuration

```typescript
const DEFAULT_CONFIG: TsdocEdgeConfig = {
  project: {
    name: 'tsdoc-edge-project',
    version: '1.0.0',
    rootDir: '.',
    srcDirs: ['src'],
    entryPoints: ['src/index.ts']
  },
  paths: {
    output: '.tsdoc',
    docs: 'managed',
    db: '.tsdoc/symbols.db',
    registry: '.tsdoc/registry.jsonl',
    commentsDir: '.tsdoc/comments'
  },
  // ... more defaults
};
```

## Configuration Validation

Validates:
- Required fields present
- Types correct
- Paths valid
- Enum values valid

Throws errors on:
- Invalid JSON syntax
- Missing required fields
- Invalid types
- Malformed paths

## API

### getConfig()
```typescript
const config = loader.getConfig();
// Returns: Full merged config
```

### getConfigPath()
```typescript
const path = loader.getConfigPath();
// Returns: Path to loaded config file or null
```

### reload()
```typescript
loader.reload();
// Re-reads config from disk
```

## Error Handling

### Config Not Found
- Falls back to DEFAULT_CONFIG
- Logs warning (optional)
- Continues execution

### Invalid JSON
- Logs error with details
- Falls back to DEFAULT_CONFIG
- Does not crash

### Invalid Values
- Throws validation error
- Shows which field is invalid
- Suggests fix

## Symbol Count

1 class

## Related

- [[ConfigManager]]: Runtime config management
- [[TsdocEdgeConfig]]: Config type definition
- [[InitCommand]]: Create initial config

---

## Backlinks

### Referenced By

- [[ValidationFeatures]] → /home/user/tsdoc-edge/managed/features/validation-features.md:134

