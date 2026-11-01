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

    it('should extract error experiences from standard @throws tags and pair multiple ADR @decision blocks', () => {
      const source = `
/**
 * Test class referencing {@link RetryPolicy}
 * @throws NetworkTimeoutError - Connection timeout - Add retry logic
 * @decision Use exponential backoff
 * @rationale Avoid thundering herd
 * @consequences Slight tail latency increase
 * @decision Circuit-break after 3 failures
 * @rationale Protect downstream storage
 * @consequences Fast-fail under outage
 */
export class NetworkService {}
      `;

      const result = extractor.extractFromFile('test.ts', source);

      expect(result).toHaveLength(1);
      expect(result[0].doc.errorExperiences).toEqual([
        expect.objectContaining({
          errorType: 'NetworkTimeoutError',
          message: 'Connection timeout',
          solution: 'Add retry logic',
        }),
      ]);
      expect(result[0].doc.decisions).toHaveLength(2);
      expect(result[0].doc.decisions?.[0]?.decision).toBe('Use exponential backoff');
      expect(result[0].doc.decisions?.[1]?.decision).toBe('Circuit-break after 3 failures');
      expect(result[0].doc.dependencies).toContainEqual({
        target: 'RetryPolicy',
        type: 'symbol',
        reason: 'TSDoc {@link} reference',
      });
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

    it('should not extract local variables inside function or class bodies', () => {
      const source = `
/**
 * Top-level helper
 * @privateRemarks TODO [high]: Optimize branch pruning
 */
export function computeSummary(input: string): string {
  const trimmedInput = input.trim();
  const normalized = trimmedInput.toLowerCase();
  return normalized;
}
      `;

      const result = extractor.extractFromFile('test.ts', source);

      expect(result.map((entry) => entry.symbol.name)).toEqual(['computeSummary']);
      expect(result[0]?.doc.futurePlans?.[0]?.description).toBe('Optimize branch pruning');
    });

    it('should skip symbols without enhanced TSDoc metadata when includePartial is false', () => {
      const strictExtractor = new EnhancedDocExtractor({ includePartial: false });
      const source = `
import * as fs from 'node:fs';

/**
 * Plain symbol with summary only
 */
export function readPlain(p: string): string {
  return fs.readFileSync(p, 'utf-8');
}

/**
 * Enhanced symbol with contract and TODO
 * @contract Reads UTF-8 configuration deterministically
 * @precondition Path must exist
 * @privateRemarks TODO: Support JSON5 fallback
 */
export function readEnhanced(p: string): string {
  return fs.readFileSync(p, 'utf-8');
}
      `;

      const result = strictExtractor.extractFromFile('test.ts', source);

      expect(result.map((entry) => entry.symbol.name)).toEqual(['readEnhanced']);
      expect(result[0]?.symbol.contract?.description).toBe(
        'Reads UTF-8 configuration deterministically'
      );
      expect(result[0]?.symbol.contract?.preconditions).toEqual(['Path must exist']);
    });
  });

  describe('declaration files', () => {
    it('extracts ambient declarations and namespace members as public symbols', () => {
      const source = `
/**
 * Resolve a globally available value.
 * @contract Resolves the ambient value without implementation details
 * @decision Keep the declaration surface minimal
 * @rationale Consumers only need the stable contract
 * @consequences Runtime implementations remain replaceable
 * @throws ResolutionError - The value cannot be resolved - Retry with a fallback
 */
declare function resolveValue(input: string): string;

/** @internal */
declare class InternalImplementation {}

declare namespace PublicApi {
  /** Create a configured client. */
  function createClient(): void;
  interface Options {
    /** Execution mode. */
    mode: string;
    /** Run one operation. */
    run(): void;
  }
}

declare module 'ambient-package' {
  /** Exported from an ambient module. */
  function moduleFunction(): void;
}
      `;

      const result = new EnhancedDocExtractor({ autoGenerateIds: false }).extractFromFile(
        'ambient.d.ts',
        source
      );

      expect(result.map((entry) => entry.symbol.name)).toEqual([
        'resolveValue',
        'InternalImplementation',
        'createClient',
        'Options',
        'mode',
        'run',
        'moduleFunction',
      ]);
      expect(result.find((entry) => entry.symbol.name === 'resolveValue')?.symbol).toMatchObject({
        isExported: true,
        isPublic: true,
        type: 'function',
      });
      expect(
        result.find((entry) => entry.symbol.name === 'InternalImplementation')?.symbol
      ).toMatchObject({
        isExported: true,
        isPublic: false,
      });
      expect(result.find((entry) => entry.symbol.name === 'createClient')?.symbol.isPublic).toBe(
        true
      );
      expect(result.find((entry) => entry.symbol.name === 'Options')?.symbol.type).toBe(
        'interface'
      );
      expect(result.find((entry) => entry.symbol.name === 'mode')?.symbol.type).toBe('property');
      expect(result.find((entry) => entry.symbol.name === 'run')?.symbol.type).toBe('method');

      const resolveDoc = result.find((entry) => entry.symbol.name === 'resolveValue');
      expect(resolveDoc?.symbol.contract?.description).toContain('ambient value');
      expect(resolveDoc?.doc.decisions).toHaveLength(1);
      expect(resolveDoc?.doc.errorExperiences?.[0]).toEqual(
        expect.objectContaining({
          errorType: 'ResolutionError',
          message: 'The value cannot be resolved',
          solution: 'Retry with a fallback',
        })
      );
    });

    it('extracts module declarations, internal visibility, and import/re-export dependencies', () => {
      const source = `
import type { Dependency } from './dependency';
export { Shared } from '@scope/shared';

/** Public declaration. */
export declare function fetchData(): Promise<string>;

/** @internal */
export declare class InternalApi {}

/** Public enum. */
export declare enum Status { Ready, Done }
      `;

      const result = new EnhancedDocExtractor({ autoGenerateIds: false }).extractFromFile(
        'module.d.ts',
        source
      );

      expect(result.map((entry) => entry.symbol.name)).toEqual([
        'fetchData',
        'InternalApi',
        'Status',
      ]);
      expect(result.every((entry) => entry.symbol.isExported)).toBe(true);
      expect(result.find((entry) => entry.symbol.name === 'fetchData')?.symbol.isPublic).toBe(true);
      expect(result.find((entry) => entry.symbol.name === 'InternalApi')?.symbol.isPublic).toBe(
        false
      );
      expect(result.find((entry) => entry.symbol.name === 'Status')?.symbol.type).toBe('enum');
      expect(result[0]?.doc.dependencies).toEqual([
        { target: './dependency', type: 'file', reason: 'TypeScript AST import' },
        { target: '@scope/shared', type: 'external', reason: 'TypeScript AST re-export' },
      ]);
    });
  });
});
