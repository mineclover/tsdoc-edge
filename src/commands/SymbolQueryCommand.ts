/**
 * Symbol Query Command - Search and explore document symbols
 *
 * @packageDocumentation
 * @doc [[SymbolQueryCommand]]
 * @responsibility Query and explore `[[Symbol]]` definitions and references
 *
 * @problem Users need to find symbols, check their usage, and explore connections
 * @solves Provides comprehensive symbol search and exploration capabilities
 * @context Part of symbol reference system for convention management
 * @functionality Queries canonical `@ttsc/graph` code nodes, `.tsdoc.db` enrichment records, and `[[Symbol]]` document checkpoints with backlink and binding inspection
 * @sideEffect console: Writes symbol matches, checkpoint details, and `--json` payloads to stdout
 * @sideEffect database: Reads canonical `@ttsc/graph` and `.tsdoc.db` SQLite repositories (read)
 * @sideEffect filesystem: Scans managed Markdown documents and TypeScript source files for `@doc` checkpoints (read)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import { CanonicalAliasContext } from '../indexer';
import { extractDocCheckpointsFromSource } from '../parser/TsdocCommentReader';
import { DatabaseManager } from '../storage/DatabaseManager';
import type { ParsedDocSymbols } from '../types/feature';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { isExternalCanonicalNode } from './canonicalReadHelper';

type DocBindingStatus = 'bound-@source' | 'bound-@doc' | 'unbound-homonym' | null;

interface UnifiedCodeSymbolMatch {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly filePath?: string;
  readonly line?: number;
  readonly exported: boolean;
  readonly dependencies: number;
  readonly dependents: number;
  readonly source: 'canonical-graph' | 'enrichment-db';
  readonly docBinding: DocBindingStatus;
}

/**
 * Symbol information with full context
 */
interface SymbolInfo {
  name: string;
  primary?: {
    filePath: string;
    line: number;
    content: string;
  };
  auxiliaries: Array<{
    filePath: string;
    line: number;
    level: number;
  }>;
  references: Array<{
    filePath: string;
    line: number;
    context: string;
  }>;
  sourceFilePath?: string;
}

/**
 * Query and explore document symbols
 *
 * @doc [[SymbolQueryCommand]]
 * @public
 * @responsibility Provide symbol search and exploration capabilities
 * @contract Parse documents, index symbols, respond to queries
 * @sideEffect console: Writes symbol query results to stdout; reads SQLite repositories and managed Markdown files
 *
 * @functionality
 * - Symbol search: Find symbols by name or pattern
 * - Symbol details: Show primary, auxiliaries, references, and code connections
 * - Symbol listing: List all defined symbols with statistics
 * - Similarity search: Find similar symbol names for typo correction
 * - Backlinks: Show all documents that reference a symbol
 *
 * @decision Use in-memory indexing for fast queries
 * @rationale Documentation is small enough to fit in memory, enables instant search
 * @consequences Fast queries but requires rebuild on changes
 */
export class SymbolQueryCommand extends BaseCommand {
  private symbols: Map<string, SymbolInfo> = new Map();
  private parser: DocumentSymbolParser;

