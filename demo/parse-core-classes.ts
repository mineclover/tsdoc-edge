#!/usr/bin/env ts-node

/**
 * Parse core classes and verify documentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { TSDocParser } from '../src/parser/TSDocParser';
import { DatabaseManager } from '../src/storage/DatabaseManager';
import { SymbolRegistryManager } from '../src/storage/SymbolRegistryManager';

console.log('='.repeat(80));
console.log('Parsing Core Classes');
console.log('='.repeat(80));
console.log();

const parser = new TSDocParser();
const dbPath = path.join(__dirname, 'output', 'tsdoc-edge.db');
const jsonlPath = path.join(__dirname, 'output', 'data');
const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');

// Delete old database
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('🗑️  Deleted old database');
}

const dbManager = new DatabaseManager(dbPath, jsonlPath);
const _registry = new SymbolRegistryManager(registryPath);

// Core classes to parse
const coreFiles = [
  { path: 'src/parser/TSDocParser.ts', id: '000', name: 'TSDocParser' },
  { path: 'src/storage/SymbolRegistryManager.ts', id: '001', name: 'SymbolRegistryManager' },
  { path: 'src/storage/DatabaseManager.ts', id: '002', name: 'DatabaseManager' },
  { path: 'src/validator/StrictModeValidator.ts', id: '003', name: 'StrictModeValidator' },
  { path: 'src/graph/SymbolSearchEngine.ts', id: '004', name: 'SymbolSearchEngine' },
  { path: 'src/validator/ConventionValidator.ts', id: '005', name: 'ConventionValidator' },
  { path: 'src/graph/SymbolGraphBuilder.ts', id: '006', name: 'SymbolGraphBuilder' },
  {
    path: 'src/generator/EnhancedMarkdownGenerator.ts',
    id: '007',
    name: 'EnhancedMarkdownGenerator',
  },
  { path: 'src/utils/IdGenerator.ts', id: '008', name: 'IdGenerator' },
];

console.log('📝 Parsing files...\n');

for (const file of coreFiles) {
  const filePath = path.join(process.cwd(), file.path);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file.path}`);
    continue;
  }

  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const parseResult = parser.parseFile(filePath, sourceCode);

  console.log(`✅ ${file.name} (${file.id})`);
  console.log(`   Comments: ${parseResult.comments.length}`);
  console.log(`   Errors: ${parseResult.errors.length}`);

  // Extract @responsibility and @contract from first comment
  if (parseResult.comments.length > 0) {
    const comment = parseResult.comments[0];
    const docComment = comment.docComment;

    // Check for custom tags
    const customBlocks = (docComment as any).customBlocks || [];
    let hasResponsibility = false;
    let hasContract = false;

    for (const block of customBlocks) {
      if (block.blockTag.tagName === '@responsibility') {
        hasResponsibility = true;
      }
      if (block.blockTag.tagName === '@contract') {
        hasContract = true;
      }
    }

    console.log(`   @responsibility: ${hasResponsibility ? '✅' : '❌'}`);
    console.log(`   @contract: ${hasContract ? '✅' : '❌'}`);

    // Insert into database
    const symbol = {
      id: file.id,
      name: file.name,
      type: 'class' as const,
      filePath: file.path,
      line: 1,
      column: 0,
      isExported: true,
      isPublic: true,
      summary: docComment.summarySection?.toString() || '',
      tests: [],
      designDecisions: [],
      responsibility: hasResponsibility
        ? { symbolName: file.name, description: 'Defined' }
        : undefined,
      contract: hasContract ? { symbolName: file.name, description: 'Defined' } : undefined,
    };

    dbManager.insertSymbol(symbol, 0);
  }

  console.log();
}

console.log('✅ Database updated successfully!');
console.log();

// Run queries
console.log('📊 Running verification queries...\n');

const stats = dbManager.getStatistics();
console.log(`Total symbols in database: ${stats.totalSymbols}`);

dbManager.close();
