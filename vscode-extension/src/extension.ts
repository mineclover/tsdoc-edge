/**
 * TSDoc Edge VS Code Extension
 *
 * @description LSP client for TSDoc Edge integration
 */

import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

interface SavedConventionFindingPayload {
  readonly kind: 'saved-convention-finding';
  readonly historyId?: string;
  readonly checkId: string;
  readonly findingId: string;
  readonly sourceFile: string;
  readonly sourceLine: number;
}

export function activate(context: vscode.ExtensionContext) {
  // Get configuration
  const config = vscode.workspace.getConfiguration('tsdocEdge');
  const enabled = config.get<boolean>('enable', true);

  if (!enabled) {
    return;
  }

  // Server module path
  const serverModule = context.asAbsolutePath(path.join('..', 'dist', 'lsp', 'server.js'));

  // If the extension is being run in debug mode, use the debug server options
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  // Server options
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.stdio },
    debug: {
      module: serverModule,
      transport: TransportKind.stdio,
      options: debugOptions,
    },
  };

  // Client options
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'typescript' },
      { scheme: 'file', language: 'typescriptreact' },
      { scheme: 'file', language: 'javascript' },
      { scheme: 'file', language: 'javascriptreact' },
      // Saved convention findings can be anchored in managed spec/pack documents.
      { scheme: 'file', language: 'json' },
      { scheme: 'file', language: 'jsonc' },
      { scheme: 'file', language: 'markdown' },
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx}'),
    },
  };

  // Create the language client
  client = new LanguageClient('tsdocEdge', 'TSDoc Edge', serverOptions, clientOptions);

  // Register commands
  const showImpactCommand = vscode.commands.registerCommand(
    'tsdoc-edge.showImpact',
    async (symbolId?: string) => {
      if (!symbolId) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage('No active editor');
          return;
        }
        // Get symbol at cursor position
        const position = editor.selection.active;
        const wordRange = editor.document.getWordRangeAtPosition(position);
        if (wordRange) {
          symbolId = editor.document.getText(wordRange);
        }
      }

      if (symbolId) {
        // Show impact analysis in a webview or output channel
        const outputChannel = vscode.window.createOutputChannel('TSDoc Edge Impact');
        outputChannel.appendLine(`Impact Analysis for: ${symbolId}`);
        outputChannel.appendLine('='.repeat(50));
        outputChannel.appendLine('Loading...');
        outputChannel.show();

        // TODO: Request impact analysis from LSP server
      }
    }
  );

  const workContextCommand = vscode.commands.registerCommand('tsdoc-edge.workContext', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const filePath = editor.document.uri.fsPath;

    // Run tsdoc-edge work-context command
    const terminal = vscode.window.createTerminal('TSDoc Edge');
    terminal.sendText(`npx tsdoc-edge work-context "${filePath}"`);
    terminal.show();
  });

  const refreshCommand = vscode.commands.registerCommand('tsdoc-edge.refreshAnalysis', async () => {
    vscode.window.showInformationMessage('Refreshing TSDoc Edge analysis...');

    // Run tsdoc-edge build command
    const terminal = vscode.window.createTerminal('TSDoc Edge');
    terminal.sendText('npx tsdoc-edge build src');
    terminal.show();
  });

  const savedConventionOutput = vscode.window.createOutputChannel('TSDoc Edge Convention Finding');
  const explainSavedConventionFindingCommand = vscode.commands.registerCommand(
    'tsdoc.explainSavedConventionFinding',
    (value: unknown) => {
      const finding = savedConventionFindingPayload(value);
      if (!finding) {
        vscode.window.showErrorMessage('TSDoc Edge received an invalid saved convention finding.');
        return;
      }
      savedConventionOutput.clear();
      savedConventionOutput.appendLine('Saved convention finding');
      savedConventionOutput.appendLine('='.repeat(50));
      savedConventionOutput.appendLine(`History: ${finding.historyId ?? '<unretained>'}`);
      savedConventionOutput.appendLine(`Check: ${finding.checkId}`);
      savedConventionOutput.appendLine(`Finding: ${finding.findingId}`);
      savedConventionOutput.appendLine(`Source: ${finding.sourceFile}:${finding.sourceLine}`);
      savedConventionOutput.appendLine('');
      savedConventionOutput.appendLine(
        'This view is read-only and is pinned to the identity provided by the language server.'
      );
      savedConventionOutput.show(true);
    }
  );

  const openSavedConventionSourceCommand = vscode.commands.registerCommand(
    'tsdoc.openSavedConventionSource',
    async (value: unknown) => {
      const finding = savedConventionFindingPayload(value);
      if (!finding) {
        vscode.window.showErrorMessage('TSDoc Edge received an invalid saved convention finding.');
        return;
      }
      const uri = await workspaceSourceUri(finding.sourceFile);
      if (!uri) {
        vscode.window.showErrorMessage(
          `Saved convention source is not available in this workspace: ${finding.sourceFile}`
        );
        return;
      }
      const document = await vscode.workspace.openTextDocument(uri);
      const position = new vscode.Position(
        Math.min(finding.sourceLine - 1, document.lineCount - 1),
        0
      );
      const editor = await vscode.window.showTextDocument(document, { preview: true });
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(
        new vscode.Range(position, position),
        vscode.TextEditorRevealType.InCenter
      );
    }
  );

  context.subscriptions.push(showImpactCommand);
  context.subscriptions.push(workContextCommand);
  context.subscriptions.push(refreshCommand);
  context.subscriptions.push(savedConventionOutput);
  context.subscriptions.push(explainSavedConventionFindingCommand);
  context.subscriptions.push(openSavedConventionSourceCommand);

  // Start the client
  client.start();

  vscode.window.showInformationMessage('TSDoc Edge extension activated');
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

function savedConventionFindingPayload(value: unknown): SavedConventionFindingPayload | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const payload = value as Record<string, unknown>;
  const { historyId, checkId, findingId, sourceFile, sourceLine } = payload;
  if (
    payload.kind !== 'saved-convention-finding' ||
    !nonEmptyText(checkId) ||
    !nonEmptyText(findingId) ||
    !nonEmptyText(sourceFile) ||
    typeof sourceLine !== 'number' ||
    !Number.isSafeInteger(sourceLine) ||
    sourceLine < 1
  ) {
    return undefined;
  }
  if (historyId !== undefined && !nonEmptyText(historyId)) return undefined;
  return {
    kind: 'saved-convention-finding',
    ...(typeof historyId === 'string' ? { historyId } : {}),
    checkId,
    findingId,
    sourceFile,
    sourceLine,
  };
}

async function workspaceSourceUri(sourceFile: string): Promise<vscode.Uri | undefined> {
  if (path.isAbsolute(sourceFile)) return undefined;
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const candidate = path.resolve(folder.uri.fsPath, sourceFile);
    const relative = path.relative(folder.uri.fsPath, candidate);
    if (relative.startsWith('..') || path.isAbsolute(relative)) continue;
    const uri = vscode.Uri.file(candidate);
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if ((stat.type & vscode.FileType.File) === vscode.FileType.File) return uri;
    } catch {
      // A multi-root workspace may contain the same relative path in a later folder.
    }
  }
  return undefined;
}

function nonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
