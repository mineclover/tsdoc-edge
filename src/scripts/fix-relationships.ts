#!/usr/bin/env ts-node
/**
 * Fix Relationship Quality Issues
 * Removes orphaned and duplicate relationships
 */

import * as path from 'node:path';
import { DatabaseManager } from '../storage/DatabaseManager';

const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
const dbManager = new DatabaseManager(dbPath);

console.log('\n=== Fixing Relationship Quality Issues ===\n');

// 1. Get all valid symbol IDs
const symbols = dbManager.db.prepare('SELECT id FROM symbols').all() as Array<{ id: string }>;
const validSymbolIds = new Set(symbols.map(s => s.id));
console.log(`Valid symbols: ${validSymbolIds.size}`);

// 2. Get all relationships
const relationships = dbManager.db.prepare('SELECT * FROM unified_relationships').all() as any[];
console.log(`Total relationships: ${relationships.length}\n`);

// 3. Find and remove orphaned relationships
console.log('Finding orphaned relationships...');
const orphanedIds: string[] = [];

for (const rel of relationships) {
  const fromSymbols = rel.from_symbols ? JSON.parse(rel.from_symbols) : [rel.from_symbols];
  const toSymbols = rel.to_symbols ? JSON.parse(rel.to_symbols) : [rel.to_symbols];

  let hasOrphan = false;

  for (const fromId of fromSymbols) {
    if (fromId && !validSymbolIds.has(fromId)) {
      hasOrphan = true;
      break;
    }
  }

  if (!hasOrphan) {
    for (const toId of toSymbols) {
      if (toId && !validSymbolIds.has(toId)) {
        hasOrphan = true;
        break;
      }
    }
  }

  if (hasOrphan) {
    orphanedIds.push(rel.id);
  }
}

console.log(`Found ${orphanedIds.length} orphaned relationships`);

if (orphanedIds.length > 0) {
  const deleteOrphaned = dbManager.db.transaction(() => {
    const stmt = dbManager.db.prepare('DELETE FROM unified_relationships WHERE id = ?');
    let deleted = 0;
    for (const id of orphanedIds) {
      const result = stmt.run(id);
      if (result.changes > 0) {
        deleted++;
      }
    }
    return deleted;
  });

  const deletedCount = deleteOrphaned();
  console.log(`✅ Deleted ${deletedCount} orphaned relationships\n`);
}

// 4. Find and remove duplicates
console.log('Finding duplicate relationships...');
const relationshipKeys = new Map<string, string[]>();

// Reload relationships after deleting orphans
const remainingRels = dbManager.db.prepare('SELECT * FROM unified_relationships').all() as any[];

for (const rel of remainingRels) {
  const key = `${rel.type}:${rel.from_symbols}:${rel.to_symbols}`;
  if (!relationshipKeys.has(key)) {
    relationshipKeys.set(key, []);
  }
  relationshipKeys.get(key)!.push(rel.id);
}

const duplicateIds: string[] = [];
for (const [key, ids] of relationshipKeys.entries()) {
  if (ids.length > 1) {
    // Keep the first one, delete the rest
    duplicateIds.push(...ids.slice(1));
  }
}

console.log(`Found ${duplicateIds.length} duplicate relationships`);

if (duplicateIds.length > 0) {
  const deleteDuplicates = dbManager.db.transaction(() => {
    const stmt = dbManager.db.prepare('DELETE FROM unified_relationships WHERE id = ?');
    let deleted = 0;
    for (const id of duplicateIds) {
      const result = stmt.run(id);
      if (result.changes > 0) {
        deleted++;
      }
    }
    return deleted;
  });

  const deletedCount = deleteDuplicates();
  console.log(`✅ Deleted ${deletedCount} duplicate relationships\n`);
}

// 5. Review self-references
console.log('Analyzing self-referencing relationships...');
const selfRefs = remainingRels.filter(rel => rel.from_symbols === rel.to_symbols);
console.log(`Found ${selfRefs.length} self-referencing relationships`);

// Count by type
const selfRefsByType = new Map<string, number>();
for (const rel of selfRefs) {
  selfRefsByType.set(rel.type, (selfRefsByType.get(rel.type) || 0) + 1);
}

console.log('Self-references by type:');
for (const [type, count] of Array.from(selfRefsByType.entries()).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type}: ${count}`);
}

// Self-references are often valid (recursive calls, composition patterns)
// Only remove clearly invalid ones
const invalidSelfRefs: string[] = [];
for (const rel of selfRefs) {
  // Remove self-references that are likely errors
  // e.g., composition of singleton to itself
  if (rel.type === 'composition' && rel.description?.includes('instance')) {
    invalidSelfRefs.push(rel.id);
  }
}

if (invalidSelfRefs.length > 0) {
  console.log(`\nRemoving ${invalidSelfRefs.length} invalid self-references...`);
  const deleteInvalid = dbManager.db.transaction(() => {
    const stmt = dbManager.db.prepare('DELETE FROM unified_relationships WHERE id = ?');
    let deleted = 0;
    for (const id of invalidSelfRefs) {
      const result = stmt.run(id);
      if (result.changes > 0) {
        deleted++;
      }
    }
    return deleted;
  });

  const deletedCount = deleteInvalid();
  console.log(`✅ Deleted ${deletedCount} invalid self-references\n`);
} else {
  console.log(`ℹ️  All self-references appear valid (recursive calls, etc.)\n`);
}

// 6. Final statistics
const finalCount = dbManager.db.prepare('SELECT COUNT(*) as count FROM unified_relationships').get() as { count: number };
const removedTotal = relationships.length - finalCount.count;

console.log('=== Summary ===');
console.log(`Initial relationships: ${relationships.length}`);
console.log(`Removed (orphaned): ${orphanedIds.length}`);
console.log(`Removed (duplicates): ${duplicateIds.length}`);
console.log(`Removed (invalid self-refs): ${invalidSelfRefs.length}`);
console.log(`Total removed: ${removedTotal}`);
console.log(`Final relationships: ${finalCount.count}`);
console.log(`\n✅ Quality improvements completed!`);

dbManager.close();
