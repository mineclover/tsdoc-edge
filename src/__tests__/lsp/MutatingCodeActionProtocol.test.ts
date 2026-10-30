import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createMessageConnection,
  type MessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-jsonrpc/node';
import type { CodeAction, Diagnostic } from 'vscode-languageserver/node';
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
} from '../../lsp';
import { ConventionCheckHistoryRepository } from '../../storage/ConventionCheckHistoryRepository';
import { GraphRepository } from '../../storage/GraphRepository';
import { fixtureGraph, fixturePackSource } from '../convention/fixtures';

const packContext = {
  file: 'managed/conventions/core.json',
  contentDigest: `sha256:${'0'.repeat(64)}`,
} as const;

interface ProtocolHarness {
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
  readonly findingId: string;
  readonly historyId: string;
  readonly codeRevisionId: string;
  writeFixPlans(plans: readonly unknown[]): void;
  startServer(): Promise<{
    readonly connection: MessageConnection;
    openAndGetDiagnostic(version?: number, text?: string): Promise<Diagnostic>;
    requestCodeActions(diagnostic: Diagnostic, uri?: string): Promise<readonly CodeAction[]>;
    stop(): Promise<void>;
  }>;
  cleanup(): void;
}

function diagnosticsFrom(
  connection: MessageConnection
): Promise<{ readonly diagnostics: readonly Diagnostic[] }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Timed out waiting for LSP diagnostics')),
      10_000
    );
    const disposable = connection.onNotification('textDocument/publishDiagnostics', (params) => {
      clearTimeout(timeout);
      disposable.dispose();
      resolve(params as { readonly diagnostics: readonly Diagnostic[] });
    });
  });
}

async function terminate(
  child: ChildProcessWithoutNullStreams,
  connection: MessageConnection
): Promise<void> {
  connection.dispose();
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (child.exitCode === null) child.kill('SIGKILL');
}

function createProtocolHarness(): ProtocolHarness {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-mutating-lsp-'));
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-mutating-lsp-outside-'));
  const primaryFile = 'managed/conventions/core.json';
  const primaryPath = path.join(root, primaryFile);
  const primaryUri = pathToFileURL(primaryPath).href;
  const primaryContent = '{\n  "target": "OldService"\n}\n';
  const secondaryFile = 'src/service.ts';
  const secondaryPath = path.join(root, secondaryFile);
  const secondaryUri = pathToFileURL(secondaryPath).href;
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

  const finding = check.conformance.findings.find(
    (entry) => entry.outcome !== 'satisfied' && entry.outcome !== 'disabled'
  )!;

  fs.writeFileSync(
    path.join(root, '.tsdoc.config.json'),
    JSON.stringify({
      specGovernance: {
        lspSavedHistory: {
          databasePath: '.tsdoc/convention-history.db',
          historyId: retained.historyId,
          fixPlansPath: '.tsdoc/convention-fix-plans.json',
        },
      },
    }),
    'utf8'
  );

  return {
    root,
    outsideRoot,
    primaryFile,
    primaryPath,
    primaryUri,
    primaryContent,
    secondaryFile,
    secondaryPath,
    secondaryUri,
    secondaryContent,
    check,
    findingId: finding.findingId,
    historyId: retained.historyId,
    codeRevisionId: activeRevision.metadata.revisionId,
    writeFixPlans(plans: readonly unknown[]) {
      const fixPlansPath = path.join(root, '.tsdoc', 'convention-fix-plans.json');
      fs.mkdirSync(path.dirname(fixPlansPath), { recursive: true });
      fs.writeFileSync(
        fixPlansPath,
        JSON.stringify({
          contractVersion: CONVENTION_FIX_PLAN_BUNDLE_CONTRACT_VERSION,
          plans,
        }),
        'utf8'
      );
    },
    async startServer() {
      const child = spawn(
        process.execPath,
        [path.join(process.cwd(), '.test-dist', 'lsp', 'server.js'), '--stdio'],
        { cwd: root, stdio: 'pipe' }
      );
      const connection = createMessageConnection(
        new StreamMessageReader(child.stdout),
        new StreamMessageWriter(child.stdin)
      );
      connection.listen();
      await connection.sendRequest('initialize', {
        processId: process.pid,
        rootUri: pathToFileURL(root).href,
        capabilities: {},
      });
      connection.sendNotification('initialized', {});

      return {
        connection,
        async openAndGetDiagnostic(version = 1, text = primaryContent) {
          const nextDiagnostics = diagnosticsFrom(connection);
          connection.sendNotification('textDocument/didOpen', {
            textDocument: {
              uri: primaryUri,
              languageId: 'json',
              version,
              text,
            },
          });
          const published = await nextDiagnostics;
          return published.diagnostics[0]!;
        },
        async requestCodeActions(diagnostic: Diagnostic, uri = primaryUri) {
          return (await connection.sendRequest('textDocument/codeAction', {
            textDocument: { uri },
            range: diagnostic.range,
            context: { diagnostics: [diagnostic] },
          })) as readonly CodeAction[];
        },
        async stop() {
          await terminate(child, connection);
        },
      };
    },
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outsideRoot, { recursive: true, force: true });
    },
  };
}

