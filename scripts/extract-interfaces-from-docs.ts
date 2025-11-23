#!/usr/bin/env ts-node
/**
 * Extract interface/type definitions from documentation code blocks
 * and check if they exist in the source code
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseManager } from '../src/storage/DatabaseManager';

interface InterfaceBlock {
  file: string;
  lineStart: number;
  lineEnd: number;
  interfaceName: string;
  content: string;
  existsInCode: boolean;
  symbolInfo?: {
    id: string;
    filePath: string;
    line: number;
  };
}

function extractInterfaces(content: string, filePath: string): InterfaceBlock[] {
  const lines = content.split('\n');
  const blocks: InterfaceBlock[] = [];

  let inCodeBlock = false;
  let blockStart = 0;
  let blockContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```typescript') || line.startsWith('```ts')) {
      inCodeBlock = true;
      blockStart = i + 1;
      blockContent = [];
    } else if (line.startsWith('```') && inCodeBlock) {
      inCodeBlock = false;

      // Check if this block contains an interface/type definition
      const fullContent = blockContent.join('\n');
      const match = fullContent.match(/^(export\s+)?(interface|type)\s+(\w+)/m);

      if (match) {
        const interfaceName = match[3];
        blocks.push({
          file: filePath,
          lineStart: blockStart,
          lineEnd: i,
          interfaceName,
          content: fullContent,
          existsInCode: false,
        });
      }
    } else if (inCodeBlock) {
      blockContent.push(line);
    }
  }

  return blocks;
}

function checkInDatabase(blocks: InterfaceBlock[], db: DatabaseManager): void {
  const allSymbols = db.getAllSymbols();
  const symbolsByName = new Map(allSymbols.map(s => [s.name, s]));

  for (const block of blocks) {
    const symbol = symbolsByName.get(block.interfaceName);
    if (symbol) {
      block.existsInCode = true;
      block.symbolInfo = {
        id: symbol.id,
        filePath: symbol.filePath,
        line: symbol.line,
      };
    }
  }
}

// Target directories
const targetDirs = ['managed/utilities'];

const db = new DatabaseManager();
console.log('\n=== Extracting Interfaces from Documentation ===\n');

const allBlocks: InterfaceBlock[] = [];

for (const dir of targetDirs) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const blocks = extractInterfaces(content, filePath);

    if (blocks.length > 0) {
      allBlocks.push(...blocks);
    }
  }
}

checkInDatabase(allBlocks, db);

// Group by existence
const existsInCode = allBlocks.filter(b => b.existsInCode);
const notInCode = allBlocks.filter(b => !b.existsInCode);

console.log(`Total interface/type definitions found: ${allBlocks.length}`);
console.log(`  Exists in source code: ${existsInCode.length}`);
console.log(`  Not in source code: ${notInCode.length}\n`);

if (existsInCode.length > 0) {
  console.log('Interfaces that should be converted to [[Symbol]] references:\n');

  for (const block of existsInCode) {
    const relPath = path.relative(process.cwd(), block.file);
    console.log(`${relPath}:${block.lineStart}`);
    console.log(`  Interface: ${block.interfaceName}`);
    console.log(`  Source: ${block.symbolInfo!.filePath}:${block.symbolInfo!.line}`);
    console.log(`  Lines: ${block.lineStart}-${block.lineEnd} (${block.lineEnd - block.lineStart + 1} lines)`);
    console.log('');
  }
}

if (notInCode.length > 0) {
  console.log('\nInterfaces NOT found in source code (keep as examples):\n');
  for (const block of notInCode) {
    const relPath = path.relative(process.cwd(), block.file);
    console.log(`  ${relPath}:${block.lineStart} - ${block.interfaceName}`);
  }
}

db.close();
