# [[Symbol Reference System]]

TSDoc Edge's three-tier `[[Symbol]]` reference system: H1 primary definitions (SSOT), H2 auxiliary definitions (context-specific), and inline references (links).

## Overview

TSDoc Edge의 `[[Symbol]]` 참조 시스템은 세 가지 방식으로 심볼을 참조하고 정의합니다.

## Three Reference Types

### 1. Primary Definition (H1)

**Syntax**: `# [[Symbol]]`

**Purpose**: Canonical SSOT (Single Source of Truth) 정의

**Rules**:
- 전체 문서 시스템에서 **정확히 1번만** 등장
- 해당 심볼의 공식적이고 완전한 정의
- 다른 모든 참조의 기준점

**Example**:
```markdown
# [[BuildCommand]]

**Source**: `src/commands/BuildCommand.ts`

## Purpose
Extract all symbols and relationships from TypeScript source code.

## Usage
tsdoc-edge build <directory>
```

### 2. Auxiliary Definition (H2)

**Syntax**: `## [[Symbol]]`

**Purpose**: 참조 + 컨텍스트별 설명 오버라이드

**Rules**:
- 여러 문서에서 **여러 번 사용 가능**
- Primary definition을 참조하되, **현재 문서의 컨텍스트에 맞는 추가 설명** 제공
- 반드시 H1 primary definition이 존재해야 함

**Use Cases**:
1. **워크플로우 문서**: 전체 워크플로우 내에서의 역할 설명
2. **가이드 문서**: 특정 사용 시나리오에서의 동작 설명
3. **아키텍처 문서**: 시스템 내에서의 위치와 관계 설명

**Example**:
```markdown
# Mermaid Workflow Guide

...

## [[ParseMermaidCommand]]

In this workflow, ParseMermaidCommand generates H2 reference docs from
.mmd diagram nodes. Unlike normal parsing, it creates auxiliary definitions
that can be promoted to H1 canonical later.
```

이 H2 정의는:
- `ParseMermaidCommand`의 primary definition (H1)을 참조
- 하지만 "Mermaid Workflow" 컨텍스트에서의 특별한 역할을 설명

### 3. Inline Reference

**Syntax**: `[[Symbol]]` (본문에 작성)

**Purpose**: 단순 참조만 (링크 생성)

**Rules**:
- 제한 없이 **몇 번이든 사용 가능**
- Primary definition으로 연결되는 링크
- 추가 설명 없이 단순 언급만

**Example**:
```markdown
The build process uses [[ASTSymbolExtractor]] to parse TypeScript files
and [[DatabaseManager]] to store the results. See [[BuildCommand]] for details.
```

## Comparison Table

| Type | Syntax | Occurrences | Purpose | Adds Content |
|------|--------|-------------|---------|--------------|
| Primary | `# [[Symbol]]` | 1x only | SSOT definition | ✅ Full definition |
| Auxiliary | `## [[Symbol]]` | Multiple OK | Context-specific explanation | ✅ Override explanation |
| Inline | `[[Symbol]]` | Unlimited | Simple reference | ❌ Link only |

## Validation Rules

### Rule 1: Every Reference Needs a Primary
```markdown
✅ Valid:
# [[BuildCommand]]        ← Primary exists
...
Some text [[BuildCommand]]  ← Inline reference OK

❌ Invalid:
Some text [[NonExistent]]   ← Error: missing_primary
```

### Rule 2: Auxiliary Needs Primary
```markdown
✅ Valid:
# [[BuildCommand]]        ← Primary exists
...
## [[BuildCommand]]       ← Auxiliary OK (in different file)
In workflow X, BuildCommand does Y.

❌ Invalid:
## [[NonExistent]]        ← Error: orphaned_auxiliary
```

### Rule 3: Only One Primary
```markdown
❌ Invalid:
# [[BuildCommand]]        ← Primary #1
...
# [[BuildCommand]]        ← Error: duplicate primary
```

## Common Patterns

### Pattern 1: Command Documentation

**Primary** (`managed/commands/BuildCommand.md`):
```markdown
# [[BuildCommand]]

**Source**: `src/commands/BuildCommand.ts`

Complete documentation...
```

**Auxiliary** (`managed/workflows/work-context-workflow.md`):
```markdown
## [[BuildCommand]]

In the work-context workflow, BuildCommand is the first step that populates
the database with symbol information.
```

**Inline** (`managed/README.md`):
```markdown
Use [[BuildCommand]] to extract all symbols before running [[WorkContextCommand]].
```

### Pattern 2: Relationship Type Documentation

**Primary** (`managed/relationships/CODE-DEPENDENCY.md`):
```markdown
# [[Code Dependency]]

**Type**: `code-dependency`
**Status**: ✅ Implemented

Complete relationship specification...
```

