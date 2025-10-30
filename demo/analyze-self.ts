#!/usr/bin/env ts-node

/**
 * Analyze tsdoc-edge project itself
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  type DocCodeSpan,
  type DocNode,
  DocNodeKind,
  type DocParagraph,
  type DocPlainText,
} from '@microsoft/tsdoc';
import { TSDocParser } from '../src/parser/TSDocParser';
import { DatabaseManager } from '../src/storage/DatabaseManager';
import type { Symbol } from '../src/types/graph';

console.log('='.repeat(80));
console.log('Analyzing TSDoc-Edge Project');
console.log('='.repeat(80));
console.log();

const parser = new TSDocParser();
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

let symbolIdCounter = 0;
let totalSymbols = 0;
let totalWithDocs = 0;

console.log('📝 Parsing files...\n');

for (const filePath of files) {
  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const parseResult = parser.parseFile(filePath, sourceCode);

  const relativePath = path.relative(projectRoot, filePath);

  if (parseResult.comments.length > 0) {
    console.log(`✅ ${relativePath} (${parseResult.comments.length} comments)`);

    for (const comment of parseResult.comments) {
      const docComment = comment.docComment;

      // Properly render summary
      const summary = docComment.summarySection
        ? renderDocNodes(docComment.summarySection.nodes)
        : '';

      // Extract symbol name
      const symbolName = comment.symbolName || path.basename(filePath, '.ts');
      const symbolType = inferSymbolType(sourceCode, symbolName);

      const symbol: Symbol = {
        id: `sym-${String(symbolIdCounter++).padStart(4, '0')}`,
        name: symbolName,
        type: symbolType,
        filePath: relativePath,
        line: 1, // Default line number
        column: 0,
        isExported: checkIfExported(sourceCode, symbolName),
        isPublic: checkIfPublic(docComment),
        summary: summary || undefined,
        tests: [],
        designDecisions: [],
      };

      dbManager.insertSymbol(symbol, 0);
      totalSymbols++;
      if (summary) totalWithDocs++;
    }
  }
}

console.log();
console.log('✅ Analysis complete!');
console.log();

const stats = dbManager.getStatistics();
console.log(`📊 Statistics:`);
console.log(`   Total symbols: ${stats.totalSymbols}`);
console.log(`   With documentation: ${totalWithDocs}`);
console.log(`   Documentation rate: ${((totalWithDocs / totalSymbols) * 100).toFixed(1)}%`);
console.log();
console.log(`💾 Database saved to: ${dbPath}`);

dbManager.close();

/**
 * Render an array of DocNodes to plain text
 */
function renderDocNodes(nodes: ReadonlyArray<DocNode>): string {
  let result = '';

  for (const node of nodes) {
    switch (node.kind) {
      case DocNodeKind.PlainText:
        result += (node as DocPlainText).text;
        break;
      case DocNodeKind.SoftBreak:
        result += ' ';
        break;
      case DocNodeKind.Paragraph:
        result += renderDocNodes((node as DocParagraph).nodes);
        result += '\n\n';
        break;
      case DocNodeKind.CodeSpan:
        result += `\`${(node as DocCodeSpan).code}\``;
        break;
      default:
        // Handle other node types
        result += node.toString();
    }
  }

  return result.trim();
}

/**
 * Infer symbol type
 */
function inferSymbolType(sourceCode: string, symbolName: string): Symbol['type'] {
  const regex = new RegExp(`(class|interface|type|function|enum)\\s+${symbolName}\\b`);
  const match = sourceCode.match(regex);

  if (match) {
    const keyword = match[1];
    if (keyword === 'class') return 'class';
    if (keyword === 'interface') return 'interface';
    if (keyword === 'type') return 'type';
    if (keyword === 'function') return 'function';
    if (keyword === 'enum') return 'enum';
  }

  return 'variable';
}

/**
 * Check if exported
 */
function checkIfExported(sourceCode: string, symbolName: string): boolean {
  // Check if export keyword appears before symbol
  const exportRegex = new RegExp(`export\\s+.*${symbolName}\\b`);
  return exportRegex.test(sourceCode);
}

/**
 * Check if public
 */
function checkIfPublic(docComment: any): boolean {
  // Check for @public tag
  const customBlocks = (docComment as any).customBlocks || [];
  for (const block of customBlocks) {
    if (block.blockTag?.tagName === '@public') {
      return true;
    }
  }

  return false;
}
