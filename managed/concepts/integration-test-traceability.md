---
title: integration-test-traceability
type: concept
category: concepts
status: active
canonical: true
---

# [[Integration Test Traceability]]

**Document Type**: Architectural Concept

## Purpose

테스트 코드에서 **어떤 모듈들이 함께 사용되는지**를 분석하여, 모듈 간 연결이 **실제로 검증되었는지**를 추적합니다.

## Problem Statement

### 현재 상황
```
현재 시스템:
- ✅ 심볼별 커버리지 (Symbol A가 테스트되었는가?)
- ✅ 파일별 커버리지 (파일이 실행되었는가?)
- ❌ 관계 검증 추적 (A와 B의 연결이 검증되었는가?)

예시:
// 프로덕션 코드
class AuthService {
  constructor(private userRepo: UserRepository) {}
  async login(email: string) {
    return this.userRepo.findByEmail(email);  // ← 이 연결이 검증되었나?
  }
}

// 테스트 코드
describe('AuthService + UserRepository integration', () => {
  it('should find user by email', async () => {
    const repo = new UserRepository();
    const auth = new AuthService(repo);
    await auth.login('test@example.com');  // ✓ A+B 연결 검증
  });
});
```

**문제**: 위 테스트가 `AuthService`와 `UserRepository`의 **연결을 검증**했다는 정보가 시스템에 없음

---

## Core Theory

### Definition

**통합 테스트 관계 (Integration Test Relationship)**:
```
테스트 파일에서 여러 심볼을 import하고 함께 사용하면,
그 테스트는 해당 심볼들 간의 연결을 검증한 것으로 간주

ITR(test, symbols) = {
  testFile: string,
  verifiedSymbols: Set<string>,
  relationships: Array<{source, target}>,
  verificationStrength: 'weak' | 'medium' | 'strong'
}
```

### Verification Strength Levels

```typescript
// Level 1: Weak - 단순 import만 존재
import { A } from './A';
import { B } from './B';
// → A, B가 로드되긴 했지만 연결 검증은 미약

// Level 2: Medium - 같은 테스트 케이스에서 사용
it('test case', () => {
  const a = new A();
  const b = new B();
  // → A와 B가 테스트되지만 상호작용은 없음
});

// Level 3: Strong - 실제 연결 사용
it('test case', () => {
  const b = new B();
  const a = new A(b);  // A가 B를 의존
  a.method();          // A의 메서드가 B를 사용
  // → A → B 연결이 실제로 검증됨
});
```

---

## Algorithm Design

### Phase 1: Test Symbol Extraction

**Input**: 테스트 파일 경로
**Output**: 테스트에서 사용된 심볼 목록

```typescript
interface TestSymbolUsage {
  testFilePath: string;
  importedSymbols: Array<{
    symbolName: string;
    symbolId: string;
    fromModule: string;
  }>;
  usagePatterns: Array<{
    symbolId: string;
    lineNumber: number;
    usageType: 'import' | 'instantiation' | 'method-call' | 'dependency-injection';
  }>;
}
```

**Algorithm**:
```typescript
function extractTestSymbols(testFilePath: string): TestSymbolUsage {
  const ast = parseTestFile(testFilePath);

  // Step 1: Extract imports
  const importedSymbols = ast.getImportDeclarations()
    .filter(imp => !imp.moduleSpecifier.includes('jest'))
    .filter(imp => !imp.moduleSpecifier.includes('vitest'))
    .map(imp => ({
      symbolName: imp.name,
      fromModule: imp.moduleSpecifier,
      symbolId: resolveSymbolId(imp.name, imp.moduleSpecifier)
    }));

  // Step 2: Extract usage patterns
  const usagePatterns = [];
  for (const symbol of importedSymbols) {
    // Find constructor calls: new SymbolName()
    usagePatterns.push(...findConstructorCalls(ast, symbol.symbolName));

    // Find dependency injection: new A(new B())
    usagePatterns.push(...findDependencyInjection(ast, symbol.symbolName));

    // Find method calls: symbolInstance.method()
    usagePatterns.push(...findMethodCalls(ast, symbol.symbolName));
  }

  return { testFilePath, importedSymbols, usagePatterns };
}
```

