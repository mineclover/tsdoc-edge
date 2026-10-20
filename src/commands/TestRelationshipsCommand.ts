/**
 * Test Relationships Command - 통합 테스트 관계 검증 분석
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { IntegrationCoverageCalculator } from '../analyzer/IntegrationCoverageCalculator';
import { TestRelationshipExtractor } from '../analyzer/TestRelationshipExtractor';
import { ConfigManager } from '../config/ConfigManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { DatabaseManager } from '../storage/DatabaseManager';
import type {
  RelationshipCoverage,
  TestRelationshipAnalysis,
  VerifiedRelationship,
} from '../types/analysis/test-relationships';
import type { SymbolGraph, SymbolType } from '../types/graph';
import type { SymbolRelationship } from '../types/tags';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/** Verification status of a single module, resolved from the dependency graph */
interface ModuleReport {
  moduleName: string;
  symbolId: string;
  filePath: string;
  line: number;
  totalRelationships: number;
  verifiedCount: number;
  unverifiedCount: number;
  verified: Array<{
    targetName: string;
    strength: string;
    verifiedBy?: string;
    lineNumber?: number;
  }>;
  unverified: Array<{ targetName: string; reason: string }>;
}

/**
 * Test Relationships Command
 *
 * @doc [[TestRelationshipsCommand]]
 * @public
 * @responsibility 통합 테스트 관계 검증 CLI 제공
 * @contract 테스트 파일을 분석하여 모듈 간 연결 검증 상태 제공
 *
 * @functionality
 * - 테스트 파일에서 심볼 관계 추출
 * - 관계 검증 커버리지 계산
 * - 미검증 관계 식별 및 제안
 * - 특정 모듈의 검증 상태 조회
 *
 * @depends TestRelationshipExtractor, IntegrationCoverageCalculator
 * @depType internal
 * @depReason 테스트 분석 및 커버리지 계산 로직 필요
 */
