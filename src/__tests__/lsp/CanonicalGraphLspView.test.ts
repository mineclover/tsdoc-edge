import * as path from 'node:path';
import { type ProjectGraphInput, ProjectIndexer } from '../../indexer';
import { CanonicalGraphLspView } from '../../lsp/canonical-graph-view';

describe('CanonicalGraphLspView', () => {
  const rootDir = path.resolve('/workspace/project');

  it('resolves source locations and uses incoming edges for dependent counts', async () => {
    const view = new CanonicalGraphLspView(await graph());
    const symbol = view.symbolAtPosition(path.join(rootDir, 'src/a.ts'), 12);

    expect(symbol?.node.id).toBe('src/a.ts#A.run:method');
    expect(view.impactCounts('src/b.ts#B:class')).toEqual({
      dependents: 1,
      dependencies: 0,
    });
    expect(view.impact('src/b.ts#B:class', 3)).toEqual(['src/a.ts#A.run:method']);
  });

  it('searches and resolves canonical names to absolute LSP locations', async () => {
    const view = new CanonicalGraphLspView(await graph());

    expect(view.search('run').map((value) => value.filePath)).toEqual([
      path.join(rootDir, 'src/a.ts'),
    ]);
    expect(view.findByName('B')).toMatchObject({
      filePath: path.join(rootDir, 'src/b.ts'),
      line: 3,
    });
    expect(view.findByName('EvidenceOnly')).toMatchObject({
      filePath: path.join(rootDir, 'src/c.ts'),
      line: 1,
    });
    expect(view.findByName('Duplicate')).toBeNull();
    expect(view.findByName('Evid')).toBeNull();
  });

  it('uses declaration ranges and columns instead of the nearest prior start line', async () => {
    const view = new CanonicalGraphLspView(await graph());
    const filePath = path.join(rootDir, 'src/a.ts');

    expect(view.symbolAtPosition(filePath, 18, 0)?.node.id).toBe('src/a.ts#A:class');
    expect(view.symbolAtPosition(filePath, 21, 0)).toBeNull();
    expect(view.symbolAtPosition(filePath, 10, 0)?.node.id).toBe('src/a.ts#A:class');
    expect(view.symbolAtPosition(filePath, 10, 2)?.node.id).toBe('src/a.ts#A.run:method');
  });

  async function graph() {
    const input: ProjectGraphInput = {
      rootDir,
      tsconfigPath: path.join(rootDir, 'tsconfig.ttsc.json'),
      nodes: [
        {
          id: 'src/a.ts#A:class',
          kind: 'class',
          name: 'A',
          file: 'src/a.ts',
          evidence: {
            file: 'src/a.ts',
            startLine: 2,
            startCol: 1,
            endLine: 20,
            endCol: 2,
          },
        },
        {
          id: 'src/a.ts#A.run:method',
          kind: 'method',
          name: 'run',
          qualifiedName: 'A.run',
          file: 'src/a.ts',
          evidence: {
            file: 'src/a.ts',
            startLine: 10,
            startCol: 3,
            endLine: 14,
            endCol: 4,
          },
        },
        {
          id: 'src/b.ts#B:class',
          kind: 'class',
          name: 'B',
          file: 'src/b.ts',
          evidence: { file: 'src/b.ts', startLine: 3, endLine: 8 },
        },
        {
          id: 'src/c.ts#EvidenceOnly:class',
          kind: 'class',
          name: 'EvidenceOnly',
          evidence: { file: 'src/c.ts', startLine: 1, endLine: 2 },
        },
        {
          id: 'src/d.ts#Duplicate:class',
          kind: 'class',
          name: 'Duplicate',
          file: 'src/d.ts',
        },
        {
          id: 'src/e.ts#Duplicate:class',
          kind: 'class',
          name: 'Duplicate',
          file: 'src/e.ts',
        },
      ],
      edges: [
        {
          kind: 'calls',
          from: 'src/a.ts#A.run:method',
          to: 'src/b.ts#B:class',
        },
      ],
      provenance: { adapter: 'fixture', producer: '@ttsc/graph' },
    };
    return (
      await new ProjectIndexer({ id: 'fixture', load: async () => input }).index({
        rootDir,
        tsconfigPath: 'tsconfig.ttsc.json',
      })
    ).graph;
  }
});
