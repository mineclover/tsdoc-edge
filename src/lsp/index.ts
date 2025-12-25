/**
 * TSDoc Edge LSP Module
 *
 * Provides Language Server Protocol integration for real-time code analysis
 * in IDEs like VS Code, Vim, and Emacs.
 *
 * @packageDocumentation
 * @module lsp
 * @doc [[LSP Integration]]
 *
 * @responsibility Export LSP server components
 *
 * ## Components
 *
 * - **server.ts**: LSP server (stdio transport)
 * - **service.ts**: Database access with caching
 *
 * ## Features
 *
 * | Protocol | Description |
 * |----------|-------------|
 * | hover | Symbol info + impact |
 * | codeLens | Impact counts |
 * | codeAction | Analysis actions |
 * | documentLink | [[Symbol]] links |
 * | definition | Go to definition |
 * | workspaceSymbol | Search |
 * | diagnostics | Warnings |
 *
 * @see managed/features/lsp-integration.md
 */

export {
  TsdocEdgeService,
  CodeLensInfo,
  SymbolSearchResult,
  DiagnosticInfo,
} from './service';

export { CacheManager, CacheEntry, CacheManagerOptions } from './cache-manager';
export { StatementManager, StatementManagerOptions } from './statement-manager';
