import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CanonicalAliasContext } from '../../indexer/CanonicalAliasContext';
import type { CanonicalProjectGraph } from '../../indexer/contracts';
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

  it('matches repeated methods by qualified legacy identity and ignores constructors', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'src/a.ts'),
      [
        'export class Alpha {',
        '  constructor() {}',
        '  run(): void {}',
        "  get status(): string { return 'ready'; }",
        '}',
        'export class Beta {',
        '  constructor() {}',
        '  run(): void {}',
        '}',
        '',
      ].join('\n')
    );
    const graph = await indexedGraphWithNodes(tempDir, [
      sourceNode('src/a.ts#Alpha:class', 'class', 'Alpha', 'Alpha', 1),
      sourceNode(
        'src/a.ts#Alpha.__constructor:method',
        'method',
        '__constructor',
        'Alpha.__constructor',
        2
      ),
      sourceNode('src/a.ts#Alpha.run:method', 'method', 'run', 'Alpha.run', 3),
      sourceNode('src/a.ts#Alpha.status:method', 'method', 'status', 'Alpha.status', 4),
      sourceNode('src/a.ts#Beta:class', 'class', 'Beta', 'Beta', 6),
      sourceNode(
        'src/a.ts#Beta.__constructor:method',
        'method',
        '__constructor',
        'Beta.__constructor',
        7
      ),
      sourceNode('src/a.ts#Beta.run:method', 'method', 'run', 'Beta.run', 8),
    ]);

    const aliases = materializeAliases(graph);
    const result = verifyLegacyAstParity(graph, tempDir);

    expect(aliases.map((alias) => alias.legacyId)).toEqual([
      'a-method-alpha-run',
      'a-class-alpha',
      'a-method-beta-run',
      'a-class-beta',
    ]);
    expect(aliases.some((alias) => alias.canonicalId.includes('__constructor'))).toBe(false);
    expect(aliases.some((alias) => alias.canonicalId.endsWith('.status:method'))).toBe(false);
    expect(result).toEqual({ matched: 4, mismatches: [] });
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
  })
    .index({ rootDir, tsconfigPath: 'tsconfig.ttsc.json' })
    .then((result) => result.graph);
}

function indexedGraphWithNodes(
  rootDir: string,
  nodes: Array<{
    id: string;
    kind: string;
    name: string;
    qualifiedName: string;
    file: string;
    evidence: { file: string; startLine: number; endLine: number };
  }>
): Promise<CanonicalProjectGraph> {
  return new ProjectIndexer({
    id: 'fixture',
    load: async () => ({
      rootDir,
      tsconfigPath: path.join(rootDir, 'tsconfig.ttsc.json'),
      nodes,
      edges: [],
      provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
    }),
  })
    .index({ rootDir, tsconfigPath: 'tsconfig.ttsc.json' })
    .then((result) => result.graph);
}

function sourceNode(
  id: string,
  kind: string,
  name: string,
  qualifiedName: string,
  startLine: number
) {
  return {
    id,
    kind,
    name,
    qualifiedName,
    file: 'src/a.ts',
    evidence: { file: 'src/a.ts', startLine, endLine: startLine },
  };
}
