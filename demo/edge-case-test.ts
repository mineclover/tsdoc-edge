/**
 * Edge Case Testing Suite
 *
 * Tests boundary conditions and uncommon scenarios
 *
 * @packageDocumentation
 */

import { SymbolGraphBuilder } from '../src/graph/SymbolGraphBuilder';
import { SymbolSearchEngine } from '../src/graph/SymbolSearchEngine';
import { ConnectivityValidator } from '../src/validator/ConnectivityValidator';

interface EdgeCaseTest {
  name: string;
  category: string;
  execute: () => boolean | Promise<boolean>;
  expectedBehavior: string;
}

const tests: EdgeCaseTest[] = [];

function addTest(
  category: string,
  name: string,
  execute: () => boolean | Promise<boolean>,
  expectedBehavior: string
) {
  tests.push({ category, name, execute, expectedBehavior });
}

// ========================================
// 1. Empty/Null/Undefined Edge Cases
// ========================================

addTest(
  'Empty Inputs',
  'Empty graph builder',
  () => {
    const builder = new SymbolGraphBuilder();
    const graph = builder.build();
    return graph.symbols.size === 0 && graph.relationships.length === 0;
  },
  'Should handle empty graph gracefully'
);

addTest(
  'Empty Inputs',
  'Search in empty graph',
  () => {
    const builder = new SymbolGraphBuilder();
    const engine = new SymbolSearchEngine(builder);
    const results = engine.search({ type: 'class' });
    return results.length === 0;
  },
  'Should return empty results for empty graph'
);

addTest(
  'Empty Inputs',
  'Validate empty graph',
  () => {
    const builder = new SymbolGraphBuilder();
    const validator = new ConnectivityValidator(builder);
    const analysis = validator.analyze();
    return analysis.connectivityScore === 0;
  },
  'Should handle empty graph validation'
);

// ========================================
// 2. Extreme Values
// ========================================

addTest(
  'Extreme Values',
  'Very long symbol name',
  () => {
    const builder = new SymbolGraphBuilder();
    const longName = 'a'.repeat(10000);

    builder.addSymbol({
      id: 'extreme-001',
      name: longName,
      type: 'function',
      filePath: '/test.ts',
      line: 1,
      column: 0,
      isExported: true,
      isPublic: true,
      summary: 'Test',
    });

    const graph = builder.build();
    const symbol = graph.symbols.get('extreme-001');
    return symbol?.name === longName;
  },
  'Should handle very long symbol names'
);

addTest(
  'Extreme Values',
  'Very large line number',
  () => {
    const builder = new SymbolGraphBuilder();

    builder.addSymbol({
      id: 'extreme-002',
      name: 'test',
      type: 'function',
      filePath: '/test.ts',
      line: Number.MAX_SAFE_INTEGER,
      column: 0,
      isExported: true,
      isPublic: true,
      summary: 'Test',
    });

    const graph = builder.build();
    const symbol = graph.symbols.get('extreme-002');
    return symbol?.line === Number.MAX_SAFE_INTEGER;
  },
  'Should handle extreme line numbers'
);

addTest(
  'Extreme Values',
  'Many symbols (stress test)',
  () => {
    const builder = new SymbolGraphBuilder();
    const count = 10000;

    for (let i = 0; i < count; i++) {
      builder.addSymbol({
        id: `stress-${i}`,
        name: `Symbol${i}`,
        type: 'function',
        filePath: `/file${i % 100}.ts`,
        line: i,
        column: 0,
        isExported: true,
        isPublic: true,
        summary: `Symbol ${i}`,
      });
    }

    const graph = builder.build();
    return graph.symbols.size === count;
  },
  'Should handle large number of symbols'
);

// ========================================
// 3. Circular Dependencies
// ========================================

