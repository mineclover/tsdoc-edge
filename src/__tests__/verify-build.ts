/**
 * Verification script for BuildCommand output
 * Tests using DatabaseManager methods instead of raw SQL
 */

import { DatabaseManager } from '../storage/DatabaseManager';
import * as path from 'node:path';

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
  allEntryPoints.slice(0, 3).forEach(ep => {
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
const inheritanceRels = allRels.filter(r =>
  r.type === 'inheritance' || r.type === 'implementation'
);
console.log(`\n   Inheritance relationships: ${inheritanceRels.length}`);

if (inheritanceRels.length > 0) {
  console.log('   Samples:');
  inheritanceRels.slice(0, 3).forEach(rel => {
    const from = Array.isArray(rel.from) ? rel.from[0] : rel.from;
    const to = Array.isArray(rel.to) ? rel.to[0] : rel.to;
    const inheritanceType = typeof rel.properties === 'string'
      ? JSON.parse(rel.properties).inheritanceType
      : rel.properties?.inheritanceType;
    console.log(`     - ${from} ${inheritanceType || rel.type} ${to}`);
  });
}

// Test endpoint-handler relationships
const endpointHandlerRels = allRels.filter(r => {
  if (r.type !== 'calls') return false;
  if (typeof r.properties !== 'object' || r.properties === null) return false;
  const props = typeof r.properties === 'string' ? JSON.parse(r.properties) : r.properties;
  return props?.relationshipContext === 'endpoint-handler';
});
console.log(`\n   Endpoint-handler relationships: ${endpointHandlerRels.length}`);

if (endpointHandlerRels.length > 0) {
  console.log('   Samples:');
  endpointHandlerRels.slice(0, 3).forEach(rel => {
    const props = typeof rel.properties === 'string' ? JSON.parse(rel.properties) : rel.properties;
    const to = Array.isArray(rel.to) ? rel.to[0] : rel.to;
    console.log(`     - ${props?.method} ${props?.path} → ${to}`);
  });
}

// Test endpoints
console.log('\n3. Endpoints:');
const allEndpoints = dbManager.getAllEndpoints();
console.log(`   Total: ${allEndpoints.length}`);

if (allEndpoints.length > 0) {
  console.log('   Samples:');
  allEndpoints.slice(0, 3).forEach(ep => {
    console.log(`     - ${ep.method} ${ep.path} (handler: ${ep.handlerSymbolId || 'N/A'})`);
  });
}

console.log('\n=== Verification Complete ===');
