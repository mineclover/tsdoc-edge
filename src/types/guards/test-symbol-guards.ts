/**
 * Type guard functions for test symbols
 * @packageDocumentation
 */

import type { Symbol } from '../graph/graph';
import type { TestCase, TestScenario, TestSuite, TestSymbol } from '../test-symbols';

/**
 * Check if a symbol is any kind of test symbol
 * @public
 */
export function isTestSymbol(symbol: Symbol): symbol is TestSymbol {
  return symbol.type === 'test-suite' || symbol.type === 'test-case' || symbol.type === 'test-scenario';
}

/**
 * Check if a symbol is a test suite
 * @public
 */
export function isTestSuite(symbol: Symbol): symbol is TestSuite {
  return symbol.type === 'test-suite';
}

/**
 * Check if a symbol is a test case
 * @public
 */
export function isTestCase(symbol: Symbol): symbol is TestCase {
  return symbol.type === 'test-case';
}

/**
 * Check if a symbol is a test scenario
 * @public
 */
export function isTestScenario(symbol: Symbol): symbol is TestScenario {
  return symbol.type === 'test-scenario';
}

/**
 * Check if a symbol is an implementation symbol (not a test)
 * @public
 */
export function isImplementationSymbol(symbol: Symbol): boolean {
  return !isTestSymbol(symbol);
}

/**
 * Filter test symbols from a symbol array
 * @public
 */
export function filterTestSymbols(symbols: Symbol[]): TestSymbol[] {
  return symbols.filter(isTestSymbol) as TestSymbol[];
}

/**
 * Filter implementation symbols from a symbol array
 * @public
 */
export function filterImplementationSymbols(symbols: Symbol[]): Symbol[] {
  return symbols.filter(isImplementationSymbol);
}

/**
 * Group symbols by type category (implementation vs test)
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
