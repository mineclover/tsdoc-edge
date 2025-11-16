---
title: Fallback
type: relationship
category: alternative
status: planned
canonical: true
phase: 2
---

# [[Fallback]]

> **Type**: `fallback` | **Status**: ⏳ Phase 2 (Not Implemented)

Track fallback relationships where B is used if A fails.

## Definition

**Fallback** relationships capture error recovery strategies where an alternative implementation is used when the primary fails.

**Pattern**: `Try A, if fails use B`

**Key Characteristics**:
- **Primary-Secondary**: A is preferred, B is backup
- **Error-Triggered**: B used only on A's failure
- **Resilience**: Improves system reliability
- **Degradation**: May have reduced functionality

## Category

**Category**: `alternative`
**Direction**: `unidirectional` (A → B, A is primary)
**Strength**: `medium` (conditional dependency)

## Examples

### 1. **Cache Fallback**
```typescript
async function getData(key: string) {
  try {
    return await cache.get(key);  // Try cache first
  } catch {
    return await database.get(key);  // Fallback to database
  }
}
```

### 2. **Service Fallback**
```typescript
async function fetchUser(id: string) {
  try {
    return await primaryAPI.getUser(id);  // Primary service
  } catch {
    return await backupAPI.getUser(id);   // Fallback service
  }
}
```

### 3. **Configuration Fallback**
```typescript
const config =
  process.env.CONFIG_PATH ||           // Try environment variable
  './config.json' ||                   // Fallback to local file
  getDefaultConfig();                  // Final fallback
```

### 4. **Retry with Degradation**
```typescript
async function processData(data: any) {
  try {
    return await advancedProcessor.process(data);  // Full features
  } catch {
    return await basicProcessor.process(data);     // Reduced features
  }
}
```

## Detection Strategies

### 1. **Try-Catch Patterns**
```typescript
try {
  primary();
} catch {
  fallback();  // Fallback detected
}
```

### 2. **Null Coalescing**
```typescript
const value = primarySource() ?? fallbackSource();  // Fallback chain
```

### 3. **Conditional Logic**
```typescript
if (primaryAvailable()) {
  return primary();
} else {
  return fallback();
}
```

### 4. **Promise Rejection Handling**
```typescript
Promise.resolve(primary())
  .catch(() => fallback());  // Fallback on rejection
```

## Planned Implementation

### Command: `tsdoc-edge analyze-fallback`

**Usage**:
```bash
# Detect fallback relationships
tsdoc-edge analyze-fallback

# Validate fallback chains
tsdoc-edge analyze-fallback --validate-chains

# Find missing fallbacks
tsdoc-edge analyze-fallback --find-missing
```

### Storage Schema

```typescript
{
  type: 'fallback',
  from: 'CacheStorage',
  to: 'DatabaseStorage',
  direction: 'unidirectional',
  strength: 'medium',
  category: 'alternative',
  properties: {
    fallbackTrigger: 'error',
    degradation: 'performance',
    fallbackChain: ['cache', 'database', 'default']
  }
}
```

## Fallback Patterns

### 1. **Simple Fallback**
```typescript
const result = tryPrimary() || fallback();
```

### 2. **Fallback Chain**
```typescript
const result =
  tryFirst() ||
  trySecond() ||
  tryThird() ||
  default;
```

### 3. **Async Fallback**
```typescript
const result = await primary().catch(() => fallback());
```

### 4. **Timeout Fallback**
```typescript
const result = await Promise.race([
  primary(),
  timeout(1000).then(() => fallback())
]);
```

## Use Cases

1. **Resilience Engineering**: Handle service failures gracefully
2. **Performance Optimization**: Fast path with slow fallback
3. **Data Sources**: Multiple data source fallbacks
4. **Configuration**: Environment-specific fallbacks

## Differs From

| Relationship | Difference |
|--------------|------------|
| **Substitution** | Substitution is equal choice, Fallback is primary-secondary |
| **Alternative** | Alternative is OR, Fallback is IF-THEN |

## Benefits

1. **Reliability**: System continues despite failures
2. **Graceful Degradation**: Reduced functionality vs total failure
3. **User Experience**: Transparent error recovery
4. **Availability**: Higher uptime

## Validation

```typescript
// ✅ Good fallback
try {
  return await fastButUnreliable();
} catch {
  return await slowButReliable();  // Clear fallback path
}

// ❌ Bad fallback (infinite loop risk)
try {
  return await service();
} catch {
  return await service();  // Same service, will fail again!
}
```

## Related

- [[Substitution]] (`substitution.md`): Equal alternatives
- [[Error Handling]]: Exception handling patterns
- [[Resilience]]: System reliability patterns

## Tags

`#alternative` `#error-handling` `#resilience` `#fallback` `#phase-2`

---

**Status**: ⏳ Phase 2 (Planned)
**Priority**: High (critical for reliability)
**Estimated Effort**: 1-2 weeks

---

## Backlinks

### Referenced By

- [[Relationship Types]] → /home/user/tsdoc-edge/managed/relationships/index.md:318
- [[Substitution]] → /home/user/tsdoc-edge/managed/relationships/substitution.md:131
- [[Substitution]] → /home/user/tsdoc-edge/managed/relationships/substitution.md:165
- [[Substitution]] → /home/user/tsdoc-edge/managed/relationships/substitution.md:188

