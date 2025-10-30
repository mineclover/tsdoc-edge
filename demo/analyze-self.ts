#!/usr/bin/env ts-node

/**
 * Analyze tsdoc-edge project itself using AST-based extraction
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ASTSymbolExtractor } from '../src/analyzer/ASTSymbolExtractor';
import { DependencyResolver } from '../src/analyzer/DependencyResolver';
import { DatabaseManager } from '../src/storage/DatabaseManager';
import type { Symbol } from '../src/types/graph';

console.log('='.repeat(80));
console.log('Analyzing TSDoc-Edge Project (AST-based)');
console.log('='.repeat(80));
console.log();

const extractor = new ASTSymbolExtractor();
const resolver = new DependencyResolver();
const projectRoot = process.cwd();
const dbPath = path.join(projectRoot, '.tsdoc', 'symbols.db');
const jsonlPath = path.join(projectRoot, '.tsdoc', 'data');

// Ensure .tsdoc directory exists
const tsdocDir = path.join(projectRoot, '.tsdoc');
if (!fs.existsSync(tsdocDir)) {
  fs.mkdirSync(tsdocDir, { recursive: true });
}

// Delete old database
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('🗑️  Deleted old database');
}

const dbManager = new DatabaseManager(dbPath, jsonlPath);

/**
 * Find all TypeScript files
 */
function findTypeScriptFiles(dir: string): string[] {
  const results: string[] = [];

  const walk = (currentDir: string): void => {
    const files = fs.readdirSync(currentDir);

    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip node_modules, dist, and test directories
        if (
          !file.startsWith('.') &&
          file !== 'node_modules' &&
          file !== 'dist' &&
          file !== '__tests__' &&
          file !== 'demo'
        ) {
          walk(filePath);
        }
      } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts')) {
        results.push(filePath);
      }
    }
  };

  walk(dir);
  return results;
}

console.log('📁 Scanning for TypeScript files...');
const srcDir = path.join(projectRoot, 'src');
const files = findTypeScriptFiles(srcDir);
console.log(`Found ${files.length} TypeScript files\n`);

console.log('📝 Extracting symbols using AST...\n');

const allSymbols: Symbol[] = [];
const allImports: any[] = [];
let symbolIdCounter = 0;

// Phase 1: Extract all symbols and imports
for (const filePath of files) {
  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(projectRoot, filePath);

  const result = extractor.extract(relativePath, sourceCode);

  console.log(`✅ ${relativePath}`);
  console.log(`   Symbols: ${result.symbols.length}, Imports: ${result.imports.length}`);

  // Convert extracted symbols to DB symbols
  for (const extractedSymbol of result.symbols) {
    const symbol: Symbol = {
      id: `sym-${String(symbolIdCounter++).padStart(4, '0')}`,
      name: extractedSymbol.name,
      type: extractedSymbol.type,
      filePath: extractedSymbol.filePath,
      line: extractedSymbol.line,
      column: extractedSymbol.column,
      isExported: extractedSymbol.isExported,
      isPublic: extractedSymbol.isPublic,
      summary: extractedSymbol.summary,
      tests: [],
      designDecisions: [],
    };

    allSymbols.push(symbol);
  }

  allImports.push(...result.imports);
}

console.log();
console.log('💾 Saving symbols to database...');

// Save all symbols
for (const symbol of allSymbols) {
  dbManager.insertSymbol(symbol, 0);
}

console.log(`   Saved ${allSymbols.length} symbols`);

// Phase 2: Resolve dependencies and create relationships
console.log();
console.log('🔗 Resolving dependencies...');

// Index symbols for dependency resolution
const extractedSymbols = allSymbols.map((s) => ({
  name: s.name,
  type: s.type,
  filePath: s.filePath,
  line: s.line,
  column: s.column,
  isExported: s.isExported,
  isPublic: s.isPublic,
  summary: s.summary,
}));

resolver.indexSymbols(extractedSymbols);
const relationships = resolver.resolveImports(allImports, projectRoot);

console.log(`   Found ${relationships.length} relationships`);

// Save relationships
for (const rel of relationships) {
  // Find symbol IDs
  const fromSymbol = allSymbols.find((s) => s.name === rel.from);
  const toSymbol = allSymbols.find((s) => s.name === rel.to);

  if (fromSymbol && toSymbol) {
    dbManager.insertDependency({
      symbolId: fromSymbol.id,
      target: toSymbol.id,
      type: rel.type,
      reason: rel.description || 'Import dependency',
    });
  }
}

console.log();
console.log('✅ Analysis complete!');
console.log();

const stats = dbManager.getStatistics();
const withDocs = allSymbols.filter((s) => s.summary).length;

console.log(`📊 Statistics:`);
console.log(`   Total symbols: ${stats.totalSymbols}`);
console.log(`   Exported symbols: ${allSymbols.filter((s) => s.isExported).length}`);
console.log(`   With documentation: ${withDocs}`);
console.log(`   Documentation rate: ${((withDocs / stats.totalSymbols) * 100).toFixed(1)}%`);
console.log(`   Relationships: ${relationships.length}`);
console.log();
console.log(`💾 Database saved to: ${dbPath}`);
console.log();
console.log('💡 Try these commands:');
console.log(`   tsdoc-edge scan --depth=1`);
console.log(`   tsdoc-edge scan --depth=2`);

dbManager.close();
