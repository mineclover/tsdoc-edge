#!/usr/bin/env node
/**
 * Analyze relationship statistics
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
const db = new Database(dbPath, { readonly: true });

console.log('='.repeat(80));
console.log('TSDoc Edge - Relationship Analysis Report');
console.log('='.repeat(80));
console.log();

// 1. Relationship types distribution
console.log('1. Relationship Types Distribution');
console.log('-'.repeat(80));
const typeStats = db.prepare(`
  SELECT type, COUNT(*) as count
  FROM unified_relationships
  GROUP BY type
  ORDER BY count DESC
`).all();

let totalRelationships = 0;
for (const stat of typeStats) {
  totalRelationships += stat.count;
  console.log(`  ${stat.type.padEnd(30)} ${stat.count.toString().padStart(8)}`);
}
console.log(`  ${'TOTAL'.padEnd(30)} ${totalRelationships.toString().padStart(8)}`);
console.log();

// 2. Category distribution
console.log('2. Relationship Categories');
console.log('-'.repeat(80));
const categoryStats = db.prepare(`
  SELECT category, COUNT(*) as count
  FROM unified_relationships
  GROUP BY category
  ORDER BY count DESC
`).all();

for (const stat of categoryStats) {
  const percentage = ((stat.count / totalRelationships) * 100).toFixed(1);
  console.log(`  ${stat.category.padEnd(20)} ${stat.count.toString().padStart(8)} (${percentage}%)`);
}
console.log();

// 3. Top connected symbols
console.log('3. Most Connected Symbols (Top 20)');
console.log('-'.repeat(80));
const connectedSymbols = db.prepare(`
  SELECT from_symbols, COUNT(*) as out_degree
  FROM unified_relationships
  GROUP BY from_symbols
  ORDER BY out_degree DESC
  LIMIT 20
`).all();

for (const symbol of connectedSymbols) {
  console.log(`  ${symbol.from_symbols.padEnd(50)} ${symbol.out_degree.toString().padStart(6)} outgoing`);
}
console.log();

// 4. Confidence distribution
console.log('4. Confidence Score Distribution');
console.log('-'.repeat(80));
const confidenceStats = db.prepare(`
  SELECT
    CASE
      WHEN confidence >= 0.9 THEN 'Very High (≥0.9)'
      WHEN confidence >= 0.7 THEN 'High (0.7-0.9)'
      WHEN confidence >= 0.5 THEN 'Medium (0.5-0.7)'
      ELSE 'Low (<0.5)'
    END as confidence_level,
    COUNT(*) as count
  FROM unified_relationships
  GROUP BY confidence_level
  ORDER BY MIN(confidence) DESC
`).all();

for (const stat of confidenceStats) {
  const percentage = ((stat.count / totalRelationships) * 100).toFixed(1);
  console.log(`  ${stat.confidence_level.padEnd(25)} ${stat.count.toString().padStart(8)} (${percentage}%)`);
}
console.log();

// 5. Discovery methods
console.log('5. Discovery Methods');
console.log('-'.repeat(80));
const discoveryStats = db.prepare(`
  SELECT discovered_by, COUNT(*) as count
  FROM unified_relationships
  GROUP BY discovered_by
  ORDER BY count DESC
`).all();

for (const stat of discoveryStats) {
  const percentage = ((stat.count / totalRelationships) * 100).toFixed(1);
  console.log(`  ${stat.discovered_by.padEnd(25)} ${stat.count.toString().padStart(8)} (${percentage}%)`);
}
console.log();

// 6. Implementation coverage
console.log('6. Implementation Coverage');
console.log('-'.repeat(80));

const implementedTypes = new Set(typeStats.map(s => s.type));
const allTypes = [
  'code-dependency', 'inheritance', 'implementation',
  'io-dependency', 'pipeline', 'event-flow',
  'calls', 'callback', 'collaboration', 'composition', 'temporal-order',
  'substitution', 'fallback',
  'mutual-exclusion', 'co-requirement', 'circular-dependency',
  'conceptual-relation', 'feature-grouping', 'doc-reference', 'enhancement',
  'test-coverage', 'integration-verification',
  'type-dependency', 'generic-constraint',
  'layer-dependency', 'module-boundary'
];

const missingTypes = allTypes.filter(t => !implementedTypes.has(t));
const foundTypes = allTypes.filter(t => implementedTypes.has(t));

console.log(`  Total relationship types: ${allTypes.length}`);
console.log(`  Types with data: ${foundTypes.length} (${((foundTypes.length / allTypes.length) * 100).toFixed(1)}%)`);
console.log(`  Types without data: ${missingTypes.length}`);
console.log();

if (missingTypes.length > 0) {
  console.log('  Missing types:');
  for (const type of missingTypes) {
    console.log(`    - ${type}`);
  }
  console.log();
}

// 7. Symbols coverage
console.log('7. Symbol Coverage');
console.log('-'.repeat(80));
const symbolCount = db.prepare('SELECT COUNT(*) as count FROM symbols').get().count;
const symbolsWithRelationships = db.prepare(`
  SELECT COUNT(DISTINCT from_symbols) as count FROM unified_relationships
`).get().count;

console.log(`  Total symbols: ${symbolCount}`);
console.log(`  Symbols with relationships: ${symbolsWithRelationships}`);
console.log(`  Coverage: ${((symbolsWithRelationships / symbolCount) * 100).toFixed(1)}%`);
console.log();

db.close();

console.log('='.repeat(80));
console.log('Analysis complete!');
console.log('='.repeat(80));
