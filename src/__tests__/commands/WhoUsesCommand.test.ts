/**
 * Tests for WhoUsesCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { WhoUsesCommand } from '../../commands/WhoUsesCommand';
import {
  type CanonicalGraphEdge,
  type CanonicalGraphNode,
  type CanonicalProjectGraph,
  canonicalProjectGraphFingerprint,
} from '../../indexer';
import { GraphRepository } from '../../storage/GraphRepository';

describe('WhoUsesCommand', () => {
  let command: WhoUsesCommand;
  let tempDir: string;
  const originalCwd = process.cwd();
  const originalCanonicalEnv = process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'who-uses-command-'));
    process.chdir(tempDir);
    delete process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;
    command = new WhoUsesCommand();
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
      expect(command.getName()).toBe('who-uses');
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

    it('should fail without symbol name', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
    });

    it('rejects unknown options fail-closed', async () => {
      const result = await command.execute(['--unknown-flag']);
      expect(result.exitCode).toBe(1);
    });

    it('queries canonical @ttsc/graph incoming dependents for symbol & file paths with external filtering and Human/--json/--xml', async () => {
      const canonicalDbPath = path.join(tempDir, '.tsdoc', 'canonical-graph.db');
      fs.mkdirSync(path.dirname(canonicalDbPath), { recursive: true });
      const repo = new GraphRepository(canonicalDbPath);
      const nodes: CanonicalGraphNode[] = [
        {
          id: 'node_modules/ext/index.d.ts#extUser:function',
          sourceId: 'node_modules/ext/index.d.ts#extUser:function',
          kind: 'function',
          name: 'extUser',
          file: 'node_modules/ext/index.d.ts',
          external: true,
        },
        {
          id: 'src/caller.ts#runCaller:function',
          sourceId: 'src/caller.ts#runCaller:function',
          kind: 'function',
          name: 'runCaller',
          file: 'src/caller.ts',
          evidence: { startLine: 8 },
          exported: true,
        },
        {
          id: 'src/core.ts#readCore:function',
          sourceId: 'src/core.ts#readCore:function',
          kind: 'function',
          name: 'readCore',
          file: 'src/core.ts',
          evidence: { startLine: 12 },
          exported: true,
        },
      ];
      const edges: CanonicalGraphEdge[] = [
        {
          kind: 'calls',
          from: 'node_modules/ext/index.d.ts#extUser:function',
          to: 'src/core.ts#readCore:function',
        },
        {
          kind: 'calls',
          from: 'src/caller.ts#runCaller:function',
          to: 'src/core.ts#readCore:function',
        },
        {
          kind: 'type_ref',
          from: 'src/caller.ts#runCaller:function',
          to: 'src/core.ts#readCore:function',
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

      // 1. Default Human output excludes external caller and deduplicates multi-edge callers with relation badges
      const humanRes = await command.execute(['readCore']);
      expect(humanRes.exitCode).toBe(0);
      const humanOut = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(humanOut).toContain('Who Uses: readCore');
      expect(humanOut).toContain('Referenced by 1 symbol(s) (2 edges):');
      expect(humanOut).toContain('runCaller (function) [calls, type_ref]');
      expect(humanOut).not.toContain('extUser');

      // 2. --include-external + --json includes external caller
      logSpy.mockClear();
      const jsonRes = await command.execute(['readCore', '--include-external', '--json']);
      expect(jsonRes.exitCode).toBe(0);
      const jsonPayload = JSON.parse(logSpy.mock.calls.map((c) => c.join(' ')).join('\n')) as {
        dependents: Array<{ name: string }>;
      };
      expect(jsonPayload.dependents.map((d) => d.name)).toEqual(
        expect.arrayContaining(['runCaller', 'extUser'])
      );

      // 3. File-level query + --xml
      logSpy.mockClear();
      const xmlRes = await command.execute(['src/core.ts', '--xml']);
      expect(xmlRes.exitCode).toBe(0);
      const xmlOut = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(xmlOut).toContain('<who-uses>');
      expect(xmlOut).toContain('runCaller');
    });
  });
});
