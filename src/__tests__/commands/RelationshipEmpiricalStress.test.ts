/**
 * Empirical Stress and Adversarial Failure Tests for Relationship Commands
 *
 * @testScenario Validate resource cleanup (.close()) under errors, exceptions,
 * and high-frequency sequential execution without SQLITE_BUSY or handle leaks.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { AnalyzeRelationshipsCommand } from '../../commands/AnalyzeRelationshipsCommand';
import { RelationshipCheckCommand } from '../../commands/RelationshipCheckCommand';
import { RelationshipClustersCommand } from '../../commands/RelationshipClustersCommand';
import { RelationshipExportCommand } from '../../commands/RelationshipExportCommand';
import { RelationshipImpactCommand } from '../../commands/RelationshipImpactCommand';
import { RelationshipMetricsCommand } from '../../commands/RelationshipMetricsCommand';
import { RelationshipPathCommand } from '../../commands/RelationshipPathCommand';
import { RelationshipQueryCommand } from '../../commands/RelationshipQueryCommand';
import { RelationshipStatsCommand } from '../../commands/RelationshipStatsCommand';
import { RelationshipValidateCommand } from '../../commands/RelationshipValidateCommand';
import { RelationshipVisualizeCommand } from '../../commands/RelationshipVisualizeCommand';
import { CanonicalAliasContext } from '../../indexer/CanonicalAliasContext';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('Relationship Empirical Stress & Error-Path Safety', () => {
  let tempDir: string;
  let dbPath: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rel-stress-'));
    dbPath = path.join(tempDir, '.tsdoc.db');
    process.chdir(tempDir);

    // Initialize a valid database with schema and sample symbols
    const db = new DatabaseManager(dbPath, path.join(tempDir, 'jsonl'));
    db.insertSymbol(
      {
        id: 'sym-alpha',
        name: 'AlphaClass',
        type: 'class',
        filePath: 'src/Alpha.ts',
        line: 10,
        column: 1,
        isExported: true,
        isPublic: true,
        summary: 'Alpha symbol summary',
        tests: [],
        designDecisions: [],
        metadata: {},
      },
      1
    );
    db.insertSymbol(
      {
        id: 'sym-beta',
        name: 'BetaClass',
        type: 'class',
        filePath: 'src/Beta.ts',
        line: 20,
        column: 1,
        isExported: true,
        isPublic: true,
        summary: 'Beta symbol summary',
        tests: [],
        designDecisions: [],
        metadata: {},
      },
      2
    );
    db.insertUnifiedRelationship({
      id: 'rel-1',
      type: 'dependsOn',
      category: 'structural',
      fromSymbols: ['sym-alpha'],
      toSymbols: ['sym-beta'],
      direction: 'forward',
      strength: 'strong',
      discoveredBy: 'stress-test',
      confidence: 1.0,
      evidence: [],
    });
    db.close();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Adversarial Error-Path .close() Invariants', () => {
    it('RelationshipImpactCommand: closes DB and Canonical context when symbol is not found', async () => {
      const command = new RelationshipImpactCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      const canonicalCloseSpy = jest.fn();
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue({
        close: canonicalCloseSpy,
        resolveCanonicalId: () => null,
      } as unknown as CanonicalAliasContext);
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['non-existent-symbol']);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
      expect(canonicalCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('RelationshipImpactCommand: closes DB and Canonical context when analyzeImpact throws', async () => {
      const command = new RelationshipImpactCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      const canonicalCloseSpy = jest.fn();
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue({
        close: canonicalCloseSpy,
        resolveCanonicalId: () => 'canonical-alpha',
        analysis: { index: { getNode: () => ({ qualifiedName: 'AlphaClass', kind: 'class' }) } },
      } as unknown as CanonicalAliasContext);
      jest.spyOn(command as any, 'analyzeImpact').mockImplementation(() => {
        throw new Error('Adversarial traversal memory crash');
      });
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['sym-alpha']);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
      expect(canonicalCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('RelationshipQueryCommand: closes DB and Canonical context when database query throws', async () => {
      const command = new RelationshipQueryCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      const canonicalCloseSpy = jest.fn();
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue({
        close: canonicalCloseSpy,
        resolveCanonicalId: () => null,
      } as unknown as CanonicalAliasContext);
      jest
        .spyOn(DatabaseManager.prototype, 'getUnifiedRelationshipsBySymbol')
        .mockImplementation(() => {
          throw new Error('Adversarial SQLite query failure');
        });
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['sym-alpha', '--xml']);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
      expect(canonicalCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('RelationshipQueryCommand: closes DB and Canonical context when output formatting throws', async () => {
      const command = new RelationshipQueryCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      const canonicalCloseSpy = jest.fn();
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue({
        close: canonicalCloseSpy,
        resolveCanonicalId: () => null,
      } as unknown as CanonicalAliasContext);
      jest.spyOn(command as any, 'printOutput').mockImplementation(() => {
        throw new Error('Adversarial XML formatter crash');
      });
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['sym-alpha', '--xml']);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
      expect(canonicalCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('RelationshipMetricsCommand: closes DB when graph construction throws', async () => {
      const command = new RelationshipMetricsCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(command as any, 'buildGraph').mockImplementation(() => {
        throw new Error('Corrupted relationship graph edge');
      });
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute([]);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('RelationshipClustersCommand: closes DB when adjacency building throws', async () => {
      const command = new RelationshipClustersCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(DatabaseManager.prototype, 'getAllUnifiedRelationships').mockImplementation(() => {
        throw new Error('Adversarial SQL read error');
      });
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute([]);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('RelationshipPathCommand: closes DB when target symbol is not found', async () => {
      const command = new RelationshipPathCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['sym-alpha', 'missing-target']);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('RelationshipPathCommand: closes DB when path search algorithm throws', async () => {
      const command = new RelationshipPathCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(command as any, 'findPathsBidirectional').mockImplementation(() => {
        throw new Error('Adversarial graph cycle exhaustion');
      });
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['sym-alpha', 'sym-beta']);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('RelationshipExportCommand: closes DB when export format serialization throws', async () => {
      const command = new RelationshipExportCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(command as any, 'exportJSON').mockImplementation(() => {
        throw new Error('Export JSON serialization failure');
      });
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['--format', 'json']);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('RelationshipVisualizeCommand: closes DB when diagram generation throws', async () => {
      const command = new RelationshipVisualizeCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(command as any, 'generateMermaidDiagram').mockImplementation(() => {
        throw new Error('Mermaid AST generation failure');
      });
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['sym-alpha']);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('RelationshipCheckCommand: closes all underlying database handles during orchestrated run', async () => {
      const command = new RelationshipCheckCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const closeSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['sym-alpha']);

      expect(result.exitCode).toBe(0);
      // RelationshipCheck runs Impact and Query, both cleanly opening and closing DatabaseManager
      expect(closeSpy).toHaveBeenCalled();
      expect(closeSpy.mock.calls.length).toBe(2);
    });

    it('AnalyzeRelationshipsCommand: closes DB handle when loadLegacyGraph throws', async () => {
      const command = new AnalyzeRelationshipsCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(command as any, 'loadLegacyGraph').mockImplementation(() => {
        throw new Error('Graph deserialization fault');
      });
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute(['--type=calls']);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Adversarial Database State & File Descriptors', () => {
    it('handles query failure in RelationshipStatsCommand gracefully and releases file lock', async () => {
      const command = new RelationshipStatsCommand();
      jest.spyOn(command as any, 'checkDatabaseExists').mockReturnValue(null);
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const closeSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(DatabaseManager.prototype, 'countSymbols').mockImplementation(() => {
        throw new Error('SQLITE_CORRUPT: simulated corrupted symbol count');
      });
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute([]);

      expect(result.exitCode).toBe(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);

      // Verify the file can be reopened immediately for write without SQLITE_BUSY
      const recheck = new Database(dbPath);
      expect(() => recheck.exec('VACUUM')).not.toThrow();
      recheck.close();
    });

    it('handles fatal error in RelationshipValidateCommand without leaving open locks', async () => {
      const command = new RelationshipValidateCommand();
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      const closeSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      jest.spyOn(command as any, 'checkOrphanedRelationships').mockImplementation(() => {
        throw new Error('Fatal unhandled database error during validation');
      });
      jest.spyOn(console, 'log').mockImplementation();

      const result = await command.execute([]);

      expect(result.exitCode).toBe(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);

      // Verify the file can be reopened immediately for write without SQLITE_BUSY
      const recheck = new Database(dbPath);
      expect(() => recheck.exec('VACUUM')).not.toThrow();
      recheck.close();
    });
  });

  describe('High-Frequency Sequential Execution Stress (Lock Accumulation & SQLITE_BUSY check)', () => {
    it('executes 60 sequential relationship commands without accumulating locks or SQLITE_BUSY', async () => {
      jest.spyOn(console, 'log').mockImplementation();

      const impactCmd = new RelationshipImpactCommand();
      const queryCmd = new RelationshipQueryCommand();
      const statsCmd = new RelationshipStatsCommand();
      const metricsCmd = new RelationshipMetricsCommand();
      const clustersCmd = new RelationshipClustersCommand();
      const checkCmd = new RelationshipCheckCommand();

      jest.spyOn(impactCmd as any, 'getDatabasePath').mockReturnValue(dbPath);
      jest.spyOn(queryCmd as any, 'getDatabasePath').mockReturnValue(dbPath);
      jest.spyOn(statsCmd as any, 'getDatabasePath').mockReturnValue(dbPath);
      jest.spyOn(metricsCmd as any, 'getDatabasePath').mockReturnValue(dbPath);
      jest.spyOn(clustersCmd as any, 'getDatabasePath').mockReturnValue(dbPath);
      jest.spyOn(checkCmd as any, 'getDatabasePath').mockReturnValue(dbPath);

      // Run 10 iterations of 6 different commands = 60 sequential executions
      for (let i = 0; i < 10; i++) {
        const rStats = await statsCmd.execute([]);
        expect(rStats.exitCode).toBe(0);

        const rMetrics = await metricsCmd.execute(['--top', '5']);
        expect(rMetrics.exitCode).toBe(0);

        const rQuery = await queryCmd.execute(['sym-alpha']);
        expect(rQuery.exitCode).toBe(0);

        const rImpact = await impactCmd.execute(['sym-alpha']);
        expect(rImpact.exitCode).toBe(0);

        const rClusters = await clustersCmd.execute([]);
        expect(rClusters.exitCode).toBe(0);

        const rCheck = await checkCmd.execute(['sym-alpha']);
        expect(rCheck.exitCode).toBe(0);
      }

      // After 60 commands, immediately execute an exclusive write transaction
      // If any handle was leaked or lock accumulated, this will throw SQLITE_BUSY
      const writeVerification = new Database(dbPath);
      expect(() => {
        writeVerification.exec('BEGIN EXCLUSIVE; COMMIT;');
      }).not.toThrow();
      writeVerification.close();

      // Deleting the database must succeed without EPERM / EBUSY
      expect(() => fs.unlinkSync(dbPath)).not.toThrow();
    });
  });
});
