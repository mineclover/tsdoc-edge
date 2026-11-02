/**
 * Validate Symbol References Command - `[[Symbol]]` reference consistency validation
 *
 * @packageDocumentation
 * @doc [[ValidateSymbolRefsCommand]]
 * @responsibility Validate all `[[Symbol]]` references across Markdown documentation
 *
 * @problem Multiple docs may define the same symbol, or references may point to missing checkpoints
 * @solves Parse Markdown checkpoints via `DocumentSymbolParser`, detect duplicate H1s and broken references, and report authored reference cycles
 * @context Enforce SSOT (Single Source of Truth) for documentation symbols
 * @functionality Scans Markdown documents via `DocumentSymbolParser` to detect duplicate H1 definitions, broken `[[Symbol]]` and `[[Symbol#Section]]` references, and authored circular reference chains
 * @sideEffect console: Writes `[[Symbol]]` reference consistency diagnostics or `--json` payloads to stdout
 * @sideEffect filesystem: Recursively scans and reads managed Markdown files on disk, and optionally writes skeleton docs when `--fix` is passed
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Symbol definition in a document
 */
interface SymbolDefinition {
  symbolName: string;
  filePath: string;
  isH1: boolean;
  lineNumber: number;
}

/**
 * Symbol reference in a document
 */
interface SymbolReference {
  symbolName: string;
  section?: string;
  filePath: string;
  lineNumber: number;
}

/**
 * Validation issue
 */
interface ValidationIssue {
  type:
    | 'duplicate-definition'
    | 'broken-reference'
    | 'ambiguous-reference'
    | 'mismatch'
    | 'circular-dependency';
  severity: 'error' | 'warning' | 'info';
  symbolName: string;
  filePath: string;
  lineNumber?: number;
  message: string;
  suggestion?: string;
  cycle?: string[];
}

/**
 * Symbol registry result
 */
interface SymbolRegistry {
  definitions: Map<string, SymbolDefinition[]>;
  references: SymbolReference[];
  issues: ValidationIssue[];
  statistics: {
    totalDefinitions: number;
    totalReferences: number;
    uniqueSymbols: number;
    duplicates: number;
    brokenReferences: number;
    circularDependencies: number;
  };
}

/**
 * Validate Symbol References Command
 *
 * @doc [[ValidateSymbolRefsCommand]]
 * @sideEffect console: Writes symbol reference validation diagnostics to stdout; reads managed Markdown files
 * @public
 */
export class ValidateSymbolRefsCommand extends BaseCommand {
  constructor(private parser?: DocumentSymbolParser) {
    super();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'validate-symbol-refs';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Validate [[Symbol]] references and detect duplicates';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return (
      'tsdoc-edge validate refs [docs-directory] [--fix] [--json]\n\n' +
      '  Default: managed\n' +
      '  Options:\n' +
      '    --fix    Fix detected issues automatically\n' +
      '    --json   Output structured JSON report'
    );
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns `Promise<CommandResult>`
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const flagError = this.validateAllowedFlags(args, ['--fix', '--json']);
      if (flagError) {
        return flagError;
      }

      const fixMode = this.hasFlag(args, '--fix');
      const jsonMode = this.hasFlag(args, '--json');
      const positionalArgs = this.getPositionalArgs(args);
      const docsDir = positionalArgs[0] || 'managed';
      const docsPath = path.resolve(process.cwd(), docsDir);

      if (!fs.existsSync(docsPath)) {
        const message = `Directory not found: ${docsPath}`;
        if (jsonMode) {
          console.log(
            JSON.stringify(
              {
                valid: false,
                docsDir,
                error: message,
              },
              null,
              2
            )
          );
        } else {
          this.printError(message);
        }
        return this.failure(message);
      }

      if (!jsonMode) {
        this.printHeader('Validate Symbol References');
        console.log(`📁 Scanning: ${docsDir}`);
        console.log();
        this.printInfo('Building symbol registry...');
      }

      const parser = this.parser || new DocumentSymbolParser();
      const registry = this.buildSymbolRegistry(docsPath, parser);

