import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { CanonicalProjectGraph } from '../../indexer/contracts';
import { CanonicalAliasContext } from '../../indexer/CanonicalAliasContext';
import { verifyLegacyAstParity } from '../../indexer/LegacyAstParityAdapter';
import { ProjectIndexer } from '../../indexer/ProjectIndexer';
import { materializeAliases } from '../../indexer/symbol-alias';
import { GraphRepository } from '../../storage/GraphRepository';

describe('CanonicalAliasContext', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-alias-')));
    fs.mkdirSync(path.join(tempDir, 'src'));
    fs.writeFileSync(path.join(tempDir, 'src/a.ts'), 'export class A {}\n');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('opens active aliases for legacy-to-canonical hops', async () => {
    const graph = await indexedGraph(tempDir);
    const repository = new GraphRepository(path.join(tempDir, '.tsdoc/canonical-graph.db'));
    repository.replaceActiveRevision(graph, { aliases: materializeAliases(graph) });
    repository.close();

    const context = CanonicalAliasContext.tryOpen(tempDir);
    expect(context).not.toBeNull();
    expect(context?.resolveCanonicalId('a-class-a')).toBe('src/a.ts#A:class');
    expect(context?.structuralCounts('src/a.ts#A:class')).toEqual({
      dependencies: 0,
      dependents: 0,
    });
    context?.close();
  });
});

describe('verifyLegacyAstParity', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-parity-')));
    fs.mkdirSync(path.join(tempDir, 'src'));
    fs.writeFileSync(path.join(tempDir, 'src/a.ts'), 'export class A {}\n');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('passes for supported top-level fixture declarations', async () => {
    const graph = await indexedGraph(tempDir);
    const result = verifyLegacyAstParity(graph, tempDir);
    expect(result.mismatches).toEqual([]);
    expect(result.matched).toBe(1);
  });
});

function indexedGraph(rootDir: string): Promise<CanonicalProjectGraph> {
  return new ProjectIndexer({
    id: 'fixture',
    load: async () => ({
      rootDir,
      tsconfigPath: path.join(rootDir, 'tsconfig.ttsc.json'),
      nodes: [
        {
          id: 'src/a.ts#A:class',
          kind: 'class',
          name: 'A',
          file: 'src/a.ts',
          evidence: { file: 'src/a.ts', startLine: 1, endLine: 1, startCol: 1, endCol: 20 },
        },
      ],
      edges: [],
      provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
    }),
  }).index({ rootDir, tsconfigPath: 'tsconfig.ttsc.json' }).then((result) => result.graph);
}
