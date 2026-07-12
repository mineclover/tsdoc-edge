/**
 * Verification script for BuildCommand output
 * Tests using DatabaseManager methods instead of raw SQL
 */

import * as path from 'node:path';
import Database from 'better-sqlite3';
import { DatabaseManager } from '../storage/DatabaseManager';

interface SymbolRow {
  id: string;
  name: string;
  type: string;
  file_path: string;
  line: number;
  column: number;
  is_exported: number;
  is_public: number;
  exposure_level: string | null;
  exposure_scope: string | null;
  export_path: string | null;
  accessibility: string | null;
  visibility_boundaries: string | null;
}

interface ExposureScope {
  level: string;
  boundaries: string[];
  exportedVia?: string;
}

const dbPath = path.join(process.cwd(), '.tsdoc.db');
const dbManager = new DatabaseManager(dbPath);

console.log('=== Verifying BuildCommand Output ===\n');

// Test entry points
console.log('1. Entry Points:');
const allEntryPoints = dbManager.getAllEntryPoints();
console.log(`   Total: ${allEntryPoints.length}`);

const epStats = dbManager.getEntryPointStats();
console.log('   By type:');
for (const [type, count] of Object.entries(epStats.byType)) {
  console.log(`     ${type}: ${count}`);
}

if (allEntryPoints.length > 0) {
  console.log('\n   Samples:');
  allEntryPoints.slice(0, 3).forEach((ep) => {
    console.log(`     - ${ep.type}: ${ep.functionName || 'N/A'} (${ep.filePath}:${ep.line})`);
  });
}

// Test relationships
console.log('\n2. Relationships:');
const allRels = dbManager.getAllUnifiedRelationships();
console.log(`   Total unified relationships: ${allRels.length}`);

// Count by type
const relsByType: Record<string, number> = {};
for (const rel of allRels) {
  relsByType[rel.type] = (relsByType[rel.type] || 0) + 1;
}

console.log('   By type:');
for (const [type, count] of Object.entries(relsByType)) {
  console.log(`     ${type}: ${count}`);
}

// Test inheritance relationships specifically
const inheritanceRels = allRels.filter(
  (r) => r.type === 'inheritance' || r.type === 'implementation'
);
console.log(`\n   Inheritance relationships: ${inheritanceRels.length}`);

if (inheritanceRels.length > 0) {
  console.log('   Samples:');
  inheritanceRels.slice(0, 3).forEach((rel) => {
    const from = Array.isArray(rel.from) ? rel.from[0] : rel.from;
    const to = Array.isArray(rel.to) ? rel.to[0] : rel.to;
    const inheritanceType =
      typeof rel.properties === 'string'
        ? JSON.parse(rel.properties).inheritanceType
        : rel.properties?.inheritanceType;
    console.log(`     - ${from} ${inheritanceType || rel.type} ${to}`);
  });
}

// Test endpoint-handler relationships
const endpointHandlerRels = allRels.filter((r) => {
  if (r.type !== 'calls') return false;
  if (typeof r.properties !== 'object' || r.properties === null) return false;
  const props = typeof r.properties === 'string' ? JSON.parse(r.properties) : r.properties;
  return props?.relationshipContext === 'endpoint-handler';
});
console.log(`\n   Endpoint-handler relationships: ${endpointHandlerRels.length}`);

if (endpointHandlerRels.length > 0) {
  console.log('   Samples:');
  endpointHandlerRels.slice(0, 3).forEach((rel) => {
    const props = typeof rel.properties === 'string' ? JSON.parse(rel.properties) : rel.properties;
    const to = Array.isArray(rel.to) ? rel.to[0] : rel.to;
    console.log(`     - ${props?.method} ${props?.path} → ${to}`);
  });
}

// Test block-dependency relationships
const blockDependencyRels = allRels.filter((r) => {
  if (r.type !== 'calls') return false;
  if (typeof r.properties !== 'object' || r.properties === null) return false;
  const props = typeof r.properties === 'string' ? JSON.parse(r.properties) : r.properties;
  return props?.relationshipContext === 'block-dependency';
});
console.log(`\n   Block-dependency relationships: ${blockDependencyRels.length}`);

if (blockDependencyRels.length > 0) {
  console.log('   Samples:');
  blockDependencyRels.slice(0, 3).forEach((rel) => {
    const props = typeof rel.properties === 'string' ? JSON.parse(rel.properties) : rel.properties;
    const from = Array.isArray(rel.from) ? rel.from[0] : rel.from;
    const to = Array.isArray(rel.to) ? rel.to[0] : rel.to;
    console.log(`     - ${from} (${props?.blockType}) → ${to}`);
  });
}

// Test endpoints
console.log('\n3. Endpoints:');
const allEndpoints = dbManager.getAllEndpoints();
console.log(`   Total: ${allEndpoints.length}`);

if (allEndpoints.length > 0) {
  console.log('   Samples:');
  allEndpoints.slice(0, 3).forEach((ep) => {
    console.log(`     - ${ep.method} ${ep.path} (handler: ${ep.handlerSymbolId || 'N/A'})`);
  });
}

// Test exposure information
console.log('\n4. Exposure Analysis:');
// Query raw symbols with exposure info using better-sqlite3
const db = new Database(dbPath, { readonly: true });
const symbolsRaw = db.prepare('SELECT * FROM symbols').all() as SymbolRow[];
const symbolsWithExposure = symbolsRaw.filter((s) => s.exposure_level !== null);
console.log(`   Total symbols: ${symbolsRaw.length}`);
console.log(`   Symbols with exposure info: ${symbolsWithExposure.length}`);

if (symbolsWithExposure.length > 0) {
  // Count by exposure level
  const exposureByLevel: Record<string, number> = {};
  for (const symbol of symbolsWithExposure) {
    const level = symbol.exposure_level || 'unknown';
    exposureByLevel[level] = (exposureByLevel[level] || 0) + 1;
  }

  console.log('   By exposure level:');
  for (const [level, count] of Object.entries(exposureByLevel)) {
    console.log(`     ${level}: ${count}`);
  }

  console.log('\n   Samples:');
  symbolsWithExposure.slice(0, 3).forEach((symbol) => {
    const scope: ExposureScope | null = symbol.exposure_scope
      ? JSON.parse(symbol.exposure_scope)
      : null;
    console.log(
      `     - ${symbol.name} (${symbol.type}): ${symbol.exposure_level}, export path: ${symbol.export_path || 'N/A'}`
    );
    if (scope) {
      console.log(`       boundaries: ${scope.boundaries?.join(', ') || 'none'}`);
    }
  });
}
db.close();

console.log('\n=== Verification Complete ===');
