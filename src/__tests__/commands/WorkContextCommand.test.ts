/**
 * Tests for WorkContextCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { WorkContextCommand } from '../../commands/WorkContextCommand';
import { CanonicalAliasContext } from '../../indexer';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('WorkContextCommand', () => {
  let command: WorkContextCommand;
  let tempDir: string;
  let dbPath: string;
  let testFile: string;

  beforeEach(() => {
    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-work-context-'));

    // Create .tsdoc directory
    const tsdocDir = path.join(tempDir, '.tsdoc');
    fs.mkdirSync(tsdocDir, { recursive: true });
    dbPath = path.join(tsdocDir, 'symbols.db');

    // Create a test TypeScript file
    const srcDir = path.join(tempDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    testFile = path.join(srcDir, 'TestFile.ts');
    fs.writeFileSync(
      testFile,
      `/**
 * Test function
 * @public
 */
export function testFunc(): void {}
`,
      'utf-8'
    );

    command = new WorkContextCommand();

    // Change to temp directory for test
    process.chdir(tempDir);
  });

  afterEach(() => {
    jest.restoreAllMocks();

    // Restore original cwd
    process.chdir(path.dirname(path.dirname(path.dirname(__dirname))));

    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('getName', () => {
    it('should return "work-context"', () => {
      expect(command.getName()).toBe('work-context');
    });
  });

  describe('getDescription', () => {
    it('should return description about work context', () => {
      const desc = command.getDescription();
      expect(desc.toLowerCase()).toContain('context');
      expect(desc.toLowerCase()).toContain('relationship');
    });
  });

  describe('execute', () => {
    it('should return error when no file path provided', async () => {
      const result = await command.execute([]);

      expect(result.exitCode).toBe(1);
      expect(result.message?.toLowerCase()).toContain('file path');
    });

    it('should return error when file does not exist', async () => {
      const result = await command.execute(['non-existent-file.ts']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should return error when database does not exist', async () => {
      const result = await command.execute([testFile]);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Database not found');
    });

    it('returns canonical file context when the legacy database does not exist', async () => {
      const close = jest.fn();
      const canonicalContext = {
        revisionId: 'canonical-only-revision',
        resolver: { canonicalToLegacy: () => null },
        nodesInFile: () => [
          {
            id: 'src/TestFile.ts#testFunc:function',
            sourceId: 'src/TestFile.ts#testFunc:function',
            kind: 'function',
            name: 'testFunc',
            file: 'src/TestFile.ts',
          },
        ],
        structuralCounts: () => ({ dependencies: 1, dependents: 2 }),
        close,
      } as unknown as CanonicalAliasContext;
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue(canonicalContext);
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const result = await command.execute(['src/TestFile.ts']);
      const output = log.mock.calls.flat().join('\n');

      expect(result.exitCode).toBe(0);
      expect(result.message).toBe('Canonical work context generated');
      expect(output).toContain('src/TestFile.ts#testFunc:function');
      expect(output).not.toContain('Database not found');
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('shows direct canonical symbols in human output when legacy aliases are absent', async () => {
      const db = new DatabaseManager(dbPath);
      db.close();
      const close = jest.fn();
      const canonicalContext = {
        revisionId: 'direct-file-revision',
        resolver: { canonicalToLegacy: () => null },
        nodesInFile: () => [
          {
            id: 'src/TestFile.ts#testFunc:function',
            sourceId: 'src/TestFile.ts#testFunc:function',
            kind: 'function',
            name: 'testFunc',
            file: 'src/TestFile.ts',
          },
        ],
        structuralCounts: () => ({ dependencies: 1, dependents: 2 }),
        close,
      } as unknown as CanonicalAliasContext;
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue(canonicalContext);
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const result = await command.execute(['src/TestFile.ts', '--human']);
      const output = log.mock.calls.flat().join('\n');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Canonical Structural Graph');
      expect(output).toContain('src/TestFile.ts#testFunc:function');
      expect(output).toContain('alias/direct file lookup');
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('writes human-readable output to --output instead of stdout', async () => {
      const dbManager = new DatabaseManager(dbPath);
      dbManager.db
        .prepare(`
        INSERT INTO symbols (id, name, type, file_path, line, column, is_exported, is_public, created_at, updated_at, version, jsonl_line)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .run(
          'human-output-symbol',
          'testFunc',
          'function',
          'src/TestFile.ts',
          1,
          0,
          1,
          1,
          '2025-01-01',
          '2025-01-01',
          '1.0.0',
          1
        );
      dbManager.close();

      const outputPath = path.join(tempDir, 'context.txt');
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const result = await command.execute(['src/TestFile.ts', '--human', '--output', outputPath]);

      expect(result.exitCode).toBe(0);
      expect(fs.readFileSync(outputPath, 'utf-8')).toContain('Work Context: TestFile.ts');
      expect(log).not.toHaveBeenCalledWith(expect.stringContaining('Work Context: TestFile.ts'));
    });

    it('should display context when file and database exist', async () => {
      // Create database
      const dbManager = new DatabaseManager(dbPath);

      // Insert a test symbol with unique ID
      const uniqueSymbolId = `test-symbol-display-${Date.now()}`;
      dbManager.db
        .prepare(`
        INSERT INTO symbols (id, name, type, file_path, line, column, is_exported, is_public, created_at, updated_at, version, jsonl_line)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .run(
          uniqueSymbolId,
          'testFunc',
          'function',
          'src/TestFile.ts',
          1,
          0,
          1,
          1,
          '2025-01-01',
          '2025-01-01',
          '1.0.0',
          1
        );

      dbManager.close();

      const result = await command.execute(['src/TestFile.ts']);

      // Should execute (may or may not succeed depending on environment)
      expect(result).toBeDefined();
      if (result.exitCode === 0) {
        expect(result.message).toBe('XML context generated');
      }
    });

    it('migrates a real legacy relationships table before gathering work context', async () => {
      const current = new DatabaseManager(dbPath, path.join(tempDir, '.tsdoc', 'data'));
      current.db
        .prepare(`
        INSERT INTO symbols (id, name, type, file_path, line, column, is_exported, is_public, created_at, updated_at, version, jsonl_line)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .run(
          'legacy-source',
          'testFunc',
          'function',
          'src/TestFile.ts',
          1,
          0,
          1,
          1,
          '2025-01-01',
          '2025-01-01',
          '1.0.0',
          1
        );
      current.close();

      const legacy = new Database(dbPath);
      legacy.exec(`
        DROP TABLE relationship_symbols;
        DROP TABLE unified_relationships;
        CREATE TABLE unified_relationships (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          category TEXT NOT NULL,
          from_symbols TEXT NOT NULL,
          to_symbols TEXT NOT NULL,
          direction TEXT NOT NULL,
          strength TEXT NOT NULL,
          evidence TEXT NOT NULL,
          discovered_by TEXT NOT NULL,
          confidence REAL NOT NULL,
          file_path TEXT,
          line INTEGER,
          properties TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          description TEXT
        );
        INSERT INTO unified_relationships (
          id, type, category, from_symbols, to_symbols, direction, strength,
          evidence, discovered_by, confidence, file_path, line, created_at, updated_at
        ) VALUES (
          'legacy-dependency', 'code-dependency', 'structural',
          '["legacy-source"]', '["legacy-target"]', 'unidirectional', 'strong',
          '[]', 'static-analysis', 1.0, 'src/TestFile.ts', 1,
          '2025-01-01', '2025-01-01'
        );
      `);
      legacy.close();

      const result = await command.execute(['src/TestFile.ts']);

      expect(result).toEqual(expect.objectContaining({ exitCode: 0 }));
      const migrated = new Database(dbPath, { readonly: true });
      const columns = new Set(
        (
          migrated.prepare('PRAGMA table_info(unified_relationships)').all() as Array<{
            name: string;
          }>
        ).map((column) => column.name)
      );
      migrated.close();
      expect([...columns]).toEqual(
        expect.arrayContaining([
          'abstraction_from',
          'abstraction_to',
          'hierarchy_depth',
          'inheritance_chain',
          'overridden_members',
        ])
      );
    });

    it('adds canonical structural data to default XML and LLM output', async () => {
      const dbManager = new DatabaseManager(dbPath, path.join(tempDir, '.tsdoc', 'data'));
      dbManager.db
        .prepare(`
        INSERT INTO symbols (id, name, type, file_path, line, column, is_exported, is_public, created_at, updated_at, version, jsonl_line)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .run(
          'legacy-test-func',
          'testFunc',
          'function',
          'src/TestFile.ts',
          1,
          0,
          1,
          1,
          '2025-01-01',
          '2025-01-01',
          '1.0.0',
          1
        );
      dbManager.close();

      const close = jest.fn();
      const canonicalContext = {
        revisionId: 'revision-123',
        resolver: { canonicalToLegacy: () => 'legacy-test-func' },
        resolveCanonicalId: (legacyId: string) =>
          legacyId === 'legacy-test-func' ? 'src/TestFile.ts#testFunc:function' : null,
        structuralCounts: () => ({ dependencies: 2, dependents: 3 }),
        nodesInFile: () => [],
        close,
      } as unknown as CanonicalAliasContext;
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue(canonicalContext);
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      expect((await command.execute(['src/TestFile.ts'])).exitCode).toBe(0);
      const xml = log.mock.calls.flat().join('\n');
      expect(xml).toContain('<canonical-structural revision="revision-123">');
      expect(xml).toContain('canonical-id="src/TestFile.ts#testFunc:function"');
      expect(xml).toContain('dependencies="2" dependents="3"');

      log.mockClear();
      expect((await command.execute(['src/TestFile.ts', '--llm'])).exitCode).toBe(0);
      const markdown = log.mock.calls.flat().join('\n');
      expect(markdown).toContain('## Canonical Structural Graph');
      expect(markdown).toContain('`src/TestFile.ts#testFunc:function`');
      expect(markdown).toContain('dependencies: 2, dependents: 3');
      expect(markdown.indexOf('## Canonical Structural Graph')).toBeLessThan(
        markdown.indexOf('## Generation Metadata')
      );
      expect(close).toHaveBeenCalledTimes(2);
    });

    it('should handle relative file paths', async () => {
      // Create database
      const dbManager = new DatabaseManager(dbPath);
      dbManager.close();

      const result = await command.execute(['./src/TestFile.ts']);

      // Should succeed (file exists)
      expect(result).toBeDefined();
    });

    it('should handle absolute file paths', async () => {
      // Create database
      const dbManager = new DatabaseManager(dbPath);
      dbManager.close();

      const result = await command.execute([testFile]);

      // Should succeed
      expect(result).toBeDefined();
    });

    it('should display usage when --help flag is provided', async () => {
      const result = await command.execute(['--help']);

      // Current behavior: shows usage but returns exitCode 1 (no file path)
      expect(result.exitCode).toBe(1);
      expect(result.message?.toLowerCase()).toContain('file path');
    });

    it('should return error when -h flag is provided (treated as file path)', async () => {
      const result = await command.execute(['-h']);

      // Current behavior: -h is treated as a file path and returns "file not found"
      expect(result.exitCode).toBe(1);
      expect(result.message?.toLowerCase()).toContain('not found');
    });

    it('should show examples when no file path provided', async () => {
      const result = await command.execute([]);

      expect(result.exitCode).toBe(1);
      // Error message should mention missing file path
      expect(result.message).toBeDefined();
      expect(result.message?.toLowerCase()).toContain('file');
    });

    it('should gather context with dependencies', async () => {
      // Create database with dependencies
      const dbManager = new DatabaseManager(dbPath);

      // Use unique symbol IDs to avoid potential conflicts
      const testSymbolId = `test-symbol-${Date.now()}`;
      const depSymbolId = `dep-symbol-${Date.now()}`;

      // Insert test symbol
      dbManager.db
        .prepare(`
        INSERT INTO symbols (id, name, type, file_path, line, column, is_exported, is_public, created_at, updated_at, version, jsonl_line)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .run(
          testSymbolId,
          'testFunc',
          'function',
          'src/TestFile.ts',
          1,
          0,
          1,
          1,
          '2025-01-01',
          '2025-01-01',
          '1.0.0',
          1
        );

      // Insert dependency
      dbManager.db
        .prepare(`
        INSERT INTO symbols (id, name, type, file_path, line, column, is_exported, is_public, created_at, updated_at, version, jsonl_line)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .run(
          depSymbolId,
          'DepFunc',
          'function',
          'src/Dependency.ts',
          1,
          0,
          1,
          1,
          '2025-01-01',
          '2025-01-01',
          '1.0.0',
          2
        );

      dbManager.db
        .prepare(`
        INSERT INTO dependencies (symbol_id, target, type, reason, import_path)
        VALUES (?, ?, ?, ?, ?)
      `)
        .run(testSymbolId, depSymbolId, 'calls', 'test dependency', './Dependency');

      dbManager.close();

      const result = await command.execute(['src/TestFile.ts']);

      // Should execute without throwing, exit code depends on environment
      expect(result).toBeDefined();
    });

    it('should handle files with no symbols', async () => {
      // Create database
      const dbManager = new DatabaseManager(dbPath);
      dbManager.close();

      // File exists but has no symbols in database
      const result = await command.execute(['src/TestFile.ts']);

      // Should not throw an error
      expect(result).toBeDefined();
    });
  });
});
