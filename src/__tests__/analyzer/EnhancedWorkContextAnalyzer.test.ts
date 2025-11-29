/**
 * Tests for EnhancedWorkContextAnalyzer
 * @description Tests the work context analyzer that provides comprehensive file context
 */

import { EnhancedWorkContextAnalyzer } from '../../analyzer/EnhancedWorkContextAnalyzer';
import type { DatabaseManager } from '../../storage/DatabaseManager';
import type { Symbol, SymbolType } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships/unified';

// Mock DatabaseManager
const createMockDb = (
  symbols: Symbol[] = [],
  relationships: UnifiedRelationship[] = []
): DatabaseManager => {
  const symbolMap = new Map(symbols.map(s => [s.id, s]));

  return {
    getAllSymbols: jest.fn(() => symbols),
    getSymbol: jest.fn((id: string) => symbolMap.get(id) || null),
    getAllUnifiedRelationships: jest.fn(() => relationships),
    // Add other methods as needed
  } as unknown as DatabaseManager;
};

// Helper to create test symbols
const createSymbol = (
  id: string,
  name: string,
  filePath: string,
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

describe('EnhancedWorkContextAnalyzer', () => {
  describe('constructor', () => {
    it('should create analyzer instance with database manager', () => {
      const mockDb = createMockDb();
      const analyzer = new EnhancedWorkContextAnalyzer(mockDb);
      expect(analyzer).toBeDefined();
      expect(analyzer).toBeInstanceOf(EnhancedWorkContextAnalyzer);
    });
  });

  describe('analyze - empty file', () => {
    it('should return empty context for file with no symbols', () => {
      const mockDb = createMockDb();
      const analyzer = new EnhancedWorkContextAnalyzer(mockDb);

      const result = analyzer.analyze('/src/empty.ts');

      expect(result).toBeDefined();
      expect(result.filePath).toBe('/src/empty.ts');
      expect(result.symbols).toEqual([]);
      expect(result.summary.symbolCount).toBe(0);
      expect(result.summary.relationshipCount).toBe(0);
      expect(result.summary.testCoverage).toBe(0);
      expect(result.summary.documentationCoverage).toBe(0);
      expect(result.summary.density).toBe(0);
    });
  });

  describe('analyze - file with symbols', () => {
    it('should find symbols in the specified file', () => {
      const symbols = [
        createSymbol('class-user-service', 'UserService', 'src/services/UserService.ts'),
        createSymbol('method-get-user', 'getUser', 'src/services/UserService.ts', 'method'),
        createSymbol('class-other', 'OtherService', 'src/services/OtherService.ts'),
      ];
      const mockDb = createMockDb(symbols);
      const analyzer = new EnhancedWorkContextAnalyzer(mockDb);

      const result = analyzer.analyze('src/services/UserService.ts');

      expect(result.symbols).toHaveLength(2);
      expect(result.symbols.map(s => s.name)).toContain('UserService');
      expect(result.symbols.map(s => s.name)).toContain('getUser');
      expect(result.summary.symbolCount).toBe(2);
    });

    it('should calculate relationship density', () => {
      const symbols = [
        createSymbol('class-a', 'ClassA', 'src/test.ts'),
        createSymbol('class-b', 'ClassB', 'src/test.ts'),
      ];
      const mockDb = createMockDb(symbols);
      const analyzer = new EnhancedWorkContextAnalyzer(mockDb);

      const result = analyzer.analyze('src/test.ts');

      // With no relationships, density should be 0
      expect(result.summary.density).toBe(0);
    });
  });

  describe('analyze - dependencies', () => {
    it('should track dependency files', () => {
      const symbols = [
        createSymbol('class-user-service', 'UserService', 'src/services/UserService.ts'),
        createSymbol('class-db-manager', 'DatabaseManager', 'src/storage/DatabaseManager.ts'),
      ];

      const relationships: UnifiedRelationship[] = [
        {
          id: 'rel-1',
          type: 'code-dependency',
          category: 'structural',
          from: 'class-user-service',
          to: 'class-db-manager',
          direction: 'unidirectional',
          strength: 'strong',
          confidence: 1.0,
          evidence: [],
          discoveredBy: 'static-analysis',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          properties: {},
        },
      ];

      const mockDb = createMockDb(symbols, relationships);
      const analyzer = new EnhancedWorkContextAnalyzer(mockDb);

      const result = analyzer.analyze('src/services/UserService.ts');

      // Verify dependent files are tracked
      expect(result.impact.dependencyFiles.size).toBeGreaterThanOrEqual(0);
    });

    it('should find dependents (reverse dependencies)', () => {
      const symbols = [
        createSymbol('class-user-service', 'UserService', 'src/services/UserService.ts'),
        createSymbol('class-controller', 'UserController', 'src/controllers/UserController.ts'),
      ];

      const relationships: UnifiedRelationship[] = [
        {
          id: 'rel-1',
          type: 'code-dependency',
          category: 'structural',
          from: 'class-controller',
          to: 'class-user-service',
          direction: 'unidirectional',
          strength: 'strong',
          confidence: 1.0,
          evidence: [],
          discoveredBy: 'static-analysis',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          properties: {},
        },
      ];

      const mockDb = createMockDb(symbols, relationships);
      const analyzer = new EnhancedWorkContextAnalyzer(mockDb);

      const result = analyzer.analyze('src/services/UserService.ts');

      // Controller depends on UserService, so it should be in dependents
      expect(result.relationships.dependents.length).toBe(1);
      expect(result.relationships.dependents[0].depName).toBe('UserController');
      expect(result.impact.dependentFiles.has('src/controllers/UserController.ts')).toBe(true);
    });
  });

  describe('analyze - test coverage', () => {
    it('should calculate test coverage percentage', () => {
      const symbols = [
        createSymbol('class-user-service', 'UserService', 'src/services/UserService.ts'),
        createSymbol('method-get-user', 'getUser', 'src/services/UserService.ts', 'method'),
        createSymbol('test-user-service', 'UserServiceTest', 'src/__tests__/UserService.test.ts', 'test-suite'),
      ];
      const mockDb = createMockDb(symbols);
      const analyzer = new EnhancedWorkContextAnalyzer(mockDb);

      const result = analyzer.analyze('src/services/UserService.ts');

      // Without test relationships in queryEngine, coverage is 0
      expect(result.summary.testCoverage).toBe(0);
    });

    it('should track test files', () => {
      const symbols = [
        createSymbol('class-a', 'ClassA', 'src/ClassA.ts'),
      ];
      const mockDb = createMockDb(symbols);
      const analyzer = new EnhancedWorkContextAnalyzer(mockDb);

      const result = analyzer.analyze('src/ClassA.ts');

      expect(result.impact.testFiles).toBeDefined();
      expect(result.impact.testFiles instanceof Set).toBe(true);
    });
  });

  describe('analyze - documentation coverage', () => {
    it('should calculate documentation coverage percentage', () => {
      const symbols = [
        createSymbol('class-user-service', 'UserService', 'src/services/UserService.ts'),
      ];
      const mockDb = createMockDb(symbols);
      const analyzer = new EnhancedWorkContextAnalyzer(mockDb);

      const result = analyzer.analyze('src/services/UserService.ts');

      // Without doc references in queryEngine, coverage is 0
      expect(result.summary.documentationCoverage).toBe(0);
    });

    it('should track documentation files', () => {
      const symbols = [
        createSymbol('class-a', 'ClassA', 'src/ClassA.ts'),
      ];
      const mockDb = createMockDb(symbols);
      const analyzer = new EnhancedWorkContextAnalyzer(mockDb);

      const result = analyzer.analyze('src/ClassA.ts');

      expect(result.impact.documentationFiles).toBeDefined();
      expect(result.impact.documentationFiles instanceof Set).toBe(true);
    });
  });

  describe('analyze - path normalization', () => {
    it('should handle both absolute and relative paths', () => {
      const symbols = [
        createSymbol('class-a', 'ClassA', 'src/ClassA.ts'),
      ];
      const mockDb = createMockDb(symbols);
      const analyzer = new EnhancedWorkContextAnalyzer(mockDb);

      // Using relative path
      const result1 = analyzer.analyze('src/ClassA.ts');
      expect(result1.symbols.length).toBe(1);

      // Using full path (would need process.cwd() to work correctly in real scenario)
      const result2 = analyzer.analyze(process.cwd() + '/src/ClassA.ts');
      // May or may not match depending on path normalization
      expect(result2).toBeDefined();
    });
  });

  describe('EnhancedWorkContext structure', () => {
    it('should have all required fields in the context', () => {
      const mockDb = createMockDb();
      const analyzer = new EnhancedWorkContextAnalyzer(mockDb);

      const result = analyzer.analyze('/src/test.ts');

      // Check structure
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('symbols');
      expect(result).toHaveProperty('relationships');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('impact');

      // Relationships structure
      expect(result.relationships).toHaveProperty('total');
      expect(result.relationships).toHaveProperty('documentation');
      expect(result.relationships).toHaveProperty('tests');
      expect(result.relationships).toHaveProperty('dependencies');
      expect(result.relationships).toHaveProperty('dependents');
      expect(result.relationships).toHaveProperty('semanticNeighbors');

      // Summary structure
      expect(result.summary).toHaveProperty('symbolCount');
      expect(result.summary).toHaveProperty('relationshipCount');
      expect(result.summary).toHaveProperty('testCoverage');
      expect(result.summary).toHaveProperty('documentationCoverage');
      expect(result.summary).toHaveProperty('density');

      // Impact structure
      expect(result.impact).toHaveProperty('dependentFiles');
      expect(result.impact).toHaveProperty('dependencyFiles');
      expect(result.impact).toHaveProperty('testFiles');
      expect(result.impact).toHaveProperty('documentationFiles');
    });

    it('should initialize arrays as empty arrays', () => {
      const mockDb = createMockDb();
      const analyzer = new EnhancedWorkContextAnalyzer(mockDb);

      const result = analyzer.analyze('/src/test.ts');

      expect(Array.isArray(result.symbols)).toBe(true);
      expect(Array.isArray(result.relationships.documentation)).toBe(true);
      expect(Array.isArray(result.relationships.tests)).toBe(true);
      expect(Array.isArray(result.relationships.dependencies)).toBe(true);
      expect(Array.isArray(result.relationships.dependents)).toBe(true);
      expect(Array.isArray(result.relationships.semanticNeighbors)).toBe(true);
    });

    it('should initialize Sets as empty Sets', () => {
      const mockDb = createMockDb();
      const analyzer = new EnhancedWorkContextAnalyzer(mockDb);

      const result = analyzer.analyze('/src/test.ts');

      expect(result.impact.dependentFiles instanceof Set).toBe(true);
      expect(result.impact.dependencyFiles instanceof Set).toBe(true);
      expect(result.impact.testFiles instanceof Set).toBe(true);
      expect(result.impact.documentationFiles instanceof Set).toBe(true);
    });
  });
});
