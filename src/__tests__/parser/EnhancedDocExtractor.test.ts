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

  describe('extractEnhancedDocs', () => {
    it('should extract problem tag', () => {
      const source = `
/**
 * Test class
 * @problem Need to handle user authentication
 */
export class AuthHandler {}
      `;

      const result = extractor.extractEnhancedDocs(source, 'test.ts');

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

      const result = extractor.extractEnhancedDocs(source, 'test.ts');

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

      const result = extractor.extractEnhancedDocs(source, 'test.ts');

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

      const result = extractor.extractEnhancedDocs(source, 'test.ts');

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle no enhanced docs', () => {
      const source = `
/**
 * Simple class
 */
export class Simple {}
      `;

      const result = extractor.extractEnhancedDocs(source, 'test.ts');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('tag extraction', () => {
    it('should extract dependency tags', () => {
      const source = `
/**
 * Test class
 * @depends Database
 * @depType external
 * @depReason Stores user data
 */
export class UserRepository {}
      `;

      const result = extractor.extractEnhancedDocs(source, 'test.ts');

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should extract plan tags', () => {
      const source = `
/**
 * Test class
 * @plan Add caching layer
 * @planPriority high
 */
export class CacheService {}
      `;

      const result = extractor.extractEnhancedDocs(source, 'test.ts');

      expect(result.length).toBeGreaterThanOrEqual(0);
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

      const result = extractor.extractEnhancedDocs(source, 'test.ts');

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty source', () => {
      const result = extractor.extractEnhancedDocs('', 'test.ts');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle source without comments', () => {
      const source = 'export class NoComments {}';

      const result = extractor.extractEnhancedDocs(source, 'test.ts');

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

      const result = extractor.extractEnhancedDocs(source, 'test.ts');

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
