/**
 * IncrementalBuilder Tests
 *
 * @packageDocumentation
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { IncrementalBuilder } from '../../lsp/incremental-builder';

describe('IncrementalBuilder', () => {
  let tempDir: string;
  let mockDb: any;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'incremental-builder-test-'));

    // Create mock database
    mockDb = {
      prepare: jest.fn().mockReturnValue({
        run: jest.fn().mockReturnValue({ changes: 0 }),
        all: jest.fn().mockReturnValue([]),
      }),
      transaction: jest.fn((fn) => fn),
    };
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('extractFile', () => {
    it('should extract symbols from a TypeScript file', () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `
        export class TestClass {
          public testMethod(): void {}
        }

        export function testFunction(): string {
          return 'test';
        }

        export interface TestInterface {
          value: number;
        }
      `
      );

      const builder = new IncrementalBuilder(tempDir, mockDb);
      const result = builder.extractFile(testFile);

      expect(result.errors).toHaveLength(0);
      expect(result.symbols.length).toBeGreaterThan(0);
      expect(result.filePath).toBe(testFile);

      const symbolNames = result.symbols.map((s) => s.name);
      expect(symbolNames).toContain('TestClass');
      expect(symbolNames).toContain('testFunction');
      expect(symbolNames).toContain('TestInterface');
    });

    it('should handle file not found', () => {
      const builder = new IncrementalBuilder(tempDir, mockDb);
      const result = builder.extractFile('/nonexistent/file.ts');

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.symbols).toHaveLength(0);
    });

    it('should extract exported functions correctly', () => {
      const testFile = path.join(tempDir, 'exports.ts');
      fs.writeFileSync(
        testFile,
        `
        export function exportedFunc() {}
        function privateFunc() {}

        export class ExportedClass {}
        class PrivateClass {}
      `
      );

      const builder = new IncrementalBuilder(tempDir, mockDb);
      const result = builder.extractFile(testFile);

      const exportedSymbols = result.symbols.filter((s) => s.isExported);
      const exportedNames = exportedSymbols.map((s) => s.name);

      expect(exportedNames).toContain('exportedFunc');
      expect(exportedNames).toContain('ExportedClass');
    });

    it('should extract symbol types correctly', () => {
      const testFile = path.join(tempDir, 'types.ts');
      fs.writeFileSync(
        testFile,
        `
        export class MyClass {}
        export interface MyInterface {}
        export type MyType = string;
        export function myFunction() {}
      `
      );

      const builder = new IncrementalBuilder(tempDir, mockDb);
      const result = builder.extractFile(testFile);

      const typeMap = new Map(result.symbols.map((s) => [s.name, s.type]));

      expect(typeMap.get('MyClass')).toBe('class');
      expect(typeMap.get('MyInterface')).toBe('interface');
      expect(typeMap.get('MyType')).toBe('type');
      expect(typeMap.get('myFunction')).toBe('function');
    });
  });

  describe('processContent', () => {
    it('should extract symbols from content string', () => {
      const content = `
        export class ContentClass {
          getValue(): number { return 42; }
        }
      `;

      const builder = new IncrementalBuilder(tempDir, mockDb);
      const result = builder.processContent('/virtual/file.ts', content);

      expect(result.errors).toHaveLength(0);
      const symbolNames = result.symbols.map((s) => s.name);
      expect(symbolNames).toContain('ContentClass');
    });

    it('should handle syntax errors gracefully', () => {
      const invalidContent = `
        export class { // missing class name
          broken syntax here
      `;

      const builder = new IncrementalBuilder(tempDir, mockDb);
      const result = builder.processContent('/virtual/file.ts', invalidContent);

      // Should not throw, may have errors or empty symbols
      expect(result.filePath).toBe('/virtual/file.ts');
    });
  });

  describe('setEventCallback', () => {
    it('should call callback on updateDatabase', () => {
      const testFile = path.join(tempDir, 'callback.ts');
      fs.writeFileSync(testFile, 'export const x = 1;');

      const callback = jest.fn();
      const builder = new IncrementalBuilder(tempDir, mockDb);
      builder.setEventCallback(callback);

      const extractResult = builder.extractFile(testFile);
      builder.updateDatabase(extractResult);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'update',
          filePath: testFile,
        })
      );
    });

    it('should call callback on removeFile', () => {
      const callback = jest.fn();
      const builder = new IncrementalBuilder(tempDir, mockDb);
      builder.setEventCallback(callback);

      builder.removeFile('/some/file.ts');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'delete',
          filePath: '/some/file.ts',
        })
      );
    });
  });

  describe('updateDatabase', () => {
    it('should delete and insert symbols in transaction', () => {
      const testFile = path.join(tempDir, 'db.ts');
      fs.writeFileSync(testFile, 'export const value = 1;');

      const builder = new IncrementalBuilder(tempDir, mockDb);
      const result = builder.extractFile(testFile);
      const dbResult = builder.updateDatabase(result);

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(dbResult).toHaveProperty('inserted');
      expect(dbResult).toHaveProperty('deleted');
    });

    it('should return zero counts when db is null', () => {
      const builder = new IncrementalBuilder(tempDir, null);
      const result: any = {
        filePath: '/test.ts',
        symbols: [],
        relationships: [],
        errors: [],
        timestamp: Date.now(),
      };

      const dbResult = builder.updateDatabase(result);

      expect(dbResult).toEqual({ inserted: 0, deleted: 0 });
    });
  });

  describe('removeFile', () => {
    it('should delete symbols for file', () => {
      const builder = new IncrementalBuilder(tempDir, mockDb);
      const result = builder.removeFile('/some/file.ts');

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(typeof result).toBe('number');
    });

    it('should return 0 when db is null', () => {
      const builder = new IncrementalBuilder(tempDir, null);
      const result = builder.removeFile('/some/file.ts');

      expect(result).toBe(0);
    });
  });

  describe('processFileChange', () => {
    it('should extract and update database', () => {
      const testFile = path.join(tempDir, 'change.ts');
      fs.writeFileSync(testFile, 'export const changed = true;');

      const builder = new IncrementalBuilder(tempDir, mockDb);
      const result = builder.processFileChange(testFile);

      expect(result.symbols.length).toBeGreaterThan(0);
      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });
});
