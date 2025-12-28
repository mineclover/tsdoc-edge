/**
 * Test Coverage Unifier
 *
 * @doc [[TestCoverageUnifier]]
 * @packageDocumentation
 * @responsibility Unify test coverage data into unified relationships
 *
 * @problem Test coverage data exists in test_mappings but not in unified system
 * @solves Extract and unify test coverage relationships
 * @context Essential for understanding what code is tested
 *
 * @functionality
 * - Extract test coverage from test_mappings table
 * - Create test-coverage relationships
 * - Support unit test tracking
 */

import type { Database } from 'better-sqlite3';
import type { DatabaseManager } from '../storage/DatabaseManager';
import type { SymbolGraph } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

/**
 * Test coverage relationship
 */
interface TestCoverage {
  symbolId: string;
  testFile: string;
  testName: string;
  confidence: number;
}

/**
 * Test Coverage Unifier
 *
 * @public
 * @responsibility Unify test coverage data into unified relationships
 */
export class TestCoverageUnifier {
  private graph: SymbolGraph;
  private dbManager: DatabaseManager | null;
  private db: Database | null;

  /**
   * Constructor supporting both DatabaseManager and raw Database for backwards compatibility
   */
  constructor(graph: SymbolGraph, db: Database | DatabaseManager) {
    this.graph = graph;
    if ('drizzleDb' in db) {
      // It's a DatabaseManager
      this.dbManager = db as DatabaseManager;
      this.db = null;
    } else {
      // It's a raw Database
      this.dbManager = null;
      this.db = db as Database;
    }
  }

  /**
   * Analyze all test coverage relationships
   *
   * @returns Array of test coverage relationships
   * @public
   */
  analyze(): UnifiedRelationship[] {
    const relationships: UnifiedRelationship[] = [];

    const coverages = this.extractTestCoverages();
    relationships.push(...this.createTestCoverageRelationships(coverages));

    return relationships;
  }

  /**
   * Extract test coverages from database
   *
   * @returns Array of test coverages
   * @private
   */
  private extractTestCoverages(): TestCoverage[] {
    const coverages: TestCoverage[] = [];

    try {
      if (this.dbManager) {
        // Use DatabaseManager helper methods
        if (!this.dbManager.hasTestMappingsTable()) {
          console.warn('TestCoverageUnifier: test_mappings table not found');
          return [];
        }

        const mappings = this.dbManager.getTestMappingsWithSymbols();

        for (const mapping of mappings) {
          // Verify symbol exists in graph
          if (this.graph.symbols.has(mapping.symbolId)) {
            coverages.push({
              symbolId: mapping.symbolId,
              testFile: mapping.testFilePath,
              testName: mapping.testName || 'unknown test',
              confidence: 1.0,
            });
          }
        }
      } else if (this.db) {
        // Fallback to raw database access for backwards compatibility
        const tableCheck = this.db
          .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='test_mappings'`)
          .get();

        if (!tableCheck) {
          console.warn('TestCoverageUnifier: test_mappings table not found');
          return [];
        }

        const mappings = this.db
          .prepare(
            `SELECT symbol_id, test_file_path, test_name
             FROM test_mappings
             WHERE symbol_id IS NOT NULL`
          )
          .all() as Array<{ symbol_id: string; test_file_path: string; test_name: string | null }>;

        for (const mapping of mappings) {
          // Verify symbol exists in graph
          if (this.graph.symbols.has(mapping.symbol_id)) {
            coverages.push({
              symbolId: mapping.symbol_id,
              testFile: mapping.test_file_path,
              testName: mapping.test_name || 'unknown test',
              confidence: 1.0,
            });
          }
        }
      }
    } catch (error) {
      console.warn('TestCoverageUnifier: Error reading test_mappings:', error);
    }

    return coverages;
  }

  /**
   * Create relationships from test coverages
   *
   * @param coverages - Test coverage data
   * @returns Array of relationships
   * @private
   */
  private createTestCoverageRelationships(coverages: TestCoverage[]): UnifiedRelationship[] {
    return coverages.map((coverage) => ({
      id: `test-coverage-${coverage.symbolId}-${coverage.testFile}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      type: 'test-coverage',
      category: 'verification',
      from: coverage.symbolId,
      to: `test:${coverage.testFile}`,
      direction: 'bidirectional',
      strength: 'strong',
      evidence: [
        {
          type: 'test',
          source: coverage.testFile,
          lineNumber: 0,
          confidence: coverage.confidence,
        },
      ],
      discoveredBy: 'test-analysis',
      confidence: coverage.confidence,
      properties: {
        testName: coverage.testName,
        testFile: coverage.testFile,
      },
      description: `${coverage.symbolId} tested by ${coverage.testName}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Get statistics about test coverage
   *
   * @param relationships - Test coverage relationships
   * @returns Statistics object
   * @public
   */
  getStatistics(relationships: UnifiedRelationship[]): {
    totalCoveredSymbols: number;
    totalTests: number;
    averageTestsPerSymbol: number;
  } {
    const symbolTests = new Map<string, number>();
    const testFiles = new Set<string>();

    for (const rel of relationships) {
      const symbolId = String(rel.from);
      symbolTests.set(symbolId, (symbolTests.get(symbolId) || 0) + 1);

      const testFile = String(rel.to);
      testFiles.add(testFile);
    }

    const totalCoveredSymbols = symbolTests.size;
    const totalTests = testFiles.size;
    const averageTestsPerSymbol =
      totalCoveredSymbols > 0 ? relationships.length / totalCoveredSymbols : 0;

    return {
      totalCoveredSymbols,
      totalTests,
      averageTestsPerSymbol,
    };
  }
}
