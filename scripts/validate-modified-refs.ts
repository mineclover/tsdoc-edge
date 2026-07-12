#!/usr/bin/env ts-node
/**
 * Validate symbol references in recently modified type documentation files
 */

import * as fs from 'node:fs';
import { DatabaseManager } from '../src/storage/DatabaseManager';

// Files modified in the recent commits
const modifiedFiles = [
  // managed/types/
  'managed/types/FeatureTypes.md',
  'managed/types/ParseTypes.md',
  'managed/types/InterfaceTypes.md',
  'managed/types/CustomTagTypes.md',
  'managed/types/TypeChain.md',
  'managed/types/AnalyticsTypes.md',
  'managed/types/CodeHealthMetrics.md',
  'managed/types/CommentStateTypes.md',
  'managed/types/DataFlowTypes.md',
  'managed/types/EnhancedTagTypes.md',
  'managed/types/LinkingTypes.md',
  'managed/types/ModuleSpecTagTypes.md',
  'managed/types/ModuleSpecTypes.md',
  'managed/types/RegistryTypes.md',
  'managed/types/SpecTypes.md',
  'managed/types/TestRelationships.md',
  'managed/types/DocumentSymbol.md',
  // managed/primary-types/
  'managed/primary-types/TsdocEdgeConfig.md',
  'managed/primary-types/ExtractionResult.md',
  'managed/primary-types/EnhancedSymbolDoc.md',
];

interface SymbolRef {
  symbol: string;
  line: number;
  content: string;
}

function extractSymbolRefs(content: string): SymbolRef[] {
  const refs: SymbolRef[] = [];
  const lines = content.split('\n');
  const pattern = /See implementation:\s*\[\[([^\]]+)\]\]/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const match of line.matchAll(pattern)) {
      refs.push({
        symbol: match[1],
        line: i + 1,
        content: line.trim(),
      });
    }
  }

  return refs;
}

const db = new DatabaseManager();
const allSymbols = db.getAllSymbols();
const symbolsByName = new Map(allSymbols.map((s) => [s.name, s]));

console.log('\n=== Validating Modified Type Documentation Files ===\n');
console.log(`Database contains ${allSymbols.length} symbols\n`);

let totalRefs = 0;
let foundRefs = 0;
let missingRefs = 0;
const issues: Array<{ file: string; symbol: string; line: number }> = [];

for (const file of modifiedFiles) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const refs = extractSymbolRefs(content);

    for (const ref of refs) {
      totalRefs++;
      const symbol = symbolsByName.get(ref.symbol);

      if (symbol) {
        foundRefs++;
        // Get code type
        const filePath = symbol.filePath;
        let codeType = 'unknown';
        if (filePath.includes('__tests__') || filePath.includes('.test.')) {
          codeType = 'test';
        } else if (filePath.includes('/types/')) {
          codeType = 'type';
        } else {
          codeType = 'impl';
        }

        console.log(
          `✓ ${ref.symbol} (${symbol.type}, ${codeType}) - ${symbol.filePath}:${symbol.line}`
        );
      } else {
        missingRefs++;
        issues.push({ file, symbol: ref.symbol, line: ref.line });
        console.log(`✗ ${ref.symbol} - NOT FOUND`);
      }
    }
  } catch (error) {
    console.log(`⚠ Could not read ${file}: ${error}`);
  }
}

console.log('\n=== Summary ===\n');
console.log(`Total "See implementation:" references: ${totalRefs}`);
console.log(`Found in database: ${foundRefs} (${Math.round((foundRefs / totalRefs) * 100)}%)`);
console.log(`Missing: ${missingRefs} (${Math.round((missingRefs / totalRefs) * 100)}%)\n`);

if (issues.length > 0) {
  console.log('Missing symbols:');
  for (const issue of issues) {
    console.log(`  - [[${issue.symbol}]] in ${issue.file}:${issue.line}`);
  }
  console.log('');
}

db.close();
