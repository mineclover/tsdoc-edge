/**
 * Analyze Inferred Relationships
 *
 * Purpose: Examine relationships created by the inference engine
 * to understand what patterns were discovered.
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';

interface InferredRelationshipStats {
  totalInferred: number;
  byType: Record<string, number>;
  byInferenceMethod: Record<string, number>;
  sampleRelationships: Array<{
    type: string;
    from: string;
    to: string;
    confidence: number;
    method: string;
  }>;
}

function analyzeInferredRelationships(): InferredRelationshipStats {
  const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

  console.log('📊 Inferred Relationship Analysis\n');
  console.log('=' .repeat(80));

  // Get all relationships where detection method includes "inference"
  const inferredQuery = `
    SELECT *
    FROM unified_relationships
    WHERE properties LIKE '%inference%'
    ORDER BY created_at DESC
  `;

  const inferred = db['db'].prepare(inferredQuery).all() as Array<{
    id: string;
    type: string;
    from_symbols: string;
    to_symbols: string;
    confidence: number;
    properties: string | null;
    discovered_by: string;
  }>;

  console.log(`\n📈 Total Inferred Relationships: ${inferred.length}`);

  // Count by type
  const byType: Record<string, number> = {};
  for (const rel of inferred) {
    byType[rel.type] = (byType[rel.type] || 0) + 1;
  }

  console.log('\n📊 Breakdown by Type:');
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(30)} ${count.toString().padStart(6)}`);
  }

  // Count by inference method
  const byMethod: Record<string, number> = {};
  for (const rel of inferred) {
    if (rel.properties) {
      try {
        const props = JSON.parse(rel.properties);
        const method = props.detectionMethod || 'unknown';
        byMethod[method] = (byMethod[method] || 0) + 1;
      } catch (e) {
        byMethod['parse-error'] = (byMethod['parse-error'] || 0) + 1;
      }
    }
  }

  console.log('\n🔍 Breakdown by Inference Method:');
  for (const [method, count] of Object.entries(byMethod).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${method.padEnd(30)} ${count.toString().padStart(6)}`);
  }

  // Sample relationships
  const samples = inferred.slice(0, 20).map(rel => {
    let method = 'unknown';
    if (rel.properties) {
      try {
        const props = JSON.parse(rel.properties);
        method = props.detectionMethod || 'unknown';
      } catch (e) {
        // ignore
      }
    }

    return {
      type: rel.type,
      from: JSON.parse(rel.from_symbols)[0] || 'unknown',
      to: JSON.parse(rel.to_symbols)[0] || 'unknown',
      confidence: rel.confidence,
      method,
    };
  });

  console.log('\n📋 Sample Inferred Relationships (first 20):');
  samples.forEach((sample, idx) => {
    console.log(`  ${(idx + 1).toString().padStart(2)}. ${sample.type.padEnd(25)} ${sample.from.substring(0, 25).padEnd(25)} → ${sample.to.substring(0, 25)} [${sample.confidence}] (${sample.method})`);
  });

  // Check relationship density improvement
  const totalRels = db['db'].prepare('SELECT COUNT(*) as count FROM unified_relationships').get() as { count: number };
  const totalSymbols = db['db'].prepare('SELECT COUNT(*) as count FROM symbols').get() as { count: number };
  const density = totalSymbols.count > 0 ? (totalRels.count / totalSymbols.count).toFixed(2) : '0.00';

  console.log('\n📊 Relationship Density:');
  console.log(`  Total relationships: ${totalRels.count}`);
  console.log(`  Total symbols:       ${totalSymbols.count}`);
  console.log(`  Density:             ${density} (target: >3.0)`);
  console.log(`  Inferred %:          ${((inferred.length / totalRels.count) * 100).toFixed(1)}%`);

  console.log('\n' + '='.repeat(80));

  db.close();

  return {
    totalInferred: inferred.length,
    byType,
    byInferenceMethod: byMethod,
    sampleRelationships: samples,
  };
}

// Run analysis
if (require.main === module) {
  analyzeInferredRelationships();
}

export { analyzeInferredRelationships };