---

### Phase 2: Relationship Inference

**Input**: TestSymbolUsage
**Output**: Verified relationships

```typescript
interface VerifiedRelationship {
  source: string;      // Symbol ID
  target: string;      // Symbol ID
  verifiedBy: string;  // Test file path
  strength: 'weak' | 'medium' | 'strong';
  evidence: {
    lineNumber: number;
    codeSnippet: string;
    pattern: string;  // 'dependency-injection' | 'method-call' | etc.
  }[];
}
```

**Algorithm**:
```typescript
function inferRelationships(usage: TestSymbolUsage): VerifiedRelationship[] {
  const relationships: VerifiedRelationship[] = [];

  // Pattern 1: Dependency Injection
  // new A(new B()) → A depends on B
  for (const pattern of usage.usagePatterns) {
    if (pattern.usageType === 'dependency-injection') {
      const { parent, child } = parseDependencyInjection(pattern);
      relationships.push({
        source: parent.symbolId,
        target: child.symbolId,
        verifiedBy: usage.testFilePath,
        strength: 'strong',
        evidence: [{
          lineNumber: pattern.lineNumber,
          codeSnippet: pattern.code,
          pattern: 'dependency-injection'
        }]
      });
    }
  }

  // Pattern 2: Method call chain
  // a.method(b.getData()) → A uses B
  for (const pattern of usage.usagePatterns) {
    if (pattern.usageType === 'method-call') {
      const { caller, callee } = parseMethodCall(pattern);
      relationships.push({
        source: caller.symbolId,
        target: callee.symbolId,
        verifiedBy: usage.testFilePath,
        strength: 'medium',
        evidence: [...]
      });
    }
  }

  // Pattern 3: Co-occurrence in same test case
  // Both A and B are used in same `it()` block
  const testCases = groupByTestCase(usage.usagePatterns);
  for (const testCase of testCases) {
    if (testCase.symbols.length > 1) {
      for (const [s1, s2] of combinations(testCase.symbols, 2)) {
        relationships.push({
          source: s1,
          target: s2,
          verifiedBy: usage.testFilePath,
          strength: 'weak',
          evidence: [...]
        });
      }
    }
  }

  return relationships;
}
```

---

### Phase 3: Coverage Aggregation

**Input**: 모든 테스트 파일의 VerifiedRelationship[]
**Output**: 전체 관계 검증 커버리지

```typescript
interface RelationshipCoverage {
  totalRelationships: number;      // 코드베이스의 전체 관계 수
  verifiedRelationships: number;   // 테스트로 검증된 관계 수
  unverifiedRelationships: Array<{
    source: string;
    target: string;
    reason: 'no-test' | 'test-exists-but-no-integration';
  }>;
  coveragePercentage: number;
  verificationMatrix: Map<string, Map<string, VerifiedRelationship[]>>;
}
```

**Algorithm**:
```typescript
function calculateRelationshipCoverage(
  allRelationships: SymbolRelationship[],  // from SymbolGraph
  verifiedRelationships: VerifiedRelationship[]  // from tests
): RelationshipCoverage {
  const verified = new Set();
  const verificationMatrix = new Map();

  // Build verification matrix
  for (const vr of verifiedRelationships) {
    const key = `${vr.source}->${vr.target}`;
    verified.add(key);

    if (!verificationMatrix.has(vr.source)) {
      verificationMatrix.set(vr.source, new Map());
    }
    const targetMap = verificationMatrix.get(vr.source)!;
    if (!targetMap.has(vr.target)) {
      targetMap.set(vr.target, []);
    }
    targetMap.get(vr.target)!.push(vr);
  }

  // Find unverified relationships
  const unverified = [];
  for (const rel of allRelationships) {
    const key = `${rel.from}->${rel.to}`;
    if (!verified.has(key)) {
      unverified.push({
        source: rel.from,
        target: rel.to,
        reason: determineReason(rel)
      });
    }
  }

  return {
    totalRelationships: allRelationships.length,
    verifiedRelationships: verified.size,
    unverifiedRelationships: unverified,
    coveragePercentage: (verified.size / allRelationships.length) * 100,
    verificationMatrix
  };
}
```

