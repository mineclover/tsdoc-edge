/**
 * FileScanner tests
 * @testScenario Scan single file
 * @testScenario Scan directory with multiple files
 * @testScenario Handle parse errors
 * @testScenario Match symbols with registry
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FileScanner } from '../scanner/FileScanner';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';

describe('FileScanner', () => {
  let tempDir: string;
  let registryPath: string;
  let dbPath: string;
  let jsonlPath: string;
  let registry: SymbolRegistryManager;
  let dbManager: DatabaseManager;
  let scanner: FileScanner;

  beforeEach(() => {
    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-scanner-test-'));
    registryPath = path.join(tempDir, 'registry.jsonl');
    dbPath = path.join(tempDir, 'test.db');
    jsonlPath = path.join(tempDir, 'data');

    // Initialize managers
    registry = new SymbolRegistryManager(registryPath);
    dbManager = new DatabaseManager(dbPath, jsonlPath);

    // Create test source directory
    const sourceDir = path.join(tempDir, 'src');
    fs.mkdirSync(sourceDir, { recursive: true });

    // Initialize scanner
    scanner = new FileScanner(registry, dbManager, {
      rootDir: sourceDir,
    });
  });

  afterEach(() => {
    dbManager.close();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Scan Operations', () => {
    test('should scan single file with valid TSDoc', async () => {
      const sourceDir = path.join(tempDir, 'src');

      // Register symbol
      const id = registry.register({
        filePath: path.join(sourceDir, 'sample.ts'),
        symbolName: 'TestClass',
        type: 'class',
      });
      registry.save();

      // Create test file
      const testFile = path.join(sourceDir, 'sample.ts');
      const content = `/**
 * Test class
 * @id ${id}
 * @public
 */
export class TestClass {
  test() {}
}`;
      fs.writeFileSync(testFile, content, 'utf-8');

      // Verify file exists
      expect(fs.existsSync(testFile)).toBe(true);

      // Scan
      const result = await scanner.scan();

      expect(result.filesScanned).toBe(1);
      expect(result.symbolsFound).toBe(1);
      expect(result.symbolsMatched).toBe(1);
      expect(result.symbolsInserted).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle multiple files', async () => {
      const sourceDir = path.join(tempDir, 'src');

      // Register symbols
      const id1 = registry.register({
        filePath: path.join(sourceDir, 'file1.ts'),
        symbolName: 'Class1',
        type: 'class',
      });

      const id2 = registry.register({
        filePath: path.join(sourceDir, 'file2.ts'),
        symbolName: 'Class2',
        type: 'class',
      });
      registry.save();

      // Create test files
      fs.writeFileSync(
        path.join(sourceDir, 'file1.ts'),
        `/**
 * Class 1
 * @id ${id1}
 * @public
 */
export class Class1 {}`,
        'utf-8'
      );

      fs.writeFileSync(
        path.join(sourceDir, 'file2.ts'),
        `/**
 * Class 2
 * @id ${id2}
 * @public
 */
export class Class2 {}`,
        'utf-8'
      );

      // Scan
      const result = await scanner.scan();

      expect(result.filesScanned).toBe(2);
      expect(result.symbolsFound).toBe(2);
      expect(result.symbolsMatched).toBe(2);
      expect(result.symbolsInserted).toBe(2);
    });

    test('should skip symbols without @id tag', async () => {
      const sourceDir = path.join(tempDir, 'src');

      // Create test file without @id
      const testFile = path.join(sourceDir, 'sample.ts');
      const content = `/**
 * Test class without ID
 * @public
 */
export class TestClass {
  test() {}
}`;
      fs.writeFileSync(testFile, content, 'utf-8');

      // Scan
      const result = await scanner.scan();

      expect(result.filesScanned).toBe(1);
      expect(result.symbolsFound).toBe(1);
      expect(result.symbolsMatched).toBe(0);
      expect(result.symbolsInserted).toBe(0);
    });

    test('should handle unmatched registry IDs', async () => {
      const sourceDir = path.join(tempDir, 'src');

      // Create test file with non-existent ID
      const testFile = path.join(sourceDir, 'sample.ts');
      const content = `/**
 * Test class
 * @id non-existent-id
 * @public
 */
export class TestClass {
  test() {}
}`;
      fs.writeFileSync(testFile, content, 'utf-8');

      // Scan
      const result = await scanner.scan();

      expect(result.filesScanned).toBe(1);
      expect(result.symbolsFound).toBe(1);
      expect(result.symbolsMatched).toBe(0);
      expect(result.symbolsInserted).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should exclude test files', async () => {
      const sourceDir = path.join(tempDir, 'src');

      // Create test file (should be excluded)
      const testFile = path.join(sourceDir, 'test.test.ts');
      const content = `/**
 * Test class
 * @public
 */
export class TestClass {}`;
      fs.writeFileSync(testFile, content, 'utf-8');

      // Scan
      const result = await scanner.scan();

      expect(result.filesScanned).toBe(0);
    });

    test('should handle nested directories', async () => {
      const sourceDir = path.join(tempDir, 'src');
      const nestedDir = path.join(sourceDir, 'nested', 'deep');
      fs.mkdirSync(nestedDir, { recursive: true });

      // Register symbol
      const id = registry.register({
        filePath: path.join(nestedDir, 'nested.ts'),
        symbolName: 'NestedClass',
        type: 'class',
      });
      registry.save();

      // Create nested file
      fs.writeFileSync(
        path.join(nestedDir, 'nested.ts'),
        `/**
 * Nested class
 * @id ${id}
 * @public
 */
export class NestedClass {}`,
        'utf-8'
      );

      // Scan
      const result = await scanner.scan();

      expect(result.filesScanned).toBe(1);
      expect(result.symbolsInserted).toBe(1);
    });
  });

  describe('Scan and Verify', () => {
    test('should scan and verify successfully', async () => {
      const sourceDir = path.join(tempDir, 'src');

      // Register symbol
      const id = registry.register({
        filePath: path.join(sourceDir, 'sample.ts'),
        symbolName: 'TestClass',
        type: 'class',
      });
      registry.save();

      // Create test file
      fs.writeFileSync(
        path.join(sourceDir, 'sample.ts'),
        `/**
 * Test class
 * @id ${id}
 * @public
 */
export class TestClass {}`,
        'utf-8'
      );

      // Scan and verify
      const result = await scanner.scanAndVerify();

      expect(result.scanResult.symbolsInserted).toBe(1);
      expect(result.verifyResult.success).toBe(true);
      expect(result.verifyResult.mismatches).toHaveLength(0);
    });
  });

  describe('Statistics', () => {
    test('should track duration', async () => {
      const sourceDir = path.join(tempDir, 'src');

      // Create empty scan
      const result = await scanner.scan();

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should track errors', async () => {
      const sourceDir = path.join(tempDir, 'src');

      // Create file with invalid ID
      fs.writeFileSync(
        path.join(sourceDir, 'sample.ts'),
        `/**
 * Test
 * @id invalid-id
 */
export class Test {}`,
        'utf-8'
      );

      const result = await scanner.scan();

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
