/**
 * SymbolReferenceResolver tests
 * @testScenario Resolve symbol ID references
 * @testScenario Resolve symbol name references
 * @testScenario Handle multiple references
 * @testScenario Calculate relative paths
 * @testScenario Get unresolved references
 */

import { SymbolReferenceResolver } from '../../doc-symbol/SymbolReferenceResolver';
import type { SymbolFootnoteRef } from '../../types/feature';

describe('SymbolReferenceResolver', () => {
  // Mock SymbolRegistryManager
  const createMockRegistry = (entries: any[] = []) => ({
    findById: jest.fn((id: string) => entries.find((e) => e.id === id)),
    search: jest.fn((name: string) =>
      entries.filter(
        (e) => e.sourceRef.symbolName.includes(name) || e.sourceRef.symbolName === name
      )
    ),
  });

  describe('resolve', () => {
    describe('ID references', () => {
      it('should resolve symbol ID reference (sym-XXX format)', () => {
        const entry = {
          id: 'my-symbol',
          sourceRef: {
            symbolName: 'MySymbol',
            filePath: '/project/src/MySymbol.ts',
          },
        };
        const registry = createMockRegistry([entry]);
        const resolver = new SymbolReferenceResolver(registry as any);

        const ref: SymbolFootnoteRef = {
          identifier: 'sym-my-symbol',
          isIdRef: true,
          line: 10,
        };

        const result = resolver.resolve(ref, '/project/docs/feature.md');

        expect(result).not.toBeNull();
        expect(result?.symbolName).toBe('MySymbol');
        expect(registry.findById).toHaveBeenCalledWith('my-symbol');
      });

      it('should return null for non-existent ID', () => {
        const registry = createMockRegistry([]);
        const resolver = new SymbolReferenceResolver(registry as any);

        const ref: SymbolFootnoteRef = {
          identifier: 'sym-nonexistent',
          isIdRef: true,
          line: 10,
        };

        const result = resolver.resolve(ref, '/project/docs/feature.md');

        expect(result).toBeNull();
      });
    });

    describe('name references', () => {
      it('should resolve symbol name reference', () => {
        const entry = {
          id: 'my-symbol',
          sourceRef: {
            symbolName: 'MySymbol',
            filePath: '/project/src/MySymbol.ts',
          },
        };
        const registry = createMockRegistry([entry]);
        const resolver = new SymbolReferenceResolver(registry as any);

        const ref: SymbolFootnoteRef = {
          identifier: 'MySymbol',
          isIdRef: false,
          line: 10,
        };

        const result = resolver.resolve(ref, '/project/docs/feature.md');

        expect(result).not.toBeNull();
        expect(result?.symbolName).toBe('MySymbol');
        expect(registry.search).toHaveBeenCalledWith('MySymbol');
      });

      it('should prefer exact match when multiple results', () => {
        const entries = [
          {
            id: 'symbol-extended',
            sourceRef: {
              symbolName: 'SymbolExtended',
              filePath: '/project/src/SymbolExtended.ts',
            },
          },
          {
            id: 'symbol',
            sourceRef: {
              symbolName: 'Symbol',
              filePath: '/project/src/Symbol.ts',
            },
          },
        ];
        const registry = createMockRegistry(entries);
        const resolver = new SymbolReferenceResolver(registry as any);

        const ref: SymbolFootnoteRef = {
          identifier: 'Symbol',
          isIdRef: false,
          line: 10,
        };

        const result = resolver.resolve(ref, '/project/docs/feature.md');

        expect(result?.symbolName).toBe('Symbol');
      });

      it('should return null for non-existent name', () => {
        const registry = createMockRegistry([]);
        const resolver = new SymbolReferenceResolver(registry as any);

        const ref: SymbolFootnoteRef = {
          identifier: 'NonExistent',
          isIdRef: false,
          line: 10,
        };

        const result = resolver.resolve(ref, '/project/docs/feature.md');

        expect(result).toBeNull();
      });
    });

    describe('relative path calculation', () => {
      it('should calculate correct relative path', () => {
        const entry = {
          id: 'validator',
          sourceRef: {
            symbolName: 'Validator',
            filePath: '/project/src/validator/Validator.ts',
          },
        };
        const registry = createMockRegistry([entry]);
        const resolver = new SymbolReferenceResolver(registry as any);

        const ref: SymbolFootnoteRef = {
          identifier: 'Validator',
          isIdRef: false,
          line: 10,
        };

        const result = resolver.resolve(ref, '/project/docs/features/feature.md');

        expect(result?.relativePath).toBe('../../src/validator/Validator.ts');
      });

      it('should use forward slashes in path', () => {
        const entry = {
          id: 'symbol',
          sourceRef: {
            symbolName: 'Symbol',
            filePath: '/project/src/sub/Symbol.ts',
          },
        };
        const registry = createMockRegistry([entry]);
        const resolver = new SymbolReferenceResolver(registry as any);

        const ref: SymbolFootnoteRef = {
          identifier: 'Symbol',
          isIdRef: false,
          line: 10,
        };

        const result = resolver.resolve(ref, '/project/docs/feature.md');

        expect(result?.relativePath).not.toContain('\\');
      });

      it('should include anchor in result', () => {
        const entry = {
          id: 'symbol',
          sourceRef: {
            symbolName: 'MySymbol',
            filePath: '/project/src/Symbol.ts',
          },
        };
        const registry = createMockRegistry([entry]);
        const resolver = new SymbolReferenceResolver(registry as any);

        const ref: SymbolFootnoteRef = {
          identifier: 'MySymbol',
          isIdRef: false,
          line: 10,
        };

        const result = resolver.resolve(ref, '/project/docs/feature.md');

        expect(result?.anchor).toBe('MySymbol');
      });
    });
  });

  describe('resolveMultiple', () => {
    it('should resolve multiple references', () => {
      const entries = [
        {
          id: 'symbol-a',
          sourceRef: { symbolName: 'SymbolA', filePath: '/project/src/A.ts' },
        },
        {
          id: 'symbol-b',
          sourceRef: { symbolName: 'SymbolB', filePath: '/project/src/B.ts' },
        },
      ];
      const registry = createMockRegistry(entries);
      const resolver = new SymbolReferenceResolver(registry as any);

      const refs: SymbolFootnoteRef[] = [
        { identifier: 'SymbolA', isIdRef: false, line: 10 },
        { identifier: 'SymbolB', isIdRef: false, line: 20 },
      ];

      const result = resolver.resolveMultiple(refs, '/project/docs/feature.md');

      expect(result.size).toBe(2);
      expect(result.get('SymbolA')).toBeDefined();
      expect(result.get('SymbolB')).toBeDefined();
    });

    it('should deduplicate references', () => {
      const entry = {
        id: 'symbol',
        sourceRef: { symbolName: 'Symbol', filePath: '/project/src/S.ts' },
      };
      const registry = createMockRegistry([entry]);
      const resolver = new SymbolReferenceResolver(registry as any);

      const refs: SymbolFootnoteRef[] = [
        { identifier: 'Symbol', isIdRef: false, line: 10 },
        { identifier: 'Symbol', isIdRef: false, line: 20 },
        { identifier: 'Symbol', isIdRef: false, line: 30 },
      ];

      const result = resolver.resolveMultiple(refs, '/project/docs/feature.md');

      expect(result.size).toBe(1);
      expect(registry.search).toHaveBeenCalledTimes(1);
    });

    it('should skip unresolved references', () => {
      const entry = {
        id: 'symbol',
        sourceRef: { symbolName: 'Symbol', filePath: '/project/src/S.ts' },
      };
      const registry = createMockRegistry([entry]);
      const resolver = new SymbolReferenceResolver(registry as any);

      const refs: SymbolFootnoteRef[] = [
        { identifier: 'Symbol', isIdRef: false, line: 10 },
        { identifier: 'NonExistent', isIdRef: false, line: 20 },
      ];

      const result = resolver.resolveMultiple(refs, '/project/docs/feature.md');

      expect(result.size).toBe(1);
      expect(result.has('Symbol')).toBe(true);
      expect(result.has('NonExistent')).toBe(false);
    });
  });

  describe('getUnresolved', () => {
    it('should return unresolved identifiers', () => {
      const entry = {
        id: 'symbol',
        sourceRef: { symbolName: 'Symbol', filePath: '/project/src/S.ts' },
      };
      const registry = createMockRegistry([entry]);
      const resolver = new SymbolReferenceResolver(registry as any);

      const refs: SymbolFootnoteRef[] = [
        { identifier: 'Symbol', isIdRef: false, line: 10 },
        { identifier: 'Missing1', isIdRef: false, line: 20 },
        { identifier: 'Missing2', isIdRef: false, line: 30 },
      ];

      const unresolved = resolver.getUnresolved(refs, '/project/docs/feature.md');

      expect(unresolved).toEqual(['Missing1', 'Missing2']);
    });

    it('should return empty array when all resolved', () => {
      const entries = [
        {
          id: 'a',
          sourceRef: { symbolName: 'A', filePath: '/project/src/A.ts' },
        },
        {
          id: 'b',
          sourceRef: { symbolName: 'B', filePath: '/project/src/B.ts' },
        },
      ];
      const registry = createMockRegistry(entries);
      const resolver = new SymbolReferenceResolver(registry as any);

      const refs: SymbolFootnoteRef[] = [
        { identifier: 'A', isIdRef: false, line: 10 },
        { identifier: 'B', isIdRef: false, line: 20 },
      ];

      const unresolved = resolver.getUnresolved(refs, '/project/docs/feature.md');

      expect(unresolved).toEqual([]);
    });

    it('should return all when none resolved', () => {
      const registry = createMockRegistry([]);
      const resolver = new SymbolReferenceResolver(registry as any);

      const refs: SymbolFootnoteRef[] = [
        { identifier: 'Missing1', isIdRef: false, line: 10 },
        { identifier: 'Missing2', isIdRef: false, line: 20 },
      ];

      const unresolved = resolver.getUnresolved(refs, '/project/docs/feature.md');

      expect(unresolved).toEqual(['Missing1', 'Missing2']);
    });
  });
});
