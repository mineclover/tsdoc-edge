#!/usr/bin/env ts-node
import { DatabaseManager } from '../src/storage/DatabaseManager';

const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

interface RelationshipPathRow {
  from_symbols: string;
  to_symbols: string;
}

console.log('🔍 Checking covers-scenario relationships\n');

const query = "SELECT COUNT(*) as count FROM unified_relationships WHERE type = 'covers-scenario'";
const result = db.db.prepare(query).get() as { count: number };
console.log('Total covers-scenario relationships:', result.count);

const allQuery = 'SELECT type, COUNT(*) as count FROM unified_relationships GROUP BY type';
const allTypes = db.db.prepare(allQuery).all() as Array<{ type: string; count: number }>;
console.log('\nAll relationship types:');
allTypes.forEach((row) => {
  console.log(`  ${row.type}: ${row.count}`);
});

// Sample covers-scenario relationships
if (result.count > 0) {
  console.log('\nSample covers-scenario relationships:');
  const sampleQuery = "SELECT * FROM unified_relationships WHERE type = 'covers-scenario' LIMIT 5";
  const samples = db.db.prepare(sampleQuery).all() as RelationshipPathRow[];
  samples.forEach((rel) => {
    console.log(`  ${rel.from_symbols} → ${rel.to_symbols}`);
  });
}

db.close();
