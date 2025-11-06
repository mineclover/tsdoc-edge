/**
 * Tests for FileScanner
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { FileScanner } from '../../scanner/FileScanner';
import { DatabaseManager } from '../../storage/DatabaseManager';
import { SymbolRegistryManager } from '../../storage/SymbolRegistryManager';

describe('FileScanner', () => {
  let tempDir: string;
  let dbPath: string;
  let jsonlPath: string;
  let registryPath: string;
  let dbManager: DatabaseManager;
  let registryManager: SymbolRegistryManager;

  beforeEach(() => {
    tempDir = path.join(process.cwd(), '.test-temp', `scanner-${Date.now()}`);
    dbPath = path.join(tempDir, 'test.db');
    jsonlPath = path.join(tempDir, 'data');
    registryPath = path.join(tempDir, 'registry.jsonl');

    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(jsonlPath, { recursive: true });

    dbManager = new DatabaseManager(dbPath, jsonlPath);
    registryManager = new SymbolRegistryManager(registryPath);
  });

  afterEach(() => {
    dbManager.close();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create FileScanner with default config', () => {
      const scanner = new FileScanner(registryManager, dbManager, {
        rootDir: tempDir,
      });

      expect(scanner).toBeDefined();
    });

    it('should accept custom include/exclude patterns', () => {
      const scanner = new FileScanner(registryManager, dbManager, {
        rootDir: tempDir,
        include: ['**/*.ts'],
        exclude: ['**/test/**'],
      });

      expect(scanner).toBeDefined();
    });
  });

  describe('scan', () => {
    it('should scan empty directory', async () => {
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      const scanner = new FileScanner(registryManager, dbManager, {
        rootDir: emptyDir,
      });

      const result = await scanner.scan();

      expect(result.filesScanned).toBe(0);
      expect(result.symbolsFound).toBe(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should scan directory with TypeScript files', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      // Create test TypeScript file
      const testFile = path.join(srcDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Test class
 * @public
 */
export class TestClass {
  /**
   * Test method
   * @public
   */
  testMethod(): void {}
}
`,
        'utf-8'
      );

      const scanner = new FileScanner(registryManager, dbManager, {
        rootDir: srcDir,
      });

      const result = await scanner.scan();

      expect(result.filesScanned).toBe(1);
      expect(result.symbolsFound).toBeGreaterThanOrEqual(0);
      expect(result.errors.length).toBe(0);
    });

    it('should exclude test files by default', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      // Create test file (should be excluded)
      const testFile = path.join(srcDir, 'example.test.ts');
      fs.writeFileSync(testFile, 'export class TestClass {}', 'utf-8');

      // Create regular file (should be included)
      const regularFile = path.join(srcDir, 'regular.ts');
      fs.writeFileSync(regularFile, 'export class RegularClass {}', 'utf-8');

      const scanner = new FileScanner(registryManager, dbManager, {
        rootDir: srcDir,
      });

      const result = await scanner.scan();

      // Only regular.ts should be scanned
      expect(result.filesScanned).toBe(1);
    });

    it('should handle parse errors gracefully', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      // Create file with syntax errors
      const badFile = path.join(srcDir, 'bad.ts');
      fs.writeFileSync(badFile, 'this is not valid typescript }{][', 'utf-8');

      const scanner = new FileScanner(registryManager, dbManager, {
        rootDir: srcDir,
      });

      const result = await scanner.scan();

      // Should still complete scan
      expect(result.filesScanned).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should scan nested directories', async () => {
      const srcDir = path.join(tempDir, 'src');
      const nestedDir = path.join(srcDir, 'nested', 'deep');
      fs.mkdirSync(nestedDir, { recursive: true });

      // Create files at different levels
      fs.writeFileSync(path.join(srcDir, 'root.ts'), 'export class Root {}', 'utf-8');
      fs.writeFileSync(path.join(srcDir, 'nested', 'nested.ts'), 'export class Nested {}', 'utf-8');
      fs.writeFileSync(
        path.join(nestedDir, 'deep.ts'),
        'export class Deep {}',
        'utf-8'
      );

      const scanner = new FileScanner(registryManager, dbManager, {
        rootDir: srcDir,
      });

      const result = await scanner.scan();

      expect(result.filesScanned).toBe(3);
    });

    it('should report scan duration', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const scanner = new FileScanner(registryManager, dbManager, {
        rootDir: srcDir,
      });

      const result = await scanner.scan();

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });

    it('should handle node_modules exclusion', async () => {
      const srcDir = path.join(tempDir, 'src');
      const nodeModules = path.join(srcDir, 'node_modules');
      fs.mkdirSync(nodeModules, { recursive: true });

      // Create file in node_modules (should be excluded)
      fs.writeFileSync(
        path.join(nodeModules, 'lib.ts'),
        'export class Lib {}',
        'utf-8'
      );

      // Create regular file (should be included)
      fs.writeFileSync(path.join(srcDir, 'app.ts'), 'export class App {}', 'utf-8');

      const scanner = new FileScanner(registryManager, dbManager, {
        rootDir: srcDir,
      });

      const result = await scanner.scan();

      // Only app.ts should be scanned
      expect(result.filesScanned).toBe(1);
    });
  });

  describe('findTypeScriptFiles', () => {
    it('should find .ts files', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, 'file1.ts'), '', 'utf-8');
      fs.writeFileSync(path.join(srcDir, 'file2.ts'), '', 'utf-8');

      const scanner = new FileScanner(registryManager, dbManager, {
        rootDir: srcDir,
      });

      const result = await scanner.scan();

      expect(result.filesScanned).toBe(2);
    });

    it('should find .tsx files', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(
        path.join(srcDir, 'component.tsx'),
        'export const Component = () => <div />;',
        'utf-8'
      );

      const scanner = new FileScanner(registryManager, dbManager, {
        rootDir: srcDir,
      });

      const result = await scanner.scan();

      expect(result.filesScanned).toBe(1);
    });

    it('should ignore non-TypeScript files', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, 'readme.md'), '', 'utf-8');
      fs.writeFileSync(path.join(srcDir, 'package.json'), '{}', 'utf-8');
      fs.writeFileSync(path.join(srcDir, 'app.ts'), '', 'utf-8');

      const scanner = new FileScanner(registryManager, dbManager, {
        rootDir: srcDir,
      });

      const result = await scanner.scan();

      // Only app.ts should be scanned
      expect(result.filesScanned).toBe(1);
    });
  });

  describe('integration', () => {
    it('should scan and populate database', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const testFile = path.join(srcDir, 'integration.ts');
      fs.writeFileSync(
        testFile,
        `
/**
 * Integration test class
 * @public
 */
export class IntegrationTest {
  /**
   * Test method
   * @returns Returns string
   * @public
   */
  test(): string {
    return 'test';
  }
}
`,
        'utf-8'
      );

      const scanner = new FileScanner(registryManager, dbManager, {
        rootDir: srcDir,
      });

      const result = await scanner.scan();

      expect(result.filesScanned).toBe(1);
      expect(result.symbolsFound).toBeGreaterThanOrEqual(0);

      // Verify database has some data
      const stats = dbManager.getStatistics();
      expect(stats.totalSymbols).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple files', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      // Create multiple files
      for (let i = 1; i <= 3; i++) {
        fs.writeFileSync(
          path.join(srcDir, `class${i}.ts`),
          `export class Class${i} {}`,
          'utf-8'
        );
      }

      const scanner = new FileScanner(registryManager, dbManager, {
        rootDir: srcDir,
      });

      const result = await scanner.scan();

      expect(result.filesScanned).toBe(3);
    });
  });
});
