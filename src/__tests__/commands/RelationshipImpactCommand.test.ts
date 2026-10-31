/**
 * Tests for RelationshipImpactCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RelationshipImpactCommand } from '../../commands/RelationshipImpactCommand';
import { GraphAnalysisService } from '../../graph-analysis';
import { CanonicalAliasContext } from '../../indexer';
import type { CanonicalProjectGraph } from '../../indexer/contracts';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('RelationshipImpactCommand', () => {
  let command: RelationshipImpactCommand;
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relationship-impact-'));
    process.chdir(tempDir);
    command = new RelationshipImpactCommand();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-impact');
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

    it('accepts a canonical id and applies direction and category filters', async () => {
      const db = new DatabaseManager(path.join(tempDir, '.tsdoc.db'), path.join(tempDir, '.tsdoc'));
      db.close();

      const graph: CanonicalProjectGraph = {
        contractVersion: '1.0',
        rootDir: tempDir,
        tsconfigPath: path.join(tempDir, 'tsconfig.ttsc.json'),
        nodes: [
          { id: 'src/a.ts#A:class', sourceId: 'src/a.ts#A:class', kind: 'class', name: 'A' },
          { id: 'src/b.ts#B:class', sourceId: 'src/b.ts#B:class', kind: 'class', name: 'B' },
          { id: 'src/c.ts#C:class', sourceId: 'src/c.ts#C:class', kind: 'class', name: 'C' },
        ],
        edges: [
          { kind: 'calls', from: 'src/b.ts#B:class', to: 'src/a.ts#A:class' },
          { kind: 'type_ref', from: 'src/a.ts#A:class', to: 'src/c.ts#C:class' },
        ],
        provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
        fingerprint: 'fixture',
      };
      const analysis = new GraphAnalysisService(graph);
      const close = jest.fn();
      const canonicalContext = {
        graph,
        analysis,
        revisionId: 'revision-1',
        resolveCanonicalId: (query: string) =>
          analysis.resolveSymbol(query).status === 'found' ? query : null,
        close,
      } as unknown as CanonicalAliasContext;
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue(canonicalContext);
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const result = await command.execute([
        'src/a.ts#A:class',
        '--direction',
        'upstream',
        '--category',
        'type-system',
      ]);
      const output = log.mock.calls.flat().join('\n');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('src/c.ts#C:class');
      expect(output).not.toContain('src/b.ts#B:class');
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('supports options placed before symbol ID (e.g. --direction upstream <symbol>)', async () => {
      const db = new DatabaseManager(path.join(tempDir, '.tsdoc.db'), path.join(tempDir, '.tsdoc'));
      db.close();

      const graph: CanonicalProjectGraph = {
        contractVersion: '1.0',
        rootDir: tempDir,
        tsconfigPath: path.join(tempDir, 'tsconfig.ttsc.json'),
        nodes: [
          { id: 'src/a.ts#A:class', sourceId: 'src/a.ts#A:class', kind: 'class', name: 'A' },
          { id: 'src/c.ts#C:class', sourceId: 'src/c.ts#C:class', kind: 'class', name: 'C' },
        ],
        edges: [{ kind: 'type_ref', from: 'src/a.ts#A:class', to: 'src/c.ts#C:class' }],
        provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
        fingerprint: 'fixture',
      };
      const analysis = new GraphAnalysisService(graph);
      const close = jest.fn();
      const canonicalContext = {
        graph,
        analysis,
        revisionId: 'revision-1',
        resolveCanonicalId: (query: string) =>
          analysis.resolveSymbol(query).status === 'found' ? query : null,
        close,
      } as unknown as CanonicalAliasContext;
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue(canonicalContext);
      jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const result = await command.execute(['--direction', 'upstream', 'src/a.ts#A:class']);
      expect(result.exitCode).toBe(0);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('supports --depth=N with equals syntax before symbol ID', async () => {
      const db = new DatabaseManager(path.join(tempDir, '.tsdoc.db'), path.join(tempDir, '.tsdoc'));
      db.close();

      const graph: CanonicalProjectGraph = {
        contractVersion: '1.0',
        rootDir: tempDir,
        tsconfigPath: path.join(tempDir, 'tsconfig.ttsc.json'),
        nodes: [{ id: 'src/a.ts#A:class', sourceId: 'src/a.ts#A:class', kind: 'class', name: 'A' }],
        edges: [],
        provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
        fingerprint: 'fixture',
      };
      const analysis = new GraphAnalysisService(graph);
      const close = jest.fn();
      const canonicalContext = {
        graph,
        analysis,
        revisionId: 'revision-1',
        resolveCanonicalId: (query: string) =>
          analysis.resolveSymbol(query).status === 'found' ? query : null,
        close,
      } as unknown as CanonicalAliasContext;
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue(canonicalContext);
      jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const result = await command.execute(['--depth=2', 'src/a.ts#A:class']);
      expect(result.exitCode).toBe(0);
      expect(close).toHaveBeenCalledTimes(1);
    });

    it('requires symbol ID when flags are passed without symbol', async () => {
      const result = await command.execute(['--depth', '2', '--direction', 'upstream']);
      expect(result.exitCode).toBe(0); // displayHelp exits with 0
    });

    it('ensures dbManager and canonicalContext are closed on early exit (symbol not found)', async () => {
      const db = new DatabaseManager(path.join(tempDir, '.tsdoc.db'), path.join(tempDir, '.tsdoc'));
      db.close();
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      const contextClose = jest.fn();
      const canonicalContext = {
        resolveCanonicalId: () => null,
        close: contextClose,
      } as unknown as CanonicalAliasContext;
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue(canonicalContext);
      jest.spyOn(DatabaseManager.prototype, 'getSymbol').mockReturnValue(null as any);
      jest.spyOn(DatabaseManager.prototype, 'findSymbolsByNamePattern').mockReturnValue([]);

      const result = await command.execute(['unknown-symbol']);

      expect(result.exitCode).toBe(1);
      expect(contextClose).toHaveBeenCalledTimes(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('ensures dbManager and canonicalContext are closed even when analysis throws', async () => {
      const db = new DatabaseManager(path.join(tempDir, '.tsdoc.db'), path.join(tempDir, '.tsdoc'));
      db.close();
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      const contextClose = jest.fn();
      const canonicalContext = {
        resolveCanonicalId: () => 'src/a.ts#A:class',
        analysis: {
          index: { getNode: () => ({ qualifiedName: 'A', kind: 'class' }) },
          dependencies: () => {
            throw new Error('Simulated canonical graph traversal failure');
          },
          dependents: () => [],
        },
        close: contextClose,
      } as unknown as CanonicalAliasContext;
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue(canonicalContext);

      const result = await command.execute(['src/a.ts#A:class']);

      expect(result.exitCode).toBe(1);
      expect(contextClose).toHaveBeenCalledTimes(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('ensures dbManager is closed even if canonicalContext.close() throws', async () => {
      const db = new DatabaseManager(path.join(tempDir, '.tsdoc.db'), path.join(tempDir, '.tsdoc'));
      db.close();
      const dbCloseSpy = jest.spyOn(DatabaseManager.prototype, 'close');
      const canonicalContext = {
        resolveCanonicalId: () => null,
        close: jest.fn().mockImplementation(() => {
          throw new Error('Simulated context close failure');
        }),
      } as unknown as CanonicalAliasContext;
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue(canonicalContext);
      jest.spyOn(DatabaseManager.prototype, 'getSymbol').mockReturnValue(null as any);
      jest.spyOn(DatabaseManager.prototype, 'findSymbolsByNamePattern').mockReturnValue([]);

      const result = await command.execute(['unknown-symbol']);

      expect(result.exitCode).toBe(1);
      expect(dbCloseSpy).toHaveBeenCalledTimes(1);
    });
  });
});
