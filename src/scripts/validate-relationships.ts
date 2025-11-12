#!/usr/bin/env ts-node
/**
 * Relationship Quality Validator
 * Validates integrity, consistency, and quality of unified relationships
 */

import * as path from 'node:path';
import { DatabaseManager } from '../storage/DatabaseManager';

const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
const dbManager = new DatabaseManager(dbPath);

interface QualityReport {
  totalRelationships: number;
  orphanedRelationships: number;
  duplicateRelationships: number;
  selfReferences: number;
  missingEvidence: number;
  lowConfidence: number;
  avgConfidence: number;
  typeDistribution: Record<string, number>;
  confidenceDistribution: { min: number; max: number; avg: number; median: number };
  issues: Array<{ type: string; description: string; count: number; samples: string[] }>;
}

const report: QualityReport = {
  totalRelationships: 0,
  orphanedRelationships: 0,
  duplicateRelationships: 0,
  selfReferences: 0,
  missingEvidence: 0,
  lowConfidence: 0,
  avgConfidence: 0,
  typeDistribution: {},
  confidenceDistribution: { min: 1, max: 0, avg: 0, median: 0 },
  issues: []
};

console.log('\n=== Relationship Quality Validation ===\n');

// 1. Get all relationships
const relationships = dbManager.db.prepare('SELECT * FROM unified_relationships').all() as any[];
report.totalRelationships = relationships.length;
console.log(`Total relationships: ${report.totalRelationships}`);

// 2. Get all valid symbol IDs
const symbols = dbManager.db.prepare('SELECT id FROM symbols').all() as Array<{ id: string }>;
const validSymbolIds = new Set(symbols.map(s => s.id));
console.log(`Total symbols: ${symbols.length}\n`);

// 3. Check for orphaned relationships
console.log('Checking for orphaned relationships...');
const orphaned: string[] = [];

for (const rel of relationships) {
  const fromSymbols = rel.from_symbols ? JSON.parse(rel.from_symbols) : [rel.from_symbols];
  const toSymbols = rel.to_symbols ? JSON.parse(rel.to_symbols) : [rel.to_symbols];

  let hasOrphan = false;

  for (const fromId of fromSymbols) {
    if (fromId && !validSymbolIds.has(fromId)) {
      orphaned.push(`${rel.id}: from symbol '${fromId}' not found`);
      hasOrphan = true;
      break;
    }
  }

  if (!hasOrphan) {
    for (const toId of toSymbols) {
      if (toId && !validSymbolIds.has(toId)) {
        orphaned.push(`${rel.id}: to symbol '${toId}' not found`);
        break;
      }
    }
  }
}

report.orphanedRelationships = orphaned.length;
if (orphaned.length > 0) {
  console.log(`  ❌ Found ${orphaned.length} orphaned relationships`);
  report.issues.push({
    type: 'orphaned',
    description: 'Relationships referencing non-existent symbols',
    count: orphaned.length,
    samples: orphaned.slice(0, 5)
  });
} else {
  console.log(`  ✅ No orphaned relationships found`);
}

// 4. Check for duplicates
console.log('\nChecking for duplicate relationships...');
const relationshipKeys = new Map<string, number>();

for (const rel of relationships) {
  const key = `${rel.type}:${rel.from_symbols}:${rel.to_symbols}`;
  relationshipKeys.set(key, (relationshipKeys.get(key) || 0) + 1);
}

const duplicates: string[] = [];
for (const [key, count] of relationshipKeys.entries()) {
  if (count > 1) {
    duplicates.push(`${key} (${count} times)`);
  }
}

report.duplicateRelationships = duplicates.length;
if (duplicates.length > 0) {
  console.log(`  ⚠️  Found ${duplicates.length} duplicate relationship patterns`);
  report.issues.push({
    type: 'duplicates',
    description: 'Same relationship stored multiple times',
    count: duplicates.length,
    samples: duplicates.slice(0, 5)
  });
} else {
  console.log(`  ✅ No duplicate relationships found`);
}

// 5. Check for self-references
console.log('\nChecking for self-referencing relationships...');
const selfRefs: string[] = [];

for (const rel of relationships) {
  if (rel.from_symbols === rel.to_symbols) {
    selfRefs.push(`${rel.id}: ${rel.type} (${rel.from_symbols})`);
  }
}

report.selfReferences = selfRefs.length;
if (selfRefs.length > 0) {
  console.log(`  ℹ️  Found ${selfRefs.length} self-referencing relationships`);
  report.issues.push({
    type: 'self-reference',
    description: 'Relationships where from and to are the same symbol',
    count: selfRefs.length,
    samples: selfRefs.slice(0, 5)
  });
} else {
  console.log(`  ✅ No self-references found`);
}

// 6. Analyze confidence scores
console.log('\nAnalyzing confidence scores...');
const confidences: number[] = [];

for (const rel of relationships) {
  if (rel.confidence !== null && rel.confidence !== undefined) {
    confidences.push(rel.confidence);
  }
}

