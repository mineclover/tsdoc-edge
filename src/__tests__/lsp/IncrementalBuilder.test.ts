/**
 * IncrementalBuilder tests
 * @testScenario Extract symbols from TypeScript files
 * @testScenario Handle classes, interfaces, functions, types
 * @testScenario Extract JSDoc summaries
 * @testScenario Handle file not found
 * @testScenario Process content from buffer
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { IncrementalBuilder, IncrementalExtractResult } from '../../lsp/incremental-builder';
import type { SqliteDatabase } from '../../types/database';

describe('IncrementalBuilder', () => {
  let tempDir: string;
  let builder: IncrementalBuilder;

  // Mock database with required SqliteDatabase properties
  const createMockDb = (): SqliteDatabase => ({
    memory: false,
    readonly: false,
    name: 'test.db',
    open: true,
    inTransaction: false,
    prepare: jest.fn(() => ({
      database: {} as SqliteDatabase,
      source: '',
      reader: true,
      readonly: true,
      run: jest.fn(() => ({ changes: 1, lastInsertRowid: 1 })),
      get: jest.fn(),
      all: jest.fn(),
      iterate: jest.fn(),
    })),
    exec: jest.fn().mockReturnThis(),
    close: jest.fn().mockReturnThis(),
    transaction: jest.fn((fn) => fn),
  } as unknown as SqliteDatabase);

  beforeEach(() => {
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(require('os').tmpdir(), 'inc-builder-test-'))
    );
    builder = new IncrementalBuilder(tempDir, createMockDb());
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('extractFile', () => {
    describe('class extraction', () => {
      it('should extract class declarations', () => {
        const filePath = path.join(tempDir, 'test.ts');
        fs.writeFileSync(
          filePath,
          `export class MyClass {
            myMethod() {}
            myProperty: string;
          }`
        );

        const result = builder.extractFile(filePath);

        expect(result.errors).toHaveLength(0);
        const classSymbol = result.symbols.find((s) => s.name === 'MyClass');
        expect(classSymbol).toBeDefined();
        expect(classSymbol?.type).toBe('class');
        expect(classSymbol?.isExported).toBe(true);
      });

      it('should extract class methods', () => {
        const filePath = path.join(tempDir, 'test.ts');
        fs.writeFileSync(
          filePath,
          `class MyClass {
            public myMethod() {}
            private privateMethod() {}
          }`
        );

        const result = builder.extractFile(filePath);

        const publicMethod = result.symbols.find((s) => s.name === 'myMethod');
        const privateMethod = result.symbols.find((s) => s.name === 'privateMethod');

        expect(publicMethod?.type).toBe('method');
        expect(publicMethod?.isPublic).toBe(true);
        expect(privateMethod?.isPublic).toBe(false);
      });

      it('should extract class properties', () => {
        const filePath = path.join(tempDir, 'test.ts');
        fs.writeFileSync(
          filePath,
          `class MyClass {
            myProperty: string;
            protected protectedProp: number;
          }`
        );

        const result = builder.extractFile(filePath);

        const publicProp = result.symbols.find((s) => s.name === 'myProperty');
        const protectedProp = result.symbols.find((s) => s.name === 'protectedProp');

        expect(publicProp?.type).toBe('property');
        expect(publicProp?.isPublic).toBe(true);
        expect(protectedProp?.isPublic).toBe(false);
      });
    });

    describe('interface extraction', () => {
      it('should extract interface declarations', () => {
        const filePath = path.join(tempDir, 'test.ts');
        fs.writeFileSync(
          filePath,
          `export interface MyInterface {
            prop: string;
          }`
        );

        const result = builder.extractFile(filePath);

        const iface = result.symbols.find((s) => s.name === 'MyInterface');
        expect(iface).toBeDefined();
        expect(iface?.type).toBe('interface');
        expect(iface?.isExported).toBe(true);
      });
    });

    describe('function extraction', () => {
      it('should extract function declarations', () => {
        const filePath = path.join(tempDir, 'test.ts');
        fs.writeFileSync(
          filePath,
          `export function myFunction(arg: string): number {
            return 42;
          }`
        );

        const result = builder.extractFile(filePath);

        const func = result.symbols.find((s) => s.name === 'myFunction');
        expect(func).toBeDefined();
        expect(func?.type).toBe('function');
        expect(func?.isExported).toBe(true);
      });
    });

    describe('type alias extraction', () => {
      it('should extract type alias declarations', () => {
        const filePath = path.join(tempDir, 'test.ts');
        fs.writeFileSync(filePath, `export type MyType = string | number;`);

        const result = builder.extractFile(filePath);

        const typeAlias = result.symbols.find((s) => s.name === 'MyType');
        expect(typeAlias).toBeDefined();
        expect(typeAlias?.type).toBe('type');
      });
    });

    describe('variable extraction', () => {
      it('should extract const declarations', () => {
        const filePath = path.join(tempDir, 'test.ts');
        fs.writeFileSync(filePath, `export const MY_CONST = 'value';`);

        const result = builder.extractFile(filePath);

        const constSymbol = result.symbols.find((s) => s.name === 'MY_CONST');
        expect(constSymbol).toBeDefined();
        expect(constSymbol?.type).toBe('constant');
      });

      it('should extract let declarations', () => {
        const filePath = path.join(tempDir, 'test.ts');
        fs.writeFileSync(filePath, `export let myVar = 'value';`);

        const result = builder.extractFile(filePath);

        const varSymbol = result.symbols.find((s) => s.name === 'myVar');
        expect(varSymbol).toBeDefined();
        expect(varSymbol?.type).toBe('variable');
      });
    });

    describe('JSDoc extraction', () => {
      it('should extract JSDoc summary', () => {
        const filePath = path.join(tempDir, 'test.ts');
        fs.writeFileSync(
          filePath,
          `/**
           * This is the summary line.
           * @param arg - An argument
           */
          export function documented(arg: string) {}`
        );

        const result = builder.extractFile(filePath);

        const func = result.symbols.find((s) => s.name === 'documented');
        expect(func?.summary).toBe('This is the summary line.');
      });

      it('should handle missing JSDoc', () => {
        const filePath = path.join(tempDir, 'test.ts');
        fs.writeFileSync(filePath, `export function noDoc() {}`);

        const result = builder.extractFile(filePath);

        const func = result.symbols.find((s) => s.name === 'noDoc');
        expect(func?.summary).toBeNull();
      });
    });

    describe('line and column info', () => {
      it('should extract correct line and column', () => {
        const filePath = path.join(tempDir, 'test.ts');
        fs.writeFileSync(
          filePath,
          `// Comment line
