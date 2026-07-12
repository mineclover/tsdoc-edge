#!/usr/bin/env ts-node

/**
 * Find and analyze orphan files
 * Determines which files are truly orphaned vs legitimate entry points
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseManager } from '../src/storage/DatabaseManager';

console.log('='.repeat(80));
console.log('Orphan File Analysis');
console.log('='.repeat(80));
console.log();

const projectRoot = process.cwd();
const dbPath = path.join(projectRoot, '.tsdoc', 'symbols.db');
const jsonlPath = path.join(projectRoot, '.tsdoc', 'data');

const dbManager = new DatabaseManager(dbPath, jsonlPath);

// Get all files with their symbols
const fileSymbols = new Map<string, any[]>();
const allSymbols = dbManager.db.prepare('SELECT * FROM symbols').all() as any[];

for (const symbol of allSymbols) {
  const filePath = symbol.file_path;
  const symbols = fileSymbols.get(filePath) || [];
  symbols.push(symbol);
  fileSymbols.set(filePath, symbols);
}

console.log(`📊 Total files: ${fileSymbols.size}`);
console.log(`📊 Total symbols: ${allSymbols.length}`);
console.log();

// Read package.json to find entry points
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const entryPointFiles = new Set<string>();

// Add main entry point
if (packageJson.main) {
  entryPointFiles.add(packageJson.main.replace(/^dist\//, 'src/').replace(/\.js$/, '.ts'));
}

// Add bin entry points
if (packageJson.bin) {
  if (typeof packageJson.bin === 'string') {
    entryPointFiles.add(packageJson.bin.replace(/^dist\//, 'src/').replace(/\.js$/, '.ts'));
  } else {
    for (const binPath of Object.values(packageJson.bin)) {
      entryPointFiles.add(
        (binPath as string).replace(/^\.\/dist\//, 'src/').replace(/\.js$/, '.ts')
      );
    }
  }
}

console.log('📍 Entry Points from package.json:');
for (const entry of entryPointFiles) {
  console.log(`   ${entry}`);
}
console.log();

// Recursively find all files reachable from entry points
function getReachableFiles(filePath: string, visited = new Set<string>()): Set<string> {
  if (visited.has(filePath)) return visited;
  if (!fileSymbols.has(filePath)) return visited;

  visited.add(filePath);

  const symbols = fileSymbols.get(filePath) || [];
  for (const symbol of symbols) {
    const deps = dbManager.getDependencies(symbol.id);
    for (const depId of deps) {
      const depSymbol = dbManager.getSymbol(depId);
      if (depSymbol) {
        getReachableFiles(depSymbol.filePath, visited);
      }
    }
  }

  return visited;
}

// Collect all files reachable from entry points
const reachableFromEntryPoints = new Set<string>();
for (const entry of entryPointFiles) {
  const reachable = getReachableFiles(entry);
  for (const file of reachable) {
    reachableFromEntryPoints.add(file);
  }
}

console.log(`🔗 Files reachable from entry points: ${reachableFromEntryPoints.size}`);
console.log();

// Find files that are never imported
const importedFiles = new Set<string>();
const dependencies = dbManager.db
  .prepare(`
  SELECT DISTINCT s.file_path
  FROM symbols s
  JOIN dependencies d ON s.id = d.target
`)
  .all() as Array<{ file_path: string }>;

for (const dep of dependencies) {
  importedFiles.add(dep.file_path);
}

console.log(`📥 Files imported by others: ${importedFiles.size}`);
console.log();

// Categorize orphan files
const orphanCategories = {
  entryPoints: [] as string[],
  reachableFromEntry: [] as string[],
  testFiles: [] as string[],
  demoFiles: [] as string[],
  typeOnlyFiles: [] as string[],
  trueOrphans: [] as string[],
};

for (const [filePath, symbols] of fileSymbols.entries()) {
  // Categorize
  if (entryPointFiles.has(filePath)) {
    orphanCategories.entryPoints.push(filePath);
  } else if (reachableFromEntryPoints.has(filePath)) {
    orphanCategories.reachableFromEntry.push(filePath);
  } else if (filePath.includes('__tests__') || filePath.endsWith('.test.ts')) {
    orphanCategories.testFiles.push(filePath);
  } else if (filePath.startsWith('demo/')) {
    orphanCategories.demoFiles.push(filePath);
  } else if (symbols.every((s: any) => s.type === 'interface' || s.type === 'type')) {
    // Pure type files
    orphanCategories.typeOnlyFiles.push(filePath);
  } else {
    orphanCategories.trueOrphans.push(filePath);
  }
}

// Report
console.log('🔍 Orphan File Analysis:');
console.log('='.repeat(80));
console.log();

console.log('✅ Entry Points (legitimate):');
if (orphanCategories.entryPoints.length === 0) {
  console.log('   None');
} else {
  for (const file of orphanCategories.entryPoints) {
    const symbols = fileSymbols.get(file) || [];
    console.log(`   📄 ${file}`);
    console.log(`      Exports: ${symbols.filter((s) => s.is_exported).length} symbols`);
  }
}
console.log();

console.log('✅ Reachable from Entry Points (legitimate):');
console.log(`   ${orphanCategories.reachableFromEntry.length} files`);
if (orphanCategories.reachableFromEntry.length <= 10) {
  for (const file of orphanCategories.reachableFromEntry) {
    console.log(`   📄 ${file}`);
  }
} else {
  for (const file of orphanCategories.reachableFromEntry.slice(0, 5)) {
    console.log(`   📄 ${file}`);
  }
  console.log(`   ... and ${orphanCategories.reachableFromEntry.length - 5} more`);
}
console.log();

console.log('🧪 Test Files (legitimate):');
if (orphanCategories.testFiles.length === 0) {
  console.log('   None');
} else {
  console.log(`   ${orphanCategories.testFiles.length} files`);
  for (const file of orphanCategories.testFiles.slice(0, 3)) {
    console.log(`   📄 ${file}`);
  }
  if (orphanCategories.testFiles.length > 3) {
    console.log(`   ... and ${orphanCategories.testFiles.length - 3} more`);
  }
}
console.log();

console.log('🎬 Demo Files (legitimate):');
if (orphanCategories.demoFiles.length === 0) {
  console.log('   None');
} else {
  console.log(`   ${orphanCategories.demoFiles.length} files`);
  for (const file of orphanCategories.demoFiles) {
    console.log(`   📄 ${file}`);
  }
}
console.log();

console.log('📐 Type-Only Files (may be legitimate):');
if (orphanCategories.typeOnlyFiles.length === 0) {
  console.log('   None');
} else {
  console.log(`   ${orphanCategories.typeOnlyFiles.length} files`);
  for (const file of orphanCategories.typeOnlyFiles) {
    const symbols = fileSymbols.get(file) || [];
    console.log(`   📄 ${file}`);
    console.log(
      `      Types: ${symbols
        .map((s) => s.name)
        .slice(0, 3)
        .join(', ')}${symbols.length > 3 ? '...' : ''}`
    );
  }
}
console.log();

console.log('⚠️  TRUE ORPHANS (potentially dead code):');
if (orphanCategories.trueOrphans.length === 0) {
  console.log('   ✨ No true orphans found!');
} else {
  console.log(`   ${orphanCategories.trueOrphans.length} files`);
  console.log();

  for (const file of orphanCategories.trueOrphans) {
    const symbols = fileSymbols.get(file) || [];
    console.log(`   📄 ${file}`);
    console.log(`      Symbols: ${symbols.length}`);
    console.log(`      Exported: ${symbols.filter((s) => s.is_exported).length}`);
    console.log(`      Types: ${[...new Set(symbols.map((s) => s.type))].join(', ')}`);

    // Check if any symbol has dependencies (imports other files)
    const hasOutgoingDeps = symbols.some((s: any) => {
      const deps = dbManager.getDependencies(s.id);
      return deps.length > 0;
    });

    if (hasOutgoingDeps) {
      console.log(`      ⚠️  This file imports others but is never imported`);
    } else {
      console.log(`      ⚠️  This file is completely isolated`);
    }

    // Check if imported by anyone
    const isImported = importedFiles.has(file);
    if (isImported) {
      console.log(`      ℹ️  But imported by other files (not reachable from entry)`);
    }

    console.log();
  }
}

console.log('='.repeat(80));
console.log('📊 Summary:');
console.log(`   Entry Points: ${orphanCategories.entryPoints.length}`);
console.log(`   Reachable from Entry: ${orphanCategories.reachableFromEntry.length}`);
console.log(`   Test Files: ${orphanCategories.testFiles.length}`);
console.log(`   Demo Files: ${orphanCategories.demoFiles.length}`);
console.log(`   Type-Only Files: ${orphanCategories.typeOnlyFiles.length}`);
console.log(`   True Orphans: ${orphanCategories.trueOrphans.length}`);
console.log(`   Total Files: ${fileSymbols.size}`);
console.log();

const usedFiles = orphanCategories.entryPoints.length + orphanCategories.reachableFromEntry.length;
const coveragePercentage = ((usedFiles / fileSymbols.size) * 100).toFixed(1);
console.log(`   Entry Point Coverage: ${coveragePercentage}%`);

const orphanPercentage = ((orphanCategories.trueOrphans.length / fileSymbols.size) * 100).toFixed(
  1
);
console.log(`   True Orphan Rate: ${orphanPercentage}%`);

dbManager.close();