  constructor() {
    super();
    this.parser = new DocumentSymbolParser();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'symbol-query';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Query and explore code symbols (Canonical @ttsc/graph) and [[Symbol]] checkpoints';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge symbol query <symbol-or-subcommand> [options]

  Direct Lookup:
    <symbol>           Look up both production code symbols and defined [[Symbol]] checkpoints
    lookup <symbol>    Explicit lookup (use when a symbol name collides with a subcommand)

  Document Subcommands:
    list               List all [[Symbol]] document checkpoints
    search <query>     Search [[Symbol]] checkpoints by name
    info <symbol>      Show detailed [[Symbol]] document context
    backlinks <symbol> Show documents that reference [[Symbol]]
    similar <symbol>   Find symbols with similar names
    stats              Show [[Symbol]] checkpoint statistics

  Options:
    --json               Output as JSON (direct lookup)
    --code-only          Query code symbols only (skip [[Symbol]] checkpoint lookup)
    --doc-only           Query [[Symbol]] checkpoints only (skip code symbol lookup)
    --include-tests      Include test and fixture symbols in code lookup/suggestions
    --include-external   Include external/stdlib code symbols
    --limit <n>          Maximum code symbol matches (default: 10)
    --dir <path>         Documentation directory (default: managed)
    --pattern <regex>    Filter list subcommand by regex
    --all                Include undefined [[Symbol]] references in list`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const flagError = this.validateAllowedFlags(
        args,
        ['--all', '--json', '--include-external', '--include-tests', '--code-only', '--doc-only'],
        ['--pattern', '--dir', '--limit']
      );
      if (flagError) return flagError;

      if (this.hasFlag(args, '--code-only') && this.hasFlag(args, '--doc-only')) {
        this.printError('Cannot combine --code-only and --doc-only');
        return this.failure('Cannot combine --code-only and --doc-only');
      }

      const docsDir = this.findDocsDir(args);
      const positionalArgs = this.getPositionalArgs(args, ['--pattern', '--dir', '--limit']);
      const subcommand = positionalArgs[0] || 'help';

      if (subcommand === 'help') {
        return this.displayHelp();
      }

      const docSubcommands = new Set(['list', 'search', 'info', 'backlinks', 'similar', 'stats']);

      if (subcommand === 'lookup') {
        const target = positionalArgs[1];
        if (!target || positionalArgs.length > 2) {
          this.printError('Usage: tsdoc-edge symbol query lookup <symbol> [options]');
          return this.failure('Usage: symbol query lookup <symbol>');
        }
        return this.queryUnifiedSymbol(target, docsDir, args);
      }

      if (!docSubcommands.has(subcommand)) {
        if (positionalArgs.length > 1) {
          const nearSub = this.findClosestSubcommand(subcommand);
          const hint = nearSub ? ` Did you mean '${nearSub}'?` : '';
          this.printError(`Unknown subcommand '${subcommand}'.${hint}`);
          return this.failure(`Unknown subcommand '${subcommand}'.${hint}`);
        }
        return this.queryUnifiedSymbol(subcommand, docsDir, args);
      }

      this.printHeader('Symbol Query');

      // Build symbol index
      this.printInfo('Building symbol index...');
      this.buildIndex(docsDir);
      console.log();

      // Execute subcommand
      switch (subcommand) {
        case 'list':
          return this.listSymbols(args);
        case 'search':
          return this.searchSymbols(args);
        case 'info':
          return this.showSymbolInfo(args);
        case 'backlinks':
          return this.showBacklinks(args);
        case 'similar':
          return this.findSimilar(args);
        case 'stats':
          return this.showStats();
        default:
          return this.displayHelp();
      }
    });
  }

  /**
   * Build symbol index from documentation
   */
  private buildIndex(docsDir: string, silent = false): void {
    this.symbols.clear();
    const files = this.findMarkdownFiles(docsDir);

    for (const filePath of files) {
      try {
        const parsed = this.parser.parse(filePath);
        if (parsed) {
          this.indexDocument(parsed);
        }
      } catch (_error) {
        // Skip files with errors
      }
    }

    if (!silent) {
      this.printSuccess(`Indexed ${this.symbols.size} symbols from ${files.length} documents`);
    }
  }

  /**
   * Unified lookup across Canonical `@ttsc/graph` code symbols, Enrichment DB fallback, and `[[Symbol]]` checkpoints.
   */
  private queryUnifiedSymbol(query: string, docsDir: string, args: string[]): CommandResult {
    const isJson = this.hasFlag(args, '--json');
    const includeExternal = this.hasFlag(args, '--include-external');
    const includeTests = this.hasFlag(args, '--include-tests');
    const codeOnly = this.hasFlag(args, '--code-only');
    const docOnly = this.hasFlag(args, '--doc-only');
    const parsedLimit = Number.parseInt(this.getOption(args, '--limit') || '10', 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;

    let docMatch: SymbolInfo | undefined;
    if (!codeOnly) {
      this.buildIndex(docsDir, true);
      const exactDoc = this.symbols.get(query);
      if (exactDoc && this.isDefinedCheckpoint(exactDoc)) {
        docMatch = exactDoc;
      } else {
        const lowerQuery = query.toLowerCase();
        for (const [key, info] of this.symbols.entries()) {
          if (key.toLowerCase() === lowerQuery && this.isDefinedCheckpoint(info)) {
            docMatch = info;
            break;
          }
        }
      }
    }

    const rawCodeMatches: Array<Omit<UnifiedCodeSymbolMatch, 'docBinding'>> = [];
    const codeSuggestions: string[] = [];

    if (!docOnly) {
      let canonicalContext: CanonicalAliasContext | null = null;
      try {
        canonicalContext = CanonicalAliasContext.tryOpen(process.cwd());
        if (canonicalContext) {
          const rootDir = canonicalContext.graph.rootDir;
          const externalMode = includeExternal ? 'include' : 'exclude';
          const aliasedCanonicalId = canonicalContext.resolver.legacyToCanonical(query);
          const candidates = canonicalContext.graph.nodes.filter((node) => {
            if (!includeExternal && isExternalCanonicalNode(node)) return false;
            if (!includeTests) {
              const rawFile = node.file ?? node.evidence?.file;
              const relFile = rawFile
                ? path.isAbsolute(rawFile)
                  ? path.relative(rootDir, rawFile)
                  : rawFile
                : undefined;
              if (relFile && this.isTestOrFixturePath(relFile)) return false;
            }
            return true;
          });

          let matchedNodes = candidates.filter(
            (node) =>
              node.id === query ||
              (aliasedCanonicalId !== null && node.id === aliasedCanonicalId) ||
              node.qualifiedName === query ||
              node.name === query
          );

          if (matchedNodes.length === 0) {
            const lower = query.toLowerCase();
            matchedNodes = candidates.filter(
              (node) =>
                (node.qualifiedName ?? '').toLowerCase() === lower ||
                (node.name ?? '').toLowerCase() === lower
            );
          }

          if (matchedNodes.length === 0 && !docMatch) {
            const queryHasDot = query.includes('.');
            const scoredCandidates: Array<{ label: string; score: number }> = [];
            const seenNames = new Set<string>();
            for (const node of candidates) {
              if (node.name === '__constructor') continue;
              const label = node.qualifiedName ?? node.name;
              if (!label || seenNames.has(label)) continue;
              // Prevent private/member clutter (e.g. GraphRepository.clock) on dot-free queries
              if (!queryHasDot && label.includes('.')) continue;
              seenNames.add(label);
              const score = this.scoreSymbolSimilarity(query, label);
              if (score >= 45) {
                scoredCandidates.push({ label, score });
              }
            }
            scoredCandidates.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
            for (const item of scoredCandidates.slice(0, 5)) {
              codeSuggestions.push(item.label);
            }
          }

          for (const node of matchedNodes) {
            const rawFile = node.file ?? node.evidence?.file;
            const filePath = rawFile
              ? path.isAbsolute(rawFile)
                ? path.relative(rootDir, rawFile)
                : rawFile
              : undefined;
            rawCodeMatches.push({
              id: node.id,
              name: node.qualifiedName ?? node.name ?? node.id,
              kind: node.kind,
              filePath,
              line: node.evidence?.startLine,
              exported: Boolean(node.exported),
              dependencies: canonicalContext.analysis.dependencies(node.id, {
                external: externalMode,
              }).length,
              dependents: canonicalContext.analysis.dependents(node.id, {
                external: externalMode,
              }).length,
              source: 'canonical-graph',
            });
          }
        }
      } finally {
        canonicalContext?.close();
      }

      if (rawCodeMatches.length === 0) {
        const dbPath = this.getDatabasePath();
        if (fs.existsSync(dbPath)) {
          const dbManager = new DatabaseManager(dbPath);
          try {
            const exact = dbManager.getSymbol(query);
            const byName = dbManager
              .findSymbolsByNamePattern(query)
              .filter(
                (sym) => sym.name === query || sym.name.toLowerCase() === query.toLowerCase()
              );
            const combined = (
              exact ? [exact, ...byName.filter((s) => s.id !== exact.id)] : byName
            ).filter((sym) => {
              if (includeTests) return true;
              const symFilePath = 'filePath' in sym ? sym.filePath : sym.file_path;
              return !symFilePath || !this.isTestOrFixturePath(symFilePath);
            });

            for (const sym of combined) {
              const rels = dbManager.getUnifiedRelationshipsBySymbol(sym.id);
              let deps = 0;
              let dependents = 0;
              for (const rel of rels) {
                const fromList = Array.isArray(rel.from) ? rel.from : [rel.from];
                const toList = Array.isArray(rel.to) ? rel.to : [rel.to];
                if (fromList.includes(sym.id)) deps++;
                if (toList.includes(sym.id)) dependents++;
              }
              const symFilePath = 'filePath' in sym ? sym.filePath : sym.file_path;
              const symExported =
                'isExported' in sym ? Boolean(sym.isExported) : Boolean(sym.is_exported);
              rawCodeMatches.push({
                id: sym.id,
                name: sym.name,
                kind: sym.type,
                filePath: symFilePath,
                line: sym.line,
                exported: symExported,
                dependencies: deps,
                dependents,
                source: 'enrichment-db',
              });
            }

            if (rawCodeMatches.length === 0 && codeSuggestions.length === 0 && !docMatch) {
              const scoredFallback: Array<{ label: string; score: number }> = [];
              const seen = new Set<string>();
              const partial = dbManager.findSymbolsByNamePattern(query);
              for (const sym of partial) {
                if (!includeTests && sym.file_path && this.isTestOrFixturePath(sym.file_path)) {
                  continue;
                }
                if (seen.has(sym.name)) continue;
                seen.add(sym.name);
                const score = this.scoreSymbolSimilarity(query, sym.name);
                if (score >= 45) {
                  scoredFallback.push({ label: sym.name, score });
                }
              }
              scoredFallback.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
              for (const item of scoredFallback.slice(0, 5)) {
                codeSuggestions.push(item.label);
              }
            }
          } finally {
            dbManager.close();
          }
        }
      }
    }

    const docTagsCache = new Map<string, Set<string>>();
    const codeMatches: UnifiedCodeSymbolMatch[] = rawCodeMatches
      .map((item) => ({
        ...item,
        docBinding: this.resolveDocBinding(item.filePath, docMatch, docTagsCache),
      }))
      .sort((left, right) => {
        const leftBound = left.docBinding?.startsWith('bound-') ? 0 : 1;
        const rightBound = right.docBinding?.startsWith('bound-') ? 0 : 1;
        if (leftBound !== rightBound) return leftBound - rightBound;

        const leftTopLevel = left.name.includes('.') ? 1 : 0;
        const rightTopLevel = right.name.includes('.') ? 1 : 0;
        if (leftTopLevel !== rightTopLevel) return leftTopLevel - rightTopLevel;

        const leftExp = left.exported ? 0 : 1;
        const rightExp = right.exported ? 0 : 1;
        if (leftExp !== rightExp) return leftExp - rightExp;

        if (right.dependents !== left.dependents) return right.dependents - left.dependents;
        return left.id.localeCompare(right.id);
      })
      .slice(0, limit);

    const found = codeMatches.length > 0 || Boolean(docMatch);
    const subcommandHint = !found ? this.findClosestSubcommand(query) : null;
    const docSuggestions = !found && !codeOnly ? this.findSimilarSymbols(query, 5) : [];
    const mergedSuggestions =
      found || subcommandHint
        ? []
        : Array.from(new Set([...codeSuggestions, ...docSuggestions])).slice(0, 6);

    const docSummary = docMatch
      ? {
          name: docMatch.name,
          primary: docMatch.primary
            ? {
                filePath: this.relativePath(docMatch.primary.filePath),
                line: docMatch.primary.line,
              }
            : null,
          sourceFilePath: docMatch.sourceFilePath ?? null,
          auxiliaryCount: docMatch.auxiliaries.length,
          referenceCount: docMatch.references.length,
        }
      : null;

    if (isJson) {
      console.log(
        JSON.stringify(
          {
            query,
            found,
            codeSymbols: codeMatches,
            documentSymbol: docSummary,
            ...(subcommandHint ? { subcommandHint } : {}),
            ...(mergedSuggestions.length > 0 ? { suggestions: mergedSuggestions } : {}),
          },
          null,
          2
        )
      );
      return found ? this.success() : this.failure(`Symbol '${query}' not found`);
    }

    this.printHeader(`Symbol Lookup: ${query}`);
    console.log();

    if (!found) {
      this.printError(`Symbol '${query}' not found in code graph or [[Symbol]] checkpoints`);
      if (subcommandHint) {
        console.log();
        this.printInfo(`Did you mean subcommand: tsdoc-edge symbol query ${subcommandHint}`);
      } else if (mergedSuggestions.length > 0) {
        console.log();
        console.log(`  ${this.colors.bold}Similar symbols:${this.colors.reset}`);
        for (const suggestion of mergedSuggestions) {
          console.log(`    ${this.colors.cyan}• ${suggestion}${this.colors.reset}`);
        }
      }
      console.log();
      return this.failure(`Symbol '${query}' not found`);
    }

    if (codeMatches.length > 0) {
      this.printSection(`Code Symbols (${codeMatches.length})`);
      for (const match of codeMatches) {
        const exportBadge = match.exported
          ? `${this.colors.green}[exported]${this.colors.reset}`
          : `${this.colors.dim}[internal]${this.colors.reset}`;
        const bindingBadge =
          match.docBinding === 'bound-@source'
            ? ` ${this.colors.green}[bound ↔ [[${docSummary?.name}]] via @source]${this.colors.reset}`
            : match.docBinding === 'bound-@doc'
              ? ` ${this.colors.green}[bound ↔ [[${docSummary?.name}]] via @doc]${this.colors.reset}`
              : match.docBinding === 'unbound-homonym'
                ? ` ${this.colors.yellow}[homonym: not bound to [[${docSummary?.name}]]]${this.colors.reset}`
                : '';
        const location = match.filePath
          ? `${match.filePath}${match.line ? `:${match.line}` : ''}`
          : 'unknown';
        console.log(
          `  ${this.colors.cyan}${this.colors.bold}${match.name}${this.colors.reset} (${this.colors.yellow}${match.kind}${this.colors.reset}) ${exportBadge}${bindingBadge}`
        );
        console.log(`    Location:  ${this.colors.blue}${location}${this.colors.reset}`);
        console.log(
          `    Edges:     ↓ ${this.colors.cyan}${match.dependencies}${this.colors.reset} dependencies | ↑ ${this.colors.cyan}${match.dependents}${this.colors.reset} dependents`
        );
        console.log(`    ID:        ${this.colors.dim}${match.id}${this.colors.reset}`);
        console.log();
      }
    }

    if (docSummary) {
      this.printSection(`Document Checkpoint [[${docSummary.name}]]`);
      if (docSummary.primary) {
        console.log(
          `  Primary H1:  ${this.colors.green}${docSummary.primary.filePath}:${docSummary.primary.line}${this.colors.reset}`
        );
      } else {
        console.log(
          `  Primary H1:  ${this.colors.yellow}auxiliary section checkpoint (${docSummary.auxiliaryCount} heading)${this.colors.reset}`
        );
      }
      if (docSummary.sourceFilePath) {
        console.log(
          `  @source:     ${this.colors.cyan}${docSummary.sourceFilePath}${this.colors.reset}`
        );
      }
      console.log(
        `  Connections: ${this.colors.cyan}${docSummary.referenceCount}${this.colors.reset} backlink references, ${this.colors.cyan}${docSummary.auxiliaryCount}${this.colors.reset} auxiliary headings`
      );
      console.log();
    }

    return this.success();
  }

  /**
   * Index a parsed document
   */
  private indexDocument(parsed: ParsedDocSymbols): void {
    // Index primary definition
    if (parsed.primary) {
      const info = this.getOrCreateSymbolInfo(parsed.primary.name);

      // Read context around the definition
      const content = this.readLineContext(parsed.filePath, parsed.primary.line, 5);

      info.primary = {
        filePath: parsed.filePath,
        line: parsed.primary.line,
        content,
      };

      if (parsed.sourceFilePath) {
        info.sourceFilePath = parsed.sourceFilePath;
      }
    }

    // Index auxiliaries
    for (const aux of parsed.auxiliaries) {
      const info = this.getOrCreateSymbolInfo(aux.name);
      info.auxiliaries.push({
        filePath: parsed.filePath,
        line: aux.line,
        level: aux.level,
      });
    }

    // Index references
    for (const ref of parsed.references) {
      const info = this.getOrCreateSymbolInfo(ref.name);
      const context = this.readLine(parsed.filePath, ref.line).trim();
      info.references.push({
        filePath: parsed.filePath,
        line: ref.line,
        context,
      });
    }
  }

  /**
   * Get or create symbol info
   */
  private getOrCreateSymbolInfo(name: string): SymbolInfo {
    if (!this.symbols.has(name)) {
      this.symbols.set(name, {
        name,
        auxiliaries: [],
        references: [],
      });
    }
    const symbol = this.symbols.get(name);
    if (!symbol) {
      throw new Error(`Unable to create symbol: ${name}`);
    }
    return symbol;
  }

  /**
   * List all symbols
   */
  private listSymbols(args: string[]): CommandResult {
    const showAll = this.hasFlag(args, '--all');
    const pattern = this.getOption(args, '--pattern');

    this.printSection('Symbol List');

    let symbols = Array.from(this.symbols.entries());

    // Filter by pattern
    if (pattern) {
      const regex = new RegExp(pattern, 'i');
      symbols = symbols.filter(([name]) => regex.test(name));
    }

    // Filter out symbols without primary (unless --all)
    if (!showAll) {
      symbols = symbols.filter(([, info]) => info.primary);
    }

    // Sort by name
    symbols.sort(([a], [b]) => a.localeCompare(b));

    if (symbols.length === 0) {
      this.printWarning('No symbols found');
      return this.success();
    }

    for (const [name, info] of symbols) {
      const status = info.primary ? '✅' : '❌';
      const refCount = info.references.length;
      const auxCount = info.auxiliaries.length;

      console.log(`  ${status} [[${name}]]`);

      if (info.primary) {
        console.log(
          `     ${this.colors.dim}${this.relativePath(info.primary.filePath)}:${info.primary.line}${this.colors.reset}`
        );
      } else {
        console.log(`     ${this.colors.red}No primary definition${this.colors.reset}`);
      }

      console.log(`     ${this.colors.dim}${refCount} refs, ${auxCount} aux${this.colors.reset}`);
      console.log();
    }

    console.log(`${this.colors.dim}Total: ${symbols.length} symbols${this.colors.reset}`);
    console.log();

    return this.success();
  }

  /**
   * Search symbols by name
   */
  private searchSymbols(args: string[]): CommandResult {
    const query = args.find((arg) => !arg.startsWith('--') && arg !== 'search');

    if (!query) {
      this.printError('Usage: symbol-query search <pattern>');
      return this.failure('Missing search query');
    }

    this.printSection(`Search: "${query}"`);

    const regex = new RegExp(query, 'i');
    const matches = Array.from(this.symbols.entries()).filter(([name]) => regex.test(name));

    if (matches.length === 0) {
      this.printWarning('No matches found');
      return this.success();
    }

    for (const [name, info] of matches) {
      const status = info.primary ? '✅' : '❌';
      console.log(`  ${status} [[${name}]]`);

      if (info.primary) {
        console.log(`     ${this.relativePath(info.primary.filePath)}:${info.primary.line}`);
      }

      console.log();
    }

    console.log(`${this.colors.dim}Found ${matches.length} matches${this.colors.reset}`);
    console.log();

    return this.success();
  }

  /**
   * Show detailed symbol information
   */
  private showSymbolInfo(args: string[]): CommandResult {
    const symbolName = args.find((arg) => !arg.startsWith('--') && arg !== 'info');

    if (!symbolName) {
      this.printError('Usage: symbol-query info <symbol-name>');
      return this.failure('Missing symbol name');
    }

    const info = this.symbols.get(symbolName);

    if (!info) {
      this.printError(`Symbol [[${symbolName}]] not found`);

      // Suggest similar symbols
      const similar = this.findSimilarSymbols(symbolName, 3);
      if (similar.length > 0) {
        console.log();
        this.printInfo('Did you mean:');
        for (const sim of similar) {
          console.log(`  - [[${sim}]]`);
        }
      }

      return this.failure('Symbol not found');
    }

    this.printSection(`Symbol: [[${info.name}]]`);

    // Primary definition
    if (info.primary) {
      console.log(`${this.colors.green}✅ Primary Definition (H1):${this.colors.reset}`);
      console.log(`   File: ${this.relativePath(info.primary.filePath)}:${info.primary.line}`);
      if (info.sourceFilePath) {
        console.log(`   Source: ${this.colors.cyan}${info.sourceFilePath}${this.colors.reset}`);
      }
      console.log();
      console.log(`   ${this.colors.dim}${info.primary.content}${this.colors.reset}`);
      console.log();
    } else {
      console.log(`${this.colors.red}❌ No primary definition${this.colors.reset}`);
      console.log();
    }

    // Auxiliaries
    if (info.auxiliaries.length > 0) {
      console.log(
        `${this.colors.yellow}Auxiliary Definitions (H${info.auxiliaries[0].level}):${this.colors.reset} ${info.auxiliaries.length}`
      );
      for (const aux of info.auxiliaries) {
        console.log(`   - ${this.relativePath(aux.filePath)}:${aux.line}`);
      }
      console.log();
    }

    // References
    if (info.references.length > 0) {
      const showAll = args.includes('--all');
      const maxRefs = showAll ? info.references.length : 10;

      console.log(`${this.colors.cyan}References:${this.colors.reset} ${info.references.length}`);

      // Group by file
      const byFile = new Map<string, typeof info.references>();
      for (const ref of info.references) {
        if (!byFile.has(ref.filePath)) {
          byFile.set(ref.filePath, []);
        }
        byFile.get(ref.filePath)?.push(ref);
      }

      let count = 0;
      for (const [filePath, refs] of byFile.entries()) {
        if (count >= maxRefs) break;
        console.log(`   ${this.colors.dim}${this.relativePath(filePath)}${this.colors.reset}`);
        for (const ref of refs) {
          if (count >= maxRefs) break;
          console.log(`      L${ref.line}: ${ref.context.substring(0, 80)}...`);
          count++;
        }
      }

      if (info.references.length > maxRefs) {
        console.log(
          `   ${this.colors.dim}... and ${info.references.length - maxRefs} more (use --all to show all)${this.colors.reset}`
        );
      }
      console.log();
    } else {
      console.log(`${this.colors.yellow}⚠️  No references found${this.colors.reset}`);
      console.log();
    }

    return this.success();
  }

  /**
   * Show backlinks (documents that reference this symbol)
   */
  private showBacklinks(args: string[]): CommandResult {
    const symbolName = args.find((arg) => !arg.startsWith('--') && arg !== 'backlinks');

    if (!symbolName) {
      this.printError('Usage: symbol-query backlinks <symbol-name>');
      return this.failure('Missing symbol name');
    }

    const info = this.symbols.get(symbolName);

    if (!info) {
      this.printError(`Symbol [[${symbolName}]] not found`);
      return this.failure('Symbol not found');
    }

    this.printSection(`Backlinks: [[${symbolName}]]`);

    // Collect all files that reference this symbol
    const files = new Set<string>();

    for (const ref of info.references) {
      files.add(ref.filePath);
    }

    for (const aux of info.auxiliaries) {
      files.add(aux.filePath);
    }

    if (files.size === 0) {
      this.printWarning('No backlinks found');
      return this.success();
    }

    console.log(`Found ${files.size} documents:\n`);

    for (const filePath of Array.from(files).sort()) {
      const refs = info.references.filter((r) => r.filePath === filePath);
      const auxs = info.auxiliaries.filter((a) => a.filePath === filePath);

      console.log(`  📄 ${this.relativePath(filePath)}`);

      if (auxs.length > 0) {
        console.log(
          `     ${this.colors.yellow}${auxs.length} auxiliary def(s)${this.colors.reset}`
        );
      }

      if (refs.length > 0) {
        console.log(`     ${this.colors.cyan}${refs.length} reference(s)${this.colors.reset}`);
      }

      console.log();
    }

    return this.success();
  }

  /**
   * Find similar symbols
   */
  private findSimilar(args: string[]): CommandResult {
    const symbolName = args.find((arg) => !arg.startsWith('--') && arg !== 'similar');

    if (!symbolName) {
      this.printError('Usage: symbol-query similar <symbol-name>');
      return this.failure('Missing symbol name');
    }

    this.printSection(`Similar to: "${symbolName}"`);

    const similar = this.findSimilarSymbols(symbolName, 10);

    if (similar.length === 0) {
      this.printWarning('No similar symbols found');
      return this.success();
    }

    for (const name of similar) {
      const info = this.symbols.get(name);
      if (!info) continue;
      const status = info.primary ? '✅' : '❌';

      console.log(`  ${status} [[${name}]]`);

      if (info.primary) {
        console.log(
          `     ${this.colors.dim}${this.relativePath(info.primary.filePath)}:${info.primary.line}${this.colors.reset}`
        );
      }

      console.log();
    }

    return this.success();
  }

  /**
   * Show statistics
   */
  private showStats(): CommandResult {
    this.printSection('Symbol Statistics');

    const withPrimary = Array.from(this.symbols.values()).filter((info) => info.primary).length;
    const withoutPrimary = this.symbols.size - withPrimary;

    let totalRefs = 0;
    let totalAux = 0;

    for (const info of this.symbols.values()) {
      totalRefs += info.references.length;
      totalAux += info.auxiliaries.length;
    }

    console.log(`  Total symbols: ${this.colors.cyan}${this.symbols.size}${this.colors.reset}`);
    console.log(`  With primary: ${this.colors.green}${withPrimary}${this.colors.reset}`);
    console.log(`  Without primary: ${this.colors.red}${withoutPrimary}${this.colors.reset}`);
    console.log(`  Total references: ${this.colors.cyan}${totalRefs}${this.colors.reset}`);
    console.log(`  Total auxiliaries: ${this.colors.yellow}${totalAux}${this.colors.reset}`);
    console.log(
      `  Avg references per symbol: ${this.colors.cyan}${(totalRefs / this.symbols.size).toFixed(1)}${this.colors.reset}`
    );
    console.log();

    return this.success();
  }

  /**
   * Check whether a document symbol entry has a real primary H1 or auxiliary heading definition.
   */
  private isDefinedCheckpoint(info: SymbolInfo): boolean {
    return Boolean(info.primary) || info.auxiliaries.length > 0;
  }

  /**
   * Check whether a relative file path belongs to tests, mocks, or test fixtures.
   */
  private isTestOrFixturePath(relPath: string): boolean {
    const normalized = relPath.replace(/\\/g, '/');
    return (
      /(?:^|\/)(?:__tests__|fixtures|__mocks__)\//i.test(normalized) ||
      /\.(?:test|spec)\.[cm]?tsx?$/i.test(normalized)
    );
  }

  /**
   * Resolve explicit provenance binding between a matched code file and a `[[Symbol]]` checkpoint.
   */
  private resolveDocBinding(
    filePath: string | undefined,
    docMatch: SymbolInfo | undefined,
    docTagsCache: Map<string, Set<string>>
  ): DocBindingStatus {
    if (!docMatch) return null;
    if (!filePath) return 'unbound-homonym';

    const normalizedCodePath = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
    const normalizedDocSource = docMatch.sourceFilePath?.replace(/\\/g, '/').replace(/^\.\//, '');
    if (normalizedDocSource && normalizedCodePath === normalizedDocSource) {
      return 'bound-@source';
    }

    let fileDocTags = docTagsCache.get(normalizedCodePath);
    if (!fileDocTags) {
      fileDocTags = new Set<string>();
      const absPath = path.resolve(process.cwd(), normalizedCodePath);
      if (fs.existsSync(absPath)) {
        try {
          const sourceText = fs.readFileSync(absPath, 'utf-8');
          for (const entry of extractDocCheckpointsFromSource(sourceText, absPath)) {
            fileDocTags.add(entry.docSymbol);
          }
        } catch {
          // Ignore unreadable files and treat as unbound
        }
      }
      docTagsCache.set(normalizedCodePath, fileDocTags);
    }

    if (fileDocTags.has(docMatch.name)) {
      return 'bound-@doc';
    }

    return 'unbound-homonym';
  }

  /**
   * Detect if an input token is a close typo of a reserved `symbol query` subcommand.
   */
  private findClosestSubcommand(input: string): string | null {
    // Only check lowercase/kebab tokens so PascalCase/camelCase symbol names never trigger subcommand hints
    if (!/^[a-z-]+$/.test(input)) return null;
    const subcommands = ['list', 'search', 'info', 'backlinks', 'similar', 'stats', 'lookup'];
    let best: { name: string; distance: number } | null = null;
    for (const sub of subcommands) {
      if (sub === input) continue;
      const distance = this.levenshteinDistance(input, sub);
      const maxLen = Math.max(input.length, sub.length);
      if (distance <= 2 && distance / maxLen <= 0.35) {
        if (!best || distance < best.distance) {
          best = { name: sub, distance };
        }
      }
    }
    return best ? best.name : null;
  }

  /**
   * Find similar symbol names among defined document checkpoints
   */
  private findSimilarSymbols(target: string, maxResults: number): string[] {
    const results: Array<{ name: string; score: number }> = [];

    for (const [name, info] of this.symbols.entries()) {
      if (name === target) continue;
      if (!this.isDefinedCheckpoint(info)) continue;
      const score = this.scoreSymbolSimilarity(target, name);
      if (score >= 45) {
        results.push({ name, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, maxResults)
      .map((r) => r.name);
  }

  /**
   * Score similarity between a target symbol query and a candidate symbol name with strict false-positive rejection.
   */
  private scoreSymbolSimilarity(target: string, candidate: string): number {
    if (target === candidate) return 0;
    const normalized = this.normalizeSymbolName(target);
    const symNormalized = this.normalizeSymbolName(candidate);
    const compactTarget = normalized.replace(/-/g, '');
    const compactCandidate = symNormalized.replace(/-/g, '');
    if (compactTarget.length < 3 || compactCandidate.length < 3) return 0;

    const minLen = Math.min(compactTarget.length, compactCandidate.length);
    const maxLen = Math.max(compactTarget.length, compactCandidate.length);
    const isSubstring =
      compactCandidate.includes(compactTarget) || compactTarget.includes(compactCandidate);

    if (!isSubstring && maxLen > Math.floor(minLen * 1.8) + 2) {
      return 0;
    }

    const distance = this.levenshteinDistance(compactTarget, compactCandidate);
    const normSim = 1 - distance / maxLen;
    const dice = this.bigramDice(compactTarget, compactCandidate);

    const targetWords = this.tokenizeSymbolWords(target);
    const symWords = this.tokenizeSymbolWords(candidate);
    let matchedCandidateTokens = 0;
    for (const sw of symWords) {
      const matched = targetWords.some((tw) => {
        if (tw === sw) return true;
        if (tw.length < 4 || sw.length < 4 || Math.abs(tw.length - sw.length) > 2) return false;
        const wordDist = this.levenshteinDistance(tw, sw);
        return 1 - wordDist / Math.max(tw.length, sw.length) >= 0.75;
      });
      if (matched) matchedCandidateTokens++;
    }
    const candidateTokenCoverage =
      symWords.length > 0 ? matchedCandidateTokens / symWords.length : 0;

    const passesWholeNameTypo = normSim >= 0.68 && dice >= 0.45;
    const passesSubstring = isSubstring && minLen >= 4 && minLen / maxLen >= 0.45;
    const passesMultiTokenTypo =
      symWords.length >= 2 &&
      matchedCandidateTokens >= 2 &&
      candidateTokenCoverage >= 0.66 &&
      dice >= 0.45;

    if (!passesWholeNameTypo && !passesSubstring && !passesMultiTokenTypo) {
      return 0;
    }

    let prefixLen = 0;
    while (prefixLen < minLen && compactTarget[prefixLen] === compactCandidate[prefixLen]) {
      prefixLen++;
    }

    const score =
      Math.round(normSim * 45) +
      Math.round(dice * 30) +
      Math.round(candidateTokenCoverage * 20) +
      (passesSubstring ? 12 : 0) +
      Math.min(10, prefixLen);

    return score;
  }

  /**
   * Compute character bigram Sørensen–Dice coefficient in [0, 1].
   */
  private bigramDice(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;

    const bigramsA = new Map<string, number>();
    for (let i = 0; i < a.length - 1; i++) {
      const bg = a.slice(i, i + 2);
      bigramsA.set(bg, (bigramsA.get(bg) || 0) + 1);
    }

    let intersection = 0;
    for (let i = 0; i < b.length - 1; i++) {
      const bg = b.slice(i, i + 2);
      const count = bigramsA.get(bg) || 0;
      if (count > 0) {
        intersection++;
        bigramsA.set(bg, count - 1);
      }
    }

    return (2 * intersection) / (a.length - 1 + (b.length - 1));
  }

  /**
   * Split CamelCase, snake_case, kebab-case, and qualified symbol names into lowercase tokens.
   */
  private tokenizeSymbolWords(name: string): string[] {
    return name
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  }

  /**
   * Normalize symbol name for comparison
   */
  private normalizeSymbolName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Find docs directory from args
   * Uses --dir=<path> flag, defaults to 'managed'
   */
  private findDocsDir(args: string[]): string {
    return this.getOption(args, '--dir') || 'managed';
  }

  /**
   * Find markdown files recursively
   */
  private findMarkdownFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        files.push(...this.findMarkdownFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Read a single line from file
   */
  private readLine(filePath: string, lineNum: number): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      return lines[lineNum - 1] || '';
    } catch {
      return '';
    }
  }

  /**
   * Read context around a line
   */
  private readLineContext(filePath: string, lineNum: number, contextLines: number): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const start = Math.max(0, lineNum - contextLines);
      const end = Math.min(lines.length, lineNum + contextLines);
      return lines.slice(start, end).join('\n');
    } catch {
      return '';
    }
  }

  /**
   * Get relative path
   */
  private relativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath);
  }

  private get colors() {
    return {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      red: '\x1b[31m',
    };
  }
}
