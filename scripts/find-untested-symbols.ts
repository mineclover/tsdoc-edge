#!/usr/bin/env ts-node
/**
 * Find untested symbols and prioritize them
 * Helps identify critical symbols that need test coverage
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';

const dbPath = '.tsdoc/symbols.db';
const jsonlPath = '.tsdoc';

const db = new DatabaseManager(dbPath, jsonlPath);

console.log('🔍 Untested Symbols Finder\n');

// Get all public implementation symbols
const publicSymbolsQuery = `
  SELECT
    id,
    name,
    type,
    file_path,
    is_public,
    is_exported
  FROM symbols
  WHERE is_public = 1
  AND type IN ('class', 'function', 'interface')
  ORDER BY type, name
`;

const publicSymbols = db['db'].prepare(publicSymbolsQuery).all() as Array<{
  id: string;
  name: string;
  type: string;
  file_path: string;
  is_public: number;
  is_exported: number;
}>;

// Find untested symbols
const untestedSymbols: Array<{
  symbol: typeof publicSymbols[0];
  priority: number;
  reason: string[];
}> = [];

for (const symbol of publicSymbols) {
  // Check if symbol has test coverage
  const coverageQuery = `
    SELECT COUNT(*) as count
    FROM unified_relationships
    WHERE type = 'test-coverage'
    AND to_symbols LIKE '%' || ? || '%'
  `;

  const coverage = db['db'].prepare(coverageQuery).get(symbol.id) as { count: number };

  if (coverage.count === 0) {
    // Calculate priority score (higher = more important to test)
    let priority = 0;
    const reasons: string[] = [];

    // 1. Type priority
    if (symbol.type === 'class') {
      priority += 10;
      reasons.push('Class (high priority)');
    } else if (symbol.type === 'function') {
      priority += 7;
      reasons.push('Function (medium priority)');
    } else if (symbol.type === 'interface') {
      priority += 2;
      reasons.push('Interface (low priority)');
    }

    // 2. Core module priority
    if (symbol.file_path.includes('/storage/')) {
      priority += 8;
      reasons.push('Core storage module');
    } else if (symbol.file_path.includes('/analyzer/')) {
      priority += 7;
      reasons.push('Core analyzer module');
    } else if (symbol.file_path.includes('/commands/')) {
      priority += 6;
      reasons.push('CLI command');
    } else if (symbol.file_path.includes('/parser/')) {
      priority += 7;
      reasons.push('Core parser module');
    } else if (symbol.file_path.includes('/graph/')) {
      priority += 6;
      reasons.push('Graph module');
    }

    // 3. Public API priority
    if (symbol.is_exported === 1) {
      priority += 3;
      reasons.push('Exported API');
    }

    // 4. Name-based heuristics
    if (symbol.name.includes('Manager') || symbol.name.includes('Controller')) {
      priority += 5;
      reasons.push('Manager/Controller pattern');
    }

    if (symbol.name.includes('Service') || symbol.name.includes('Handler')) {
      priority += 4;
      reasons.push('Service/Handler pattern');
    }

    untestedSymbols.push({ symbol, priority, reason: reasons });
  }
}

// Sort by priority
untestedSymbols.sort((a, b) => b.priority - a.priority);

console.log('📊 Summary:');
console.log(`   Total public symbols: ${publicSymbols.length}`);
console.log(`   Untested symbols: ${untestedSymbols.length}`);
console.log(`   Coverage: ${((1 - untestedSymbols.length / publicSymbols.length) * 100).toFixed(1)}%`);
console.log();

// Show top priority untested symbols
console.log('🎯 Top Priority Untested Symbols (Top 30):');
console.log();

const topPriority = untestedSymbols.slice(0, 30);
topPriority.forEach(({ symbol, priority, reason }, index) => {
  const shortPath = symbol.file_path.replace('src/', '');
  console.log(`${(index + 1).toString().padStart(2)}. ${symbol.name.padEnd(35)} [Priority: ${priority}]`);
  console.log(`    Type: ${symbol.type.padEnd(10)} File: ${shortPath}`);
  console.log(`    Reasons: ${reason.join(', ')}`);
  console.log();
});

// Group by module
console.log('📦 Untested Symbols by Module:');
console.log();

const moduleGroups = new Map<string, typeof untestedSymbols>();
for (const item of untestedSymbols) {
  const match = item.symbol.file_path.match(/src\/([^/]+)\//);
  const module = match ? match[1] : 'other';

  if (!moduleGroups.has(module)) {
    moduleGroups.set(module, []);
  }
  moduleGroups.get(module)!.push(item);
}

const sortedModules = Array.from(moduleGroups.entries()).sort((a, b) => {
  const avgPriorityA = a[1].reduce((sum, item) => sum + item.priority, 0) / a[1].length;
  const avgPriorityB = b[1].reduce((sum, item) => sum + item.priority, 0) / b[1].length;
  return avgPriorityB - avgPriorityA;
});

for (const [module, items] of sortedModules) {
  const avgPriority = (items.reduce((sum, item) => sum + item.priority, 0) / items.length).toFixed(1);
  console.log(`   ${module.padEnd(20)} ${items.length.toString().padStart(3)} symbols (avg priority: ${avgPriority})`);
}
console.log();

// Recommendations
console.log('💡 Recommendations:');
console.log();

if (topPriority.length > 0) {
  const topClass = topPriority.find(item => item.symbol.type === 'class');
  if (topClass) {
    console.log(`   1. Start with: ${topClass.symbol.name}`);
    console.log(`      → ${topClass.symbol.file_path}`);
    console.log(`      → Reasons: ${topClass.reason.join(', ')}`);
    console.log();
  }
}

const storageSymbols = untestedSymbols.filter(item => item.symbol.file_path.includes('/storage/'));
if (storageSymbols.length > 0) {
  console.log(`   2. Focus on storage module (${storageSymbols.length} untested symbols)`);
  console.log(`      → Critical for data persistence`);
  console.log();
}

const analyzerSymbols = untestedSymbols.filter(item => item.symbol.file_path.includes('/analyzer/'));
if (analyzerSymbols.length > 0) {
  console.log(`   3. Focus on analyzer module (${analyzerSymbols.length} untested symbols)`);
  console.log(`      → Critical for code analysis accuracy`);
  console.log();
}

console.log('📝 Next Steps:');
console.log('   1. Create test file for top priority symbol');
console.log('   2. Write test cases covering main functionality');
console.log('   3. Run: npm run build src --force');
console.log('   4. Re-run this script to see progress');
console.log();

db.close();
