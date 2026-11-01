/**
 * Tests for BlocksCommand and HttpEndpointsCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { BlocksCommand } from '../../commands/BlocksCommand';
import { HttpEndpointsCommand } from '../../commands/HttpEndpointsCommand';
import { ConfigManager } from '../../config/ConfigManager';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('BlocksCommand & HttpEndpointsCommand', () => {
  let tempDir: string;
  let dbPath: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blocks-endpoints-'));
    dbPath = path.join(tempDir, '.tsdoc.db');
    process.chdir(tempDir);
    ConfigManager.reset();

    const dbManager = new DatabaseManager(dbPath, path.join(tempDir, '.tsdoc', 'jsonl'));
    dbManager.insertSymbol(
      {
        id: 'sym-handler',
        name: 'handleUsers',
        type: 'function',
        filePath: 'src/routes/users.ts',
        line: 10,
        column: 1,
        isExported: true,
        isPublic: true,
        summary: 'User route handler',
        tests: [],
        designDecisions: [],
        metadata: {},
      },
      1
    );
    dbManager.close();

    const now = '2026-11-01T00:00:00.000Z';
    const rawDb = new Database(dbPath);
    try {
      rawDb
        .prepare(
          `INSERT INTO code_blocks (id, symbol_id, type, start_line, end_line, purpose, complexity, side_effects, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          'blk-1',
          'sym-handler',
          'conditional',
          12,
          18,
          'Validate user input',
          3,
          '["io"]',
          now,
          now
        );
      rawDb
        .prepare(
          `INSERT INTO endpoints (id, method, path, scope, handler_symbol_id, file_path, line, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          'ep-1',
          'GET',
          '/api/users',
          'public',
          'sym-handler',
          'src/routes/users.ts',
          10,
          now,
          now
        );
    } finally {
      rawDb.close();
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.chdir(originalCwd);
    ConfigManager.reset();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('BlocksCommand', () => {
    it('supports --help, fail-closed flag validation, symbol name lookup, human default, --json, and --xml', async () => {
      const cmd = new BlocksCommand();
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      expect((await cmd.execute(['--help'])).exitCode).toBe(0);
      expect((await cmd.execute(['handleUsers', '--bogus'])).exitCode).toBe(1);

      logSpy.mockClear();
      const humanRes = await cmd.execute(['handleUsers']);
      expect(humanRes.exitCode).toBe(0);
      expect(logSpy.mock.calls.flat().join('\n')).toContain('Validate user input');

      logSpy.mockClear();
      const jsonRes = await cmd.execute(['handleUsers', '--json']);
      expect(jsonRes.exitCode).toBe(0);
      const parsed = JSON.parse(logSpy.mock.calls.flat().join('\n')) as {
        symbol: { id: string; name: string };
        summary: { totalBlocks: number };
      };
      expect(parsed.symbol.id).toBe('sym-handler');
      expect(parsed.summary.totalBlocks).toBe(1);

      logSpy.mockClear();
      const xmlRes = await cmd.execute(['sym-handler', '--xml']);
      expect(xmlRes.exitCode).toBe(0);
      expect(logSpy.mock.calls.flat().join('\n')).toContain('<code-blocks>');
    });
  });

  describe('HttpEndpointsCommand', () => {
    it('supports --help, fail-closed flag validation, human default, --json, and --xml', async () => {
      const cmd = new HttpEndpointsCommand();
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      expect((await cmd.execute(['--help'])).exitCode).toBe(0);
      expect((await cmd.execute(['--bogus'])).exitCode).toBe(1);

      logSpy.mockClear();
      const humanRes = await cmd.execute(['--method', 'get']);
      expect(humanRes.exitCode).toBe(0);
      expect(logSpy.mock.calls.flat().join('\n')).toContain('/api/users');

      logSpy.mockClear();
      const jsonRes = await cmd.execute(['--path', 'users', '--json']);
      expect(jsonRes.exitCode).toBe(0);
      const parsed = JSON.parse(logSpy.mock.calls.flat().join('\n')) as {
        summary: { total: number };
      };
      expect(parsed.summary.total).toBe(1);

      logSpy.mockClear();
      const xmlRes = await cmd.execute(['--xml']);
      expect(xmlRes.exitCode).toBe(0);
      expect(logSpy.mock.calls.flat().join('\n')).toContain('<http-endpoints>');
    });
  });
});
