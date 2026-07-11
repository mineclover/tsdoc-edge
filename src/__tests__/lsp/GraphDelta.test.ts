import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { isProvisionalOverlayId } from '../../indexer/canonical-id';
import type { CanonicalProjectGraph } from '../../indexer/contracts';
import { IncrementalBuilder, type IncrementalExtractResult } from '../../lsp/incremental-builder';
import {
  applyGraphDelta,
  composeGraphDeltas,
  EffectiveCodeGraphView,
  GraphDeltaBuilder,
  OverlayGraphView,
} from '../../lsp/overlay';

describe('GraphDelta overlay', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-delta-')));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('reuses saved canonical ids for modified declarations and uses provisional ids for new ones', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const graph = baseGraph(filePath);
    const extract = overlayExtract(filePath, [
      { name: 'DirtyBuffer', type: 'class', line: 1, column: 1, endLine: 3, endColumn: 2 },
      { name: 'method', type: 'method', line: 2, column: 3, endLine: 2, endColumn: 16 },
    ]);

    const delta = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content: fixtureContent(extract),
      extract,
    });
    const view = new OverlayGraphView(revision(graph), delta);

    expect(delta.nodes.remove).toEqual(['src/a.ts#A:class']);
    expect(delta.nodes.upsert.map((node) => node.id)).toEqual([
      'src/a.ts#DirtyBuffer:class@overlay',
      'src/a.ts#DirtyBuffer.method:method@overlay',
    ]);
    expect(isProvisionalOverlayId(delta.nodes.upsert[0].id)).toBe(true);
    expect(view.view.symbolAtPosition(filePath, 1, 0)?.node.name).toBe('DirtyBuffer');
    expect(view.view.search('Dirty', 10)).toHaveLength(1);
    expect(view.view.symbolsInFile(filePath)).toHaveLength(2);
  });

  it('retains canonical ids and safe incident edges for unchanged declarations', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const graph = graphWithTopology(filePath);
    const extract = overlayExtract(filePath, [
      { name: 'A', type: 'class', line: 2, column: 1, endLine: 8, endColumn: 2 },
      { name: 'run', type: 'method', line: 5, column: 3, endLine: 6, endColumn: 4 },
    ]);

    const delta = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content: fixtureContent(extract),
      extract,
    });
    const view = new OverlayGraphView(revision(graph), delta);

    expect(delta.nodes.remove).toEqual([]);
    expect(delta.nodes.upsert.map((node) => node.id)).toEqual([
      'src/a.ts#A:class',
      'src/a.ts#A.run:method',
    ]);
    expect(view.effectiveGraph.edges).toEqual(graph.edges);
    expect(view.view.impactCounts('src/b.ts#B:class')).toEqual({
      dependents: 1,
      dependencies: 0,
    });
    expect(delta.extractor.relationshipCoverage).toBe('none');
    expect(delta.identityRemap).toEqual([]);
  });

  it('replaces complete dirty-owner execution/type dependencies while preserving other edges', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const initial = graphWithTopology(filePath);
    const graph: CanonicalProjectGraph = {
      ...initial,
      edges: [
        { kind: 'calls', from: 'src/a.ts#A.run:method', to: 'src/b.ts#B:class' },
        { kind: 'type_ref', from: 'src/a.ts#A.run:method', to: 'src/b.ts#B:class' },
        { kind: 'contains', from: 'src/a.ts#A:class', to: 'src/a.ts#A.run:method' },
        { kind: 'calls', from: 'src/b.ts#B:class', to: 'src/a.ts#A.run:method' },
      ],
    };
    const extract = overlayExtract(filePath, [
      { name: 'A', type: 'class', line: 1, column: 1, endLine: 8, endColumn: 2 },
      { name: 'run', type: 'method', line: 2, column: 3, endLine: 3, endColumn: 4 },
    ]);

    const delta = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content: fixtureContent(extract),
      extractor: completeRelationshipExtractor(),
      extract,
    });
    const view = new OverlayGraphView(revision(graph), delta);

    expect(delta.edges.remove).toEqual([
      { kind: 'calls', from: 'src/a.ts#A.run:method', to: 'src/b.ts#B:class' },
      { kind: 'type_ref', from: 'src/a.ts#A.run:method', to: 'src/b.ts#B:class' },
    ]);
    expect(view.effectiveGraph.edges).toEqual(
      expect.arrayContaining([
        { kind: 'contains', from: 'src/a.ts#A:class', to: 'src/a.ts#A.run:method' },
        { kind: 'calls', from: 'src/b.ts#B:class', to: 'src/a.ts#A.run:method' },
      ])
    );
    expect(view.effectiveGraph.edges).toHaveLength(2);
  });

  it('resolves unique cross-file relationship targets through the base canonical graph', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const graph = graphWithTopology(filePath);
    const extract: IncrementalExtractResult = {
      ...overlayExtract(filePath, [
        { name: 'A', type: 'class', line: 1, column: 1, endLine: 8, endColumn: 2 },
        { name: 'run', type: 'method', line: 2, column: 3, endLine: 3, endColumn: 4 },
      ]),
      relationships: [
        {
          fromSymbol: 'method-run',
          toSymbol: 'B',
          type: 'calls',
          category: 'behavioral',
          strength: 3,
        },
      ],
    };

    const delta = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content: fixtureContent(extract),
      extractor: completeRelationshipExtractor(),
      extract,
    });
    const view = new OverlayGraphView(revision(graph), delta);

    expect(delta.edges.upsert).toEqual([
      expect.objectContaining({
        kind: 'calls',
        from: 'src/a.ts#A.run:method',
        to: 'src/b.ts#B:class',
      }),
    ]);
    expect(view.effectiveGraph.edges).toEqual([
      expect.objectContaining({
        kind: 'calls',
        from: 'src/a.ts#A.run:method',
        to: 'src/b.ts#B:class',
      }),
    ]);
  });

  it('keeps ambiguous workspace relationship targets unresolved', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const initial = graphWithTopology(filePath);
    const graph: CanonicalProjectGraph = {
      ...initial,
      nodes: [
        ...initial.nodes.map((node) =>
          node.id === 'src/b.ts#B:class' ? { ...node, qualifiedName: 'package-one.B' } : node
        ),
        {
          id: 'src/c.ts#B:class',
          sourceId: 'src/c.ts#B:class',
          kind: 'class',
          name: 'B',
          qualifiedName: 'package-two.B',
          file: 'src/c.ts',
          evidence: { file: 'src/c.ts', startLine: 1, endLine: 2 },
        },
      ],
    };
    const extract: IncrementalExtractResult = {
      ...overlayExtract(filePath, [
        { name: 'A', type: 'class', line: 1, column: 1, endLine: 8, endColumn: 2 },
        { name: 'run', type: 'method', line: 2, column: 3, endLine: 3, endColumn: 4 },
      ]),
      relationships: [
        {
          fromSymbol: 'method-run',
          toSymbol: 'B',
          type: 'calls',
          category: 'behavioral',
          strength: 3,
        },
      ],
    };

    const delta = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content: fixtureContent(extract),
      extractor: completeRelationshipExtractor(),
      extract,
    });

    expect(delta.edges.upsert).toEqual([]);
    expect(new OverlayGraphView(revision(graph), delta).effectiveGraph.edges).toEqual([]);
  });

  it('owner-qualifies duplicate method names and never emits duplicate provisional ids', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const graph = baseGraph(filePath);
    const extract = overlayExtract(filePath, [
      { name: 'First', type: 'class', line: 1, column: 1, endLine: 5, endColumn: 2 },
      { name: 'run', type: 'method', line: 2, column: 3, endLine: 2, endColumn: 16 },
      { name: 'run', type: 'method', line: 3, column: 3, endLine: 3, endColumn: 16 },
      { name: 'Second', type: 'class', line: 7, column: 1, endLine: 9, endColumn: 2 },
      { name: 'run', type: 'method', line: 8, column: 3, endLine: 8, endColumn: 16 },
    ]);

    const delta = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content: fixtureContent(extract),
      extract,
    });
    const ids = delta.nodes.upsert.map((node) => node.id);

    expect(ids).toEqual([
      'src/a.ts#First:class@overlay',
      'src/a.ts#First.run:method@overlay',
      'src/a.ts#First.run~2:method@overlay',
      'src/a.ts#Second:class@overlay',
      'src/a.ts#Second.run:method@overlay',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('removes topology only when an endpoint is removed or renamed', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const graph = graphWithTopology(filePath);
    const extract = overlayExtract(filePath, [
      { name: 'Renamed', type: 'class', line: 1, column: 1, endLine: 3, endColumn: 2 },
    ]);

    const delta = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content: fixtureContent(extract),
      extract,
    });
    const view = new OverlayGraphView(revision(graph), delta);

    expect(delta.nodes.remove).toEqual(['src/a.ts#A:class', 'src/a.ts#A.run:method']);
    expect(delta.edges.remove).toEqual([
      { kind: 'calls', from: 'src/a.ts#A.run:method', to: 'src/b.ts#B:class' },
    ]);
    expect(view.effectiveGraph.edges).toEqual([]);
  });

  it('applies only explicit validated identity remaps for safe renames', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const initial = baseGraph(filePath);
    const graph: CanonicalProjectGraph = {
      ...initial,
      nodes: [
        ...initial.nodes,
        {
          id: 'src/b.ts#B:class',
          sourceId: 'src/b.ts#B:class',
          kind: 'class',
          name: 'B',
          qualifiedName: 'B',
          file: 'src/b.ts',
          evidence: { file: 'src/b.ts', startLine: 1, endLine: 2 },
        },
      ],
      edges: [
        { kind: 'calls', from: 'src/a.ts#A:class', to: 'src/b.ts#B:class' },
        { kind: 'type_ref', from: 'src/b.ts#B:class', to: 'src/a.ts#A:class' },
      ],
    };
    const extract = overlayExtract(filePath, [
      { name: 'RenamedA', type: 'class', line: 1, column: 1, endLine: 2, endColumn: 2 },
    ]);
    const remap = {
      fromNodeId: 'src/a.ts#A:class',
      toNodeId: 'src/a.ts#RenamedA:class@overlay',
    } as const;
    const withoutRemap = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content: fixtureContent(extract),
      extract,
    });
    const delta = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content: fixtureContent(extract),
      identityRemap: [remap],
      extract,
    });
    const view = new OverlayGraphView(revision(graph), delta);

    expect(delta.identityRemap).toEqual([remap]);
    expect(delta.deltaId).not.toBe(withoutRemap.deltaId);
    expect(delta.edges.remove).toEqual([]);
    expect(view.effectiveGraph.edges).toEqual([
      { kind: 'calls', from: remap.toNodeId, to: 'src/b.ts#B:class' },
      { kind: 'type_ref', from: 'src/b.ts#B:class', to: remap.toNodeId },
    ]);
  });

  it('rejects identity remaps whose source or target is not part of the rename delta', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const graph = baseGraph(filePath);
    const extract = overlayExtract(filePath, [
      { name: 'RenamedA', type: 'class', line: 1, column: 1, endLine: 2, endColumn: 2 },
    ]);

    expect(() =>
      GraphDeltaBuilder.fromExtract({
        baseGraph: graph,
        baseRevisionId: 'rev-1',
        filePath,
        content: fixtureContent(extract),
        identityRemap: [
          {
            fromNodeId: 'src/a.ts#A:class',
            toNodeId: 'src/a.ts#Missing:class@overlay',
          },
        ],
        extract,
      })
    ).toThrow('identityRemap target is not upserted by this delta');
  });

  it('preserves producer-qualified names when position fallback supplies less owner context', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const graph = namespacedGraph(filePath);
    const extract = overlayExtract(filePath, [
      { name: 'A', type: 'class', line: 1, column: 1, endLine: 4, endColumn: 2 },
      { name: 'run', type: 'method', line: 2, column: 3, endLine: 3, endColumn: 4 },
    ]);

    const delta = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content: fixtureContent(extract),
      extract,
    });

    expect(delta.nodes.upsert).toEqual([
      expect.objectContaining({ id: 'src/a.ts#N.A:class', qualifiedName: 'N.A' }),
      expect.objectContaining({ id: 'src/a.ts#N.A.run:method', qualifiedName: 'N.A.run' }),
    ]);
  });

  it('preserves unobservable saved nodes instead of treating extract absence as deletion', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const graph = variableOnlyGraph(filePath);
    const delta = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content: 'const i = 1;',
      extract: overlayExtract(filePath, []),
    });
    const view = new OverlayGraphView(revision(graph), delta);

    expect(delta.nodes.remove).toEqual([]);
    expect(view.effectiveGraph.nodes).toEqual(graph.nodes);
  });

  it('preserves unmatched canonical topology while the dirty buffer has parse errors', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const graph = graphWithTopology(filePath);
    const extract = new IncrementalBuilder(graph.rootDir, null).processContent(
      filePath,
      'export class A {\n  run('
    );
    const delta = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content: 'export class A {\n  run(',
      extractor: completeRelationshipExtractor(),
      extract,
    });
    const view = new OverlayGraphView(revision(graph), delta);

    expect(extract.errors).toEqual([expect.stringContaining('Parse error')]);
    expect(delta.nodes.remove).toEqual([]);
    expect(view.effectiveGraph.edges).toEqual(graph.edges);
  });

  it('extracts constructors, interface members, accessors, and enums for canonical matching', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const extract = new IncrementalBuilder(tempDir, null).processContent(
      filePath,
      [
        'export class A {',
        '  constructor() {}',
        '  get value(): string { return ""; }',
        '}',
        'export interface I { run(): void; value: string; }',
        'export enum Status { Ready }',
      ].join('\n')
    );

    expect(extract.errors).toEqual([]);
    expect(extract.symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: '__constructor', type: 'method' }),
        expect.objectContaining({ name: 'value', type: 'method' }),
        expect.objectContaining({ name: 'run', type: 'method' }),
        expect.objectContaining({ name: 'value', type: 'property' }),
        expect.objectContaining({ name: 'Status', type: 'enum' }),
      ])
    );
  });

  it('derives a stable delta identity from base, extractor version, and exact content', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const graph = baseGraph(filePath);
    const extract = overlayExtract(filePath, [
      { name: 'A', type: 'class', line: 1, column: 1, endLine: 2, endColumn: 2 },
    ]);
    const content = 'export class A {}\n';
    const first = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content,
      extractor: {
        id: 'fixture-extractor',
        version: '7.0.0',
        relationshipCoverage: 'none',
      },
      extract,
    });
    const second = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content,
      extractor: {
        id: 'fixture-extractor',
        version: '7.0.0',
        relationshipCoverage: 'none',
      },
      extract: { ...extract, timestamp: extract.timestamp + 1000 },
    });
    const changedContent = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content: `${content}\n`,
      extractor: {
        id: 'fixture-extractor',
        version: '7.0.0',
        relationshipCoverage: 'none',
      },
      extract,
    });
    const changedExtractor = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content,
      extractor: {
        id: 'fixture-extractor',
        version: '7.0.1',
        relationshipCoverage: 'none',
      },
      extract,
    });
    const changedCoverage = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content,
      extractor: completeRelationshipExtractor(),
      extract,
    });

    expect(first.deltaId).toBe(`graph-delta:${first.deltaDigest}`);
    expect(first.deltaId).toBe(second.deltaId);
    expect(first.contentDigest).toBe(second.contentDigest);
    expect(changedContent.contentDigest).not.toBe(first.contentDigest);
    expect(changedContent.deltaId).not.toBe(first.deltaId);
    expect(changedExtractor.deltaId).not.toBe(first.deltaId);
    expect(changedCoverage.deltaId).not.toBe(first.deltaId);
  });

  it('rejects canonical provider changes that escape file scope or reference unknown endpoints', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const graph = graphWithTopology(filePath);
    const build = (options: {
      nodes?: Parameters<typeof GraphDeltaBuilder.fromCanonicalChanges>[0]['nodes'];
      edges?: Parameters<typeof GraphDeltaBuilder.fromCanonicalChanges>[0]['edges'];
    }) =>
      GraphDeltaBuilder.fromCanonicalChanges({
        baseGraph: graph,
        baseRevisionId: 'rev-1',
        filePath,
        contentDigest: 'content:provider-delta',
        extractor: completeRelationshipExtractor(),
        sourceContext: providerSourceContext(),
        nodes: options.nodes ?? { upsert: [], remove: [] },
        edges: options.edges ?? { upsert: [], remove: [] },
      });

    expect(() =>
      build({
        nodes: {
          upsert: [
            {
              ...graph.nodes.find((node) => node.id === 'src/b.ts#B:class')!,
              name: 'ForeignEdit',
            },
          ],
          remove: [],
        },
      })
    ).toThrow('outside its file scope');

    expect(() =>
      build({
        edges: {
          upsert: [
            {
              kind: 'calls',
              from: 'src/a.ts#A:class',
              to: 'src/missing.ts#Missing:class',
            },
          ],
          remove: [],
        },
      })
    ).toThrow('unknown endpoint');

    expect(() =>
      build({
        nodes: {
          upsert: [graph.nodes[0], graph.nodes[0]],
          remove: [],
        },
      })
    ).toThrow('Duplicate canonical node upsert');

    expect(() =>
      GraphDeltaBuilder.fromCanonicalChanges({
        baseGraph: graph,
        baseRevisionId: 'rev-1',
        filePath,
        contentDigest: 'content:provider-delta',
        extractor: completeRelationshipExtractor(),
        sourceContext: { kind: 'semantic-provider-delta' } as ReturnType<
          typeof providerSourceContext
        >,
        nodes: { upsert: [], remove: [] },
        edges: { upsert: [], remove: [] },
      })
    ).toThrow('sourceContext.baseProviderSnapshotId');
  });

  it('rejects syntax overlay files outside the canonical workspace root', () => {
    const graph = baseGraph(path.join(tempDir, 'src/a.ts'));
    const outside = path.resolve(tempDir, '../outside.ts');

    expect(() =>
      GraphDeltaBuilder.fromExtract({
        baseGraph: graph,
        baseRevisionId: 'rev-1',
        filePath: outside,
        content: 'export class Outside {}',
        extract: overlayExtract(outside, [
          { name: 'Outside', type: 'class', line: 1, column: 1, endLine: 1, endColumn: 24 },
        ]),
      })
    ).toThrow('outside the canonical graph root');
  });

  it('accepts a provider-proven incoming edge remap even when occurrence metadata changes', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const initial = graphWithTopology(filePath);
    const graph: CanonicalProjectGraph = {
      ...initial,
      provenance: {
        ...initial.provenance,
        providerSnapshotId: 'provider-snapshot:base',
        providerIdentityDigest: 'provider-identity:base',
        providerCapabilityDigest: 'provider-capability:base',
      },
      edges: [
        {
          kind: 'type_ref',
          from: 'src/b.ts#B:class',
          to: 'src/a.ts#A:class',
          occurrenceCount: 1,
          providerOccurrences: [{ occurrenceId: 'fact:old' }],
        },
      ],
    };
    const renamed = {
      ...graph.nodes[0],
      id: 'src/a.ts#RenamedA:class',
      name: 'RenamedA',
      qualifiedName: 'RenamedA',
    };
    const delta = GraphDeltaBuilder.fromCanonicalChanges({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      contentDigest: 'content:provider-rename',
      extractor: completeRelationshipExtractor(),
      sourceContext: providerSourceContext(),
      identityRemap: [{ fromNodeId: 'src/a.ts#A:class', toNodeId: 'src/a.ts#RenamedA:class' }],
      nodes: { upsert: [renamed], remove: ['src/a.ts#A:class'] },
      edges: {
        upsert: [
          {
            kind: 'type_ref',
            from: 'src/b.ts#B:class',
            to: 'src/a.ts#RenamedA:class',
            occurrenceCount: 1,
            providerOccurrences: [{ occurrenceId: 'fact:new' }],
          },
        ],
        remove: [{ kind: 'type_ref', from: 'src/b.ts#B:class', to: 'src/a.ts#A:class' }],
      },
    });

    expect(applyGraphDelta(revision(graph), delta).graph.edges).toEqual([
      expect.objectContaining({
        kind: 'type_ref',
        from: 'src/b.ts#B:class',
        to: 'src/a.ts#RenamedA:class',
        providerOccurrences: [{ occurrenceId: 'fact:new' }],
      }),
    ]);
  });

  it('rejects a delta built against another revision or base fingerprint', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const graph = baseGraph(filePath);
    const extract = overlayExtract(filePath, []);
    const delta = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content: '',
      extract,
    });

    expect(() => applyGraphDelta(revision(graph, 'rev-2'), delta)).toThrow(
      'GraphDelta base revision mismatch'
    );
    expect(() => composeGraphDeltas(revision(graph, 'rev-2'), [delta])).toThrow(
      'GraphDelta base revision mismatch'
    );
    expect(() =>
      applyGraphDelta(revision({ ...graph, fingerprint: 'another-base' }), delta)
    ).toThrow('GraphDelta base fingerprint mismatch');
    expect(() => applyGraphDelta(revision(graph), { ...delta, deltaId: 'forged' })).toThrow(
      'GraphDelta identity mismatch'
    );
  });

  it('revalidates file scope even when a structural forgery has a valid content digest', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const graph = baseGraph(filePath);
    const extract = overlayExtract(filePath, [
      { name: 'A', type: 'class', line: 1, column: 1, endLine: 1, endColumn: 18 },
    ]);
    const delta = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content: 'export class A {}',
      extract,
    });
    const nodes = {
      upsert: [
        {
          id: 'src/b.ts#Injected:class@overlay',
          sourceId: 'src/b.ts#Injected:class@overlay',
          kind: 'class',
          name: 'Injected',
          qualifiedName: 'Injected',
          file: 'src/b.ts',
        },
      ],
      remove: delta.nodes.remove,
    };
    const digest = graphDeltaDigest({ ...delta, nodes });
    const forged = {
      ...delta,
      deltaId: `graph-delta:${digest}`,
      deltaDigest: digest,
      nodes,
    };

    expect(() => applyGraphDelta(revision(graph), forged)).toThrow('outside its file scope');
  });

  it('creates an explicit effective view with its own deterministic identity and fingerprint', () => {
    const filePath = path.join(tempDir, 'src/a.ts');
    const graph = baseGraph(filePath);
    const extract = overlayExtract(filePath, [
      { name: 'DirtyA', type: 'class', line: 1, column: 1, endLine: 2, endColumn: 2 },
    ]);
    const delta = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath,
      content: 'export class DirtyA {}\n',
      extract,
    });

    const first = new EffectiveCodeGraphView(revision(graph), [delta]);
    const second = new EffectiveCodeGraphView(revision(graph), [delta]);

    expect(first.viewKind).toBe('effective-code-graph-view');
    expect(first.effective.viewKind).toBe('effective-code-graph');
    expect(first.baseRevisionId).toBe('rev-1');
    expect(first.effectiveViewId).toBe(second.effectiveViewId);
    expect(first.effectiveGraph.fingerprint).toBe(second.effectiveGraph.fingerprint);
    expect(first.effectiveGraph.fingerprint).toMatch(/^effective:/);
    expect(first.effectiveGraph.fingerprint).not.toBe(graph.fingerprint);
  });

  it('composes multiple same-base deltas in normalized file order', () => {
    const aPath = path.join(tempDir, 'src/a.ts');
    const bPath = path.join(tempDir, 'src/b.ts');
    const graph = graphWithTopology(aPath);
    const aExtract = overlayExtract(aPath, [
      { name: 'RenamedA', type: 'class', line: 1, column: 1, endLine: 2, endColumn: 2 },
    ]);
    const bExtract = overlayExtract(bPath, [
      { name: 'RenamedB', type: 'class', line: 1, column: 1, endLine: 2, endColumn: 2 },
    ]);
    const aDelta = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath: aPath,
      content: 'export class RenamedA {}\n',
      extract: aExtract,
    });
    const bDelta = GraphDeltaBuilder.fromExtract({
      baseGraph: graph,
      baseRevisionId: 'rev-1',
      filePath: bPath,
      content: 'export class RenamedB {}\n',
      extract: bExtract,
    });

    const forward = composeGraphDeltas(revision(graph), [aDelta, bDelta]);
    const reversed = composeGraphDeltas(revision(graph), [bDelta, aDelta]);

    expect(reversed.deltaIds).toEqual([aDelta.deltaId, bDelta.deltaId]);
    expect(reversed.effectiveViewId).toBe(forward.effectiveViewId);
    expect(reversed.graph).toEqual(forward.graph);
    expect(reversed.graph.nodes.map((node) => node.name)).toEqual(['RenamedA', 'RenamedB']);
  });
});

