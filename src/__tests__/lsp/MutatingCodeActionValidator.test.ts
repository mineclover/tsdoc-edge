import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  type ConventionCheckResult,
  ConventionCheckService,
  compileConventionPackSource,
  evaluateConventionGate,
} from '../../convention';
import {
  CONVENTION_FIX_PLAN_BUNDLE_CONTRACT_VERSION,
  CONVENTION_FIX_PLAN_CONTRACT_VERSION,
  computeSourceContentDigest,
  conventionDiagnosticsForFile,
  loadConventionFixPlanBundleFile,
  type RetainedConventionFixPlan,
  resolveSavedConventionMutatingActions,
  type SavedConventionDiagnosticData,
  validateRetainedConventionFixPlan,
} from '../../lsp';
import { ConventionCheckHistoryRepository } from '../../storage/ConventionCheckHistoryRepository';
import { GraphRepository } from '../../storage/GraphRepository';
import { fixtureGraph, fixturePackSource } from '../convention/fixtures';

const packContext = {
  file: 'managed/conventions/core.json',
  contentDigest: `sha256:${'0'.repeat(64)}`,
} as const;

interface TestWorkspaceFixture {
  readonly root: string;
  readonly outsideRoot: string;
  readonly primaryFile: string;
  readonly primaryPath: string;
  readonly primaryUri: string;
  readonly primaryContent: string;
  readonly secondaryFile: string;
  readonly secondaryPath: string;
  readonly secondaryUri: string;
  readonly secondaryContent: string;
  readonly check: ConventionCheckResult;
  readonly historyId: string;
  readonly codeRevisionId: string;
  readonly diagnosticData: SavedConventionDiagnosticData;
  cleanup(): void;
}

function createWorkspaceFixture(): TestWorkspaceFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-mutating-validator-'));
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-mutating-outside-'));
  const primaryFile = 'managed/conventions/core.json';
  const primaryPath = path.join(root, primaryFile);
  const primaryContent = '{\n  "target": "OldService"\n}\n';
  const secondaryFile = 'src/service.ts';
  const secondaryPath = path.join(root, secondaryFile);
  const secondaryContent = 'export class Other {}\n';

  fs.mkdirSync(path.dirname(primaryPath), { recursive: true });
  fs.mkdirSync(path.dirname(secondaryPath), { recursive: true });
  fs.writeFileSync(primaryPath, primaryContent, 'utf8');
  fs.writeFileSync(secondaryPath, secondaryContent, 'utf8');

  const graphRepo = new GraphRepository(path.join(root, '.tsdoc', 'canonical-graph.db'));
  graphRepo.replaceActiveRevision(fixtureGraph({ includeTarget: false, rootDir: root }));
  const activeRevision = graphRepo.readActiveRevision()!;
  const pack = compileConventionPackSource(fixturePackSource(), packContext);
  const check = new ConventionCheckService().run({
    pack,
    codeRevision: activeRevision,
    workspaceRoot: root,
  });
  const historyRepo = new ConventionCheckHistoryRepository(
    path.join(root, '.tsdoc', 'convention-history.db')
  );
  const retained = historyRepo.append({
    check,
    inputs: check.retainedInputs,
    pack: check.retainedPack,
    evaluationConfig: check.retainedEvaluationConfig,
    gate: evaluateConventionGate(check, 'error'),
  });
  historyRepo.close();
  graphRepo.close();

  const diagnostics = conventionDiagnosticsForFile(check, root, primaryPath, retained.historyId);
  const diagnosticData = diagnostics[0]!.data as SavedConventionDiagnosticData;

  return {
    root,
    outsideRoot,
    primaryFile,
    primaryPath,
    primaryUri: pathToFileURL(primaryPath).href,
    primaryContent,
    secondaryFile,
    secondaryPath,
    secondaryUri: pathToFileURL(secondaryPath).href,
    secondaryContent,
    check,
    historyId: retained.historyId,
    codeRevisionId: activeRevision.metadata.revisionId,
    diagnosticData,
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outsideRoot, { recursive: true, force: true });
    },
  };
}

