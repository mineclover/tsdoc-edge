/**
 * CoRequirementAnalyzer Tests
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CoRequirementAnalyzer } from '../../analyzer/CoRequirementAnalyzer';
import type { Symbol, SymbolGraph } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships';

describe('CoRequirementAnalyzer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'co-req-test-'));
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

  // Helper to create TypeScript file with @requires tags
  function createTsFileWithRequires(fileName: string, content: string): string {
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, content);
    return filePath;
  }

  describe('constructor', () => {
    it('should create analyzer with graph', () => {
      const graph = createMockGraph([]);
      const analyzer = new CoRequirementAnalyzer(graph);
      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze', () => {
    it('should return empty array when no TypeScript files exist', () => {
      const graph = createMockGraph([]);
      const analyzer = new CoRequirementAnalyzer(graph);

      const result = analyzer.analyze(tempDir);

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no @requires tags found', () => {
      const graph = createMockGraph([{ id: 'class-dbmanager', name: 'DatabaseManager' }]);

      createTsFileWithRequires(
        'DatabaseManager.ts',
        `
/**
 * Database manager
 */
export class DatabaseManager {
  query(): void {}
}
`
      );

      const analyzer = new CoRequirementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result).toHaveLength(0);
    });

    it('should detect @requires tag', () => {
      const filePath = path.join(tempDir, 'DatabaseManager.ts');
      const graph = createMockGraph([
        { id: 'class-databasemanager', name: 'DatabaseManager', filePath },
      ]);

      createTsFileWithRequires(
        'DatabaseManager.ts',
        `
/**
 * Database manager
 * @requires ConnectionPool
 */
export class DatabaseManager {
  query(): void {}
}
`
      );

      const analyzer = new CoRequirementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result.length).toBeGreaterThanOrEqual(1);
      const rel = result[0];
      expect(rel.type).toBe('co-requirement');
      expect(rel.from).toBe('class-databasemanager');
      expect(rel.to).toBe('ConnectionPool');
      expect(rel.direction).toBe('unidirectional');
      expect(rel.strength).toBe('strong');
      expect(rel.category).toBe('constraint');
      expect(rel.confidence).toBe(1.0);
    });

    it('should detect multiple @requires tags', () => {
      const filePath = path.join(tempDir, 'ServiceManager.ts');
      const graph = createMockGraph([
        { id: 'class-servicemanager', name: 'ServiceManager', filePath },
      ]);

      createTsFileWithRequires(
        'ServiceManager.ts',
        `
/**
 * Service manager
 * @requires Logger
 * @requires ConfigService
 * @requires Cache
 */
export class ServiceManager {
  run(): void {}
}
`
      );

      const analyzer = new CoRequirementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result.length).toBeGreaterThanOrEqual(3);
      const requiredSymbols = result.map((r) => r.to);
      expect(requiredSymbols).toContain('Logger');
      expect(requiredSymbols).toContain('ConfigService');
      expect(requiredSymbols).toContain('Cache');
    });

    it('should detect @requires in function declarations', () => {
      const filePath = path.join(tempDir, 'utils.ts');
      const graph = createMockGraph([{ id: 'function-initialize', name: 'initialize', filePath }]);

      createTsFileWithRequires(
        'utils.ts',
        `
/**
 * Initialize the system
 * @requires Config
 */
export function initialize(): void {}
`
      );

      const analyzer = new CoRequirementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].from).toBe('function-initialize');
      expect(result[0].to).toBe('Config');
    });

    it('should detect @requires in interface declarations', () => {
      const filePath = path.join(tempDir, 'interfaces.ts');
      const graph = createMockGraph([{ id: 'interface-idatabase', name: 'IDatabase', filePath }]);

      createTsFileWithRequires(
        'interfaces.ts',
        `
/**
 * Database interface
 * @requires IConnection
 */
export interface IDatabase {
  connect(): void;
}
`
      );

      const analyzer = new CoRequirementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].from).toBe('interface-idatabase');
    });

    it('should detect @requires in type alias declarations', () => {
      const filePath = path.join(tempDir, 'types.ts');
      const graph = createMockGraph([{ id: 'type-config', name: 'Config', filePath }]);

      createTsFileWithRequires(
        'types.ts',
        `
/**
 * Config type
 * @requires BaseConfig
 */
export type Config = {
  name: string;
};
`
      );

      const analyzer = new CoRequirementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].from).toBe('type-config');
    });

    it('should skip files in node_modules, dist, and build directories', () => {
      const graph = createMockGraph([{ id: 'class-service', name: 'Service' }]);

      // Create dist directory
      const distDir = path.join(tempDir, 'dist');
      fs.mkdirSync(distDir);
      fs.writeFileSync(
        path.join(distDir, 'SomeModule.ts'),
        `
/**
 * @requires SomeDep
 */
