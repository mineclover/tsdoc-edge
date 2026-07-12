/**
 * Analyze Test-Documentation References
 *
 * Purpose: Check how many test symbols are referenced in documentation
 * and identify gaps in test documentation coverage.
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';

interface TestDocAnalysis {
  totalTestSymbols: number;
  testSuites: number;
  testCases: number;
  testScenarios: number;
  testsWithDocRefs: number;
  docRefCoverage: number;
  topDocumentedTests: Array<{
    testSymbol: string;
    testType: string;
    docReferences: number;
  }>;
  undocumentedTestFiles: string[];
}

function analyzeTestDocReferences(): TestDocAnalysis {
  const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

  // Get all test symbols
  const allSymbols = db.getAllSymbols();
  const testSymbols = allSymbols.filter(
    (s) => s.type === 'test-suite' || s.type === 'test-case' || s.type === 'test-scenario'
  );

  console.log('📊 Test-Documentation Reference Analysis\n');
  console.log('='.repeat(80));

  // Statistics by type
  const testSuites = testSymbols.filter((s) => s.type === 'test-suite').length;
  const testCases = testSymbols.filter((s) => s.type === 'test-case').length;
  const testScenarios = testSymbols.filter((s) => s.type === 'test-scenario').length;

  console.log('\n📝 Test Symbol Counts:');
  console.log(`  Total test symbols:     ${testSymbols.length.toString().padStart(6)}`);
  console.log(`  - test-suite:           ${testSuites.toString().padStart(6)}`);
  console.log(`  - test-case:            ${testCases.toString().padStart(6)}`);
  console.log(`  - test-scenario:        ${testScenarios.toString().padStart(6)}`);

  // Check doc relationships
  const testsWithDocs = new Map<string, number>();

  for (const testSymbol of testSymbols) {
    const query = `
      SELECT COUNT(*) as count
      FROM unified_relationships
      WHERE type IN ('conceptual-relation', 'doc-reference')
      AND from_symbols LIKE ?
      AND to_symbols LIKE '%doc:%'
    `;

    const result = db.db.prepare(query).get(`%${testSymbol.id}%`) as { count: number };
    if (result.count > 0) {
      testsWithDocs.set(testSymbol.id, result.count);
    }
  }

  const docRefCoverage =
    testSymbols.length > 0 ? (testsWithDocs.size / testSymbols.length) * 100 : 0;

  console.log('\n📚 Documentation Reference Coverage:');
  console.log(`  Tests with doc refs:    ${testsWithDocs.size.toString().padStart(6)}`);
  console.log(`  Coverage:               ${docRefCoverage.toFixed(1)}%`);

  // Top documented tests
  const topDocumented = Array.from(testsWithDocs.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => {
      const symbol = testSymbols.find((s) => s.id === id);
      return {
        testSymbol: symbol?.name || id,
        testType: symbol?.type || 'unknown',
        docReferences: count,
      };
    });

  if (topDocumented.length > 0) {
    console.log('\n🏆 Top Documented Tests:');
    topDocumented.forEach((item, idx) => {
      console.log(
        `  ${(idx + 1).toString().padStart(2)}. ${item.testSymbol.padEnd(50)} ${item.docReferences} refs`
      );
    });
  }

  // Undocumented test files
  const testFiles = new Set(testSymbols.map((s) => s.filePath));
  const undocumentedFiles: string[] = [];

  for (const file of testFiles) {
    const fileTests = testSymbols.filter((s) => s.filePath === file);
    const hasDocRef = fileTests.some((t) => testsWithDocs.has(t.id));

    if (!hasDocRef) {
      undocumentedFiles.push(file);
    }
  }

  console.log('\n📁 Test Files Without Documentation:');
  console.log(`  Total test files:       ${testFiles.size.toString().padStart(6)}`);
  console.log(`  Without doc refs:       ${undocumentedFiles.length.toString().padStart(6)}`);

  if (undocumentedFiles.length > 0) {
    console.log('\n  Sample undocumented files:');
    undocumentedFiles.slice(0, 10).forEach((file) => {
      const shortPath = file.replace(process.cwd(), '.');
      console.log(`    - ${shortPath}`);
    });
    if (undocumentedFiles.length > 10) {
      console.log(`    ... and ${undocumentedFiles.length - 10} more`);
    }
  }

  // Check reverse: docs referencing tests
  const docsReferencingTests = db.db
    .prepare(`
    SELECT COUNT(*) as count
    FROM unified_relationships
    WHERE type IN ('conceptual-relation', 'doc-reference')
    AND from_symbols LIKE '%doc:%'
    AND (to_symbols LIKE '%test-suite%' OR to_symbols LIKE '%test-case%' OR to_symbols LIKE '%test-scenario%')
  `)
    .get() as { count: number };

  console.log('\n🔗 Reverse References (Docs → Tests):');
  console.log(`  Doc refs to tests:      ${docsReferencingTests.count.toString().padStart(6)}`);

  // Recommendations
  console.log('\n💡 Recommendations:');
  if (docRefCoverage < 50) {
    console.log('  ⚠️  Low test documentation coverage detected');
    console.log('  → Add [[TestSymbol]] references in test file JSDoc comments');
    console.log('  → Link test scenarios to feature documentation');
  }
  if (undocumentedFiles.length > testFiles.size * 0.8) {
    console.log('  ⚠️  Most test files lack documentation links');
    console.log('  → Add @doc tags in test suite JSDoc comments');
  }
  if (docRefCoverage === 0) {
    console.log('  ℹ️  No test-doc relationships found');
    console.log('  → This is expected if tests are not yet documented');
    console.log('  → Consider adding @doc tags to link tests to feature docs');
  }

  console.log(`\n${'='.repeat(80)}`);

  db.close();

  return {
    totalTestSymbols: testSymbols.length,
    testSuites,
    testCases,
    testScenarios,
    testsWithDocRefs: testsWithDocs.size,
    docRefCoverage,
    topDocumentedTests: topDocumented,
    undocumentedTestFiles: undocumentedFiles,
  };
}

// Run analysis
if (require.main === module) {
  analyzeTestDocReferences();
}

export { analyzeTestDocReferences };
