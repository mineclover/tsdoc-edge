import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { formatCanonicalId, parseCanonicalId } from '../../indexer/canonical-id';
import type { CanonicalProjectGraph } from '../../indexer/contracts';
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

  it('uses qualified legacy member names and omits constructors', () => {
    const rootDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-qualified-alias-'))
    );
    fs.mkdirSync(path.join(rootDir, 'src'));
    fs.writeFileSync(
      path.join(rootDir, 'src/service.ts'),
      [
        'class Alpha {',
        '  constructor() {}',
        '  run(): void {}',
        '}',
        '',
        '',
        '',
        '',
        '',
        'class Beta {',
        '  constructor() {}',
        '  run(): void {}',
        '}',
      ].join('\n')
    );
    try {
      const graph = graphWithNodes(
        [
          node('src/service.ts#Alpha:class', 'class', 'Alpha', 'Alpha', 1),
          node(
            'src/service.ts#Alpha.__constructor:method',
            'method',
            '__constructor',
            'Alpha.__constructor',
            2
          ),
          node('src/service.ts#Alpha.run:method', 'method', 'run', 'Alpha.run', 3),
          node('src/service.ts#Beta:class', 'class', 'Beta', 'Beta', 10),
          node(
            'src/service.ts#Beta.__constructor:method',
            'method',
            '__constructor',
            'Beta.__constructor',
            11
          ),
          node('src/service.ts#Beta.run:method', 'method', 'run', 'Beta.run', 12),
        ],
        rootDir
      );

      expect(
        materializeAliases(graph).map(({ canonicalId, legacyId }) => ({ canonicalId, legacyId }))
      ).toEqual([
        { canonicalId: 'src/service.ts#Alpha.run:method', legacyId: 'service-method-alpha-run' },
        { canonicalId: 'src/service.ts#Alpha:class', legacyId: 'service-class-alpha' },
        { canonicalId: 'src/service.ts#Beta.run:method', legacyId: 'service-method-beta-run' },
        { canonicalId: 'src/service.ts#Beta:class', legacyId: 'service-class-beta' },
      ]);
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('adds legacy line suffixes and omits every ambiguous claimant', () => {
    const graph = graphWithNodes([
      node('src/a/service.ts#Worker:class', 'class', 'Worker', 'Worker', 1, 'src/a/service.ts'),
      node('src/b/service.ts#Worker:class', 'class', 'Worker', 'Worker', 20, 'src/b/service.ts'),
      node('src/c/service.ts#Worker:class', 'class', 'Worker', 'Worker', 30, 'src/c/service.ts'),
      node('src/d/service.ts#Worker:class', 'class', 'Worker', 'Worker', 30, 'src/d/service.ts'),
    ]);

    expect(
      materializeAliases(graph).map(({ canonicalId, legacyId }) => ({ canonicalId, legacyId }))
    ).toEqual([
      { canonicalId: 'src/a/service.ts#Worker:class', legacyId: 'service-class-worker' },
      { canonicalId: 'src/b/service.ts#Worker:class', legacyId: 'service-class-worker-L20' },
    ]);
  });

  it('skips external and legacy-unmatchable declarations', () => {
    const graph = graphWithNodes([
      {
        ...node('node_modules/pkg/index.d.ts#External:class', 'class', 'External', 'External', 1),
        external: true,
      },
      node('src/a.ts#value:variable', 'variable', 'value', 'value', 2),
      node('src/a.ts#Shape:interface', 'interface', 'Shape', 'Shape', 3),
      node('src/a.ts#Shape.render:method', 'method', 'render', 'Shape.render', 4),
    ]);

    expect(materializeAliases(graph).map((alias) => alias.canonicalId)).toEqual([
      'src/a.ts#Shape:interface',
    ]);
  });

  it('does not resolve caller-supplied ambiguous aliases arbitrarily', () => {
    const resolver = new InMemoryAliasResolver([
      {
        canonicalId: 'src/a.ts#A:class',
        legacyId: 'shared-class-a',
        matchStrategy: 'legacy-projection',
        confidence: 1,
        filePath: 'src/a.ts',
      },
      {
        canonicalId: 'src/b.ts#B:class',
        legacyId: 'shared-class-a',
        matchStrategy: 'legacy-projection',
        confidence: 1,
        filePath: 'src/b.ts',
      },
    ]);

    expect(resolver.legacyToCanonical('shared-class-a')).toBeNull();
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

function graphWithNodes(
  nodes: CanonicalProjectGraph['nodes'],
  rootDir = '/workspace'
): CanonicalProjectGraph {
  return {
    ...fixtureGraph(),
    rootDir,
    tsconfigPath: path.join(rootDir, 'tsconfig.ttsc.json'),
    nodes,
  };
}

function node(
  id: string,
  kind: string,
  name: string,
  qualifiedName: string,
  startLine: number,
  file = 'src/service.ts'
): CanonicalProjectGraph['nodes'][number] {
  return {
    id,
    sourceId: id,
    kind,
    name,
    qualifiedName,
    file,
    evidence: { file, startLine, endLine: startLine },
  };
}
