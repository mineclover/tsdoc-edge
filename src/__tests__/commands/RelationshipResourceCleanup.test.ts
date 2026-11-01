/**
 * Tests for database handle cleanup across relationship and visualization commands
 *
 * @testScenario Ensure DatabaseManager handle is always closed on exceptions or early exits
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RelationshipExportCommand } from '../../commands/RelationshipExportCommand';
import { RelationshipStatsCommand } from '../../commands/RelationshipStatsCommand';
import { RelationshipValidateCommand } from '../../commands/RelationshipValidateCommand';
import { RelationshipVisualizeCommand } from '../../commands/RelationshipVisualizeCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('Relationship Resource Cleanup', () => {
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rel-cleanup-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('RelationshipExportCommand', () => {
    it('ensures dbManager is closed when export file writing throws an exception', async () => {
      const dbPath = path.join(tempDir, '.tsdoc.db');
      const db = new DatabaseManager(dbPath);
      db.close();

      const command = new RelationshipExportCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const closeSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(command as any, 'exportJSON').mockImplementation(() => {
        throw new Error('Simulated export format error');
      });
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['--format', 'json', '--output', '/invalid/path.json']);

      expect(result.exitCode).toBe(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('RelationshipVisualizeCommand', () => {
    it('ensures dbManager is closed when symbol is not found', async () => {
      const dbPath = path.join(tempDir, '.tsdoc.db');
      const db = new DatabaseManager(dbPath);
      db.close();

      const command = new RelationshipVisualizeCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const closeSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(command as any, 'resolveSymbol').mockReturnValue(null);
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['missing-symbol']);

      expect(result.exitCode).toBe(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('ensures dbManager is closed when diagram file write throws', async () => {
      const dbPath = path.join(tempDir, '.tsdoc.db');
      const db = new DatabaseManager(dbPath);
      db.close();

      const command = new RelationshipVisualizeCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const closeSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(command as any, 'resolveSymbol').mockReturnValue({
        id: 'sym-1',
        symbol: { name: 'sym-1', type: 'class' },
      });
      jest.spyOn(command as any, 'collectRelationships').mockImplementation();
      jest.spyOn(command as any, 'generateMermaidDiagram').mockImplementation(() => {
        throw new Error('Diagram generation failed');
      });
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['sym-1', '--output', 'diag.mmd']);

      expect(result.exitCode).toBe(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('RelationshipValidateCommand', () => {
    it('ensures dbManager is closed when validation checks throw an exception', async () => {
      const dbPath = path.join(tempDir, '.tsdoc.db');
      const db = new DatabaseManager(dbPath);
      db.close();

      const command = new RelationshipValidateCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const closeSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(command as any, 'checkOrphanedRelationships').mockImplementation(() => {
        throw new Error('Database corrupted');
      });
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute([]);

      expect(result.exitCode).toBe(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('RelationshipStatsCommand', () => {
    it('ensures dbManager is closed when symbol counting throws an exception', async () => {
      const dbPath = path.join(tempDir, '.tsdoc.db');
      const db = new DatabaseManager(dbPath);
      db.close();

      const command = new RelationshipStatsCommand();
      jest.spyOn(command as any, 'checkDatabaseExists').mockReturnValue(null);
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const closeSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(DatabaseManager.prototype, 'countSymbols').mockImplementation(() => {
        throw new Error('Query error');
      });
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute([]);

      expect(result.exitCode).toBe(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