      let fixedCount = 0;
      if (fixMode && registry.issues.length > 0) {
        if (!jsonMode) {
          this.displayStatistics(registry);
          console.log();
          this.displayIssues(registry, fixMode);
          console.log();
          this.printSection('Fixing Issues');
        }
        fixedCount = this.fixIssues(registry, !jsonMode);
        if (!jsonMode) {
          this.printSuccess(`Fixed ${fixedCount} issues`);
          console.log();
        }
      } else if (!jsonMode) {
        this.displayStatistics(registry);
        if (registry.issues.length > 0) {
          console.log();
          this.displayIssues(registry, fixMode);
        }
        console.log();
      }

      const errorCount = registry.issues.filter((i) => i.severity === 'error').length;
      const warningCount = registry.issues.filter((i) => i.severity === 'warning').length;
      const infoCount = registry.issues.filter((i) => i.severity === 'info').length;

      if (jsonMode) {
        console.log(
          JSON.stringify(
            {
              valid: errorCount === 0,
              docsDir,
              statistics: registry.statistics,
              counts: {
                errors: errorCount,
                warnings: warningCount,
                info: infoCount,
              },
              issues: registry.issues,
              ...(fixMode ? { fixedCount } : {}),
            },
            null,
            2
          )
        );
      }

      if (errorCount > 0) {
        return this.failure(`Found ${errorCount} errors`);
      }