export class TestRelationshipsCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'test-relationships';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Analyze integration test coverage for symbol relationships';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge test-relationships [options]

  Options:
    --module <name>  Show verification status for a specific module
    --unverified     Show only unverified relationships
    --human          Output in human-readable format (default: XML)`;
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

      const isHuman = this.hasFlag(args, '--human');

      if (isHuman) {
        this.printHeader('TSDoc Edge - Test Relationship Analysis');
      }

      // Parse arguments
      const options = this.parseArgs(args);

      // Load graph
      const config = ConfigManager.getInstance().get();
      const dbPath = path.join(process.cwd(), config.paths.databasePath || '.tsdoc/symbols.db');
      const dbManager = new DatabaseManager(dbPath, '');

      if (isHuman) this.printInfo('Building dependency graph...');
      const graphBuilder = new SymbolGraphBuilder();
      const { symbols: symbolRows, dependencies: depRows } = dbManager.getGraphData();

      for (const row of symbolRows) {
        graphBuilder.addSymbol({
          id: row.id,
          name: row.name,
          type: row.type as SymbolType,
          filePath: row.file_path,
          line: row.line || 0,
          column: row.column || 0,
          isExported: Boolean(row.is_exported),
          isPublic: Boolean(row.is_public),
          summary: row.summary ?? '',
          tests: [],
          designDecisions: [],
          metadata: {},
        });
      }

      for (const rel of depRows) {
        graphBuilder.addRelationship({
          from: rel.symbol_id,
          to: rel.target,
          type: (rel.type || 'dependsOn') as SymbolRelationship['type'],
          filePath: '',
        });
      }

      const graph = graphBuilder.getGraph();
      dbManager.close();

      if (isHuman) {
        this.printSuccess(
          `Graph loaded: ${graph.symbols.size} symbols, ${graph.relationships.length} relationships`
        );
        console.log();
      }

      // Find test files
      if (isHuman) this.printInfo('Scanning test files...');
      const testFiles = this.findTestFiles(config.project.srcDirs || ['src']);
      if (isHuman) {
        this.printSuccess(`Found ${testFiles.length} test files`);
        console.log();
      }

      // Extract relationships from tests
      if (isHuman) this.printInfo('Analyzing test relationships...');
      const extractor = new TestRelationshipExtractor(graph);
      const allVerified: VerifiedRelationship[] = [];
      let testFilesWithIntegrations = 0;

      for (const testFile of testFiles) {
        try {
          const usage = extractor.extractFromFile(testFile);
          const relationships = extractor.inferRelationships(usage);

          if (relationships.length > 0) {
            testFilesWithIntegrations++;
            allVerified.push(...relationships);
          }
        } catch (_error) {}
      }

      if (isHuman) {
        this.printSuccess(`Extracted ${allVerified.length} verified relationships`);
        console.log();
      }

      // Calculate coverage
      const calculator = new IntegrationCoverageCalculator(graph);
      const coverage = calculator.calculate(allVerified);

      // Display results based on options
      const summary = this.buildSummary(
        options.module ? 'module' : options.unverified ? 'unverified' : 'full',
        testFiles.length,
        testFilesWithIntegrations,
        coverage
      );

      if (options.module) {
        const report = this.buildModuleReport(options.module, coverage, allVerified, graph);
        if ('error' in report) {
          this.printError(report.error);
        } else if (isHuman) {
          this.displayModuleAnalysis(report);
        } else {
          this.printOutput(
            'test-relationship-analysis',
            {
              summary,
              module: {
                name: report.moduleName,
                symbolId: report.symbolId,
                filePath: report.filePath,
                line: report.line,
                totalRelationships: report.totalRelationships,
                verifiedCount: report.verifiedCount,
                unverifiedCount: report.unverifiedCount,
              },
              verifiedRelationships: report.verified.map((vr) => ({
                source: report.moduleName,
                target: vr.targetName,
                strength: vr.strength,
                ...(vr.verifiedBy !== undefined
                  ? { verifiedBy: vr.verifiedBy, line: vr.lineNumber ?? null }
                  : {}),
              })),
              unverifiedRelationships: report.unverified.map((ur) => ({
                source: report.moduleName,
                target: ur.targetName,
                reason: ur.reason,
              })),
            },
            args
          );
        }
      } else if (options.unverified) {
        if (isHuman) {
          this.displayUnverifiedOnly(coverage);
        } else {
          this.printOutput(
            'test-relationship-analysis',
            {
              summary,
              unverifiedRelationships: coverage.unverifiedRelationships.map((ur) => ({
                source: ur.sourceName,
                target: ur.targetName,
                reason: ur.reason,
                ...(ur.suggestion ? { suggestion: ur.suggestion } : {}),
              })),
            },
            args
          );
        }
      } else {
        const analysis: TestRelationshipAnalysis = {
          totalTestFiles: testFiles.length,
          testFilesWithIntegrations,
          verifiedRelationships: allVerified,
          coverage,
          topUnverified: calculator.getTopUnverified(coverage, 10),
        };

        if (isHuman) {
          this.displayFullReport(analysis);
        } else {
          const percentOfVerified = (count: number): number =>
            coverage.verifiedRelationships > 0
              ? Number(((count / coverage.verifiedRelationships) * 100).toFixed(1))
              : 0;

          this.printOutput(
            'test-relationship-analysis',
            {
              summary,
              verificationBreakdown: [
                { strength: 'strong', count: coverage.byStrength.strong },
                { strength: 'medium', count: coverage.byStrength.medium },
                { strength: 'weak', count: coverage.byStrength.weak },
              ].map((row) => ({ ...row, percentOfVerified: percentOfVerified(row.count) })),
              topUnverified: analysis.topUnverified.map((ur, index) => ({
                rank: index + 1,
                source: ur.sourceName,
                target: ur.targetName,
                reason: ur.reason,
                ...(ur.suggestion ? { suggestion: ur.suggestion.split('\n')[0] } : {}),
              })),
            },
            args
          );
        }
      }

      return this.success('Test relationship analysis complete');
    });
  }

  /**
   * Parse command arguments
   */
  private parseArgs(args: string[]): {
    module?: string;
    unverified: boolean;
  } {
    let module: string | undefined;
    let unverified = false;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--module' && i + 1 < args.length) {
        module = args[++i];
      } else if (arg === '--unverified') {
        unverified = true;
      }
    }

    return { module, unverified };
  }

  /**
   * Find test files in directories
   */
  private findTestFiles(srcDirs: string[]): string[] {
    const testFiles: string[] = [];

    const findTestFilesRecursive = (dir: string): void => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (entry.name === 'node_modules') continue;
          findTestFilesRecursive(fullPath);
        } else if (entry.isFile()) {
          if (
            entry.name.endsWith('.test.ts') ||
            entry.name.endsWith('.spec.ts') ||
            entry.name.endsWith('.test.tsx') ||
            entry.name.endsWith('.spec.tsx')
          ) {
            testFiles.push(fullPath);
          }
        }
      }
    };

    for (const dir of srcDirs) {
      findTestFilesRecursive(dir);
    }

    return testFiles;
  }

  /**
   * Display full analysis report
   */
  private displayFullReport(analysis: TestRelationshipAnalysis): void {
    const { coverage, topUnverified } = analysis;

    // Summary
    this.printSection('Summary');
    console.log(`  Test Files Analyzed:       ${analysis.totalTestFiles}`);
    console.log(`  Test Files with Integrations: ${analysis.testFilesWithIntegrations}`);
    console.log();
    console.log(`  Total Relationships:       ${coverage.totalRelationships}`);
    console.log(
      `  ${colors.green}✓ Verified:${colors.reset}                ${coverage.verifiedRelationships}  (${coverage.coveragePercentage.toFixed(1)}%)`
    );
    console.log(
      `  ${colors.red}✗ Unverified:${colors.reset}              ${coverage.unverifiedRelationships.length}  (${(100 - coverage.coveragePercentage).toFixed(1)}%)`
    );
    console.log();

    // Verification breakdown
    this.printSection('Verification Breakdown');
    console.log(
      `  ${colors.green}Strong (actual usage):${colors.reset}    ${coverage.byStrength.strong}  (${((coverage.byStrength.strong / coverage.verifiedRelationships) * 100).toFixed(1)}%)`
    );
    console.log(
      `  ${colors.yellow}Medium (co-usage):${colors.reset}        ${coverage.byStrength.medium}  (${((coverage.byStrength.medium / coverage.verifiedRelationships) * 100).toFixed(1)}%)`
    );
    console.log(
      `  ${colors.dim}Weak (import only):${colors.reset}       ${coverage.byStrength.weak}  (${((coverage.byStrength.weak / coverage.verifiedRelationships) * 100).toFixed(1)}%)`
    );
    console.log();

    // Top unverified
    if (topUnverified.length > 0) {
      this.printSection(`Top Unverified Relationships (${topUnverified.length})`);

      for (let i = 0; i < topUnverified.length; i++) {
        const ur = topUnverified[i];
        console.log(`  ${colors.red}${i + 1}. ${ur.sourceName} → ${ur.targetName}${colors.reset}`);
        console.log(`     Reason: ${colors.yellow}${ur.reason}${colors.reset}`);
        if (ur.suggestion) {
          console.log(
            `     ${colors.dim}Suggestion: ${ur.suggestion.split('\n')[0]}${colors.reset}`
          );
        }
        console.log();
      }
    }
  }

  /**
   * Summary counts shared by every output mode
   */
  private buildSummary(
    mode: 'full' | 'unverified' | 'module',
    totalTestFiles: number,
    testFilesWithIntegrations: number,
    coverage: RelationshipCoverage
  ) {
    return {
      mode,
      testFilesAnalyzed: totalTestFiles,
      testFilesWithIntegrations,
      totalRelationships: coverage.totalRelationships,
      verifiedRelationships: coverage.verifiedRelationships,
      unverifiedRelationships: coverage.unverifiedRelationships.length,
      coveragePercent: Number(coverage.coveragePercentage.toFixed(1)),
      unverifiedPercent: Number((100 - coverage.coveragePercentage).toFixed(1)),
    };
  }

  /**
   * Resolve the verification status of a specific module (symbol name)
   * @returns The module report, or an error message when the module cannot be resolved
   */
  private buildModuleReport(
    moduleName: string,
    coverage: RelationshipCoverage,
    allVerified: VerifiedRelationship[],
    graph: SymbolGraph
  ): ModuleReport | { error: string } {
    // Find symbol ID by name
    const symbolIds = graph.nameIndex.get(moduleName);

    if (!symbolIds || symbolIds.length === 0) {
      return { error: `Module not found: ${moduleName}` };
    }

    const symbolId = symbolIds[0];
    const symbol = graph.symbols.get(symbolId);

    if (!symbol) {
      return { error: `Symbol not found in graph: ${symbolId}` };
    }

    const calculator = new IntegrationCoverageCalculator(graph);
    const status = calculator.getSymbolVerificationStatus(symbolId, coverage);

    return {
      moduleName,
      symbolId,
      filePath: symbol.filePath,
      line: symbol.line,
      totalRelationships: status.totalRelationships,
      verifiedCount: status.verifiedCount,
      unverifiedCount: status.unverifiedCount,
      verified: status.verifiedRelationships.map((vr) => {
        // Find evidence
        const evidence = allVerified.find(
          (av) => av.source === symbolId && av.target === vr.target
        );
        return {
          targetName: graph.symbols.get(vr.target)?.name || vr.target,
          strength: vr.strength,
          verifiedBy: evidence?.verifiedBy,
          lineNumber: evidence?.evidence[0]?.lineNumber,
        };
      }),
      unverified: status.unverifiedRelationships.map((ur) => ({
        targetName: graph.symbols.get(ur.target)?.name || ur.target,
        reason: ur.reason,
      })),
    };
  }

  /**
   * Display analysis for specific module
   */
  private displayModuleAnalysis(report: ModuleReport): void {
    const { moduleName } = report;

    this.printSection(`Relationship Verification for: ${moduleName}`);
    console.log(`  Symbol ID: ${colors.dim}${report.symbolId}${colors.reset}`);
    console.log(`  File: ${colors.dim}${report.filePath}:${report.line}${colors.reset}`);
    console.log();

    console.log(`  Total Relationships: ${report.totalRelationships}`);
    console.log(`  ${colors.green}✓ Verified:${colors.reset}    ${report.verifiedCount}`);
    console.log(`  ${colors.red}✗ Unverified:${colors.reset}  ${report.unverifiedCount}`);
    console.log();

    // Show verified relationships
    if (report.verified.length > 0) {
      this.printSection('Verified Relationships');
      for (const vr of report.verified) {
        const strengthColor =
          vr.strength === 'strong'
            ? colors.green
            : vr.strength === 'medium'
              ? colors.yellow
              : colors.dim;

        console.log(`  ${colors.green}✓${colors.reset} ${moduleName} → ${vr.targetName}`);
        console.log(`    Strength: ${strengthColor}${vr.strength}${colors.reset}`);

        if (vr.verifiedBy !== undefined) {
          console.log(
            `    Verified by: ${colors.dim}${vr.verifiedBy}:${vr.lineNumber}${colors.reset}`
          );
        }
        console.log();
      }
    }

    // Show unverified relationships
    if (report.unverified.length > 0) {
      this.printSection('Unverified Relationships');
      for (const ur of report.unverified) {
        console.log(`  ${colors.red}✗${colors.reset} ${moduleName} → ${ur.targetName}`);
        console.log(`    Status: ${colors.yellow}${ur.reason}${colors.reset}`);
        console.log();
      }
    }
  }

  /**
   * Display unverified relationships only
   */
  private displayUnverifiedOnly(coverage: RelationshipCoverage): void {
    this.printSection(`Unverified Relationships (${coverage.unverifiedRelationships.length})`);

    for (const ur of coverage.unverifiedRelationships) {
      console.log(`  ${colors.red}✗${colors.reset} ${ur.sourceName} → ${ur.targetName}`);
      console.log(`    Reason: ${colors.yellow}${ur.reason}${colors.reset}`);

      if (ur.suggestion) {
        console.log(`    ${colors.dim}${ur.suggestion}${colors.reset}`);
      }
      console.log();
    }
  }
}
