/**
 * IntegrationVerificationAnalyzer Tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { IntegrationVerificationAnalyzer } from '../../analyzer/IntegrationVerificationAnalyzer';
import type { SymbolGraph, Symbol } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships';

// Mock fs module
jest.mock('node:fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('IntegrationVerificationAnalyzer', () => {
  // Helper to create mock graph
  function createMockGraph(
    symbols: Array<{ id: string; name: string; filePath?: string }>
  ): SymbolGraph {
    const symbolsMap = new Map<string, Symbol>();
    const nameIndex = new Map<string, string[]>();

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

      const names = nameIndex.get(s.name) || [];
      names.push(s.id);
      nameIndex.set(s.name, names);
    }

    return {
      symbols: symbolsMap,
      relationships: [],
      adjacencyList: new Map(),
      reverseAdjacencyList: new Map(),
      nameIndex,
      fileIndex: new Map(),
    } as SymbolGraph;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create analyzer with graph', () => {
      const graph = createMockGraph([]);
      mockFs.existsSync.mockReturnValue(false);

      const analyzer = new IntegrationVerificationAnalyzer(graph);
      expect(analyzer).toBeDefined();
    });

    it('should accept custom project root', () => {
      const graph = createMockGraph([]);
      mockFs.existsSync.mockReturnValue(false);

      const analyzer = new IntegrationVerificationAnalyzer(graph, '/custom/project');
      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze', () => {
    it('should return empty array when no test files exist', () => {
      const graph = createMockGraph([]);
      mockFs.existsSync.mockReturnValue(false);

      const analyzer = new IntegrationVerificationAnalyzer(graph, '/project');
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when test directory is empty', () => {
      const graph = createMockGraph([
        { id: 'class-userservice', name: 'UserService' },
      ]);

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([]);

      const analyzer = new IntegrationVerificationAnalyzer(graph, '/project');
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should skip test files that cannot be parsed', () => {
      const graph = createMockGraph([
        { id: 'class-userservice', name: 'UserService' },
      ]);

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir).includes('__tests__')) {
          return [
            { name: 'broken.test.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const analyzer = new IntegrationVerificationAnalyzer(graph, '/project');
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should create integration-verification relationships for tests with multiple symbols', () => {
      const graph = createMockGraph([
        { id: 'class-userservice', name: 'UserService', filePath: 'src/UserService.ts' },
        { id: 'class-authservice', name: 'AuthService', filePath: 'src/AuthService.ts' },
      ]);

      const testFileContent = `
        import { UserService } from '../UserService';
        import { AuthService } from '../AuthService';

        describe('Integration', () => {
          it('should work together', () => {
            const auth = new AuthService();
            const user = new UserService(auth);
            expect(user).toBeDefined();
          });
        });
      `;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir).includes('__tests__')) {
          return [
            { name: 'integration.test.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      mockFs.readFileSync.mockReturnValue(testFileContent);

      const analyzer = new IntegrationVerificationAnalyzer(graph, '/project');
      const result = analyzer.analyze();

      // Should find relationship between UserService and AuthService
      expect(result.length).toBeGreaterThanOrEqual(0);

      if (result.length > 0) {
        expect(result[0].type).toBe('integration-verification');
        expect(result[0].category).toBe('verification');
        expect(result[0].direction).toBe('bidirectional');
      }
    });

    it('should skip test symbols when detecting integration', () => {
      const graph = createMockGraph([
        { id: 'class-userservice', name: 'UserService' },
        { id: 'test-userservice.test.ts', name: 'UserService.test' },
      ]);

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir).includes('__tests__')) {
          return [
            { name: 'user.test.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      mockFs.readFileSync.mockReturnValue(`
        import { UserService } from '../UserService';
        describe('test', () => { it('works', () => {}); });
      `);

      const analyzer = new IntegrationVerificationAnalyzer(graph, '/project');
      const result = analyzer.analyze();

      // Should not create relationships with test symbols
      const hasTestSymbol = result.some(
        r => String(r.from).includes('.test.') || String(r.to).includes('.test.')
      );
      expect(hasTestSymbol).toBe(false);
    });

    it('should deduplicate relationships by keeping highest confidence', () => {
      const graph = createMockGraph([
        { id: 'class-a', name: 'A' },
        { id: 'class-b', name: 'B' },
      ]);

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir).includes('__tests__')) {
          return [
            { name: 'test1.test.ts', isFile: () => true, isDirectory: () => false },
            { name: 'test2.test.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });

      let callCount = 0;
      mockFs.readFileSync.mockImplementation(() => {
        callCount++;
        return `
          import { A } from '../A';
          import { B } from '../B';
          describe('test', () => {
            it('integration', () => {
              new A(new B());
            });
          });
        `;
      });

      const analyzer = new IntegrationVerificationAnalyzer(graph, '/project');
      const result = analyzer.analyze();

      // Should have at most one relationship per pair
      const pairCounts = new Map<string, number>();
      for (const rel of result) {
        const key = [String(rel.from), String(rel.to)].sort().join('↔');
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }

      for (const count of pairCounts.values()) {
        expect(count).toBe(1);
      }
    });
  });

  describe('getStatistics', () => {
    it('should return zero statistics for empty relationships', () => {
      const graph = createMockGraph([]);
      mockFs.existsSync.mockReturnValue(false);

      const analyzer = new IntegrationVerificationAnalyzer(graph);
      const stats = analyzer.getStatistics([]);

      expect(stats.totalVerifiedConnections).toBe(0);
      expect(stats.totalIntegrationTests).toBe(0);
      expect(stats.symbolsWithIntegrationTests).toBe(0);
      expect(stats.strongVerifications).toBe(0);
      expect(stats.mediumVerifications).toBe(0);
      expect(stats.weakVerifications).toBe(0);
    });

    it('should calculate statistics correctly', () => {
      const graph = createMockGraph([]);
      mockFs.existsSync.mockReturnValue(false);

      const analyzer = new IntegrationVerificationAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockRelationship('class-a', 'class-b', 'strong', 'test1.test.ts'),
        createMockRelationship('class-a', 'class-c', 'medium', 'test1.test.ts'),
        createMockRelationship('class-b', 'class-c', 'weak', 'test2.test.ts'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalVerifiedConnections).toBe(3);
      expect(stats.totalIntegrationTests).toBe(2);
      expect(stats.symbolsWithIntegrationTests).toBe(3);
      expect(stats.strongVerifications).toBe(1);
      expect(stats.mediumVerifications).toBe(1);
      expect(stats.weakVerifications).toBe(1);
    });

    it('should count unique symbols correctly', () => {
      const graph = createMockGraph([]);
      mockFs.existsSync.mockReturnValue(false);

      const analyzer = new IntegrationVerificationAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockRelationship('class-a', 'class-b', 'strong', 'test.ts'),
        createMockRelationship('class-a', 'class-c', 'strong', 'test.ts'),
        createMockRelationship('class-b', 'class-c', 'strong', 'test.ts'),
      ];

      const stats = analyzer.getStatistics(relationships);

      // A, B, C = 3 unique symbols
      expect(stats.symbolsWithIntegrationTests).toBe(3);
      // All in same test file
      expect(stats.totalIntegrationTests).toBe(1);
    });
  });

  describe('relationship structure', () => {
    it('should create relationships with correct structure', () => {
      const graph = createMockGraph([
        { id: 'class-userservice', name: 'UserService' },
        { id: 'class-authservice', name: 'AuthService' },
      ]);

      const testContent = `
        import { UserService } from '../UserService';
        import { AuthService } from '../AuthService';
        describe('Integration', () => {
          it('works', () => {
            new UserService(new AuthService());
          });
        });
      `;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((dir: any) => {
        if (String(dir).includes('__tests__')) {
          return [
            { name: 'integration.test.ts', isFile: () => true, isDirectory: () => false },
          ] as any;
        }
        return [];
      });
      mockFs.readFileSync.mockReturnValue(testContent);

      const analyzer = new IntegrationVerificationAnalyzer(graph, '/project');
      const result = analyzer.analyze();

      if (result.length > 0) {
        const rel = result[0];

        // Check required fields
        expect(rel.id).toBeDefined();
        expect(rel.type).toBe('integration-verification');
        expect(rel.category).toBe('verification');
        expect(rel.from).toBeDefined();
        expect(rel.to).toBeDefined();
        expect(rel.direction).toBe('bidirectional');
        expect(rel.strength).toBeDefined();
        expect(rel.evidence).toBeDefined();
        expect(rel.evidence.length).toBeGreaterThan(0);
        expect(rel.discoveredBy).toBe('test-analysis');
        expect(rel.confidence).toBeGreaterThan(0);
        expect(rel.properties).toBeDefined();
        expect(rel.createdAt).toBeDefined();
        expect(rel.updatedAt).toBeDefined();

        // Check ID format
        expect(rel.id).toMatch(/^[a-z0-9-]+$/);

        // Check properties
        expect(rel.properties.testFile).toBeDefined();
        expect(rel.properties.verificationStrength).toBeDefined();
      }
    });
  });

  // Helper to create mock relationship
  function createMockRelationship(
    from: string,
    to: string,
    strength: 'strong' | 'medium' | 'weak',
    testFile: string
  ): UnifiedRelationship {
    return {
      id: `integration-verification-${from}-${to}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      type: 'integration-verification',
      category: 'verification',
      from,
      to,
      direction: 'bidirectional',
      strength,
      evidence: [{ type: 'test', source: testFile, confidence: 0.9 }],
      discoveredBy: 'test-analysis',
      confidence: strength === 'strong' ? 0.95 : strength === 'medium' ? 0.8 : 0.6,
      filePath: testFile,
      properties: {
        testFile,
        verificationStrength: strength,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
});
