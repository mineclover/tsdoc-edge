#!/usr/bin/env ts-node
/**
 * Analyze symbol database and classify code types
 *
 * Three code types:
 * 1. 타입 코드 (Type code): interfaces, types in /types/
 * 2. 구현 코드 (Implementation code): classes, functions
 * 3. 테스트 코드 (Test code): test files
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';

interface CodeTypeAnalysis {
  typeCode: { count: number; symbols: string[] };
  implCode: { count: number; symbols: string[] };
  testCode: { count: number; symbols: string[] };
}

function analyzeCodeTypes(): CodeTypeAnalysis {
  const db = new DatabaseManager();
  const allSymbols = db.getAllSymbols();

  const analysis: CodeTypeAnalysis = {
    typeCode: { count: 0, symbols: [] },
    implCode: { count: 0, symbols: [] },
    testCode: { count: 0, symbols: [] },
  };

  for (const symbol of allSymbols) {
    const filePath = symbol.filePath;
    const symbolRef = `${symbol.name} (${symbol.type}) - ${filePath}:${symbol.line}`;

    // Test code: in __tests__ or .test. files
    if (filePath.includes('__tests__') || filePath.includes('.test.')) {
      analysis.testCode.count++;
      analysis.testCode.symbols.push(symbolRef);
    }
    // Type code: in /types/ directory
    else if (filePath.includes('/types/')) {
      analysis.typeCode.count++;
      analysis.typeCode.symbols.push(symbolRef);
    }
    // Implementation code: everything else
    else {
      analysis.implCode.count++;
      analysis.implCode.symbols.push(symbolRef);
    }
  }

  db.close();
  return analysis;
}

// Run analysis
const result = analyzeCodeTypes();

console.log('\n=== Code Type Analysis ===\n');
console.log(
  `Total Symbols: ${result.typeCode.count + result.implCode.count + result.testCode.count}`
);
console.log('\n타입 코드 (Type Code):');
console.log(`  Count: ${result.typeCode.count}`);
if (result.typeCode.count > 0) {
  console.log('  Examples:');
  result.typeCode.symbols.slice(0, 5).forEach((s) => console.log(`    - ${s}`));
  if (result.typeCode.count > 5) {
    console.log(`    ... and ${result.typeCode.count - 5} more`);
  }
}

console.log('\n구현 코드 (Implementation Code):');
console.log(`  Count: ${result.implCode.count}`);
if (result.implCode.count > 0) {
  console.log('  Examples:');
  result.implCode.symbols.slice(0, 5).forEach((s) => console.log(`    - ${s}`));
  if (result.implCode.count > 5) {
    console.log(`    ... and ${result.implCode.count - 5} more`);
  }
}

console.log('\n테스트 코드 (Test Code):');
console.log(`  Count: ${result.testCode.count}`);
if (result.testCode.count > 0) {
  console.log('  Examples:');
  result.testCode.symbols.slice(0, 5).forEach((s) => console.log(`    - ${s}`));
  if (result.testCode.count > 5) {
    console.log(`    ... and ${result.testCode.count - 5} more`);
  }
}

console.log('\n');