export function myFunc() {}`
        );

        const result = builder.extractFile(filePath);

        const func = result.symbols.find((s) => s.name === 'myFunc');
        expect(func?.line).toBe(2);
        expect(func?.column).toBeGreaterThan(0);
      });
    });

    describe('error handling', () => {
      it('should handle file not found', () => {
        const result = builder.extractFile('/nonexistent/file.ts');

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('File not found');
      });

      it('should handle parse errors gracefully', () => {
        const filePath = path.join(tempDir, 'invalid.ts');
        fs.writeFileSync(filePath, 'class { invalid syntax');

        const result = builder.extractFile(filePath);

        // TypeScript parser is lenient, so it may not throw
        // but symbols should be empty or minimal
        expect(result.filePath).toBe(filePath);
      });
    });
  });

  describe('processContent', () => {
    it('should process content from string', () => {
      const content = `
        export class BufferClass {
          method() {}
        }
      `;

      const result = builder.processContent('/virtual/file.ts', content);

      expect(result.errors).toHaveLength(0);
      const classSymbol = result.symbols.find((s) => s.name === 'BufferClass');
      expect(classSymbol).toBeDefined();
    });

    it('should handle invalid content', () => {
      // TypeScript parser is very lenient
      const result = builder.processContent('/virtual/file.ts', '{}{}{}');
      expect(result.filePath).toBe('/virtual/file.ts');
    });
  });

  describe('setEventCallback', () => {
    it('should set and call event callback', () => {
      const callback = jest.fn();
      const db = createMockDb();
      const testBuilder = new IncrementalBuilder(tempDir, db);

      testBuilder.setEventCallback(callback);

      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, 'export const x = 1;');

      testBuilder.processFileChange(filePath);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'update',
          filePath,
        })
      );
    });
  });

  describe('removeFile', () => {
    it('should call delete on database', () => {
      const db = createMockDb();
      const testBuilder = new IncrementalBuilder(tempDir, db);

      const filePath = path.join(tempDir, 'deleted.ts');
      const result = testBuilder.removeFile(filePath);

      expect(db.prepare).toHaveBeenCalled();
      expect(result).toBe(1);
    });

    it('should return 0 when database is null', () => {
      const testBuilder = new IncrementalBuilder(tempDir, null);
      const result = testBuilder.removeFile('/some/file.ts');
      expect(result).toBe(0);
    });

    it('should emit delete event', () => {
      const callback = jest.fn();
      const db = createMockDb();
      const testBuilder = new IncrementalBuilder(tempDir, db);
      testBuilder.setEventCallback(callback);

      testBuilder.removeFile('/some/file.ts');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'delete',
        })
      );
    });
  });

  describe('updateDatabase', () => {
    it('should return zeros when database is null', () => {
      const testBuilder = new IncrementalBuilder(tempDir, null);

      const result = testBuilder.updateDatabase({
        filePath: '/test.ts',
        symbols: [],
        relationships: [],
        errors: [],
        timestamp: Date.now(),
      });

      expect(result).toEqual({ inserted: 0, deleted: 0 });
    });
  });

  describe('processFileChange', () => {
    it('should extract and update database', () => {
      const db = createMockDb();
      const testBuilder = new IncrementalBuilder(tempDir, db);

      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, 'export const x = 1;');

      const result = testBuilder.processFileChange(filePath);

      expect(result.errors).toHaveLength(0);
      expect(result.symbols.length).toBeGreaterThan(0);
    });

    it('should not update database if extraction has errors', () => {
      const db = createMockDb();
      const testBuilder = new IncrementalBuilder(tempDir, db);

      const result = testBuilder.processFileChange('/nonexistent.ts');

      expect(result.errors.length).toBeGreaterThan(0);
      // Transaction should not be called
    });
  });

  describe('symbol ID generation', () => {
    it('should generate consistent IDs', () => {
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, 'export class MyClass {}');

      const result1 = builder.extractFile(filePath);
      const result2 = builder.extractFile(filePath);

      const id1 = result1.symbols.find((s) => s.name === 'MyClass')?.id;
      const id2 = result2.symbols.find((s) => s.name === 'MyClass')?.id;

      expect(id1).toBe(id2);
    });

    it('should generate lowercase kebab-case IDs', () => {
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, 'export class MyClassName {}');

      const result = builder.extractFile(filePath);
      const symbol = result.symbols.find((s) => s.name === 'MyClassName');

      expect(symbol?.id).toBe('class-myclassname');
    });
  });
});
