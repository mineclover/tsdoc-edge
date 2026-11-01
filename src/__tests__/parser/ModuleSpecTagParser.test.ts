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

    it('should project state mutations from @sideEffect state:', () => {
      const jsDoc = `/**
       * @sideEffect state: this.items - Adds new item to array
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      expect(result.sideEffects).toHaveLength(1);
      expect(result.mutations).toBeDefined();
      expect(result.mutations?.[0]?.target).toBe('this.items');
      expect(result.mutations?.[0]?.description).toBe('Adds new item to array');
    });

    it('should project file read I/O from @sideEffect filesystem:', () => {
      const jsDoc = `/**
       * @sideEffect filesystem: Application configuration (read)
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      expect(result.io).toHaveLength(1);
      expect(result.io?.[0]?.type).toBe('file');
      expect(result.sideEffects?.[0]?.operation).toBe('read');
    });

    it('should project database write I/O from @sideEffect database:', () => {
      const jsDoc = `/**
       * @sideEffect database: Persists user data (write)
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      expect(result.io).toHaveLength(1);
      expect(result.io?.[0]?.type).toBe('database');
      expect(result.sideEffects?.[0]?.operation).toBe('write');
    });

    it('should derive scope from standard @internal visibility modifier', () => {
      const jsDoc = `/**
       * @internal
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      expect(result.scope).toBeDefined();
      expect(result.scope?.accessLevel).toBe('internal');
    });

    it('should parse multiple tags together', () => {
      const jsDoc = `/**
       * @algorithm Quicksort implementation
       * @complexity O(n log n) - average case
       * @sideEffect state: array - Sorts in place
       * @public
       */`;

      const result = parser.parseModuleSpecTags(null, jsDoc);

      expect(result.algorithm).toBeDefined();
      expect(result.complexity).toBeDefined();
      expect(result.mutations).toBeDefined();
      expect(result.scope?.accessLevel).toBe('public');
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
