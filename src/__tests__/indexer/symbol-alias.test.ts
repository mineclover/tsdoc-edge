import type { CanonicalProjectGraph } from '../../indexer/contracts';
import { formatCanonicalId, parseCanonicalId } from '../../indexer/canonical-id';
import { generateLegacyId } from '../../indexer/legacy-id';
import { InMemoryAliasResolver, materializeAliases } from '../../indexer/symbol-alias';

describe('canonical-id', () => {
  it('formats and parses canonical ids', () => {
    const id = formatCanonicalId('src/a.ts', 'A', 'class');
    expect(id).toBe('src/a.ts#A:class');
    expect(parseCanonicalId(id)).toEqual({
      filePath: 'src/a.ts',
      qualifiedName: 'A',
      kind: 'class',
      provisional: false,
    });
  });

  it('marks provisional overlay ids', () => {
    const id = formatCanonicalId('src/a.ts', 'Dirty', 'class', true);
    expect(parseCanonicalId(id)?.provisional).toBe(true);
  });
});

describe('legacy-id', () => {
  it('generates filename-type-name legacy ids', () => {
    expect(generateLegacyId('/workspace/src/UserService.ts', 'UserService', 'class')).toBe(
      'userservice-class-userservice'
    );
  });
});

describe('symbol-alias', () => {
  it('materializes deterministic canonical to legacy aliases', () => {
    const graph = fixtureGraph();
    const aliases = materializeAliases(graph);
    expect(aliases).toEqual([
      expect.objectContaining({
        canonicalId: 'src/a.ts#A:class',
        legacyId: 'a-class-a',
        matchStrategy: 'legacy-projection',
      }),
    ]);

    const resolver = new InMemoryAliasResolver(aliases);
    expect(resolver.legacyToCanonical('a-class-a')).toBe('src/a.ts#A:class');
    expect(resolver.canonicalToLegacy('src/a.ts#A:class')).toBe('a-class-a');
  });
});

function fixtureGraph(): CanonicalProjectGraph {
  return {
    contractVersion: '1.0',
    rootDir: '/workspace',
    tsconfigPath: '/workspace/tsconfig.ttsc.json',
    fingerprint: 'fixture',
    provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
    nodes: [
      {
        id: 'src/a.ts#A:class',
        sourceId: 'src/a.ts#A:class',
        kind: 'class',
        name: 'A',
        file: 'src/a.ts',
        evidence: { file: 'src/a.ts', startLine: 1, endLine: 1 },
      },
    ],
    edges: [],
  };
}
