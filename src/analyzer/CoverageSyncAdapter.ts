/**
 * Coverage sync adapter - maps test coverage to TSDoc symbols
 *
 * @packageDocumentation
 * @responsibility Provide pluggable adapter pattern for test coverage integration
 *
 * @problem Different test runners (Jest, Vitest, Mocha) output different formats
 * @solves Unified API to reflect test coverage into TSDoc regardless of test runner
 *
 * @decision Use adapter pattern for extensibility
 * @rationale Different test runners need different parsing strategies
 * @consequences Easy to add new test runner support, Clean separation of concerns
 */

import type { Symbol } from '../types/graph';
import type { FileCoverage, FunctionCoverage, CoverageSummary } from './CoverageParser';

/**
 * Coverage data for a specific symbol
 * @public
 */
export interface SymbolCoverage {
  /** Symbol identifier */
  symbolId: string;
  /** Symbol name */
  symbolName: string;
  /** File path */
  filePath: string;
  /** Line number */
  line: number;
  /** Whether this symbol is covered by tests */
  covered: boolean;
  /** Number of times executed (for functions) */
  executionCount?: number;
  /** Line coverage percentage */
  lineCoverage?: number;
  /** Statement coverage percentage */
  statementCoverage?: number;
  /** Lines covered */
  coveredLines?: number[];
  /** Lines not covered */
  uncoveredLines?: number[];
}

/**
 * Coverage sync result
 * @public
 */
export interface CoverageSyncResult {
  /** Total symbols processed */
  totalSymbols: number;
  /** Symbols with coverage data */
  coveredSymbols: number;
  /** Symbols without coverage data */
  uncoveredSymbols: number;
  /** Symbol coverage details */
  symbolCoverages: SymbolCoverage[];
  /** Overall coverage percentage */
  overallCoverage: number;
}

/**
 * Abstract coverage adapter
 * Implement this to support different test runners
 *
 * @public
 * @responsibility Define interface for coverage adapters
 */
export abstract class CoverageAdapter {
  /**
   * Parse coverage data from test runner output
   *
   * @param coveragePath - Path to coverage file(s)
   * @returns Parsed coverage summary
   */
  abstract parseCoverage(coveragePath: string): CoverageSummary;

  /**
   * Get adapter name
   * @returns Returns string
   */
  abstract getName(): string;
}

/**
 * Coverage sync utility
 * Maps coverage data to symbols and provides API to update TSDoc
 *
 * @public
 * @responsibility
 * - Map coverage data to symbols based on file path and line number
 * - Provide API to sync coverage into TSDoc symbols
 * - Support pluggable adapters for different test runners
 *
 * @example
 * ```typescript
 * const syncer = new CoverageSyncer(istanbulAdapter);
 * const summary = syncer.parseCoverage('coverage/coverage-final.json');
 * const result = syncer.syncToSymbols(symbols, summary);
 * console.log(result.overallCoverage); // 85.3
 * ```
 */
export class CoverageSyncer {
  private adapter: CoverageAdapter;

  /**
   * Create a new coverage syncer
   *
   * @param adapter - Coverage adapter for specific test runner
   */
  constructor(adapter: CoverageAdapter) {
    this.adapter = adapter;
  }

  /**
   * Parse coverage data using the configured adapter
   *
   * @param coveragePath - Path to coverage file
   * @returns Coverage summary
   */
  parseCoverage(coveragePath: string): CoverageSummary {
    return this.adapter.parseCoverage(coveragePath);
  }

  /**
   * Sync coverage data to symbols
   *
   * @param symbols - Array of symbols to sync coverage to
   * @param coverageSummary - Parsed coverage summary
   * @returns Sync result with coverage details
   *
   * @example
   * ```typescript
   * const symbols = symbolRegistry.getAllSymbols();
   * const summary = syncer.parseCoverage('coverage/coverage-final.json');
   * const result = syncer.syncToSymbols(symbols, summary);
   * ```
   */
  syncToSymbols(
    symbols: Symbol[],
    coverageSummary: CoverageSummary
  ): CoverageSyncResult {
    const symbolCoverages: SymbolCoverage[] = [];
    let coveredCount = 0;

    for (const symbol of symbols) {
      const coverage = this.findCoverageForSymbol(symbol, coverageSummary);

      if (coverage) {
        symbolCoverages.push(coverage);
        if (coverage.covered) {
          coveredCount++;
        }
      } else {
        // Symbol has no coverage data
        symbolCoverages.push({
          symbolId: symbol.id,
          symbolName: symbol.name,
          filePath: symbol.filePath,
          line: symbol.line,
          covered: false,
        });
      }
    }

    return {
      totalSymbols: symbols.length,
      coveredSymbols: coveredCount,
      uncoveredSymbols: symbols.length - coveredCount,
      symbolCoverages,
      overallCoverage: symbols.length > 0 ? (coveredCount / symbols.length) * 100 : 0,
    };
  }

