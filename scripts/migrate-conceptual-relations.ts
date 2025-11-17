/**
 * Migrate Conceptual Relations to Specialized Types
 *
 * Purpose: Convert 465 deprecated conceptual-relation entries into
 * appropriate specialized types (doc-reference, explicit-semantic-relation)
 *
 * Strategy:
 * - Code ↔ Doc connections → doc-reference
 * - Relations with descriptions → explicit-semantic-relation
 * - Delete original conceptual-relation entries
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';

interface MigrationResult {
  total: number;
  migrated: {
    docReference: number;
    explicitSemantic: number;
  };
  deleted: number;
  errors: string[];
}

function migrateConceptualRelations(dryRun: boolean = true): MigrationResult {
  const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

  console.log('🔄 Conceptual Relation Migration\n');
  console.log('=' .repeat(80));
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '✏️  LIVE MIGRATION'}\n`);

  const result: MigrationResult = {
    total: 0,
    migrated: {
      docReference: 0,
      explicitSemantic: 0,
    },
    deleted: 0,
    errors: [],
  };

  // Get all conceptual-relation entries
  const query = `
    SELECT *
    FROM unified_relationships
    WHERE type = 'conceptual-relation'
  `;

  const relations = db['db'].prepare(query).all() as Array<{
    id: string;
    category: string;
    from_symbols: string;
    to_symbols: string;
    direction: string;
    strength: string;
    evidence: string;
    discovered_by: string;
    confidence: number;
    file_path: string | null;
    line: number | null;
    properties: string | null;
    description: string | null;
  }>;

  result.total = relations.length;
  console.log(`📊 Total conceptual-relation entries: ${relations.length}\n`);

  for (const rel of relations) {
    try {
      const fromSymbols = JSON.parse(rel.from_symbols);
      const toSymbols = JSON.parse(rel.to_symbols);
      const properties = rel.properties ? JSON.parse(rel.properties) : {};
      const evidence = JSON.parse(rel.evidence);

      // Determine new type
      let newType: string;
      let newCategory: string;

      // Check if this is a doc reference (to symbol starts with "doc:")
      const isDocReference = toSymbols[0]?.startsWith('doc:') || fromSymbols[0]?.startsWith('doc:');

      if (isDocReference) {
        newType = 'doc-reference';
        newCategory = 'semantic';
        result.migrated.docReference++;
      } else if (rel.description) {
        newType = 'explicit-semantic-relation';
        newCategory = 'semantic';
        result.migrated.explicitSemantic++;
      } else {
        // Default to explicit-semantic if unclear
        newType = 'explicit-semantic-relation';
        newCategory = 'semantic';
        result.migrated.explicitSemantic++;
      }

      if (!dryRun) {
        // Insert new relationship with updated type
        const newId = rel.id.replace('conceptual-relation', newType);

        db.insertUnifiedRelationship({
          id: newId,
          type: newType,
          category: newCategory,
          fromSymbols,
          toSymbols,
          direction: rel.direction,
          strength: rel.strength,
          evidence,
          discoveredBy: rel.discovered_by,
          confidence: rel.confidence,
          filePath: rel.file_path || undefined,
          line: rel.line || undefined,
          properties: {
            ...properties,
            migratedFrom: 'conceptual-relation',
            migrationDate: new Date().toISOString(),
          },
          description: rel.description || undefined,
        });

        // Delete old conceptual-relation entry
        const deleteStmt = db['db'].prepare(`
          DELETE FROM unified_relationships
          WHERE id = ?
        `);
        deleteStmt.run(rel.id);
        result.deleted++;
      }

      // Log progress every 100 entries
      if ((result.migrated.docReference + result.migrated.explicitSemantic) % 100 === 0) {
        console.log(`  Processed ${result.migrated.docReference + result.migrated.explicitSemantic}/${relations.length}...`);
      }

    } catch (error) {
      const errorMsg = `Failed to migrate ${rel.id}: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      console.error(`  ❌ ${errorMsg}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Migration Results:\n');
  console.log(`  Total entries:              ${result.total}`);
  console.log(`  → doc-reference:            ${result.migrated.docReference} (${((result.migrated.docReference / result.total) * 100).toFixed(1)}%)`);
  console.log(`  → explicit-semantic:        ${result.migrated.explicitSemantic} (${((result.migrated.explicitSemantic / result.total) * 100).toFixed(1)}%)`);
  console.log(`  Deleted (old entries):      ${result.deleted}`);
  console.log(`  Errors:                     ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    result.errors.slice(0, 10).forEach((err) => {
      console.log(`  - ${err}`);
    });
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more`);
    }
  }

  if (dryRun) {
    console.log('\n🔍 DRY RUN complete - no changes made');
    console.log('   Run with --live to apply changes');
  } else {
    console.log('\n✅ Migration complete!');
    console.log('\n   Next steps:');
    console.log('   1. Rebuild database: tsdoc-edge build src --force');
    console.log('   2. Verify relationships: npx ts-node scripts/analyze-inferred-relationships.ts');
  }

  console.log('\n' + '='.repeat(80));

  db.close();

  return result;
}

// Run migration
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--live');

  migrateConceptualRelations(dryRun);
}

export { migrateConceptualRelations };
