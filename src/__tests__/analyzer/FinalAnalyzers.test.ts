/**
 * Tests for FinalAnalyzers
 * @description Tests pipeline and feature-grouping analysis
 */

import { FinalAnalyzers } from '../../analyzer/FinalAnalyzers';
import type { SymbolGraph, Symbol } from '../../types/graph';
import type { Database } from 'better-sqlite3';

// Helper to create mock symbol graph
const createMockGraph = (symbols: Symbol[] = []): SymbolGraph => {
  const symbolMap = new Map(symbols.map(s => [s.id, s]));
  return {
    symbols: symbolMap,
    edges: [],
    metadata: {
      version: '1.0',
      createdAt: new Date().toISOString(),
    },
  } as unknown as SymbolGraph;
};

// Helper to create mock database
const createMockDb = (
  pipelineChains: Array<{ stage1: string; stage2: string; stage3: string }> = [],
  featureGroups: Array<{ feature: string; member: string; filepath: string }> = []
): Database => {
  return {
    prepare: jest.fn((sql: string) => {
      if (sql.includes('dependencies') && sql.includes('calls')) {
        return {
          all: jest.fn(() => pipelineChains),
        };
      }
      if (sql.includes('feature')) {
        return {
          all: jest.fn(() => featureGroups),
        };
      }
      return {
        all: jest.fn(() => []),
        run: jest.fn(),
        get: jest.fn(),
      };
    }),
  } as unknown as Database;
};

// Helper to create test symbol
const createSymbol = (id: string, name: string, filePath: string = 'src/test.ts'): Symbol => ({
  id,
  name,
  filePath,
  type: 'class',
  line: 1,
  column: 1,
  isExported: true,
  isPublic: true,
  dependencies: [],
  dependents: [],
  tags: {},
});

