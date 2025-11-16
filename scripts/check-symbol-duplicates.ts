#!/usr/bin/env ts-node
/**
 * Check for duplicate symbol definitions across documentation
 *
 * This script identifies:
 * 1. Symbols with same name in different files
 * 2. Code blocks defining the same interface/type multiple times
 * 3. Redundant documentation that should be consolidated
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseManager } from '../src/storage/DatabaseManager';

interface DuplicateSymbol {
  name: string;
  occurrences: Array<{
    id: string;
    filePath: string;
    line: number;
    type: string;
  }>;
}

interface CodeBlockDuplicate {
  interfaceName: string;
  files: Array<{
    file: string;
    line: number;
    content: string;
  }>;
}

// Check database for duplicate symbol names
function findDatabaseDuplicates(db: DatabaseManager): DuplicateSymbol[] {
  const allSymbols = db.getAllSymbols();
  const byName = new Map<string, typeof allSymbols>();

  for (const symbol of allSymbols) {
    if (!byName.has(symbol.name)) {
      byName.set(symbol.name, []);
    }
    byName.get(symbol.name)!.push(symbol);
  }

  const duplicates: DuplicateSymbol[] = [];

  for (const [name, symbols] of byName.entries()) {
    if (symbols.length > 1) {
      duplicates.push({
        name,
        occurrences: symbols.map(s => ({
          id: s.id,
          filePath: s.filePath,
          line: s.line,
          type: s.type,
        })),
      });
    }
  }

  return duplicates;
}

// Extract interface definitions from markdown
function extractInterfaceDefinitions(content: string, filePath: string): Array<{ name: string; line: number; content: string }> {
  const lines = content.split('\n');
  const definitions: Array<{ name: string; line: number; content: string }> = [];

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

      const fullContent = blockContent.join('\n');
      const match = fullContent.match(/^(export\s+)?(interface|type)\s+(\w+)/m);

      if (match) {
        definitions.push({
          name: match[3],
          line: blockStart,
          content: fullContent.substring(0, 200),
        });
      }
    } else if (inCodeBlock) {
      blockContent.push(line);
    }
  }

  return definitions;
}

// Find duplicate interface definitions across files
function findCodeBlockDuplicates(baseDir: string): CodeBlockDuplicate[] {
  const allDefinitions = new Map<string, Array<{ file: string; line: number; content: string }>>();

  function scanDirectory(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const defs = extractInterfaceDefinitions(content, fullPath);

        for (const def of defs) {
          if (!allDefinitions.has(def.name)) {
            allDefinitions.set(def.name, []);
          }
          allDefinitions.get(def.name)!.push({
            file: fullPath,
            line: def.line,
            content: def.content,
          });
        }
      }
    }
  }

  scanDirectory(baseDir);

  const duplicates: CodeBlockDuplicate[] = [];

  for (const [name, files] of allDefinitions.entries()) {
    if (files.length > 1) {
      duplicates.push({ interfaceName: name, files });
    }
  }

  return duplicates;
}

// Main execution
console.log('\n=== Symbol Duplication Analysis ===\n');

const db = new DatabaseManager();

// 1. Check database duplicates
console.log('1. Database Symbol Name Duplicates:\n');
const dbDuplicates = findDatabaseDuplicates(db);

if (dbDuplicates.length === 0) {
  console.log('  ✅ No duplicate symbol names in database\n');
} else {
  console.log(`  Found ${dbDuplicates.length} duplicate symbol names:\n`);

  for (const dup of dbDuplicates.slice(0, 10)) {
    console.log(`  ${dup.name} (${dup.occurrences.length} occurrences):`);
    for (const occ of dup.occurrences) {
      console.log(`    - ${occ.filePath}:${occ.line} (${occ.type})`);
    }
    console.log('');
  }

  if (dbDuplicates.length > 10) {
    console.log(`  ... and ${dbDuplicates.length - 10} more\n`);
  }
}

// 2. Check code block duplicates in documentation
console.log('2. Code Block Duplicates in Documentation:\n');
const managedDir = path.join(process.cwd(), 'managed');
const codeBlockDuplicates = findCodeBlockDuplicates(managedDir);

if (codeBlockDuplicates.length === 0) {
  console.log('  ✅ No duplicate interface definitions in documentation\n');
} else {
  console.log(`  Found ${codeBlockDuplicates.length} duplicate interface definitions:\n`);

  for (const dup of codeBlockDuplicates.slice(0, 10)) {
    console.log(`  ${dup.interfaceName} (${dup.files.length} occurrences):`);
    for (const file of dup.files) {
      const relPath = path.relative(process.cwd(), file.file);
      console.log(`    - ${relPath}:${file.line}`);
    }
    console.log('');
  }

  if (codeBlockDuplicates.length > 10) {
    console.log(`  ... and ${codeBlockDuplicates.length - 10} more\n`);
  }
}

// 3. Summary
console.log('=== Summary ===\n');
console.log(`Database duplicates: ${dbDuplicates.length}`);
console.log(`Code block duplicates: ${codeBlockDuplicates.length}`);
console.log(`Total issues: ${dbDuplicates.length + codeBlockDuplicates.length}\n`);

if (dbDuplicates.length === 0 && codeBlockDuplicates.length === 0) {
  console.log('✅ No symbol duplication detected!\n');
} else {
  console.log('⚠️  Duplicates found - consider consolidation\n');
}

db.close();
