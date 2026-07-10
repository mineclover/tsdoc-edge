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

import * as path from 'node:path';
import {
  CodeActionKind,
  createConnection,
  DidChangeConfigurationNotification,
  DidChangeWatchedFilesNotification,
  FileChangeType,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  type CodeAction,
  type CodeActionParams,
  type CodeLens,
  type CodeLensParams,
  type Definition,
  type DefinitionParams,
  type DocumentLink,
  type DocumentLinkParams,
  type Hover,
  type HoverParams,
  type InitializeParams,
  type InitializeResult,
  type WorkspaceSymbol,
  type WorkspaceSymbolParams,
  WatchKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TsdocEdgeService } from './service';
import {
  filePathFromUri,
  fileUriFromPath,
  isTypeScriptSourcePath,
  resolveWorkspaceRoot,
} from './uri';

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
let hasWatchedFilesDynamicRegistration = false;

connection.onInitialize((params: InitializeParams): InitializeResult => {
  const capabilities = params.capabilities;

  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasWatchedFilesDynamicRegistration = !!(
    capabilities.workspace?.didChangeWatchedFiles?.dynamicRegistration
  );

  // Initialize TSDoc Edge service
  const workspaceRoot = resolveWorkspaceRoot(
    params.workspaceFolders?.map((folder) => folder.uri),
    params.rootUri,
    process.cwd()
  );

  try {
    tsdocService = new TsdocEdgeService(workspaceRoot);
    connection.console.log(`TSDoc Edge LSP initialized at: ${workspaceRoot}`);
  } catch (error) {
    connection.console.error(`Failed to initialize TSDoc Edge: ${error}`);
  }

  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        change: TextDocumentSyncKind.Incremental,
        save: true,
      },
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

  if (hasWatchedFilesDynamicRegistration) {
    void connection.client
      .register(DidChangeWatchedFilesNotification.type, {
        watchers: [
          {
            globPattern: '**/*.{ts,tsx,mts,cts}',
            kind: WatchKind.Create | WatchKind.Change | WatchKind.Delete,
          },
        ],
      })
      .catch((error) => {
        connection.console.error(`Failed to register TypeScript file watchers: ${error}`);
      });
  }

  // Enable incremental mode for real-time updates
  if (tsdocService) {
    const enabled = tsdocService.enableIncrementalMode();
    if (enabled) {
      connection.console.log(
        tsdocService.isCanonicalGraphEnabled()
          ? 'Canonical saved-file refresh enabled; unsaved buffers remain in-memory overlays'
          : 'Legacy incremental mode enabled - file changes will update symbols in real-time'
      );
    } else {
      connection.console.log('Incremental mode not available - run "tsdoc-edge build" first');
    }
  }
});

