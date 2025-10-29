# Dependency Tracking System

**Status:** approved
**Author:** System
**Created:** 2025-10-29
**Tags:** dependencies, graph, analysis

## Purpose

코드의 **의도된 의존성**을 TSDoc으로 명시하고, 고아 코드를 탐지하며,
아키텍처 드리프트를 검증합니다.

## Why Not Static Analysis?

정적 분석의 한계:

```typescript
// 1. 동적 import
const name = config.getParser();
const Parser = await import(`./${name}`);  // ❌ 추적 불가

// 2. 조건부 의존성
if (isDev) {
  const DevTools = require('./devtools');  // ❌ 조건부
}

// 3. Re-export 지옥
export * from './a';
export { B as C } from './b';  // ❌ 복잡한 경로

// 4. Type vs Runtime
import type { Config } from './config';     // ⚠️ 타입만
import { loadConfig } from './config';      // ✅ 런타임
```

**결론:** 100% 정확한 정적 분석은 불가능. 개발자가 **의도**를 명시하는 것이 더 가치 있음.

## TSDoc-based Approach

```typescript
/**
 * @id 003
 * @uses 002 - Parse TSDoc comments before validation
 * @uses 004 - Store validation results in database
 */
class ConventionValidator {
  constructor(
    private parser: TSDocParser,     // 002
    private db: DatabaseManager      // 004
  ) {}
}
```

**Benefits:**
- **Why dependency exists** (이유 명시)
- **Intended architecture** (의도된 설계)
- **Manual but valuable** (수동이지만 가치 있음)

## Core Component

### SymbolRegistryManager `{001}`

**Dependency Methods:**

```typescript
// 의존성 추가
addDependency(
  fromId: string,
  toId: string,
  reason: string,
  type?: 'runtime' | 'type-only' | 'dev'
): boolean

// 의존성 조회
getDependencies(id: string): DependencyRelation[]

// 역 의존성 (누가 사용하는지)
getUsedBy(id: string): Array<{fromId, reason, type}>

// 그래프 추출
getDependencyGraph(): Map<string, string[]>

// 고아 심볼 탐지
findOrphans(): string[]
```

## TSDoc Tags

### @uses Tag

**Syntax:**
```
@uses <targetId> - <reason>
```

**Example:**
```typescript
/**
 * @id 003
 * @uses 002 - Parse TSDoc comments to get structured data
 * @uses 004 - Store parsed results for later query
 */
class Validator {
  validate(file: string) {
    const parsed = this.parser.parse(file);  // uses 002
    this.db.insert(parsed);                  // uses 004
  }
}
```

### @usedBy Tag (Optional)

역방향 명시 (선택사항, 대부분 자동 추론 가능)

```typescript
/**
 * @id 002
 * @usedBy 003 - Validator depends on parsing
 */
class TSDocParser { }
```

## CLI Commands

### 1. Show Dependencies

```bash
$ tsdoc-edge deps 003
================================================================================
Dependencies of 003 (ConventionValidator)
================================================================================

002 [runtime] → TSDocParser
  Reason: Parse TSDoc comments before validation
  Location: src/parser/TSDocParser.ts

004 [runtime] → DatabaseManager
  Reason: Store validation results in database
  Location: src/storage/DatabaseManager.ts

Total: 2 dependencies
```

### 2. Show Reverse Dependencies

```bash
$ tsdoc-edge used-by 002
================================================================================
Used By 002 (TSDocParser)
================================================================================

003 [runtime] → ConventionValidator
  Reason: Parse TSDoc comments before validation
  Location: src/validator/ConventionValidator.ts

005 [type-only] → MarkdownGenerator
  Reason: Access parsed doc comment types
  Location: src/generator/MarkdownGenerator.ts

Total: 2 usages
```

### 3. Find Orphans

```bash
$ tsdoc-edge orphans
================================================================================
Orphaned Symbols
================================================================================

Found 1 orphaned symbols:

007 → Helper
  Location: src/utils/Helper.ts

⚠️  This symbol has no dependencies and is not used by any other symbol.
    Consider:
    - Adding @uses tags if it depends on something
    - Or removing if it's dead code
```

## Dependency Types

| Type | Meaning | Example |
|------|---------|---------|
| `runtime` | 실제 런타임 의존성 | `new Parser()`, `parser.parse()` |
| `type-only` | TypeScript 타입만 | `import type { Config }` |
| `dev` | 개발/테스트 의존성 | `import { mock } from 'jest'` |

## Workflow

### 1. Adding Dependencies

```bash
# 방법 1: TSDoc 태그 (권장)
/**
 * @id 010
 * @uses 002 - Parse configuration files
 */

# 방법 2: CLI (프로그래밍 방식)
$ tsdoc-edge id add-dep 010 002 "Parse configuration files"
```

### 2. Updating Dependencies

