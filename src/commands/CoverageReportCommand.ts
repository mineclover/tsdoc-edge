/**
 * Coverage Report command - Reports `@doc` tag coverage for SSOT validation
 *
 * @packageDocumentation
 * @doc [[CoverageReportCommand]]
 * @doc [[Coverage Metrics Contract]]
 * @context Top-level `coverage-report` command for measuring `@doc` checkpoint coverage and persisting source-identified coverage metric reports
 * @functionality Evaluates `@doc` tag presence across symbol categories, projects coverage onto canonical `@ttsc/graph` nodes, and stores or reads reports in `CoverageMetricReportRepository`
 * @sideEffect console: Writes formatted coverage breakdowns or `--json` payloads to stdout and operator errors to stderr
 * @sideEffect database: Reads `.tsdoc.db` and `GraphRepository`; reads or writes `CoverageMetricReportRepository` SQLite storage
 * @sideEffect filesystem: Reads TypeScript source files to inspect TSDoc `@doc` blocks (read)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { ConfigManager } from '../config/ConfigManager';
import { isTestArtifactSymbol } from '../graph/SymbolSearchEngine';
import {
  type CanonicalDocumentationCoverageProjection,
  projectDocumentationCoverageToCanonicalNodes,
} from '../metrics/CanonicalCoverageProjection';
import { createCoverageSourceIdentity } from '../metrics/CoverageMetricContract';
import { getDirectJsDocs, readTsdocComment, TSDocParser } from '../parser/TSDocParser';
import {
  CoverageMetricReportRepository,
  type CoverageMetricReportRevision,
} from '../storage/CoverageMetricReportRepository';
import { DatabaseManager } from '../storage/DatabaseManager';
import { GraphRepository } from '../storage/GraphRepository';
import type { DocQualityScore } from '../types/analysis';
import type { Symbol } from '../types/graph/graph';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Coverage statistics for a symbol category
 */
interface CategoryCoverage {
  total: number;
  documented: number;
  coverage: number;
}

/**
 * File-level `@doc` coverage statistics across analyzed source files
 */
interface ModuleCoverage {
  totalFiles: number;
  documentedFiles: number;
  coverage: number;
}

/**
 * Per-file cached `@doc` inspection result
 */
interface CachedFileDocInfo {
  moduleHasDoc: boolean;
  symbolNamesWithDoc: Set<string>;
}

/**
 * Complete coverage report
 */
interface CoverageReport {
  overall: CategoryCoverage;
  effectiveOverall: CategoryCoverage;
  moduleCoverage: ModuleCoverage;
  byCategory: {
    commands: CategoryCoverage;
    analyzers: CategoryCoverage;
    types: CategoryCoverage;
    utilities: CategoryCoverage;
  };
  undocumentedSymbols: Array<{
    name: string;
    type: string;
    filePath: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  canonicalProjection?: CanonicalDocumentationCoverageProjection;
}

/**
 * Command for reporting `@doc` tag coverage
 *
 * @public
 * @responsibility Report real SSOT coverage based on `@doc` tags
 * @contract Calculate and display coverage metrics for documentation
 *
 * @problem Current explore-entrypoint metric is misleading (9.2% but actually much higher)
 * @solves Measures actual `@doc` tag coverage in code (code → docs direction)
 * @context Phase 1 of SSOT improvement plan - fix coverage metric
 *
 * @functionality
 * - Symbol analysis: Read all symbols from database
 * - `@doc` tag detection: Parse source files to check for `@doc` tags
 * - Categorization: Group by symbol type (commands, analyzers, types, utilities)
 * - Priority ranking: Highlight high-priority undocumented symbols
 * - Report generation: Display coverage statistics and recommendations
 *
 * @decision Measure `@doc` tag presence, not .md traversal
 * @rationale `@doc` tags show code→docs links (SSOT direction), .md traversal only shows docs→docs
 * @consequences Reveals true documentation status, not navigation completeness
 *
 * @doc [[CoverageReportCommand]]
 * @doc [[Coverage Metrics Contract]]
 * @sideEffect console: Writes coverage report output to stdout/stderr; reads source files and reads/writes coverage SQLite repositories
 */
export class CoverageReportCommand extends BaseCommand {
  private db?: DatabaseManager;
  private ownsDatabase = false;
  private parser: TSDocParser;
  private fileDocCache = new Map<string, CachedFileDocInfo>();

