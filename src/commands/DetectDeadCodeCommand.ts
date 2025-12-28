/**
 * Detect Dead Code command - Find unused code based on call graph analysis
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import type { Symbol } from '../types/graph/graph';

/**
 * Dead code detection result
 */
interface DeadCodeSymbol {
  symbol: Symbol;
  reason: 'never-called' | 'no-imports' | 'isolated' | 'test-only';
  confidence: 'high' | 'medium' | 'low';
  recommendations: string[];
}

/**
 * Command for detecting unused/dead code
 *
 * @doc [[DetectDeadCodeCommand]]
 * @public
 * @responsibility Detect code that is never used based on call graph and dependency analysis
 * @contract Analyze symbols and relationships to find dead code candidates
 *
 * @problem Codebases accumulate unused code over time, wasting maintenance effort
 * @solves Uses SSOT data (calls, dependencies, documentation) to identify safe-to-delete code
 * @context After achieving high documentation coverage, can confidently identify orphaned code
 *
 * @functionality
 * - Call graph analysis: Find functions never called
 * - Import analysis: Find symbols never imported
 * - Isolation detection: Find completely disconnected code
 * - Safety scoring: Confidence levels for deletion
 * - Exclusion rules: Respect entry points, exports, tests
 *
 * @decision Use multi-signal approach (calls + imports + docs)
 * @rationale Single signal may have false positives; combining signals increases confidence
 * @consequences More conservative but safer dead code detection
 *
 * @depends DatabaseManager
 * @depType internal
 * @depReason Need symbol and relationship data
 */
export class DetectDeadCodeCommand extends BaseCommand {
  private db: DatabaseManager;

