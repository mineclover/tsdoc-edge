/**
 * DocReferenceAnalyzer Tests
 */

import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { DocReferenceAnalyzer } from '../../analyzer/DocReferenceAnalyzer';
import type { SymbolGraph, Symbol } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships';

describe('DocReferenceAnalyzer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-ref-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

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

  // Helper to create TypeScript file with @doc tags
  function createTsFileWithDocTag(
    fileName: string,
    content: string
  ): string {
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  describe('constructor', () => {
    it('should create analyzer with graph', () => {
      const graph = createMockGraph([]);
      const analyzer = new DocReferenceAnalyzer(graph);
      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze', () => {
    it('should return empty array when no TypeScript files exist', () => {
      const graph = createMockGraph([]);
      const analyzer = new DocReferenceAnalyzer(graph);

      const result = analyzer.analyze(tempDir);

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no @doc tags found', () => {
      const graph = createMockGraph([
        { id: 'class-authservice', name: 'AuthService' },
      ]);

      createTsFileWithDocTag(
        'AuthService.ts',
        `
/**
 * Authentication service
 */
export class AuthService {
  login(): void {}
}
`
      );

      const analyzer = new DocReferenceAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result).toHaveLength(0);
    });

    it('should detect @doc [[Symbol]] reference', () => {
      const filePath = path.join(tempDir, 'AuthService.ts');
      const graph = createMockGraph([
        { id: 'class-authservice', name: 'AuthService', filePath },
      ]);

      createTsFileWithDocTag(
        'AuthService.ts',
        `
/**
 * Authentication service
 * @doc [[Authentication]]
 */
export class AuthService {
  login(): void {}
}
`
      );

      const analyzer = new DocReferenceAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result.length).toBeGreaterThanOrEqual(1);
      const rel = result[0];
      expect(rel.type).toBe('doc-reference');
      expect(rel.from).toBe('class-authservice');
      expect(rel.to).toBe('Authentication');
      expect(rel.direction).toBe('unidirectional');
      expect(rel.strength).toBe('strong');
      expect(rel.category).toBe('semantic');
    });

    it('should detect @doc [[Symbol#Section]] reference with section', () => {
      const filePath = path.join(tempDir, 'UserService.ts');
      const graph = createMockGraph([
        { id: 'class-userservice', name: 'UserService', filePath },
      ]);

      createTsFileWithDocTag(
        'UserService.ts',
        `
/**
 * User service
 * @doc [[User Management#Login]]
 */
export class UserService {
  authenticate(): void {}
}
`
      );

      const analyzer = new DocReferenceAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result.length).toBeGreaterThanOrEqual(1);
      const rel = result[0];
      expect(rel.properties?.section).toBe('Login');
      expect(rel.to).toBe('User Management');
    });

    it('should detect multiple @doc tags in same symbol', () => {
      const filePath = path.join(tempDir, 'MultiDocService.ts');
      const graph = createMockGraph([
        { id: 'class-multidocservice', name: 'MultiDocService', filePath },
      ]);

      createTsFileWithDocTag(
        'MultiDocService.ts',
        `
/**
 * Multi doc service
 * @doc [[Authentication]]
 * @doc [[Authorization]]
 */
export class MultiDocService {
  run(): void {}
}
`
      );

      const analyzer = new DocReferenceAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result.length).toBeGreaterThanOrEqual(2);
      const docSymbols = result.map((r) => r.to);
      expect(docSymbols).toContain('Authentication');
      expect(docSymbols).toContain('Authorization');
    });

    it('should skip files in node_modules, dist, and build directories', () => {
      const graph = createMockGraph([
        { id: 'class-service', name: 'Service' },
      ]);

      // Create node_modules directory
      const nodeModulesDir = path.join(tempDir, 'node_modules');
      fs.mkdirSync(nodeModulesDir);
      fs.writeFileSync(
        path.join(nodeModulesDir, 'SomeModule.ts'),
        `
/**
 * @doc [[SomeDoc]]
 */
export class SomeModule {}
`
      );

      const analyzer = new DocReferenceAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result).toHaveLength(0);
    });

    it('should not create relationship when symbol not found in graph', () => {
      const graph = createMockGraph([]);

      createTsFileWithDocTag(
        'Unknown.ts',
        `
/**
 * @doc [[SomeDoc]]
 */
export class Unknown {}
`
      );

      const analyzer = new DocReferenceAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result).toHaveLength(0);
    });

    it('should handle non-existent directory gracefully', () => {
      const graph = createMockGraph([]);
      const analyzer = new DocReferenceAnalyzer(graph);

      const result = analyzer.analyze('/non/existent/path');

      expect(result).toHaveLength(0);
    });

    it('should traverse subdirectories', () => {
      const subDir = path.join(tempDir, 'services');
      fs.mkdirSync(subDir);
      const filePath = path.join(subDir, 'DeepService.ts');

      const graph = createMockGraph([
        { id: 'class-deepservice', name: 'DeepService', filePath },
      ]);

      fs.writeFileSync(
        filePath,
        `
/**
 * @doc [[DeepDoc]]
 */
export class DeepService {}
`
      );

      const analyzer = new DocReferenceAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].to).toBe('DeepDoc');
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics for empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new DocReferenceAnalyzer(graph);

      const stats = analyzer.getStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.withSection).toBe(0);
      expect(stats.uniqueCodeSymbols).toBe(0);
      expect(stats.uniqueDocSymbols).toBe(0);
      expect(Object.keys(stats.byFile)).toHaveLength(0);
    });

    it('should calculate statistics correctly', () => {
      const graph = createMockGraph([]);
      const analyzer = new DocReferenceAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockDocReference('class-auth', 'Authentication', 'src/auth.ts'),
        createMockDocReference('class-auth', 'Security', 'src/auth.ts', 'Login'),
        createMockDocReference('class-user', 'UserManagement', 'src/user.ts'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.total).toBe(3);
      expect(stats.withSection).toBe(1);
      expect(stats.uniqueCodeSymbols).toBe(2);
      expect(stats.uniqueDocSymbols).toBe(3);
      expect(stats.byFile['src/auth.ts']).toBe(2);
      expect(stats.byFile['src/user.ts']).toBe(1);
    });

    it('should handle relationships with array from/to', () => {
      const graph = createMockGraph([]);
      const analyzer = new DocReferenceAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        {
          id: 'test-1',
          type: 'doc-reference',
          from: ['class-a', 'class-b'],
          to: ['doc-1', 'doc-2'],
          direction: 'unidirectional',
          strength: 'strong',
          category: 'semantic',
          evidence: [],
          discoveredBy: 'documentation',
          confidence: 1.0,
          filePath: 'src/test.ts',
          properties: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.uniqueCodeSymbols).toBe(2);
      expect(stats.uniqueDocSymbols).toBe(2);
    });
  });

  // Helper to create mock doc reference relationship
  function createMockDocReference(
    from: string,
    to: string,
    filePath: string,
    section?: string
  ): UnifiedRelationship {
    return {
      id: `doc-reference-${from}-${to}`,
      type: 'doc-reference',
      from,
      to,
      direction: 'unidirectional',
      strength: 'strong',
      category: 'semantic',
      evidence: [
        {
          type: 'documentation',
          source: filePath,
          confidence: 1.0,
        },
      ],
      discoveredBy: 'documentation',
      confidence: 1.0,
      filePath,
      properties: section ? { section } : {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
});
