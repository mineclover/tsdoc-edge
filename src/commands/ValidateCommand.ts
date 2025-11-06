/**
 * Validate command - Generate detailed validation report
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { ConnectivityValidator } from '../validator/ConnectivityValidator';
import type { Symbol } from '../types/graph/graph';

/**
 * Database row types
 */
interface SymbolRow {
  id: string;
  name: string;
  type: string;
  file_path: string;
  line: number;
  column: number;
  is_exported: number;
  is_public: number;
  summary: string | null;
}

/**
 * RelationshipRow interface
 * @public
 */
interface RelationshipRow {
  type: string;
  from_id: string;
  to_id: string;
  file_path: string | null;
  line: number;
  description: string;
}

/**
 * Command for generating detailed validation reports
 *
 * @public
 * @responsibility Generate detailed validation report from database
 * @contract Read database, build symbol graph, validate connectivity
 *
 * @problem Developers need comprehensive validation reports for code documentation
 * @solves Loads symbol data from database, builds graph, and generates validation report
 * @context Part of SSOT enforcement system for documentation connectivity
 *
 * @functionality
 * - Database reading: Load symbols and relationships from SQLite
 * - Graph building: Construct symbol graph from database records
 * - Validation: Run connectivity validator on graph
 * - Report formatting: Display detailed validation results
 *
 * @decision Use demo database path as default
 * @rationale Matches existing CLI behavior for consistency
 * @consequences Users must run demo or specify custom database path
 *
 * @depends DatabaseManager, SymbolGraphBuilder, ConnectivityValidator
 * @depType internal
 * @depReason Core validation infrastructure
 */
export class ValidateCommand extends BaseCommand {
  constructor(
    private dbManager?: DatabaseManager,
    private graphBuilder?: SymbolGraphBuilder,
    private validator?: ConnectivityValidator
  ) {
    super();
  }

  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'validate';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Generate detailed validation report';
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      this.printHeader('Detailed Validation Report');

      const dbPath = path.join(process.cwd(), 'demo', 'output', 'tsdoc-edge.db');

      if (!fs.existsSync(dbPath)) {
        this.printWarning('Database not found. Run demo first: npm run demo');
        console.log();
        console.log('To create the database, run:');
        this.printInfo('  npm run demo');
        console.log();
        return this.failure('Database not found', 1);
      }

      const jsonlPath = path.join(process.cwd(), 'demo', 'output', 'data');
      const dbManager = this.dbManager || new DatabaseManager(dbPath, jsonlPath);
      const graphBuilder = this.graphBuilder || new SymbolGraphBuilder();

      try {
        // Get all symbols from database
        const symbolQuery = 'SELECT * FROM symbols';
        const symbolStmt = dbManager.db.prepare(symbolQuery);
        const symbolRows = symbolStmt.all() as SymbolRow[];

        // Build symbol graph
        for (const row of symbolRows) {
          const symbol: Symbol = {
            id: row.id,
            name: row.name,
            type: row.type as Symbol['type'],
            filePath: row.file_path,
            line: row.line,
            column: row.column,
            isExported: row.is_exported === 1,
            isPublic: row.is_public === 1,
            summary: row.summary ?? undefined,
            tests: [],
            designDecisions: [],
          };
          graphBuilder.addSymbol(symbol);
        }

        // Get relationships from database if they exist
        try {
          const relQuery = 'SELECT * FROM relationships';
          const relStmt = dbManager.db.prepare(relQuery);
          const relRows = relStmt.all() as RelationshipRow[];

          for (const row of relRows) {
            graphBuilder.addRelationship({
              type: row.type as 'dependsOn' | 'usedBy' | 'implements' | 'extends' | 'relatedTo',
              from: row.from_id,
              to: row.to_id,
              filePath: row.file_path || '',
              line: row.line,
              description: row.description,
            });
          }
        } catch (_error) {
          // Relationships table might not exist, that's okay
          this.printWarning('Relationships table not found, skipping...');
        }

        // Create validator and generate detailed report
        const validator = this.validator || new ConnectivityValidator(graphBuilder);
        const report = validator.generateDetailedReport();
        const formattedReport = validator.formatDetailedReport(report);

        console.log(formattedReport);

        return this.success();
      } catch (error) {
        this.printError('Error generating validation report');
        throw error;
      } finally {
        if (!this.dbManager) {
          dbManager.close();
        }
      }
    });
  }
}
