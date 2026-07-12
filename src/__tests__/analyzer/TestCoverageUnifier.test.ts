/**
 * TestCoverageUnifier Tests
 */

import type { Database } from 'better-sqlite3';
import { TestCoverageUnifier } from '../../analyzer/TestCoverageUnifier';
import type { Symbol, SymbolGraph } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships';

describe('TestCoverageUnifier', () => {
  // Helper to create mock graph
  function createMockGraph(
    symbols: Array<{ id: string; name: string; filePath?: string }>
  ): SymbolGraph {
    const symbolsMap = new Map<string, Symbol>();
    for (const s of symbols) {
      symbolsMap.set(s.id, {
        id: s.id,
        name: s.name,
        type: 'class',
        filePath: s.filePath || `src/${s.name}.ts`,
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      });
    }

    return {
      symbols: symbolsMap,
      relationships: [],
      adjacencyList: new Map(),
      reverseAdjacencyList: new Map(),
      nameIndex: new Map(),
      fileIndex: new Map(),
    } as SymbolGraph;
  }

  // Helper to create mock database
  function createMockDb(options: {
    hasTable?: boolean;
    mappings?: Array<{ symbol_id: string; test_file_path: string; test_name: string | null }>;
    throwError?: boolean;
  }): Database {
    const { hasTable = true, mappings = [], throwError = false } = options;

    const mockPrepare = jest.fn().mockImplementation((sql: string) => {
      if (throwError) {
        throw new Error('Database error');
      }

      if (sql.includes('sqlite_master')) {
        return {
          get: () => (hasTable ? { name: 'test_mappings' } : undefined),
        };
      }

      if (sql.includes('test_mappings')) {
        return {
          all: () => mappings,
        };
      }

      return {
        get: () => undefined,
        all: () => [],
      };
    });

    return {
      prepare: mockPrepare,
    } as unknown as Database;
  }

  describe('constructor', () => {
    it('should create unifier with graph and database', () => {
      const graph = createMockGraph([]);
      const db = createMockDb({});
      const unifier = new TestCoverageUnifier(graph, db);

      expect(unifier).toBeDefined();
    });
  });

  describe('analyze', () => {
    it('should return empty array when test_mappings table does not exist', () => {
      const graph = createMockGraph([]);
      const db = createMockDb({ hasTable: false });
      const unifier = new TestCoverageUnifier(graph, db);

      const result = unifier.analyze();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when database throws error', () => {
      const graph = createMockGraph([]);
      const db = createMockDb({ throwError: true });
      const unifier = new TestCoverageUnifier(graph, db);

      const result = unifier.analyze();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no mappings exist', () => {
      const graph = createMockGraph([{ id: 'class-userservice', name: 'UserService' }]);
      const db = createMockDb({ hasTable: true, mappings: [] });
      const unifier = new TestCoverageUnifier(graph, db);

      const result = unifier.analyze();

      expect(result).toHaveLength(0);
    });

    it('should create test coverage relationships from mappings', () => {
      const graph = createMockGraph([
        { id: 'class-userservice', name: 'UserService' },
        { id: 'class-authservice', name: 'AuthService' },
      ]);

      const db = createMockDb({
        hasTable: true,
        mappings: [
          {
            symbol_id: 'class-userservice',
            test_file_path: 'src/__tests__/UserService.test.ts',
            test_name: 'UserService tests',
          },
          {
            symbol_id: 'class-authservice',
            test_file_path: 'src/__tests__/AuthService.test.ts',
            test_name: null,
          },
        ],
      });

      const unifier = new TestCoverageUnifier(graph, db);
      const result = unifier.analyze();

      expect(result).toHaveLength(2);

      // Check first relationship
      const userServiceRel = result[0];
      expect(userServiceRel.type).toBe('test-coverage');
      expect(userServiceRel.category).toBe('verification');
      expect(userServiceRel.from).toBe('class-userservice');
      expect(userServiceRel.to).toContain('src/__tests__/UserService.test.ts');
      expect(userServiceRel.direction).toBe('bidirectional');
      expect(userServiceRel.strength).toBe('strong');
      expect(userServiceRel.discoveredBy).toBe('test-analysis');
      expect(userServiceRel.confidence).toBe(1.0);
      expect(userServiceRel.properties.testName).toBe('UserService tests');
      expect(userServiceRel.properties.testFile).toBe('src/__tests__/UserService.test.ts');

      // Check second relationship (with null test name)
      const authServiceRel = result[1];
      expect(authServiceRel.properties.testName).toBe('unknown test');
    });

    it('should skip mappings for symbols not in graph', () => {
      const graph = createMockGraph([{ id: 'class-userservice', name: 'UserService' }]);

      const db = createMockDb({
        hasTable: true,
        mappings: [
          {
            symbol_id: 'class-userservice',
            test_file_path: 'src/__tests__/UserService.test.ts',
            test_name: 'UserService tests',
          },
          {
            symbol_id: 'class-nonexistent',
            test_file_path: 'src/__tests__/NonExistent.test.ts',
            test_name: 'NonExistent tests',
          },
        ],
      });

      const unifier = new TestCoverageUnifier(graph, db);
      const result = unifier.analyze();

      expect(result).toHaveLength(1);
      expect(result[0].from).toBe('class-userservice');
    });

    it('should generate valid relationship IDs', () => {
      const graph = createMockGraph([{ id: 'class-user-service', name: 'UserService' }]);

      const db = createMockDb({
        hasTable: true,
        mappings: [
          {
            symbol_id: 'class-user-service',
            test_file_path: 'src/__tests__/user-service.test.ts',
            test_name: 'User Service tests',
          },
        ],
      });

      const unifier = new TestCoverageUnifier(graph, db);
      const result = unifier.analyze();

      expect(result).toHaveLength(1);
      // Check that ID is properly formatted (lowercase, no special chars except hyphens)
      expect(result[0].id).toMatch(/^[a-z0-9-]+$/);
      expect(result[0].id).not.toMatch(/^-/);
      expect(result[0].id).not.toMatch(/-$/);
    });

    it('should include evidence in relationships', () => {
      const graph = createMockGraph([{ id: 'class-service', name: 'Service' }]);

      const db = createMockDb({
        hasTable: true,
        mappings: [
          {
            symbol_id: 'class-service',
            test_file_path: 'src/__tests__/service.test.ts',
            test_name: 'Service tests',
          },
        ],
      });

      const unifier = new TestCoverageUnifier(graph, db);
      const result = unifier.analyze();

      expect(result[0].evidence).toHaveLength(1);
      expect(result[0].evidence[0].type).toBe('test');
      expect(result[0].evidence[0].source).toBe('src/__tests__/service.test.ts');
      expect(result[0].evidence[0].lineNumber).toBe(0);
      expect(result[0].evidence[0].confidence).toBe(1.0);
    });

    it('should include timestamps in relationships', () => {
      const graph = createMockGraph([{ id: 'class-service', name: 'Service' }]);

      const db = createMockDb({
        hasTable: true,
        mappings: [
          {
            symbol_id: 'class-service',
            test_file_path: 'src/__tests__/service.test.ts',
            test_name: 'Service tests',
          },
        ],
      });

      const unifier = new TestCoverageUnifier(graph, db);
      const result = unifier.analyze();

      expect(result[0].createdAt).toBeDefined();
      expect(result[0].updatedAt).toBeDefined();
      // Check that they are valid ISO date strings
      expect(() => new Date(result[0].createdAt)).not.toThrow();
      expect(() => new Date(result[0].updatedAt)).not.toThrow();
    });

    it('should include description in relationships', () => {
      const graph = createMockGraph([{ id: 'class-service', name: 'Service' }]);

      const db = createMockDb({
        hasTable: true,
        mappings: [
          {
            symbol_id: 'class-service',
            test_file_path: 'src/__tests__/service.test.ts',
            test_name: 'Service tests',
          },
        ],
      });

      const unifier = new TestCoverageUnifier(graph, db);
      const result = unifier.analyze();

      expect(result[0].description).toBe('class-service tested by Service tests');
    });
  });

  describe('getStatistics', () => {
    it('should return zero statistics for empty relationships', () => {
      const graph = createMockGraph([]);
      const db = createMockDb({});
      const unifier = new TestCoverageUnifier(graph, db);

      const stats = unifier.getStatistics([]);

      expect(stats.totalCoveredSymbols).toBe(0);
      expect(stats.totalTests).toBe(0);
      expect(stats.averageTestsPerSymbol).toBe(0);
    });

    it('should calculate statistics correctly for single symbol', () => {
      const graph = createMockGraph([]);
      const db = createMockDb({});
      const unifier = new TestCoverageUnifier(graph, db);

      const relationships: UnifiedRelationship[] = [
        createMockRelationship('class-service', 'test:service.test.ts'),
      ];

      const stats = unifier.getStatistics(relationships);

      expect(stats.totalCoveredSymbols).toBe(1);
      expect(stats.totalTests).toBe(1);
      expect(stats.averageTestsPerSymbol).toBe(1);
    });

    it('should calculate statistics correctly for multiple symbols with multiple tests', () => {
      const graph = createMockGraph([]);
      const db = createMockDb({});
      const unifier = new TestCoverageUnifier(graph, db);

      const relationships: UnifiedRelationship[] = [
        createMockRelationship('class-service-a', 'test:a.test.ts'),
        createMockRelationship('class-service-a', 'test:a2.test.ts'),
        createMockRelationship('class-service-b', 'test:b.test.ts'),
        createMockRelationship('class-service-c', 'test:c.test.ts'),
        createMockRelationship('class-service-c', 'test:c2.test.ts'),
        createMockRelationship('class-service-c', 'test:c3.test.ts'),
      ];

      const stats = unifier.getStatistics(relationships);

      expect(stats.totalCoveredSymbols).toBe(3);
      expect(stats.totalTests).toBe(6); // All unique test files
      expect(stats.averageTestsPerSymbol).toBe(2); // 6 relationships / 3 symbols
    });

    it('should handle multiple relationships to the same test file', () => {
      const graph = createMockGraph([]);
      const db = createMockDb({});
      const unifier = new TestCoverageUnifier(graph, db);

      const relationships: UnifiedRelationship[] = [
        createMockRelationship('class-service-a', 'test:shared.test.ts'),
        createMockRelationship('class-service-b', 'test:shared.test.ts'),
      ];

      const stats = unifier.getStatistics(relationships);

      expect(stats.totalCoveredSymbols).toBe(2);
      expect(stats.totalTests).toBe(1); // Only one unique test file
      expect(stats.averageTestsPerSymbol).toBe(1); // 2 relationships / 2 symbols
    });

    it('should handle same symbol tested by multiple test files', () => {
      const graph = createMockGraph([]);
      const db = createMockDb({});
      const unifier = new TestCoverageUnifier(graph, db);

      const relationships: UnifiedRelationship[] = [
        createMockRelationship('class-service', 'test:unit.test.ts'),
        createMockRelationship('class-service', 'test:integration.test.ts'),
        createMockRelationship('class-service', 'test:e2e.test.ts'),
      ];

      const stats = unifier.getStatistics(relationships);

      expect(stats.totalCoveredSymbols).toBe(1);
      expect(stats.totalTests).toBe(3);
      expect(stats.averageTestsPerSymbol).toBe(3);
    });
  });

  // Helper to create mock relationship
  function createMockRelationship(from: string, to: string): UnifiedRelationship {
    return {
      id: `test-coverage-${from}-${to}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      type: 'test-coverage',
      category: 'verification',
      from,
      to,
      direction: 'bidirectional',
      strength: 'strong',
      evidence: [{ type: 'test', source: to, confidence: 1.0 }],
      discoveredBy: 'test-analysis',
      confidence: 1.0,
      properties: { testName: 'test', testFile: to },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
});