function expectReadOnlyActionsOnly(actions: readonly CodeAction[]): void {
  expect(actions.filter((action) => action.edit !== undefined)).toEqual([]);
  expect(actions.map((action) => action.command?.command)).toEqual(
    expect.arrayContaining([
      'tsdoc.explainSavedConventionFinding',
      'tsdoc.openSavedConventionSource',
    ])
  );
}

describe('mutating CodeAction LSP protocol acceptance matrix', () => {
  let harness: ProtocolHarness;

  beforeEach(() => {
    harness = createProtocolHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('1. same-file fix: returns read-only actions plus a deterministic WorkspaceEdit over stdio', async () => {
    harness.writeFixPlans([
      {
        contractVersion: CONVENTION_FIX_PLAN_CONTRACT_VERSION,
        planId: 'same-file-fix',
        title: 'Fix target binding in core.json',
        historyId: harness.historyId,
        checkId: harness.check.checkId,
        findingId: harness.findingId,
        codeRevisionId: harness.codeRevisionId,
        targets: [
          {
            file: harness.primaryFile,
            sourceContentDigest: computeSourceContentDigest(harness.primaryContent),
            expectedVersion: 1,
            edits: [
              {
                range: { start: { line: 1, character: 13 }, end: { line: 1, character: 23 } },
                newText: 'Service',
              },
            ],
          },
        ],
      },
    ]);

    const server = await harness.startServer();
    try {
      const diagnostic = await server.openAndGetDiagnostic(1);
      const actions = await server.requestCodeActions(diagnostic);

      expect(actions.map((action) => action.command?.command).filter(Boolean)).toEqual(
        expect.arrayContaining([
          'tsdoc.explainSavedConventionFinding',
          'tsdoc.openSavedConventionSource',
        ])
      );
      const mutating = actions.filter((action) => action.edit !== undefined);
      expect(mutating).toHaveLength(1);
      expect(mutating[0]).toMatchObject({
        title: 'Fix target binding in core.json',
        kind: 'quickfix',
        edit: {
          changes: {
            [harness.primaryUri]: [
              {
                range: { start: { line: 1, character: 13 }, end: { line: 1, character: 23 } },
                newText: 'Service',
              },
            ],
          },
        },
        data: {
          kind: 'saved-convention-mutating-fix',
          contractVersion: '1.0',
          planId: 'same-file-fix',
          historyId: harness.historyId,
          checkId: harness.check.checkId,
          findingId: harness.findingId,
          codeRevisionId: harness.codeRevisionId,
        },
      });
    } finally {
      await server.stop();
    }
  }, 15_000);

  it('2. multi-file atomic fix: emits one atomic WorkspaceEdit and withholds partial edits on closed-file drift', async () => {
    harness.writeFixPlans([
      {
        contractVersion: CONVENTION_FIX_PLAN_CONTRACT_VERSION,
        planId: 'multi-file-atomic-fix',
        title: 'Atomically align spec and service declaration',
        historyId: harness.historyId,
        checkId: harness.check.checkId,
        findingId: harness.findingId,
        codeRevisionId: harness.codeRevisionId,
        targets: [
          {
            file: harness.primaryFile,
            sourceContentDigest: computeSourceContentDigest(harness.primaryContent),
            expectedVersion: 1,
            edits: [
              {
                range: { start: { line: 1, character: 13 }, end: { line: 1, character: 23 } },
                newText: 'Service',
              },
            ],
          },
          {
            file: harness.secondaryFile,
            sourceContentDigest: computeSourceContentDigest(harness.secondaryContent),
            edits: [
              {
                range: { start: { line: 0, character: 13 }, end: { line: 0, character: 18 } },
                newText: 'Service',
              },
            ],
          },
        ],
      },
    ]);

    const server = await harness.startServer();
    try {
      const diagnostic = await server.openAndGetDiagnostic(1);
      const validActions = await server.requestCodeActions(diagnostic);
      const mutating = validActions.filter((action) => action.edit !== undefined);
      expect(mutating).toHaveLength(1);
      expect(Object.keys(mutating[0]!.edit!.changes ?? {})).toEqual([
        harness.primaryUri,
        harness.secondaryUri,
      ]);

      // Modify the closed secondary file on disk: must reject the entire multi-file transaction.
      fs.writeFileSync(harness.secondaryPath, 'export class Drifted {}\n', 'utf8');
      const driftedActions = await server.requestCodeActions(diagnostic);
      expectReadOnlyActionsOnly(driftedActions);
    } finally {
      await server.stop();
    }
  }, 15_000);

  it('3. version mismatch: withholds mutating action when open document version differs from plan', async () => {
    harness.writeFixPlans([
      {
        contractVersion: CONVENTION_FIX_PLAN_CONTRACT_VERSION,
        planId: 'version-guarded-fix',
        title: 'Version-guarded fix',
        historyId: harness.historyId,
        checkId: harness.check.checkId,
        findingId: harness.findingId,
        codeRevisionId: harness.codeRevisionId,
        targets: [
          {
            file: harness.primaryFile,
            sourceContentDigest: computeSourceContentDigest(harness.primaryContent),
            expectedVersion: 1,
            edits: [
              {
                range: { start: { line: 1, character: 13 }, end: { line: 1, character: 23 } },
                newText: 'Service',
              },
            ],
          },
        ],
      },
    ]);

    const server = await harness.startServer();
    try {
      // Open with identical content but LSP document version 2 (!== expectedVersion 1).
      const diagnostic = await server.openAndGetDiagnostic(2);
      const actions = await server.requestCodeActions(diagnostic);
      expectReadOnlyActionsOnly(actions);
    } finally {
      await server.stop();
    }
  }, 15_000);

  it('4. stale revision: withholds mutating action when plan pins a stale codeRevisionId', async () => {
    harness.writeFixPlans([
      {
        contractVersion: CONVENTION_FIX_PLAN_CONTRACT_VERSION,
        planId: 'stale-revision-fix',
        title: 'Stale revision fix',
        historyId: harness.historyId,
        checkId: harness.check.checkId,
        findingId: harness.findingId,
        codeRevisionId: 'stale-code-revision-000',
        targets: [
          {
            file: harness.primaryFile,
            sourceContentDigest: computeSourceContentDigest(harness.primaryContent),
            expectedVersion: 1,
            edits: [
              {
                range: { start: { line: 1, character: 13 }, end: { line: 1, character: 23 } },
                newText: 'Service',
              },
            ],
          },
        ],
      },
    ]);

    const server = await harness.startServer();
    try {
      const diagnostic = await server.openAndGetDiagnostic(1);
      const actions = await server.requestCodeActions(diagnostic);
      expectReadOnlyActionsOnly(actions);
    } finally {
      await server.stop();
    }
  }, 15_000);

  it('5. outside-workspace path: withholds mutating action when plan targets a path outside workspace', async () => {
    const outsidePath = path.join(harness.outsideRoot, 'outside.json');
    const outsideContent = '{"outside": true}\n';
    fs.writeFileSync(outsidePath, outsideContent, 'utf8');

    harness.writeFixPlans([
      {
        contractVersion: CONVENTION_FIX_PLAN_CONTRACT_VERSION,
        planId: 'outside-workspace-fix',
        title: 'Outside workspace fix',
        historyId: harness.historyId,
        checkId: harness.check.checkId,
        findingId: harness.findingId,
        codeRevisionId: harness.codeRevisionId,
        targets: [
          {
            file: harness.primaryFile,
            sourceContentDigest: computeSourceContentDigest(harness.primaryContent),
            expectedVersion: 1,
            edits: [
              {
                range: { start: { line: 1, character: 13 }, end: { line: 1, character: 23 } },
                newText: 'Service',
              },
            ],
          },
          {
            uri: pathToFileURL(outsidePath).href,
            sourceContentDigest: computeSourceContentDigest(outsideContent),
            edits: [
              {
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
                newText: '{',
              },
            ],
          },
        ],
      },
    ]);

    const server = await harness.startServer();
    try {
      const diagnostic = await server.openAndGetDiagnostic(1);
      const actions = await server.requestCodeActions(diagnostic);
      expectReadOnlyActionsOnly(actions);
    } finally {
      await server.stop();
    }
  }, 15_000);

  it('6. symlink escape: withholds mutating action when a workspace target escapes via symlink', async () => {
    const outsidePath = path.join(harness.outsideRoot, 'secret.ts');
    const outsideContent = 'export const secret = true;\n';
    fs.writeFileSync(outsidePath, outsideContent, 'utf8');
    fs.symlinkSync(outsidePath, path.join(harness.root, 'src', 'escaped.ts'));

    harness.writeFixPlans([
      {
        contractVersion: CONVENTION_FIX_PLAN_CONTRACT_VERSION,
        planId: 'symlink-escape-fix',
        title: 'Symlink escape fix',
        historyId: harness.historyId,
        checkId: harness.check.checkId,
        findingId: harness.findingId,
        codeRevisionId: harness.codeRevisionId,
        targets: [
          {
            file: harness.primaryFile,
            sourceContentDigest: computeSourceContentDigest(harness.primaryContent),
            expectedVersion: 1,
            edits: [
              {
                range: { start: { line: 1, character: 13 }, end: { line: 1, character: 23 } },
                newText: 'Service',
              },
            ],
          },
          {
            file: 'src/escaped.ts',
            sourceContentDigest: computeSourceContentDigest(outsideContent),
            edits: [
              {
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 6 } },
                newText: 'export',
              },
            ],
          },
        ],
      },
    ]);

    const server = await harness.startServer();
    try {
      const diagnostic = await server.openAndGetDiagnostic(1);
      const actions = await server.requestCodeActions(diagnostic);
      expectReadOnlyActionsOnly(actions);
    } finally {
      await server.stop();
    }
  }, 15_000);

  it('7. overlapping edit: withholds mutating action when edits conflict within a file', async () => {
    harness.writeFixPlans([
      {
        contractVersion: CONVENTION_FIX_PLAN_CONTRACT_VERSION,
        planId: 'overlapping-edit-fix',
        title: 'Overlapping edit fix',
        historyId: harness.historyId,
        checkId: harness.check.checkId,
        findingId: harness.findingId,
        codeRevisionId: harness.codeRevisionId,
        targets: [
          {
            file: harness.primaryFile,
            sourceContentDigest: computeSourceContentDigest(harness.primaryContent),
            expectedVersion: 1,
            edits: [
              {
                range: { start: { line: 1, character: 2 }, end: { line: 1, character: 16 } },
                newText: '"service": ',
              },
              {
                range: { start: { line: 1, character: 12 }, end: { line: 1, character: 24 } },
                newText: '"Service"',
              },
            ],
          },
        ],
      },
    ]);

    const server = await harness.startServer();
    try {
      const diagnostic = await server.openAndGetDiagnostic(1);
      const actions = await server.requestCodeActions(diagnostic);
      expectReadOnlyActionsOnly(actions);
    } finally {
      await server.stop();
    }
  }, 15_000);

  it('8. malformed plan: survives malformed fix plans and untrusted client diagnostic payloads fail-closed', async () => {
    harness.writeFixPlans([
      {
        contractVersion: CONVENTION_FIX_PLAN_CONTRACT_VERSION,
        planId: 'malformed-plan',
        title: 'Malformed plan',
        historyId: harness.historyId,
        checkId: harness.check.checkId,
        findingId: harness.findingId,
        codeRevisionId: harness.codeRevisionId,
        targets: [
          {
            file: harness.primaryFile,
            sourceContentDigest: 'not-a-sha256-digest',
            expectedVersion: 1,
            edits: [
              {
                range: { start: { line: 1, character: 20 }, end: { line: 1, character: 5 } },
                newText: 'invalid',
              },
            ],
          },
        ],
      },
    ]);

    const server = await harness.startServer();
    try {
      const diagnostic = await server.openAndGetDiagnostic(1);
      const forgedDiagnostic: Diagnostic = {
        ...diagnostic,
        data: {
          ...(diagnostic.data as Record<string, unknown>),
          injectedFixPlan: {
            targets: [{ file: '../outside.json', edits: [] }],
          },
        },
      };
      const actions = await server.requestCodeActions(forgedDiagnostic);
      expectReadOnlyActionsOnly(actions);
    } finally {
      await server.stop();
    }
  }, 15_000);
});