---

## Implementation Plan

### File Structure

```
src/analyzer/
  TestRelationshipExtractor.ts    # Phase 1: Extract test symbols
  RelationshipVerifier.ts          # Phase 2: Infer relationships
  IntegrationCoverageCalculator.ts # Phase 3: Calculate coverage

src/commands/
  TestRelationshipsCommand.ts      # CLI interface

src/types/analysis/
  test-relationships.ts            # Type definitions
```

---

## CLI Design

```bash
# 전체 관계 검증 커버리지 분석
tsdoc-edge test-relationships

# 출력:
Relationship Verification Coverage
================================================================================

Total Relationships:       156
Verified Relationships:     89  (57.1%)
Unverified Relationships:   67  (42.9%)

Verification Breakdown:
  Strong (actual usage):    45  (50.6%)
  Medium (co-usage):        32  (36.0%)
  Weak (import only):       12  (13.5%)

Top Unverified Relationships:
  1. AuthService → UserRepository (no integration test)
  2. PaymentService → OrderService (test exists but no integration)
  3. NotificationService → EmailService (no integration test)
  ...

---

# 특정 모듈의 관계 검증 상태
tsdoc-edge test-relationships --module "AuthService"

# 출력:
Relationship Verification for: AuthService
================================================================================

Relationships (5):
  ✓ AuthService → UserRepository
    Verified by: src/__tests__/integration/auth.test.ts:42
    Strength: strong (dependency-injection)
    Evidence: const auth = new AuthService(userRepo);

  ✗ AuthService → TokenService
    Status: No integration test found
    Reason: AuthService.generateToken() never called with TokenService in tests

  ✓ AuthService → CacheService
    Verified by: src/__tests__/integration/auth-cache.test.ts:18
    Strength: medium (method-call)
    Evidence: await auth.login() → cache.get()

---

# 미검증 관계만 출력
tsdoc-edge test-relationships --unverified

# 출력:
Unverified Relationships (67):
================================================================================

AuthService → TokenService
  Reason: No integration test
  Suggestion: Create test in src/__tests__/integration/auth-token.test.ts

PaymentService → OrderService
  Reason: Test exists but no actual integration
  Test: src/__tests__/unit/payment.test.ts (mocked)
  Suggestion: Add integration test with real OrderService

...
```

---

## Database Schema Extension

```sql
-- New table: test_relationships
CREATE TABLE test_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_file_path TEXT NOT NULL,
  source_symbol_id TEXT NOT NULL,
  target_symbol_id TEXT NOT NULL,
  verification_strength TEXT NOT NULL,  -- weak, medium, strong
  evidence_line INTEGER NOT NULL,
  evidence_snippet TEXT NOT NULL,
  pattern TEXT NOT NULL,  -- dependency-injection, method-call, etc.
  created_at TEXT NOT NULL,
  FOREIGN KEY (source_symbol_id) REFERENCES symbols(id),
  FOREIGN KEY (target_symbol_id) REFERENCES symbols(id)
);

CREATE INDEX idx_test_rels_source ON test_relationships(source_symbol_id);
CREATE INDEX idx_test_rels_target ON test_relationships(target_symbol_id);
CREATE INDEX idx_test_rels_strength ON test_relationships(verification_strength);

-- Query: 특정 관계가 검증되었는지 확인
SELECT * FROM test_relationships
WHERE source_symbol_id = 'auth-service'
  AND target_symbol_id = 'user-repository';

-- Query: 미검증 관계 찾기
SELECT r.from, r.to
FROM (
  SELECT from_symbol AS from, to_symbol AS to FROM dependencies
) r
LEFT JOIN test_relationships tr
  ON r.from = tr.source_symbol_id AND r.to = tr.target_symbol_id
WHERE tr.id IS NULL;
```

---

## Use Cases

### Use Case 1: 리팩토링 안전성 검증