addTest(
  'Circular Dependencies',
  'Simple circular dependency',
  () => {
    const builder = new SymbolGraphBuilder();

    builder.addSymbol({
      id: 'circ-a',
      name: 'A',
      type: 'class',
      filePath: '/a.ts',
      line: 1,
      column: 0,
      isExported: true,
      isPublic: true,
      summary: 'Class A',
    });

    builder.addSymbol({
      id: 'circ-b',
      name: 'B',
      type: 'class',
      filePath: '/b.ts',
      line: 1,
      column: 0,
      isExported: true,
      isPublic: true,
      summary: 'Class B',
    });

    builder.addRelationship({ type: 'dependsOn', from: 'circ-a', to: 'circ-b', filePath: '/a.ts' });
    builder.addRelationship({ type: 'dependsOn', from: 'circ-b', to: 'circ-a', filePath: '/b.ts' });

    const validator = new ConnectivityValidator(builder);
    const analysis = validator.analyze();

    return analysis.circularDependencies.length > 0;
  },
  'Should detect circular dependencies'
);

addTest(
  'Circular Dependencies',
  'Complex circular chain (A→B→C→A)',
  () => {
    const builder = new SymbolGraphBuilder();

    const symbols = ['A', 'B', 'C'];
    for (const name of symbols) {
      builder.addSymbol({
        id: `chain-${name}`,
        name,
        type: 'class',
        filePath: `/${name.toLowerCase()}.ts`,
        line: 1,
        column: 0,
        isExported: true,
        isPublic: true,
        summary: `Class ${name}`,
      });
    }

    builder.addRelationship({
      type: 'dependsOn',
      from: 'chain-A',
      to: 'chain-B',
      filePath: '/a.ts',
    });
    builder.addRelationship({
      type: 'dependsOn',
      from: 'chain-B',
      to: 'chain-C',
      filePath: '/b.ts',
    });
    builder.addRelationship({
      type: 'dependsOn',
      from: 'chain-C',
      to: 'chain-A',
      filePath: '/c.ts',
    });

    const validator = new ConnectivityValidator(builder);
    const analysis = validator.analyze();

    return analysis.circularDependencies.length > 0;
  },
  'Should detect complex circular dependencies'
);

// ========================================
// 4. Special Characters
// ========================================

addTest(
  'Special Characters',
  'Unicode in symbol name',
  () => {
    const builder = new SymbolGraphBuilder();

    builder.addSymbol({
      id: 'unicode-001',
      name: 'test한글_中文_🎉',
      type: 'function',
      filePath: '/test.ts',
      line: 1,
      column: 0,
      isExported: true,
      isPublic: true,
      summary: 'Unicode test',
    });

    const graph = builder.build();
    const symbol = graph.symbols.get('unicode-001');
    return symbol?.name === 'test한글_中文_🎉';
  },
  'Should handle Unicode characters'
);

addTest(
  'Special Characters',
  'Special chars in file path',
  () => {
    const builder = new SymbolGraphBuilder();

    builder.addSymbol({
      id: 'special-001',
      name: 'test',
      type: 'function',
      filePath: '/path/with spaces/and-special!@#.ts',
      line: 1,
      column: 0,
      isExported: true,
      isPublic: true,
      summary: 'Test',
    });

    const graph = builder.build();
    const symbol = graph.symbols.get('special-001');
    return symbol?.filePath === '/path/with spaces/and-special!@#.ts';
  },
  'Should handle special characters in paths'
);

// ========================================
// 5. Broken References
// ========================================

addTest(
  'Broken References',
  'Relationship to non-existent symbol',
  () => {
    const builder = new SymbolGraphBuilder();

    builder.addSymbol({
      id: 'exists',
      name: 'ExistingSymbol',
      type: 'function',
      filePath: '/test.ts',
      line: 1,
      column: 0,
      isExported: true,
      isPublic: true,
      summary: 'Test',
    });

    builder.addRelationship({
      type: 'dependsOn',
      from: 'exists',
      to: 'nonexistent',
      filePath: '/test.ts',
    });

    const validator = new ConnectivityValidator(builder);
    const analysis = validator.analyze();

    return analysis.brokenLinks.length > 0;
  },
  'Should detect broken references'
);

addTest(
  'Broken References',
  'Self-reference',
  () => {
    const builder = new SymbolGraphBuilder();

    builder.addSymbol({
      id: 'self-ref',
      name: 'SelfRef',
      type: 'class',
      filePath: '/test.ts',
      line: 1,
      column: 0,
      isExported: true,
      isPublic: true,
      summary: 'Test',
    });

    builder.addRelationship({
      type: 'dependsOn',
      from: 'self-ref',
      to: 'self-ref',
      filePath: '/test.ts',
    });

    const graph = builder.build();
    const rels = graph.relationships.filter((r) => r.from === 'self-ref' && r.to === 'self-ref');

    return rels.length > 0;
  },
  'Should handle self-references'
);