**Auxiliary** (`managed/relationships/index.md`):
```markdown
## [[Code Dependency]]

Foundational relationship type. All other relationship types depend on
code-dependency being extracted first.
```

**Inline** (various files):
```markdown
[[Code Dependency]] relationships are extracted by [[ASTSymbolExtractor]].
```

## Error Types

### Error 1: missing_primary
```markdown
Some text [[SymbolName]] here
```
- Inline reference exists
- But no `# [[SymbolName]]` anywhere
- **Fix**: Create primary definition or fix typo

### Error 2: orphaned_auxiliary
```markdown
## [[SymbolName]]
Custom explanation...
```
- Auxiliary definition exists
- But no `# [[SymbolName]]` anywhere
- **Fix**: Create primary definition or convert to inline

### Error 3: duplicate_primary
```markdown
# [[SymbolName]]  ← File 1
...
# [[SymbolName]]  ← File 2
```
- Multiple primary definitions
- **Fix**: Choose canonical, convert others to auxiliary

## Best Practices

### When to Use Primary (H1)
- ✅ Creating new command/analyzer/type documentation
- ✅ Defining a relationship type
- ✅ Documenting a core concept
- ✅ Creating feature documentation

### When to Use Auxiliary (H2)
- ✅ Explaining command's role in a workflow
- ✅ Describing relationship type in taxonomy context
- ✅ Providing use-case specific guidance
- ✅ Adding architecture-level context

### When to Use Inline
- ✅ Mentioning related commands
- ✅ Cross-referencing concepts
- ✅ Linking to dependencies
- ✅ General citations

## Examples from Codebase

### Good: BuildCommand
```markdown
# Primary (commands/BuildCommand.md)
# [[BuildCommand]]
**Source**: `src/commands/BuildCommand.ts`
[Complete docs...]

# Auxiliary (workflows/work-context-workflow.md)
## [[BuildCommand]]
Step 1 in work-context: Extract symbols

# Inline (README.md)
Run [[BuildCommand]] first.
```

### Good: Code Dependency
```markdown
# Primary (relationships/CODE-DEPENDENCY.md)
# [[Code Dependency]]
[Complete relationship spec...]

# Auxiliary (relationships/index.md)
## [[Code Dependency]]
Foundational type, extracted first

# Inline (analyzers/ASTSymbolExtractor.md)
Extracts [[Code Dependency]] relationships
```

## Tooling Support

### Check References
```bash
tsdoc-edge validate-symbol-refs managed
```

### List All Primaries
```bash
cat .tsdoc/doc-symbols.json | jq -r '.symbols[]'
```

### Find Orphaned Auxiliaries
```bash
tsdoc-edge validate-docs managed 2>&1 | grep "orphaned_auxiliary"
```

### Find Missing Primaries
```bash
tsdoc-edge validate-docs managed 2>&1 | grep "missing_primary"
```

## Related

- [[SELF-IMPROVEMENT-PROCESS]]: Complete validation workflow
- [[DocumentSymbolSystem]]: Implementation details
- [[IndexDocsCommand]]: How symbols are indexed

---

## Backlinks

### Referenced By

- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:79
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:80
- [[IndexDocsCommand]] → /home/user/tsdoc-edge/managed/commands/IndexDocsCommand.md:81
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:205
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:242
- [[SymbolFixCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolFixCommand.md:243
- [[SymbolQueryCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolQueryCommand.md:152
- [[SymbolQueryCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolQueryCommand.md:186
- [[SymbolQueryCommand]] → /home/user/tsdoc-edge/managed/commands/SymbolQueryCommand.md:187
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:141
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:205
- [[Document Symbol System]] → /home/user/tsdoc-edge/managed/concepts/document-symbol-system.md:206
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:222
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:237
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:277
- [[Concepts Index]] → /home/user/tsdoc-edge/managed/concepts/index.md:278
- [[SSOT]] → /home/user/tsdoc-edge/managed/concepts/ssot.md:139
- [[SSOT]] → /home/user/tsdoc-edge/managed/concepts/ssot.md:197
- [[SSOT]] → /home/user/tsdoc-edge/managed/concepts/ssot.md:198
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:148
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:193
- [[DocumentSymbolRegistry]] → /home/user/tsdoc-edge/managed/doc-symbols/DocumentSymbolRegistry.md:194
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:122
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:123
- [[DocumentSymbolSystem]] → /home/user/tsdoc-edge/managed/features/document-symbol-system.md:124
- [[Relationship System Roadmap]] → /home/user/tsdoc-edge/managed/workflows/relationship-system-roadmap.md:402
- [[Relationship System Roadmap]] → /home/user/tsdoc-edge/managed/workflows/relationship-system-roadmap.md:446
- [[Relationship System Roadmap]] → /home/user/tsdoc-edge/managed/workflows/relationship-system-roadmap.md:447
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:61
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:78
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:79
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:80
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:81
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:82

