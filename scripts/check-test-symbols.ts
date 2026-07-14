#!/usr/bin/env ts-node
/**
 * Check test symbols in database
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';

const dbPath = '.tsdoc/symbols.db';
const jsonlPath = '.tsdoc';

const db = new DatabaseManager(dbPath, jsonlPath);

// Get statistics
const stats = db.getStatistics();
console.log('📊 Database Statistics:');
console.log(`   Total symbols: ${stats.totalSymbols}`);
console.log(`   Enhanced docs: ${stats.totalEnhancedDocs}`);
console.log(`   DB size: ${stats.dbSize} bytes`);
console.log();

// Query symbols by type
const typeQuery = `
  SELECT type, COUNT(*) as count
  FROM symbols
  GROUP BY type
  ORDER BY count DESC
`;

const typeStats = db.db.prepare(typeQuery).all() as Array<{ type: string; count: number }>;

console.log('📋 Symbols by Type:');
typeStats.forEach(({ type, count }) => {
  console.log(`   ${type.padEnd(20)} ${count.toString().padStart(5)}`);
});
console.log();

// Get test symbols
const testSuitesQuery = `
  SELECT id, name, file_path as filePath
  FROM symbols
  WHERE type = 'test-suite'
  LIMIT 5
`;

const testCasesQuery = `
  SELECT id, name, file_path as filePath
  FROM symbols
  WHERE type = 'test-case'
  LIMIT 5
`;

const testScenariosQuery = `
  SELECT id, name, file_path as filePath
  FROM symbols
  WHERE type = 'test-scenario'
  LIMIT 5
`;

console.log('🧪 Sample Test Suites:');
const testSuites = db.db.prepare(testSuitesQuery).all() as Array<{
  id: string;
  name: string;
  filePath: string;
}>;
testSuites.forEach(({ id, name, filePath }) => {
  console.log(`   ${id}`);
  console.log(`      Name: ${name}`);
  console.log(`      File: ${filePath}`);
  console.log();
});

console.log('🧪 Sample Test Cases:');
const testCases = db.db.prepare(testCasesQuery).all() as Array<{
  id: string;
  name: string;
  filePath: string;
}>;
testCases.forEach(({ id, name, filePath }) => {
  console.log(`   ${id}`);
  console.log(`      Name: ${name}`);
  console.log(`      File: ${filePath}`);
  console.log();
});

console.log('🧪 Sample Test Scenarios:');
const testScenarios = db.db.prepare(testScenariosQuery).all() as Array<{
  id: string;
  name: string;
  filePath: string;
}>;
testScenarios.forEach(({ id, name, filePath }) => {
  console.log(`   ${id}`);
  console.log(`      Name: ${name}`);
  console.log(`      File: ${filePath}`);
  console.log();
});

// Check a specific test file
const specificFileQuery = `
  SELECT id, name, type
  FROM symbols
  WHERE file_path LIKE '%DatabaseManager.test.ts'
  ORDER BY type, id
`;

console.log('📁 Symbols in DatabaseManager.test.ts:');
const specificSymbols = db.db.prepare(specificFileQuery).all() as Array<{
  id: string;
  name: string;
  type: string;
}>;
console.log(`   Found ${specificSymbols.length} symbols`);
specificSymbols.slice(0, 10).forEach(({ name, type }) => {
  console.log(`   [${type.padEnd(15)}] ${name}`);
});

if (specificSymbols.length > 10) {
  console.log(`   ... and ${specificSymbols.length - 10} more`);
}

db.close();