if (confidences.length > 0) {
  confidences.sort((a, b) => a - b);
  report.confidenceDistribution.min = confidences[0];
  report.confidenceDistribution.max = confidences[confidences.length - 1];
  report.confidenceDistribution.avg = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  report.confidenceDistribution.median = confidences[Math.floor(confidences.length / 2)];
  report.avgConfidence = report.confidenceDistribution.avg;

  console.log(`  Min confidence: ${report.confidenceDistribution.min.toFixed(2)}`);
  console.log(`  Max confidence: ${report.confidenceDistribution.max.toFixed(2)}`);
  console.log(`  Avg confidence: ${report.confidenceDistribution.avg.toFixed(2)}`);
  console.log(`  Median confidence: ${report.confidenceDistribution.median.toFixed(2)}`);

  // Count low confidence relationships (< 0.5)
  report.lowConfidence = confidences.filter(c => c < 0.5).length;
  if (report.lowConfidence > 0) {
    console.log(`  ⚠️  ${report.lowConfidence} relationships with confidence < 0.5`);
  }
}

// 7. Check for missing evidence
console.log('\nChecking evidence data...');
const missingEvidence: string[] = [];

for (const rel of relationships) {
  if (!rel.evidence || rel.evidence === '[]' || rel.evidence === 'null') {
    missingEvidence.push(`${rel.id}: ${rel.type}`);
  }
}

report.missingEvidence = missingEvidence.length;
if (missingEvidence.length > 0) {
  console.log(`  ⚠️  ${missingEvidence.length} relationships missing evidence data`);
  report.issues.push({
    type: 'missing-evidence',
    description: 'Relationships without evidence',
    count: missingEvidence.length,
    samples: missingEvidence.slice(0, 5)
  });
} else {
  console.log(`  ✅ All relationships have evidence data`);
}

// 8. Type distribution
console.log('\nType distribution:');
for (const rel of relationships) {
  report.typeDistribution[rel.type] = (report.typeDistribution[rel.type] || 0) + 1;
}

const sortedTypes = Object.entries(report.typeDistribution)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

for (const [type, count] of sortedTypes) {
  const percentage = ((count / report.totalRelationships) * 100).toFixed(1);
  console.log(`  ${type.padEnd(30)} ${count.toString().padStart(6)} (${percentage}%)`);
}

// 9. Sample validation per type
console.log('\n\nSample validation (5 per type):');
const samplesByType = new Map<string, any[]>();

for (const rel of relationships) {
  if (!samplesByType.has(rel.type)) {
    samplesByType.set(rel.type, []);
  }
  if (samplesByType.get(rel.type)!.length < 5) {
    samplesByType.get(rel.type)!.push(rel);
  }
}

for (const [type, samples] of samplesByType.entries()) {
  console.log(`\n${type}:`);
  for (const sample of samples.slice(0, 3)) {
    console.log(`  • ${sample.description || 'No description'}`);
    console.log(`    Confidence: ${sample.confidence || 'N/A'}, Evidence: ${sample.evidence ? 'Yes' : 'No'}`);
  }
}

// 10. Summary
console.log('\n\n=== Quality Summary ===\n');
console.log(`Total relationships: ${report.totalRelationships}`);
console.log(`Orphaned: ${report.orphanedRelationships} (${((report.orphanedRelationships / report.totalRelationships) * 100).toFixed(2)}%)`);
console.log(`Duplicates: ${report.duplicateRelationships} (${((report.duplicateRelationships / report.totalRelationships) * 100).toFixed(2)}%)`);
console.log(`Self-references: ${report.selfReferences} (${((report.selfReferences / report.totalRelationships) * 100).toFixed(2)}%)`);
console.log(`Missing evidence: ${report.missingEvidence} (${((report.missingEvidence / report.totalRelationships) * 100).toFixed(2)}%)`);
console.log(`Low confidence (<0.5): ${report.lowConfidence} (${((report.lowConfidence / report.totalRelationships) * 100).toFixed(2)}%)`);
console.log(`Average confidence: ${report.avgConfidence.toFixed(2)}`);

// Quality score
const qualityScore = 100 - (
  ((report.orphanedRelationships + report.missingEvidence) / report.totalRelationships * 50) +
  ((report.duplicateRelationships) / report.totalRelationships * 30) +
  ((report.lowConfidence) / report.totalRelationships * 20)
);

console.log(`\n📊 Overall Quality Score: ${qualityScore.toFixed(1)}/100`);

if (qualityScore >= 90) {
  console.log('   ✅ Excellent quality');
} else if (qualityScore >= 75) {
  console.log('   ✅ Good quality');
} else if (qualityScore >= 60) {
  console.log('   ⚠️  Fair quality - improvements recommended');
} else {
  console.log('   ❌ Poor quality - action required');
}

// 11. Issues to fix
if (report.issues.length > 0) {
  console.log('\n\n=== Issues Requiring Attention ===\n');
  for (const issue of report.issues) {
    console.log(`${issue.type.toUpperCase()}: ${issue.description}`);
    console.log(`  Count: ${issue.count}`);
    console.log(`  Samples:`);
    for (const sample of issue.samples) {
      console.log(`    - ${sample}`);
    }
    console.log();
  }
}

dbManager.close();
