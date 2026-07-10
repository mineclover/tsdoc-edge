import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { CanonicalProjectGraph } from '../../indexer/contracts';
import { isProvisionalOverlayId } from '../../indexer/canonical-id';
import { GraphDeltaBuilder, OverlayGraphView } from '../../lsp/overlay';
import type { IncrementalExtractResult } from '../../lsp/incremental-builder';

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
      extract,
    });
    const view = new OverlayGraphView(graph, delta);

    expect(delta.nodes.remove).toEqual(['src/a.ts#A:class']);
    expect(delta.nodes.upsert.map((node) => node.id)).toEqual([
      'src/a.ts#DirtyBuffer:class@overlay',
      'src/a.ts#method:method@overlay',
    ]);
    expect(isProvisionalOverlayId(delta.nodes.upsert[0].id)).toBe(true);
    expect(view.view.symbolAtPosition(filePath, 1, 0)?.node.name).toBe('DirtyBuffer');
    expect(view.view.search('Dirty', 10)).toHaveLength(1);
    expect(view.view.symbolsInFile(filePath)).toHaveLength(2);
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
