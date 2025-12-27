/**
 * AnalyzerRegistry tests
 * @testScenario Get analyzer types
 * @testScenario Get analyzer metadata
 * @testScenario Create analyzers with context
 * @testScenario Group metadata by category
 */

import { AnalyzerRegistry, getAnalyzerRegistry } from '../../analyzer/AnalyzerRegistry';
import type { AnalyzerContext, AnalyzerType } from '../../analyzer/types';
import type { SymbolGraph, Symbol } from '../../types/graph';

describe('AnalyzerRegistry', () => {
  let registry: AnalyzerRegistry;

  // Create minimal mock graph
  const createMockGraph = (): SymbolGraph => ({
    symbols: new Map<string, Symbol>(),
    relationships: [],
    nameIndex: new Map<string, string[]>(),
    fileIndex: new Map<string, string[]>(),
    adjacencyList: new Map<string, string[]>(),
    reverseAdjacencyList: new Map<string, string[]>(),
  });

  beforeEach(() => {
    registry = AnalyzerRegistry.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AnalyzerRegistry.getInstance();
      const instance2 = AnalyzerRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should be accessible via getAnalyzerRegistry', () => {
      const instance = getAnalyzerRegistry();
      expect(instance).toBe(registry);
    });
  });

  describe('getTypes', () => {
    it('should return all analyzer types', () => {
      const types = registry.getTypes();

      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain('calls');
      expect(types).toContain('types');
      expect(types).toContain('io');
      expect(types).toContain('tests');
    });

    it('should return consistent types', () => {
      const types1 = registry.getTypes();
      const types2 = registry.getTypes();

      expect(types1).toEqual(types2);
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for valid type', () => {
      const metadata = registry.getMetadata('calls');

      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('Calls');
      expect(metadata?.category).toBe('behavioral');
      expect(metadata?.requires).toContain('graph');
    });

    it('should return undefined for invalid type', () => {
      const metadata = registry.getMetadata('invalid-type' as AnalyzerType);

      expect(metadata).toBeUndefined();
    });

    it('should include description in metadata', () => {
      const metadata = registry.getMetadata('io');

      expect(metadata?.description).toBeDefined();
      expect(metadata?.description.length).toBeGreaterThan(0);
    });

    it('should include required context in metadata', () => {
      const metadata = registry.getMetadata('types');

      expect(metadata?.requires).toContain('graph');
      expect(metadata?.requires).toContain('program');
    });
  });

  describe('getMetadataByCategory', () => {
    it('should group metadata by category', () => {
      const byCategory = registry.getMetadataByCategory();

      expect(byCategory.size).toBeGreaterThan(0);
      expect(byCategory.has('behavioral')).toBe(true);
      expect(byCategory.has('structural')).toBe(true);
    });

    it('should have all types in some category', () => {
      const types = registry.getTypes();
      const byCategory = registry.getMetadataByCategory();

      let totalInCategories = 0;
      for (const items of byCategory.values()) {
        totalInCategories += items.length;
      }

      expect(totalInCategories).toBe(types.length);
    });

    it('should include behavioral analyzers', () => {
      const byCategory = registry.getMetadataByCategory();
      const behavioral = byCategory.get('behavioral');

      expect(behavioral).toBeDefined();
      expect(behavioral!.length).toBeGreaterThan(0);
      expect(behavioral!.some((m) => m.type === 'calls')).toBe(true);
    });
  });

  describe('create', () => {
    it('should throw for unknown analyzer type', () => {
      const context: AnalyzerContext = {
        graph: createMockGraph(),
      };

      expect(() =>
        registry.create('unknown' as AnalyzerType, context)
      ).toThrow('Unknown analyzer type');
    });

    it('should throw when required context is missing', () => {
      const context: AnalyzerContext = {
        graph: createMockGraph(),
        // program is missing
      };

      expect(() => registry.create('calls', context)).toThrow(
        "requires 'program'"
      );
    });

    it('should create analyzer with valid context', () => {
      const context: AnalyzerContext = {
        graph: createMockGraph(),
        program: {} as any,
      };

      const analyzer = registry.create('calls', context);

      expect(analyzer).toBeDefined();
      expect(analyzer.name).toBe('Calls');
      expect(analyzer.type).toBe('calls');
    });
  });

  describe('analyze', () => {
    it('should run analysis and return results', () => {
      const context: AnalyzerContext = {
        graph: createMockGraph(),
      };

      // io analyzer only requires graph
      const results = registry.analyze('io', context);

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('analyzeAll', () => {
    it('should run all applicable analyzers', () => {
      const context: AnalyzerContext = {
        graph: createMockGraph(),
      };

      const results = registry.analyzeAll(context);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should skip analyzers with missing requirements', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const context: AnalyzerContext = {
        graph: createMockGraph(),
        // Most analyzers require more context
      };

      const results = registry.analyzeAll(context);

      // Should not throw, just skip
      expect(Array.isArray(results)).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('metadata categories', () => {
    it('should have behavioral category', () => {
      const metadata = registry.getMetadata('collaboration');
      expect(metadata?.category).toBe('behavioral');
    });

    it('should have structural category', () => {
      const metadata = registry.getMetadata('chains');
      expect(metadata?.category).toBe('structural');
    });

    it('should have data-flow category', () => {
      const metadata = registry.getMetadata('io');
      expect(metadata?.category).toBe('data-flow');
    });

    it('should have type-system category', () => {
      const metadata = registry.getMetadata('types');
      expect(metadata?.category).toBe('type-system');
    });

    it('should have verification category', () => {
      const metadata = registry.getMetadata('tests');
      expect(metadata?.category).toBe('verification');
    });
  });
});
