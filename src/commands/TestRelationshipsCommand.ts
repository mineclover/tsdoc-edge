/**
 * Test Relationships Command - 통합 테스트 관계 검증 분석
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { DatabaseManager } from '../storage/DatabaseManager';
import { ConfigManager } from '../config/ConfigManager';
import { TestRelationshipExtractor } from '../analyzer/TestRelationshipExtractor';
import { IntegrationCoverageCalculator } from '../analyzer/IntegrationCoverageCalculator';
import type { VerifiedRelationship, TestRelationshipAnalysis } from '../types/analysis/test-relationships';
import type { SymbolType } from '../types/graph';
import type { SymbolRelationship } from '../types/tags';
import * as path from 'node:path';
import * as fs from 'node:fs';

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
  getName(): string {
    return 'test-relationships';
  }

  getDescription(): string {
    return 'Analyze integration test coverage for symbol relationships';
  }

  protected getUsage(): string {
    return 'tsdoc-edge test-relationships [options]';
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      this.printHeader('TSDoc Edge - Test Relationship Analysis');

      // Parse arguments
      const options = this.parseArgs(args);

      // Load graph
      const config = ConfigManager.getInstance().get();
      const dbPath = path.join(process.cwd(), config.paths.databasePath || '.tsdoc/symbols.db');
      const dbManager = new DatabaseManager(dbPath, '');

      this.printInfo('Building dependency graph...');
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

      this.printSuccess(`Graph loaded: ${graph.symbols.size} symbols, ${graph.relationships.length} relationships`);
      console.log();

      // Find test files
      this.printInfo('Scanning test files...');
      const testFiles = this.findTestFiles(config.project.srcDirs || ['src']);
      this.printSuccess(`Found ${testFiles.length} test files`);
      console.log();

      // Extract relationships from tests
      this.printInfo('Analyzing test relationships...');
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
        } catch (error) {
          // Skip files that fail to parse
          continue;
        }
      }

      this.printSuccess(`Extracted ${allVerified.length} verified relationships`);
      console.log();

      // Calculate coverage
      const calculator = new IntegrationCoverageCalculator(graph);
      const coverage = calculator.calculate(allVerified);

      // Display results based on options
      if (options.module) {
        this.displayModuleAnalysis(options.module, coverage, allVerified, graph);
      } else if (options.unverified) {
        this.displayUnverifiedOnly(coverage);
      } else {
        this.displayFullReport({
          totalTestFiles: testFiles.length,
          testFilesWithIntegrations,
          verifiedRelationships: allVerified,
          coverage,
          topUnverified: calculator.getTopUnverified(coverage, 10),
        });
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
          if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.spec.ts') ||
              entry.name.endsWith('.test.tsx') || entry.name.endsWith('.spec.tsx')) {
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
    console.log(`  ${this.colors.green}✓ Verified:${this.colors.reset}                ${coverage.verifiedRelationships}  (${coverage.coveragePercentage.toFixed(1)}%)`);
    console.log(`  ${this.colors.red}✗ Unverified:${this.colors.reset}              ${coverage.unverifiedRelationships.length}  (${(100 - coverage.coveragePercentage).toFixed(1)}%)`);
    console.log();

    // Verification breakdown
    this.printSection('Verification Breakdown');
    console.log(`  ${this.colors.green}Strong (actual usage):${this.colors.reset}    ${coverage.byStrength.strong}  (${((coverage.byStrength.strong / coverage.verifiedRelationships) * 100).toFixed(1)}%)`);
    console.log(`  ${this.colors.yellow}Medium (co-usage):${this.colors.reset}        ${coverage.byStrength.medium}  (${((coverage.byStrength.medium / coverage.verifiedRelationships) * 100).toFixed(1)}%)`);
    console.log(`  ${this.colors.dim}Weak (import only):${this.colors.reset}       ${coverage.byStrength.weak}  (${((coverage.byStrength.weak / coverage.verifiedRelationships) * 100).toFixed(1)}%)`);
    console.log();

    // Top unverified
    if (topUnverified.length > 0) {
      this.printSection(`Top Unverified Relationships (${topUnverified.length})`);

      for (let i = 0; i < topUnverified.length; i++) {
        const ur = topUnverified[i];
        console.log(`  ${this.colors.red}${i + 1}. ${ur.sourceName} → ${ur.targetName}${this.colors.reset}`);
        console.log(`     Reason: ${this.colors.yellow}${ur.reason}${this.colors.reset}`);
        if (ur.suggestion) {
          console.log(`     ${this.colors.dim}Suggestion: ${ur.suggestion.split('\n')[0]}${this.colors.reset}`);
        }
        console.log();
      }
    }
  }

  /**
   * Display analysis for specific module
   */
  private displayModuleAnalysis(
    moduleName: string,
    coverage: any,
    allVerified: VerifiedRelationship[],
    graph: any
  ): void {
    // Find symbol ID by name
    const symbolIds = graph.nameIndex.get(moduleName);

    if (!symbolIds || symbolIds.length === 0) {
      this.printError(`Module not found: ${moduleName}`);
      return;
    }

    const symbolId = symbolIds[0];
    const symbol = graph.symbols.get(symbolId);

    this.printSection(`Relationship Verification for: ${moduleName}`);
    console.log(`  Symbol ID: ${this.colors.dim}${symbolId}${this.colors.reset}`);
    console.log(`  File: ${this.colors.dim}${symbol.filePath}:${symbol.line}${this.colors.reset}`);
    console.log();

    const calculator = new IntegrationCoverageCalculator(graph);
    const status = calculator.getSymbolVerificationStatus(symbolId, coverage);

    console.log(`  Total Relationships: ${status.totalRelationships}`);
    console.log(`  ${this.colors.green}✓ Verified:${this.colors.reset}    ${status.verifiedCount}`);
    console.log(`  ${this.colors.red}✗ Unverified:${this.colors.reset}  ${status.unverifiedCount}`);
    console.log();

    // Show verified relationships
    if (status.verifiedRelationships.length > 0) {
      this.printSection('Verified Relationships');
      for (const vr of status.verifiedRelationships) {
        const targetSymbol = graph.symbols.get(vr.target);
        const targetName = targetSymbol?.name || vr.target;

        const strengthColor = vr.strength === 'strong'
          ? this.colors.green
          : vr.strength === 'medium'
            ? this.colors.yellow
            : this.colors.dim;

        console.log(`  ${this.colors.green}✓${this.colors.reset} ${moduleName} → ${targetName}`);
        console.log(`    Strength: ${strengthColor}${vr.strength}${this.colors.reset}`);

        // Find evidence
        const evidence = allVerified.find(av => av.source === symbolId && av.target === vr.target);
        if (evidence) {
          console.log(`    Verified by: ${this.colors.dim}${evidence.verifiedBy}:${evidence.evidence[0]?.lineNumber}${this.colors.reset}`);
        }
        console.log();
      }
    }

    // Show unverified relationships
    if (status.unverifiedRelationships.length > 0) {
      this.printSection('Unverified Relationships');
      for (const ur of status.unverifiedRelationships) {
        const targetSymbol = graph.symbols.get(ur.target);
        const targetName = targetSymbol?.name || ur.target;

        console.log(`  ${this.colors.red}✗${this.colors.reset} ${moduleName} → ${targetName}`);
        console.log(`    Status: ${this.colors.yellow}${ur.reason}${this.colors.reset}`);
        console.log();
      }
    }
  }

  /**
   * Display unverified relationships only
   */
  private displayUnverifiedOnly(coverage: any): void {
    this.printSection(`Unverified Relationships (${coverage.unverifiedRelationships.length})`);

    for (const ur of coverage.unverifiedRelationships) {
      console.log(`  ${this.colors.red}✗${this.colors.reset} ${ur.sourceName} → ${ur.targetName}`);
      console.log(`    Reason: ${this.colors.yellow}${ur.reason}${this.colors.reset}`);

      if (ur.suggestion) {
        console.log(`    ${this.colors.dim}${ur.suggestion}${this.colors.reset}`);
      }
      console.log();
    }
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