// ========================================
// 6. Duplicate Handling
// ========================================

addTest(
  'Duplicates',
  'Duplicate symbol IDs',
  () => {
    const builder = new SymbolGraphBuilder();

    builder.addSymbol({
      id: 'dup-001',
      name: 'First',
      type: 'function',
      filePath: '/test1.ts',
      line: 1,
      column: 0,
      isExported: true,
      isPublic: true,
      summary: 'First',
    });

    builder.addSymbol({
      id: 'dup-001',
      name: 'Second',
      type: 'function',
      filePath: '/test2.ts',
      line: 1,
      column: 0,
      isExported: true,
      isPublic: true,
      summary: 'Second (should override)',
    });

    const graph = builder.build();
    const symbol = graph.symbols.get('dup-001');

    return symbol?.name === 'Second';
  },
  'Last added symbol should win for duplicate IDs'
);

addTest(
  'Duplicates',
  'Duplicate relationships',
  () => {
    const builder = new SymbolGraphBuilder();

    builder.addSymbol({
      id: 'a',
      name: 'A',
      type: 'class',
      filePath: '/a.ts',
      line: 1,
      column: 0,
      isExported: true,
      isPublic: true,
      summary: 'A',
    });

    builder.addSymbol({
      id: 'b',
      name: 'B',
      type: 'class',
      filePath: '/b.ts',
      line: 1,
      column: 0,
      isExported: true,
      isPublic: true,
      summary: 'B',
    });

    // Add same relationship twice
    builder.addRelationship({ type: 'dependsOn', from: 'a', to: 'b', filePath: '/a.ts' });
    builder.addRelationship({ type: 'dependsOn', from: 'a', to: 'b', filePath: '/a.ts' });

    const graph = builder.build();
    const rels = graph.relationships.filter((r) => r.from === 'a' && r.to === 'b');

    // Should deduplicate or keep both (implementation dependent)
    return rels.length >= 1;
  },
  'Should handle duplicate relationships'
);

// ========================================
// Run Tests
// ========================================

async function runTests() {
  console.log('🧪 TSDoc Edge - Edge Case Test Suite\n');
  console.log('='.repeat(70));

  const grouped: { [category: string]: EdgeCaseTest[] } = {};
  for (const test of tests) {
    if (!grouped[test.category]) {
      grouped[test.category] = [];
    }
    grouped[test.category].push(test);
  }

  let passed = 0;
  let failed = 0;
  const failures: { test: EdgeCaseTest; error: Error }[] = [];

  for (const [category, categoryTests] of Object.entries(grouped)) {
    console.log(`\n📁 ${category}`);
    console.log('-'.repeat(50));

    for (const test of categoryTests) {
      try {
        const result = await test.execute();
        if (result) {
          console.log(`  ✅ ${test.name}`);
          console.log(`     ${test.expectedBehavior}`);
          passed++;
        } else {
          console.log(`  ❌ ${test.name}`);
          console.log(`     Expected: ${test.expectedBehavior}`);
          console.log(`     Got: false`);
          failed++;
        }
      } catch (error) {
        console.log(`  ❌ ${test.name}`);
        console.log(`     Error: ${error instanceof Error ? error.message : String(error)}`);
        failures.push({ test, error: error as Error });
        failed++;
      }
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('\n📊 Results Summary\n');
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);
  console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    console.log('\n❌ Failed Tests Details:');
    for (const { test, error } of failures) {
      console.log(`\n  ${test.category} > ${test.name}`);
      console.log(`  Expected: ${test.expectedBehavior}`);
      console.log(`  Error: ${error.message}`);
      if (error.stack) {
        console.log(`  Stack: ${error.stack.split('\n').slice(1, 3).join('\n')}`);
      }
    }
  }

  console.log(`\n${'='.repeat(70)}`);

  if (failed === 0) {
    console.log('\n🎉 All edge cases handled correctly!');
    console.log('✨ System robustness: EXCELLENT\n');
  } else {
    console.log('\n⚠️  Some edge cases need attention\n');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
