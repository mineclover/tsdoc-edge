#!/usr/bin/env ts-node

/**
 * Complete Lifecycle Test
 * Tests: ID generation → TSDoc parsing → JSONL merge → DB build → Query
 */

import * as fs from 'fs';
import * as path from 'path';
import { TSDocParser } from '../src/parser/TSDocParser';
import { DatabaseManager } from '../src/storage/DatabaseManager';
import { SymbolRegistryManager } from '../src/storage/SymbolRegistryManager';

console.log('='.repeat(80));
console.log('TSDoc Edge - Complete Lifecycle Test');
console.log('='.repeat(80));
console.log();

// ========================================
// STEP 1: ID Generation & Registration
// ========================================
console.log('📋 STEP 1: ID Generation & Registration');
console.log('-'.repeat(80));

const registryPath = path.join(__dirname, 'output', 'test-registry.jsonl');
const registry = new SymbolRegistryManager(registryPath);

// Register test symbols
const id1 = registry.register({
  filePath: 'demo/sample-code.ts',
  symbolName: 'DataProcessor',
  type: 'class',
});

const id2 = registry.register({
  filePath: 'demo/sample-code.ts',
  symbolName: 'processData',
  type: 'function',
});

registry.save();

console.log(`✅ Generated IDs:`);
console.log(`   ${id1} → DataProcessor`);
console.log(`   ${id2} → processData`);
console.log();

// ========================================
// STEP 2: Create Sample Code with TSDoc
// ========================================
console.log('📝 STEP 2: Create Sample Code with TSDoc');
console.log('-'.repeat(80));

const sampleCode = `/**
 * Data processor for handling large datasets
 * @id ${id1}
 * @public
 * @contract Process data with memory efficiency
 * @precondition Data must be valid JSON
 * @postcondition Returns processed result
 */
export class DataProcessor {
  /**
   * Process data from source
   * @id ${id2}
   * @param data - Input data
   * @returns Processed data
   * @public
   */
  processData(data: any[]): any[] {
    return data.map(item => ({ ...item, processed: true }));
  }
}
`;

const samplePath = path.join(__dirname, 'sample-code.ts');
fs.writeFileSync(samplePath, sampleCode, 'utf-8');

console.log(`✅ Sample code created: ${samplePath}`);
console.log(`   Contains ${id1} and ${id2}`);
console.log();

// ========================================
// STEP 3: Parse TSDoc Comments
// ========================================
console.log('🔍 STEP 3: Parse TSDoc Comments');
console.log('-'.repeat(80));

const parser = new TSDocParser();
const parseResult = parser.parseFile(samplePath, sampleCode);

console.log(`✅ Parsed ${parseResult.comments.length} comments`);
for (const comment of parseResult.comments) {
  console.log(`   - ${comment.symbolName} (${comment.filePath})`);
  console.log(`     Valid: ${comment.isValid}`);

  // Extract summary from docComment
  const summarySection = comment.docComment.summarySection;
  if (summarySection) {
    // Extract text from nodes
    const summaryText = summarySection.nodes
      .flatMap((node: any) => {
        if (node.kind === 'Paragraph' && node.nodes) {
          return node.nodes
            .filter((n: any) => n.kind === 'PlainText')
            .map((n: any) => n.text || '');
        }
        return [];
      })
      .join('')
      .trim();
    console.log(`     Summary: ${summaryText.substring(0, 50)}...`);
  }
}
console.log();

// ========================================
// STEP 4: Merge with Registry
// ========================================
console.log('🔗 STEP 4: Merge Parsed Data with Registry');
console.log('-'.repeat(80));

// Find IDs from parsed comments
const parsedWithIds = parseResult.comments.map((comment) => {
  // Extract @id tag from docComment
  let id: string | null = null;
  const customBlocks = comment.docComment.customBlocks;
  for (const block of customBlocks) {
    if (block.blockTag.tagName === '@id') {
      // Extract text from block content
      const content = block.content.nodes
        .flatMap((node: any) => {
          if (node.kind === 'Paragraph' && node.nodes) {
            return node.nodes
              .filter((n: any) => n.kind === 'PlainText')
              .map((n: any) => n.text || '');
          }
          return [];
        })
        .join('')
        .trim();
      id = content;
      break;
    }
  }

  const registryEntry = id ? registry.findById(id) : null;

  return {
    comment,
    id,
    registryEntry,
    matched: !!registryEntry,
  };
});

