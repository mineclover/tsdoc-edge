#!/usr/bin/env ts-node
/**
 * Populate test_mappings table
 * Analyzes test files to create symbol -> test file mappings
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseManager } from '../storage/DatabaseManager';

const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
const dbManager = new DatabaseManager(dbPath);

// Get all symbols from database
interface SymbolRow {
  id: string;
  name: string;
  file_path: string;
}

const symbols = dbManager.db.prepare('SELECT id, name, file_path FROM symbols').all() as SymbolRow[];
const symbolMap = new Map<string, string>();

for (const sym of symbols) {
  symbolMap.set(sym.name, sym.id);
}

console.log(`Loaded ${symbols.length} symbols from database`);

// Find all test files
function findTestFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        walk(fullPath);
      } else if (entry.isFile() && /\.(test|spec)\.tsx?$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

// Extract tested symbols from test file
function extractTestedSymbols(testFilePath: string): string[] {
  const content = fs.readFileSync(testFilePath, 'utf-8');
  const testedSymbols = new Set<string>();

  // Pattern 1: import statements
  const importPattern = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importPattern.exec(content)) !== null) {
    const importedItems = match[1].split(',').map(s => s.trim());
    const importPath = match[2];

    // Skip test utilities and external imports
    if (importPath.includes('node:') ||
        importPath.includes('@jest') ||
        importPath.includes('vitest') ||
        importPath === './utils' ||
        importPath === '../utils') {
      continue;
    }

    for (const item of importedItems) {
      // Handle type imports: "type ClassName"
      const cleanName = item.replace(/^type\s+/, '');
      testedSymbols.add(cleanName);
    }
  }

  // Pattern 2: describe() blocks
  const describePattern = /describe\(['"]([^'"]+)['"]/g;
  while ((match = describePattern.exec(content)) !== null) {
    testedSymbols.add(match[1]);
  }

  // Pattern 3: new ClassName()
  const constructorPattern = /new\s+([A-Z][a-zA-Z0-9]*)\s*\(/g;
  while ((match = constructorPattern.exec(content)) !== null) {
    testedSymbols.add(match[1]);
  }

  return Array.from(testedSymbols);
}

// Process test files
const testFiles = findTestFiles('src/__tests__');
console.log(`Found ${testFiles.length} test files\n`);

interface TestMapping {
  symbolId: string;
  testFile: string;
  testName: string;
}

let mappingCount = 0;
const allMappings: TestMapping[] = [];

for (const testFile of testFiles) {
  const testedSymbols = extractTestedSymbols(testFile);
  const relativePath = path.relative(process.cwd(), testFile);

  console.log(`${relativePath}:`);

  if (testedSymbols.length > 0) {
    console.log(`  Tested symbols: ${testedSymbols.slice(0, 5).join(', ')}${testedSymbols.length > 5 ? '...' : ''}`);
  }

  for (const symbolName of testedSymbols) {
    const symbolId = symbolMap.get(symbolName);

    if (symbolId) {
      allMappings.push({
        symbolId: symbolId,
        testFile: relativePath,
        testName: `test:${symbolName}`
      });
    }
  }
}

// Insert all mappings
if (allMappings.length > 0) {
  const insertStmt = dbManager.db.prepare(`
    INSERT OR IGNORE INTO test_mappings (symbol_id, test_file_path, test_name, scenarios)
    VALUES (?, ?, ?, ?)
  `);

  const insertMany = dbManager.db.transaction((mappings: TestMapping[]) => {
    for (const mapping of mappings) {
      const result = insertStmt.run(
        mapping.symbolId,
        mapping.testFile,
        mapping.testName,
        '[]' // Empty scenarios array
      );
      if (result.changes > 0) {
        mappingCount++;
      }
    }
  });

  insertMany(allMappings);

  console.log(`\n=== Summary ===`);
  console.log(`Total mappings created: ${mappingCount}`);
  console.log(`Unique symbols tested: ${new Set(allMappings.map(m => m.symbolId)).size}`);
  console.log(`Test files processed: ${testFiles.length}`);
} else {
  console.log('No mappings created');
}

dbManager.close();
