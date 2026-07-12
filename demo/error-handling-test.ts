/**
 * Error Handling Test Suite
 *
 * Tests production-ready error handling across all core modules
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CoverageParser } from '../src/analyzer/CoverageParser';
import { ConfigManager } from '../src/config/ConfigManager';
import { TSDocParser } from '../src/parser/TSDocParser';
import { DatabaseManager } from '../src/storage/DatabaseManager';

/**
 * Test results interface
 */
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  expectedError?: string;
}

const results: TestResult[] = [];

/**
 * Test runner helper
 */
function test(name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
      results.push({ name, passed: false, error: 'Expected error but none was thrown' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        name,
        passed: true,
        expectedError: errorMessage,
      });
    }
  };
}

/**
 * Test successful case helper
 */
function testSuccess(name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
      results.push({ name, passed: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({
        name,
        passed: false,
        error: errorMessage,
      });
    }
  };
}

async function runTests() {
  console.log('🧪 TSDoc Edge - Error Handling Test Suite\n');
  console.log('='.repeat(60));
  console.log('\n📋 Testing Production Error Scenarios\n');

  // ========================================
  // 1. CoverageParser Error Cases
  // ========================================
  console.log('1️⃣  Coverage Parser Tests');
  console.log('-'.repeat(40));

  await test('Coverage file not found', () => {
    const parser = new CoverageParser();
    parser.parse('/nonexistent/coverage.json');
  })();

  await test('Invalid JSON in coverage file', () => {
    const parser = new CoverageParser();
    const tempFile = path.join(__dirname, 'temp-invalid.json');
    fs.writeFileSync(tempFile, '{ invalid json content }');
    try {
      parser.parse(tempFile);
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  })();

  await testSuccess('Valid coverage file parsing', () => {
    const parser = new CoverageParser();
    const tempFile = path.join(__dirname, 'temp-valid-coverage.json');
    const validCoverage = {
      '/test/file.ts': {
        path: '/test/file.ts',
        s: { '0': 1, '1': 0 },
        f: { '0': 1 },
        b: { '0': [1, 0] },
        statementMap: {
          '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          '1': { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
        },
        fnMap: {
          '0': { name: 'test', decl: { start: { line: 1 } }, loc: { start: { line: 1 } } },
        },
      },
    };
    fs.writeFileSync(tempFile, JSON.stringify(validCoverage));
    try {
      const result = parser.parse(tempFile);
      if (result.totalFiles !== 1) {
        throw new Error('Invalid parsing result');
      }
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  })();

  // ========================================
  // 2. ConfigManager Error Cases
  // ========================================
  console.log('\n2️⃣  Config Manager Tests');
  console.log('-'.repeat(40));

  await test('Config file with invalid JSON', () => {
    ConfigManager.reset();
    const tempDir = path.join(__dirname, 'temp-config-test');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const configPath = path.join(tempDir, '.tsdoc.config.json');
    fs.writeFileSync(configPath, '{ invalid: json }');
    try {
      ConfigManager.getInstance(tempDir);
    } finally {
      if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
      ConfigManager.reset();
    }
  })();

  await test('Config initialization when file exists (without force)', () => {
    ConfigManager.reset();
    const tempDir = path.join(__dirname, 'temp-config-init');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const configPath = path.join(tempDir, '.tsdoc.config.json');
    fs.writeFileSync(configPath, '{}');
    try {
      const config = ConfigManager.getInstance(tempDir);
      config.init({}, false);
    } finally {
      if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
      ConfigManager.reset();
    }
  })();

  await testSuccess('Valid config loading', () => {
    ConfigManager.reset();
    const tempDir = path.join(__dirname, 'temp-valid-config');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const configPath = path.join(tempDir, '.tsdoc.config.json');
    const validConfig = {
      project: { name: 'test', version: '1.0.0' },
      paths: {
        commentsDir: '.comments',
        databasePath: '.tsdoc.db',
        jsonlDir: 'data',
      },
    };
    fs.writeFileSync(configPath, JSON.stringify(validConfig));
    try {
      const config = ConfigManager.getInstance(tempDir);
      const loaded = config.get();
      if (loaded.project.name !== 'test') {
        throw new Error('Config loading failed');
      }
    } finally {
      if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
      ConfigManager.reset();
    }
  })();

  // ========================================
  // 3. TSDocParser Error Cases
  // ========================================
  console.log('\n3️⃣  TSDoc Parser Tests');
  console.log('-'.repeat(40));

  await testSuccess('Parse empty file', () => {
    const parser = new TSDocParser();
    const content = '';
    const result = parser.parseFile('/test.ts', content);
    if (result.comments.length !== 0) {
      throw new Error('Expected no comments in empty file');
    }
  })();

  await testSuccess('Parse file with malformed TSDoc', () => {
    const parser = new TSDocParser();
    const content = `
/**
 * Malformed TSDoc comment
 * Missing closing tag
 * @param foo - {invalid
export function test(foo: string) {}
`;
    const result = parser.parseFile('/test.ts', content);
    // Should parse but may have errors
    if (!result) {
      throw new Error('Parser should handle malformed TSDoc gracefully');
    }
  })();

  await testSuccess('Parse file with valid TSDoc', () => {
    const parser = new TSDocParser();
    const content = `
/**
 * Valid function with TSDoc
 * @param foo - Parameter description
 * @returns Return value description
 */
export function validFunction(foo: string): string {
  return foo;
}
`;
    const result = parser.parseFile('/test.ts', content);
    if (result.comments.length === 0) {
      throw new Error('Should find at least one comment');
    }
  })();

  // ========================================
  // 4. DatabaseManager Error Cases
  // ========================================
  console.log('\n4️⃣  Database Manager Tests');
  console.log('-'.repeat(40));

  await test('Load from non-existent JSONL file', () => {
    const tempDb = path.join(__dirname, 'temp-test.db');
    const db = new DatabaseManager(tempDb, './nonexistent');
    try {
      db.importFromJSONL('/nonexistent/file.jsonl');
    } finally {
      db.close();
      if (fs.existsSync(tempDb)) fs.unlinkSync(tempDb);
    }
  })();

  await testSuccess('Create and query database', () => {
    const tempDb = path.join(__dirname, 'temp-db-test.db');
    const db = new DatabaseManager(tempDb, './temp-jsonl');
    try {
      db.insertSymbol(
        {
          id: 'test-001',
          name: 'TestSymbol',
          type: 'function',
          filePath: '/test.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'Test symbol',
          tests: [],
          designDecisions: [],
        },
        0
      );

      const symbol = db.getSymbol('test-001');
      if (!symbol) {
        throw new Error('Symbol insertion failed');
      }
    } finally {
      db.close();
      if (fs.existsSync(tempDb)) fs.unlinkSync(tempDb);
    }
  })();

  // ========================================
  // 5. Type Safety Tests
  // ========================================
  console.log('\n5️⃣  Type Safety Tests');
  console.log('-'.repeat(40));

  await testSuccess('Handle missing optional fields', () => {
    const tempDb = path.join(__dirname, 'temp-optional-test.db');
    const db = new DatabaseManager(tempDb, './temp-jsonl');
    try {
      // Symbol with minimal required fields
      db.insertSymbol(
        {
          id: 'minimal-001',
          name: 'MinimalSymbol',
          type: 'function',
          filePath: '/test.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        0
      );

      const symbol = db.getSymbol('minimal-001');
      if (!symbol) {
        throw new Error('Should handle symbols with minimal fields');
      }
    } finally {
      db.close();
      if (fs.existsSync(tempDb)) fs.unlinkSync(tempDb);
    }
  })();

  // ========================================
  // 6. Edge Cases & Type Safety
  // ========================================
  console.log('\n6️⃣  Edge Cases & Type Safety Tests');
  console.log('-'.repeat(40));

  await testSuccess('Handle undefined/null values gracefully', () => {
    const parser = new CoverageParser();
    const summary = {
      totalFiles: 0,
      statements: 0,
      functions: 0,
      branches: 0,
      lines: 0,
      files: new Map(),
    };

    const result = parser.findFile(summary, '/test.ts');
    if (result !== null) {
      throw new Error('Should return null for non-existent file');
    }
  })();

  await testSuccess('Handle empty inputs', () => {
    const parser = new CoverageParser();
    const result = parser.parseData({});
    if (result.totalFiles !== 0) {
      throw new Error('Should handle empty coverage data');
    }
  })();

  // ========================================
  // Print Results
  // ========================================
  console.log(`\n${'='.repeat(60)}`);
  console.log('\n📊 Test Results Summary\n');

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);

    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`);
    }

    if (result.passed && result.expectedError) {
      console.log(`   Caught: ${result.expectedError}`);
    }

    if (result.passed) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 All error handling tests passed!');
    console.log('✨ Production readiness: EXCELLENT\n');
  } else {
    console.log('⚠️  Some tests failed - review error handling\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
