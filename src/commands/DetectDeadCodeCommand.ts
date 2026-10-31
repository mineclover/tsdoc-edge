/**
 * Detect Dead Code command - Find and tag unused code based on call graph and dependency analysis
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DeadCodeTagger, type TagResult } from '../fixer/DeadCodeTagger';
import { DatabaseManager } from '../storage/DatabaseManager';
import type { Symbol } from '../types/graph/graph';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Dead code detection result
 */
export interface DeadCodeSymbol {
  symbol: Symbol;
  reason: 'never-called' | 'no-imports' | 'isolated' | 'test-only' | 'unused-export';
  confidence: 'high' | 'medium' | 'low';
  recommendations: string[];
}

/**
 * Command for detecting and tagging unused/dead code
 *
 * @doc [[DetectDeadCodeCommand]]
 * @public
 * @responsibility Detect code that is never used based on call graph and dependency analysis
 * @contract Analyze symbols and relationships to find and tag dead code candidates
 *
 * @problem Codebases accumulate unused code over time, wasting maintenance effort
 * @solves Uses SSOT data (calls, dependencies, documentation) to identify and tag safe-to-delete code
 * @context After achieving high documentation coverage, can confidently identify orphaned code
 *
 * @functionality
 * - Multi-signal analysis: Call graph, dependency graph, intra-file usage
 * - Accurate entry point identification: Distinguishes true application roots from arbitrary internal exports
 * - Self-tagging: Automatically annotates dead code with `@deprecated` and `@deadcode` TSDoc tags
 * - Tag exploration: Search and inspect symbols already marked as dead code or deprecated
 * - Dry-run support: Safely preview tagging and untagging changes
 *
 * @depends DatabaseManager, DeadCodeTagger
 * @depType internal
 * @depReason Symbol and relationship data, AST-based TSDoc modification
 */
export class DetectDeadCodeCommand extends BaseCommand {
  private db: DatabaseManager;
  private tagger: DeadCodeTagger;
  private fileContentCache: Map<string, string> = new Map();

  constructor(db?: DatabaseManager, tagger?: DeadCodeTagger) {
    super();
    this.db = db || new DatabaseManager(this.getDatabasePath(), this.getJsonlPath());
    this.tagger = tagger || new DeadCodeTagger();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'detect-dead-code';
  }

