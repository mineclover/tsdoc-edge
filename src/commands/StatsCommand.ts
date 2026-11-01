/**
 * Stats Command - Show documentation and SSOT graph statistics
 *
 * @packageDocumentation
 * @doc [[StatsCommand]]
 * @doc [[CLI Commands]]
 * @context Top-level `stats` command reporting documentation coverage and 3-plane SSOT graph statistics
 * @functionality Queries symbol database, canonical `@ttsc/graph`, and `SpecGraph` snapshots and formats human, `--json`, or `--xml` reports
 * @sideEffect console: Writes formatted statistics to stdout
 * @sideEffect database: Reads `.tsdoc.db`, `.tsdoc/canonical-graph.db`, and `.tsdoc/spec-graph.db` (read)
 */

import { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { readCanonicalGraphSnapshot, readSpecGraphSnapshot } from './canonicalReadHelper';

/**
 * Command for showing documentation and SSOT graph statistics.
 *
 * @public
 * @responsibility Display comprehensive documentation statistics
 * @contract Analyzes database, computes stats, supports human (default), JSON, and XML output
 * @doc [[StatsCommand]]
 * @doc [[CLI Commands]]
 * @doc [[CLI Commands#stats]]
 * @sideEffect console: Writes formatted CLI statistics to stdout; reads SQLite repositories
 *
 * @problem Need to track documentation quality metrics over time
 * @solves Collects and displays stats with human-readable default output and machine formats
 * @context Part of quality tracking and improvement
 *
 * @functionality
 * - Stats collection: Total symbols, coverage, SSOT graph summaries
 * - Output formats: Human-readable default, `--json`, and `--xml`
 *
 * @decision Default to human-readable output with explicit `--json` and `--xml` flags
 * @rationale Matches core CLI UX conventions while preserving machine-readable pipelines
 * @consequences Callers needing XML pass `--xml`
 */
export class StatsCommand extends BaseCommand {
  private dbManager?: DatabaseManager;

  constructor(dbManager?: DatabaseManager) {
    super();
    this.dbManager = dbManager;
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'stats';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['s'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Show documentation and SSOT graph statistics';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge stats [options]

Options:
  --human   Human-readable terminal output (default)
  --json    JSON output
  --xml     XML output`;
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

      const flagError = this.validateAllowedFlags(args, ['--human', '--json', '--xml']);
      if (flagError) return flagError;

      const isJson = this.hasFlag(args, '--json');
      const isXml = this.hasFlag(args, '--xml');

      if (!this.dbManager) {
        const dbCheck = this.checkDatabaseExists();
        if (dbCheck) return dbCheck;
      }

      const dbPath = this.getDatabasePath();
      const jsonlPath = this.getJsonlPath();
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);

      try {
        const stats = dbManager.getStatistics();
        const canonicalSnapshot = this.dbManager ? null : readCanonicalGraphSnapshot();
        const specSnapshot = this.dbManager ? null : readSpecGraphSnapshot();

        const allSymbols = dbManager.getAllSymbolRows();
        const total = allSymbols.length;

        if (total === 0) {
          if (isJson) {
            console.log(
              JSON.stringify(
                {
                  database: {
                    totalSymbols: 0,
                    totalEnhancedDocs: 0,
                    dbSizeKB: 0,
                  },
                  message:
                    'No symbols found in database. Run tsdoc-edge sync to build the symbol database.',
                },
                null,
                2
              )
            );
          } else if (isXml) {
            this.printOutput(
              'statistics',
              {
                database: {
                  totalSymbols: 0,
                  totalEnhancedDocs: 0,
                  dbSizeKB: 0,
                },
                message: {
                  text: 'No symbols found in database. Run tsdoc-edge sync to build the symbol database.',
                },
              },
              args.filter((arg) => arg !== '--human')
            );
          } else {
            this.printHeader('TSDoc Edge - Documentation Statistics');
            console.log(`${colors.yellow}No symbols found in database.${colors.reset}`);
            console.log();
            console.log(`${colors.bold}Getting Started:${colors.reset}`);
            console.log(
              `  1. Run ${colors.cyan}tsdoc-edge sync${colors.reset} to build and sync SSOT planes`
            );
            console.log(
              `  2. Run ${colors.cyan}tsdoc-edge stats${colors.reset} again to see statistics`
            );
            console.log();
          }
          return this.success();
        }

        const documented = allSymbols.filter((s) => s.summary && s.summary.trim() !== '').length;
        const testTotal = allSymbols.filter(
          (s) => s.type === 'test-case' || s.type === 'test-suite'
        ).length;
        const sourceTotal = total - testTotal;
        const sourceDocumented = allSymbols.filter(
          (s) =>
            s.type !== 'test-case' &&
            s.type !== 'test-suite' &&
            s.summary &&
            s.summary.trim() !== ''
        ).length;
        const coverage = (documented / total) * 100;
        const sourceCoverage = sourceTotal > 0 ? (sourceDocumented / sourceTotal) * 100 : 0;
        const testPercent = (testTotal / total) * 100;
        const dbSizeKB = Number((stats.dbSize / 1024).toFixed(2));

        if (isJson) {
          console.log(
            JSON.stringify(
              {
                database: {
                  totalSymbols: stats.totalSymbols,
                  totalEnhancedDocs: stats.totalEnhancedDocs,
                  dbSizeKB,
                },
                coverage: {
                  overall: {
                    documented,
                    total,
                    coveragePercent: Number(coverage.toFixed(1)),
                  },
                  source: {
                    documented: sourceDocumented,
                    total: sourceTotal,
                    coveragePercent: Number(sourceCoverage.toFixed(1)),
                  },
                  tests: {
                    total: testTotal,
                    percentOfTotal: Number(testPercent.toFixed(1)),
                  },
                },
                ...(canonicalSnapshot
                  ? {
                      canonicalGraph: {
                        activeRevisionId: canonicalSnapshot.activeRevisionId,
                        retainedRevisions: canonicalSnapshot.retainedRevisions,
                        internalNodes: canonicalSnapshot.internalNodes,
                        internalEdges: canonicalSnapshot.internalEdges,
                        totalNodes: canonicalSnapshot.totalNodes,
                        totalEdges: canonicalSnapshot.totalEdges,
                      },
                    }
                  : {}),
                ...(specSnapshot
                  ? {
                      specGraph: {
                        activeRevisionId: specSnapshot.activeRevisionId,
                        nodes: specSnapshot.nodeCount,
                        bindings: specSnapshot.bindingCount,
                      },
                    }
                  : {}),
              },
              null,
              2
            )
          );
        } else if (isXml) {
          this.printOutput(
            'statistics',
            {
              database: {
                totalSymbols: stats.totalSymbols,
                totalEnhancedDocs: stats.totalEnhancedDocs,
                dbSizeKB: (stats.dbSize / 1024).toFixed(2),
              },
              coverage: {
                overall: {
                  documented,
                  total,
                  coveragePercent: coverage.toFixed(1),
                },
                source: {
                  documented: sourceDocumented,
                  total: sourceTotal,
                  coveragePercent: sourceCoverage.toFixed(1),
                },
                tests: {
                  total: testTotal,
                  percentOfTotal: testPercent.toFixed(1),
                },
              },
            },
            args.filter((arg) => arg !== '--human')
          );
        } else {
          this.printHeader('TSDoc Edge - Documentation Statistics');

          this.printSection('📊 Database Statistics');
          console.log(`Total Symbols: ${colors.green}${stats.totalSymbols}${colors.reset}`);
          console.log(
            `Total Enhanced Docs: ${colors.green}${stats.totalEnhancedDocs}${colors.reset}`
          );
          console.log(
            `DB Size: ${colors.cyan}${(stats.dbSize / 1024).toFixed(2)} KB${colors.reset}`
          );
          console.log();

          if (canonicalSnapshot || specSnapshot) {
            this.printSection('🔗 SSOT Graph Planes');
            if (canonicalSnapshot) {
              console.log(
                `Canonical @ttsc/graph: ${colors.cyan}${canonicalSnapshot.internalNodes.toLocaleString()}${colors.reset} nodes / ${colors.cyan}${canonicalSnapshot.internalEdges.toLocaleString()}${colors.reset} edges (${canonicalSnapshot.retainedRevisions} retained revisions)`
              );
            }
            if (specSnapshot) {
              console.log(
                `SpecGraph: ${colors.cyan}${specSnapshot.nodeCount}${colors.reset} spec nodes / ${colors.cyan}${specSnapshot.bindingCount}${colors.reset} bindings`
              );
            }
            console.log();
          }

          this.printSection('📈 Documentation Coverage');
          console.log(`${colors.bold}Overall:${colors.reset}`);
          console.log(`  Documented: ${colors.green}${documented}${colors.reset} / ${total}`);
          console.log(`  Coverage: ${colors.bold}${coverage.toFixed(1)}%${colors.reset}`);
          console.log();
          console.log(
            `${colors.bold}Source Code Only:${colors.reset} ${colors.dim}(excluding test-case, test-suite)${colors.reset}`
          );
          console.log(
            `  Documented: ${colors.green}${sourceDocumented}${colors.reset} / ${sourceTotal}`
          );
          console.log(`  Coverage: ${colors.bold}${sourceCoverage.toFixed(1)}%${colors.reset}`);
          console.log();
          console.log(
            `${colors.dim}Test Symbols: ${testTotal} (${testPercent.toFixed(1)}% of total)${colors.reset}`
          );
          console.log();
        }

        return this.success();
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}
