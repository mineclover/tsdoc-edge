/**
 * Tests for LSP IncrementalBuilder
 */

import { IncrementalBuilder } from '../../lsp/incremental-builder';
import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('IncrementalBuilder', () => {
  let builder: IncrementalBuilder;
  let db: Database.Database;
  let tempDir: string;
  let tempDbPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'incremental-test-'));
    tempDbPath = path.join(tempDir, 'test.db');
    db = new Database(tempDbPath);
    builder = new IncrementalBuilder(tempDir, db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('extractFile', () => {
    it('should extract symbols from a TypeScript file', () => {
      const filePath = path.join(tempDir, 'test.ts');
      fs.writeFileSync(filePath, `
        /**
         * Test function
         * @public
         */
        export function hello(): string {
          return 'hello';
        }
      `);

      const result = builder.extractFile(filePath);

      expect(result.filePath).toBe(filePath);
      expect(result.symbols.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle non-existent files gracefully', () => {
      const result = builder.extractFile('/nonexistent/file.ts');

      expect(result.symbols).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should extract class symbols', () => {
      const filePath = path.join(tempDir, 'class.ts');
      fs.writeFileSync(filePath, `
        /**
         * Test class
         * @public
         */
        export class MyClass {
          public getValue(): number {
            return 42;
          }
        }
      `);

      const result = builder.extractFile(filePath);

      const classSymbol = result.symbols.find(s => s.name === 'MyClass');
      expect(classSymbol).toBeDefined();
      expect(classSymbol?.type).toBe('class');
    });
  });
});
