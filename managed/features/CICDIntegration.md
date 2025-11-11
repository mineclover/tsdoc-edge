# [[CI/CD Integration]]

Integrate TSDoc Edge quality checks into CI/CD pipelines.

## Purpose

Enforce documentation and code quality standards automatically in continuous integration workflows, preventing quality regressions.

## Supported Platforms

- **GitHub Actions** (recommended)
- **GitLab CI/CD**
- **Jenkins**
- **CircleCI**
- **Travis CI**
- **Azure Pipelines**

## Quality Gates

### 1. Documentation Coverage
```bash
# Fail build if undocumented symbols exceed threshold
tsdoc-edge undocumented --format json | jq '.count' | \
  awk '{if ($1 > 10) exit 1}'
```

**Threshold**: < 10 undocumented symbols

### 2. Test Coverage Correlation
```bash
# Fail if untested symbols increase
tsdoc-edge untested --format json | jq '.count' | \
  awk '{if ($1 > 20) exit 1}'
```

**Threshold**: < 20 untested symbols

### 3. Orphan Detection
```bash
# Warn if orphaned code detected
tsdoc-edge orphans --format json | jq '.count' | \
  awk '{if ($1 > 5) exit 1}'
```

**Threshold**: < 5 orphaned symbols

### 4. Validation
```bash
# Fail on broken references
tsdoc-edge validate-docs managed --strict
```

**Requirement**: Zero broken references

## GitHub Actions Example

### Basic Workflow
```yaml
# .github/workflows/doc-quality.yml
name: Documentation Quality

on: [push, pull_request]

jobs:
  doc-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build TSDoc Edge
        run: npm run build

      - name: Initialize TSDoc
        run: npx tsdoc-edge init

      - name: Build symbol database
        run: npx tsdoc-edge build src

      - name: Check documentation coverage
        run: |
          UNDOC=$(npx tsdoc-edge undocumented --format json | jq '.count')
          echo "Undocumented symbols: $UNDOC"
          if [ "$UNDOC" -gt 10 ]; then
            echo "❌ Too many undocumented symbols"
            exit 1
          fi

      - name: Validate documentation
        run: npx tsdoc-edge validate-docs managed
```

### Advanced Workflow with Comparisons
```yaml
# .github/workflows/doc-quality-advanced.yml
name: Advanced Doc Quality

on: [pull_request]

jobs:
  doc-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for comparison

      - name: Setup
        run: npm install && npm run build

      - name: Check main branch stats
        run: |
          git checkout main
          npx tsdoc-edge init
          npx tsdoc-edge build src
          npx tsdoc-edge stats --save main-baseline

      - name: Check PR branch stats
        run: |
          git checkout ${{ github.head_ref }}
          npx tsdoc-edge build src
          npx tsdoc-edge stats --compare main-baseline --warnings-only
```

## Pre-commit Hook

### Installation
```bash
# .git/hooks/pre-commit
#!/bin/bash

echo "Running TSDoc Edge quality checks..."

# Quick validation
npx tsdoc-edge validate-docs managed --quiet

if [ $? -ne 0 ]; then
  echo "❌ Documentation validation failed"
  echo "Run: tsdoc-edge validate-docs managed"
  exit 1
fi

echo "✅ Documentation validation passed"
```

### Make executable
```bash
chmod +x .git/hooks/pre-commit
```

## GitLab CI Example

```yaml
# .gitlab-ci.yml
stages:
  - test
  - quality

doc-quality:
  stage: quality
  image: node:18
  script:
    - npm install
    - npm run build
    - npx tsdoc-edge init
    - npx tsdoc-edge build src
    - npx tsdoc-edge undocumented
    - npx tsdoc-edge validate-docs managed
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
```

## Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
  agent any

  stages {
    stage('Doc Quality') {
      steps {
        sh 'npm install'
        sh 'npm run build'
        sh 'npx tsdoc-edge init'
        sh 'npx tsdoc-edge build src'

        script {
          def undoc = sh(
            script: 'npx tsdoc-edge undocumented --format json | jq .count',
            returnStdout: true
          ).trim().toInteger()

          if (undoc > 10) {
            error("Too many undocumented symbols: ${undoc}")
          }
        }
      }
    }
  }
}
```

## Quality Metrics

Track over time:
```bash
# Save baseline
tsdoc-edge stats --save "v${VERSION}"

# Compare in CI
tsdoc-edge stats --compare "v${PREVIOUS_VERSION}" --format json
```

### Metrics to Track
- Documentation coverage %
- Undocumented symbol count
- Test coverage correlation
- Orphaned code count
- Broken reference count

## Commands for CI/CD

- **[[UndocumentedCommand]]**: Check documentation coverage
- **[[UntestedCommand]]**: Check test correlation
- **[[StatsCommand]]**: Track metrics over time
- **[[ValidateSymbolRefsCommand]]**: Validate documentation
- **[[OrphansCommand]]**: Detect dead code

## Best Practices

### 1. Incremental Checks
Only check changed files to speed up CI:
```bash
git diff --name-only main...HEAD | \
  grep '\.ts$' | \
  xargs tsdoc-edge validate
```

### 2. Progressive Enhancement
Start with warnings, gradually enforce:
```bash
# Week 1-2: Log only
tsdoc-edge undocumented || true

# Week 3-4: Warn
tsdoc-edge undocumented && echo "⚠️ Warning"

# Week 5+: Enforce
tsdoc-edge undocumented
```

### 3. Caching
Cache TSDoc database between runs:
```yaml
- uses: actions/cache@v3
  with:
    path: .tsdoc/
    key: tsdoc-${{ hashFiles('src/**/*.ts') }}
```

## Related

- **[[UndocumentedCommand]]**: Documentation checks
- **[[UntestedCommand]]**: Test coverage checks
- **[[StatsCommand]]**: Metrics tracking
- **[[ValidateSymbolRefsCommand]]**: Validation

---

**Status**: Active
**Integration Effort**: Low (< 1 hour setup)
**Maintenance**: Minimal

---

## Backlinks

### Referenced By

- [[OrphansCommand]] → /home/user/tsdoc-edge/managed/commands/OrphansCommand.md:156
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:169
- [[StatsCommand]] → /home/user/tsdoc-edge/managed/commands/StatsCommand.md:170
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:143
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:144
- [[UndocumentedCommand]] → /home/user/tsdoc-edge/managed/commands/UndocumentedCommand.md:145
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:160
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:161
- [[UntestedCommand]] → /home/user/tsdoc-edge/managed/commands/UntestedCommand.md:162
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:42
- [[ValidateSymbolRefsCommand]] → /home/user/tsdoc-edge/managed/commands/ValidateSymbolRefsCommand.md:43
- [[Dead Code Detection]] → /home/user/tsdoc-edge/managed/features/DeadCodeDetection.md:118

