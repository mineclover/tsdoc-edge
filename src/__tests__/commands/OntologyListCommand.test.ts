/**
 * Tests for OntologyListCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { OntologyListCommand } from '../../commands/OntologyListCommand';
import { ConfigManager } from '../../config/ConfigManager';
import {
  type CanonicalGraphEdge,
  type CanonicalGraphNode,
  type CanonicalProjectGraph,
  canonicalProjectGraphFingerprint,
} from '../../indexer';
import { GraphRepository } from '../../storage/GraphRepository';

describe('OntologyListCommand', () => {
  let command: OntologyListCommand;
  let tempDir: string;
  const originalCwd = process.cwd();
  const originalCanonicalEnv = process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ontology-list-'));
    process.chdir(tempDir);
    ConfigManager.reset();
    delete process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;
    command = new OntologyListCommand();
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
      expect(command.getName()).toBe('ontology-list');
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

    it('rejects unknown flags fail-closed', async () => {
      const result = await command.execute(['--bogus']);
      expect(result.exitCode).toBe(1);
    });

    it('lists canonical @ttsc/graph nodes and edges without requiring .tsdoc.db', async () => {
      const repo = new GraphRepository(path.join(tempDir, '.tsdoc', 'canonical-graph.db'));
      const nodes: CanonicalGraphNode[] = [
        {
          id: 'src/a.ts#Alpha:class',
          sourceId: 'src/a.ts#Alpha:class',
          kind: 'class',
          name: 'Alpha',
          qualifiedName: 'Alpha',
          file: 'src/a.ts',
          exported: true,
        },
        {
          id: 'src/b.ts#Beta:class',
          sourceId: 'src/b.ts#Beta:class',
          kind: 'class',
          name: 'Beta',
          qualifiedName: 'Beta',
          file: 'src/b.ts',
          exported: true,
        },
      ];
      const edges: CanonicalGraphEdge[] = [
        {
          kind: 'calls',
          from: 'src/a.ts#Alpha:class',
          to: 'src/b.ts#Beta:class',
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
      const nodeRes = await command.execute(['--nodes', 'class', '--json']);
      expect(nodeRes.exitCode).toBe(0);
      const nodePayload = JSON.parse(logSpy.mock.calls.flat().join('\n')) as {
        source: string;
        total: number;
      };
      expect(nodePayload.source).toBe('canonical-graph');
      expect(nodePayload.total).toBe(2);

      logSpy.mockClear();
      const relRes = await command.execute(['--rels', 'calls', '--json']);
      expect(relRes.exitCode).toBe(0);
      const relPayload = JSON.parse(logSpy.mock.calls.flat().join('\n')) as {
        total: number;
        relationships: Array<{ type: string; category: string }>;
      };
      expect(relPayload.total).toBe(1);
      expect(relPayload.relationships[0].type).toBe('calls');
      expect(relPayload.relationships[0].category).toBe('behavioral');
    });
  });
});
