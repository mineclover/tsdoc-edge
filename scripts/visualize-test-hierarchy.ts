#!/usr/bin/env ts-node
/**
 * Visualize test hierarchy
 * Shows test suite structure in a tree format
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';

const dbPath = '.tsdoc/symbols.db';
const jsonlPath = '.tsdoc';

const db = new DatabaseManager(dbPath, jsonlPath);

console.log('🌳 Test Hierarchy Visualizer\n');

// Get all test symbols
const testSymbolsQuery = `
  SELECT
    id,
    name,
    type,
    file_path,
    line
  FROM symbols
  WHERE type IN ('test-suite', 'test-case', 'test-scenario')
  ORDER BY file_path, line
`;

const testSymbols = db.db.prepare(testSymbolsQuery).all() as Array<{
  id: string;
  name: string;
  type: string;
  file_path: string;
  line: number;
}>;

// Get relationships
const relationshipsQuery = `
  SELECT
    from_symbols,
    to_symbols,
    type
  FROM unified_relationships
  WHERE type = 'contains'
`;

const relationships = db.db.prepare(relationshipsQuery).all() as Array<{
  from_symbols: string;
  to_symbols: string;
  type: string;
}>;

console.log('📊 Summary:');
console.log(`   Test Suites: ${testSymbols.filter((s) => s.type === 'test-suite').length}`);
console.log(`   Test Cases: ${testSymbols.filter((s) => s.type === 'test-case').length}`);
console.log(`   Test Scenarios: ${testSymbols.filter((s) => s.type === 'test-scenario').length}`);
console.log();

// Group symbols by file
const fileGroups = new Map<string, typeof testSymbols>();
for (const symbol of testSymbols) {
  if (!fileGroups.has(symbol.file_path)) {
    fileGroups.set(symbol.file_path, []);
  }
  fileGroups.get(symbol.file_path)?.push(symbol);
}

// Build parent-child relationships map
const childrenMap = new Map<string, string[]>();
for (const rel of relationships) {
  if (!childrenMap.has(rel.from_symbols)) {
    childrenMap.set(rel.from_symbols, []);
  }
  childrenMap.get(rel.from_symbols)?.push(rel.to_symbols);
}

// Build symbol lookup map
const symbolMap = new Map<string, (typeof testSymbols)[0]>();
for (const symbol of testSymbols) {
  symbolMap.set(symbol.id, symbol);
}

// Find root suites (suites with no parent)
function findRootSuites(fileSymbols: typeof testSymbols): string[] {
  const allSuiteIds = fileSymbols.filter((s) => s.type === 'test-suite').map((s) => s.id);
  const childSuiteIds = new Set<string>();

  for (const [_parentId, children] of childrenMap.entries()) {
    for (const childId of children) {
      const child = symbolMap.get(childId);
      if (child && child.type === 'test-suite') {
        childSuiteIds.add(childId);
      }
    }
  }

  return allSuiteIds.filter((id) => !childSuiteIds.has(id));
}

// Render tree recursively
function renderTree(symbolId: string, prefix: string = '', isLast: boolean = true): void {
  const symbol = symbolMap.get(symbolId);
  if (!symbol) return;

  // Choose icon based on type
  let icon = '';
  if (symbol.type === 'test-suite') {
    icon = '📦';
  } else if (symbol.type === 'test-case') {
    icon = '✓';
  } else if (symbol.type === 'test-scenario') {
    icon = '📋';
  }

  // Print current symbol
  const connector = isLast ? '└─ ' : '├─ ';
  console.log(`${prefix}${connector}${icon} ${symbol.name}`);

  // Get children
  const children = childrenMap.get(symbolId) || [];

  // Sort children: suites first, then test cases
  const sortedChildren = children
    .map((id) => symbolMap.get(id))
    .filter((s): s is typeof symbol => s !== undefined)
    .sort((a, b) => {
      if (a.type === b.type) return a.line - b.line;
      if (a.type === 'test-suite') return -1;
      if (b.type === 'test-suite') return 1;
      return 0;
    });

  // Render children
  const newPrefix = prefix + (isLast ? '   ' : '│  ');
  sortedChildren.forEach((child, index) => {
    const childIsLast = index === sortedChildren.length - 1;
    renderTree(child.id, newPrefix, childIsLast);
  });
}

// Show hierarchy for each test file
const sortedFiles = Array.from(fileGroups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

for (const [filePath, fileSymbols] of sortedFiles) {
  const shortPath = filePath.replace('src/', '');
  console.log(`📄 ${shortPath}`);

  // Show test scenarios first
  const scenarios = fileSymbols.filter((s) => s.type === 'test-scenario');
  if (scenarios.length > 0) {
    console.log('   Test Scenarios:');
    scenarios.forEach((scenario) => {
      console.log(`   │  📋 ${scenario.name}`);
    });
    console.log('   │');
  }

  // Show test hierarchy
  const rootSuites = findRootSuites(fileSymbols);

  if (rootSuites.length > 0) {
    console.log('   Test Hierarchy:');
    rootSuites.forEach((rootId, index) => {
      const isLast = index === rootSuites.length - 1;
      renderTree(rootId, '   ', isLast);
    });
  }

  console.log();
}

// Statistics by file
console.log('📈 Test Distribution:');
console.log();

const fileStats = Array.from(fileGroups.entries()).map(([filePath, symbols]) => {
  const suites = symbols.filter((s) => s.type === 'test-suite').length;
  const cases = symbols.filter((s) => s.type === 'test-case').length;
  const scenarios = symbols.filter((s) => s.type === 'test-scenario').length;

  return {
    file: filePath.replace('src/__tests__/', '').replace('.test.ts', ''),
    suites,
    cases,
    scenarios,
    total: suites + cases + scenarios,
  };
});

fileStats.sort((a, b) => b.total - a.total);

console.log(
  `   ${'File'.padEnd(40)} ${'Suites'.padStart(7)} ${'Cases'.padStart(7)} ${'Scenarios'.padStart(10)} ${'Total'.padStart(7)}`
);
console.log(
  `   ${'─'.repeat(40)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(10)} ${'─'.repeat(7)}`
);

for (const stat of fileStats.slice(0, 20)) {
  console.log(
    `   ${stat.file.padEnd(40)} ${stat.suites.toString().padStart(7)} ${stat.cases.toString().padStart(7)} ${stat.scenarios.toString().padStart(10)} ${stat.total.toString().padStart(7)}`
  );
}

if (fileStats.length > 20) {
  console.log(`   ... and ${fileStats.length - 20} more files`);
}

console.log();

// Test depth analysis
console.log('📊 Nesting Depth Analysis:');
console.log();

function calculateDepth(symbolId: string, depth: number = 0): number {
  const children = childrenMap.get(symbolId) || [];
  if (children.length === 0) return depth;

  return Math.max(...children.map((childId) => calculateDepth(childId, depth + 1)));
}

const rootSuitesAll = testSymbols
  .filter((s) => s.type === 'test-suite')
  .filter((s) => {
    // Check if this suite is a child of another suite
    for (const [_, children] of childrenMap.entries()) {
      if (children.includes(s.id)) {
        const parent = symbolMap.get(_);
        if (parent && parent.type === 'test-suite') {
          return false;
        }
      }
    }
    return true;
  });

const depths = rootSuitesAll.map((suite) => ({
  name: suite.name,
  file: suite.file_path.replace('src/__tests__/', ''),
  depth: calculateDepth(suite.id),
}));

depths.sort((a, b) => b.depth - a.depth);

console.log(`   ${'Test Suite'.padEnd(40)} ${'Max Depth'.padStart(10)}`);
console.log(`   ${'─'.repeat(40)} ${'─'.repeat(10)}`);

for (const { name, depth } of depths.slice(0, 10)) {
  console.log(`   ${name.padEnd(40)} ${depth.toString().padStart(10)}`);
}

console.log();

db.close();
