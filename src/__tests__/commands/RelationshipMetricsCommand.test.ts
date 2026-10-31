/**
 * Tests for RelationshipMetricsCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RelationshipMetricsCommand } from '../../commands/RelationshipMetricsCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('RelationshipMetricsCommand', () => {
  let command: RelationshipMetricsCommand;
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relationship-metrics-'));
    process.chdir(tempDir);
    command = new RelationshipMetricsCommand();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-metrics');
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

    it('closes database connection on successful execution', async () => {
      const dbPath = path.join(tempDir, '.tsdoc.db');
      const db = new DatabaseManager(dbPath);
      db.close();

      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(DatabaseManager.prototype, 'getRelationshipEdges').mockReturnValue([]);
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['--metric', 'degree']);

      expect(result.exitCode).toBe(0);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('ensures database connection is closed even when calculation throws an exception', async () => {
      const dbPath = path.join(tempDir, '.tsdoc.db');
      const db = new DatabaseManager(dbPath);
      db.close();

      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(DatabaseManager.prototype, 'getRelationshipEdges').mockImplementation(() => {
        throw new Error('Simulated database corruption during metrics');
      });

      const result = await command.execute(['--metric', 'degree']);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });
  });
});
