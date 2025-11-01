/**
 * Tests for EnhancedDocExtractor
 */

import { EnhancedDocExtractor } from '../parser/EnhancedDocExtractor';

describe('EnhancedDocExtractor', () => {
  let extractor: EnhancedDocExtractor;

  beforeEach(() => {
    extractor = new EnhancedDocExtractor();
  });

  describe('Basic Extraction', () => {
    test('should extract function with problem solving tag', () => {
      const sourceCode = `
/**
 * Process large CSV files efficiently
 * @problem Handle 5GB+ CSV files without OOM errors
 * @context Previous implementation loaded entire file into memory
 */
export function processLargeCSV(filePath: string): void {
  // implementation
}
      `;

      const results = extractor.extractFromFile('test.ts', sourceCode);

      expect(results).toHaveLength(1);
      expect(results[0].symbol.name).toBe('processLargeCSV');
      expect(results[0].symbol.type).toBe('function');
      expect(results[0].symbol.isExported).toBe(true);
      expect(results[0].doc.problemSolving).toBeDefined();
      expect(results[0].doc.problemSolving?.description).toContain('5GB');
    });

    test('should extract class with functionality tags', () => {
      const sourceCode = `
/**
 * Data processor class
 * @functionality Stream processing, NaN handling, Special character filtering
 * @features CSV parsing, Data validation, Error recovery
 */
export class DataProcessor {
  process() {}
}
      `;

      const results = extractor.extractFromFile('test.ts', sourceCode);

      expect(results).toHaveLength(1);
      expect(results[0].symbol.name).toBe('DataProcessor');
      expect(results[0].symbol.type).toBe('class');
      expect(results[0].doc.functionality).toBeDefined();
      expect(results[0].doc.functionality?.mainFeatures.length).toBeGreaterThan(0);
    });

    test('should extract error experience tags', () => {
      const sourceCode = `
/**
 * Validate input data
 * @error Input array too large
 * @errorType ValueError
 * @errorContext Loading 3GB file
 * @errorSolution Use chunksize parameter
 */
export function validateData(data: any[]): boolean {
  return true;
}
      `;

      const results = extractor.extractFromFile('test.ts', sourceCode);

      expect(results).toHaveLength(1);
      expect(results[0].doc.errorExperiences).toBeDefined();
      expect(results[0].doc.errorExperiences?.length).toBeGreaterThan(0);
      expect(results[0].doc.errorExperiences?.[0].errorType).toBe('ValueError');
    });

    test('should extract decision (ADR) tags', () => {
      const sourceCode = `
/**
 * Execute parallel tasks
 * @decision Use concurrent.futures for parallelism
 * @rationale I/O bound tasks benefit from thread pool
 * @consequences Better performance, Simplified code
 */
export function executeParallel(): void {}
      `;

      const results = extractor.extractFromFile('test.ts', sourceCode);

      expect(results).toHaveLength(1);
      expect(results[0].doc.decisions).toBeDefined();
      expect(results[0].doc.decisions?.length).toBeGreaterThan(0);
      expect(results[0].doc.decisions?.[0].decision).toContain('concurrent.futures');
    });

    test('should extract dependency tags', () => {
      const sourceCode = `
/**
 * Load configuration
 * @depends config_loader, env_parser
 * @depType module
 * @depReason Need runtime configuration
 */
export function loadConfig(): any {}
      `;

      const results = extractor.extractFromFile('test.ts', sourceCode);

      expect(results).toHaveLength(1);
      expect(results[0].doc.dependencies).toBeDefined();
      expect(results[0].doc.dependencies?.length).toBeGreaterThan(0);
    });

    test('should extract future plan (TODO) tags', () => {
      const sourceCode = `
/**
 * Read from S3
 * @todo Implement S3 streaming support with boto3
 * @priority high
 */
export function readFromS3(): void {}
      `;

      const results = extractor.extractFromFile('test.ts', sourceCode);

      expect(results).toHaveLength(1);
      expect(results[0].doc.futurePlans).toBeDefined();
      expect(results[0].doc.futurePlans?.length).toBeGreaterThan(0);
      expect(results[0].doc.futurePlans?.[0].priority).toBe('high');
    });
  });

  describe('Completeness Calculation', () => {
    test('should calculate 100% completeness for full documentation', () => {
      const sourceCode = `
/**
 * Fully documented function
 * @problem Test problem
 * @functionality Feature 1, Feature 2
 * @error Test error
 * @errorSolution Fix it
 * @decision Test decision
 * @depends dep1
 * @todo Future plan
 */
export function fullyDocumented(): void {}
      `;

      const results = extractor.extractFromFile('test.ts', sourceCode);

      expect(results[0].completeness).toBe(100);
      expect(results[0].missing).toHaveLength(0);
    });

    test('should calculate partial completeness', () => {
      const sourceCode = `
/**
 * Partially documented function
 * @problem Test problem
 * @functionality Feature 1
 */
export function partiallyDocumented(): void {}
      `;

      const results = extractor.extractFromFile('test.ts', sourceCode);

      expect(results[0].completeness).toBeLessThan(100);
      expect(results[0].completeness).toBeGreaterThan(0);
      expect(results[0].missing.length).toBeGreaterThan(0);
    });

    test('should handle no documentation', () => {
      const sourceCode = `
export function noDoc(): void {}
      `;

      const results = extractor.extractFromFile('test.ts', sourceCode);

      // With includePartial: true (default)
      expect(results).toHaveLength(1);
      expect(results[0].completeness).toBe(0);
      expect(results[0].missing).toHaveLength(6);
    });
  });

  describe('Multiple Symbols', () => {
    test('should extract multiple symbols from file', () => {
      const sourceCode = `
/**
 * Function 1
 * @problem Problem 1
 */
export function func1(): void {}

/**
 * Function 2
 * @functionality Feature 1
 */
export function func2(): void {}

/**
 * Class 1
 * @todo Plan 1
 */
export class Class1 {}
      `;

      const results = extractor.extractFromFile('test.ts', sourceCode);

      expect(results).toHaveLength(3);
      expect(results.map(r => r.symbol.name)).toEqual(['func1', 'func2', 'Class1']);
    });
  });

  describe('Options', () => {
    test('should respect includePartial option', () => {
      const extractor = new EnhancedDocExtractor({ includePartial: false });

      const sourceCode = `
export function noDoc(): void {}

/**
 * Has doc
 * @problem Test
 */
export function hasDoc(): void {}
      `;

      const results = extractor.extractFromFile('test.ts', sourceCode);

      expect(results).toHaveLength(1);
      expect(results[0].symbol.name).toBe('hasDoc');
    });

    test('should use custom default version', () => {
      const extractor = new EnhancedDocExtractor({ defaultVersion: '2.0.0' });

      const sourceCode = `
/**
 * Test function
 * @problem Test
 */
export function test(): void {}
      `;

      const results = extractor.extractFromFile('test.ts', sourceCode);

      expect(results[0].doc.version).toBe('2.0.0');
    });
  });
});
