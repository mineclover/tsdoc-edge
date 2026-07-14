import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ConventionCheckService, compileConventionPackSource } from '../../convention';
import { evaluateConventionGate } from '../../convention/ConventionGate';
import {
  evaluateTtscGraphLint,
  evaluateTtscGraphLintFile,
  type TtscGraphLintModule,
} from '../../convention/TtscGraphLintAdapter';
import { GraphRepository } from '../../storage/GraphRepository';
import { fixtureGraph, fixturePackSource } from './fixtures';

const context = {
  file: 'managed/conventions/core.json',
  contentDigest: `sha256:${'0'.repeat(64)}`,
} as const;

describe('TtscGraphLintAdapter', () => {
  it('projects upstream graph-lint violations into a deterministic report', () => {
    const graph = fixtureGraph();
    const rules = [{ id: 'service-must-reach-handler' }];
    const module: TtscGraphLintModule = {
      buildGraphLintRules(dump, options) {
        expect(dump).toMatchObject({
          project: 'fixture/provider',
          tsconfig: '/fixture/tsconfig.json',
          nodes: graph.nodes,
          edges: graph.edges,
        });
        expect(options.rules).toBe(rules);
        return {
          ok: false,
          summary: {
            rules: 1,
            passed: 0,
            failed: 1,
            errors: 1,
            warnings: 0,
            seeds: 1,
            violations: 1,
          },
          rules: [
            {
              id: 'service-must-reach-handler',
              severity: 'error',
              ok: false,
              seeds: 1,
              passed: 0,
              failed: 1,
              requireWithin: { depth: 1, direction: 'forward', match: { ids: ['handler'] } },
              traversal: { edgeKinds: ['calls'] },
              violations: [
                {
                  ruleId: 'service-must-reach-handler',
                  severity: 'error',
                  message: 'Service did not reach a handler within one hop.',
                  seed: { id: 'src/service.ts#Service:class' },
                  required: { ids: ['handler'] },
                  depth: 1,
                  direction: 'forward',
                  reached: 0,
                },
              ],
            },
          ],
        };
      },
    };

    const report = evaluateTtscGraphLint(graph, rules, module);

    expect(report.summary).toMatchObject({ rules: 1, errors: 1, violations: 1 });
    expect(report.findings).toMatchObject([
      {
        ruleId: 'service-must-reach-handler',
        severity: 'error',
        outcome: 'violated',
        seed: { id: 'src/service.ts#Service:class' },
      },
    ]);
    expect(report.reportId).toMatch(/^graph-lint-report:/);
  });

  it('feeds graph-lint findings into the convention gate', () => {
    const repository = new GraphRepository(':memory:');
    try {
      repository.replaceActiveRevision(fixtureGraph());
      const codeRevision = repository.readActiveRevision()!;
      const graphLint = evaluateTtscGraphLint(
        codeRevision.graph,
        [{ id: 'service-must-reach-handler' }],
        {
          buildGraphLintRules() {
            return {
              ok: false,
              summary: {
                rules: 1,
                passed: 0,
                failed: 1,
                errors: 1,
                warnings: 0,
                seeds: 1,
                violations: 1,
              },
              rules: [
                {
                  id: 'service-must-reach-handler',
                  severity: 'error',
                  ok: false,
                  seeds: 1,
                  passed: 0,
                  failed: 1,
                  requireWithin: { depth: 1, direction: 'forward', match: { ids: ['handler'] } },
                  traversal: {},
                  violations: [
                    {
                      ruleId: 'service-must-reach-handler',
                      severity: 'error',
                      message: 'Service did not reach a handler within one hop.',
                      required: { ids: ['handler'] },
                      depth: 1,
                      direction: 'forward',
                      reached: 0,
                    },
                  ],
                },
              ],
            };
          },
        }
      );
      const result = new ConventionCheckService().run({
        pack: compileConventionPackSource(fixturePackSource(), context),
        codeRevision,
        workspaceRoot: '/fixture',
        graphLint,
      });

      const gate = evaluateConventionGate(result, 'error');
      expect(result.graphLint.reportId).toBe(graphLint.reportId);
      expect(gate.failed).toBe(true);
      expect(gate.blockingFindingIds).toContain(graphLint.findings[0]?.findingId);
    } finally {
      repository.close();
    }
  });

  it('resolves rules through a symlinked workspace path before enforcing containment', async () => {
    const realRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-graph-lint-real-'));
    const aliasRoot = path.join(os.tmpdir(), `tsdoc-edge-graph-lint-alias-${process.pid}`);
    const rulesPath = path.join(realRoot, 'rules.json');
    fs.writeFileSync(rulesPath, JSON.stringify({ rules: [] }), 'utf8');
    fs.symlinkSync(realRoot, aliasRoot, 'dir');
    try {
      await expect(
        evaluateTtscGraphLintFile({
          workspaceRoot: aliasRoot,
          graph: fixtureGraph(),
          filePath: path.join(aliasRoot, 'rules.json'),
          moduleLoader: async () => ({
            buildGraphLintRules() {
              return {
                ok: true,
                summary: {
                  rules: 0,
                  passed: 0,
                  failed: 0,
                  errors: 0,
                  warnings: 0,
                  seeds: 0,
                  violations: 0,
                },
                rules: [],
              };
            },
          }),
        })
      ).resolves.toMatchObject({ summary: { rules: 0, violations: 0 } });
    } finally {
      fs.unlinkSync(aliasRoot);
      fs.rmSync(realRoot, { recursive: true, force: true });
    }
  });
});
