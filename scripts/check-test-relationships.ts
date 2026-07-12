#!/usr/bin/env ts-node
/**
 * Check test relationships in database
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';

const dbPath = '.tsdoc/symbols.db';
const jsonlPath = '.tsdoc';

const db = new DatabaseManager(dbPath, jsonlPath);

interface RelationshipSampleRow {
  id: string;
  from_symbols: string;
  to_symbols: string;
  confidence: number;
  description: string | null;
}

interface CoverageStatsRow {
  total_test_cases: number;
  test_cases_with_coverage: number;
  symbols_tested: number;
  coverage_relations: number;
}

interface TestedSymbolRow {
  id: string;
  name: string;
  type: string;
  file_path: string;
  test_count: number;
}

console.log('🔗 Test Relationship Analysis\n');

// Query relationship statistics
const relTypeQuery = `
  SELECT type, COUNT(*) as count
  FROM unified_relationships
  GROUP BY type
  ORDER BY count DESC
`;

const relTypes = db.db.prepare(relTypeQuery).all() as Array<{ type: string; count: number }>;

console.log('📊 Relationships by Type:');
relTypes.forEach(({ type, count }) => {
  console.log(`   ${type.padEnd(30)} ${count.toString().padStart(5)}`);
});
console.log();

// Query test-coverage relationships
const testCoverageQuery = `
  SELECT *
  FROM unified_relationships
  WHERE type = 'test-coverage'
  LIMIT 10
`;

console.log('🧪 Sample Test Coverage Relationships:');
const testCoverage = db.db.prepare(testCoverageQuery).all() as RelationshipSampleRow[];

if (testCoverage.length === 0) {
  console.log('   No test-coverage relationships found');
} else {
  testCoverage.forEach((rel, idx) => {
    console.log(`\n   ${idx + 1}. ${rel.id}`);
    console.log(`      From: ${rel.from_symbols}`);
    console.log(`      To: ${rel.to_symbols}`);
    console.log(`      Confidence: ${rel.confidence}`);
    console.log(`      Description: ${rel.description}`);
  });
}
console.log();

// Query contains relationships
const containsQuery = `
  SELECT *
  FROM unified_relationships
  WHERE type = 'contains'
  LIMIT 10
`;

console.log('📦 Sample Test Hierarchy (contains) Relationships:');
const contains = db.db.prepare(containsQuery).all() as RelationshipSampleRow[];

if (contains.length === 0) {
  console.log('   No contains relationships found');
} else {
  contains.forEach((rel, idx) => {
    console.log(`\n   ${idx + 1}. ${rel.id}`);
    console.log(`      From: ${rel.from_symbols}`);
    console.log(`      To: ${rel.to_symbols}`);
    console.log(`      Description: ${rel.description}`);
  });
}
console.log();

// Coverage statistics
const coverageStatsQuery = `
  SELECT
    (SELECT COUNT(*) FROM symbols WHERE type = 'test-case') as total_test_cases,
    (SELECT COUNT(DISTINCT from_symbols) FROM unified_relationships WHERE type = 'test-coverage') as test_cases_with_coverage,
    (SELECT COUNT(DISTINCT to_symbols) FROM unified_relationships WHERE type = 'test-coverage') as symbols_tested,
    (SELECT COUNT(*) FROM unified_relationships WHERE type = 'test-coverage') as coverage_relations
`;

const stats = db.db.prepare(coverageStatsQuery).get() as CoverageStatsRow;

console.log('📈 Coverage Statistics:');
console.log(`   Total test cases: ${stats.total_test_cases}`);
console.log(`   Test cases with coverage: ${stats.test_cases_with_coverage}`);
console.log(`   Unique symbols tested: ${stats.symbols_tested}`);
console.log(`   Total coverage relations: ${stats.coverage_relations}`);

const coveragePercent =
  stats.total_test_cases > 0
    ? ((stats.test_cases_with_coverage / stats.total_test_cases) * 100).toFixed(1)
    : 0;
console.log(`   Coverage percentage: ${coveragePercent}%`);
console.log();

// Show which symbols are tested
const testedSymbolsQuery = `
  SELECT DISTINCT
    s.id,
    s.name,
    s.type,
    s.file_path,
    COUNT(r.id) as test_count
  FROM symbols s
  INNER JOIN unified_relationships r ON r.to_symbols LIKE '%' || s.id || '%'
  WHERE r.type = 'test-coverage'
  GROUP BY s.id
  ORDER BY test_count DESC
  LIMIT 20
`;

console.log('🎯 Most Tested Symbols:');
const testedSymbols = db.db.prepare(testedSymbolsQuery).all() as TestedSymbolRow[];

if (testedSymbols.length === 0) {
  console.log('   No tested symbols found');
} else {
  testedSymbols.forEach(({ name, type, test_count, file_path }) => {
    const shortPath = file_path.replace('src/', '');
    console.log(`   ${name.padEnd(30)} [${type.padEnd(10)}] ${test_count} tests (${shortPath})`);
  });
}

db.close();
