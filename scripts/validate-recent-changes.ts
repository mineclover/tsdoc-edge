#!/usr/bin/env ts-node
/**
 * Validate all symbol references in recently modified documentation files
 */

import * as fs from 'node:fs';
import { DatabaseManager } from '../src/storage/DatabaseManager';

const modifiedFiles = [
  'managed/types/EnhancedTagTypes.md',
  'managed/types/SpecTypes.md',
  'managed/utilities/SymbolSearchEngine.md',
  'managed/utilities/ConnectivityValidator.md',
  'managed/utilities/ConventionValidator.md',
  'managed/utilities/FileScanner.md',
  'managed/utilities/ModuleSpecValidator.md',
  'managed/relationships/STANDARD-FORMAT.md',
  'managed/analyzers/CodeHealthChecker.md',
];

interface SymbolRef {
  symbol: string;
  line: number;
}

function extractSymbolRefs(content: string): SymbolRef[] {
  const refs: SymbolRef[] = [];
  const lines = content.split('\n');
  const pattern = /See implementation:\s*\[\[([^\]]+)\]\]/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    while ((match = pattern.exec(line)) !== null) {
      refs.push({
        symbol: match[1],
        line: i + 1,
      });
    }
  }

  return refs;
}

const db = new DatabaseManager();
const allSymbols = db.getAllSymbols();
const symbolsByName = new Map(allSymbols.map((s) => [s.name, s]));

console.log('\n=== Validating Recently Modified Documentation ===\n');
console.log(`Total symbols in database: ${allSymbols.length}\n`);

let totalRefs = 0;
let foundRefs = 0;
let missingRefs = 0;

for (const file of modifiedFiles) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const refs = extractSymbolRefs(content);

    if (refs.length > 0) {
      console.log(`${file}:`);

      for (const ref of refs) {
        totalRefs++;
        const symbol = symbolsByName.get(ref.symbol);

        if (symbol) {
          foundRefs++;
          const codeType = symbol.filePath.includes('/types/')
            ? 'type'
            : symbol.filePath.includes('__tests__') || symbol.filePath.includes('.test.')
              ? 'test'
              : 'impl';
          console.log(`  ✓ [[${ref.symbol}]] → ${symbol.filePath}:${symbol.line} (${codeType})`);
        } else {
          missingRefs++;
          console.log(`  ✗ [[${ref.symbol}]] - NOT FOUND`);
        }
      }
      console.log('');
    }
  } catch (error) {
    console.log(`  ⚠ Could not read ${file}: ${error}`);
  }
}

console.log('=== Summary ===\n');
console.log(`Total "See implementation:" references: ${totalRefs}`);
console.log(`Found in database: ${foundRefs} (${Math.round((foundRefs / totalRefs) * 100)}%)`);
console.log(`Missing: ${missingRefs} (${Math.round((missingRefs / totalRefs) * 100)}%)\n`);

if (missingRefs === 0) {
  console.log('✅ All symbol references are valid!\n');
} else {
  console.log('⚠ Some symbols are missing from the database.\n');
}

db.close();