```typescript
// 코드 변경 시
class Validator {
  // Before: depends on Parser
  constructor(private parser: Parser) {}

  // After: depends on both Parser and Cache
  constructor(
    private parser: Parser,
    private cache: Cache
  ) {}
}

// TSDoc 업데이트
/**
 * @id 003
 * @uses 002 - Parse TSDoc comments
 * @uses 011 - Cache parsed results  // ← NEW
 */
```

### 3. Analyzing Graph

```bash
# Orphan 검사
$ tsdoc-edge orphans
Found 1 orphaned symbols:
  007 → Helper

# 특정 심볼의 전체 의존성 트리
$ tsdoc-edge deps 003 --recursive
003 (ConventionValidator)
  ├─ 002 (TSDocParser)
  │   └─ 001 (SymbolRegistryManager)
  └─ 004 (DatabaseManager)
      └─ 001 (SymbolRegistryManager)
```

## Use Cases

### 1. Code Review

```bash
# PR에서 새로운 의존성 검사
$ git diff main...feature | grep "@uses"
+  * @uses 012 - New HTTP client dependency

# 의존성 증가 확인
$ tsdoc-edge id stats
Total Dependencies: 45 → 47 (+2)
```

### 2. Refactoring Safety

```bash
# 심볼 삭제 전 사용처 확인
$ tsdoc-edge used-by 008
Used By 008:
  003 → ConventionValidator
  005 → MarkdownGenerator

⚠️  Cannot safely delete 008 (2 usages)
```

### 3. Architecture Validation

```bash
# Layer 의존성 검증
# Rule: Parser layer should not depend on Database layer

$ tsdoc-edge deps 002 | grep -i database
❌ VIOLATION: 002 (Parser) → 004 (Database)
   Reason: Cache query results

# 설계 원칙 위반 탐지
```

### 4. Onboarding

```bash
# 새 개발자가 진입점 파악
$ tsdoc-edge deps 000 --tree
000 (IdGenerator)
  (No dependencies - Pure utility)

$ tsdoc-edge used-by 000
Used By 000:
  001 → SymbolRegistryManager (ID 생성에 사용)

# "IdGenerator는 다른 것에 의존하지 않는 순수 유틸"
# "SymbolRegistryManager가 ID 생성에 사용"
```

## Best Practices

### 1. Always Specify Reason

```typescript
// ❌ Bad: 이유 없음
/**
 * @uses 002
 */

// ✅ Good: 명확한 이유
/**
 * @uses 002 - Parse TSDoc comments to extract metadata
 */
```

### 2. Update on Code Change

```typescript
// 코드 변경 시 TSDoc도 함께 업데이트
constructor(
  private parser: Parser,    // @uses 002
  private cache: Cache       // @uses 011 ← 이것도 추가!
) {}
```

### 3. Periodic Orphan Check

```bash
# CI/CD에서 자동 실행
$ tsdoc-edge orphans
if [ $? -ne 0 ]; then
  echo "❌ Orphaned symbols found"
  exit 1
fi
```

### 4. Document Type

```typescript
// 타입만 사용하는 경우 명시
/**
 * @uses 006 [type-only] - Type definitions for configuration
 */
import type { Config } from './config';
```

## Integration with Features

### Feature Documents

기능 문서에서 의존성 그래프 참조:

```markdown
# Feature: Validation Pipeline

## Architecture

{003} depends on:
- {002} for parsing
- {004} for storage

Flow: Input → {002} → {003} → {004} → Output
```

### Test Coverage

```typescript
/**
 * @id 003
 * @uses 002 - Parse TSDoc
 * @test 003.test.ts - Unit tests with mocked parser
 */
```

## Limitations

1. **Manual maintenance:** @uses 태그를 수동으로 작성해야 함
2. **No auto-detection:** Import문에서 자동 추출 안 함
3. **Trust-based:** 개발자가 정확히 명시한다고 가정

## Future Enhancements

### 1. Hybrid Approach

```bash
# Import 자동 스캔 + TSDoc 보완
$ tsdoc-edge analyze --hybrid
Found 10 imports in src/validator.ts
✅ 5 documented in TSDoc
⚠️  5 missing @uses tags:
  - Logger (src/utils/logger.ts)
  - ...
```

### 2. Architecture Rules

```yaml
# .tsdoc/rules.yml
layers:
  - name: parser
    can_depend_on: [utils]
    cannot_depend_on: [database, storage]
```

```bash
$ tsdoc-edge validate-architecture
❌ VIOLATION: Parser (002) → Database (004)
```

### 3. Dependency Drift

```bash
# 의도된 의존성 vs 실제 import
$ tsdoc-edge drift
⚠️  Drift detected:
  003 (Validator) documents @uses 002
  But actual imports: 002, 012, 013
  Missing @uses: 012, 013
```

## Related Components

- {000} - IdGenerator
- {001} - SymbolRegistryManager (의존성 저장/조회)
- {002} - TSDocParser (@ uses 태그 파싱)
