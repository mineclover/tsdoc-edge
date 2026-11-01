/**
 * Type guard functions for test symbols
 *
 * @packageDocumentation
 * @doc [[Types Index]]
 * @context Runtime type guards and category partitioners distinguishing test symbols from implementation symbols
 * @functionality Provides isTestSymbol, isTestSuite, isTestCase, isTestScenario, isImplementationSymbol, filterTestSymbols, filterImplementationSymbols, and groupSymbolsByCategory helpers
 */

import type { Symbol } from '../graph/graph';
import type { TestCase, TestScenario, TestSuite, TestSymbol } from '../test-symbols';

/**
 * Check if a symbol is any kind of test symbol
 * @param symbol - Symbol to check
 * @returns True if the symbol is a test-suite, test-case, or test-scenario
 * @doc [[Types Index]]
 * @public
 */
export function isTestSymbol(symbol: Symbol): symbol is TestSymbol {
  return (
    symbol.type === 'test-suite' || symbol.type === 'test-case' || symbol.type === 'test-scenario'
  );
}

/**
 * Check if a symbol is a test suite
 * @param symbol - Symbol to check
 * @returns True if the symbol is a test-suite
 * @doc [[Types Index]]
 * @public
 */
export function isTestSuite(symbol: Symbol): symbol is TestSuite {
  return symbol.type === 'test-suite';
}

/**
 * Check if a symbol is a test case
 * @param symbol - Symbol to check
 * @returns True if the symbol is a test-case
 * @doc [[Types Index]]
 * @public
 */
export function isTestCase(symbol: Symbol): symbol is TestCase {
  return symbol.type === 'test-case';
}

/**
 * Check if a symbol is a test scenario
 * @param symbol - Symbol to check
 * @returns True if the symbol is a test-scenario
 * @doc [[Types Index]]
 * @public
 */
export function isTestScenario(symbol: Symbol): symbol is TestScenario {
  return symbol.type === 'test-scenario';
}

/**
 * Check if a symbol is an implementation symbol (not a test)
 * @param symbol - Symbol to check
 * @returns True if the symbol is not a test symbol
 * @doc [[Types Index]]
 * @public
 */
export function isImplementationSymbol(symbol: Symbol): boolean {
  return !isTestSymbol(symbol);
}

/**
 * Filter test symbols from a symbol array
 * @param symbols - Array of symbols to filter
 * @returns Array containing only test symbols
 * @doc [[Types Index]]
 * @public
 */
export function filterTestSymbols(symbols: Symbol[]): TestSymbol[] {
  return symbols.filter(isTestSymbol);
}

/**
 * Filter implementation symbols from a symbol array
 * @param symbols - Array of symbols to filter
 * @returns Array containing only implementation symbols
 * @doc [[Types Index]]
 * @public
 */
export function filterImplementationSymbols(symbols: Symbol[]): Symbol[] {
  return symbols.filter(isImplementationSymbol);
}

/**
 * Group symbols by type category (implementation vs test)
 * @param symbols - Array of symbols to group
 * @returns Object with implementation and test symbol arrays
 * @doc [[Types Index]]
 * @public
 */
export function groupSymbolsByCategory(symbols: Symbol[]): {
  implementation: Symbol[];
  test: TestSymbol[];
} {
  return {
    implementation: filterImplementationSymbols(symbols),
    test: filterTestSymbols(symbols),
  };
}
