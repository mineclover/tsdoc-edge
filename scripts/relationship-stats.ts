/**
 * Relationship Statistics Dashboard
 *
 * Purpose: Comprehensive statistics on all relationships in the database
 * after migration and inference engine implementation.
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';

interface RelationshipStats {
  total: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  density: number;
  totalSymbols: number;
}

function getRelationshipStats(): RelationshipStats {
  const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

  console.log('📊 Relationship Statistics Dashboard\n');
  console.log('='.repeat(80));

  // Total relationships
  const totalQuery = db.db.prepare('SELECT COUNT(*) as count FROM unified_relationships').get() as {
    count: number;
  };
  const total = totalQuery.count;

  // Total symbols
  const symbolQuery = db.db.prepare('SELECT COUNT(*) as count FROM symbols').get() as {
    count: number;
  };
  const totalSymbols = symbolQuery.count;

  // Density
  const density = totalSymbols > 0 ? total / totalSymbols : 0;

  console.log(`\n📈 Overall Metrics:`);
  console.log(`  Total Relationships:  ${total.toLocaleString()}`);
  console.log(`  Total Symbols:        ${totalSymbols.toLocaleString()}`);
  console.log(
    `  Relationship Density: ${density.toFixed(2)} ${density >= 3.0 ? '✅' : '⚠️'}  (target: 3.0)`
  );
  console.log(`  Average per Symbol:   ${(total / totalSymbols).toFixed(1)} relationships`);

  // By type
  const byTypeQuery = db.db
    .prepare(`
    SELECT type, COUNT(*) as count
    FROM unified_relationships
    GROUP BY type
    ORDER BY count DESC
  `)
    .all() as Array<{ type: string; count: number }>;

  const byType: Record<string, number> = {};
  for (const row of byTypeQuery) {
    byType[row.type] = row.count;
  }

  console.log(`\n📊 Breakdown by Type:`);
  console.log(`  ${'Type'.padEnd(35)} ${'Count'.padStart(7)}  ${'%'.padStart(6)}`);
  console.log(`  ${'-'.repeat(50)}`);
  for (const row of byTypeQuery) {
    const percentage = ((row.count / total) * 100).toFixed(1);
    console.log(
      `  ${row.type.padEnd(35)} ${row.count.toString().padStart(7)}  ${percentage.padStart(5)}%`
    );
  }

  // By category
  const byCategoryQuery = db.db
    .prepare(`
    SELECT category, COUNT(*) as count
    FROM unified_relationships
    GROUP BY category
    ORDER BY count DESC
  `)
    .all() as Array<{ category: string; count: number }>;

  const byCategory: Record<string, number> = {};
  for (const row of byCategoryQuery) {
    byCategory[row.category] = row.count;
  }

  console.log(`\n📊 Breakdown by Category:`);
  console.log(`  ${'Category'.padEnd(20)} ${'Count'.padStart(7)}  ${'%'.padStart(6)}`);
  console.log(`  ${'-'.repeat(35)}`);
  for (const row of byCategoryQuery) {
    const percentage = ((row.count / total) * 100).toFixed(1);
    console.log(
      `  ${row.category.padEnd(20)} ${row.count.toString().padStart(7)}  ${percentage.padStart(5)}%`
    );
  }

  // Inferred relationships
  const inferredQuery = db.db
    .prepare(`
    SELECT COUNT(*) as count
    FROM unified_relationships
    WHERE properties LIKE '%inference%'
  `)
    .get() as { count: number };
  const inferredCount = inferredQuery.count;

  console.log(`\n🔮 Inferred Relationships:`);
  console.log(`  Count:      ${inferredCount.toLocaleString()}`);
  console.log(`  Percentage: ${((inferredCount / total) * 100).toFixed(1)}%`);

  // Semantic relationships (new types)
  const semanticTypes = [
    'naming-pattern-relation',
    'explicit-semantic-relation',
    'feature-grouping',
    'doc-reference',
  ];
  const semanticQuery = db.db
    .prepare(`
    SELECT COUNT(*) as count
    FROM unified_relationships
    WHERE type IN (${semanticTypes.map(() => '?').join(',')})
  `)
    .get(...semanticTypes) as { count: number };
  const semanticCount = semanticQuery.count;

  console.log(`\n✨ Semantic Relationships:`);
  console.log(`  Types: ${semanticTypes.join(', ')}`);
  console.log(`  Count:      ${semanticCount.toLocaleString()}`);
  console.log(`  Percentage: ${((semanticCount / total) * 100).toFixed(1)}%`);

  // Quality check
  console.log(`\n📋 Quality Metrics:`);
  const testCoverageQuery = db.db
    .prepare(`
    SELECT COUNT(*) as count FROM unified_relationships WHERE type = 'test-coverage'
  `)
    .get() as { count: number };
  const testCoverage = testCoverageQuery.count;
  const codeDependencyQuery = db.db
    .prepare(`
    SELECT COUNT(*) as count FROM unified_relationships WHERE type = 'code-dependency'
  `)
    .get() as { count: number };
  const codeDependency = codeDependencyQuery.count;

  console.log(
    `  Test Coverage:      ${testCoverage.toLocaleString()} (${((testCoverage / total) * 100).toFixed(1)}%)`
  );
  console.log(
    `  Code Dependencies:  ${codeDependency.toLocaleString()} (${((codeDependency / total) * 100).toFixed(1)}%)`
  );
  console.log(
    `  Semantic Relations: ${semanticCount.toLocaleString()} (${((semanticCount / total) * 100).toFixed(1)}%)`
  );

  // SSOT compliance
  const docRefQuery = db.db
    .prepare(`
    SELECT COUNT(*) as count FROM unified_relationships WHERE type = 'doc-reference'
  `)
    .get() as { count: number };
  const docRefCount = docRefQuery.count;

  console.log(`\n📄 SSOT Compliance:`);
  console.log(
    `  Code ↔ Doc Links:   ${docRefCount.toLocaleString()} (${((docRefCount / total) * 100).toFixed(1)}%)`
  );
  console.log(`  Status:             ${docRefCount > 0 ? '✅ Active' : '⚠️  No links'}`);

  console.log(`\n${'='.repeat(80)}`);

  db.close();

  return {
    total,
    byType,
    byCategory,
    density,
    totalSymbols,
  };
}

// Run stats
if (require.main === module) {
  getRelationshipStats();
}

export { getRelationshipStats };
