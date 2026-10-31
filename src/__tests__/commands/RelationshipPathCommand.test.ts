/**
 * Tests for RelationshipPathCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RelationshipPathCommand } from '../../commands/RelationshipPathCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('RelationshipPathCommand', () => {
  let command: RelationshipPathCommand;
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relationship-path-'));
    process.chdir(tempDir);
    command = new RelationshipPathCommand();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-path');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('supports boolean flags placed before symbol IDs (e.g. --shortest-only <sym1> <sym2>)', async () => {
      const dbPath = path.join(tempDir, '.tsdoc.db');
      const dbManager = new DatabaseManager(dbPath);
      dbManager.close();

      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      jest.spyOn(command as any, 'resolveSymbol').mockImplementation((_: any, sym: any) => ({
        id: sym,
        symbol: { name: sym, type: 'class' },
      }));
      jest.spyOn(command as any, 'findPathsBidirectional').mockReturnValue([]);
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['--shortest-only', 'symA', 'symB']);
      expect(result.exitCode).toBe(0);
    });

    it('supports valued options placed before symbol IDs (e.g. --max-length 3 <sym1> <sym2>)', async () => {
      const dbPath = path.join(tempDir, '.tsdoc.db');
      const dbManager = new DatabaseManager(dbPath);
      dbManager.close();

      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      jest.spyOn(command as any, 'resolveSymbol').mockImplementation((_: any, sym: any) => ({
        id: sym,
        symbol: { name: sym, type: 'class' },
      }));
      jest.spyOn(command as any, 'findPathsBidirectional').mockReturnValue([]);
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['--max-length', '3', 'symA', 'symB']);
      expect(result.exitCode).toBe(0);
    });

    it('requires two symbol IDs when only one symbol is passed with options', async () => {
      const result = await command.execute(['--shortest-only', 'symA']);
      expect(result.exitCode).toBe(0); // displayHelp exits with 0
    });

    it('closes database connection on early exit when source symbol is not found', async () => {
      const dbPath = path.join(tempDir, '.tsdoc.db');
      const dbManager = new DatabaseManager(dbPath);
      dbManager.close();
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');

      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      jest.spyOn(DatabaseManager.prototype, 'getSymbol').mockReturnValue(null as any);
      jest.spyOn(DatabaseManager.prototype, 'findSymbolsByNamePattern').mockReturnValue([]);

      const result = await command.execute(['source-sym', 'target-sym']);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('closes database connection on early exit when target symbol is not found', async () => {
      const dbPath = path.join(tempDir, '.tsdoc.db');
      const dbManager = new DatabaseManager(dbPath);
      dbManager.close();
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');

      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      jest
        .spyOn(command as any, 'resolveSymbol')
        .mockImplementation((_: any, id: any) =>
          id === 'source-sym' ? { id, symbol: { name: id, type: 'class' } } : null
        );

      const result = await command.execute(['source-sym', 'target-sym']);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('ensures database connection is closed even when path traversal throws', async () => {
      const dbPath = path.join(tempDir, '.tsdoc.db');
      const dbManager = new DatabaseManager(dbPath);
      dbManager.close();
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');

      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      jest.spyOn(command as any, 'resolveSymbol').mockImplementation((_: any, id: any) => ({
        id,
        symbol: { name: id, type: 'class' },
      }));
      jest.spyOn(command as any, 'buildAdjacencyList').mockImplementation(() => {
        throw new Error('Simulated graph traversal error');
      });

      const result = await command.execute(['source-sym', 'target-sym']);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });
  });
});
