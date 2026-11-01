/**
 * Test symbol types and interfaces
 *
 * @packageDocumentation
 * @doc [[Types Index]]
 * @context Test suite, test case, test scenario, and test coverage extraction contracts
 * @functionality Defines BaseTestSymbol, TestSuite, TestCase, TestScenario, TestSymbol, TestCoverageMetadata, TestExtractionResult, and TestExtractionOptions types
 * @see [[TEST_SYMBOL_EXTRACTION]] for extraction strategy
 */

import type { Symbol, TestSymbolType } from './graph/graph';

/**
 * Base test symbol interface
 * Extends Symbol with test-specific properties
 * @doc [[Types Index]]
 * @public
 */
export interface BaseTestSymbol extends Omit<Symbol, 'type'> {
  /**
   * Test symbol type
   */
  type: TestSymbolType;

  /**
   * Parent test suite ID (null for root suites)
   */
  parentSymbol: string | null;

  /**
   * Test file path (always a .test.ts or .spec.ts file)
   */
  filePath: string;
}

/**
 * Test Suite symbol
 * Represents a describe() block in test files
 * @doc [[Types Index]]
 * @public
 * @example
 * ```typescript
 * describe('DatabaseManager', () => {
 *   describe('Symbol Operations', () => {
 *     // ...
 *   });
 * });
 * ```
 */
export interface TestSuite extends BaseTestSymbol {
  /**
   * Type discriminator
   */
  type: 'test-suite';

  /**
   * Child test suite IDs (nested describe blocks)
   */
  childSuites: string[];

  /**
   * Test case IDs (it/test blocks)
   */
  testCases: string[];

  /**
   * Nesting level (0 = root, 1 = first level, etc.)
   */
  nestingLevel: number;
}

/**
 * Test Case symbol
 * Represents an it() or test() block in test files
 * @doc [[Types Index]]
 * @public
 * @example
 * ```typescript
 * it('should insert symbol', () => {
 *   const result = dbManager.insertSymbol(testSymbol, 0);
 *   expect(result).toBe(true);
 * });
 * ```
 */
export interface TestCase extends BaseTestSymbol {
  /**
   * Type discriminator
   */
  type: 'test-case';

  /**
   * Implementation symbol IDs tested by this test case
   * Extracted by parsing test code for symbol references
   */
  testedSymbols: string[];

  /**
   * Test method names called (e.g., 'insertSymbol', 'getSymbol')
   */
  testedMethods: string[];

  /**
   * Test assertions count (rough complexity measure)
   */
  assertionCount?: number;
}

/**
 * Test Scenario symbol
 * Represents a `@testScenario` JSDoc tag
 * @doc [[Types Index]]
 * @public
 * @example
 * ```typescript
 * /**
 *  * @testScenario Database initialization with schema
 *  * @testScenario Symbol insertion and retrieval
 *  *\/
 * ```
 */
export interface TestScenario extends BaseTestSymbol {
  /**
   * Type discriminator
   */
  type: 'test-scenario';

  /**
   * Test case IDs that cover this scenario
   */
  coveredBy: string[];

  /**
   * Scenario description (from @testScenario tag)
   */
  description: string;
}

/**
 * Union of all test symbol types
 * @doc [[Types Index]]
 * @public
 */
export type TestSymbol = TestSuite | TestCase | TestScenario;

/**
 * Test coverage relationship metadata
 * @doc [[Types Index]]
 * @public
 */
export interface TestCoverageMetadata {
  /**
   * Test case that provides coverage
   */
  testCaseId: string;

  /**
   * Implementation symbol being tested
   */
  implementationSymbolId: string;

  /**
   * Tested methods (if applicable)
   */
  testedMethods: string[];

  /**
   * Coverage strength (0-1)
   * Based on assertion count, edge cases, etc.
   */
  coverageStrength: number;
}

/**
 * Test extraction result
 * @doc [[Types Index]]
 * @public
 */
export interface TestExtractionResult {
  /**
   * All extracted test symbols
   */
  testSymbols: TestSymbol[];

  /**
   * Test suites only
   */
  testSuites: TestSuite[];

  /**
   * Test cases only
   */
  testCases: TestCase[];

  /**
   * Test scenarios only
   */
  testScenarios: TestScenario[];

  /**
   * Test coverage relationships
   */
  coverageRelationships: TestCoverageMetadata[];

  /**
   * Extraction errors (if any)
   */
  errors: Array<{
    file: string;
    line: number;
    message: string;
  }>;
}

/**
 * Test symbol extraction options
 * @doc [[Types Index]]
 * @public
 */
export interface TestExtractionOptions {
  /**
   * Extract test coverage relationships?
   * Default: true
   */
  extractCoverage?: boolean;

  /**
   * Extract @testScenario tags?
   * Default: true
   */
  extractScenarios?: boolean;

  /**
   * Maximum nesting level for test suites
   * Default: Infinity
   */
  maxNestingLevel?: number;

  /**
   * Include skipped tests (describe.skip, it.skip)?
   * Default: false
   */
  includeSkipped?: boolean;
}
