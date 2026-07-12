/**
 * Tests for NamingPatternRelationAnalyzer
 * @description Tests domain-based relationship detection from naming conventions
 */

import { NamingPatternRelationAnalyzer } from '../../analyzer/NamingPatternRelationAnalyzer';
import type { Symbol, SymbolGraph, SymbolType } from '../../types/graph';

// Helper to create test symbols
const createSymbol = (
  id: string,
  name: string,
  filePath: string = 'src/test.ts',
  type: SymbolType = 'class'
): Symbol => ({
  id,
  name,
  filePath,
  type,
  line: 1,
  column: 1,
  isExported: true,
  isPublic: true,
  tests: [],
  designDecisions: [],
});

// Helper to create mock symbol graph
const createMockGraph = (symbols: Symbol[]): SymbolGraph => {
  const symbolMap = new Map(symbols.map((s) => [s.id, s]));
  return {
    symbols: symbolMap,
    edges: [],
    metadata: {
      version: '1.0',
      createdAt: new Date().toISOString(),
    },
  } as unknown as SymbolGraph;
};

describe('NamingPatternRelationAnalyzer', () => {
  describe('constructor', () => {
    it('should create analyzer instance with graph', () => {
      const graph = createMockGraph([]);
      const analyzer = new NamingPatternRelationAnalyzer(graph);
      expect(analyzer).toBeDefined();
      expect(analyzer).toBeInstanceOf(NamingPatternRelationAnalyzer);
    });
  });

  describe('analyze - empty graph', () => {
    it('should return empty array for empty graph', () => {
      const graph = createMockGraph([]);
      const analyzer = new NamingPatternRelationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toEqual([]);
    });
  });

  describe('analyze - single symbol', () => {
    it('should return empty array for single symbol', () => {
      const symbols = [createSymbol('user-service', 'UserService')];
      const graph = createMockGraph(symbols);
      const analyzer = new NamingPatternRelationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toEqual([]);
    });
  });

  describe('analyze - domain grouping', () => {
    it('should detect relationships between same-domain symbols', () => {
      const symbols = [
        createSymbol('user-service', 'UserService'),
        createSymbol('user-repository', 'UserRepository'),
        createSymbol('user-controller', 'UserController'),
      ];
      const graph = createMockGraph(symbols);
      const analyzer = new NamingPatternRelationAnalyzer(graph);

      const result = analyzer.analyze();

      // 3 symbols -> 3 pairwise relationships (3C2 = 3)
      expect(result.length).toBe(3);
      expect(result[0].type).toBe('naming-pattern-relation');
      expect(result[0].category).toBe('semantic');
    });

    it('should group symbols by extracted domain prefix', () => {
      const symbols = [
        createSymbol('user-service', 'UserService'),
        createSymbol('user-handler', 'UserHandler'),
        createSymbol('auth-service', 'AuthService'),
        createSymbol('auth-handler', 'AuthHandler'),
      ];
      const graph = createMockGraph(symbols);
      const analyzer = new NamingPatternRelationAnalyzer(graph);

      const result = analyzer.analyze();

      // User domain: 2C2 = 1 relationship
      // Auth domain: 2C2 = 1 relationship
      // Total: 2 relationships
      expect(result.length).toBe(2);

      const domains = result.map((r) => r.properties?.domain);
      expect(domains).toContain('User');
      expect(domains).toContain('Auth');
    });

    it('should not group symbols with different domains', () => {
      const symbols = [
        createSymbol('user-service', 'UserService'),
        createSymbol('order-service', 'OrderService'),
      ];
      const graph = createMockGraph(symbols);
      const analyzer = new NamingPatternRelationAnalyzer(graph);

      const result = analyzer.analyze();

      // Different domains, no relationships
      expect(result.length).toBe(0);
    });
  });

  describe('domain extraction', () => {
    it('should extract domain by removing common suffixes', () => {
      const symbols = [
        createSymbol('db-manager', 'DatabaseManager'),
        createSymbol('db-service', 'DatabaseService'),
      ];
      const graph = createMockGraph(symbols);
      const analyzer = new NamingPatternRelationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result.length).toBe(1);
      expect(result[0].properties?.domain).toBe('Database');
    });

    it('should handle various suffixes', () => {
      const testCases = [
        { symbols: ['PaymentService', 'PaymentHandler'], expectedDomain: 'Payment' },
        { symbols: ['CacheManager', 'CacheBuilder'], expectedDomain: 'Cache' },
        { symbols: ['DataValidator', 'DataParser'], expectedDomain: 'Data' },
        { symbols: ['FileProcessor', 'FileAnalyzer'], expectedDomain: 'File' },
      ];

      for (const testCase of testCases) {
        const symbols = testCase.symbols.map((name, i) => createSymbol(`sym-${i}`, name));
        const graph = createMockGraph(symbols);
        const analyzer = new NamingPatternRelationAnalyzer(graph);

        const result = analyzer.analyze();

        expect(result.length).toBe(1);
        expect(result[0].properties?.domain).toBe(testCase.expectedDomain);
      }
    });

    it('should ignore symbols with short domain names (< 3 chars)', () => {
      const symbols = [
        createSymbol('io-service', 'IOService'), // "IO" is only 2 chars
        createSymbol('io-handler', 'IOHandler'),
      ];
      const graph = createMockGraph(symbols);
      const analyzer = new NamingPatternRelationAnalyzer(graph);

      const result = analyzer.analyze();

      // Domain "IO" is too short, no relationships
      expect(result.length).toBe(0);
    });
  });

  describe('relationship properties', () => {
    it('should create undirected relationships', () => {
      const symbols = [
        createSymbol('user-service', 'UserService'),
        createSymbol('user-repository', 'UserRepository'),
      ];
      const graph = createMockGraph(symbols);
      const analyzer = new NamingPatternRelationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result[0].direction).toBe('undirected');
    });

    it('should set confidence to 0.7', () => {
      const symbols = [
        createSymbol('user-service', 'UserService'),
        createSymbol('user-repository', 'UserRepository'),
      ];
      const graph = createMockGraph(symbols);
      const analyzer = new NamingPatternRelationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result[0].confidence).toBe(0.7);
    });

    it('should include domain in properties', () => {
      const symbols = [
        createSymbol('user-service', 'UserService'),
        createSymbol('user-repository', 'UserRepository'),
      ];
      const graph = createMockGraph(symbols);
      const analyzer = new NamingPatternRelationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result[0].properties).toBeDefined();
      expect(result[0].properties?.domain).toBe('User');
      expect(result[0].properties?.detectionMethod).toBe('naming-pattern');
    });

    it('should include evidence with source location', () => {
      const symbols = [
        createSymbol('user-service', 'UserService', 'src/services/user.ts'),
        createSymbol('user-repository', 'UserRepository', 'src/repos/user.ts'),
      ];
      const graph = createMockGraph(symbols);
      const analyzer = new NamingPatternRelationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result[0].evidence).toBeDefined();
      expect(result[0].evidence?.[0].type).toBe('code');
      expect(result[0].evidence?.[0].confidence).toBe(0.7);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics for empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new NamingPatternRelationAnalyzer(graph);

      const stats = analyzer.getStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.uniqueDomains).toBe(0);
      expect(stats.domainCounts).toEqual({});
      expect(stats.averageGroupSize).toBe(0);
    });

    it('should calculate statistics correctly', () => {
      const symbols = [
        createSymbol('user-service', 'UserService'),
        createSymbol('user-repository', 'UserRepository'),
        createSymbol('user-controller', 'UserController'),
        createSymbol('auth-service', 'AuthService'),
        createSymbol('auth-handler', 'AuthHandler'),
      ];
      const graph = createMockGraph(symbols);
      const analyzer = new NamingPatternRelationAnalyzer(graph);

      const relationships = analyzer.analyze();
      const stats = analyzer.getStatistics(relationships);

      // User: 3C2 = 3 relationships, Auth: 2C2 = 1 relationship
      expect(stats.total).toBe(4);
      expect(stats.uniqueDomains).toBe(2);
      expect(stats.domainCounts.User).toBe(3);
      expect(stats.domainCounts.Auth).toBe(1);
    });
  });

  describe('large scale', () => {
    it('should handle many symbols efficiently', () => {
      const domainPrefixes = ['User', 'Order', 'Payment', 'Product', 'Customer'];
      const suffixes = ['Service', 'Repository', 'Controller', 'Handler', 'Validator'];

      const symbols: Symbol[] = [];
      let id = 0;
      for (const domain of domainPrefixes) {
        for (const suffix of suffixes) {
          symbols.push(createSymbol(`sym-${id++}`, `${domain}${suffix}`));
        }
      }

      const graph = createMockGraph(symbols);
      const analyzer = new NamingPatternRelationAnalyzer(graph);

      const startTime = Date.now();
      const result = analyzer.analyze();
      const endTime = Date.now();

      // 5 domains × 5 symbols each = 25 symbols
      // Each domain has 5C2 = 10 relationships
      // Total: 5 × 10 = 50 relationships
      expect(result.length).toBe(50);

      // Should complete in reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
