---
title: MCP Testing Strategy
type: feature
category: feature
status: active
canonical: true
codeImplementation: not-applicable
---

# [[MCP Testing Strategy]]

**Owner**: MCP Team
**Status**: Active
**Last Updated**: 2025-11-24

## Purpose

Define comprehensive testing strategy for TSDoc Edge MCP Server to ensure reliability, performance, and correctness of all exposed tools.

## Context

MCP (Model Context Protocol) Server ([[MCP Integration]]) provides 9 read-only tools to AI agents:
- `tsdoc_search_symbols`
- `tsdoc_get_ontology_stats`
- `tsdoc_list_relationships`
- `tsdoc_get_work_context`
- `tsdoc_get_design_context`
- `tsdoc_query_relationships`
- `tsdoc_get_symbol_details`
- `tsdoc_get_impact`
- `tsdoc_get_spec_bindings`

Each tool must be tested at multiple levels to guarantee LLM-safe operation.

## Testing Architecture

### Level 1: Unit Tests (Service Layer)
**File**: `basic-test.js`
**Target**: `TsDocService` class methods directly
**Coverage**: 9 core operations (9/9 passing)

**Purpose**:
- Validate API contracts
- Test database connection resilience
- Verify result structures

**Example**:
```javascript
const service = new TsDocService(workspaceRoot);
const results = await service.searchSymbols({ query: 'DatabaseManager' });
// Verify: results.nodes is Array<Symbol>
```

### Level 2: Integration Tests (MCP Protocol)
**File**: `test-client.js`
**Target**: MCP stdio protocol with full message exchange
**Coverage**: 9 end-to-end scenarios

**Purpose**:
- Test MCP protocol compliance
- Validate JSON-RPC message format
- Verify tool listing and execution

**Flow**:
1. Initialize MCP connection
2. List available tools
3. Execute each tool with realistic params
4. Validate response structure

### Level 3: Detailed Tool Tests (Scenario Coverage)
**File**: `detailed-test.js`
**Target**: Each MCP tool with multiple scenarios
**Coverage**: 13 test cases (9 happy paths + 4 edge/canonical-graph cases, 13/13 passing)

**Purpose**:
- Test real-world use cases
- Validate error handling
- Test edge cases (empty results, invalid inputs)

**Scenarios**:
- Happy path: Valid inputs, expected results
- Edge cases: Non-existent symbols, empty queries
- Error handling: Invalid file paths, malformed params

### Level 4: Performance Benchmarks
**File**: `benchmark.js`
**Target**: Database query performance
**Coverage**: 10 operations (100 iterations each)

**Purpose**:
- Measure query latency (avg, P50, P95, P99)
- Identify slow operations (>50ms)
- Track performance regressions

**Thresholds**:
- Fast: <10ms (expected for indexed queries)
- Acceptable: 10-50ms (acceptable for aggregations)
- Slow: >50ms (requires optimization)

### Level 5: Comprehensive Test Suite
**File**: `run-all-tests.js`
**Target**: All test suites in sequence
**Output**: HTML + JSON reports

**Purpose**:
- Single entry point for all testing
- Flattened result collection
- Visual performance dashboards
- CI/CD integration

**Report Includes**:
- Success rate with progress rings
- Per-suite breakdowns
- Performance bar charts
- Coverage grids (tools × scenarios)
- Memory usage statistics

## Test Data Requirements

### Database Prerequisites
Tests require synchronized SSOT databases (`.tsdoc.db`, `.tsdoc/canonical-graph.db`, `.tsdoc/spec-graph.db`):

```bash
# Run before tests
tsdoc-edge sync
```

**Expected Data**:
- ~10,450+ symbols and ~8,676 canonical `@ttsc/graph` nodes
- ~21,236 canonical `@ttsc/graph` edges
- Active `SpecGraphRevision` bindings from `managed/specs/`

### Test Fixtures
Real codebase entities used:
- `DatabaseManager` (core storage class)
- `src/commands/HealthCommand.ts` (`healthcommand-class-healthcommand`)
- Canonical `@ttsc/graph` impact and `SpecGraph` binding queries

## Performance Optimization

### Caching Strategy
**Implementation**: TsDocService.relationshipsCache

**Behavior**:
- First call: Load all 20K relationships (131ms)
- Subsequent calls: Return cached array (<1ms)
- Cache lifetime: Until service.close()

**Impact**:
- MCP tool calls: Reuse same service instance → cached
- Benchmarks: New instances per iteration → uncached

**Caveat**: Benchmark shows "slow" (131ms) but real usage is fast (<1ms after warmup)

## Test Execution

### Local Development
```bash
# All tests
npm test  # or: node run-all-tests.js

# Specific suite
node basic-test.js
node test-client.js
node detailed-test.js
node benchmark.js
```

### CI/CD Integration
```bash
# Exit code 0 if passed, 1 if >2 failures
node run-all-tests.js
echo $?
```

### Report Generation
Auto-generated on every run:
- `test-report.html` - Visual dashboard
- `test-results.json` - Machine-readable data

## Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| Overall Pass Rate | ≥95% | 100% (23/23) |
| Integration Tests | 100% | 100% (9/9) |
| Detailed Tests | ≥90% | 100% (10/10) |
| Basic Tests | 100% | 100% (7/7) |
| Fast Operations | ≥75% | 75% (6/8) |
| Test Duration | <2min | 65s ✓ |

## Continuous Improvement

### Adding New Tests
1. Add test case to appropriate file
2. Update coverage tracking in `run-all-tests.js`
3. Document in this file
4. Run full suite to verify integration

### Performance Regression Detection
Monitor `test-results.json`:
```javascript
{
  "performance": {
    "operations": [
      { "name": "...", "avgTime": X, "p95Time": Y }
    ]
  }
}
```

Alert if any operation:
- Avg time increases >20%
- P95 time exceeds threshold (10ms → 50ms)

## Related Documentation

- MCP Server Implementation
- TsDocService API
- Database Schema
- Performance Optimization

## Decision Log

**2025-11-24**: Relationship caching added
- **Problem**: getOntologyStats slow (213ms)
- **Solution**: Cache 20K relationships in memory
- **Impact**: 200x speedup for repeated calls

**2025-11-24**: Test parsing improved
- **Problem**: Individual tests showed false (passed: true but stats wrong)
- **Solution**: Parse [RESULT] tag as success indicator
- **Impact**: Accurate HTML report generation

---

## Backlinks

### Referenced By

- [[Features Index]] → managed/features/index.md:283
- [[MCP Integration]] → managed/features/mcp-integration.md:65

