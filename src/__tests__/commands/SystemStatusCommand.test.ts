/**
 * Tests for SystemStatusCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SystemStatusCommand } from '../../commands/SystemStatusCommand';
import { ConfigManager } from '../../config/ConfigManager';
import {
  type CanonicalGraphEdge,
  type CanonicalGraphNode,
  type CanonicalProjectGraph,
  canonicalProjectGraphFingerprint,
} from '../../indexer';
import { DatabaseManager } from '../../storage/DatabaseManager';
import { GraphRepository } from '../../storage/GraphRepository';

describe('SystemStatusCommand', () => {
  let command: SystemStatusCommand;
  let tempDir: string;
  const originalCwd = process.cwd();
  const originalCanonicalEnv = process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'system-status-'));
    process.chdir(tempDir);
    ConfigManager.reset();
    delete process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;
    command = new SystemStatusCommand();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalCanonicalEnv === undefined) {
      delete process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;
    } else {
      process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB = originalCanonicalEnv;
    }
    process.chdir(originalCwd);
    ConfigManager.reset();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('system-status');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('status');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('rejects unknown flags fail-closed', async () => {
      const result = await command.execute(['--bogus-flag']);
      expect(result.exitCode).toBe(1);
    });

    it('reports 3-layer SSOT planes in --json and --compact modes', async () => {
      fs.writeFileSync(path.join(tempDir, '.tsdoc.config.json'), '{}', 'utf-8');
      fs.mkdirSync(path.join(tempDir, 'managed'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'managed', 'feature.md'), '# [[FeatureA]]\n\nSummary.\n');

      const db = new DatabaseManager(
        path.join(tempDir, '.tsdoc.db'),
        path.join(tempDir, '.tsdoc', 'jsonl')
      );
      db.insertSymbol(
        {
          id: 'sym-a',
          name: 'ServiceA',
          type: 'class',
          filePath: 'src/a.ts',
          line: 1,
          column: 1,
          isExported: true,
          isPublic: true,
          summary: 'Documented service A',
          tests: [],
          designDecisions: [],
          metadata: {},
        },
        1
      );
      db.close();

      const canonicalPath = path.join(tempDir, '.tsdoc', 'canonical-graph.db');
      const repo = new GraphRepository(canonicalPath);
      const nodes: CanonicalGraphNode[] = [
        {
          id: '/bundled:/libs/lib.es5.d.ts#Array:interface',
          sourceId: '/bundled:/libs/lib.es5.d.ts#Array:interface',
          kind: 'interface',
          name: 'Array',
          qualifiedName: 'Array',
          file: '/bundled:/libs/lib.es5.d.ts',
          external: true,
        },
        {
          id: 'src/a.ts#ServiceA:class',
          sourceId: 'src/a.ts#ServiceA:class',
          kind: 'class',
          name: 'ServiceA',
          qualifiedName: 'ServiceA',
          file: 'src/a.ts',
          exported: true,
        },
        {
          id: 'src/b.ts#RepoB:class',
          sourceId: 'src/b.ts#RepoB:class',
          kind: 'class',
          name: 'RepoB',
          qualifiedName: 'RepoB',
          file: 'src/b.ts',
          exported: true,
        },
      ];
      const edges: CanonicalGraphEdge[] = [
        {
          kind: 'calls',
          from: 'src/a.ts#ServiceA:class',
          to: 'src/b.ts#RepoB:class',
        },
        {
          kind: 'instantiates',
          from: 'src/a.ts#ServiceA:class',
          to: 'src/b.ts#RepoB:class',
        },
        {
          kind: 'type_ref',
          from: 'src/a.ts#ServiceA:class',
          to: '/bundled:/libs/lib.es5.d.ts#Array:interface',
        },
      ];
      const graph: CanonicalProjectGraph = {
        contractVersion: '1.0',
        rootDir: tempDir,
        tsconfigPath: path.join(tempDir, 'tsconfig.json'),
        nodes,
        edges,
        provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
        fingerprint: canonicalProjectGraphFingerprint(nodes, edges),
      };
      repo.replaceActiveRevision(graph);
      repo.close();

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const jsonRes = await command.execute(['--json']);
      expect(jsonRes.exitCode).toBe(0);
      const parsed = JSON.parse(logSpy.mock.calls.flat().join('\n')) as {
        canonicalGraph: {
          available: boolean;
          internalNodes: number;
          internalEdges: number;
          totalNodes: number;
          totalEdges: number;
        };
        health: { grade: string; score: number };
      };
      expect(parsed.canonicalGraph.available).toBe(true);
      expect(parsed.canonicalGraph.internalNodes).toBe(2);
      expect(parsed.canonicalGraph.internalEdges).toBe(2);
      expect(parsed.canonicalGraph.totalNodes).toBe(3);
      expect(parsed.canonicalGraph.totalEdges).toBe(3);
      expect(parsed.health.grade).toBe('A');
      expect(parsed.health.score).toBeGreaterThanOrEqual(90);

      logSpy.mockClear();
      const compactRes = await command.execute(['--compact']);
      expect(compactRes.exitCode).toBe(0);
      expect(logSpy.mock.calls.flat().join('\n')).toContain('Canonical:');
    });
  });
});
