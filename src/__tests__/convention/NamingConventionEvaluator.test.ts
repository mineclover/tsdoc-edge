import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { NamingConventionEvaluator } from '../../convention';
import { type CanonicalProjectGraph, canonicalProjectGraphFingerprint } from '../../indexer';
import type { NamingConventionConfig } from '../../types/config';

function graph(): CanonicalProjectGraph {
  const nodes = [
    {
      id: 'src/domain/UserService.ts#UserService:class',
      sourceId: 'src/domain/UserService.ts#UserService:class',
      kind: 'class',
      name: 'UserService',
      file: 'src/domain/UserService.ts',
      exported: true,
    },
    {
      id: 'src/domain/user_utils.ts#formatUser:function',
      sourceId: 'src/domain/user_utils.ts#formatUser:function',
      kind: 'function',
      name: 'formatUser',
      file: 'src/domain/user_utils.ts',
      exported: true,
    },
    {
      id: 'managed/specs/orders/order-processing.md#OrderProcessing:spec',
      sourceId: 'managed/specs/orders/order-processing.md#OrderProcessing:spec',
      kind: 'spec',
      name: 'OrderProcessing',
      file: 'managed/specs/orders/order-processing.md',
    },
  ];
  return {
    contractVersion: '1.0',
    rootDir: '/fixture',
    tsconfigPath: '/fixture/tsconfig.json',
    nodes,
    edges: [],
    provenance: { adapter: 'fixture', producer: 'fixture', workspaceId: 'fixture' },
    fingerprint: canonicalProjectGraphFingerprint(nodes, []),
  };
}

const config: NamingConventionConfig = {
  contractVersion: '1.0',
  rules: [
    { id: 'spec-kebab', path: 'managed/specs/**/*.md', target: 'file', style: 'kebab' },
    {
      id: 'types-pascal',
      path: 'SRC/**/*.ts',
      pathCase: 'insensitive',
      target: 'symbol',
      kinds: ['class'],
      exported: true,
      style: 'pascal',
    },
    {
      id: 'values-camel',
      path: 'src/**/*.ts',
      target: 'symbol',
      kinds: ['function'],
      exported: true,
      style: 'camel',
    },
    { id: 'source-file-snake', path: 'src/domain/*_utils.ts', target: 'file', style: 'snake' },
  ],
};

describe('NamingConventionEvaluator', () => {
  it('selects the first matching location rule with explicit path casing', () => {
    const report = new NamingConventionEvaluator().evaluate(graph(), config);

    expect(report.evaluatedSubjectCount).toBe(4);
    expect(report.findings).toEqual([]);
    expect(report.reportId).toMatch(/^naming-report:/);
  });

  it('returns deterministic findings for a location/style mismatch', () => {
    const violating: NamingConventionConfig = {
      ...config,
      rules: [{ id: 'spec-snake', path: 'managed/specs/**/*.md', target: 'file', style: 'snake' }],
    };
    const first = new NamingConventionEvaluator().evaluate(graph(), violating);
    const second = new NamingConventionEvaluator().evaluate(graph(), violating);

    expect(first.findings).toMatchObject([
      {
        ruleId: 'spec-snake',
        target: 'file',
        file: 'managed/specs/orders/order-processing.md',
        subject: 'order-processing',
        expected: 'snake',
      },
    ]);
    expect(second.reportId).toBe(first.reportId);
    expect(second.findings[0]?.findingId).toBe(first.findings[0]?.findingId);
  });

  it('rejects ambiguous rule identity and escaping locations', () => {
    expect(() =>
      new NamingConventionEvaluator().evaluate(graph(), {
        contractVersion: '1.0',
        rules: [
          { id: 'duplicate', path: 'src/**/*.ts', target: 'file', style: 'kebab' },
          { id: 'duplicate', path: '../src/**/*.ts', target: 'file', style: 'kebab' },
        ],
      })
    ).toThrow('Duplicate or empty naming rule id');
  });

  it('scans configured workspace document paths in addition to graph node files', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-naming-'));
    try {
      fs.mkdirSync(path.join(root, 'managed', 'specs', 'orders'), { recursive: true });
      fs.writeFileSync(
        path.join(root, 'managed', 'specs', 'orders', 'OrderProcessing.md'),
        '# spec\n'
      );
      const report = new NamingConventionEvaluator().evaluate(
        { ...graph(), nodes: [], fingerprint: canonicalProjectGraphFingerprint([], []) },
        { contractVersion: '1.0', rules: [config.rules[0]!] },
        { workspaceRoot: root }
      );

      expect(report.findings).toMatchObject([
        { ruleId: 'spec-kebab', file: 'managed/specs/orders/OrderProcessing.md' },
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