  /**
   * getAliases method
   * @returns Returns array of alias strings
   * @public
   */
  getAliases(): string[] {
    return ['dead-code', 'deadcode'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Detect and tag unused/dead code based on call graph and dependency analysis';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge detect-dead-code [path] [options]

  Exploration Options:
    --all                Show all candidates (including low confidence)
    --high               Show only high confidence candidates (default)
    --medium             Show medium and high confidence candidates
    --confidence=LEVEL   Filter by confidence (high/medium/low/all)
    --path=PATH          Filter candidates by file or directory path
    --type=TYPE          Filter by symbol type (function/class/interface/type/constant/variable)
    --tagged             Search and list symbols already tagged with @deadcode or @deprecated
    --json               Output results in JSON format
    --summary            Show aggregated breakdown of dead code candidates

  Tagging Options:
    --tag, --apply-tag   Automatically annotate dead code in source code with @deprecated and @deadcode
    --dry-run            Preview tagging actions without modifying files
    --untag              Remove @deadcode and dead code @deprecated tags from candidate symbols
    --reason=TEXT        Custom reason to attach to generated tags`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const isTaggedMode = args.includes('--tagged');
      const isTagMode = args.includes('--tag') || args.includes('--apply-tag');
      const isUntagMode = args.includes('--untag');
      const isDryRun = args.includes('--dry-run');
      const isJson = args.includes('--json');
      const isSummary = args.includes('--summary');
      const showAll = args.includes('--all');

      const positionalArgs = this.getPositionalArgs(args);
      const targetPath = this.getOption(args, '--path') || positionalArgs[0];
      const typeFilter = this.getOption(args, '--type')?.toLowerCase();
      const customReason = this.getOption(args, '--reason');
      const confidenceFilter = this.getConfidenceFilter(args);

      // Mode 1: Search already tagged dead code symbols
      if (isTaggedMode) {
        return this.executeTaggedSearch(targetPath, isJson);
      }

      // Mode 2: Dead code detection & exploration / tagging
      try {
        if (!isJson) {
          this.printHeader('Dead Code Detection');
        }

        if (targetPath && !fs.existsSync(targetPath)) {
          this.printError(`Target path does not exist: ${targetPath}`);
          return this.failure(`Target path does not exist: ${targetPath}`);
        }

        const allSymbols = await this.getAllSymbols();
        if (!isJson) {
          this.printInfo(`Analyzing ${allSymbols.length} indexed symbols...`);
          console.log();
        }

        const deadCode = await this.detectDeadCode(allSymbols);

        // Apply filters: confidence, path, type
        let filtered = deadCode.filter((dc) => {
          if (confidenceFilter === 'high') return dc.confidence === 'high';
          if (confidenceFilter === 'medium') {
            return dc.confidence === 'high' || dc.confidence === 'medium';
          }
          if (confidenceFilter === 'low') {
            return dc.confidence === 'low';
          }
          return true; // all
        });

        if (targetPath) {
          const normalizedTarget = this.normalizeSearchPath(targetPath);
          filtered = filtered.filter((dc) => {
            const symPath = this.normalizeSearchPath(dc.symbol.filePath);
            return (
              symPath === normalizedTarget ||
              symPath.startsWith(
                normalizedTarget.endsWith('/') ? normalizedTarget : `${normalizedTarget}/`
              ) ||
              symPath.includes(normalizedTarget)
            );
          });
        }

        if (typeFilter) {
          filtered = filtered.filter((dc) => dc.symbol.type.toLowerCase() === typeFilter);
        }

        // Action: Tagging or Untagging
        if (isTagMode || isUntagMode) {
          return this.executeTaggingAction(filtered, isUntagMode, isDryRun, customReason);
        }

        // Action: Output
        if (isJson) {
          console.log(
            JSON.stringify(
              {
                totalCandidates: filtered.length,
                targetPath: targetPath || null,
                confidenceFilter,
                candidates: filtered.map((dc) => ({
                  name: dc.symbol.name,
                  type: dc.symbol.type,
                  filePath: dc.symbol.filePath,
                  line: dc.symbol.line,
                  reason: dc.reason,
                  confidence: dc.confidence,
                  recommendations: dc.recommendations,
                })),
              },
              null,
              2
            )
          );
          return this.success();
        }

        if (isSummary) {
          this.displaySummaryOnly(filtered);
          return this.success();
        }

        this.displayResults(filtered, showAll);
        return this.success();
      } finally {
        this.db.close();
      }
    });
  }

  /**
   * Normalize search path for consistent matching across relative, ./, and absolute paths
   */
  private normalizeSearchPath(rawPath: string): string {
    let normalized = rawPath.replace(/\\/g, '/');
    if (path.isAbsolute(normalized)) {
      normalized = path.relative(process.cwd(), normalized).replace(/\\/g, '/');
    }
    return normalized.replace(/^\.\//, '').trim();
  }

  /**
   * Search and report existing tagged dead code symbols
   */
  private executeTaggedSearch(targetPath: string | undefined, isJson: boolean): CommandResult {
    const searchRoot = targetPath || 'src';
    if (!fs.existsSync(searchRoot)) {
      this.printError(`Target path does not exist: ${searchRoot}`);
      return this.failure(`Target path does not exist: ${searchRoot}`);
    }

    const taggedSymbols = this.tagger.findTaggedSymbols([searchRoot]);

    if (isJson) {
      console.log(
        JSON.stringify(
          {
            searchRoot,
            count: taggedSymbols.length,
            symbols: taggedSymbols,
          },
          null,
          2
        )
      );
      return this.success();
    }

    this.printHeader('Tagged Dead Code Symbols');
    console.log(`Search path: ${colors.cyan}${searchRoot}${colors.reset}`);
    console.log(
      `Found ${colors.yellow}${taggedSymbols.length}${colors.reset} symbols currently tagged with @deadcode or @deprecated:\n`
    );

    if (taggedSymbols.length === 0) {
      this.printSuccess('No dead code tags found in target path.');
      return this.success();
    }

    for (const sym of taggedSymbols) {
      const tagLabels = sym.tags.map((t) => t.name).join(' ');
      console.log(
        `  ${colors.red}✗${colors.reset} ${colors.bold}${sym.name}${colors.reset} (${sym.type}) [${tagLabels}]`
      );
      console.log(`    ${colors.dim}${sym.filePath}:${sym.line}${colors.reset}`);
      if (sym.reason) {
        console.log(`    Reason: ${colors.yellow}${sym.reason}${colors.reset}`);
      }
      if (sym.confidence) {
        console.log(`    Confidence: ${sym.confidence}`);
      }
      console.log();
    }

    this.printSection('Next Steps');
    console.log('  1. Review candidates above before permanent deletion.');
    console.log('  2. Run tests to confirm removal safety: npm test');
    console.log('  3. Use --untag to remove dead code tags from active code:');
    console.log(`     tsdoc-edge detect-dead-code ${searchRoot} --untag`);
    console.log();

    return this.success();
  }

  /**
   * Execute tagging or untagging of candidate symbols
   */
  private executeTaggingAction(
    candidates: DeadCodeSymbol[],
    isUntag: boolean,
    dryRun: boolean,
    customReason?: string
  ): CommandResult {
    this.printSection(isUntag ? 'Untagging Dead Code' : 'Tagging Dead Code');

    if (dryRun) {
      console.log(`${colors.yellow}🔍 DRY RUN MODE - No files will be modified.${colors.reset}\n`);
    }

    if (candidates.length === 0) {
      this.printSuccess('No candidates matching filter to process.');
      return this.success();
    }

    let results: TagResult[];

    if (isUntag) {
      results = this.tagger.untagSymbols(
        candidates.map((c) => ({
          name: c.symbol.name,
          line: c.symbol.line,
          filePath: c.symbol.filePath,
        })),
        { dryRun }
      );
    } else {
      results = this.tagger.tagSymbols(
        candidates.map((c) => ({
          name: c.symbol.name,
          line: c.symbol.line,
          filePath: c.symbol.filePath,
          type: c.symbol.type,
          reason: customReason || c.reason,
          confidence: c.confidence,
        })),
        {
          dryRun,
          reason: customReason,
        }
      );
    }

    const modified = results.filter((r) => r.action === 'tagged' || r.action === 'untagged');
    const alreadyTagged = results.filter((r) => r.action === 'already-tagged');
    const skipped = results.filter((r) => r.action === 'skipped');

    console.log(`Total candidates processed: ${colors.bold}${results.length}${colors.reset}`);
    console.log(
      `  ${isUntag ? 'Untagged' : 'Tagged'}: ${colors.green}${modified.length}${colors.reset}`
    );
    console.log(`  Already tagged: ${colors.dim}${alreadyTagged.length}${colors.reset}`);
    if (skipped.length > 0) {
      console.log(`  Skipped / Failed: ${colors.red}${skipped.length}${colors.reset}`);
    }
    console.log();

    // Show sample of modified symbols
    if (modified.length > 0) {
      const sample = modified.slice(0, 15);
      console.log(
        `${colors.cyan}${dryRun ? 'Symbols that would be' : 'Symbols'} ${isUntag ? 'untagged' : 'tagged'}:${colors.reset}`
      );
      for (const item of sample) {
        console.log(
          `  ${colors.green}•${colors.reset} ${item.symbolName} (${item.filePath}:${item.line})`
        );
      }
      if (modified.length > 15) {
        console.log(`  ${colors.dim}... and ${modified.length - 15} more${colors.reset}`);
      }
      console.log();
    }

    if (dryRun) {
      console.log(
        `To apply these changes permanently, re-run without ${colors.yellow}--dry-run${colors.reset}.`
      );
      console.log();
    } else {
      this.printSuccess(
        `Successfully ${isUntag ? 'untagged' : 'tagged'} ${modified.length} symbols.`
      );
    }

    return this.success();
  }

  /**
   * Get confidence filter from args
   */
  private getConfidenceFilter(args: string[]): 'high' | 'medium' | 'low' | 'all' {
    const opt = this.getOption(args, '--confidence')?.toLowerCase();
    if (opt === 'high' || opt === 'medium' || opt === 'low' || opt === 'all') {
      return opt;
    }
    if (args.includes('--all')) return 'all';
    if (args.includes('--medium')) return 'medium';
    if (args.includes('--high')) return 'high';
    return 'high'; // Default to high confidence for safety
  }

  /**
   * Get all symbols from database
   */
  private async getAllSymbols(): Promise<Symbol[]> {
    try {
      return await this.db.getAllSymbols();
    } catch (_error) {
      return [];
    }
  }

  /**
   * Detect dead code symbols across indexed symbols
   */
  private async detectDeadCode(symbols: Symbol[]): Promise<DeadCodeSymbol[]> {
    const deadCode: DeadCodeSymbol[] = [];
    const entryPoints = this.identifyEntryPoints(symbols);

    for (const symbol of symbols) {
      // Skip designated application/package entry points
      if (entryPoints.has(symbol.id)) {
        continue;
      }

      // Skip test files (not dead code, just test infrastructure)
      if (this.isTestFile(symbol.filePath)) {
        continue;
      }

      // Skip private class members (properties, methods); their lifecycle is tied to the class
      if (symbol.type === 'property' || symbol.type === 'method') {
        continue;
      }

      // Check incoming calls and dependencies from database
      const incomingCalls = await this.getIncomingCalls(symbol.id);
      const incomingDeps = await this.getIncomingDependencies(symbol.id);

      if (incomingCalls === 0 && incomingDeps === 0) {
        // Multi-signal check: count intra-file references
        const intraFileCount = this.countIntraFileOccurrences(symbol.filePath, symbol.name);

        if (intraFileCount <= 1 && !symbol.isExported) {
          // High confidence: Non-exported symbol, 0 incoming calls/deps, only 1 occurrence in file (declaration)
          deadCode.push({
            symbol,
            reason: 'isolated',
            confidence: 'high',
            recommendations: [
              'Safe to delete: Unexported and unreferenced anywhere in file or project',
              'Verify not used dynamically via reflection or eval',
            ],
          });
        } else if (intraFileCount <= 1 && symbol.isExported) {
          // High confidence: Exported symbol never imported anywhere and never used in file
          deadCode.push({
            symbol,
            reason: 'unused-export',
            confidence: 'high',
            recommendations: [
              'Safe to delete: Exported from file but never imported by any module',
              'Check if part of external public API contract before removal',
            ],
          });
        } else if (symbol.isExported) {
          // Medium confidence: Used inside its file, but export is never consumed externally
          deadCode.push({
            symbol,
            reason: 'unused-export',
            confidence: 'medium',
            recommendations: [
              'Used within declaring file, but exported without external consumers',
              'Consider removing export keyword to make it private',
            ],
          });
        }
      } else if (incomingCalls === 0 && incomingDeps > 0) {
        // Medium confidence: Imported or referenced in type annotation, but never invoked
        deadCode.push({
          symbol,
          reason: 'never-called',
          confidence: 'medium',
          recommendations: [
            'Referenced in types or imports, but never called at runtime',
            'May be part of type system or interface contract',
            'Review importing files to confirm necessity',
          ],
        });
      } else if (incomingCalls > 0 && incomingDeps === 0 && symbol.type === 'function') {
        // Low confidence: Called exclusively by test files
        if (await this.isOnlyCalledByTests(symbol.id)) {
          deadCode.push({
            symbol,
            reason: 'test-only',
            confidence: 'low',
            recommendations: [
              'Only called by test files; no production code callers',
              'Consider extracting to test utility helper or test fixture',
            ],
          });
        }
      }
    }

    return deadCode;
  }

  /**
   * Identify true entry points (should never be considered dead)
   */
  private identifyEntryPoints(symbols: Symbol[]): Set<string> {
    const entryPoints = new Set<string>();

    const rootPatterns = [
      'src/index.ts',
      'src/cli.ts',
      'src/lsp/server.ts',
      'mcp-server/src/index.ts',
    ];

    for (const symbol of symbols) {
      const normalizedPath = symbol.filePath.replace(/\\/g, '/');

      // Package & binary entry points
      if (rootPatterns.some((p) => normalizedPath.endsWith(p) || normalizedPath === p)) {
        entryPoints.add(symbol.id);
        continue;
      }

      // CLI command classes (invoked dynamically by command router)
      if (
        normalizedPath.includes('/commands/') &&
        symbol.type === 'class' &&
        (symbol.name.endsWith('Command') || symbol.name.includes('Command'))
      ) {
        entryPoints.add(symbol.id);
        continue;
      }

      // Explicit entrypoint or public API contract tag
      if (symbol.summary && /@entrypoint/i.test(symbol.summary)) {
        entryPoints.add(symbol.id);
        continue;
      }

      // Standard main, run, or execute root functions
      if (symbol.name === 'main' || symbol.name === 'run' || symbol.name === 'execute') {
        entryPoints.add(symbol.id);
      }
    }

    return entryPoints;
  }

  /**
   * Check if file is a test file
   */
  private isTestFile(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    return (
      normalized.includes('__tests__/') ||
      normalized.includes('.test.') ||
      normalized.includes('.spec.') ||
      normalized.includes('/test/') ||
      normalized.includes('/fixtures/')
    );
  }

  /**
   * Get cached file content
   */
  private getFileContent(filePath: string): string | null {
    if (this.fileContentCache.has(filePath)) {
      return this.fileContentCache.get(filePath) || null;
    }
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      this.fileContentCache.set(filePath, content);
      return content;
    } catch {
      return null;
    }
  }

  /**
   * Count occurrences of symbol name as identifier in the declaring file
   */
  private countIntraFileOccurrences(filePath: string, symbolName: string): number {
    const content = this.getFileContent(filePath);
    if (!content) return 0;
    try {
      const regex = new RegExp(`\\b${this.escapeRegex(symbolName)}\\b`, 'g');
      const matches = content.match(regex);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Escape special characters for RegExp
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get number of incoming calls to a symbol
   */
  private async getIncomingCalls(symbolId: string): Promise<number> {
    try {
      return this.db.countIncomingCalls(symbolId);
    } catch (_error) {
      return 0;
    }
  }

  /**
   * Get number of incoming dependencies to a symbol
   */
  private async getIncomingDependencies(symbolId: string): Promise<number> {
    try {
      return this.db.countIncomingReferences(symbolId);
    } catch (_error) {
      return 0;
    }
  }

  /**
   * Check if symbol is only called by test files
   */
  private async isOnlyCalledByTests(symbolId: string): Promise<boolean> {
    try {
      const callerFilePaths = this.db.getCallerFilePaths(symbolId);
      if (callerFilePaths.length === 0) return false;
      return callerFilePaths.every((filePath) => this.isTestFile(filePath));
    } catch (_error) {
      return false;
    }
  }

  /**
   * Display high-level summary of dead code candidates
   */
  private displaySummaryOnly(deadCode: DeadCodeSymbol[]): void {
    this.printSection('Dead Code Summary Breakdown');

    const byConfidence = {
      high: deadCode.filter((dc) => dc.confidence === 'high'),
      medium: deadCode.filter((dc) => dc.confidence === 'medium'),
      low: deadCode.filter((dc) => dc.confidence === 'low'),
    };

    const byReason: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byDir: Record<string, number> = {};

    for (const dc of deadCode) {
      byReason[dc.reason] = (byReason[dc.reason] || 0) + 1;
      byType[dc.symbol.type] = (byType[dc.symbol.type] || 0) + 1;

      const dir = path.dirname(dc.symbol.filePath);
      byDir[dir] = (byDir[dir] || 0) + 1;
    }

    console.log(`Total Candidates: ${colors.yellow}${deadCode.length}${colors.reset}\n`);
    console.log('By Confidence:');
    console.log(`  • High:   ${colors.red}${byConfidence.high.length}${colors.reset}`);
    console.log(`  • Medium: ${colors.yellow}${byConfidence.medium.length}${colors.reset}`);
    console.log(`  • Low:    ${colors.dim}${byConfidence.low.length}${colors.reset}\n`);

    console.log('By Reason:');
    for (const [r, count] of Object.entries(byReason)) {
      console.log(`  • ${r.padEnd(16)}: ${count}`);
    }
    console.log();

    console.log('By Symbol Type:');
    for (const [t, count] of Object.entries(byType)) {
      console.log(`  • ${t.padEnd(16)}: ${count}`);
    }
    console.log();

    console.log('Top Directories:');
    const sortedDirs = Object.entries(byDir)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [d, count] of sortedDirs) {
      console.log(`  • ${d.padEnd(36)}: ${count}`);
    }
    console.log();
  }

  /**
   * Display dead code results
   */
  private displayResults(deadCode: DeadCodeSymbol[], showAll: boolean): void {
    const byConfidence = {
      high: deadCode.filter((dc) => dc.confidence === 'high'),
      medium: deadCode.filter((dc) => dc.confidence === 'medium'),
      low: deadCode.filter((dc) => dc.confidence === 'low'),
    };

    this.printSection('Summary');
    console.log(`Total dead code candidates: ${colors.yellow}${deadCode.length}${colors.reset}`);
    console.log(`  High confidence: ${colors.red}${byConfidence.high.length}${colors.reset}`);
    console.log(
      `  Medium confidence: ${colors.yellow}${byConfidence.medium.length}${colors.reset}`
    );
    console.log(`  Low confidence: ${colors.dim}${byConfidence.low.length}${colors.reset}`);
    console.log();

    // High confidence (safe to delete or tag)
    if (byConfidence.high.length > 0) {
      this.printSection('High Confidence (Isolated & Safe to Delete)');
      const toShow = showAll ? byConfidence.high : byConfidence.high.slice(0, 20);
      for (const dc of toShow) {
        console.log(
          `  ${colors.red}✗${colors.reset} ${colors.bold}${dc.symbol.name}${colors.reset} (${dc.symbol.type})`
        );
        console.log(
          `    ${colors.dim}${dc.symbol.filePath}:${dc.symbol.line || '?'}${colors.reset}`
        );
        console.log(`    Reason: ${colors.yellow}${dc.reason}${colors.reset}`);
        if (showAll) {
          for (const rec of dc.recommendations) {
            console.log(`      ${colors.dim}- ${rec}${colors.reset}`);
          }
        }
        console.log();
      }

      if (!showAll && byConfidence.high.length > 20) {
        console.log(
          `  ${colors.dim}... and ${byConfidence.high.length - 20} more (use --all to see all)${colors.reset}\n`
        );
      }
    }

    // Medium confidence
    if (byConfidence.medium.length > 0) {
      this.printSection('Medium Confidence (Unused Export / Review Required)');
      const toShow = showAll ? byConfidence.medium : byConfidence.medium.slice(0, 10);
      for (const dc of toShow) {
        console.log(`  ${colors.yellow}⚠${colors.reset} ${dc.symbol.name} (${dc.symbol.type})`);
        console.log(
          `    ${colors.dim}${dc.symbol.filePath}:${dc.symbol.line || '?'}${colors.reset}`
        );
        console.log(`    Reason: ${dc.reason}`);
        console.log();
      }

      if (!showAll && byConfidence.medium.length > 10) {
        console.log(
          `  ${colors.dim}... and ${byConfidence.medium.length - 10} more (use --all to see all)${colors.reset}\n`
        );
      }
    }

    this.printSection('Actions & Next Steps');
    if (byConfidence.high.length > 0) {
      console.log('  1. Tag candidates automatically in source code:');
      console.log(
        `     ${colors.cyan}tsdoc-edge detect-dead-code --tag --dry-run${colors.reset}  (preview)`
      );
      console.log(
        `     ${colors.cyan}tsdoc-edge detect-dead-code --tag${colors.reset}            (apply)`
      );
      console.log();
      console.log('  2. Explore symbols already tagged:');
      console.log(`     ${colors.cyan}tsdoc-edge detect-dead-code --tagged${colors.reset}`);
      console.log();
      console.log('  3. Filter by directory or type:');
      console.log(
        `     ${colors.cyan}tsdoc-edge detect-dead-code src/analyzer --type interface${colors.reset}`
      );
    } else {
      this.printSuccess('No high-confidence dead code found!');
    }
    console.log();
  }
}
