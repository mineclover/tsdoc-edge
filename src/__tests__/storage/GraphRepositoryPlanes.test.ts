import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { normalizeRouterDiagnostics } from '../../indexer/diagnostics-contract';
import { materializeAliases } from '../../indexer/symbol-alias';
import { ProjectIndexer } from '../../indexer/ProjectIndexer';
import type { ProjectGraphInput } from '../../indexer/contracts';
import { GraphRepository } from '../../storage/GraphRepository';

describe('GraphRepository alias and diagnostics planes', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-repo-')));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('persists aliases and diagnostics separately from node/edge facts', async () => {
    const repositoryPath = path.join(tempDir, 'canonical-graph.db');
    const repository = new GraphRepository(repositoryPath);
    const indexed = await new ProjectIndexer({
      id: 'fixture',
      load: async () => graphInput(tempDir),
    }).index({ rootDir: tempDir, tsconfigPath: 'tsconfig.ttsc.json' });

    const diagnostics = normalizeRouterDiagnostics(
      [
        {
          message: 'Type mismatch',
          severity: 'error',
          file: 'src/a.ts',
          startLine: 2,
        },
      ],
      { rootDir: tempDir }
    );

    repository.replaceActiveRevision(indexed.graph, {
      aliases: materializeAliases(indexed.graph),
      diagnostics,
    });
    repository.close();

    const readOnly = new GraphRepository(repositoryPath, { readOnly: true });
    const active = readOnly.readActiveRevision();
    readOnly.close();

    expect(active?.aliases).toEqual([
      expect.objectContaining({
        canonicalId: 'src/a.ts#A:class',
        legacyId: 'a-class-a',
      }),
    ]);
    expect(active?.diagnostics).toEqual([
      expect.objectContaining({
        message: 'Type mismatch',
        severity: 'error',
        startLine: 2,
      }),
    ]);
    expect(active?.graph.fingerprint).toBe(indexed.graph.fingerprint);
  });
});

function graphInput(rootDir: string): ProjectGraphInput {
  return {
    rootDir,
    tsconfigPath: path.join(rootDir, 'tsconfig.ttsc.json'),
    nodes: [
      {
        id: 'src/a.ts#A:class',
        kind: 'class',
        name: 'A',
        file: 'src/a.ts',
      },
    ],
    edges: [],
    provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
  };
}