export class SomeModule {}
`
      );

      const analyzer = new CoRequirementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result).toHaveLength(0);
    });

    it('should not create relationship when symbol not found in graph', () => {
      const graph = createMockGraph([]);

      createTsFileWithRequires(
        'Unknown.ts',
        `
/**
 * @requires SomeDep
 */
export class Unknown {}
`
      );

      const analyzer = new CoRequirementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result).toHaveLength(0);
    });

    it('should handle non-existent directory gracefully', () => {
      const graph = createMockGraph([]);
      const analyzer = new CoRequirementAnalyzer(graph);

      const result = analyzer.analyze('/non/existent/path');

      expect(result).toHaveLength(0);
    });

    it('should traverse subdirectories', () => {
      const subDir = path.join(tempDir, 'services');
      fs.mkdirSync(subDir);
      const filePath = path.join(subDir, 'DeepService.ts');

      const graph = createMockGraph([{ id: 'class-deepservice', name: 'DeepService', filePath }]);

      fs.writeFileSync(
        filePath,
        `
/**
 * @requires DeepDependency
 */
export class DeepService {}
`
      );

      const analyzer = new CoRequirementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].to).toBe('DeepDependency');
    });

    it('should include correct evidence in relationships', () => {
      const filePath = path.join(tempDir, 'TestService.ts');
      const graph = createMockGraph([{ id: 'class-testservice', name: 'TestService', filePath }]);

      createTsFileWithRequires(
        'TestService.ts',
        `
/**
 * Test service
 * @requires TestDep
 */
export class TestService {}
`
      );

      const analyzer = new CoRequirementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result.length).toBeGreaterThanOrEqual(1);
      const rel = result[0];

      expect(rel.evidence).toHaveLength(1);
      expect(rel.evidence[0].type).toBe('documentation');
      expect(rel.evidence[0].snippet).toBe('@requires TestDep');
      expect(rel.evidence[0].confidence).toBe(1.0);
    });

    it('should handle files with parsing errors gracefully', () => {
      const _graph = createMockGraph([{ id: 'class-valid', name: 'ValidClass' }]);

      // Create a valid file
      const validPath = path.join(tempDir, 'ValidClass.ts');
      fs.writeFileSync(
        validPath,
        `
/**
 * @requires ValidDep
 */
export class ValidClass {}
`
      );
      // Update graph with correct path
      const validGraph = createMockGraph([
        { id: 'class-validclass', name: 'ValidClass', filePath: validPath },
      ]);

      // Create an invalid TypeScript file (should be skipped)
      fs.writeFileSync(
        path.join(tempDir, 'Invalid.ts'),
        `
/**
 * @requires InvalidDep
 */
export class Invalid {{{ // syntax error
`
      );

      const analyzer = new CoRequirementAnalyzer(validGraph);
      const result = analyzer.analyze(tempDir);

      // Should still find the valid one
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics for empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new CoRequirementAnalyzer(graph);

      const stats = analyzer.getStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.uniqueRequirers).toBe(0);
      expect(stats.uniqueRequired).toBe(0);
    });

    it('should calculate statistics correctly', () => {
      const graph = createMockGraph([]);
      const analyzer = new CoRequirementAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockCoRequirement('class-dbmanager', 'ConnectionPool'),
        createMockCoRequirement('class-dbmanager', 'Logger'),
        createMockCoRequirement('class-cachemanager', 'Logger'),
        createMockCoRequirement('class-cachemanager', 'Config'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.total).toBe(4);
      expect(stats.uniqueRequirers).toBe(2);
      expect(stats.uniqueRequired).toBe(3); // ConnectionPool, Logger, Config
    });

    it('should handle relationships with array from/to', () => {
      const graph = createMockGraph([]);
      const analyzer = new CoRequirementAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        {
          id: 'test-1',
          type: 'co-requirement',
          from: ['class-a', 'class-b'],
          to: ['dep-1', 'dep-2'],
          direction: 'unidirectional',
          strength: 'strong',
          category: 'constraint',
          evidence: [],
          discoveredBy: 'documentation',
          confidence: 1.0,
          properties: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.uniqueRequirers).toBe(2);
      expect(stats.uniqueRequired).toBe(2);
    });
  });

  // Helper to create mock co-requirement relationship
  function createMockCoRequirement(from: string, to: string): UnifiedRelationship {
    return {
      id: `co-requirement-${from}-${to}`,
      type: 'co-requirement',
      from,
      to,
      direction: 'unidirectional',
      strength: 'strong',
      category: 'constraint',
      evidence: [
        {
          type: 'documentation',
          source: `src/${from}.ts`,
          snippet: `@requires ${to}`,
          confidence: 1.0,
        },
      ],
      discoveredBy: 'documentation',
      confidence: 1.0,
      properties: {
        requirer: from,
        required: to,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
});
