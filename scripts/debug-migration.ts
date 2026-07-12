/**
 * Debug Migration Results
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';

const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

// Check all relationship types
const allTypes = db.db
  .prepare(`
  SELECT type, COUNT(*) as count
  FROM unified_relationships
  GROUP BY type
  ORDER BY count DESC
`)
  .all() as Array<{ type: string; count: number }>;

console.log('All relationship types:');
allTypes.forEach((t) => {
  console.log(`  ${t.type}: ${t.count}`);
});

// Check for doc-reference specifically
const docRefQuery = db.db
  .prepare(`
  SELECT COUNT(*) as count
  FROM unified_relationships
  WHERE type = 'doc-reference'
`)
  .get() as { count: number };

console.log(`\ndoc-reference count: ${docRefQuery.count}`);

// Check if any relationships have properties indicating migration
const migratedQuery = db.db
  .prepare(`
  SELECT type, COUNT(*) as count
  FROM unified_relationships
  WHERE properties LIKE '%migratedFrom%'
  GROUP BY type
`)
  .all() as Array<{ type: string; count: number }>;

console.log('\nMigrated relationships:');
if (migratedQuery.length === 0) {
  console.log('  None found');
} else {
  migratedQuery.forEach((t) => {
    console.log(`  ${t.type}: ${t.count}`);
  });
}

// Sample a few doc-reference entries if they exist
const samples = db.db
  .prepare(`
  SELECT *
  FROM unified_relationships
  WHERE type = 'doc-reference'
  LIMIT 5
`)
  .all();

console.log(`\nSample doc-reference entries: ${samples.length}`);
samples.forEach((s: any, idx) => {
  console.log(`  ${idx + 1}. ${s.id}`);
  console.log(`     from: ${s.from_symbols}`);
  console.log(`     to: ${s.to_symbols}`);
});

db.close();
