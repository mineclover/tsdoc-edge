---
title: Circular Dependency
type: relationship
category: quality
status: implemented
canonical: true
relationships-count: 0
---

# [[Circular Dependency]]

> **Type**: `circular` | **Status**: ✅ 0 detected

Detect circular dependencies (`A → B → A`).

**Implementation**: [[DetectCircularTypesCommand]] (`src/commands/DetectCircularTypesCommand.ts`)  
**Command**: `tsdoc-edge detect-circular-types`