function baseGraph(filePath: string): CanonicalProjectGraph {
  const relative = 'src/a.ts';
  return {
    contractVersion: '1.0',
    rootDir: path.dirname(path.dirname(filePath)),
    tsconfigPath: path.join(path.dirname(path.dirname(filePath)), 'tsconfig.ttsc.json'),
    fingerprint: 'base',
    provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
    nodes: [
      {
        id: 'src/a.ts#A:class',
        sourceId: 'src/a.ts#A:class',
        kind: 'class',
        name: 'A',
        file: relative,
        evidence: { file: relative, startLine: 1, endLine: 1, startCol: 1, endCol: 20 },
      },
    ],
    edges: [],
  };
}

function graphWithTopology(filePath: string): CanonicalProjectGraph {
  const graph = baseGraph(filePath);
  return {
    ...graph,
    nodes: [
      {
        ...graph.nodes[0],
        evidence: { file: 'src/a.ts', startLine: 1, endLine: 6, startCol: 1, endCol: 2 },
      },
      {
        id: 'src/a.ts#A.run:method',
        sourceId: 'src/a.ts#A.run:method',
        kind: 'method',
        name: 'run',
        qualifiedName: 'A.run',
        file: 'src/a.ts',
        evidence: { file: 'src/a.ts', startLine: 2, endLine: 3, startCol: 3, endCol: 4 },
      },
      {
        id: 'src/b.ts#B:class',
        sourceId: 'src/b.ts#B:class',
        kind: 'class',
        name: 'B',
        qualifiedName: 'B',
        file: 'src/b.ts',
        evidence: { file: 'src/b.ts', startLine: 1, endLine: 2 },
      },
    ],
    edges: [{ kind: 'calls', from: 'src/a.ts#A.run:method', to: 'src/b.ts#B:class' }],
  };
}

