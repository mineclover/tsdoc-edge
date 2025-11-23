#!/usr/bin/env ts-node
/**
 * Debug import analysis
 * Check if import analysis is working correctly
 */

import * as fs from 'node:fs';
import { DatabaseManager } from '../src/storage/DatabaseManager';
import { ImportAnalyzer } from '../src/analyzer/ImportAnalyzer';

const dbPath = '.tsdoc/symbols.db';
const jsonlPath = '.tsdoc';

const db = new DatabaseManager(dbPath, jsonlPath);
const importAnalyzer = new ImportAnalyzer();

console.log('🔍 Import Analysis Debug\n');

// Check FileScanner test file
const testFile = 'src/__tests__/FileScanner.test.ts';
console.log(`📄 Test file: ${testFile}\n`);

// 1. Analyze imports
if (fs.existsSync(testFile)) {
  const sourceCode = fs.readFileSync(testFile, 'utf-8');
  const importResult = importAnalyzer.analyzeImports(sourceCode);

  console.log(`📦 Imports found: ${importResult.imports.length}`);
  console.log();

  for (const imp of importResult.imports) {
    if (!imp.isTypeOnly) {
      console.log(`   ${imp.localName.padEnd(30)} from ${imp.modulePath}`);
    }
  }

  console.log();

  // Resolve to symbol IDs
  const symbolIds = importAnalyzer.resolveImportedSymbols(importResult.imports);
  console.log(`🎯 Resolved symbol IDs:`);
  console.log();

  for (const [localName, ids] of symbolIds.entries()) {
    console.log(`   ${localName.padEnd(30)} → ${ids.join(', ')}`);

    // Check if symbols exist in database
    for (const symbolId of ids) {
      const symbolQuery = `SELECT id, name, type FROM symbols WHERE id = ? LIMIT 1`;
      const symbol = db['db'].prepare(symbolQuery).get(symbolId) as any;
      if (symbol) {
        console.log(`      ✓ Found in DB: ${symbol.name} (${symbol.type})`);
      }

      // Also try by name
      const pascalName = symbolId
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
      const nameQuery = `SELECT id, name, type FROM symbols WHERE name = ? LIMIT 1`;
      const byName = db['db'].prepare(nameQuery).get(pascalName) as any;
      if (byName) {
        console.log(`      ✓ Found by name: ${byName.id} (${byName.type})`);
      }
    }
  }

  console.log();
}

// 2. Check test symbols for FileScanner
console.log(`📋 Test symbols for FileScanner:\n`);

const testSymbolsQuery = `
  SELECT
    id,
    name,
    type,
    description
  FROM symbols
  WHERE file_path = ?
  AND type = 'test-case'
  LIMIT 10
`;

const testSymbols = db['db'].prepare(testSymbolsQuery).all(testFile) as Array<{
  id: string;
  name: string;
  type: string;
  description: string | null;
}>;

for (const symbol of testSymbols) {
  console.log(`   ${symbol.id}`);
  console.log(`   Name: ${symbol.name}`);
  console.log(`   Description: ${symbol.description || '(none)'}`);

  // Check if there are any tested symbols extracted
  // This should be in the description field based on our current implementation
  if (symbol.description) {
    try {
      const parsed = JSON.parse(symbol.description);
      if (parsed.testedSymbols) {
        console.log(`   Tested symbols: ${parsed.testedSymbols.join(', ')}`);
      }
    } catch {
      // Not JSON
    }
  }

  console.log();
}

// 3. Check test-coverage relationships
console.log(`🔗 Test-coverage relationships:\n`);

const relQuery = `
  SELECT
    from_symbols,
    to_symbols,
    description
  FROM unified_relationships
  WHERE type = 'test-coverage'
  LIMIT 20
`;

const rels = db['db'].prepare(relQuery).all() as Array<{
  from_symbols: string;
  to_symbols: string;
  description: string | null;
}>;

console.log(`   Total test-coverage relationships: ${rels.length}`);
console.log();

for (const rel of rels.slice(0, 10)) {
  console.log(`   ${rel.from_symbols} → ${rel.to_symbols}`);
  console.log(`   ${rel.description || ''}`);
  console.log();
}

db.close();
