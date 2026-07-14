import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  ConventionCheckService,
  compileConventionPackSource,
  evaluateConventionGate,
  evaluateTtscGraphLint,
} from '../../convention';
import { conventionDiagnosticsForFile } from '../../lsp/convention-diagnostics';
import { TsdocEdgeService } from '../../lsp/service';
import { ConventionCheckHistoryRepository } from '../../storage/ConventionCheckHistoryRepository';
import { GraphRepository } from '../../storage/GraphRepository';
import { fixtureGraph, fixturePackSource } from '../convention/fixtures';

const context = {
  file: 'managed/conventions/core.json',
  contentDigest: `sha256:${'0'.repeat(64)}`,
} as const;

describe('saved convention LSP diagnostics', () => {
  it('projects a graph-lint seed into the same file-scoped diagnostic plane', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-lsp-graph-lint-'));
    const repository = new GraphRepository(path.join(root, '.tsdoc', 'canonical-graph.db'));
    try {
      const graph = fixtureGraph({ rootDir: root });
      repository.replaceActiveRevision(graph);
      const pack = compileConventionPackSource(fixturePackSource(), context);
      const graphLint = evaluateTtscGraphLint(graph, [{ id: 'seed-route', severity: 'error' }], {
        buildGraphLintRules: () => ({
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
              id: 'seed-route',
              severity: 'error',
              ok: false,
              seeds: 1,
              passed: 0,
              failed: 1,
              requireWithin: { depth: 1, direction: 'forward', match: { kind: 'function' } },
              traversal: { edgeKinds: ['calls'] },
              violations: [
                {
                  ruleId: 'seed-route',
                  severity: 'error',
                  message: 'Seed did not reach the required route.',
                  seed: { file: 'src/seed.ts', startLine: 7, startCol: 3 },
                  required: { kind: 'function' },
                  depth: 1,
                  direction: 'forward',
                  reached: 0,
                },
              ],
            },
          ],
        }),
      });
      const check = new ConventionCheckService().run({
        pack,
        codeRevision: repository.readActiveRevision()!,
        workspaceRoot: root,
        graphLint,
      });

      expect(conventionDiagnosticsForFile(check, root, path.join(root, 'src/seed.ts'))).toEqual([
        expect.objectContaining({
          line: 7,
          startCol: 3,
          code: 'convention/seed-route',
          message: 'Graph-lint convention: Seed did not reach the required route.',
          severity: 1,
        }),
      ]);
    } finally {
      repository.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('projects only the finding pinned to the active canonical revision', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-lsp-convention-'));
    const graphPath = path.join(root, '.tsdoc', 'canonical-graph.db');
    const historyPath = path.join(root, '.tsdoc', 'convention-history.db');
    const documentPath = path.join(root, 'managed', 'conventions', 'core.json');
    fs.mkdirSync(path.dirname(documentPath), { recursive: true });
    fs.writeFileSync(documentPath, '{}\n');
    const repository = new GraphRepository(graphPath);
    let service: TsdocEdgeService | undefined;
    try {
      repository.replaceActiveRevision(fixtureGraph({ includeTarget: false, rootDir: root }));
      const pack = compileConventionPackSource(fixturePackSource(), context);
      const check = new ConventionCheckService().run({
        pack,
        codeRevision: repository.readActiveRevision()!,
        workspaceRoot: root,
      });
      const history = new ConventionCheckHistoryRepository(historyPath);
      const retained = history.append({
        check,
        inputs: check.retainedInputs,
        pack: check.retainedPack,
        evaluationConfig: check.retainedEvaluationConfig,
        gate: evaluateConventionGate(check, 'error'),
      });
      history.close();
      fs.writeFileSync(
        path.join(root, '.tsdoc.config.json'),
        JSON.stringify({
          specGovernance: {
            lspSavedHistory: {
              databasePath: '.tsdoc/convention-history.db',
              historyId: retained.historyId,
            },
          },
        })
      );
      service = new TsdocEdgeService(root);

      expect(service.getDiagnostics(documentPath)).toEqual([
        expect.objectContaining({
          code: 'convention/binding.implementation',
          severity: 1,
          message: expect.stringContaining('BIND-SERVICE'),
          data: expect.objectContaining({
            kind: 'saved-convention-finding',
            historyId: retained.historyId,
            checkId: check.checkId,
            sourceFile: 'managed/conventions/core.json',
          }),
        }),
      ]);

      repository.replaceActiveRevision(fixtureGraph({ rootDir: root }));
      await service.refreshCanonicalGraph();
      expect(service.getDiagnostics(documentPath)).toEqual([]);
    } finally {
      service?.close();
      repository.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
