/**
 * TSDoc Edge LSP Server
 *
 * Provides Language Server Protocol integration for TSDoc Edge features,
 * enabling real-time code analysis in IDEs like VS Code, Vim, and Emacs.
 *
 * @packageDocumentation
 * @module lsp/server
 * @doc [[LSP Integration]]
 *
 * @responsibility Provide LSP integration for TSDoc Edge features
 *
 * @problem IDE users can't access TSDoc Edge insights in real-time
 * @solves Real-time impact analysis, hover info, and diagnostics via LSP
 * @context Integrates with VS Code, Vim, Emacs, and other LSP clients
 *
 * ## Supported LSP Features
 *
 * | Protocol | Description |
 * |----------|-------------|
 * | textDocument/hover | Symbol info + impact analysis |
 * | textDocument/codeLens | Inline impact counts (↓downstream ↑upstream) |
 * | textDocument/codeAction | Impact analysis, related symbols navigation |
 * | textDocument/documentLink | [[Symbol]] reference links |
 * | textDocument/definition | Go to symbol definition |
 * | workspace/symbol | Search symbols across workspace |
 * | textDocument/publishDiagnostics | Circular dependencies, layer violations |
 *
 * ## Usage
 *
 * ```bash
 * # Start the LSP server (stdio mode)
 * node dist/lsp/server.js
 * ```
 *
 * @see TsdocEdgeService - Data access layer
 * @see managed/features/lsp-integration.md - Full documentation
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  CodeLens,
  CodeLensParams,
  Hover,
  HoverParams,
  Diagnostic,
  DiagnosticSeverity,
  DidChangeConfigurationNotification,
  WorkspaceSymbol,
  WorkspaceSymbolParams,
  CodeAction,
  CodeActionKind,
  CodeActionParams,
  Command,
  DocumentLink,
  DocumentLinkParams,
  Definition,
  DefinitionParams,
  Location,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as path from 'node:path';
import { TsdocEdgeService } from './service';

/**
 * LSP connection using stdio transport
 * @internal
 */
const connection = createConnection(ProposedFeatures.all);

/**
 * Text document manager for tracking open documents
 * @internal
 */
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

/**
 * TSDoc Edge service instance for database queries
 * @internal
 */
let tsdocService: TsdocEdgeService | null = null;

/**
 * Client capability flags
 * @internal
 */
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams): InitializeResult => {
  const capabilities = params.capabilities;

  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );

  // Initialize TSDoc Edge service
  const workspaceRoot = params.workspaceFolders?.[0]?.uri
    ? new URL(params.workspaceFolders[0].uri).pathname
    : process.cwd();

  try {
    tsdocService = new TsdocEdgeService(workspaceRoot);
    connection.console.log(`TSDoc Edge LSP initialized at: ${workspaceRoot}`);
  } catch (error) {
    connection.console.error(`Failed to initialize TSDoc Edge: ${error}`);
  }

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      hoverProvider: true,
      codeLensProvider: {
        resolveProvider: true,
      },
      workspaceSymbolProvider: true,
      codeActionProvider: {
        codeActionKinds: [CodeActionKind.QuickFix, CodeActionKind.RefactorExtract],
      },
      documentLinkProvider: {
        resolveProvider: true,
      },
      definitionProvider: true,
    },
  };
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }

  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

// Hover provider - show symbol info and impact analysis
connection.onHover((params: HoverParams): Hover | null => {
  if (!tsdocService) return null;

  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const filePath = new URL(params.textDocument.uri).pathname;
  const position = params.position;

  try {
    const hoverInfo = tsdocService.getHoverInfo(filePath, position.line + 1, position.character);

    if (!hoverInfo) return null;

    return {
      contents: {
        kind: 'markdown',
        value: hoverInfo,
      },
    };
  } catch (error) {
    connection.console.error(`Hover error: ${error}`);
    return null;
  }
});

// Code Lens provider - show impact counts
connection.onCodeLens((params: CodeLensParams): CodeLens[] => {
  if (!tsdocService) return [];

  const filePath = new URL(params.textDocument.uri).pathname;

  try {
    const codeLenses = tsdocService.getCodeLenses(filePath);

    return codeLenses.map((lens) => ({
      range: {
        start: { line: lens.line - 1, character: 0 },
        end: { line: lens.line - 1, character: 0 },
      },
      command: {
        title: lens.title,
        command: 'tsdoc.showImpact',
        arguments: [lens.symbolId],
      },
    }));
  } catch (error) {
    connection.console.error(`CodeLens error: ${error}`);
    return [];
  }
});