// Hover provider - show symbol info and impact analysis
connection.onHover((params: HoverParams): Hover | null => {
  if (!tsdocService) return null;

  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const filePath = filePathFromUri(params.textDocument.uri);
  if (!filePath) return null;
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

  const filePath = filePathFromUri(params.textDocument.uri);
  if (!filePath) return [];

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
        uri: fileUriFromPath(sym.filePath),
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

  const filePath = filePathFromUri(params.textDocument.uri);
  if (!filePath) return [];
  const actions: CodeAction[] = [];

  try {
    // Get symbol at current position
    const line = params.range.start.line + 1;
    const symbolInfo = tsdocService.getSymbolAtPosition(
      filePath,
      line,
      params.range.start.character
    );

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
// Optimized with batch lookup to reduce DB queries
connection.onDocumentLinks((params: DocumentLinkParams): DocumentLink[] => {
  if (!tsdocService) return [];

  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const text = document.getText();

  try {
    // Collect all symbol names first, then batch lookup
    const symbolMatches: Array<{ name: string; index: number; length: number; type: 'ref' | 'see' }> = [];

    // Find [[Symbol]] patterns
    const symbolRefPattern = /\[\[([^\]]+)\]\]/g;
    for (const match of text.matchAll(symbolRefPattern)) {
      symbolMatches.push({
        name: match[1],
        index: match.index,
        length: match[0].length,
        type: 'ref',
      });
    }

    // Find @see references in TSDoc comments
    const seeRefPattern = /@see\s+(\w+)/g;
    for (const match of text.matchAll(seeRefPattern)) {
      symbolMatches.push({
        name: match[1],
        index: match.index + 5, // Skip "@see "
        length: match[0].length - 5,
        type: 'see',
      });
    }

    if (symbolMatches.length === 0) return [];

    // Batch lookup all symbol names at once
    const uniqueNames = [...new Set(symbolMatches.map(m => m.name))];
    const symbolLocations = tsdocService.findSymbolsByNames(uniqueNames);

    // Build links from matches
    const links: DocumentLink[] = [];

    for (const match of symbolMatches) {
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match.length);
      const symbolLocation = symbolLocations.get(match.name);

      if (symbolLocation) {
        links.push({
          range: { start: startPos, end: endPos },
          target: fileUriFromPath(symbolLocation.filePath, symbolLocation.line),
          tooltip: match.type === 'ref'
            ? `Go to ${match.name} (${symbolLocation.type})`
            : `Go to ${match.name}`,
          data: { symbolId: symbolLocation.id },
        });
      } else if (match.type === 'ref') {
        // Only show "not found" for [[Symbol]] refs, not @see
        links.push({
          range: { start: startPos, end: endPos },
          tooltip: `Symbol "${match.name}" not found in database`,
          data: { symbolName: match.name, notFound: true },
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
      uri: fileUriFromPath(symbolLocation.filePath),
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
 * @param line - Line text
 * @param character - Character position
 * @returns Word at position or null
 */
function getWordAtPosition(line: string, character: number): string | null {
  const wordPattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
  for (const match of line.matchAll(wordPattern)) {
    const start = match.index;
    const end = start + match[0].length;

    if (character >= start && character < end) {
      return match[0];
    }
  }

  return null;
}

// Per-document debounce timers prevent one editor from cancelling another.
const incrementalBuildTimers = new Map<string, ReturnType<typeof setTimeout>>();
const INCREMENTAL_BUILD_DELAY = 1000; // 1 second debounce

function clearIncrementalBuildTimer(uri: string): void {
  const timer = incrementalBuildTimers.get(uri);
  if (timer) clearTimeout(timer);
  incrementalBuildTimers.delete(uri);
}

function clearAllIncrementalBuildTimers(): void {
  for (const timer of incrementalBuildTimers.values()) clearTimeout(timer);
  incrementalBuildTimers.clear();
}

function publishDiagnosticsForDocument(document: TextDocument): void {
  if (!tsdocService) return;
  const filePath = filePathFromUri(document.uri);
  if (!filePath) return;

  const diagnostics = tsdocService.getDiagnostics(filePath);
  connection.sendDiagnostics({
    uri: document.uri,
    diagnostics: diagnostics.map((diagnostic) => ({
      severity: diagnostic.severity,
      range: {
        start: { line: diagnostic.line - 1, character: 0 },
        end: { line: diagnostic.line - 1, character: Number.MAX_SAFE_INTEGER },
      },
      message: diagnostic.message,
      source: 'tsdoc-edge',
    })),
  });
}

function publishDiagnosticsForOpenDocuments(): void {
  for (const document of documents.all()) publishDiagnosticsForDocument(document);
}

// Document change handlers - trigger diagnostics and incremental builds
documents.onDidChangeContent((change) => {
  if (!tsdocService) return;

  const filePath = filePathFromUri(change.document.uri);
  if (!filePath || !isTypeScriptSourcePath(filePath)) return;

  try {
    // Debounced incremental build for unsaved content
    if (tsdocService.isIncrementalModeEnabled()) {
      // Update the in-memory projection immediately so hover/code actions never
      // fall back to the saved graph for a dirty document. Only diagnostics and
      // logging are debounced per document.
      const result = tsdocService.processFileChange(filePath, change.document.getText());
      clearIncrementalBuildTimer(change.document.uri);
      const timer = setTimeout(() => {
        try {
          const document = documents.get(change.document.uri) ?? change.document;
          if (result && result.errors.length === 0) {
            connection.console.log(`Incremental update: ${result.symbols.length} symbols in ${path.basename(filePath)}`);
          }
          publishDiagnosticsForDocument(document);
        } catch (error) {
          connection.console.error(`Incremental overlay error: ${error}`);
        } finally {
          incrementalBuildTimers.delete(change.document.uri);
        }
      }, INCREMENTAL_BUILD_DELAY);
      incrementalBuildTimers.set(change.document.uri, timer);
    } else {
      publishDiagnosticsForDocument(change.document);
    }
  } catch (error) {
    connection.console.error(`Diagnostics error: ${error}`);
  }
});

// Handle file save - immediately update symbols
documents.onDidSave(async (event) => {
  if (!tsdocService) return;

  const filePath = filePathFromUri(event.document.uri);
  if (!filePath || !isTypeScriptSourcePath(filePath)) return;
  clearIncrementalBuildTimer(event.document.uri);
  // The buffer is now represented by disk. Clear it before any async refresh so
  // a superseded request cannot leave stale transient state behind.
  tsdocService.clearUnsavedOverlay(filePath);

  if (tsdocService.isCanonicalGraphEnabled()) {
    try {
      const refreshed = await tsdocService.refreshCanonicalGraph(filePath);
      if (refreshed?.status === 'committed') {
        connection.console.log(
          `File saved: canonical graph ${refreshed.graph.fingerprint.slice(0, 12)} (${refreshed.graph.nodes.length} nodes, ${refreshed.graph.edges.length} edges)`
        );
      }
      publishDiagnosticsForOpenDocuments();
    } catch (error) {
      connection.console.error(`Canonical graph refresh failed after save: ${error}`);
    }
    return;
  }

  if (tsdocService.isIncrementalModeEnabled()) {
    // Immediately process the saved file
    const result = tsdocService.processFileChange(filePath);
    if (result) {
      if (result.errors.length > 0) {
        connection.console.warn(`Incremental build errors in ${path.basename(filePath)}: ${result.errors.join(', ')}`);
      } else {
        connection.console.log(`File saved: updated ${result.symbols.length} symbols in ${path.basename(filePath)}`);
      }
    }
    publishDiagnosticsForOpenDocuments();
  }
});

// File deletes and rename-away events require the same whole-project replacement
// so removed nodes and incident edges disappear in one transaction.
connection.onDidChangeWatchedFiles(async (event) => {
  if (!tsdocService) return;
  const changes = event.changes.flatMap((change) => {
    const filePath = filePathFromUri(change.uri);
    return filePath && isTypeScriptSourcePath(filePath) ? [{ ...change, filePath }] : [];
  });
  if (changes.length === 0) return;

  for (const change of changes) {
    if (change.type === FileChangeType.Deleted) {
      clearIncrementalBuildTimer(change.uri);
      tsdocService.clearUnsavedOverlay(change.filePath);
    }
  }

  try {
    if (tsdocService.isCanonicalGraphEnabled()) {
      const refreshed = await tsdocService.refreshCanonicalGraph();
      if (refreshed?.status === 'committed') {
        connection.console.log(
          `Workspace files changed: canonical graph ${refreshed.graph.fingerprint.slice(0, 12)} refreshed`
        );
      }
    } else if (tsdocService.isIncrementalModeEnabled()) {
      for (const change of changes) {
        if (change.type === FileChangeType.Deleted) {
          tsdocService.handleFileDelete(change.filePath);
        } else {
          tsdocService.processFileChange(change.filePath);
        }
      }
    }
    publishDiagnosticsForOpenDocuments();
  } catch (error) {
    connection.console.error(`Graph refresh failed after watched-file change: ${error}`);
  }
});

// Handle file close - cleanup
documents.onDidClose((event) => {
  if (!tsdocService) return;

  clearIncrementalBuildTimer(event.document.uri);
  const filePath = filePathFromUri(event.document.uri);
  if (!filePath) return;
  tsdocService.clearUnsavedOverlay(filePath);
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

// Shutdown handler - cleanup resources
connection.onShutdown(() => {
  connection.console.log('LSP server shutting down, cleaning up resources...');

  clearAllIncrementalBuildTimers();

  if (tsdocService) {
    tsdocService.close();
    tsdocService = null;
  }
});

// Exit handler - final cleanup
connection.onExit(() => {
  clearAllIncrementalBuildTimers();

  if (tsdocService) {
    tsdocService.close();
    tsdocService = null;
  }
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();