function namespacedGraph(filePath: string): CanonicalProjectGraph {
  const graph = baseGraph(filePath);
  return {
    ...graph,
    nodes: [
      {
        id: 'src/a.ts#N.A:class',
        sourceId: 'src/a.ts#N.A:class',
        kind: 'class',
        name: 'A',
        qualifiedName: 'N.A',
        file: 'src/a.ts',
        evidence: { file: 'src/a.ts', startLine: 1, endLine: 4, startCol: 1, endCol: 2 },
      },
      {
        id: 'src/a.ts#N.A.run:method',
        sourceId: 'src/a.ts#N.A.run:method',
        kind: 'method',
        name: 'run',
        qualifiedName: 'N.A.run',
        file: 'src/a.ts',
        evidence: { file: 'src/a.ts', startLine: 2, endLine: 3, startCol: 3, endCol: 4 },
      },
    ],
  };
}

function variableOnlyGraph(filePath: string): CanonicalProjectGraph {
  const graph = baseGraph(filePath);
  return {
    ...graph,
    nodes: [
      {
        id: 'src/a.ts#i:variable',
        sourceId: 'src/a.ts#i:variable',
        kind: 'variable',
        name: 'i',
        qualifiedName: 'i',
        file: 'src/a.ts',
        evidence: { file: 'src/a.ts', startLine: 1, endLine: 1 },
      },
    ],
  };
}

