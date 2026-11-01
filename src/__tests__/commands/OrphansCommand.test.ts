/**
 * Tests for OrphansCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { OrphansCommand } from '../../commands/OrphansCommand';
import {
  type CanonicalGraphEdge,
  type CanonicalGraphNode,
  type CanonicalProjectGraph,
  canonicalProjectGraphFingerprint,
} from '../../indexer';
import { GraphRepository } from '../../storage/GraphRepository';

describe('OrphansCommand', () => {
  let command: OrphansCommand;
  let tempDir: string;
  const originalCwd = process.cwd();
  const originalCanonicalEnv = process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orphans-command-'));
    process.chdir(tempDir);
    delete process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB;
    command = new OrphansCommand();
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
      expect(command.getName()).toBe('orphans');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('orphan');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('excludes members of used interfaces/classes and static-only containers by default while catching true orphans', async () => {
      const canonicalDbPath = path.join(tempDir, '.tsdoc', 'canonical-graph.db');
      fs.mkdirSync(path.dirname(canonicalDbPath), { recursive: true });
      const repo = new GraphRepository(canonicalDbPath);

      const rawNodes: CanonicalGraphNode[] = [
        {
          id: 'src/app.ts#runApp:function',
          sourceId: 'src/app.ts#runApp:function',
          kind: 'function',
          name: 'runApp',
          file: 'src/app.ts',
        },
        {
          id: 'src/builder.ts#StaticBuilder.create:method',
          sourceId: 'src/builder.ts#StaticBuilder.create:method',
          kind: 'method',
          name: 'create',
          qualifiedName: 'StaticBuilder.create',
          file: 'src/builder.ts',
        },
        {
          id: 'src/builder.ts#StaticBuilder.helper:method',
          sourceId: 'src/builder.ts#StaticBuilder.helper:method',
          kind: 'method',
          name: 'helper',
          qualifiedName: 'StaticBuilder.helper',
          file: 'src/builder.ts',
        },
        {
          id: 'src/builder.ts#StaticBuilder:class',
          sourceId: 'src/builder.ts#StaticBuilder:class',
          kind: 'class',
          name: 'StaticBuilder',
          file: 'src/builder.ts',
        },
        {
          id: 'src/dead.ts#DeadService.load:method',
          sourceId: 'src/dead.ts#DeadService.load:method',
          kind: 'method',
          name: 'load',
          qualifiedName: 'DeadService.load',
          file: 'src/dead.ts',
        },
        {
          id: 'src/dead.ts#DeadService.save:method',
          sourceId: 'src/dead.ts#DeadService.save:method',
          kind: 'method',
          name: 'save',
          qualifiedName: 'DeadService.save',
          file: 'src/dead.ts',
        },
        {
          id: 'src/dead.ts#DeadService:class',
          sourceId: 'src/dead.ts#DeadService:class',
          kind: 'class',
          name: 'DeadService',
          file: 'src/dead.ts',
        },
        {
          id: 'src/types.ts#ExtractedSymbol.declaredType:variable',
          sourceId: 'src/types.ts#ExtractedSymbol.declaredType:variable',
          kind: 'variable',
          name: 'declaredType',
          qualifiedName: 'ExtractedSymbol.declaredType',
          file: 'src/types.ts',
        },
        {
          id: 'src/types.ts#ExtractedSymbol:interface',
          sourceId: 'src/types.ts#ExtractedSymbol:interface',
          kind: 'interface',
          name: 'ExtractedSymbol',
          file: 'src/types.ts',
        },
        {
          id: 'src/types.ts#UnusedPayload:interface',
          sourceId: 'src/types.ts#UnusedPayload:interface',
          kind: 'interface',
          name: 'UnusedPayload',
          file: 'src/types.ts',
        },
      ];
      const nodes = [...rawNodes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

      const rawEdges: CanonicalGraphEdge[] = [
        {
          kind: 'calls',
          from: 'src/app.ts#runApp:function',
          to: 'src/builder.ts#StaticBuilder.create:method',
        },
        {
          kind: 'calls',
          from: 'src/dead.ts#DeadService.save:method',
          to: 'src/dead.ts#DeadService.load:method',
        },
        {
          kind: 'type_ref',
          from: 'src/app.ts#runApp:function',
          to: 'src/types.ts#ExtractedSymbol:interface',
        },
      ];
      const edges = [...rawEdges].sort(
        (a, b) =>
          (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0) ||
          (a.from < b.from ? -1 : a.from > b.from ? 1 : 0) ||
          (a.to < b.to ? -1 : a.to > b.to ? 1 : 0)
      );

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

      // 1. Default (--json): excludes ExtractedSymbol.declaredType & StaticBuilder/StaticBuilder.helper
      const defaultRes = await command.execute(['--json']);
      expect(defaultRes.exitCode).toBe(0);
      const defaultPayload = JSON.parse(logSpy.mock.calls.map((c) => c.join(' ')).join('\n')) as {
        orphans: Array<{ id: string }>;
      };
      const defaultIds = defaultPayload.orphans.map((o) => o.id);
      expect(defaultIds).not.toContain('src/types.ts#ExtractedSymbol.declaredType:variable');
      expect(defaultIds).not.toContain('src/builder.ts#StaticBuilder:class');
      expect(defaultIds).not.toContain('src/builder.ts#StaticBuilder.helper:method');
      expect(defaultIds).toContain('src/dead.ts#DeadService:class');
      expect(defaultIds).toContain('src/types.ts#UnusedPayload:interface');

      // 2. With --include-members: includes ExtractedSymbol.declaredType & StaticBuilder.helper
      logSpy.mockClear();
      const withMembersRes = await command.execute(['--include-members', '--json']);
      expect(withMembersRes.exitCode).toBe(0);
      const withMembersPayload = JSON.parse(
        logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
      ) as {
        orphans: Array<{ id: string }>;
      };
      const withMembersIds = withMembersPayload.orphans.map((o) => o.id);
      expect(withMembersIds).toContain('src/types.ts#ExtractedSymbol.declaredType:variable');
      expect(withMembersIds).toContain('src/builder.ts#StaticBuilder.helper:method');
    });
  });
});

describe('OrphansCommand fail-closed flags', () => {
  it('rejects unknown options', async () => {
    const result = await new OrphansCommand().execute(['--unknown-flag']);
    expect(result.exitCode).toBe(1);
  });
});
