/**
 * Debug Context Query
 *
 * Purpose: Debug why context command doesn't find test-coverage relationships
 */

import { RelationshipQueryEngine } from '../src/query/RelationshipQueryEngine';
import { DatabaseManager } from '../src/storage/DatabaseManager';

const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

// Check DatabaseManager symbol
const symbolId = 'class-databasemanager';
const symbol = db.getSymbol(symbolId);

console.log('Symbol:', symbol?.name, symbol?.id);

// Get all relationships
const allRels = db.getAllUnifiedRelationships();
console.log(`\nTotal relationships: ${allRels.length}`);

// Find test-coverage relationships involving DatabaseManager
const testCoverageRels = allRels.filter((rel) => {
  if (rel.type !== 'test-coverage') return false;

  const from = Array.isArray(rel.from) ? rel.from : [rel.from];
  const to = Array.isArray(rel.to) ? rel.to : [rel.to];

  const hasSymbol = [...from, ...to].includes(symbolId);

  return hasSymbol;
});

console.log(`\nTest-coverage relationships: ${testCoverageRels.length}`);
console.log('Sample relationships:');
testCoverageRels.slice(0, 5).forEach((rel, idx) => {
  console.log(`  ${idx + 1}. from=${rel.from} → to=${rel.to}`);
});

// Test query engine
const engine = new RelationshipQueryEngine(db);
const context = engine.getContext(symbolId);

console.log(`\nQuery Engine Results:`);
console.log(`  Direct relationships: ${context.direct.length}`);
console.log(`  Tests: ${context.tests.length}`);
console.log(`  Documentation: ${context.documentation.length}`);
console.log(`  Dependencies: ${context.dependencies.length}`);

// Check a specific relationship
if (context.direct.length > 0) {
  console.log(`\nFirst direct relationship:`);
  const first = context.direct[0];
  console.log(`  Type: ${first.type}`);
  console.log(`  From: ${first.from}`);
  console.log(`  To: ${first.to}`);
}

db.close();