**Scenario**: `UserRepository`의 인터페이스를 변경하려고 함

**Query**:
```bash
tsdoc-edge test-relationships --module "UserRepository" --reverse
```

**Output**:
```
Modules depending on UserRepository:
  ✓ AuthService (verified by 3 integration tests)
  ✗ ProfileService (no integration test)
  ✓ AdminService (verified by 1 integration test)

Risk Assessment:
  High Risk: ProfileService (no integration coverage)
  Low Risk: AuthService, AdminService (verified)
```

**Action**: ProfileService에 통합 테스트 추가 필요

---

### Use Case 2: 병렬 개발 안전성 강화

**Scenario**: 앞서 만든 `parallel-work` 명령어와 결합

**Query**:
```bash
tsdoc-edge parallel-work --working "FeatureA,FeatureB" --check-test-coverage
```

**Output**:
```
Parallel Work Analysis with Test Coverage
================================================================================

Available Modules: 15

Conflict Analysis:
  FeatureA → ServiceX (dependency)
    ⚠️  Warning: No integration test verifies this relationship
    Risk: Changes to ServiceX may break FeatureA without detection

  FeatureB → ServiceY (dependency)
    ✓ Verified by: src/__tests__/integration/feature-b-service-y.test.ts
    Safe: Integration test will catch breaking changes

Recommendation:
  1. Add integration test for FeatureA + ServiceX before parallel development
  2. FeatureB can be safely developed in parallel (test coverage exists)
```

---

### Use Case 3: CI/CD Gate

**Scenario**: PR에 새로운 의존성이 추가됨

**Git Hook** (pre-commit):
```bash
#!/bin/bash
# Check if new relationships are verified

tsdoc-edge test-relationships --check-new-relationships

# Exit code:
# 0: All new relationships have integration tests
# 1: Some relationships are unverified
```

**Output**:
```
❌ Pre-commit Check Failed

New unverified relationships detected:
  1. NewFeature → PaymentService (no integration test)
  2. NewFeature → EmailService (no integration test)

Please add integration tests before committing.
```

---

## Benefits

### 1. 실제 검증 추적
**Before**: "이 모듈 테스트 커버리지 80%"
**After**: "이 모듈의 5개 의존성 중 3개가 통합 테스트로 검증됨"

### 2. 리팩토링 안전성
**Before**: 의존하는 모듈 찾기 어려움
**After**: 의존 모듈과 검증 여부를 한눈에 확인

### 3. 병렬 개발 신뢰도
**Before**: 그래프 분석만으로 병렬 가능 판단
**After**: 테스트 검증 여부까지 고려한 안전한 병렬 개발

### 4. 테스트 갭 발견
**Before**: "뭘 테스트해야 하지?"
**After**: "이 5개 관계는 통합 테스트가 없음"

---

## Related Concepts

- Parallel Work Theory - 병렬 개발 안전성 강화
- Test Coverage Analysis - 단일 모듈 커버리지
- Dependency Graph - 관계 추출의 기반

---

**Status**: Design Phase
**Implementation**: [[TestRelationshipsCommand]] (`src/commands/TestRelationshipsCommand.ts`)
**Related Commands**: [[AnalyzeTestsCommand]], [[ParallelWorkCommand]]
**Next Steps**: Implement TestRelationshipExtractor
**Priority**: High (병렬 개발 안전성에 핵심)
**Last Updated**: 2025-11-08

---

## Backlinks

### Referenced By

- [[TSDoc Edge Documentation]] → /Users/junwoobang/workflow/tsdoc-edge/managed/README.md:260
- [[Phase Commands]] → /Users/junwoobang/workflow/tsdoc-edge/managed/commands/Phase5Commands.md:22
- [[Concepts Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/index.md:228
- [[Concepts Index]] → /Users/junwoobang/workflow/tsdoc-edge/managed/concepts/index.md:247
- [[CLI Command Development Guide]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/command-development-guide.md:347
- [[Guides & Tutorials]] → /Users/junwoobang/workflow/tsdoc-edge/managed/guides/index.md:375

