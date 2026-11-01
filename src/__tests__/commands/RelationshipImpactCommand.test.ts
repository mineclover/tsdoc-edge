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

    it('traverses legacy DB downstream (callers where to=target) and upstream (dependencies where from=target)', async () => {
      const db = new DatabaseManager(path.join(tempDir, '.tsdoc.db'), path.join(tempDir, '.tsdoc'));
      db.close();
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue(null);

      type DbSymbol = ReturnType<DatabaseManager['getSymbol']>;
      type DbRels = ReturnType<DatabaseManager['getUnifiedRelationshipsBySymbol']>;

      jest.spyOn(DatabaseManager.prototype, 'getSymbol').mockImplementation((id: string) => {
        if (id === 'sym-target') {
          return {
            id: 'sym-target',
            name: 'TargetService',
            type: 'class',
            filePath: 'src/TargetService.ts',
            line: 1,
          } as unknown as DbSymbol;
        }
        return undefined as unknown as DbSymbol;
      });

      jest
        .spyOn(DatabaseManager.prototype, 'getUnifiedRelationshipsBySymbol')
        .mockImplementation((id: string) => {
          if (id === 'sym-target') {
            return [
              {
                id: 'rel-incoming',
                from: 'sym-caller',
                to: 'sym-target',
                type: 'calls',
                category: 'behavioral',
                confidence: 0.9,
              },
              {
                id: 'rel-outgoing',
                from: 'sym-target',
                to: 'sym-dependency',
                type: 'uses',
                category: 'structural',
                confidence: 0.9,
              },
            ] as unknown as DbRels;
          }
          return [] as unknown as DbRels;
        });

      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      // Default direction: downstream -> who depends on sym-target (sym-caller)
      const downstreamResult = await command.execute(['sym-target', '--json']);
      expect(downstreamResult.exitCode).toBe(0);
      const downstreamJson = JSON.parse(log.mock.calls.flat().join('\n')) as unknown as {
        direction: string;
        impactedSymbols: Array<{ symbolId: string }>;
      };
      expect(downstreamJson.direction).toBe('downstream');
      expect(downstreamJson.impactedSymbols.map((n) => n.symbolId)).toEqual(['sym-caller']);

      log.mockClear();

      // Upstream -> what sym-target depends on (sym-dependency)
      const upstreamResult = await command.execute([
        'sym-target',
        '--direction',
        'upstream',
        '--json',
      ]);
      expect(upstreamResult.exitCode).toBe(0);
      const upstreamJson = JSON.parse(log.mock.calls.flat().join('\n')) as unknown as {
        direction: string;
        impactedSymbols: Array<{ symbolId: string }>;
      };
      expect(upstreamJson.direction).toBe('upstream');
      expect(upstreamJson.impactedSymbols.map((n) => n.symbolId)).toEqual(['sym-dependency']);

      log.mockClear();

      // Both -> both sym-caller and sym-dependency
      const bothResult = await command.execute(['sym-target', '--direction', 'both', '--json']);
      expect(bothResult.exitCode).toBe(0);
      const bothJson = JSON.parse(log.mock.calls.flat().join('\n')) as unknown as {
        direction: string;
        impactedSymbols: Array<{ symbolId: string }>;
      };
      expect(bothJson.direction).toBe('both');
      expect(bothJson.impactedSymbols.map((n) => n.symbolId).sort()).toEqual([
        'sym-caller',
        'sym-dependency',
      ]);
    });

    it('excludes external, /bundled:/libs/, and /node_modules/ canonical nodes by default and includes them with --include-external', async () => {
      const db = new DatabaseManager(path.join(tempDir, '.tsdoc.db'), path.join(tempDir, '.tsdoc'));
      db.close();

      const stdlibMapId = '/bundled:/libs/lib.es2015.collection.d.ts#Map:interface';
      const externalPkgId = 'pkg/types.d.ts#ExternalWidget:interface';
      const nodeModulesId = '/repo/node_modules/chalk/index.d.ts#Chalk:interface';
      const projectDepId = 'src/dep.ts#ProjectDep:class';

      const graph: CanonicalProjectGraph = {
        contractVersion: '1.0',
        rootDir: tempDir,
        tsconfigPath: path.join(tempDir, 'tsconfig.ttsc.json'),
        nodes: [
          { id: 'src/a.ts#A:class', sourceId: 'src/a.ts#A:class', kind: 'class', name: 'A' },
          { id: projectDepId, sourceId: projectDepId, kind: 'class', name: 'ProjectDep' },
          { id: stdlibMapId, sourceId: stdlibMapId, kind: 'interface', name: 'Map' },
          {
            id: externalPkgId,
            sourceId: externalPkgId,
            kind: 'interface',
            name: 'ExternalWidget',
            external: true,
          },
          { id: nodeModulesId, sourceId: nodeModulesId, kind: 'interface', name: 'Chalk' },
        ],
        edges: [
          { kind: 'type_ref', from: 'src/a.ts#A:class', to: projectDepId },
          { kind: 'type_ref', from: 'src/a.ts#A:class', to: stdlibMapId },
          { kind: 'type_ref', from: 'src/a.ts#A:class', to: externalPkgId },
          { kind: 'type_ref', from: 'src/a.ts#A:class', to: nodeModulesId },
        ],
        provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
        fingerprint: 'fixture',
      };
      const analysis = new GraphAnalysisService(graph);
      const canonicalContext = {
        graph,
        analysis,
        revisionId: 'revision-1',
        resolveCanonicalId: (query: string) =>
          analysis.resolveSymbol(query).status === 'found' ? query : null,
        close: jest.fn(),
      } as unknown as CanonicalAliasContext;
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue(canonicalContext);
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      // Default: excludes external, stdlib, and node_modules
      const defaultRes = await command.execute([
        'src/a.ts#A:class',
        '--direction',
        'upstream',
        '--json',
      ]);
      expect(defaultRes.exitCode).toBe(0);
      const defaultJson = JSON.parse(log.mock.calls.flat().join('\n')) as unknown as {
        canonicalImpact: Array<{ symbolId: string }>;
      };
      expect(defaultJson.canonicalImpact.map((n) => n.symbolId)).toEqual([projectDepId]);

      log.mockClear();

      // With --include-external: includes all 4 nodes
      const includeExtRes = await command.execute([
        'src/a.ts#A:class',
        '--direction',
        'upstream',
        '--include-external',
        '--json',
      ]);
      expect(includeExtRes.exitCode).toBe(0);
      const includeExtJson = JSON.parse(log.mock.calls.flat().join('\n')) as unknown as {
        canonicalImpact: Array<{ symbolId: string }>;
      };
      expect(includeExtJson.canonicalImpact.map((n) => n.symbolId)).toEqual(
        [projectDepId, stdlibMapId, externalPkgId, nodeModulesId].sort()
      );
    });

    it('rejects unknown flags and invalid --direction values fail-closed with exitCode 1', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);

      const unknownFlagResult = await command.execute(['src/a.ts#A:class', '--bogus']);
      expect(unknownFlagResult.exitCode).toBe(1);

      const badDirectionResult = await command.execute([
        'src/a.ts#A:class',
        '--direction',
        'diagonal',
      ]);
      expect(badDirectionResult.exitCode).toBe(1);
    });

    it('outputs structured --json and computes unified riskLevel across legacy and canonical impact', async () => {
      const db = new DatabaseManager(path.join(tempDir, '.tsdoc.db'), path.join(tempDir, '.tsdoc'));
      db.close();

      type DbSymbol = ReturnType<DatabaseManager['getSymbol']>;
      type DbRels = ReturnType<DatabaseManager['getUnifiedRelationshipsBySymbol']>;

      jest.spyOn(DatabaseManager.prototype, 'getSymbol').mockImplementation((id: string) => {
        if (id === 'sym-a') {
          return {
            id: 'sym-a',
            name: 'A',
            type: 'class',
            filePath: 'src/a.ts',
            line: 1,
          } as unknown as DbSymbol;
        }
        return undefined as unknown as DbSymbol;
      });
      jest.spyOn(DatabaseManager.prototype, 'getUnifiedRelationshipsBySymbol').mockReturnValue([
        {
          id: 'rel-1',
          from: 'sym-b',
          to: 'sym-a',
          type: 'calls',
          category: 'behavioral',
          confidence: 0.9,
        },
      ] as unknown as DbRels);

      // Canonical graph has 5 downstream callers -> elevates risk to Medium (whereas legacy alone has 1 -> Low)
      const graph: CanonicalProjectGraph = {
        contractVersion: '1.0',
        rootDir: tempDir,
        tsconfigPath: path.join(tempDir, 'tsconfig.ttsc.json'),
        nodes: [
          { id: 'src/a.ts#A:class', sourceId: 'src/a.ts#A:class', kind: 'class', name: 'A' },
          { id: 'src/c1.ts#C1:class', sourceId: 'src/c1.ts#C1:class', kind: 'class', name: 'C1' },
          { id: 'src/c2.ts#C2:class', sourceId: 'src/c2.ts#C2:class', kind: 'class', name: 'C2' },
          { id: 'src/c3.ts#C3:class', sourceId: 'src/c3.ts#C3:class', kind: 'class', name: 'C3' },
          { id: 'src/c4.ts#C4:class', sourceId: 'src/c4.ts#C4:class', kind: 'class', name: 'C4' },
          { id: 'src/c5.ts#C5:class', sourceId: 'src/c5.ts#C5:class', kind: 'class', name: 'C5' },
        ],
        edges: [
          { kind: 'calls', from: 'src/c1.ts#C1:class', to: 'src/a.ts#A:class' },
          { kind: 'calls', from: 'src/c2.ts#C2:class', to: 'src/a.ts#A:class' },
          { kind: 'calls', from: 'src/c3.ts#C3:class', to: 'src/a.ts#A:class' },
          { kind: 'calls', from: 'src/c4.ts#C4:class', to: 'src/a.ts#A:class' },
          { kind: 'calls', from: 'src/c5.ts#C5:class', to: 'src/a.ts#A:class' },
        ],
        provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
        fingerprint: 'fixture',
      };
      const analysis = new GraphAnalysisService(graph);
      const canonicalContext = {
        graph,
        analysis,
        revisionId: 'revision-1',
        resolveCanonicalId: (query: string) =>
          query === 'sym-a' || query === 'src/a.ts#A:class' ? 'src/a.ts#A:class' : null,
        close: jest.fn(),
      } as unknown as CanonicalAliasContext;
      jest.spyOn(CanonicalAliasContext, 'tryOpen').mockReturnValue(canonicalContext);
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const result = await command.execute(['sym-a', '--depth', '3', '--json']);
      expect(result.exitCode).toBe(0);

      const parsed = JSON.parse(log.mock.calls.flat().join('\n')) as unknown as {
        symbolId: string;
        symbolName: string;
        symbolType: string;
        direction: string;
        maxDepth: number;
        riskLevel: string;
        impactedSymbols: Array<{ symbolId: string }>;
        canonicalImpact: Array<{ symbolId: string }>;
      };

      expect(parsed).toMatchObject({
        symbolId: 'sym-a',
        symbolName: 'A',
        symbolType: 'class',
        direction: 'downstream',
        maxDepth: 3,
        riskLevel: 'Medium',
      });
      expect(parsed.impactedSymbols).toHaveLength(1);
      expect(parsed.canonicalImpact).toHaveLength(5);
    });
  });
});
