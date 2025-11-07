---
title: Symbol Convention Guide
type: guide
category: meta
status: active
---

# Symbol Convention Guide

## Overview

TSDoc Edge uses `[[Symbol]]` notation to create a connected documentation graph. This guide defines the **hierarchy and conventions** for symbol definitions.

## Hierarchy: H1 vs H2

### H1 = Canonical Definition (SSOT)

```markdown
# [[Symbol Name]]
```

**Rules:**
- ✅ **Exactly ONE per symbol** across entire documentation
- ✅ This is the **Single Source of Truth (SSOT)**
- ✅ Contains complete, authoritative documentation
- ✅ Manually created and maintained
- ✅ `canonical: true` in frontmatter

**Purpose:** Primary definition that all references point to

**Location:** Usually in `managed/relationships/symbol-name.md`

### H2 = Reference Definition (Non-Canonical)

```markdown
## [[Symbol Name]]
```

**Rules:**
- ✅ **Multiple allowed** (safe, no conflicts)
- ✅ Generated from `.mmd` diagrams
- ✅ Auxiliary/reference documentation
- ✅ `canonical: false` in frontmatter
- ✅ Contains partial info or diagram context

**Purpose:** Supplementary definitions, diagram-generated references

**Location:** Can exist in multiple files

### Inline Reference

```markdown
See [[Symbol Name]] for details.
```

**Rules:**
- ✅ **Unlimited usage**
- ✅ Points to canonical H1 definition
- ✅ Used in prose, lists, diagrams

**Purpose:** Cross-reference to canonical definition

## Validation Rules

### Rule 1: Single Canonical H1

```bash
# ❌ ERROR: Multiple H1 definitions
# File A: # [[Code Dependency]]
# File B: # [[Code Dependency]]
# → ERROR: Duplicate canonical definition

# ✅ OK: One H1, multiple H2
# File A: # [[Code Dependency]]  (canonical)
# File B: ## [[Code Dependency]] (reference)
# File C: ## [[Code Dependency]] (reference)
```

### Rule 2: All References Must Resolve

```bash
# ❌ ERROR: Broken reference
See [[NonExistent Symbol]] for details.
# → ERROR: Symbol not defined as H1

# ✅ OK: Valid reference
See [[Code Dependency]] for details.
# → Resolves to managed/relationships/code-dependency.md
```

### Rule 3: Exact Name Match

```bash
# ❌ ERROR: Case mismatch
# H1: # [[Code Dependency]]
# Reference: [[code-dependency]]
# → ERROR: Case mismatch

# ✅ OK: Exact match
# H1: # [[Code Dependency]]
# Reference: [[Code Dependency]]
```

## Workflow

### 1. Parse Mermaid → Generate H2 References

```bash
# Parse .mmd diagram
tsdoc-edge parse-mermaid diagram.mmd --generate-docs

# Output: H2 reference docs (canonical: false)
# managed/relationships/code-dependency.md
# ---
# canonical: false
# generated-from: mermaid-diagram
# ---
# # Reference: Code Dependency
# ## [[Code Dependency]]
```

### 2. Promote H2 → H1 (Manual)

When ready to make canonical:

```markdown
# Before (H2 reference)
---
title: Code Dependency
type: reference
canonical: false
generated-from: mermaid-diagram
---
# Reference: Code Dependency
## [[Code Dependency]]

# After (H1 canonical)
---
title: Code Dependency
type: relationship
canonical: true
---
# [[Code Dependency]]
```

**Steps:**
1. Change `# Reference: X` → `# [[X]]`
2. Update `type: reference` → `type: relationship`
3. Change `canonical: false` → `canonical: true`
4. Fill in all TODO sections
5. Add implementation details

### 3. Validate Symbol Consistency

```bash
# Check all [[Symbol]] references
tsdoc-edge validate-symbol-refs managed

# Reports:
# - Duplicate H1 definitions (ERROR)
# - Broken references (ERROR)
# - H2 references without H1 (WARNING)
```

## Frontmatter Fields

### Canonical H1 Document

```yaml
---
title: Code Dependency
type: relationship           # or: feature, guide, architecture
category: structural
status: implemented
canonical: true              # This is THE definition
implementation-progress: 100%
relationships-count: 1968
---
```

### Non-Canonical H2 Document

```yaml
---
title: Code Dependency
type: reference              # Not canonical
category: structural
status: planned
canonical: false             # This is a reference
generated-from: mermaid-diagram
---
```

## Symbol Naming Conventions

### File Naming

```bash
# Symbol: [[Code Dependency]]
# File: managed/relationships/code-dependency.md
#
# Convention:
# 1. Lowercase
# 2. Replace spaces with hyphens
# 3. Remove special characters
# 4. Keep only [a-z0-9-]
```

### Symbol Name Format

```bash
# ✅ Good: Title Case, Clear
[[Code Dependency]]
[[IO Dependency]]
[[Test Coverage]]

# ❌ Bad: Inconsistent casing
[[code-dependency]]
[[Code dependency]]
[[CODE_DEPENDENCY]]
```

## Examples

### Example 1: Canonical Definition

**File:** `managed/relationships/code-dependency.md`

```markdown
---
title: Code Dependency
type: relationship
canonical: true
status: implemented
---

# [[Code Dependency]]

> **Type**: `code-dependency`
> **Category**: Structural
> **Status**: ✅ Implemented

## Purpose

Track explicit import/export dependencies...

## Implementation

**File**: `src/analyzer/ASTSymbolExtractor.ts:216-246`

[Complete implementation details...]
```

### Example 2: H2 Reference (Generated)

**File:** `managed/diagrams/dependency-overview.md`

```markdown
---
title: Dependency Overview
type: reference
canonical: false
generated-from: mermaid-diagram
---

# Reference: Dependency Types

## [[Code Dependency]]

Auto-generated from Mermaid diagram.

See canonical definition at [[Code Dependency]].

## [[IO Dependency]]

[Another H2 reference...]
```

### Example 3: Inline References

```markdown
The [[Code Dependency]] analyzer tracks imports.
It works with [[IO Dependency]] to build
the complete [[Pipeline]] chain.
```

## Troubleshooting

### Issue: Duplicate H1 Definitions

```bash
# Error
Symbol [[Code Dependency]] defined in:
- managed/relationships/code-dependency.md
- managed/features/code-tracking.md

# Solution
Keep only ONE H1 definition. Change one to H2:
# [[Code Dependency]] → ## [[Code Dependency]]
```

### Issue: H2 Without H1

```bash
# Warning
Symbol [[New Feature]] used but never defined as H1

# Solution
Either:
1. Create canonical H1: managed/relationships/new-feature.md
2. Or remove H2 references (if not needed)
```

### Issue: Broken References

```bash
# Error
Reference to [[Nonexistent]] but symbol not defined

# Solution
tsdoc-edge validate-symbol-refs managed
# → Shows suggestions with Levenshtein distance
```

## Benefits of H1/H2 Distinction

1. **Safe Generation**: H2 docs can be regenerated without conflicts
2. **Clear Intent**: H1 = authoritative, H2 = supplementary
3. **Flexible Workflow**: Generate references, promote when ready
4. **No Collisions**: Multiple .mmd files can reference same symbols
5. **Audit Trail**: `canonical` flag shows documentation status

## Related

- [[Relationship Types]]: Master index of all relationship types
- [[Dependency Meta-Structure]]: Visualization of relationship taxonomy
- `tsdoc-edge validate-symbol-refs`: Validation command
- `tsdoc-edge parse-mermaid`: H2 generation command
