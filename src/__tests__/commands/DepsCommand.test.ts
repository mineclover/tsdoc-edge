/**
 * Tests for DepsCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DepsCommand } from '../../commands/DepsCommand';
import {
  type CanonicalGraphEdge,
  type CanonicalGraphNode,
  type CanonicalProjectGraph,
  canonicalProjectGraphFingerprint,
} from '../../indexer';
import { GraphRepository } from '../../storage/GraphRepository';

describe('DepsCommand', () => {
  let command: DepsCommand;
  let tempDir: string;
  const originalCwd = process.cwd();
  const originalCanonicalEnv = process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deps-command-'));
    process.chdir(tempDir);
    delete process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;
    command = new DepsCommand();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalCanonicalEnv === undefined) {
      delete process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;
    } else {
      process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB = originalCanonicalEnv;
    }
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('deps');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('depends on');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('should fail without symbol ID', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
    });

    it('rejects unknown options fail-closed', async () => {
      const result = await command.execute(['--unknown-flag']);
      expect(result.exitCode).toBe(1);
    });

    it('queries canonical @ttsc/graph for symbol & file paths, filters external stdlib by default, and supports Human/--json/--xml', async () => {
      const canonicalDbPath = path.join(tempDir, '.tsdoc', 'canonical-graph.db');
      fs.mkdirSync(path.dirname(canonicalDbPath), { recursive: true });
      const repo = new GraphRepository(canonicalDbPath);
      const nodes: CanonicalGraphNode[] = [
        {
          id: '/bundled:/libs/lib.es5.d.ts#Array:interface',
          sourceId: '/bundled:/libs/lib.es5.d.ts#Array:interface',
          kind: 'interface',
          name: 'Array',
          file: '/bundled:/libs/lib.es5.d.ts',
          external: true,
        },
        {
          id: 'src/repo.ts#UserRepo:class',
          sourceId: 'src/repo.ts#UserRepo:class',
          kind: 'class',
          name: 'UserRepo',
          file: 'src/repo.ts',
          evidence: { startLine: 5 },
          exported: true,
        },
        {
          id: 'src/service.ts#UserService:class',
          sourceId: 'src/service.ts#UserService:class',
          kind: 'class',
          name: 'UserService',
          file: 'src/service.ts',
          evidence: { startLine: 10 },
          exported: true,
        },
        {
          id: 'src/types.ts#UserRecord:interface',
          sourceId: 'src/types.ts#UserRecord:interface',
          kind: 'interface',
          name: 'UserRecord',
          file: 'src/types.ts',
          evidence: { startLine: 1 },
          exported: true,
        },
      ];
      const edges: CanonicalGraphEdge[] = [
        {
          kind: 'calls',
          from: 'src/service.ts#UserService:class',
          to: 'src/repo.ts#UserRepo:class',
        },
        {
          kind: 'type_ref',
          from: 'src/service.ts#UserService:class',
          to: '/bundled:/libs/lib.es5.d.ts#Array:interface',
        },
        {
          kind: 'type_ref',
          from: 'src/service.ts#UserService:class',
          to: 'src/types.ts#UserRecord:interface',
        },
      ];
      const graph: CanonicalProjectGraph = {
        contractVersion: '1.0',
        rootDir: tempDir,
        tsconfigPath: path.join(tempDir, 'tsconfig.ttsc.json'),
        nodes,
        edges,
        provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
        fingerprint: canonicalProjectGraphFingerprint(nodes, edges),
      };
      repo.replaceActiveRevision(graph);
      repo.close();

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      // 1. Default Human output excludes external Array
      const humanRes = await command.execute(['UserService']);
      expect(humanRes.exitCode).toBe(0);
      const humanOut = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(humanOut).toContain('Dependencies of UserService');
      expect(humanOut).toContain('UserRepo');
      expect(humanOut).toContain('UserRecord');
      expect(humanOut).not.toContain('Array');

      // 2. --include-external + --json includes external Array
      logSpy.mockClear();
      const jsonRes = await command.execute(['UserService', '--include-external', '--json']);
      expect(jsonRes.exitCode).toBe(0);
      const jsonPayload = JSON.parse(logSpy.mock.calls.map((c) => c.join(' ')).join('\n')) as {
        targets: Array<{ name: string }>;
      };
      expect(jsonPayload.targets.map((t) => t.name)).toEqual(
        expect.arrayContaining(['UserRepo', 'UserRecord', 'Array'])
      );

      // 3. --type flag before positional query + file-path query + --xml
      logSpy.mockClear();
      const typeRes = await command.execute(['--type', 'calls', 'src/service.ts', '--xml']);
      expect(typeRes.exitCode).toBe(0);
      const xmlOut = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(xmlOut).toContain('<dependencies>');
      expect(xmlOut).toContain('UserRepo');
      expect(xmlOut).not.toContain('UserRecord');
    });
  });
});