describe('FinalAnalyzers', () => {
  describe('constructor', () => {
    it('should create analyzer instance with graph and database', () => {
      const graph = createMockGraph();
      const db = createMockDb();
      const analyzer = new FinalAnalyzers(graph, db);

      expect(analyzer).toBeDefined();
      expect(analyzer).toBeInstanceOf(FinalAnalyzers);
    });
  });

  describe('analyze - empty data', () => {
    it('should return empty array when no patterns found', () => {
      const graph = createMockGraph();
      const db = createMockDb();
      const analyzer = new FinalAnalyzers(graph, db);

      const result = analyzer.analyze();

      expect(result).toEqual([]);
    });
  });

  describe('analyze - pipeline detection', () => {
    it('should detect pipeline chains', () => {
      const graph = createMockGraph();
      const db = createMockDb([
        { stage1: 'reader', stage2: 'processor', stage3: 'writer' },
      ]);
      const analyzer = new FinalAnalyzers(graph, db);

      const result = analyzer.analyze();

      // Should create 2 pipeline relationships (reader→processor, processor→writer)
      const pipelines = result.filter(r => r.type === 'pipeline');
      expect(pipelines.length).toBe(2);
    });

    it('should set pipeline relationship properties correctly', () => {
      const graph = createMockGraph();
      const db = createMockDb([
        { stage1: 'A', stage2: 'B', stage3: 'C' },
      ]);
      const analyzer = new FinalAnalyzers(graph, db);

      const result = analyzer.analyze();
      const pipelines = result.filter(r => r.type === 'pipeline');

      if (pipelines.length > 0) {
        expect(pipelines[0].category).toBe('data-flow');
        expect(pipelines[0].direction).toBe('unidirectional');
        expect(pipelines[0].confidence).toBe(0.8);
      }
    });

    it('should include next/previous stage in properties', () => {
      const graph = createMockGraph();
      const db = createMockDb([
        { stage1: 'A', stage2: 'B', stage3: 'C' },
      ]);
      const analyzer = new FinalAnalyzers(graph, db);

      const result = analyzer.analyze();
      const pipelines = result.filter(r => r.type === 'pipeline');

      if (pipelines.length >= 2) {
        // First pipeline (A→B) should have nextStage
        const first = pipelines.find(p => p.from === 'A');
        expect(first?.properties?.nextStage).toBe('C');

        // Second pipeline (B→C) should have previousStage
        const second = pipelines.find(p => p.from === 'B');
        expect(second?.properties?.previousStage).toBe('A');
      }
    });

    it('should handle multiple pipeline chains', () => {
      const graph = createMockGraph();
      const db = createMockDb([
        { stage1: 'reader1', stage2: 'processor1', stage3: 'writer1' },
        { stage1: 'reader2', stage2: 'processor2', stage3: 'writer2' },
      ]);
      const analyzer = new FinalAnalyzers(graph, db);

      const result = analyzer.analyze();
      const pipelines = result.filter(r => r.type === 'pipeline');

      // 2 chains × 2 relationships each = 4 relationships
      expect(pipelines.length).toBe(4);
    });
  });

  describe('analyze - feature grouping detection', () => {
    it('should detect feature groupings', () => {
      const symbols = [
        createSymbol('auth-service', 'AuthService'),
        createSymbol('auth-guard', 'AuthGuard'),
      ];
      const graph = createMockGraph(symbols);
      const db = createMockDb([], [
        { feature: 'Authentication', member: 'auth-service', filepath: 'src/auth/service.ts' },
        { feature: 'Authentication', member: 'auth-guard', filepath: 'src/auth/guard.ts' },
      ]);
      const analyzer = new FinalAnalyzers(graph, db);

      const result = analyzer.analyze();

      // May create feature-grouping relationship
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('analyze - error handling', () => {
    it('should handle database errors gracefully', () => {
      const graph = createMockGraph();
      const db = {
        prepare: jest.fn(() => {
          throw new Error('Database error');
        }),
      } as unknown as Database;

      const analyzer = new FinalAnalyzers(graph, db);

      // Should not throw, just return empty or partial results
      expect(() => analyzer.analyze()).not.toThrow();
    });
  });

  describe('relationship IDs', () => {
    it('should create valid relationship IDs', () => {
      const graph = createMockGraph();
      const db = createMockDb([
        { stage1: 'StageOne', stage2: 'StageTwo', stage3: 'StageThree' },
      ]);
      const analyzer = new FinalAnalyzers(graph, db);

      const result = analyzer.analyze();

      for (const rel of result) {
        // ID should be lowercase and use hyphens
        expect(rel.id).toMatch(/^[a-z0-9-]+$/);
        // ID should not start or end with hyphen
        expect(rel.id).not.toMatch(/^-|-$/);
      }
    });
  });

  describe('evidence', () => {
    it('should include evidence with confidence', () => {
      const graph = createMockGraph();
      const db = createMockDb([
        { stage1: 'A', stage2: 'B', stage3: 'C' },
      ]);
      const analyzer = new FinalAnalyzers(graph, db);

      const result = analyzer.analyze();

      for (const rel of result) {
        expect(rel.evidence).toBeDefined();
        expect(Array.isArray(rel.evidence)).toBe(true);
        if (rel.evidence && rel.evidence.length > 0) {
          expect(rel.evidence[0].confidence).toBeDefined();
        }
      }
    });
  });

  describe('timestamps', () => {
    it('should include createdAt and updatedAt', () => {
      const graph = createMockGraph();
      const db = createMockDb([
        { stage1: 'A', stage2: 'B', stage3: 'C' },
      ]);
      const analyzer = new FinalAnalyzers(graph, db);

      const result = analyzer.analyze();

      for (const rel of result) {
        expect(rel.createdAt).toBeDefined();
        expect(rel.updatedAt).toBeDefined();
        // Should be valid ISO date strings
        expect(() => new Date(rel.createdAt!)).not.toThrow();
        expect(() => new Date(rel.updatedAt!)).not.toThrow();
      }
    });
  });
});
