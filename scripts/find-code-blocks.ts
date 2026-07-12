#!/usr/bin/env ts-node
/**
 * Find TypeScript/JavaScript code blocks in markdown files
 * Identifies files that need code block cleanup
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface CodeBlockInfo {
  file: string;
  blocks: Array<{
    line: number;
    type: string;
    content: string;
    linesCount: number;
  }>;
}

function extractCodeBlocks(content: string, filePath: string): CodeBlockInfo {
  const lines = content.split('\n');
  const blocks: CodeBlockInfo['blocks'] = [];

  let inCodeBlock = false;
  let blockStart = 0;
  let blockType = '';
  let blockContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        // Starting a code block
        inCodeBlock = true;
        blockStart = i + 1;
        blockType = line.substring(3).trim() || 'plain';
        blockContent = [];
      } else {
        // Ending a code block
        inCodeBlock = false;

        // Only track TypeScript/JavaScript code blocks
        if (['typescript', 'ts', 'javascript', 'js', 'tsx', 'jsx'].includes(blockType)) {
          const content = blockContent.join('\n');

          // Check if it's a type/interface definition
          const hasInterface = /^(export\s+)?(interface|type)\s+\w+/.test(content.trim());
          const hasClass = /^(export\s+)?(class|function|const|let)\s+\w+/.test(content.trim());

          if (hasInterface || hasClass) {
            blocks.push({
              line: blockStart,
              type: blockType,
              content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
              linesCount: blockContent.length,
            });
          }
        }
      }
    } else if (inCodeBlock) {
      blockContent.push(line);
    }
  }

  return { file: filePath, blocks };
}

function getAllMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

// Target specific directories
const targetDirs = [
  'managed/analyzers',
  'managed/commands',
  'managed/utilities',
  'managed/parser',
  'managed/parsers',
  'managed/graph',
  'managed/storage',
  'managed/relationships',
];

console.log('\n=== Finding Code Blocks in Documentation ===\n');

const results: CodeBlockInfo[] = [];
let totalFiles = 0;
let filesWithCodeBlocks = 0;
let totalCodeBlocks = 0;

for (const dir of targetDirs) {
  const dirPath = path.join(process.cwd(), dir);

  if (!fs.existsSync(dirPath)) {
    console.log(`⚠ Directory not found: ${dir}`);
    continue;
  }

  const files = getAllMarkdownFiles(dirPath);
  totalFiles += files.length;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const info = extractCodeBlocks(content, file);

    if (info.blocks.length > 0) {
      filesWithCodeBlocks++;
      totalCodeBlocks += info.blocks.length;
      results.push(info);
    }
  }
}

console.log(`Total files scanned: ${totalFiles}`);
console.log(`Files with code blocks: ${filesWithCodeBlocks}`);
console.log(`Total code blocks found: ${totalCodeBlocks}\n`);

// Sort by number of blocks (descending)
results.sort((a, b) => b.blocks.length - a.blocks.length);

// Show top 20 files
console.log('Top files with most code blocks:\n');
for (const result of results.slice(0, 20)) {
  const relPath = path.relative(process.cwd(), result.file);
  console.log(`${relPath} (${result.blocks.length} blocks):`);

  for (const block of result.blocks.slice(0, 2)) {
    const preview = block.content.split('\n')[0];
    console.log(`  - Line ${block.line}: ${preview} (${block.linesCount} lines)`);
  }

  if (result.blocks.length > 2) {
    console.log(`  ... and ${result.blocks.length - 2} more blocks`);
  }
  console.log('');
}

if (results.length > 20) {
  console.log(`... and ${results.length - 20} more files\n`);
}

// Group by directory
console.log('\nCode blocks by directory:\n');
const byDir = new Map<string, number>();
for (const result of results) {
  const dir = path.dirname(result.file).replace(`${process.cwd()}/`, '');
  byDir.set(dir, (byDir.get(dir) || 0) + result.blocks.length);
}

const sortedDirs = Array.from(byDir.entries()).sort((a, b) => b[1] - a[1]);
for (const [dir, count] of sortedDirs) {
  console.log(`  ${dir}: ${count} code blocks`);
}

console.log('');