  constructor(db?: DatabaseManager) {
    super();
    this.db = db;
    this.parser = new TSDocParser();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'coverage-report';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Report @doc coverage or inspect persisted coverage metrics';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge coverage-report [list|read] [options]

  Options:
  --json               Output as JSON
  --filter=public      Show only public symbols
  --include-tests      Include test suites, test cases, and test files
  --hierarchical       Group by file hierarchy
  --canonical-graph-db <file>  Project documentation evidence to active ttsc graph revision
  --workspace <id>     Workspace identity for persisted report inspection
  --report-db <file>   Report DB for persisted report inspection (default: .tsdoc/coverage-metrics.db)
  --report-id <id>     Exact report identity for read`;
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

      const jsonOutput = args.includes('--json');
      const filterPublic = args.includes('--filter=public');
      const includeTests = args.includes('--include-tests');
      const hierarchical = args.includes('--hierarchical');
      const canonicalGraphDatabase = this.getOption(args, '--canonical-graph-db');
      const positionalArguments = this.getPositionalArgs(args);
      const invalid = validateArguments(args, positionalArguments);
      if (invalid) return this.failure(invalid, 2);
      const operation = positionalArguments[0];

      if (operation === 'list' || operation === 'read') {
        return this.inspectStoredReports(operation, args);
      }
      if (operation) {
        return this.failure(`Unknown coverage-report operation: ${operation}`, 2);
      }

      if (!jsonOutput) {
        this.printHeader('SSOT Coverage Report');
      }

      this.fileDocCache.clear();
      try {
        // 1. Get all symbols from DB
        const allSymbols = await this.getAllSymbols();

        if (allSymbols.length === 0) {
          this.printError('No symbols found in database');
          this.printInfo('Run: tsdoc-edge build src');
          return this.failure('No symbols in database');
        }

        // 2. Exclude test artifacts by default unless --include-tests is passed, then filter if requested
        const candidateSymbols = includeTests
          ? allSymbols
          : allSymbols.filter((s) => !isTestArtifactSymbol(s));
        const symbols = filterPublic
          ? candidateSymbols.filter((s) => this.isPublicAPI(s))
          : candidateSymbols;

        // 3. Check coverage
        const report = hierarchical
          ? this.generateHierarchicalReport(symbols)
          : this.generateReport(symbols);

        const canonicalProjection = canonicalGraphDatabase
          ? this.generateCanonicalProjection(symbols, canonicalGraphDatabase)
          : undefined;
        const outputReport = canonicalProjection ? { ...report, canonicalProjection } : report;

        // 4. Output
        if (jsonOutput) {
          console.log(JSON.stringify(outputReport, null, 2));
        } else {
          this.displayReport(report, hierarchical);
          if (canonicalProjection) this.displayCanonicalProjection(canonicalProjection);
        }

        return this.success();
      } finally {
        this.fileDocCache.clear();
        this.closeOwnedDatabase();
      }
    });
  }

  private inspectStoredReports(operation: 'list' | 'read', args: string[]): CommandResult {
    const config = ConfigManager.getInstance(process.cwd()).get();
    const workspaceId =
      this.getOption(args, '--workspace') ?? config.project?.name ?? path.basename(process.cwd());
    const reportDatabasePath = path.resolve(
      process.cwd(),
      this.getOption(args, '--report-db') ?? '.tsdoc/coverage-metrics.db'
    );
    if (!fs.existsSync(reportDatabasePath)) {
      const message = `Coverage report database not found: ${reportDatabasePath}`;
      return this.operatorFailure(message, 2);
    }
    const reports = new CoverageMetricReportRepository(reportDatabasePath, { readOnly: true });
    try {
      if (operation === 'list') {
        const pins = reports.listReportPins(workspaceId);
        this.printStoredReportOutput(
          {
            operation,
            workspaceId,
            reportDatabasePath: relativeDatabasePath(reportDatabasePath),
            pins,
          },
          args
        );
        return this.success(`Coverage reports listed: ${pins.length}`);
      }

      const reportId = this.getOption(args, '--report-id');
      if (!reportId) return this.failure('--report-id is required for read', 2);
      const report = reports.readReport({ workspaceId, reportId });
      if (!report) return this.failure(`Coverage report not found: ${workspaceId}/${reportId}`, 2);
      this.printStoredReportOutput(
        {
          operation,
          workspaceId,
          reportDatabasePath: relativeDatabasePath(reportDatabasePath),
          report,
        },
        args
      );
      return this.success(`Coverage report read: ${report.reportId}`);
    } finally {
      reports.close();
    }
  }

  private printStoredReportOutput(value: unknown, args: readonly string[]): void {
    if (this.hasFlag([...args], '--json')) {
      console.log(JSON.stringify(value, null, 2));
      return;
    }
    const output = value as {
      operation: string;
      reportDatabasePath: string;
      pins?: readonly unknown[];
      report?: CoverageMetricReportRevision;
    };
    this.printHeader('Coverage Report');
    console.log(`${colors.bold}Operation:${colors.reset} ${output.operation}`);
    console.log(`${colors.bold}Database:${colors.reset} ${output.reportDatabasePath}`);
    if (output.pins) {
      console.log(`${colors.bold}Reports:${colors.reset} ${output.pins.length}`);
      return;
    }
    if (output.report) {
      console.log(`${colors.bold}Report:${colors.reset} ${output.report.reportId}`);
      console.log(`${colors.bold}Source:${colors.reset} ${output.report.source.sourceIdentity}`);
      console.log(`${colors.bold}Metrics:${colors.reset} ${output.report.metrics.length}`);
      console.log(`${colors.bold}File metrics:${colors.reset} ${output.report.fileMetrics.length}`);
    }
  }

  /**
   * Get all symbols from database
   */
  private getAllSymbols(): Promise<Symbol[]> {
    try {
      return Promise.resolve(this.getDatabase().getAllSymbols()).catch((): Symbol[] => []);
    } catch (_error) {
      // If database doesn't exist or method not available, return empty
      return Promise.resolve([]);
    }
  }

  private getDatabase(): DatabaseManager {
    if (!this.db) {
      this.db = new DatabaseManager(this.getDatabasePath(), this.getJsonlPath());
      this.ownsDatabase = true;
    }
    return this.db;
  }

  private closeOwnedDatabase(): void {
    if (!this.ownsDatabase || !this.db) return;
    this.db.close();
    this.db = undefined;
    this.ownsDatabase = false;
  }

  /** Build a canonical documentation projection from the selected graph revision. */
  private generateCanonicalProjection(
    symbols: Symbol[],
    graphDatabasePath: string
  ): CanonicalDocumentationCoverageProjection {
    const repository = new GraphRepository(path.resolve(process.cwd(), graphDatabasePath), {
      readOnly: true,
    });
    try {
      const activeRevision = repository.readActiveRevision();
      if (!activeRevision) {
        throw new Error('Canonical graph database has no active revision');
      }
      const scores = this.collectDocumentationScores(symbols);
      const source = createCoverageSourceIdentity(
        path.join(process.cwd(), '.tsdoc', 'coverage-report'),
        JSON.stringify(scores),
        {
          adapterId: 'tsdoc-edge/coverage-report',
          inputKind: 'legacy-database',
          reportFormat: 'tsdoc-doc-tags',
          workspaceId: activeRevision.graph.provenance.workspaceId,
        }
      );
      return projectDocumentationCoverageToCanonicalNodes(
        {
          reportId: `documentation-report:${source.sourceIdentity}`,
          source,
          scores,
        },
        activeRevision.graph,
        { graphRevisionId: activeRevision.metadata.revisionId }
      );
    } finally {
      repository.close();
    }
  }

  /** Collect the legacy `@doc` signal in the score shape expected by projection. */
  private collectDocumentationScores(symbols: Symbol[]): DocQualityScore[] {
    const scores: DocQualityScore[] = [];
    for (const symbol of symbols) {
      scores.push({
        symbolId: symbol.id,
        symbolName: symbol.name,
        symbolType: symbol.type,
        filePath: symbol.filePath,
        line: symbol.line,
        isPublic: symbol.isPublic,
        hasDoc: this.hasDocTag(symbol),
        hasSummary: false,
        hasCompleteParams: false,
        hasReturns: false,
        hasExamples: false,
        hasCustomTags: false,
        qualityScore: 0,
        missing: [],
        children: [],
      });
    }
    return scores;
  }

  /**
   * Check if symbol is public API (high priority)
   */
  private isPublicAPI(symbol: Symbol): boolean {
    if (typeof symbol.isExported === 'boolean') {
      return Boolean(symbol.isExported && symbol.isPublic);
    }

    const { filePath, type } = symbol;

    // Commands are always public
    if (filePath.includes('/commands/') && type === 'class') {
      return true;
    }

    // Analyzers are public
    if (filePath.includes('/analyzer/') && type === 'class') {
      return true;
    }

    // Core types are public
    if (filePath.includes('/types/') && type === 'interface') {
      return true;
    }

    // Exported classes/interfaces are likely public
    if ((type === 'class' || type === 'interface') && !filePath.includes('/__tests__/')) {
      return true;
    }

    return false;
  }

  /**
   * Categorize symbol by file path
   */
  private categorizeSymbol(symbol: Symbol): keyof CoverageReport['byCategory'] {
    if (symbol.filePath.includes('/commands/')) return 'commands';
    if (symbol.filePath.includes('/analyzer/')) return 'analyzers';
    if (symbol.filePath.includes('/types/')) return 'types';
    return 'utilities';
  }

  /**
   * Get priority for undocumented symbol
   */
  private getPriority(symbol: Symbol): 'high' | 'medium' | 'low' {
    if (this.isPublicAPI(symbol)) return 'high';
    if (symbol.type === 'function' || symbol.type === 'class') return 'medium';
    return 'low';
  }

  /**
   * Parse and cache module-level `@packageDocumentation` `@doc` and symbol-level `@doc` tags for a file
   */
  private getFileDocInfo(filePath: string): CachedFileDocInfo {
    const fullPath = path.resolve(filePath);
    const cached = this.fileDocCache.get(fullPath);
    if (cached) {
      return cached;
    }

    const info: CachedFileDocInfo = {
      moduleHasDoc: false,
      symbolNamesWithDoc: new Set<string>(),
    };

    try {
      if (!fs.existsSync(fullPath)) {
        this.fileDocCache.set(fullPath, info);
        return info;
      }

      const source = fs.readFileSync(fullPath, 'utf-8');
      const sourceFile = ts.createSourceFile(fullPath, source, ts.ScriptTarget.Latest, true);
      const visitedJsDocStarts = new Set<number>();

      const inspectJsDoc = (jsDoc: ts.JSDoc, declarationNames: readonly string[]): void => {
        const startPos = jsDoc.getStart(sourceFile);
        if (visitedJsDocStarts.has(startPos)) {
          return;
        }
        visitedJsDocStarts.add(startPos);

        const jsDocText = jsDoc.getText(sourceFile);
        const structured = readTsdocComment(this.parser.parseString(jsDocText).docComment);
        const hasDoc =
          structured.docReferences.length > 0 ||
          structured.getTagValues('@doc').some((value) => value.trim().length > 0);
        if (!hasDoc) {
          return;
        }

        const isPackageDoc =
          structured.hasModifier('@packagedocumentation') ||
          (jsDoc.tags ?? []).some(
            (tag) => tag.tagName.text.toLowerCase() === 'packagedocumentation'
          );

        if (isPackageDoc || declarationNames.length === 0) {
          info.moduleHasDoc = true;
        } else {
          for (const name of declarationNames) {
            info.symbolNamesWithDoc.add(name);
          }
        }
      };

      const visit = (node: ts.Node, parentName?: string): void => {
        const declarationNames = getDeclarationSymbolNames(node, parentName);
        const jsDocs = getDirectJsDocs(node);
        for (const jsDoc of jsDocs) {
          inspectJsDoc(jsDoc, declarationNames);
        }

        const nextParent =
          (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) && node.name
            ? node.name.text
            : parentName;
        ts.forEachChild(node, (child) => visit(child, nextParent));
      };

      visit(sourceFile);

      for (const eofJsDoc of getDirectJsDocs(sourceFile.endOfFileToken)) {
        inspectJsDoc(eofJsDoc, []);
      }

      const leadingRanges = ts.getLeadingCommentRanges(source, 0) ?? [];
      for (const range of leadingRanges) {
        if (visitedJsDocStarts.has(range.pos)) {
          continue;
        }
        const commentText = source.slice(range.pos, range.end);
        if (!commentText.startsWith('/**') || commentText.startsWith('/***')) {
          continue;
        }
        const structured = readTsdocComment(this.parser.parseString(commentText).docComment);
        const isPackageDoc =
          structured.hasModifier('@packagedocumentation') ||
          commentText.includes('@packageDocumentation');
        const hasDoc =
          structured.docReferences.length > 0 ||
          structured.getTagValues('@doc').some((value) => value.trim().length > 0);
        if (isPackageDoc && hasDoc) {
          info.moduleHasDoc = true;
        }
      }
    } catch (_error) {
      // If parsing fails, fall back to empty doc info for this file
    }

    this.fileDocCache.set(fullPath, info);
    return info;
  }

  /**
   * Check if symbol has a direct `@doc` tag
   */
  private hasDocTag(symbol: Symbol): boolean {
    const info = this.getFileDocInfo(symbol.filePath);
    return info.symbolNamesWithDoc.has(symbol.name);
  }

  /**
   * Check if symbol is covered by a direct `@doc` tag or module-level `@packageDocumentation` `@doc`
   */
  private hasEffectiveDocTag(symbol: Symbol): boolean {
    const info = this.getFileDocInfo(symbol.filePath);
    return info.moduleHasDoc || info.symbolNamesWithDoc.has(symbol.name);
  }

  /**
   * Compute file-level `@doc` coverage across unique files represented in `symbols`
   */
  private computeModuleCoverage(symbols: Symbol[]): ModuleCoverage {
    const uniqueFiles = new Set<string>(symbols.map((symbol) => path.resolve(symbol.filePath)));
    let documentedFiles = 0;

    for (const fullPath of uniqueFiles) {
      const info = this.getFileDocInfo(fullPath);
      if (info.moduleHasDoc || info.symbolNamesWithDoc.size > 0) {
        documentedFiles++;
      }
    }

    const totalFiles = uniqueFiles.size;
    return {
      totalFiles,
      documentedFiles,
      coverage: totalFiles > 0 ? (documentedFiles / totalFiles) * 100 : 0,
    };
  }

  /**
   * Generate coverage report
   */
  private generateReport(symbols: Symbol[]): CoverageReport {
    const byCategory = {
      commands: { total: 0, documented: 0, coverage: 0 },
      analyzers: { total: 0, documented: 0, coverage: 0 },
      types: { total: 0, documented: 0, coverage: 0 },
      utilities: { total: 0, documented: 0, coverage: 0 },
    };

    const undocumentedSymbols: CoverageReport['undocumentedSymbols'] = [];

    let totalDocumented = 0;
    let totalEffectiveDocumented = 0;

    for (const symbol of symbols) {
      const hasDoc = this.hasDocTag(symbol);
      const hasEffectiveDoc = hasDoc || this.hasEffectiveDocTag(symbol);
      const category = this.categorizeSymbol(symbol);

      byCategory[category].total++;

      if (hasEffectiveDoc) {
        totalEffectiveDocumented++;
      }

      if (hasDoc) {
        byCategory[category].documented++;
        totalDocumented++;
      } else {
        undocumentedSymbols.push({
          name: symbol.name,
          type: symbol.type,
          filePath: symbol.filePath,
          priority: this.getPriority(symbol),
        });
      }
    }

    // Calculate percentages
    for (const cat of Object.keys(byCategory) as Array<keyof typeof byCategory>) {
      const { total, documented } = byCategory[cat];
      byCategory[cat].coverage = total > 0 ? (documented / total) * 100 : 0;
    }

    // Sort undocumented by priority
    undocumentedSymbols.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return {
      overall: {
        total: symbols.length,
        documented: totalDocumented,
        coverage: symbols.length > 0 ? (totalDocumented / symbols.length) * 100 : 0,
      },
      effectiveOverall: {
        total: symbols.length,
        documented: totalEffectiveDocumented,
        coverage: symbols.length > 0 ? (totalEffectiveDocumented / symbols.length) * 100 : 0,
      },
      moduleCoverage: this.computeModuleCoverage(symbols),
      byCategory,
      undocumentedSymbols,
    };
  }

  /**
   * Generate hierarchical coverage report (file-level connections)
   */
  private generateHierarchicalReport(symbols: Symbol[]): CoverageReport {
    // Load code connections from doc-symbols.json
    const connectedFiles = this.getFilesWithCodeConnections();

    const byCategory = {
      commands: { total: 0, documented: 0, coverage: 0 },
      analyzers: { total: 0, documented: 0, coverage: 0 },
      types: { total: 0, documented: 0, coverage: 0 },
      utilities: { total: 0, documented: 0, coverage: 0 },
    };

    const undocumentedSymbols: CoverageReport['undocumentedSymbols'] = [];
    let totalDocumented = 0;
    const uniqueFiles = new Set<string>();
    const connectedUniqueFiles = new Set<string>();

    for (const symbol of symbols) {
      const category = this.categorizeSymbol(symbol);
      byCategory[category].total++;
      uniqueFiles.add(symbol.filePath);

      // Check if symbol's file is in connected files
      const isConnected = connectedFiles.some((f) => symbol.filePath.includes(f));

      if (isConnected) {
        connectedUniqueFiles.add(symbol.filePath);
        byCategory[category].documented++;
        totalDocumented++;
      } else {
        undocumentedSymbols.push({
          name: symbol.name,
          type: symbol.type,
          filePath: symbol.filePath,
          priority: this.getPriority(symbol),
        });
      }
    }

    // Calculate percentages
    for (const cat of Object.keys(byCategory) as Array<keyof typeof byCategory>) {
      const { total, documented } = byCategory[cat];
      byCategory[cat].coverage = total > 0 ? (documented / total) * 100 : 0;
    }

    // Sort undocumented by priority
    undocumentedSymbols.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const overall: CategoryCoverage = {
      total: symbols.length,
      documented: totalDocumented,
      coverage: symbols.length > 0 ? (totalDocumented / symbols.length) * 100 : 0,
    };

    return {
      overall,
      effectiveOverall: { ...overall },
      moduleCoverage: {
        totalFiles: uniqueFiles.size,
        documentedFiles: connectedUniqueFiles.size,
        coverage: uniqueFiles.size > 0 ? (connectedUniqueFiles.size / uniqueFiles.size) * 100 : 0,
      },
      byCategory,
      undocumentedSymbols,
    };
  }

  /**
   * Get files with code connections from doc-symbols.json
   */
  private getFilesWithCodeConnections(): string[] {
    try {
      const docSymbolsPath = path.join('.tsdoc', 'doc-symbols.json');
      if (!fs.existsSync(docSymbolsPath)) {
        return [];
      }

      const content = fs.readFileSync(docSymbolsPath, 'utf-8');
      const rawData: unknown = JSON.parse(content);
      const data = rawData as {
        registryData?: {
          codeConnections?: Record<string, unknown>;
        };
      };

      const isUnknownArray = (value: unknown): value is readonly unknown[] => Array.isArray(value);
      const files: string[] = [];

      // Extract file paths from codeConnections
      const connections = data.registryData?.codeConnections ?? {};
      for (const [_symbol, connArray] of Object.entries(connections)) {
        const conns = isUnknownArray(connArray) ? connArray[1] : undefined;
        const connList = isUnknownArray(conns) ? conns : [];
        for (const conn of connList) {
          if (
            typeof conn === 'object' &&
            conn !== null &&
            'filePath' in conn &&
            typeof conn.filePath === 'string' &&
            conn.filePath
          ) {
            // Convert absolute path to relative
            const relativePath = conn.filePath.replace(/.*\/tsdoc-edge\//, '');
            if (!files.includes(relativePath)) {
              files.push(relativePath);
            }
          }
        }
      }

      return files;
    } catch (_error) {
      return [];
    }
  }

  /**
   * Display coverage report
   */
  private displayReport(report: CoverageReport, hierarchical = false): void {
    const { overall, effectiveOverall, moduleCoverage, byCategory, undocumentedSymbols } = report;

    // Overall coverage
    this.printSection(hierarchical ? 'Overall Coverage (Hierarchical)' : 'Overall Coverage');
    console.log(`  Total symbols: ${overall.total}`);
    if (hierarchical) {
      console.log(`  Documented (file-level): ${overall.documented}`);
      const coverageColor =
        overall.coverage >= 50 ? colors.green : overall.coverage >= 30 ? colors.yellow : colors.red;
      console.log(`  Coverage: ${coverageColor}${overall.coverage.toFixed(1)}%${colors.reset}`);
    } else {
      const directColor =
        overall.coverage >= 50 ? colors.green : overall.coverage >= 30 ? colors.yellow : colors.red;
      const effectiveColor =
        effectiveOverall.coverage >= 80
          ? colors.green
          : effectiveOverall.coverage >= 50
            ? colors.yellow
            : colors.red;
      const moduleColor =
        moduleCoverage.coverage >= 80
          ? colors.green
          : moduleCoverage.coverage >= 50
            ? colors.yellow
            : colors.red;

      console.log(
        `  Direct Symbol @doc Coverage     : ${overall.documented} / ${overall.total} (${directColor}${overall.coverage.toFixed(1)}%${colors.reset})`
      );
      console.log(
        `  Module-Linked Effective Coverage: ${effectiveOverall.documented} / ${effectiveOverall.total} (${effectiveColor}${effectiveOverall.coverage.toFixed(1)}%${colors.reset})`
      );
      console.log(
        `  Source File @doc Coverage       : ${moduleCoverage.documentedFiles} / ${moduleCoverage.totalFiles} (${moduleColor}${moduleCoverage.coverage.toFixed(1)}%${colors.reset})`
      );
    }
    console.log();

    // By category
    this.printSection('Coverage by Category');
    for (const [category, stats] of Object.entries(byCategory)) {
      const catColor =
        stats.coverage >= 80 ? colors.green : stats.coverage >= 50 ? colors.yellow : colors.red;
      console.log(
        `  ${category.padEnd(15)}: ${stats.documented.toString().padStart(3)} / ${stats.total.toString().padStart(3)} (${catColor}${stats.coverage.toFixed(1)}%${colors.reset})`
      );
    }
    console.log();

    // Recommendations
    this.printSection('Recommendations');

    const highPriority = undocumentedSymbols.filter((s) => s.priority === 'high');

    if (highPriority.length === 0) {
      this.printSuccess('All high-priority symbols documented!');
    } else {
      this.printWarning(`${highPriority.length} high-priority symbols need @doc tags`);
      console.log();
      console.log('  Top 20 high-priority undocumented symbols:');
      highPriority.slice(0, 20).forEach((s) => {
        console.log(`    ${colors.dim}- ${s.name} (${s.type}) in ${s.filePath}${colors.reset}`);
      });
    }
    console.log();

    // Next steps
    this.printSection('Next Steps');
    if (hierarchical) {
      console.log('  Hierarchical mode: File-level connections cascade to all symbols');
      console.log();
      if (overall.coverage < 50) {
        console.log('  1. Add more code connections in documentation');
        console.log('  2. Target: 50%+ overall coverage (file-level)');
        console.log('  3. Consider adding @doc tags for explicit coverage');
      } else {
        this.printSuccess('Hierarchical coverage target met!');
        console.log('  - Maintain file-level connections');
        console.log('  - Consider explicit @doc tags for critical symbols');
      }
    } else {
      if (overall.coverage < 50) {
        console.log('  1. Add @doc tags to high-priority symbols (commands, analyzers, types)');
        console.log('  2. Target: 50%+ overall coverage');
        console.log('  3. Goal: 100% public API coverage');
        console.log();
        console.log('  Example:');
        console.log('    /**');
        console.log('     * Call graph analyzer');
        console.log('     *');
        console.log('     * @doc [[CallGraphAnalyzer]]');
        console.log('     * @doc [[Call Relationships]]');
        console.log('     * @public');
        console.log('     */');
      } else {
        this.printSuccess('Coverage target met! Continue improving.');
        console.log('  - Maintain 50%+ coverage');
        console.log('  - Document remaining public APIs');
        console.log('  - Consider CI/CD enforcement');
      }
    }
    console.log();
  }

  /** Display canonical projection identity and matching summary. */
  private displayCanonicalProjection(projection: CanonicalDocumentationCoverageProjection): void {
    this.printSection('✅ Canonical Graph Projection');
    console.log(`Graph revision: ${colors.cyan}${projection.graphRevisionId}${colors.reset}`);
    console.log(`Graph fingerprint: ${colors.cyan}${projection.graphFingerprint}${colors.reset}`);
    console.log(`Documentation scores matched: ${projection.matchedScores.length}`);
    console.log(`Unmatched scores: ${projection.unmatchedScores.length}`);
    console.log(`Unmatched graph nodes: ${projection.unmatchedNodes.length}`);
    console.log(`${colors.dim}Projection policy: report-only${colors.reset}`);
  }
}

function getDeclarationSymbolNames(node: ts.Node, parentName?: string): string[] {
  if (
    (ts.isClassDeclaration(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)) &&
    node.name
  ) {
    return [node.name.text];
  }

  if (
    ts.isMethodDeclaration(node) ||
    ts.isMethodSignature(node) ||
    ts.isPropertyDeclaration(node) ||
    ts.isPropertySignature(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  ) {
    if (
      ts.isIdentifier(node.name) ||
      ts.isStringLiteral(node.name) ||
      ts.isNumericLiteral(node.name)
    ) {
      const memberName = node.name.text;
      return parentName ? [memberName, `${parentName}.${memberName}`] : [memberName];
    }
    return [];
  }

  if (ts.isVariableStatement(node)) {
    const names: string[] = [];
    for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) {
        names.push(declaration.name.text);
      }
    }
    return names;
  }

  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    return [node.name.text];
  }

  return [];
}

function relativeDatabasePath(databasePath: string): string {
  return path.relative(process.cwd(), databasePath).split(path.sep).join('/') || '.';
}

const VALUE_OPTIONS = new Set([
  '--canonical-graph-db',
  '--workspace',
  '--report-db',
  '--report-id',
]);
const BOOLEAN_OPTIONS = new Set(['--json', '--hierarchical', '--include-tests', '--help', '-h']);

function validateArguments(
  args: readonly string[],
  positionalArguments: readonly string[]
): string | undefined {
  if (positionalArguments.length > 1) {
    return `Unexpected coverage-report argument: ${positionalArguments[1]}`;
  }

  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith('-')) continue;
    if (argument === '--filter=public') {
      if (seen.has('--filter')) return 'Duplicate coverage-report option: --filter';
      seen.add('--filter');
      continue;
    }
    if (BOOLEAN_OPTIONS.has(argument)) {
      const name = argument === '-h' ? '--help' : argument;
      if (seen.has(name)) return `Duplicate coverage-report option: ${name}`;
      seen.add(name);
      continue;
    }

    const [optionName, inlineValue] = argument.split('=', 2);
    if (!VALUE_OPTIONS.has(optionName)) {
      return `Unknown coverage-report option: ${optionName}`;
    }
    if (seen.has(optionName)) return `Duplicate coverage-report option: ${optionName}`;
    const value = inlineValue ?? args[index + 1];
    if (!value || (!inlineValue && value.startsWith('-'))) {
      return `Coverage-report option requires a value: ${optionName}`;
    }
    seen.add(optionName);
    if (inlineValue === undefined) index += 1;
  }
  return undefined;
}