connection.onCodeLensResolve((codeLens: CodeLens): CodeLens => {
  // Additional resolution if needed
  return codeLens;
});

// Workspace symbol provider
connection.onWorkspaceSymbol((params: WorkspaceSymbolParams): WorkspaceSymbol[] => {
  if (!tsdocService) return [];

  try {
    const symbols = tsdocService.searchSymbols(params.query);

    return symbols.map((sym) => ({
      name: sym.name,
      kind: sym.kind,
      location: {
        uri: `file://${sym.filePath}`,
        range: {
          start: { line: sym.line - 1, character: 0 },
          end: { line: sym.line - 1, character: 0 },
        },
      },
    }));
  } catch (error) {
    connection.console.error(`Workspace symbol error: ${error}`);
    return [];
  }
});

// Code Action provider - impact analysis and refactoring suggestions
connection.onCodeAction((params: CodeActionParams): CodeAction[] => {
  if (!tsdocService) return [];

  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const filePath = new URL(params.textDocument.uri).pathname;
  const actions: CodeAction[] = [];

  try {
    // Get symbol at current position
    const line = params.range.start.line + 1;
    const symbolInfo = tsdocService.getSymbolAtPosition(filePath, line);

    if (symbolInfo) {
      // Add "Show Impact Analysis" action
      actions.push({
        title: `📊 Show Impact Analysis for ${symbolInfo.name}`,
        kind: CodeActionKind.RefactorExtract,
        command: {
          title: 'Show Impact',
          command: 'tsdoc.showImpactAnalysis',
          arguments: [symbolInfo.id, 'downstream'],
        },
      });

      actions.push({
        title: `🔍 Show Dependencies of ${symbolInfo.name}`,
        kind: CodeActionKind.RefactorExtract,
        command: {
          title: 'Show Dependencies',
          command: 'tsdoc.showImpactAnalysis',
          arguments: [symbolInfo.id, 'upstream'],
        },
      });

      // Get impact counts for risk assessment
      const impact = tsdocService.getImpactAnalysis(symbolInfo.id, 2);
      if (impact.downstream > 10) {
        actions.push({
          title: `⚠️ High Impact: ${impact.downstream} dependents - Consider careful testing`,
          kind: CodeActionKind.QuickFix,
          command: {
            title: 'Show Dependents',
            command: 'tsdoc.showImpactAnalysis',
            arguments: [symbolInfo.id, 'downstream'],
          },
        });
      }

      // Add related symbols navigation
      const relatedSymbols = tsdocService.getRelatedSymbols(symbolInfo.id, 3);
      if (relatedSymbols.length > 0) {
        actions.push({
          title: `🔗 Navigate to Related Symbols (${relatedSymbols.length})`,
          kind: CodeActionKind.RefactorExtract,
          command: {
            title: 'Show Related',
            command: 'tsdoc.showRelatedSymbols',
            arguments: [symbolInfo.id],
          },
        });
      }
    }

    // Add actions for diagnostics
    for (const diagnostic of params.context.diagnostics) {
      if (diagnostic.source === 'tsdoc-edge') {
        if (diagnostic.message.includes('Circular dependency')) {
          actions.push({
            title: '🔄 Show Circular Dependency Path',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            command: {
              title: 'Show Cycle',
              command: 'tsdoc.showCircularDependency',
              arguments: [filePath, line],
            },
          });
        }

        if (diagnostic.message.includes('Architecture violation')) {
          actions.push({
            title: '🏗️ Show Layer Violation Details',
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            command: {
              title: 'Show Violation',
              command: 'tsdoc.showLayerViolation',
              arguments: [filePath, line],
            },
          });
        }
      }
    }

    return actions;
  } catch (error) {
    connection.console.error(`CodeAction error: ${error}`);
    return [];
  }
});

