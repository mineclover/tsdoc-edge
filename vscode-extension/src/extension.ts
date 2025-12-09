/**
 * TSDoc Edge VS Code Extension
 *
 * @description LSP client for TSDoc Edge integration
 */

import * as path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  // Get configuration
  const config = vscode.workspace.getConfiguration('tsdocEdge');
  const enabled = config.get<boolean>('enable', true);

  if (!enabled) {
    return;
  }

  // Server module path
  const serverModule = context.asAbsolutePath(
    path.join('..', 'dist', 'lsp', 'server.js')
  );

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
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx}'),
    },
  };

  // Create the language client
  client = new LanguageClient(
    'tsdocEdge',
    'TSDoc Edge',
    serverOptions,
    clientOptions
  );

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

  const workContextCommand = vscode.commands.registerCommand(
    'tsdoc-edge.workContext',
    async () => {
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
    }
  );

  const refreshCommand = vscode.commands.registerCommand(
    'tsdoc-edge.refreshAnalysis',
    async () => {
      vscode.window.showInformationMessage('Refreshing TSDoc Edge analysis...');

      // Run tsdoc-edge build command
      const terminal = vscode.window.createTerminal('TSDoc Edge');
      terminal.sendText('npx tsdoc-edge build src');
      terminal.show();
    }
  );

  context.subscriptions.push(showImpactCommand);
  context.subscriptions.push(workContextCommand);
  context.subscriptions.push(refreshCommand);

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
