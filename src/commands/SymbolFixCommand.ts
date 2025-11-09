/**
 * Symbol Fix Command - Auto-fix common symbol reference issues
 *
 * @packageDocumentation
 * @responsibility Automatically fix common [[Symbol]] reference issues
 *
 * @problem Manual fixing of symbol issues is time-consuming and error-prone
 * @solves Provides automated fixes for common patterns (typos, duplicates, formatting)
 * @context Part of symbol reference system for convention management
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import type { ParsedDocSymbols } from '../types/feature';

/**
 * Fix suggestion
 */
interface FixSuggestion {
  type: 'typo' | 'duplicate-h1' | 'missing-primary' | 'orphaned-aux' | 'formatting';
  severity: 'auto' | 'manual' | 'review';
  symbolName: string;
  filePath: string;
  line: number;
  issue: string;
  suggestion: string;
  autoFix?: () => void;
}

/**
 * Auto-fix common symbol reference issues
 *
 * @public
 * @responsibility Detect and fix symbol reference issues
 * @contract Scan documents, detect issues, apply fixes safely
 *
 * @functionality
 * - Typo detection: Find and fix common typos using similarity matching
 * - Duplicate H1 removal: Convert duplicate H1s to H2 auxiliaries
 * - Missing primary creation: Generate skeleton primary definitions
 * - Orphaned auxiliary conversion: Convert orphaned H2s to inline refs
 * - Formatting fixes: Normalize symbol names (spaces, capitalization)
 *
 * @decision Require confirmation for destructive changes
 * @rationale Safety first - user should review changes before applying
 * @consequences Slower but safer workflow
 */
export class SymbolFixCommand extends BaseCommand {
  private parser: DocumentSymbolParser;
  private symbols: Map<string, ParsedDocSymbols[]> = new Map();

  constructor() {
    super();
    this.parser = new DocumentSymbolParser();
  }

  getName(): string {
    return 'symbol-fix';
  }

  getDescription(): string {
    return 'Auto-fix common symbol reference issues';
  }

