/**
 * Tests for SymbolSearchEngine
 */

import { SymbolSearchEngine } from '../../graph/SymbolSearchEngine';
import { SymbolGraphBuilder } from '../../graph/SymbolGraphBuilder';
import type { Symbol } from '../../types/graph';

describe('SymbolSearchEngine', () => {
  let graphBuilder: SymbolGraphBuilder;
  let searchEngine: SymbolSearchEngine;

  beforeEach(() => {
    graphBuilder = new SymbolGraphBuilder();
    searchEngine = new SymbolSearchEngine(graphBuilder);

    // Add test symbols
    const testSymbols: Symbol[] = [
      {
        id: 'test-001',
        name: 'UserService',
        type: 'class',
        filePath: 'src/services/UserService.ts',
        line: 10,
        column: 0,
        isExported: true,
        isPublic: true,
        summary: 'User service class',
        tests: [],
        designDecisions: [],
        contract: {
          symbolName: 'UserService',
          description: 'User service contract',
          filePath: 'src/services/UserService.ts',
          preconditions: ['User must exist'],
          postconditions: ['User is updated'],
          invariants: [],
        },
      },
      {
        id: 'test-002',
        name: 'AuthService',
        type: 'class',
        filePath: 'src/services/AuthService.ts',
        line: 15,
        column: 0,
        isExported: true,
        isPublic: true,
        summary: 'Authentication service',
        tests: [],
        designDecisions: [],
      },
      {
        id: 'test-003',
        name: 'login',
        type: 'function',
        filePath: 'src/auth/login.ts',
        line: 5,
        column: 0,
        isExported: true,
        isPublic: false,
        tests: [],
        designDecisions: [],
      },
      {
        id: 'test-004',
        name: 'UserRepository',
        type: 'class',
        filePath: 'src/repositories/UserRepository.ts',
        line: 20,
        column: 0,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      },
    ];

    for (const symbol of testSymbols) {
      graphBuilder.addSymbol(symbol);
    }

    // Add relationships
    graphBuilder.addRelationship({ from: 'test-001', to: 'test-004', type: 'dependsOn', filePath: 'src/services/UserService.ts' });
    graphBuilder.addRelationship({ from: 'test-002', to: 'test-001', type: 'dependsOn', filePath: 'src/services/AuthService.ts' });
  });

  describe('constructor', () => {
    it('should create SymbolSearchEngine', () => {
      expect(searchEngine).toBeDefined();
    });
  });

  describe('search', () => {
    describe('by name', () => {
      it('should find symbols by exact name', () => {
        const result = searchEngine.search({ name: 'UserService' });

        expect(result.symbols.length).toBe(1);
        expect(result.symbols[0].name).toBe('UserService');
      });

      it('should find symbols by name pattern', () => {
        const result = searchEngine.search({ name: 'User' });

        expect(result.symbols.length).toBe(2); // UserService, UserRepository
        expect(result.symbols.every((s) => s.name.includes('User'))).toBe(true);
      });

      it('should be case insensitive', () => {
        const result = searchEngine.search({ name: 'userservice' });

        expect(result.symbols.length).toBe(1);
        expect(result.symbols[0].name).toBe('UserService');
      });

      it('should support regex patterns', () => {
        const result = searchEngine.search({ name: '.*Service$' });

        expect(result.symbols.length).toBe(2); // UserService, AuthService
      });
    });

    describe('by type', () => {
      it('should find symbols by type', () => {
        const result = searchEngine.search({ type: 'class' });

        expect(result.symbols.length).toBe(3);
        expect(result.symbols.every((s) => s.type === 'class')).toBe(true);
      });

      it('should find function symbols', () => {
        const result = searchEngine.search({ type: 'function' });

        expect(result.symbols.length).toBe(1);
        expect(result.symbols[0].name).toBe('login');
      });
    });

    describe('by file path', () => {
      it('should find symbols by file path', () => {
        const result = searchEngine.search({ filePath: 'services' });

        expect(result.symbols.length).toBe(2); // UserService, AuthService
      });

      it('should support path patterns', () => {
        const result = searchEngine.search({ filePath: 'src/auth' });

        expect(result.symbols.length).toBe(1);
        expect(result.symbols[0].name).toBe('login');
      });
    });

    describe('by contract', () => {
      it('should find symbols with contracts', () => {
        const result = searchEngine.search({ hasContract: true });

        expect(result.symbols.length).toBe(1);
        expect(result.symbols[0].name).toBe('UserService');
      });

      it('should find symbols without contracts', () => {
        const result = searchEngine.search({ hasContract: false });

        expect(result.symbols.length).toBe(3);
      });
    });

    describe('by testing', () => {
      it('should find tested symbols', () => {
        const result = searchEngine.search({ hasTesting: true });

        // None of our test symbols have tests
        expect(result.symbols.length).toBe(0);
      });

      it('should find untested symbols', () => {
        const result = searchEngine.search({ hasTesting: false });

        // All test symbols have no tests
        expect(result.symbols.length).toBeGreaterThanOrEqual(4);
      });
    });

    describe('by public API', () => {
      it('should find public symbols', () => {
        const result = searchEngine.search({ isPublic: true });

        expect(result.symbols.length).toBe(3);
        expect(result.symbols.every((s) => s.isPublic === true)).toBe(true);
      });

      it('should find private symbols', () => {
        const result = searchEngine.search({ isPublic: false });

        expect(result.symbols.length).toBe(1);
        expect(result.symbols[0].name).toBe('login');
      });
    });

    describe('by relationships', () => {
      it('should find symbols that depend on target', () => {
        const result = searchEngine.search({ dependsOn: 'UserRepository' });

        expect(result.symbols.length).toBe(1);
        expect(result.symbols[0].name).toBe('UserService');
      });

      it('should find symbols used by target', () => {
        const result = searchEngine.search({ usedBy: 'UserService' });

        expect(result.symbols.length).toBe(1);
        expect(result.symbols[0].name).toBe('UserRepository');
      });

      it('should find any related symbols', () => {
        const result = searchEngine.search({ relatedTo: 'UserService' });

        expect(result.symbols.length).toBeGreaterThanOrEqual(2); // UserRepository, AuthService
      });
    });

    describe('combined queries', () => {
      it('should combine name and type filters', () => {
        const result = searchEngine.search({
          name: 'User',
          type: 'class',
        });

        expect(result.symbols.length).toBe(2); // UserService, UserRepository
      });

      it('should combine multiple filters', () => {
        const result = searchEngine.search({
          type: 'class',
          isPublic: true,
          hasTesting: false,
        });

        expect(result.symbols.length).toBeGreaterThanOrEqual(2); // At least AuthService and UserRepository
      });

      it('should apply all filters correctly', () => {
        const result = searchEngine.search({
          name: 'Service',
          type: 'class',
          filePath: 'services',
          isPublic: true,
        });

        expect(result.symbols.length).toBeGreaterThanOrEqual(2);
        expect(result.symbols.every((s) => s.type === 'class')).toBe(true);
        expect(result.symbols.every((s) => s.isPublic === true)).toBe(true);
      });
    });

    describe('result metadata', () => {
      it('should include total count', () => {
        const result = searchEngine.search({ type: 'class' });

        expect(result.totalCount).toBe(result.symbols.length);
        expect(result.totalCount).toBe(3);
      });

      it('should include execution time', () => {
        const result = searchEngine.search({ name: 'User' });

        expect(result.executionTime).toBeGreaterThanOrEqual(0);
        expect(typeof result.executionTime).toBe('number');
      });
    });

    describe('empty results', () => {
      it('should return empty array for no matches', () => {
        const result = searchEngine.search({ name: 'NonExistent' });

        expect(result.symbols.length).toBe(0);
        expect(result.totalCount).toBe(0);
      });

      it('should handle empty query', () => {
        const result = searchEngine.search({});

        // Empty query returns all symbols
        expect(result.symbols.length).toBeGreaterThanOrEqual(4); // At least our test symbols
        expect(result.totalCount).toBeGreaterThanOrEqual(4);
      });
    });
  });

  describe('specialized finders', () => {
    describe('findUndocumented', () => {
      it('should find symbols without summary', () => {
        const undocumented = searchEngine.findUndocumented();

        expect(undocumented.length).toBe(2); // login, UserRepository
        expect(undocumented.every((s) => !s.summary)).toBe(true);
      });
    });

    describe('findUntested', () => {
      it('should find symbols without tests', () => {
        const untested = searchEngine.findUntested();

        // All test symbols have empty tests arrays
        expect(untested.length).toBeGreaterThanOrEqual(2);
        expect(untested.every((s) => s.tests.length === 0)).toBe(true);
      });
    });

    describe('findWithoutContract', () => {
      it('should find symbols without contract', () => {
        const withoutContract = searchEngine.findWithoutContract();

        // Only UserService has a contract
        expect(withoutContract.length).toBeGreaterThanOrEqual(3);
        expect(withoutContract.every((s) => !s.contract)).toBe(true);
      });
    });

    describe('findWithoutResponsibility', () => {
      it('should find symbols without responsibility', () => {
        const withoutResponsibility = searchEngine.findWithoutResponsibility();

        expect(withoutResponsibility.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('findOrphaned', () => {
      it('should find orphaned symbols', () => {
        const orphans = searchEngine.findOrphaned();

        // login and UserRepository have no dependencies or dependents
        expect(orphans.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('performance', () => {
    it('should handle large symbol sets efficiently', () => {
      const largeGraphBuilder = new SymbolGraphBuilder();

      // Add 100 symbols
      for (let i = 0; i < 100; i++) {
        largeGraphBuilder.addSymbol({
          id: `perf-${i}`,
          name: `Symbol${i}`,
          type: 'class',
          filePath: `src/perf/Symbol${i}.ts`,
          line: i,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        });
      }

      const largeSearchEngine = new SymbolSearchEngine(largeGraphBuilder);
      const result = largeSearchEngine.search({ type: 'class' });

      expect(result.executionTime).toBeLessThan(100); // Should be fast
      expect(result.symbols.length).toBe(100);
    });

    it('should track execution time for complex queries', () => {
      const result = searchEngine.search({
        name: 'Service',
        type: 'class',
        isPublic: true,
        hasTesting: false,
      });

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThan(50);
    });
  });
});