// Document Link provider - [[Symbol]] references
connection.onDocumentLinks((params: DocumentLinkParams): DocumentLink[] => {
  if (!tsdocService) return [];

  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const links: DocumentLink[] = [];
  const text = document.getText();

  try {
    // Find [[Symbol]] patterns
    const symbolRefPattern = /\[\[([^\]]+)\]\]/g;
    let match;

    while ((match = symbolRefPattern.exec(text)) !== null) {
      const symbolName = match[1];
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);

      // Look up symbol location
      const symbolLocation = tsdocService.findSymbolByName(symbolName);

      if (symbolLocation) {
        links.push({
          range: {
            start: startPos,
            end: endPos,
          },
          target: `file://${symbolLocation.filePath}#L${symbolLocation.line}`,
          tooltip: `Go to ${symbolName} (${symbolLocation.type})`,
          data: { symbolId: symbolLocation.id },
        });
      } else {
        // Symbol not found - could link to search
        links.push({
          range: {
            start: startPos,
            end: endPos,
          },
          tooltip: `Symbol "${symbolName}" not found in database`,
          data: { symbolName, notFound: true },
        });
      }
    }

    // Find @see references in TSDoc comments
    const seeRefPattern = /@see\s+(\w+)/g;
    while ((match = seeRefPattern.exec(text)) !== null) {
      const symbolName = match[1];
      const startPos = document.positionAt(match.index + 5); // Skip "@see "
      const endPos = document.positionAt(match.index + match[0].length);

      const symbolLocation = tsdocService.findSymbolByName(symbolName);
      if (symbolLocation) {
        links.push({
          range: {
            start: startPos,
            end: endPos,
          },
          target: `file://${symbolLocation.filePath}#L${symbolLocation.line}`,
          tooltip: `Go to ${symbolName}`,
        });
      }
    }

    return links;
  } catch (error) {
    connection.console.error(`DocumentLinks error: ${error}`);
    return [];
  }
});

connection.onDocumentLinkResolve((link: DocumentLink): DocumentLink => {
  // Additional resolution if needed
  return link;
});

// Definition provider - go to symbol definition with relationship context
connection.onDefinition((params: DefinitionParams): Definition | null => {
  if (!tsdocService) return null;

  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const filePath = new URL(params.textDocument.uri).pathname;

  try {
    // Get word at position
    const line = document.getText({
      start: { line: params.position.line, character: 0 },
      end: { line: params.position.line, character: Number.MAX_SAFE_INTEGER },
    });

    const wordMatch = getWordAtPosition(line, params.position.character);
    if (!wordMatch) return null;

    // Search for symbol
    const symbolLocation = tsdocService.findSymbolByName(wordMatch);
    if (!symbolLocation) return null;

    return {
      uri: `file://${symbolLocation.filePath}`,
      range: {
        start: { line: symbolLocation.line - 1, character: 0 },
        end: { line: symbolLocation.line - 1, character: 0 },
      },
    };
  } catch (error) {
    connection.console.error(`Definition error: ${error}`);
    return null;
  }
});

/**
 * Extract word at position from line
 */
function getWordAtPosition(line: string, character: number): string | null {
  const wordPattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
  let match;

  while ((match = wordPattern.exec(line)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    if (character >= start && character <= end) {
      return match[0];
    }
  }

  return null;
}

// Document change handlers - trigger diagnostics
documents.onDidChangeContent((change) => {
  if (!tsdocService) return;

  const filePath = new URL(change.document.uri).pathname;

  try {
    const diagnostics = tsdocService.getDiagnostics(filePath);

    connection.sendDiagnostics({
      uri: change.document.uri,
      diagnostics: diagnostics.map((d) => ({
        severity: d.severity,
        range: {
          start: { line: d.line - 1, character: 0 },
          end: { line: d.line - 1, character: Number.MAX_SAFE_INTEGER },
        },
        message: d.message,
        source: 'tsdoc-edge',
      })),
    });
  } catch (error) {
    connection.console.error(`Diagnostics error: ${error}`);
  }
});

// Shutdown handler - cleanup resources
connection.onShutdown(() => {
  connection.console.log('LSP server shutting down, cleaning up resources...');
  if (tsdocService) {
    tsdocService.close();
    tsdocService = null;
  }
});

// Exit handler - final cleanup
connection.onExit(() => {
  if (tsdocService) {
    tsdocService.close();
    tsdocService = null;
  }
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();
