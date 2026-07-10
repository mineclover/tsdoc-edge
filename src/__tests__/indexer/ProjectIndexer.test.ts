import type { ProjectGraphInput, ProjectGraphSource } from '../../indexer/contracts';
import { ProjectIndexer } from '../../indexer/ProjectIndexer';

describe('ProjectIndexer', () => {
  const rootDir = '/workspace/project';

  it('uses producer ids as canonical ids and assembles a deterministic graph', async () => {
    const first = new ProjectIndexer(sourceFor(graphInput(false)));
    const second = new ProjectIndexer(sourceFor(graphInput(true)));

    const left = await first.index({ rootDir });
    const right = await second.index({ rootDir });

    expect(left.nodes.map((node) => node.id)).toEqual(['src/a.ts#A:class', 'src/b.ts#B:class']);
    expect(left.nodes.map((node) => node.sourceId)).toEqual(left.nodes.map((node) => node.id));
    expect(left.edges[0]).toEqual(
      expect.objectContaining({
        kind: 'calls',
        from: 'src/a.ts#A:class',
        to: 'src/b.ts#B:class',
      })
    );
    expect(left.fingerprint).toBe(right.fingerprint);
    expect(left.tsconfigPath).toBe('/workspace/project/tsconfig.json');
  });

  it('rejects duplicate node ids', async () => {
    const input = graphInput(false);
    input.nodes.push({ ...input.nodes[0] });

    await expect(new ProjectIndexer(sourceFor(input)).index({ rootDir })).rejects.toThrow(
      'Duplicate graph node id'
    );
  });

  it('rejects edges with unknown endpoints', async () => {
    const input = graphInput(false);
    input.edges[0] = { ...input.edges[0], to: 'src/missing.ts#Missing:class' };

    await expect(new ProjectIndexer(sourceFor(input)).index({ rootDir })).rejects.toThrow(
      'unknown endpoint'
    );
  });

  it('rejects duplicate producer edge tuples', async () => {
    const input = graphInput(false);
    input.edges.push({ ...input.edges[0] });

    await expect(new ProjectIndexer(sourceFor(input)).index({ rootDir })).rejects.toThrow(
      'Duplicate graph edge'
    );
  });

  it('validates canonical producer ids and kind suffixes', async () => {
    const malformed = graphInput(false);
    malformed.nodes[0].id = 'not-a-canonical-id';
    await expect(new ProjectIndexer(sourceFor(malformed)).index({ rootDir })).rejects.toThrow(
      'path#qualifiedName:class'
    );

    const wrongKind = graphInput(false);
    wrongKind.nodes[0].id = 'src/a.ts#A:interface';
    await expect(new ProjectIndexer(sourceFor(wrongKind)).index({ rootDir })).rejects.toThrow(
      'path#qualifiedName:class'
    );
  });

  it('accepts external URI ids and uses locale-independent code-unit order', async () => {
    const input = graphInput(false);
    input.nodes = [
      { id: 'src/ä.ts#Ä:class', kind: 'class' },
      { id: 'bundled:///libs/lib.es5.d.ts#Array:interface', kind: 'interface' },
      { id: 'src/z.ts#Z:class', kind: 'class' },
    ];
    input.edges = [];

    const graph = await new ProjectIndexer(sourceFor(input)).index({ rootDir });

    expect(graph.nodes.map((node) => node.id)).toEqual([
      'bundled:///libs/lib.es5.d.ts#Array:interface',
      'src/z.ts#Z:class',
      'src/ä.ts#Ä:class',
    ]);
  });

  it('deep-clones and freezes the revision so its fingerprint cannot become stale', async () => {
    const input = graphInput(false);
    const graph = await new ProjectIndexer(sourceFor(input)).index({ rootDir });
    const metadata = input.nodes[0].customProducerField as { z: number };
    metadata.z = 99;

    expect((graph.nodes[0].customProducerField as { z: number }).z).toBe(1);
    expect(Object.isFrozen(graph)).toBe(true);
    expect(Object.isFrozen(graph.nodes)).toBe(true);
    expect(Object.isFrozen(graph.nodes[0].customProducerField)).toBe(true);
  });

  it('rejects non-JSON and reserved producer fields', async () => {
    const nonJson = graphInput(false);
    nonJson.nodes[0].invalid = undefined;
    await expect(new ProjectIndexer(sourceFor(nonJson)).index({ rootDir })).rejects.toThrow(
      'non-JSON undefined'
    );

    const reserved = graphInput(false);
    reserved.nodes[0].sourceId = 'producer-value';
    await expect(new ProjectIndexer(sourceFor(reserved)).index({ rootDir })).rejects.toThrow(
      'sourceId is reserved'
    );
  });
});

function sourceFor(input: ProjectGraphInput): ProjectGraphSource {
  return {
    id: 'fixture',
    async load() {
      return input;
    },
  };
}

function graphInput(reverse: boolean): ProjectGraphInput {
  const nodes = [
    {
      id: 'src/a.ts#A:class',
      kind: 'class',
      name: 'A',
      file: 'src/a.ts',
      customProducerField: { z: 1, a: 2 },
    },
    {
      id: 'src/b.ts#B:class',
      kind: 'class',
      name: 'B',
      file: 'src/b.ts',
    },
  ];
  return {
    rootDir: '/workspace/project',
    tsconfigPath: '/workspace/project/tsconfig.json',
    nodes: reverse ? nodes.reverse() : nodes,
    edges: [
      {
        kind: 'calls',
        from: 'src/a.ts#A:class',
        to: 'src/b.ts#B:class',
        evidence: { file: 'src/a.ts', startLine: 3 },
      },
    ],
    provenance: {
      adapter: 'fixture',
      producer: 'fixture-producer',
    },
  };
}