      return this.success('All symbol references are valid');
    });
  }

  /**
   * Build symbol registry from all Markdown documentation files in target directory
   */
  private buildSymbolRegistry(docsPath: string, parser: DocumentSymbolParser): SymbolRegistry {
    const registry: SymbolRegistry = {
      definitions: new Map(),
      references: [],
      issues: [],
      statistics: {
        totalDefinitions: 0,
        totalReferences: 0,
        uniqueSymbols: 0,
        duplicates: 0,
        brokenReferences: 0,
        circularDependencies: 0,
      },
    };

    const files = this.findMarkdownFiles(docsPath);

    for (const filePath of files) {
      const parsed = parser.parse(filePath, { forceManaged: true });
      if (!parsed) {
        continue;
      }

      if (parsed.primary) {
        this.addDefinition(registry, parsed.primary.name, filePath, parsed.primary.line, true);
      }

      for (const aux of parsed.auxiliaries) {
        this.addDefinition(registry, aux.name, filePath, aux.line, false);
      }

      for (const ref of parsed.references) {
        registry.references.push({
          symbolName: ref.name,
          section: ref.section,
          filePath,
          lineNumber: ref.line,
        });
      }
    }

    const externalResolvable = this.collectCanonicalSymbols(docsPath, parser);

    registry.statistics.uniqueSymbols = registry.definitions.size;
    registry.statistics.totalDefinitions = Array.from(registry.definitions.values()).reduce(
      (sum, defs) => sum + defs.length,
      0
    );
    registry.statistics.totalReferences = registry.references.length;

    // Detect duplicate H1 primary definitions and ambiguous orphaned auxiliary headings
    for (const [symbolName, definitions] of registry.definitions.entries()) {
      const h1Defs = definitions.filter((d) => d.isH1);
      const auxDefs = definitions.filter((d) => !d.isH1);

      if (h1Defs.length > 1) {
        registry.statistics.duplicates++;
        registry.issues.push({
          type: 'duplicate-definition',
          severity: 'error',
          symbolName,
          filePath: h1Defs.map((d) => d.filePath).join(', '),
          lineNumber: h1Defs[0].lineNumber,
          message: `Symbol [[${symbolName}]] is defined as H1 in ${h1Defs.length} files`,
          suggestion: 'Keep only one H1 definition, move others to references',
        });
      } else if (h1Defs.length === 0 && auxDefs.length > 1 && !externalResolvable.has(symbolName)) {
        registry.statistics.duplicates++;
        registry.issues.push({
          type: 'ambiguous-reference',
          severity: 'warning',
          symbolName,
          filePath: auxDefs.map((d) => d.filePath).join(', '),
          lineNumber: auxDefs[0].lineNumber,
          message: `Symbol [[${symbolName}]] has ${auxDefs.length} auxiliary definitions without a canonical H1 definition`,
          suggestion: `Create managed/relationships/${this.normalizeSymbolName(symbolName)}.md`,
        });
      }
    }

    // Validate references against H1 primaries, unique H2/H3 auxiliary hubs, and canonical managed definitions
    for (const ref of registry.references) {
      const definitions = registry.definitions.get(ref.symbolName) ?? [];
      const h1Count = definitions.filter((d) => d.isH1).length;
      const auxCount = definitions.filter((d) => !d.isH1).length;
      const isResolved =
        h1Count >= 1 || (h1Count === 0 && auxCount === 1) || externalResolvable.has(ref.symbolName);

      if (!isResolved) {
        registry.statistics.brokenReferences++;
        const displayRef = ref.section ? `${ref.symbolName}#${ref.section}` : ref.symbolName;
        registry.issues.push({
          type: 'broken-reference',
          severity: 'error',
          symbolName: ref.symbolName,
          filePath: ref.filePath,
          lineNumber: ref.lineNumber,
          message: `Reference to [[${displayRef}]] but symbol [[${ref.symbolName}]] is not defined`,
          suggestion: this.findSimilarSymbol(
            ref.symbolName,
            registry.definitions,
            externalResolvable
          ),
        });
      }
    }

    // Detect document-level circular dependencies from authored body references only
    this.detectCircularDependencies(registry);

    return registry;
  }

  /**
   * Preload canonical resolvable symbol names from `managed/` when validating another directory
   */
  private collectCanonicalSymbols(docsPath: string, parser: DocumentSymbolParser): Set<string> {
    const resolvedDocsPath = path.resolve(docsPath);
    const managedPath = path.resolve(process.cwd(), 'managed');
    const resolvable = new Set<string>();

    if (resolvedDocsPath === managedPath || !fs.existsSync(managedPath)) {
      return resolvable;
    }

    const externalPrimaries = new Set<string>();
    const externalAuxCounts = new Map<string, number>();

    for (const filePath of this.findMarkdownFiles(managedPath)) {
      const resolvedFile = path.resolve(filePath);
      if (
        resolvedFile === resolvedDocsPath ||
        resolvedFile.startsWith(`${resolvedDocsPath}${path.sep}`)
      ) {
        continue;
      }

      try {
        const parsed = parser.parse(filePath);
        if (!parsed) {
          continue;
        }
        if (parsed.primary) {
          externalPrimaries.add(parsed.primary.name);
        }
        for (const aux of parsed.auxiliaries) {
          externalAuxCounts.set(aux.name, (externalAuxCounts.get(aux.name) ?? 0) + 1);
        }
      } catch (_error) {
        // Keep target validation scoped to the requested directory.
      }
    }

    for (const primary of externalPrimaries) {
      resolvable.add(primary);
    }
    for (const [auxName, count] of externalAuxCounts.entries()) {
      if (count === 1) {
        resolvable.add(auxName);
      }
    }

    return resolvable;
  }

  /**
   * Detect circular dependencies between documents using authored body references
   */
  private detectCircularDependencies(registry: SymbolRegistry): void {
    const docDependencies = new Map<string, Set<string>>();

    for (const ref of registry.references) {
      const defs = registry.definitions.get(ref.symbolName);
      if (!defs || defs.length === 0) {
        continue;
      }

      const h1Defs = defs.filter((d) => d.isH1);
      const auxDefs = defs.filter((d) => !d.isH1);
      const resolvedDefs = h1Defs.length > 0 ? h1Defs : auxDefs.length === 1 ? auxDefs : [];
      if (resolvedDefs.length === 0) {
        continue;
      }

      let targetSet = docDependencies.get(ref.filePath);
      if (!targetSet) {
        targetSet = new Set<string>();
        docDependencies.set(ref.filePath, targetSet);
      }

      for (const def of resolvedDefs) {
        if (def.filePath !== ref.filePath) {
          targetSet.add(def.filePath);
        }
      }
    }

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const detectedCycles = new Set<string>();

    const dfs = (file: string, currentPath: string[]): void => {
      visited.add(file);
      recursionStack.add(file);

      const dependencies = docDependencies.get(file);
      if (dependencies) {
        for (const depFile of dependencies) {
          if (!visited.has(depFile)) {
            dfs(depFile, [...currentPath, file]);
          } else if (recursionStack.has(depFile)) {
            const cycleStart = currentPath.indexOf(depFile);
            const cycle = [...currentPath.slice(cycleStart), file, depFile];
            const cycleKey = [...new Set(cycle)].sort().join('->');

            if (!detectedCycles.has(cycleKey)) {
              detectedCycles.add(cycleKey);

              const symbolsInvolved = new Set<string>();
              for (let i = 0; i < cycle.length - 1; i++) {
                const fromFile = cycle[i];
                const toFile = cycle[i + 1];

                for (const ref of registry.references) {
                  if (ref.filePath === fromFile) {
                    const defs = registry.definitions.get(ref.symbolName);
                    if (defs?.some((d) => d.filePath === toFile)) {
                      symbolsInvolved.add(ref.symbolName);
                    }
                  }
                }
              }

              registry.issues.push({
                type: 'circular-dependency',
                severity: 'info',
                symbolName: Array.from(symbolsInvolved).join(', '),
                filePath: cycle.join(' -> '),
                message: `Circular dependency detected: ${cycle.length - 1} files form a cycle`,
                suggestion: 'Consider breaking the cycle only if strict DAG navigation is required',
                cycle,
              });

              registry.statistics.circularDependencies++;
            }
          }
        }
      }

      recursionStack.delete(file);
    };

    for (const file of docDependencies.keys()) {
      if (!visited.has(file)) {
        dfs(file, []);
      }
    }
  }

  /**
   * Add symbol definition to registry
   */
  private addDefinition(
    registry: SymbolRegistry,
    symbolName: string,
    filePath: string,
    lineNumber: number,
    isH1: boolean
  ): void {
    const existing = registry.definitions.get(symbolName);
    if (existing) {
      existing.push({
        symbolName,
        filePath,
        lineNumber,
        isH1,
      });
    } else {
      registry.definitions.set(symbolName, [
        {
          symbolName,
          filePath,
          lineNumber,
          isH1,
        },
      ]);
    }
  }

  /**
   * Find similar symbol names for typo suggestions
   */
  private findSimilarSymbol(
    targetName: string,
    definitions: Map<string, SymbolDefinition[]>,
    externalResolvable: ReadonlySet<string>
  ): string {
    const normalized = this.normalizeSymbolName(targetName);
    const candidateNames = new Set<string>([...definitions.keys(), ...externalResolvable]);

    for (const symbolName of candidateNames) {
      const symNormalized = this.normalizeSymbolName(symbolName);
      if (!symNormalized || !normalized) {
        continue;
      }

      if (symNormalized.includes(normalized) || normalized.includes(symNormalized)) {
        return `Did you mean [[${symbolName}]]?`;
      }

      if (this.levenshteinDistance(normalized, symNormalized) <= 3) {
        return `Did you mean [[${symbolName}]]?`;
      }
    }

    return `Create managed/relationships/${normalized}.md`;
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
   * Calculate Levenshtein distance between two strings
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
   * Find all Markdown documentation files recursively (excluding raw `.mmd` files and excluded directories)
   */
  private findMarkdownFiles(dir: string, excludeDirs?: string[]): string[] {
    if (fs.statSync(dir).isFile()) {
      return dir.endsWith('.md') || dir.endsWith('.mdx') ? [dir] : [];
    }

    const files: string[] = [];
    const resolvedExcludeDirs =
      excludeDirs ?? ConfigManager.getInstance().get().validation?.excludeDirs ?? [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'dist' ||
          resolvedExcludeDirs.includes(entry.name)
        ) {
          continue;
        }
        files.push(...this.findMarkdownFiles(fullPath, resolvedExcludeDirs));
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Display statistics
   */
  private displayStatistics(registry: SymbolRegistry): void {
    this.printSection('Symbol Registry Statistics');

    console.log(
      `  Unique symbols: ${colors.cyan}${registry.statistics.uniqueSymbols}${colors.reset}`
    );
    console.log(
      `  Total definitions: ${colors.cyan}${registry.statistics.totalDefinitions}${colors.reset}`
    );
    console.log(
      `  Total references: ${colors.cyan}${registry.statistics.totalReferences}${colors.reset}`
    );

    if (registry.statistics.duplicates > 0) {
      console.log(`  Duplicates: ${colors.yellow}${registry.statistics.duplicates}${colors.reset}`);
    } else {
      console.log(`  Duplicates: ${colors.green}0${colors.reset}`);
    }

    if (registry.statistics.brokenReferences > 0) {
      console.log(
        `  Broken references: ${colors.red}${registry.statistics.brokenReferences}${colors.reset}`
      );
    } else {
      console.log(`  Broken references: ${colors.green}0${colors.reset}`);
    }

    if (registry.statistics.circularDependencies > 0) {
      console.log(
        `  Circular dependencies (info): ${colors.cyan}${registry.statistics.circularDependencies}${colors.reset}`
      );
    } else {
      console.log(`  Circular dependencies: ${colors.green}0${colors.reset}`);
    }
  }

  /**
   * Display validation issues
   */
  private displayIssues(registry: SymbolRegistry, showFix: boolean): void {
    const errors = registry.issues.filter((i) => i.severity === 'error');
    const warnings = registry.issues.filter((i) => i.severity === 'warning');
    const infos = registry.issues.filter((i) => i.severity === 'info');

    if (errors.length === 0 && warnings.length === 0 && infos.length === 0) {
      return;
    }

    this.printSection('Validation Issues');

    if (errors.length > 0) {
      console.log(`  ${colors.red}❌ Errors (${errors.length}):${colors.reset}`);
      console.log();
      errors.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${colors.bold}${issue.message}${colors.reset}`);
        console.log(`     Symbol: [[${issue.symbolName}]]`);
        console.log(
          `     File: ${issue.filePath}${issue.lineNumber ? `:${issue.lineNumber}` : ''}`
        );
        if (issue.suggestion) {
          console.log(`     ${colors.cyan}💡 ${issue.suggestion}${colors.reset}`);
        }
        console.log();
      });
    }

    if (warnings.length > 0) {
      console.log(`  ${colors.yellow}⚠️  Warnings (${warnings.length}):${colors.reset}`);
      console.log();
      warnings.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue.message}`);
        console.log(`     Symbol: [[${issue.symbolName}]]`);
        console.log(`     File: ${issue.filePath}`);
        if (issue.suggestion) {
          console.log(`     ${colors.cyan}💡 ${issue.suggestion}${colors.reset}`);
        }
        console.log();
      });
    }

    if (infos.length > 0) {
      console.log(
        `  ${colors.cyan}ℹ Info: ${infos.length} authored circular cross-reference chain(s) detected (use --json for full cycle details)${colors.reset}`
      );
      console.log();
    }

    if (!showFix && (errors.length > 0 || warnings.length > 0)) {
      console.log(`  ${colors.dim}Run with --fix to automatically fix some issues${colors.reset}`);
    }
  }

  /**
   * Fix issues automatically (where possible)
   */
  private fixIssues(registry: SymbolRegistry, logOutput = true): number {
    let fixed = 0;

    for (const issue of registry.issues) {
      if (issue.type === 'ambiguous-reference' && issue.severity === 'warning') {
        const normalizedName = this.normalizeSymbolName(issue.symbolName);
        const targetPath = path.join('managed', 'relationships', `${normalizedName}.md`);

        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        if (!fs.existsSync(targetPath)) {
          const skeletonContent = this.generateSkeletonDocument(issue.symbolName);
          fs.writeFileSync(targetPath, skeletonContent);
          if (logOutput) {
            console.log(`  ${colors.green}✓${colors.reset} Created: ${targetPath}`);
          }
          fixed++;
        } else if (logOutput) {
          console.log(`  ${colors.yellow}⚠${colors.reset} Skipped (exists): ${targetPath}`);
        }
      } else if (
        logOutput &&
        issue.type === 'broken-reference' &&
        issue.severity === 'error' &&
        issue.suggestion?.startsWith('Did you mean')
      ) {
        console.log(
          `  ${colors.yellow}⚠${colors.reset} Manual fix needed: ${issue.filePath}:${issue.lineNumber}`
        );
        console.log(`     ${colors.cyan}${issue.suggestion}${colors.reset}`);
      }
    }

    return fixed;
  }

  /**
   * Generate skeleton document for a new symbol definition
   */
  private generateSkeletonDocument(symbolName: string): string {
    const timestamp = new Date().toISOString().split('T')[0];

    return `# [[${symbolName}]]

> Auto-generated skeleton document. Please fill in the details.

## Overview

<!-- TODO: Describe what ${symbolName} represents -->

## Purpose

<!-- TODO: Explain the purpose of this concept/component -->

## Related Concepts

<!-- TODO: Link to related symbols using [[Symbol]] notation -->

---
*Generated: ${timestamp}*
`;
  }
}