function createValidSameFilePlan(fixture: TestWorkspaceFixture): RetainedConventionFixPlan {
  return {
    contractVersion: CONVENTION_FIX_PLAN_CONTRACT_VERSION,
    planId: 'fix-core-target',
    title: 'Align convention target binding',
    historyId: fixture.historyId,
    checkId: fixture.check.checkId,
    findingId: fixture.diagnosticData.findingId,
    codeRevisionId: fixture.codeRevisionId,
    targets: [
      {
        file: fixture.primaryFile,
        sourceContentDigest: computeSourceContentDigest(fixture.primaryContent),
        expectedVersion: 1,
        edits: [
          {
            range: {
              start: { line: 1, character: 13 },
              end: { line: 1, character: 23 },
            },
            newText: 'Service',
          },
        ],
      },
    ],
  };
}

describe('mutating CodeAction contract validator', () => {
  let fixture: TestWorkspaceFixture;

  beforeEach(() => {
    fixture = createWorkspaceFixture();
  });

  afterEach(() => {
    fixture.cleanup();
  });

  it('accepts a same-file fix plan and orders edits deterministically with a stable actionId', () => {
    const plan: RetainedConventionFixPlan = {
      ...createValidSameFilePlan(fixture),
      targets: [
        {
          file: fixture.primaryFile,
          sourceContentDigest: computeSourceContentDigest(fixture.primaryContent),
          expectedVersion: 1,
          edits: [
            {
              range: { start: { line: 2, character: 1 }, end: { line: 2, character: 1 } },
              newText: '\n',
            },
            {
              range: { start: { line: 1, character: 13 }, end: { line: 1, character: 23 } },
              newText: 'Service',
            },
          ],
        },
      ],
    };

    const first = validateRetainedConventionFixPlan({
      workspaceRoot: fixture.root,
      requestUri: fixture.primaryUri,
      activeCodeRevisionId: fixture.codeRevisionId,
      savedCheck: fixture.check,
      savedHistoryId: fixture.historyId,
      diagnosticData: fixture.diagnosticData,
      rawPlan: plan,
      openDocuments: [{ uri: fixture.primaryUri, version: 1, text: fixture.primaryContent }],
    });
    const second = validateRetainedConventionFixPlan({
      workspaceRoot: fixture.root,
      requestUri: fixture.primaryUri,
      activeCodeRevisionId: fixture.codeRevisionId,
      savedCheck: fixture.check,
      savedHistoryId: fixture.historyId,
      diagnosticData: fixture.diagnosticData,
      rawPlan: {
        ...plan,
        targets: [
          {
            ...plan.targets[0]!,
            edits: [...plan.targets[0]!.edits].reverse(),
          },
        ],
      },
      openDocuments: [{ uri: fixture.primaryUri, version: 1, text: fixture.primaryContent }],
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(first.action.actionId).toBe(second.action.actionId);
    expect(first.action.edit.changes?.[fixture.primaryUri]).toEqual([
      {
        range: { start: { line: 1, character: 13 }, end: { line: 1, character: 23 } },
        newText: 'Service',
      },
      {
        range: { start: { line: 2, character: 1 }, end: { line: 2, character: 1 } },
        newText: '\n',
      },
    ]);
    expect(first.action.data).toEqual({
      kind: 'saved-convention-mutating-fix',
      contractVersion: '1.0',
      actionId: first.action.actionId,
      planId: 'fix-core-target',
      historyId: fixture.historyId,
      checkId: fixture.check.checkId,
      findingId: fixture.diagnosticData.findingId,
      codeRevisionId: fixture.codeRevisionId,
    });
  });

  it('validates multi-file edits atomically and refuses partial edits when any closed file drifts', () => {
    const plan: RetainedConventionFixPlan = {
      ...createValidSameFilePlan(fixture),
      planId: 'fix-multi-file',
      targets: [
        {
          file: fixture.secondaryFile,
          sourceContentDigest: computeSourceContentDigest(fixture.secondaryContent),
          edits: [
            {
              range: { start: { line: 0, character: 13 }, end: { line: 0, character: 18 } },
              newText: 'Service',
            },
          ],
        },
        {
          file: fixture.primaryFile,
          sourceContentDigest: computeSourceContentDigest(fixture.primaryContent),
          expectedVersion: 1,
          edits: [
            {
              range: { start: { line: 1, character: 13 }, end: { line: 1, character: 23 } },
              newText: 'Service',
            },
          ],
        },
      ],
    };

    const valid = validateRetainedConventionFixPlan({
      workspaceRoot: fixture.root,
      requestUri: fixture.primaryUri,
      activeCodeRevisionId: fixture.codeRevisionId,
      savedCheck: fixture.check,
      savedHistoryId: fixture.historyId,
      diagnosticData: fixture.diagnosticData,
      rawPlan: plan,
      openDocuments: [{ uri: fixture.primaryUri, version: 1, text: fixture.primaryContent }],
    });

    expect(valid.ok).toBe(true);
    if (!valid.ok) return;
    expect(Object.keys(valid.action.edit.changes ?? {})).toEqual([
      fixture.primaryUri,
      fixture.secondaryUri,
    ]);

    // Modify the closed secondary file on disk: must reject the entire atomic edit.
    fs.writeFileSync(fixture.secondaryPath, 'export class Tampered {}\n', 'utf8');
    const tampered = validateRetainedConventionFixPlan({
      workspaceRoot: fixture.root,
      requestUri: fixture.primaryUri,
      activeCodeRevisionId: fixture.codeRevisionId,
      savedCheck: fixture.check,
      savedHistoryId: fixture.historyId,
      diagnosticData: fixture.diagnosticData,
      rawPlan: plan,
      openDocuments: [{ uri: fixture.primaryUri, version: 1, text: fixture.primaryContent }],
    });

    expect(tampered).toEqual(
      expect.objectContaining({
        ok: false,
        reason: 'stale-digest',
      })
    );
  });

  it('rejects open-document version mismatches and missing expectedVersion guards', () => {
    const plan = createValidSameFilePlan(fixture);

    const mismatchedVersion = validateRetainedConventionFixPlan({
      workspaceRoot: fixture.root,
      requestUri: fixture.primaryUri,
      activeCodeRevisionId: fixture.codeRevisionId,
      savedCheck: fixture.check,
      savedHistoryId: fixture.historyId,
      diagnosticData: fixture.diagnosticData,
      rawPlan: plan,
      openDocuments: [{ uri: fixture.primaryUri, version: 2, text: fixture.primaryContent }],
    });
    expect(mismatchedVersion).toEqual(
      expect.objectContaining({ ok: false, reason: 'version-mismatch' })
    );

    const missingExpectedVersion = validateRetainedConventionFixPlan({
      workspaceRoot: fixture.root,
      requestUri: fixture.primaryUri,
      activeCodeRevisionId: fixture.codeRevisionId,
      savedCheck: fixture.check,
      savedHistoryId: fixture.historyId,
      diagnosticData: fixture.diagnosticData,
      rawPlan: {
        ...plan,
        targets: [
          {
            file: fixture.primaryFile,
            sourceContentDigest: plan.targets[0]!.sourceContentDigest,
            edits: plan.targets[0]!.edits,
          },
        ],
      },
      openDocuments: [{ uri: fixture.primaryUri, version: 1, text: fixture.primaryContent }],
    });
    expect(missingExpectedVersion).toEqual(
      expect.objectContaining({ ok: false, reason: 'version-mismatch' })
    );
  });

  it('rejects stale code revisions and stale fix-plan contract versions', () => {
    const plan = createValidSameFilePlan(fixture);

    const staleRevision = validateRetainedConventionFixPlan({
      workspaceRoot: fixture.root,
      requestUri: fixture.primaryUri,
      activeCodeRevisionId: fixture.codeRevisionId,
      savedCheck: fixture.check,
      savedHistoryId: fixture.historyId,
      diagnosticData: fixture.diagnosticData,
      rawPlan: { ...plan, codeRevisionId: 'stale-code-revision' },
      openDocuments: [{ uri: fixture.primaryUri, version: 1, text: fixture.primaryContent }],
    });
    expect(staleRevision).toEqual(expect.objectContaining({ ok: false, reason: 'stale-revision' }));

    const staleContract = validateRetainedConventionFixPlan({
      workspaceRoot: fixture.root,
      requestUri: fixture.primaryUri,
      activeCodeRevisionId: fixture.codeRevisionId,
      savedCheck: fixture.check,
      savedHistoryId: fixture.historyId,
      diagnosticData: fixture.diagnosticData,
      rawPlan: { ...plan, contractVersion: '0.9' },
      openDocuments: [{ uri: fixture.primaryUri, version: 1, text: fixture.primaryContent }],
    });
    expect(staleContract).toEqual(expect.objectContaining({ ok: false, reason: 'stale-revision' }));
  });

  it('rejects outside-workspace paths, symlink escapes, forged client diagnostic anchors, and unplanned files', () => {
    const plan = createValidSameFilePlan(fixture);
    const outsideFile = path.join(fixture.outsideRoot, 'secret.ts');
    const outsideContent = 'export const secret = 1;\n';
    fs.writeFileSync(outsideFile, outsideContent, 'utf8');

    const outsideTraversal = validateRetainedConventionFixPlan({
      workspaceRoot: fixture.root,
      requestUri: fixture.primaryUri,
      activeCodeRevisionId: fixture.codeRevisionId,
      savedCheck: fixture.check,
      savedHistoryId: fixture.historyId,
      diagnosticData: fixture.diagnosticData,
      rawPlan: {
        ...plan,
        targets: [
          plan.targets[0]!,
          {
            file: '../outside.ts',
            sourceContentDigest: computeSourceContentDigest(outsideContent),
            edits: [
              {
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 6 } },
                newText: 'const',
              },
            ],
          },
        ],
      },
      openDocuments: [{ uri: fixture.primaryUri, version: 1, text: fixture.primaryContent }],
    });
    expect(outsideTraversal).toEqual(
      expect.objectContaining({ ok: false, reason: 'outside-workspace' })
    );

    const symlinkPath = path.join(fixture.root, 'src', 'escaped.ts');
    fs.symlinkSync(outsideFile, symlinkPath);
    const symlinkEscape = validateRetainedConventionFixPlan({
      workspaceRoot: fixture.root,
      requestUri: fixture.primaryUri,
      activeCodeRevisionId: fixture.codeRevisionId,
      savedCheck: fixture.check,
      savedHistoryId: fixture.historyId,
      diagnosticData: fixture.diagnosticData,
      rawPlan: {
        ...plan,
        targets: [
          plan.targets[0]!,
          {
            file: 'src/escaped.ts',
            sourceContentDigest: computeSourceContentDigest(outsideContent),
            edits: [
              {
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 6 } },
                newText: 'const',
              },
            ],
          },
        ],
      },
      openDocuments: [{ uri: fixture.primaryUri, version: 1, text: fixture.primaryContent }],
    });
    expect(symlinkEscape).toEqual(expect.objectContaining({ ok: false, reason: 'symlink-escape' }));

    const forgedDiagnostic = validateRetainedConventionFixPlan({
      workspaceRoot: fixture.root,
      requestUri: fixture.secondaryUri,
      activeCodeRevisionId: fixture.codeRevisionId,
      savedCheck: fixture.check,
      savedHistoryId: fixture.historyId,
      diagnosticData: {
        ...fixture.diagnosticData,
        sourceFile: fixture.secondaryFile,
      },
      rawPlan: plan,
      openDocuments: [{ uri: fixture.primaryUri, version: 1, text: fixture.primaryContent }],
    });
    expect(forgedDiagnostic).toEqual(
      expect.objectContaining({ ok: false, reason: 'identity-mismatch' })
    );
  });

  it('rejects overlapping edits, duplicate edits, file identity collisions, and colliding plan IDs', () => {
    const basePlan = createValidSameFilePlan(fixture);

    const overlapping = validateRetainedConventionFixPlan({
      workspaceRoot: fixture.root,
      requestUri: fixture.primaryUri,
      activeCodeRevisionId: fixture.codeRevisionId,
      savedCheck: fixture.check,
      savedHistoryId: fixture.historyId,
      diagnosticData: fixture.diagnosticData,
      rawPlan: {
        ...basePlan,
        targets: [
          {
            ...basePlan.targets[0]!,
            edits: [
              {
                range: { start: { line: 1, character: 2 }, end: { line: 1, character: 15 } },
                newText: '"name": ',
              },
              {
                range: { start: { line: 1, character: 10 }, end: { line: 1, character: 23 } },
                newText: '"Service"',
              },
            ],
          },
        ],
      },
      openDocuments: [{ uri: fixture.primaryUri, version: 1, text: fixture.primaryContent }],
    });
    expect(overlapping).toEqual(expect.objectContaining({ ok: false, reason: 'conflict' }));

    const fileIdentityCollision = validateRetainedConventionFixPlan({
      workspaceRoot: fixture.root,
      requestUri: fixture.primaryUri,
      activeCodeRevisionId: fixture.codeRevisionId,
      savedCheck: fixture.check,
      savedHistoryId: fixture.historyId,
      diagnosticData: fixture.diagnosticData,
      rawPlan: {
        ...basePlan,
        targets: [
          basePlan.targets[0]!,
          {
            uri: fixture.primaryUri,
            sourceContentDigest: computeSourceContentDigest(fixture.primaryContent),
            expectedVersion: 1,
            edits: [
              {
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
                newText: '{',
              },
            ],
          },
        ],
      },
      openDocuments: [{ uri: fixture.primaryUri, version: 1, text: fixture.primaryContent }],
    });
    expect(fileIdentityCollision).toEqual(
      expect.objectContaining({ ok: false, reason: 'conflict' })
    );

    const resolvedDuplicatePlans = resolveSavedConventionMutatingActions({
      workspaceRoot: fixture.root,
      requestUri: fixture.primaryUri,
      activeCodeRevisionId: fixture.codeRevisionId,
      savedCheck: fixture.check,
      savedHistoryId: fixture.historyId,
      diagnosticData: fixture.diagnosticData,
      rawPlans: [basePlan, { ...basePlan, title: 'Conflicting duplicate planId' }],
      openDocuments: [{ uri: fixture.primaryUri, version: 1, text: fixture.primaryContent }],
    });
    expect(resolvedDuplicatePlans.actions).toEqual([]);
    expect(resolvedDuplicatePlans.rejections).toHaveLength(2);
    expect(resolvedDuplicatePlans.rejections.every((item) => item.reason === 'conflict')).toBe(
      true
    );
  });

  it('rejects malformed plans and malformed bundle files fail-closed', () => {
    const basePlan = createValidSameFilePlan(fixture);

    const invertedRange = validateRetainedConventionFixPlan({
      workspaceRoot: fixture.root,
      requestUri: fixture.primaryUri,
      activeCodeRevisionId: fixture.codeRevisionId,
      savedCheck: fixture.check,
      savedHistoryId: fixture.historyId,
      diagnosticData: fixture.diagnosticData,
      rawPlan: {
        ...basePlan,
        targets: [
          {
            ...basePlan.targets[0]!,
            edits: [
              {
                range: { start: { line: 1, character: 20 }, end: { line: 1, character: 10 } },
                newText: 'bad',
              },
            ],
          },
        ],
      },
      openDocuments: [{ uri: fixture.primaryUri, version: 1, text: fixture.primaryContent }],
    });
    expect(invertedRange).toEqual(expect.objectContaining({ ok: false, reason: 'malformed-plan' }));

    const malformedUri = validateRetainedConventionFixPlan({
      workspaceRoot: fixture.root,
      requestUri: fixture.primaryUri,
      activeCodeRevisionId: fixture.codeRevisionId,
      savedCheck: fixture.check,
      savedHistoryId: fixture.historyId,
      diagnosticData: fixture.diagnosticData,
      rawPlan: {
        ...basePlan,
        targets: [
          {
            uri: '://malformed-uri',
            sourceContentDigest: computeSourceContentDigest(fixture.primaryContent),
            expectedVersion: 1,
            edits: basePlan.targets[0]!.edits,
          },
        ],
      },
      openDocuments: [{ uri: fixture.primaryUri, version: 1, text: fixture.primaryContent }],
    });
    expect(malformedUri).toEqual(expect.objectContaining({ ok: false, reason: 'malformed-plan' }));

    const bundlePath = path.join(fixture.root, '.tsdoc', 'fix-plans.json');
    fs.writeFileSync(
      bundlePath,
      JSON.stringify({
        contractVersion: CONVENTION_FIX_PLAN_BUNDLE_CONTRACT_VERSION,
        plans: [basePlan],
      }),
      'utf8'
    );
    const loadedBundle = loadConventionFixPlanBundleFile(fixture.root, '.tsdoc/fix-plans.json');
    expect(loadedBundle).toEqual({ ok: true, rawPlans: [basePlan] });

    const outsideBundle = loadConventionFixPlanBundleFile(fixture.root, '../escape.json');
    expect(outsideBundle).toEqual(
      expect.objectContaining({ ok: false, reason: 'outside-workspace' })
    );
  });
});
