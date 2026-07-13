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
  ConventionCheckService,
  compileConventionPackSource,
  evaluateConventionGate,
} from '../../convention';
import { ConventionCheckHistoryRepository } from '../../storage/ConventionCheckHistoryRepository';
import { GraphRepository } from '../../storage/GraphRepository';
import { fixtureGraph, fixturePackSource } from '../convention/fixtures';

const context = {
  file: 'managed/conventions/core.json',
  contentDigest: `sha256:${'0'.repeat(64)}`,
} as const;

function diagnosticsFrom(
  connection: MessageConnection
): Promise<{ readonly diagnostics: readonly Diagnostic[] }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Timed out waiting for LSP diagnostics')),
      10_000
    );
    connection.onNotification('textDocument/publishDiagnostics', (params) => {
      clearTimeout(timeout);
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

describe('saved convention LSP protocol', () => {
  it('projects a managed-document finding and its immutable actions over stdio', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-lsp-protocol-'));
    const graphPath = path.join(root, '.tsdoc', 'canonical-graph.db');
    const historyPath = path.join(root, '.tsdoc', 'convention-history.db');
    const documentPath = path.join(root, 'managed', 'conventions', 'core.json');
    const documentUri = pathToFileURL(documentPath).href;
    const repository = new GraphRepository(graphPath);
    let child: ChildProcessWithoutNullStreams | undefined;
    let connection: MessageConnection | undefined;
    try {
      fs.mkdirSync(path.dirname(documentPath), { recursive: true });
      fs.writeFileSync(documentPath, '{}\n');
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

      child = spawn(
        process.execPath,
        [path.join(process.cwd(), '.test-dist', 'lsp', 'server.js'), '--stdio'],
        { cwd: root, stdio: 'pipe' }
      );
      connection = createMessageConnection(
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
      const diagnosticsPromise = diagnosticsFrom(connection);
      connection.sendNotification('textDocument/didOpen', {
        textDocument: { uri: documentUri, languageId: 'json', version: 1, text: '{}\n' },
      });
      const published = await diagnosticsPromise;
      const diagnostic = published.diagnostics[0]!;
      expect(diagnostic.data).toEqual(
        expect.objectContaining({
          kind: 'saved-convention-finding',
          historyId: retained.historyId,
          checkId: check.checkId,
        })
      );
      const actions = (await connection.sendRequest('textDocument/codeAction', {
        textDocument: { uri: documentUri },
        range: diagnostic.range,
        context: { diagnostics: [diagnostic] },
      })) as readonly CodeAction[];
      expect(actions.map((action) => action.command?.command)).toEqual(
        expect.arrayContaining([
          'tsdoc.explainSavedConventionFinding',
          'tsdoc.openSavedConventionSource',
        ])
      );
    } finally {
      if (child && connection) await terminate(child, connection);
      repository.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 15_000);
});
