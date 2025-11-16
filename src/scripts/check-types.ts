#!/usr/bin/env ts-node
import * as path from 'node:path';
import { DatabaseManager } from '../storage/DatabaseManager';

const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
const dbManager = new DatabaseManager(dbPath);

const counts = dbManager.db.prepare('SELECT type, COUNT(*) as count FROM unified_relationships GROUP BY type ORDER BY count DESC').all() as Array<{ type: string; count: number }>;
console.log('\n=== Relationship Types ===');
counts.forEach(row => {
  console.log(`  ${row.type.padEnd(30, ' ')} ${row.count}`);
});

const total = dbManager.db.prepare('SELECT COUNT(*) as count FROM unified_relationships').get() as { count: number };
console.log(`\nTotal: ${total.count}`);

dbManager.close();
