import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { extractManagedSpecGraph } from '../../spec-graph';

const document = [
  '---',
  'title: Checkout Flow',
  'type: project-spec',
  'status: active',
  'tags:',
  '  - checkout',
  '---',
  '',
  '# [[CheckoutFlow]]',
  '',
  '```tsdoc-spec',
  '{',
  '  "requirements": [',
  '    { "id": "REQ-CHECKOUT", "title": "Checkout completes", "tags": ["critical"] }',
  '  ],',
  '  "edges": [',
  '    { "kind": "contains", "from": "spec:CheckoutFlow", "to": "REQ-CHECKOUT" }',
  '  ],',
  '  "bindings": [',
  '    {',
  '      "id": "BIND-CHECKOUT",',
  '      "kind": "implementation",',
  '      "specNodeId": "REQ-CHECKOUT",',
  '      "target": {',
  '        "type": "code-node",',
  '        "workspaceId": "fixture-workspace",',
  '        "canonicalNodeId": "src/checkout.ts#checkout:function"',
  '      }',
  '    }',
  '  ]',
  '}',
  '```',
  '',
].join('\n');

describe('extractManagedSpecGraph', () => {
  it('compiles one explicit managed document into deterministic spec, edge, and binding projections', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'managed-spec-'));
    try {
      const directory = path.join(root, 'managed', 'specs', 'checkout');
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(path.join(root, 'managed', 'specs', 'index.md'), '# index\n');
      fs.writeFileSync(path.join(directory, 'checkout-flow.md'), document);
      const options = {
        workspaceRoot: root,
        workspaceId: 'fixture-workspace',
        authoredSpecDirs: ['managed/specs'],
      };
      const first = extractManagedSpecGraph(options);
      const second = extractManagedSpecGraph(options);

      expect(first.revisionId).toBe(second.revisionId);
      expect(first.nodes).toMatchObject([
        {
          id: 'REQ-CHECKOUT',
          kind: 'requirement',
          lifecycle: { mode: 'inherited', aggregateSpecId: 'spec:CheckoutFlow' },
        },
        {
          id: 'spec:CheckoutFlow',
          kind: 'spec',
          source: { file: 'managed/specs/checkout/checkout-flow.md' },
        },
      ]);
      expect(first.edges).toHaveLength(1);
      expect(first.bindings).toMatchObject([
        {
          id: 'BIND-CHECKOUT',
          source: { file: 'managed/specs/checkout/checkout-flow.md' },
          provenance: { source: 'managed-document' },
        },
      ]);

      fs.writeFileSync(
        path.join(directory, 'checkout-flow.md'),
        document.replace('Checkout completes', 'Checkout safely completes')
      );
      expect(extractManagedSpecGraph(options).revisionId).not.toBe(first.revisionId);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects a project spec whose binding refers to an unknown requirement', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'managed-spec-invalid-'));
    try {
      fs.mkdirSync(path.join(root, 'managed', 'specs'), { recursive: true });
      fs.writeFileSync(
        path.join(root, 'managed', 'specs', 'bad.md'),
        document.replace('"specNodeId": "REQ-CHECKOUT"', '"specNodeId": "REQ-MISSING"')
      );
      expect(() =>
        extractManagedSpecGraph({
          workspaceRoot: root,
          workspaceId: 'fixture-workspace',
          authoredSpecDirs: ['managed/specs'],
        })
      ).toThrow('unknown spec node');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
