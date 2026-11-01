/**
 * Tests for RelationshipClustersCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RelationshipClustersCommand } from '../../commands/RelationshipClustersCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('RelationshipClustersCommand', () => {
  let command: RelationshipClustersCommand;
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relationship-clusters-'));
    process.chdir(tempDir);
    command = new RelationshipClustersCommand();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-clusters');
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

    it('closes database connection on early exit when no clusters found', async () => {
      const dbPath = path.join(tempDir, '.tsdoc.db');
      const db = new DatabaseManager(dbPath);
      db.close();

      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(DatabaseManager.prototype, 'getAllUnifiedRelationships').mockReturnValue([]);
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['--min-size', '10']);

      expect(result.exitCode).toBe(0);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('ensures database connection is closed even when community detection throws', async () => {
      const dbPath = path.join(tempDir, '.tsdoc.db');
      const db = new DatabaseManager(dbPath);
      db.close();

      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(DatabaseManager.prototype, 'getAllUnifiedRelationships').mockImplementation(() => {
        throw new Error('Simulated cluster analysis error');
      });

      const result = await command.execute([]);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });
  });
});

describe('RelationshipClustersCommand fail-closed flags', () => {
  it('rejects unknown options', async () => {
    const result = await new RelationshipClustersCommand().execute(['--unknown-flag']);
    expect(result.exitCode).toBe(1);
  });
});