function overlayExtract(
  filePath: string,
  symbols: Array<{
    name: string;
    type: string;
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
  }>
): IncrementalExtractResult {
  return {
    filePath,
    symbols: symbols.map((symbol) => ({
      id: `${symbol.type}-${symbol.name}`,
      name: symbol.name,
      type: symbol.type,
      filePath: 'src/a.ts',
      line: symbol.line,
      column: symbol.column,
      endLine: symbol.endLine,
      endColumn: symbol.endColumn,
      isExported: true,
      isPublic: true,
      summary: null,
      declaredType: null,
    })),
    relationships: [],
    errors: [],
    timestamp: Date.now(),
  };
}

function revision(graph: CanonicalProjectGraph, revisionId = 'rev-1') {
  return { revisionId, graph } as const;
}

function fixtureContent(extract: IncrementalExtractResult): string {
  return JSON.stringify({
    symbols: extract.symbols,
    relationships: extract.relationships,
    errors: extract.errors,
  });
}

function completeRelationshipExtractor() {
  return {
    id: 'fixture-relationship-extractor',
    version: '1.0.0',
    relationshipCoverage: 'owned-outgoing-complete' as const,
  };
}

function providerSourceContext() {
  return {
    kind: 'semantic-provider-delta' as const,
    baseProviderSnapshotId: 'provider-snapshot:base',
    nextProviderSnapshotId: 'provider-snapshot:next',
    providerDeltaId: 'provider-delta:one',
    baseProviderIdentityDigest: 'provider-identity:base',
    baseCapabilityDigest: 'provider-capability:base',
    providerIdentityDigest: 'provider-identity:next',
    capabilityDigest: 'provider-capability:next',
  };
}

function graphDeltaDigest(delta: {
  readonly contractVersion: string;
  readonly baseRevisionId: string;
  readonly baseGraphFingerprint: string;
  readonly relativeFilePath: string;
  readonly contentDigest: string;
  readonly extractor: unknown;
  readonly sourceContext?: unknown;
  readonly identityRemap: unknown;
  readonly nodes: unknown;
  readonly edges: unknown;
  readonly diagnostics?: unknown;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify(
        canonicalizeFixture({
          contractVersion: delta.contractVersion,
          baseRevisionId: delta.baseRevisionId,
          baseGraphFingerprint: delta.baseGraphFingerprint,
          relativeFilePath: delta.relativeFilePath,
          contentDigest: delta.contentDigest,
          extractor: delta.extractor,
          ...(delta.sourceContext ? { sourceContext: delta.sourceContext } : {}),
          identityRemap: delta.identityRemap,
          nodes: delta.nodes,
          edges: delta.edges,
          diagnostics: delta.diagnostics ?? [],
        })
      )
    )
    .digest('hex');
}

function canonicalizeFixture(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeFixture);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalizeFixture(child)])
    );
  }
  return value;
}
