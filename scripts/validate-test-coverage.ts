#!/usr/bin/env ts-node
/**
 * Validate test coverage
 * Find public APIs without test coverage
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';

const dbPath = '.tsdoc/symbols.db';
const jsonlPath = '.tsdoc';

const db = new DatabaseManager(dbPath, jsonlPath);

console.log('🔍 Test Coverage Validation\n');

// Get all public implementation symbols (classes, functions, interfaces)
const publicSymbolsQuery = `
  SELECT id, name, type, file_path, is_public
  FROM symbols
  WHERE is_public = 1
  AND type IN ('class', 'function', 'interface')
  AND type NOT IN ('test-suite', 'test-case', 'test-scenario')
  ORDER BY type, name
`;

const publicSymbols = db.db.prepare(publicSymbolsQuery).all() as Array<{
  id: string;
  name: string;
  type: string;
  file_path: string;
  is_public: number;
}>;

console.log(`📊 Total public symbols: ${publicSymbols.length}`);
console.log(`   Classes: ${publicSymbols.filter((s) => s.type === 'class').length}`);
console.log(`   Functions: ${publicSymbols.filter((s) => s.type === 'function').length}`);
console.log(`   Interfaces: ${publicSymbols.filter((s) => s.type === 'interface').length}`);
console.log();

// Check which symbols have test coverage
const untestedSymbols: typeof publicSymbols = [];
const testedSymbols: Array<{
  symbol: (typeof publicSymbols)[0];
  testCount: number;
  tests: string[];
}> = [];

for (const symbol of publicSymbols) {
  // Query test-coverage relationships for this symbol
  const coverageQuery = `
    SELECT r.*, s.name as test_name
    FROM unified_relationships r
    LEFT JOIN symbols s ON s.id = r.from_symbols
    WHERE r.type = 'test-coverage'
    AND r.to_symbols LIKE '%' || ? || '%'
  `;

  const coverage = db.db.prepare(coverageQuery).all(symbol.id) as Array<{
    id: string;
    from_symbols: string;
    test_name: string;
  }>;

  if (coverage.length === 0) {
    untestedSymbols.push(symbol);
  } else {
    testedSymbols.push({
      symbol,
      testCount: coverage.length,
      tests: coverage.map((c) => c.test_name),
    });
  }
}

// Calculate coverage percentage
const coveragePercent =
  publicSymbols.length > 0
    ? ((testedSymbols.length / publicSymbols.length) * 100).toFixed(1)
    : '0.0';

console.log('📈 Coverage Summary:');
console.log(`   Tested: ${testedSymbols.length} (${coveragePercent}%)`);
console.log(
  `   Untested: ${untestedSymbols.length} (${(100 - parseFloat(coveragePercent)).toFixed(1)}%)`
);
console.log();

// Show tested symbols
if (testedSymbols.length > 0) {
  console.log('✅ Tested Public Symbols (Top 20):');
  testedSymbols
    .sort((a, b) => b.testCount - a.testCount)
    .slice(0, 20)
    .forEach(({ symbol, testCount }) => {
      const shortPath = symbol.file_path.replace('src/', '');
      console.log(`   ${symbol.name.padEnd(30)} [${symbol.type.padEnd(10)}] ${testCount} tests`);
      console.log(`      ${shortPath}`);
    });
  console.log();
}

// Group by type (do this before showing results)
const untestedClasses = untestedSymbols.filter((s) => s.type === 'class');
const untestedFunctions = untestedSymbols.filter((s) => s.type === 'function');
const untestedInterfaces = untestedSymbols.filter((s) => s.type === 'interface');

// Show untested symbols by priority
if (untestedSymbols.length > 0) {
  console.log('⚠️  Untested Public Symbols:');
  console.log();

  if (untestedClasses.length > 0) {
    console.log(`   📦 Classes (${untestedClasses.length}):`);
    untestedClasses.slice(0, 20).forEach(({ name, file_path }) => {
      const shortPath = file_path.replace('src/', '');
      console.log(`      ${name.padEnd(40)} ${shortPath}`);
    });
    if (untestedClasses.length > 20) {
      console.log(`      ... and ${untestedClasses.length - 20} more`);
    }
    console.log();
  }

  if (untestedFunctions.length > 0) {
    console.log(`   🔧 Functions (${untestedFunctions.length}):`);
    untestedFunctions.slice(0, 20).forEach(({ name, file_path }) => {
      const shortPath = file_path.replace('src/', '');
      console.log(`      ${name.padEnd(40)} ${shortPath}`);
    });
    if (untestedFunctions.length > 20) {
      console.log(`      ... and ${untestedFunctions.length - 20} more`);
    }
    console.log();
  }

  if (untestedInterfaces.length > 0) {
    console.log(`   📋 Interfaces (${untestedInterfaces.length}):`);
    console.log(`      (Interfaces typically don't need direct tests)`);
    console.log();
  }
}

// Recommendations
console.log('💡 Recommendations:');
if (parseFloat(coveragePercent) < 30) {
  console.log('   ⚠️  Low test coverage detected (<30%)');
  console.log('   → Focus on testing critical classes first');
  console.log('   → Add tests for DatabaseManager, ConfigManager, etc.');
}

if (untestedClasses.length > 0) {
  console.log(`   → ${untestedClasses.length} public classes need tests`);
  console.log('   → Start with classes in: storage/, analyzer/, commands/');
}

if (untestedFunctions.length > 0) {
  console.log(`   → ${untestedFunctions.length} public functions need tests`);
  console.log('   → Add unit tests for utility functions');
}

console.log();
console.log('📝 To improve coverage:');
console.log('   1. Create test files for untested classes');
console.log('   2. Add test cases that instantiate and call methods');
console.log('   3. Run: npm run build src --force');
console.log('   4. Re-run this validator to see improvement');
console.log();

db.close();
