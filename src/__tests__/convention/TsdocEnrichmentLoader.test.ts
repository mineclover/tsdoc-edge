import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadTsdocEnrichment, TsdocConventionEvaluator } from '../../convention';
import { type CanonicalProjectGraph, canonicalProjectGraphFingerprint } from '../../indexer';

function graph(root: string): CanonicalProjectGraph {
  const nodes = [
    {
      id: 'src/Service.ts#Service:class',
      sourceId: 'src/Service.ts#Service:class',
      kind: 'class',
      name: 'Service',
      file: 'src/Service.ts',
      exported: true,
    },
    {
      id: 'src/Service.ts#plain:function',
      sourceId: 'src/Service.ts#plain:function',
      kind: 'function',
      name: 'plain',
      file: 'src/Service.ts',
      exported: true,
    },
  ];
  return {
    contractVersion: '1.0',
    rootDir: root,
    tsconfigPath: path.join(root, 'tsconfig.json'),
    nodes,
    edges: [],
    provenance: { adapter: 'fixture', producer: 'fixture', workspaceId: 'fixture' },
    fingerprint: canonicalProjectGraphFingerprint(nodes, []),
  };
}

describe('loadTsdocEnrichment', () => {
  it('pins canonical node TSDoc to source bytes without mutating the graph', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-enrichment-'));
    try {
      fs.mkdirSync(path.join(root, 'src'));
      const source = `/** Service summary\n * @public\n * @remarks Durable service\n */\nexport class Service {}\n\nexport function plain() {}\n`;
      fs.writeFileSync(path.join(root, 'src', 'Service.ts'), source);
      const input = graph(root);
      const first = loadTsdocEnrichment({
        workspaceRoot: root,
        workspaceId: 'fixture',
        graph: input,
      });
      const second = loadTsdocEnrichment({
        workspaceRoot: root,
        workspaceId: 'fixture',
        graph: input,
      });

      expect(first.revisionId).toBe(second.revisionId);
      expect(first.items).toMatchObject([
        {
          symbolId: 'src/Service.ts#Service:class',
          source: {
            file: 'src/Service.ts',
            contentDigest: `sha256:${createHash('sha256').update(source).digest('hex')}`,
          },
          tags: [{ name: 'public' }, { name: 'remarks', text: 'Durable service' }],
        },
      ]);
      expect(first.items).toHaveLength(1);
      expect(input.nodes).toHaveLength(2);

      const report = new TsdocConventionEvaluator().evaluate(input, first, {
        contractVersion: '1.0',
        rules: [
          {
            id: 'public-class',
            path: 'src/**/*.ts',
            kinds: ['class'],
            exported: true,
            requiredTags: ['public'],
            severity: 'error',
          },
          {
            id: 'public-function',
            path: 'src/**/*.ts',
            kinds: ['function'],
            exported: true,
            requiredTags: ['public'],
          },
        ],
      });
      expect(report.findings).toMatchObject([
        {
          ruleId: 'public-function',
          nodeId: 'src/Service.ts#plain:function',
          missingTags: ['public'],
        },
      ]);

      fs.appendFileSync(path.join(root, 'src', 'Service.ts'), '\n// source change\n');
      const changed = loadTsdocEnrichment({
        workspaceRoot: root,
        workspaceId: 'fixture',
        graph: input,
      });
      expect(changed.revisionId).not.toBe(first.revisionId);
      expect(input.fingerprint).toBe(graph(root).fingerprint);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects invalid tag policy rather than silently weakening it', () => {
    const empty: CanonicalProjectGraph = {
      contractVersion: '1.0',
      rootDir: '/fixture',
      tsconfigPath: '/fixture/tsconfig.json',
      nodes: [],
      edges: [],
      provenance: { adapter: 'fixture', producer: 'fixture', workspaceId: 'fixture' },
      fingerprint: canonicalProjectGraphFingerprint([], []),
    };
    expect(() =>
      new TsdocConventionEvaluator().evaluate(
        empty,
        {
          contractVersion: '1.0',
          plane: 'enrichment',
          workspaceId: 'fixture',
          revisionId: 'enrichment-revision:fixture',
          contentFingerprint: 'fixture',
          items: [],
          provenance: {
            source: 'canonical-empty',
            producerId: 'fixture',
            producerVersion: '1',
            sourceFingerprint: 'fixture',
          },
        },
        {
          contractVersion: '1.0',
          rules: [{ id: 'bad', path: 'src/**/*.ts', requiredTags: ['@public'] }],
        }
      )
    ).toThrow('without @');
  });
});