  constructor(db?: DatabaseManager) {
    super();
    this.db = db || new DatabaseManager();
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
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Detect unused/dead code based on call graph and dependency analysis';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return 'tsdoc-edge detect-dead-code [options]\n\n  Options:\n    --all              Show all candidates (including low confidence)\n    --confidence=LEVEL Filter by confidence (high/medium/low)';
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const showAll = args.includes('--all');
      const confidenceFilter = this.getConfidenceFilter(args);

      this.printHeader('Dead Code Detection');

      // Get all symbols
      const allSymbols = await this.getAllSymbols();
      this.printInfo(`Analyzing ${allSymbols.length} symbols...`);
      console.log();

      // Detect dead code
      const deadCode = await this.detectDeadCode(allSymbols);

      // Filter by confidence
      const filtered = deadCode.filter((dc) => {
        if (confidenceFilter === 'high') return dc.confidence === 'high';
        if (confidenceFilter === 'medium') return dc.confidence === 'high' || dc.confidence === 'medium';
        return true; // all
      });

      // Display results
      this.displayResults(filtered, showAll);

      // Close database connection
      this.db.close();

      return this.success();
    });
  }

  /**
   * Get confidence filter from args
   */
  private getConfidenceFilter(args: string[]): 'high' | 'medium' | 'all' {
    if (args.includes('--high')) return 'high';
    if (args.includes('--medium')) return 'medium';
    return 'all';
  }

  /**
   * Get all symbols from database
   */
  private async getAllSymbols(): Promise<Symbol[]> {
    try {
      return await this.db.getAllSymbols();
    } catch (error) {
      return [];
    }
  }

  /**
   * Detect dead code symbols
   */
  private async detectDeadCode(symbols: Symbol[]): Promise<DeadCodeSymbol[]> {
    const deadCode: DeadCodeSymbol[] = [];

    // Get entry points (commands, exports, public APIs)
    const entryPoints = this.identifyEntryPoints(symbols);

    for (const symbol of symbols) {
      // Skip entry points
      if (entryPoints.has(symbol.id)) {
        continue;
      }

      // Skip test files (not dead code, just test infrastructure)
      if (this.isTestFile(symbol.filePath)) {
        continue;
      }

      // Skip private class members (properties, methods)
      // These are internal implementation details, not dead code
      if (symbol.type === 'property' || symbol.type === 'method') {
        continue;
      }

      // Check if symbol is called
      const incomingCalls = await this.getIncomingCalls(symbol.id);
      const incomingDeps = await this.getIncomingDependencies(symbol.id);

      // Detect dead code conditions
      if (incomingCalls === 0 && incomingDeps === 0) {
        // High confidence: Never called AND never imported
        deadCode.push({
          symbol,
          reason: 'isolated',
          confidence: 'high',
          recommendations: [
            'Safe to delete: No incoming calls or dependencies',
            'Verify not used dynamically (reflection, eval)',
            'Check if part of public API contract',
          ],
        });
      } else if (incomingCalls === 0 && incomingDeps > 0) {
        // Medium confidence: Imported but never called
        deadCode.push({
          symbol,
          reason: 'never-called',
          confidence: 'medium',
          recommendations: [
            'Imported but never used',
            'May be part of type system or interface',
            'Review importing files',
          ],
        });
      } else if (incomingCalls > 0 && incomingDeps === 0 && symbol.type === 'function') {
        // Low confidence: Called but no imports (internal use only)
        if (await this.isOnlyCalledByTests(symbol.id)) {
          deadCode.push({
            symbol,
            reason: 'test-only',
            confidence: 'medium',
            recommendations: [
              'Only called by test files',
              'Consider if test utility or legitimate feature',
              'May be candidate for test-utils extraction',
            ],
          });
        }
      }
    }

    return deadCode;
  }

  /**
   * Identify entry points (should never be considered dead)
   * Enhanced to reduce false positives
   */
  private identifyEntryPoints(symbols: Symbol[]): Set<string> {
    const entryPoints = new Set<string>();

    for (const symbol of symbols) {
      // Commands are entry points
      if (symbol.filePath.includes('/commands/') && symbol.type === 'class') {
        entryPoints.add(symbol.id);
      }

      // Exported symbols (public API)
      if (symbol.isExported || symbol.isPublic) {
        entryPoints.add(symbol.id);
      }

      // All exports from index.ts files
      if (symbol.filePath.endsWith('/index.ts') || symbol.filePath.endsWith('/index.ts')) {
        entryPoints.add(symbol.id);
      }

      // CLI entry point and its dependencies
      if (symbol.filePath.includes('cli.ts') || symbol.filePath.endsWith('cli.ts')) {
        entryPoints.add(symbol.id);
      }

      // Main, run, execute functions
      if (symbol.name === 'main' || symbol.name === 'run' || symbol.name === 'execute') {
        entryPoints.add(symbol.id);
      }

      // Types and interfaces are always "used" if exported (type system)
      if ((symbol.type === 'interface' || symbol.type === 'type') && symbol.isExported) {
        entryPoints.add(symbol.id);
      }

      // Analyzers are entry points (used by commands)
      if (symbol.filePath.includes('/analyzer/') && symbol.type === 'class') {
        entryPoints.add(symbol.id);
      }
    }

    return entryPoints;
  }

  /**
   * Check if file is a test file
   */
  private isTestFile(filePath: string): boolean {
    return (
      filePath.includes('__tests__/') ||
      filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      filePath.includes('/test/')
    );
  }

  /**
   * Get number of incoming calls to a symbol
   */
  private async getIncomingCalls(symbolId: string): Promise<number> {
    try {
      return this.db.countIncomingCalls(symbolId);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get number of incoming dependencies to a symbol
   * Now checks multiple relationship types for better accuracy
   */
  private async getIncomingDependencies(symbolId: string): Promise<number> {
    try {
      // Check multiple relationship types:
      // - code-dependency: import statements
      // - calls: function/method calls
      // - inheritance: extends/implements
      // - type-dependency: type annotations
      return this.db.countIncomingReferences(symbolId);
    } catch (error) {
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
    } catch (error) {
      return false;
    }
  }

  /**
   * Display dead code results
   */
  private displayResults(deadCode: DeadCodeSymbol[], showAll: boolean): void {
    // Group by confidence
    const byConfidence = {
      high: deadCode.filter((dc) => dc.confidence === 'high'),
      medium: deadCode.filter((dc) => dc.confidence === 'medium'),
      low: deadCode.filter((dc) => dc.confidence === 'low'),
    };

    // Summary
    this.printSection('Summary');
    console.log(`Total dead code candidates: ${colors.yellow}${deadCode.length}${colors.reset}`);
    console.log(`  High confidence: ${colors.red}${byConfidence.high.length}${colors.reset}`);
    console.log(`  Medium confidence: ${colors.yellow}${byConfidence.medium.length}${colors.reset}`);
    console.log(`  Low confidence: ${colors.dim}${byConfidence.low.length}${colors.reset}`);
    console.log();

    // High confidence (safe to delete)
    if (byConfidence.high.length > 0) {
      this.printSection('High Confidence (Safe to Delete)');
      const toShow = showAll ? byConfidence.high : byConfidence.high.slice(0, 20);
      for (const dc of toShow) {
        console.log(`  ${colors.red}✗${colors.reset} ${dc.symbol.name} (${dc.symbol.type})`);
        console.log(`    ${colors.dim}${dc.symbol.filePath}:${dc.symbol.line || '?'}${colors.reset}`);
        console.log(`    Reason: ${dc.reason}`);
        if (showAll) {
          dc.recommendations.forEach((rec) => {
            console.log(`      ${colors.dim}- ${rec}${colors.reset}`);
          });
        }
        console.log();
      }

      if (!showAll && byConfidence.high.length > 20) {
        console.log(`  ${colors.dim}... and ${byConfidence.high.length - 20} more (use --all to see all)${colors.reset}`);
        console.log();
      }
    }

    // Medium confidence
    if (byConfidence.medium.length > 0) {
      this.printSection('Medium Confidence (Review Before Deleting)');
      const toShow = showAll ? byConfidence.medium : byConfidence.medium.slice(0, 10);
      for (const dc of toShow) {
        console.log(`  ${colors.yellow}⚠${colors.reset} ${dc.symbol.name} (${dc.symbol.type})`);
        console.log(`    ${colors.dim}${dc.symbol.filePath}${colors.reset}`);
        console.log(`    Reason: ${dc.reason}`);
        console.log();
      }

      if (!showAll && byConfidence.medium.length > 10) {
        console.log(`  ${colors.dim}... and ${byConfidence.medium.length - 10} more (use --all)${colors.reset}`);
        console.log();
      }
    }

    // Next steps
    this.printSection('Next Steps');
    if (byConfidence.high.length > 0) {
      console.log(`  1. Review high confidence candidates (${byConfidence.high.length} symbols)`);
      console.log(`  2. Verify not used via reflection or dynamic imports`);
      console.log(`  3. Run tests after deletion to ensure nothing breaks`);
      console.log(`  4. Remove in small batches with separate commits`);
    } else {
      this.printSuccess('No high-confidence dead code found!');
    }
    console.log();

    // CLI hints
    this.printSection('Options');
    console.log(`  --all          Show all dead code candidates`);
    console.log(`  --high         Show only high confidence (safe to delete)`);
    console.log(`  --medium       Show high and medium confidence`);
    console.log();
  }
}
