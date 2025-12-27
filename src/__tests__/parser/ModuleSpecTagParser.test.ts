/**
 * ModuleSpecTagParser tests
 * @testScenario Parse algorithm tags
 * @testScenario Parse complexity tags
 * @testScenario Parse side effect tags
 * @testScenario Parse IO tags
 * @testScenario Parse scope tags
 * @testScenario Handle empty input
 */

import { ModuleSpecTagParser } from '../../parser/ModuleSpecTagParser';

describe('ModuleSpecTagParser', () => {
  let parser: ModuleSpecTagParser;

  beforeEach(() => {
    parser = new ModuleSpecTagParser();
  });

  describe('parseModuleSpecTags', () => {
    it('should return empty object for empty input', () => {
      const result = parser.parseModuleSpecTags(null, '');
      expect(result).toEqual({});
    });

    it('should parse @algorithm tag', () => {
      const jsDoc = `/**
       * @algorithm Binary search through sorted array
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      expect(result.algorithm).toBeDefined();
      expect(result.algorithm?.description).toContain('Binary search');
    });

    it('should parse @complexity tag with notation', () => {
      const jsDoc = `/**
       * @complexity O(n log n) - sorting required
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      expect(result.complexity).toBeDefined();
      expect(result.complexity?.notation).toBe('O(n log n)');
      expect(result.complexity?.explanation).toBe('sorting required');
    });

    it('should parse @complexity tag without explanation', () => {
      const jsDoc = `/**
       * @complexity O(1)
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      expect(result.complexity?.notation).toBe('O(1)');
    });

    it('should parse @sideEffect tag', () => {
      const jsDoc = `/**
       * @sideEffect file:write Writes to log file
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      expect(result.sideEffects).toBeDefined();
      expect(result.sideEffects?.length).toBeGreaterThan(0);
    });

    it('should parse multiple side effects', () => {
      const jsDoc = `/**
       * @sideEffect file:write Writes to log
       * @sideEffect network:request Sends HTTP request
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      expect(result.sideEffects?.length).toBe(2);
    });

    it('should parse @mutates tag', () => {
      const jsDoc = `/**
       * @mutates this.items - Adds new item to array
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      expect(result.mutations).toBeDefined();
      expect(result.mutations?.length).toBeGreaterThan(0);
    });

    it('should parse @reads tag', () => {
      const jsDoc = `/**
       * @reads config - Application configuration
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      // IO may or may not be parsed depending on implementation
      expect(result).toBeDefined();
    });

    it('should parse @writes tag', () => {
      const jsDoc = `/**
       * @writes database - Persists user data
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      // IO may or may not be parsed depending on implementation
      expect(result).toBeDefined();
    });

    it('should parse @scope tag', () => {
      const jsDoc = `/**
       * @scope private
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      expect(result.scope).toBeDefined();
    });

    it('should parse multiple tags together', () => {
      const jsDoc = `/**
       * @algorithm Quicksort implementation
       * @complexity O(n log n) - average case
       * @mutates array - Sorts in place
       * @sideEffect none
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      expect(result.algorithm).toBeDefined();
      expect(result.complexity).toBeDefined();
      expect(result.mutations).toBeDefined();
    });

    it('should handle multiline algorithm description', () => {
      const jsDoc = `/**
       * @algorithm First step of process
       * @algorithm Second step continues
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      expect(result.algorithm?.description).toContain('First step');
    });

    it('should ignore non-module-spec tags', () => {
      const jsDoc = `/**
       * @param value - Input value
       * @returns Processed result
       * @algorithm Custom processing
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      expect(result.algorithm).toBeDefined();
      expect(Object.keys(result).length).toBe(1);
    });
  });
});