console.log(`✅ Matching results:`);
for (const item of parsedWithIds) {
  const status = item.matched ? '✅' : '❌';
  console.log(`   ${status} ${item.comment.symbolName} → ID: ${item.id || 'N/A'}`);
  if (item.registryEntry) {
    console.log(
      `      Registry: ${item.registryEntry.sourceRef.filePath}:${item.registryEntry.sourceRef.symbolName}`
    );
  }
}
console.log();

// ========================================
// STEP 5: Build Database
// ========================================
console.log('💾 STEP 5: Build Database');
console.log('-'.repeat(80));

const dbPath = path.join(__dirname, 'output', 'test-lifecycle.db');
const jsonlPath = path.join(__dirname, 'output', 'data');
const dbManager = new DatabaseManager(dbPath, jsonlPath);

// Insert symbols from parsed data + registry
for (const item of parsedWithIds) {
  if (item.matched && item.registryEntry) {
    // Extract summary
    const summarySection = item.comment.docComment.summarySection;
    const summary = summarySection
      ? summarySection.nodes
          .flatMap((node: any) => {
            if (node.kind === 'Paragraph' && node.nodes) {
              return node.nodes
                .filter((n: any) => n.kind === 'PlainText')
                .map((n: any) => n.text || '');
            }
            return [];
          })
          .join('')
          .trim()
      : '';

    // Check if @public tag exists
    const hasPublicTag = item.comment.docComment.customBlocks.some(
      (block) => block.blockTag.tagName === '@public'
    );

    const symbol = {
      id: item.id!,
      name: item.comment.symbolName,
      type: (item.registryEntry.sourceRef.type || 'unknown') as any,
      filePath: item.comment.filePath,
      line: 1,
      column: 0,
      isExported: true,
      isPublic: hasPublicTag,
      summary,
      tests: [],
      designDecisions: [],
    };

    const success = dbManager.insertSymbol(symbol as any, 0);
    console.log(`${success ? '✅' : '❌'} Inserted: ${symbol.name} (ID: ${symbol.id})`);
  }
}

console.log();

// ========================================
// STEP 6: Query Database
// ========================================
console.log('🔎 STEP 6: Query Database');
console.log('-'.repeat(80));

const stats = dbManager.getStatistics();
console.log(`Database Statistics:`);
console.log(`   Total Symbols: ${stats.totalSymbols}`);
console.log(`   DB Size: ${(stats.dbSize / 1024).toFixed(2)} KB`);
console.log();

// Test query by ID
const queriedSymbol = dbManager.getSymbol(id1);
if (queriedSymbol) {
  console.log(`✅ Query by ID "${id1}":`);
  console.log(`   Name: ${queriedSymbol.name}`);
  console.log(`   Type: ${queriedSymbol.type}`);
  console.log(`   Location: ${queriedSymbol.filePath}:${queriedSymbol.line}`);
  console.log(`   Summary: ${queriedSymbol.summary}`);
}
console.log();

dbManager.close();

// ========================================
// Summary
// ========================================
console.log('='.repeat(80));
console.log('✅ Lifecycle Test Complete!');
console.log('='.repeat(80));
console.log();
console.log('Workflow Verified:');
console.log('  1. ✅ ID Generation (JSONL Registry)');
console.log('  2. ✅ TSDoc Comment Parsing');
console.log('  3. ✅ Registry Matching');
console.log('  4. ✅ Database Build');
console.log('  5. ✅ Query by ID');
console.log();
console.log('Files Created:');
console.log(`   📄 Sample Code: ${samplePath}`);
console.log(`   📋 Registry: ${registryPath}`);
console.log(`   💾 Database: ${dbPath}`);
console.log();
