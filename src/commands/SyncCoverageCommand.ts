/**
 * Sync Coverage Command - Sync test coverage data
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CoverageParser } from '../analyzer/CoverageParser';
import { ConfigManager } from '../config/ConfigManager';
import {
  projectCoverageFunctionsToCanonicalNodes,
  projectCoverageReportToCanonicalNodes,
} from '../metrics/CanonicalCoverageProjection';
import { CoverageMetricReportRepository } from '../storage/CoverageMetricReportRepository';
import { GraphRepository } from '../storage/GraphRepository';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';

/**
 * Command for syncing test coverage data
 *
 * @doc [[SyncCoverageCommand]]
 * @public
 * @responsibility Sync test coverage from Istanbul/NYC reports
 * @contract Reads coverage JSON, creates source-identified metrics, stores report revision
 *
 * @problem Need to track which symbols are tested
 * @solves Imports coverage data and associates with symbols
 * @context Part of test coverage tracking
 *
 * @functionality
 * - Coverage parsing: Read Istanbul coverage-final.json
 * - Source identity: Hash the exact report bytes
 * - Metric projection: Emit execution.line/function/branch with counts
 * - Report persistence: Store an immutable coverage report revision
 * - Summary display: Total symbols covered
 * - Error handling: Handle missing coverage file
 *
 * @decision Use a separate report repository from the legacy symbol database
 * @rationale Coverage execution evidence and symbol relationships are different metric planes
 * @consequences Canonical node mapping remains a later migration phase
 *
 * @depends CoverageParser, CoverageMetricReportRepository, ConfigManager
 * @depType internal
 * @depReason Coverage data storage
 */
export class SyncCoverageCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'sync-coverage';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Sync test coverage data from Istanbul/NYC';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge sync-coverage [coverage-file] [options]

  Default: coverage/coverage-final.json
  --workspace <id>       Workspace identity (default: project.name)
  --report-db <file>     Report database (default: .tsdoc/coverage-metrics.db)
  --canonical-graph-db <file>  Project execution evidence to active ttsc graph revision`;
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

      const coveragePath = this.getPositionalArgs(args)[0] || 'coverage/coverage-final.json';

      if (!fs.existsSync(coveragePath)) {
        this.printError(`Coverage file not found: ${coveragePath}`);
        console.log();
        console.log('Generate coverage first:');
        this.printInfo('  npm test -- --coverage');
        console.log();
        return this.failure(`Coverage file not found: ${coveragePath}`);
      }

      this.printHeader('Sync Test Coverage');
      console.log(`Coverage file: ${colors.cyan}${coveragePath}${colors.reset}`);
      console.log();

      const config = ConfigManager.getInstance(process.cwd()).get();
      const workspaceId =
        this.getOption(args, '--workspace') || config.project?.name || path.basename(process.cwd());
      const reportDatabasePath = path.resolve(
        process.cwd(),
        this.getOption(args, '--report-db') || '.tsdoc/coverage-metrics.db'
      );
      const canonicalGraphDatabase = this.getOption(args, '--canonical-graph-db');
      const parser = new CoverageParser();
      const reportRepository = new CoverageMetricReportRepository(reportDatabasePath);
      const graphRepository = canonicalGraphDatabase
        ? new GraphRepository(path.resolve(process.cwd(), canonicalGraphDatabase), {
            readOnly: true,
          })
        : undefined;
      try {
        const parsed = parser.parseWithIdentity(coveragePath, { workspaceId });
        const report = reportRepository.storeReport({
          reportId: `coverage-report:${parsed.source.sourceIdentity}`,
          workspaceId,
          source: parsed.source,
          metrics: parsed.metrics,
          fileMetrics: parsed.fileMetrics,
        });

        this.printSection('✅ Coverage File Read');
        console.log(`Coverage format: ${colors.cyan}Istanbul/NYC${colors.reset}`);
        console.log(
          `Total files in coverage: ${colors.green}${parsed.summary.totalFiles}${colors.reset}`
        );
        console.log();
        this.printSection('✅ Source-Identified Report Stored');
        console.log(`Workspace: ${colors.cyan}${report.workspaceId}${colors.reset}`);
        console.log(`Report ID: ${colors.cyan}${report.reportId}${colors.reset}`);
        console.log(`Report DB: ${colors.cyan}${reportDatabasePath}${colors.reset}`);
        for (const metric of report.metrics) {
          console.log(
            `  ${metric.metricId}: ${metric.value.numerator}/${metric.value.denominator} (${(
              metric.value.ratio * 100
            ).toFixed(2)}%)`
          );
        }
        if (graphRepository) {
          const activeRevision = graphRepository.readActiveRevision();
          if (!activeRevision) {
            throw new Error('Canonical graph database has no active revision');
          }
          const projectionInput = {
            reportId: report.reportId,
            source: report.source,
            fileMetrics: report.fileMetrics,
          };
          const fileProjection = projectCoverageReportToCanonicalNodes(
            projectionInput,
            activeRevision.graph,
            { graphRevisionId: activeRevision.metadata.revisionId }
          );
          const functionProjection = projectCoverageFunctionsToCanonicalNodes(
            projectionInput,
            activeRevision.graph,
            { graphRevisionId: activeRevision.metadata.revisionId }
          );
          this.printSection('✅ Canonical Graph Projection');
          console.log(
            `Graph revision: ${colors.cyan}${activeRevision.metadata.revisionId}${colors.reset}`
          );
          console.log(
            `Graph fingerprint: ${colors.cyan}${activeRevision.graph.fingerprint}${colors.reset}`
          );
          console.log(
            `File attribution: ${fileProjection.matchedFiles.length} matched, ${fileProjection.unmatchedFiles.length} unmatched`
          );
          console.log(
            `Function evidence: ${functionProjection.matchedFunctions.length} direct, ${functionProjection.unmatchedFunctions.length} unmatched`
          );
          console.log(`${colors.dim}Projection policy: report-only${colors.reset}`);
        } else {
          console.log(
            `${colors.dim}Canonical graph projection skipped (use --canonical-graph-db <file>)${colors.reset}`
          );
        }
        console.log();

        return this.success('Coverage metric report stored');
      } finally {
        graphRepository?.close();
        reportRepository.close();
      }
    });
  }
}