  /**
   * Find coverage data for a specific symbol
   *
   * @param symbol - Symbol to find coverage for
   * @param summary - Coverage summary
   * @returns Symbol coverage or null
   */
  private findCoverageForSymbol(
    symbol: Symbol,
    summary: CoverageSummary
  ): SymbolCoverage | null {
    // Find file coverage
    const filePath = symbol.filePath;
    let fileCoverage: FileCoverage | null = null;

    // Try exact match
    if (summary.files.has(filePath)) {
      fileCoverage = summary.files.get(filePath)!;
    } else {
      // Try to find by relative path or basename
      for (const [path, coverage] of summary.files.entries()) {
        if (path.endsWith(filePath) || path.includes(filePath)) {
          fileCoverage = coverage;
          break;
        }
      }
    }

    if (!fileCoverage) {
      return null;
    }

    // For functions, try to find function-level coverage
    if (symbol.type === 'function' || symbol.type === 'method') {
      const fnCoverage = this.findFunctionCoverage(symbol, fileCoverage);
      if (fnCoverage) {
        return {
          symbolId: symbol.id,
          symbolName: symbol.name,
          filePath: symbol.filePath,
          line: symbol.line,
          covered: fnCoverage.covered,
          executionCount: fnCoverage.count,
          lineCoverage: fileCoverage.lineCoverage,
          statementCoverage: fileCoverage.statementCoverage,
        };
      }
    }

    // For classes, interfaces, types - check if the line is covered
    const lineCovered = fileCoverage.coveredLines.includes(symbol.line);

    return {
      symbolId: symbol.id,
      symbolName: symbol.name,
      filePath: symbol.filePath,
      line: symbol.line,
      covered: lineCovered,
      lineCoverage: fileCoverage.lineCoverage,
      statementCoverage: fileCoverage.statementCoverage,
      coveredLines: fileCoverage.coveredLines,
      uncoveredLines: fileCoverage.uncoveredLines,
    };
  }

  /**
   * Find function coverage by name and line
   */
  private findFunctionCoverage(
    symbol: Symbol,
    fileCoverage: FileCoverage
  ): FunctionCoverage | null {
    // Try exact name match first
    let fnCov = fileCoverage.functions.find(f => f.name === symbol.name);
    if (fnCov) return fnCov;

    // Try to find by line number (within ±2 lines tolerance)
    fnCov = fileCoverage.functions.find(
      f => Math.abs(f.line - symbol.line) <= 2
    );
    if (fnCov) return fnCov;

    return null;
  }

  /**
   * Get the adapter being used
   * @returns Returns CoverageAdapter
   */
  getAdapter(): CoverageAdapter {
    return this.adapter;
  }
}

/**
 * Update symbol with coverage information
 * This is a helper utility to apply coverage to a symbol object
 *
 * @param symbol - Symbol to update
 * @param coverage - Coverage data
 * @returns Updated symbol
 *
 * @public
 * @example
 * ```typescript
 * const updatedSymbol = updateSymbolWithCoverage(symbol, symbolCoverage);
 * console.log(updatedSymbol.metadata.coverage); // 85.3
 * ```
 */
export function updateSymbolWithCoverage(
  symbol: Symbol,
  coverage: SymbolCoverage
): Symbol {
  return {
    ...symbol,
    metadata: {
      ...symbol.metadata,
      coverage: {
        covered: coverage.covered,
        executionCount: coverage.executionCount,
        lineCoverage: coverage.lineCoverage,
        statementCoverage: coverage.statementCoverage,
      },
    },
  };
}