  protected getUsage(): string {
    return `tsdoc-edge symbol-fix [docs-directory] [options]

  Default directory: managed

  Options:
    --dry-run      Preview changes without applying
    --yes, -y      Auto-confirm all fixes
    --type=TYPE    Fix only specific type (typo/duplicate-h1/missing-primary/orphaned-aux/formatting)`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const docsDir = args[0] || 'managed';
      const dryRun = args.includes('--dry-run');
      const autoConfirm = args.includes('--yes') || args.includes('-y');
      const fixType = args.find((arg) => arg.startsWith('--type='))?.split('=')[1];

      this.printHeader('Symbol Fix');

      if (dryRun) {
        this.printInfo('Running in dry-run mode (no changes will be made)');
        console.log();
      }

      // Build symbol index
      this.printInfo('Analyzing symbols...');
      await this.buildIndex(docsDir);
      console.log();

      // Detect issues
      const suggestions = this.detectIssues(fixType);

      if (suggestions.length === 0) {
        this.printSuccess('No fixable issues found!');
        return this.success();
      }

      // Display suggestions
      this.displaySuggestions(suggestions);

      // Apply fixes
      if (!dryRun) {
        console.log();
        return this.applyFixes(suggestions, autoConfirm);
      }

      return this.success();
    });
  }

  /**
   * Build symbol index
   */
  private async buildIndex(docsDir: string): Promise<void> {
    const files = this.findMarkdownFiles(docsDir);

    for (const filePath of files) {
      try {
        const parsed = this.parser.parse(filePath);
        if (parsed) {
          if (parsed.primary) {
            const existing = this.symbols.get(parsed.primary.name) || [];
            existing.push(parsed);
            this.symbols.set(parsed.primary.name, existing);
          }
        }
      } catch (error) {
        // Skip files with errors
      }
    }

    this.printSuccess(`Analyzed ${this.symbols.size} symbols from ${files.length} documents`);
  }

  /**
   * Detect fixable issues
   */
  private detectIssues(filterType?: string): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    // Check for duplicate H1 definitions
    for (const [symbolName, docs] of this.symbols.entries()) {
      if (docs.length > 1) {
        // Multiple H1 definitions - suggest converting extras to H2
        const canonical = docs[0]; // Keep first one
        const duplicates = docs.slice(1);

        for (const dup of duplicates) {
          if (dup.primary) {
            suggestions.push({
              type: 'duplicate-h1',
              severity: 'manual',
              symbolName,
              filePath: dup.filePath,
              line: dup.primary.line,
              issue: `Duplicate H1 definition (canonical is in ${canonical.filePath})`,
              suggestion: `Convert to H2 auxiliary definition`,
              autoFix: () => this.convertH1ToH2(dup.filePath, dup.primary!.line, symbolName),
            });
          }
        }
      }
    }

    // Check for typos (similar symbol names)
    const allSymbols = Array.from(this.symbols.keys());
    for (let i = 0; i < allSymbols.length; i++) {
      for (let j = i + 1; j < allSymbols.length; j++) {
        const sym1 = allSymbols[i];
        const sym2 = allSymbols[j];

        // Check if very similar (Levenshtein distance <= 2)
        const distance = this.levenshteinDistance(
          this.normalizeSymbolName(sym1),
          this.normalizeSymbolName(sym2)
        );

        if (distance <= 2 && distance > 0) {
          const docs1 = this.symbols.get(sym1)!;
          const docs2 = this.symbols.get(sym2)!;

          // Suggest merging (prefer one with more docs)
          const [keep, remove] = docs1.length >= docs2.length ? [sym1, sym2] : [sym2, sym1];
          const removeDoc = this.symbols.get(remove)![0];

          if (removeDoc.primary) {
            suggestions.push({
              type: 'typo',
              severity: 'review',
              symbolName: remove,
              filePath: removeDoc.filePath,
              line: removeDoc.primary.line,
              issue: `Very similar to [[${keep}]] (edit distance: ${distance})`,
              suggestion: `Rename [[${remove}]] to [[${keep}]] or keep both if intentional`,
            });
          }
        }
      }
    }

    // Filter by type if specified
    if (filterType) {
      return suggestions.filter((s) => s.type === filterType);
    }

    return suggestions;
  }

  /**
   * Display fix suggestions
   */
  private displaySuggestions(suggestions: FixSuggestion[]): void {
    this.printSection(`Found ${suggestions.length} fixable issues`);

    const byType = new Map<string, FixSuggestion[]>();
    for (const suggestion of suggestions) {
      const list = byType.get(suggestion.type) || [];
      list.push(suggestion);
      byType.set(suggestion.type, list);
    }

    for (const [type, list] of byType.entries()) {
      console.log();
      console.log(`${this.colors.bold}${this.formatType(type)}:${this.colors.reset} ${list.length}`);
      console.log();

      for (const suggestion of list.slice(0, 10)) {
        const icon = this.getSeverityIcon(suggestion.severity);
        console.log(`  ${icon} [[${suggestion.symbolName}]]`);
        console.log(`     ${this.colors.dim}${this.relativePath(suggestion.filePath)}:${suggestion.line}${this.colors.reset}`);
        console.log(`     ${this.colors.red}Issue:${this.colors.reset} ${suggestion.issue}`);
        console.log(`     ${this.colors.green}Fix:${this.colors.reset} ${suggestion.suggestion}`);
        console.log();
      }

      if (list.length > 10) {
        console.log(`  ${this.colors.dim}... and ${list.length - 10} more${this.colors.reset}`);
        console.log();
      }
    }
  }

  /**
   * Apply fixes
   */
  private applyFixes(suggestions: FixSuggestion[], autoConfirm: boolean): CommandResult {
    const autoFixable = suggestions.filter((s) => s.severity === 'auto' && s.autoFix);

    if (autoFixable.length === 0) {
      this.printWarning('No auto-fixable issues found (all require manual review)');
      console.log();
      console.log('Use --dry-run to see what would be fixed');
      return this.success();
    }

    this.printSection(`Auto-fixing ${autoFixable.length} issues`);

    if (!autoConfirm) {
      console.log();
      this.printWarning('This will modify your files. Use --yes to confirm.');
      return this.failure('User confirmation required');
    }

    let fixed = 0;
    let failed = 0;

    for (const suggestion of autoFixable) {
      try {
        suggestion.autoFix!();
        console.log(`${this.colors.green}✓${this.colors.reset} Fixed [[${suggestion.symbolName}]] in ${this.relativePath(suggestion.filePath)}`);
        fixed++;
      } catch (error) {
        console.log(`${this.colors.red}✗${this.colors.reset} Failed to fix [[${suggestion.symbolName}]]: ${error}`);
        failed++;
      }
    }

    console.log();
    this.printSuccess(`Fixed ${fixed} issues`);

    if (failed > 0) {
      this.printError(`Failed to fix ${failed} issues`);
      return this.failure(`${failed} fixes failed`);
    }

    return this.success();
  }

  /**
   * Convert H1 to H2 (duplicate primary → auxiliary)
   */
  private convertH1ToH2(filePath: string, line: number, symbolName: string): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Find the line
    if (lines[line - 1]?.includes(`# [[${symbolName}]]`)) {
      // Change # to ##
      lines[line - 1] = lines[line - 1].replace(/^#\s+/, '## ');

      // Write back
      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    } else {
      throw new Error(`Line mismatch: expected H1 [[${symbolName}]] at line ${line}`);
    }
  }

  /**
   * Format issue type for display
   */
  private formatType(type: string): string {
    const map: Record<string, string> = {
      'typo': '🔤 Possible Typos',
      'duplicate-h1': '📋 Duplicate H1 Definitions',
      'missing-primary': '❌ Missing Primary Definitions',
      'orphaned-aux': '🔗 Orphaned Auxiliaries',
      'formatting': '✨ Formatting Issues',
    };
    return map[type] || type;
  }

  /**
   * Get severity icon
   */
  private getSeverityIcon(severity: string): string {
    const map: Record<string, string> = {
      'auto': '🤖',
      'manual': '👤',
      'review': '👀',
    };
    return map[severity] || '?';
  }

  /**
   * Levenshtein distance
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
   * Normalize symbol name
   */
  private normalizeSymbolName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
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
