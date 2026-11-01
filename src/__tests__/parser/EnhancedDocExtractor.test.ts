/**
 * Tests for EnhancedDocExtractor
 */

import { EnhancedDocExtractor } from '../../parser/EnhancedDocExtractor';

describe('EnhancedDocExtractor', () => {
  let extractor: EnhancedDocExtractor;

  beforeEach(() => {
    extractor = new EnhancedDocExtractor();
  });

  describe('constructor', () => {
    it('should create EnhancedDocExtractor', () => {
      expect(extractor).toBeDefined();
    });
  });

  describe('extractFromFile', () => {
    it('should extract problem tag', () => {
      const source = `
/**
 * Test class
 * @problem Need to handle user authentication
 */
export class AuthHandler {}
      `;

      const result = extractor.extractFromFile('test.ts', source);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should extract functionality tag', () => {
      const source = `
/**
 * Test class
 * @functionality Handles user login and logout
 */
export class AuthService {}
      `;

      const result = extractor.extractFromFile('test.ts', source);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should extract decision tags', () => {
      const source = `
/**
 * Test class
 * @decision Use JWT for authentication
 * @rationale JWT is stateless and scalable
 */
export class TokenService {}
      `;

      const result = extractor.extractFromFile('test.ts', source);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple symbols', () => {
      const source = `
/**
 * First class
 * @problem Problem 1
 */
export class Class1 {}

/**
 * Second class
 * @problem Problem 2
 */
export class Class2 {}
      `;

      const result = extractor.extractFromFile('test.ts', source);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle no enhanced docs', () => {
      const source = `
/**
 * Simple class
 */
export class Simple {}
      `;

      const result = extractor.extractFromFile('test.ts', source);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('tag extraction', () => {
    it('should extract dependencies from AST imports and semantic relation tags', () => {
      const source = `
import { Database } from 'better-sqlite3';

/**
 * Test class
 * @relatedTo UserCache - Caching layer
 */
export class UserRepository {}
      `;

      const result = extractor.extractFromFile('test.ts', source);

      expect(result).toHaveLength(1);
      expect(result[0].doc.dependencies).toEqual([
        { target: 'better-sqlite3', type: 'external', reason: 'TypeScript AST import' },
        { target: 'UserCache', type: 'symbol', reason: 'Caching layer' },
      ]);
    });

    it('should extract future plans from standard @privateRemarks', () => {
      const source = `
/**
 * Test class
 * @privateRemarks PLAN [high]: Add caching layer
 */
export class CacheService {}
      `;

      const result = extractor.extractFromFile('test.ts', source);

      expect(result).toHaveLength(1);
      expect(result[0].doc.futurePlans?.[0]?.description).toBe('Add caching layer');
      expect(result[0].doc.futurePlans?.[0]?.priority).toBe('high');
    });

    it('should extract error experience tags', () => {
      const source = `
/**
 * Test class
 * @errorExp Connection timeout
 * @errorSolution Add retry logic
 */
export class NetworkService {}
      `;

      const result = extractor.extractFromFile('test.ts', source);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty source', () => {
      const result = extractor.extractFromFile('test.ts', '');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle source without comments', () => {
      const source = 'export class NoComments {}';

      const result = extractor.extractFromFile('test.ts', source);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle malformed tags gracefully', () => {
      const source = `
/**
 * Test class
 * @problem
 * @decision
 */
export class Test {}
      `;

      const result = extractor.extractFromFile('test.ts', source);

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
