/**
 * LSP Service Test Script
 * Tests the TsdocEdgeService with actual database
 */

import * as path from 'node:path';
import { TsdocEdgeService } from '../src/lsp/service';

const workspaceRoot = process.cwd();
console.log('='.repeat(60));
console.log('TSDoc Edge LSP Service Test');
console.log('='.repeat(60));
console.log(`Workspace: ${workspaceRoot}`);
console.log();

const service = new TsdocEdgeService(workspaceRoot);

// Test 1: Code Lenses
console.log('## Code Lenses Test');
console.log('-'.repeat(40));
const testFiles = [
  'src/lsp/service.ts',
  'src/analyzer/DependencyChainAnalyzer.ts',
  'src/commands/BuildCommand.ts',
];

for (const file of testFiles) {
  const lenses = service.getCodeLenses(path.join(workspaceRoot, file));
  console.log(`\n${file}:`);
  if (lenses.length === 0) {
    console.log('  (no code lenses)');
  } else {
    for (const lens of lenses.slice(0, 5)) {
      console.log(`  Line ${lens.line}: ${lens.title} (${lens.symbolId})`);
    }
    if (lenses.length > 5) {
      console.log(`  ... and ${lenses.length - 5} more`);
    }
  }
}

// Test 2: Hover Info
console.log('\n\n## Hover Info Test');
console.log('-'.repeat(40));
const hoverTests = [
  { file: 'src/lsp/service.ts', line: 55, char: 10 },
  { file: 'src/analyzer/DependencyChainAnalyzer.ts', line: 50, char: 10 },
];

for (const test of hoverTests) {
  const hover = service.getHoverInfo(path.join(workspaceRoot, test.file), test.line, test.char);
  console.log(`\n${test.file}:${test.line}:`);
  if (hover) {
    // Show first 500 chars
    console.log(hover.slice(0, 500));
    if (hover.length > 500) {
      console.log('...');
    }
  } else {
    console.log('  (no hover info)');
  }
}

// Test 3: Symbol Search
console.log('\n\n## Symbol Search Test');
console.log('-'.repeat(40));
const queries = ['Analyzer', 'Command', 'Service', 'Relationship'];

for (const query of queries) {
  const symbols = service.searchSymbols(query);
  console.log(`\nQuery "${query}": ${symbols.length} results`);
  for (const sym of symbols.slice(0, 3)) {
    console.log(`  - ${sym.name} (${sym.filePath}:${sym.line})`);
  }
  if (symbols.length > 3) {
    console.log(`  ... and ${symbols.length - 3} more`);
  }
}

// Test 4: Diagnostics
console.log('\n\n## Diagnostics Test');
console.log('-'.repeat(40));
for (const file of testFiles) {
  const diagnostics = service.getDiagnostics(path.join(workspaceRoot, file));
  console.log(`\n${file}: ${diagnostics.length} diagnostics`);
  for (const diag of diagnostics.slice(0, 3)) {
    const severity = ['', 'ERROR', 'WARN', 'INFO', 'HINT'][diag.severity] || 'UNKNOWN';
    console.log(`  [${severity}] Line ${diag.line}: ${diag.message}`);
  }
}

// Test 5: NEW - Symbol At Position
console.log('\n\n## Symbol At Position Test (NEW)');
console.log('-'.repeat(40));
const positionTests = [
  { file: 'src/lsp/service.ts', line: 55 },
  { file: 'src/commands/BuildCommand.ts', line: 55 },
];

for (const test of positionTests) {
  const symbol = service.getSymbolAtPosition(path.join(workspaceRoot, test.file), test.line);
  console.log(`\n${test.file}:${test.line}:`);
  if (symbol) {
    console.log(`  ID: ${symbol.id}`);
    console.log(`  Name: ${symbol.name}`);
    console.log(`  Type: ${symbol.type}`);
  } else {
    console.log('  (no symbol found)');
  }
}

// Test 6: NEW - Impact Analysis
console.log('\n\n## Impact Analysis Test (NEW)');
console.log('-'.repeat(40));
const impactTests = [
  'class-buildcommand',
  'class-tsdocedgeservice',
  'class-dependencychainanalyzer',
];

for (const symbolId of impactTests) {
  const impact = service.getImpactAnalysis(symbolId, 3);
  console.log(`\n${symbolId}:`);
  console.log(`  Downstream: ${impact.downstream} symbols`);
  console.log(`  Upstream: ${impact.upstream} symbols`);
  if (impact.symbols.length > 0) {
    console.log(
      `  Affected: ${impact.symbols.slice(0, 5).join(', ')}${impact.symbols.length > 5 ? '...' : ''}`
    );
  }
}

// Test 7: NEW - Related Symbols
console.log('\n\n## Related Symbols Test (NEW)');
console.log('-'.repeat(40));
const relatedTests = ['class-buildcommand', 'class-tsdocedgeservice'];

for (const symbolId of relatedTests) {
  const related = service.getRelatedSymbols(symbolId, 5);
  console.log(`\n${symbolId}: ${related.length} related symbols`);
  for (const rel of related) {
    console.log(`  - ${rel.name} (${rel.type}) via ${rel.relationshipType}`);
  }
}

// Test 8: NEW - Find Symbol By Name
console.log('\n\n## Find Symbol By Name Test (NEW)');
console.log('-'.repeat(40));
const nameTests = [
  'BuildCommand',
  'TsdocEdgeService',
  'DependencyChainAnalyzer',
  'NonExistentSymbol',
];

for (const name of nameTests) {
  const symbol = service.findSymbolByName(name);
  console.log(`\n"${name}":`);
  if (symbol) {
    console.log(`  Found: ${symbol.name} (${symbol.type})`);
    console.log(`  Location: ${symbol.filePath}:${symbol.line}`);
  } else {
    console.log('  (not found)');
  }
}

// Test 9: Cache Performance
console.log('\n\n## Cache Performance Test');
console.log('-'.repeat(40));
const testFile = path.join(workspaceRoot, 'src/lsp/service.ts');

console.log('First call (cold cache):');
let start = Date.now();
service.getCodeLenses(testFile);
console.log(`  Time: ${Date.now() - start}ms`);

console.log('Second call (warm cache):');
start = Date.now();
service.getCodeLenses(testFile);
console.log(`  Time: ${Date.now() - start}ms`);

console.log('After invalidation:');
service.invalidateFileCache(testFile);
start = Date.now();
service.getCodeLenses(testFile);
console.log(`  Time: ${Date.now() - start}ms`);

service.close();
console.log('\n\nTest completed.');
