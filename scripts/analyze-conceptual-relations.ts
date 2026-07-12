/**
 * Analyze Conceptual Relations for Migration
 *
 * Purpose: Examine all 465 conceptual-relation entries to determine
 * which new relationship type each should be migrated to.
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';

interface MigrationCandidate {
  id: string;
  from: string[];
  to: string[];
  properties: Record<string, unknown>;
  filePath?: string;
  description?: string;
}

interface MigrationAnalysis {
  total: number;
  byPattern: {
    namingPattern: MigrationCandidate[];
    featureGrouping: MigrationCandidate[];
    explicitSemantic: MigrationCandidate[];
    unknown: MigrationCandidate[];
  };
  statistics: {
    namingPatternCount: number;
    featureGroupingCount: number;
    explicitSemanticCount: number;
    unknownCount: number;
  };
}

function analyzeConceptualRelations(): MigrationAnalysis {
  const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

  console.log('📊 Conceptual Relation Migration Analysis\n');
  console.log('='.repeat(80));

  // Get all conceptual-relation entries
  const query = `
    SELECT *
    FROM unified_relationships
    WHERE type = 'conceptual-relation'
  `;

  const relations = db.db.prepare(query).all() as Array<{
    id: string;
    from_symbols: string;
    to_symbols: string;
    properties: string | null;
    file_path: string | null;
    description: string | null;
  }>;

  console.log(`\n📈 Total conceptual-relation entries: ${relations.length}`);

  const analysis: MigrationAnalysis = {
    total: relations.length,
    byPattern: {
      namingPattern: [],
      featureGrouping: [],
      explicitSemantic: [],
      unknown: [],
    },
    statistics: {
      namingPatternCount: 0,
      featureGroupingCount: 0,
      explicitSemanticCount: 0,
      unknownCount: 0,
    },
  };

  // Analyze each relation
  for (const rel of relations) {
    const candidate: MigrationCandidate = {
      id: rel.id,
      from: JSON.parse(rel.from_symbols),
      to: JSON.parse(rel.to_symbols),
      properties: rel.properties ? (JSON.parse(rel.properties) as Record<string, unknown>) : {},
      filePath: rel.file_path || undefined,
      description: rel.description || undefined,
    };

    // Determine migration target based on properties
    const props = candidate.properties;

    // Check for naming pattern indicators
    if (props.domain || props.prefix || hasCommonPrefix(candidate.from[0], candidate.to[0])) {
      analysis.byPattern.namingPattern.push(candidate);
      analysis.statistics.namingPatternCount++;
    }
    // Check for feature grouping indicators
    else if (props.feature || props.directory || haveSameDirectory(candidate)) {
      analysis.byPattern.featureGrouping.push(candidate);
      analysis.statistics.featureGroupingCount++;
    }
    // Check for explicit semantic indicators (has description or semantic tag)
    else if (candidate.description || props.semantic || props.relatedTo) {
      analysis.byPattern.explicitSemantic.push(candidate);
      analysis.statistics.explicitSemanticCount++;
    }
    // Unknown pattern
    else {
      analysis.byPattern.unknown.push(candidate);
      analysis.statistics.unknownCount++;
    }
  }

  console.log('\n📊 Migration Pattern Distribution:');
  console.log(
    `  naming-pattern-relation:     ${analysis.statistics.namingPatternCount.toString().padStart(4)} (${((analysis.statistics.namingPatternCount / relations.length) * 100).toFixed(1)}%)`
  );
  console.log(
    `  feature-grouping:            ${analysis.statistics.featureGroupingCount.toString().padStart(4)} (${((analysis.statistics.featureGroupingCount / relations.length) * 100).toFixed(1)}%)`
  );
  console.log(
    `  explicit-semantic-relation:  ${analysis.statistics.explicitSemanticCount.toString().padStart(4)} (${((analysis.statistics.explicitSemanticCount / relations.length) * 100).toFixed(1)}%)`
  );
  console.log(
    `  unknown (needs review):      ${analysis.statistics.unknownCount.toString().padStart(4)} (${((analysis.statistics.unknownCount / relations.length) * 100).toFixed(1)}%)`
  );

  // Show samples
  console.log('\n📋 Sample Naming Pattern Relations (first 5):');
  analysis.byPattern.namingPattern.slice(0, 5).forEach((rel, idx) => {
    console.log(`  ${idx + 1}. ${rel.from[0]} ↔ ${rel.to[0]}`);
    if (rel.properties.domain) console.log(`     Domain: ${rel.properties.domain}`);
  });

  console.log('\n📋 Sample Feature Grouping Relations (first 5):');
  analysis.byPattern.featureGrouping.slice(0, 5).forEach((rel, idx) => {
    console.log(`  ${idx + 1}. ${rel.from[0]} ↔ ${rel.to[0]}`);
    if (rel.properties.feature) console.log(`     Feature: ${rel.properties.feature}`);
  });

  console.log('\n📋 Sample Explicit Semantic Relations (first 5):');
  analysis.byPattern.explicitSemantic.slice(0, 5).forEach((rel, idx) => {
    console.log(`  ${idx + 1}. ${rel.from[0]} ↔ ${rel.to[0]}`);
    if (rel.description) console.log(`     Description: ${rel.description}`);
  });

  console.log('\n📋 Unknown Pattern Relations (first 10):');
  analysis.byPattern.unknown.slice(0, 10).forEach((rel, idx) => {
    console.log(`  ${idx + 1}. ${rel.from[0]} ↔ ${rel.to[0]}`);
    console.log(`     Properties: ${JSON.stringify(rel.properties)}`);
  });

  console.log(`\n${'='.repeat(80)}`);

  db.close();

  return analysis;
}

function hasCommonPrefix(from: string, to: string): boolean {
  if (!from || !to) return false;

  // Extract potential domain prefix (before last capital letter)
  const fromMatch = from.match(/^([A-Z][a-z]+(?:[A-Z][a-z]+)*)/);
  const toMatch = to.match(/^([A-Z][a-z]+(?:[A-Z][a-z]+)*)/);

  if (fromMatch && toMatch) {
    const fromPrefix = fromMatch[1];
    const toPrefix = toMatch[1];

    // Check if they share a common prefix of at least 3 characters
    let commonLength = 0;
    for (let i = 0; i < Math.min(fromPrefix.length, toPrefix.length); i++) {
      if (fromPrefix[i] === toPrefix[i]) {
        commonLength++;
      } else {
        break;
      }
    }

    return commonLength >= 3;
  }

  return false;
}

function haveSameDirectory(candidate: MigrationCandidate): boolean {
  if (!candidate.filePath) return false;

  // Extract directory from file path
  const parts = candidate.filePath.split('/');
  if (parts.length > 2) {
    // Has a directory structure
    return true;
  }

  return false;
}

// Run analysis
if (require.main === module) {
  analyzeConceptualRelations();
}

export { analyzeConceptualRelations };
