#!/usr/bin/env node
/**
 * Quick database check for Work Context test
 */
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', '.tsdoc', 'symbols.db');
const db = new Database(dbPath, { readonly: true });

console.log('Checking database for AnalyzeAllCommand...\n');

// Check by pattern
const symbolsPattern = db.prepare(`
  SELECT COUNT(*) as count, GROUP_CONCAT(DISTINCT type) as types
  FROM symbols
  WHERE file_path LIKE '%AnalyzeAllCommand%'
`).get();

console.log('Symbols matching pattern:', symbolsPattern);

// Check exact paths
const paths = db.prepare(`
  SELECT DISTINCT file_path
  FROM symbols
  WHERE file_path LIKE '%AnalyzeAllCommand%'
`).all();

console.log('\nFile paths found:');
paths.forEach(p => console.log('  -', p.file_path));

// Check what the test is actually querying
const testPath = 'src/commands/AnalyzeAllCommand.ts';
const exactMatch = db.prepare(`
  SELECT COUNT(*) as count
  FROM symbols
  WHERE file_path = ?
`).get(testPath);

console.log('\nExact match for "' + testPath + '":', exactMatch);

// Check all variations
const variations = [
  'src/commands/AnalyzeAllCommand.ts',
  '/src/commands/AnalyzeAllCommand.ts',
  'commands/AnalyzeAllCommand.ts',
  './src/commands/AnalyzeAllCommand.ts',
];

console.log('\nTrying variations:');
variations.forEach(path => {
  const result = db.prepare('SELECT COUNT(*) as count FROM symbols WHERE file_path = ?').get(path);
  console.log(`  ${path}: ${result.count} symbols`);
});

// Show sample of actual file_path values
console.log('\nSample of actual file_path values in database:');
const samples = db.prepare('SELECT DISTINCT file_path FROM symbols LIMIT 10').all();
samples.forEach(s => console.log('  -', s.file_path));

db.close();
