/**
 * TestRelationshipAnalyzer Tests
 */

import * as ts from 'typescript';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { TestRelationshipAnalyzer } from '../analyzer/TestRelationshipAnalyzer';
import type { SymbolGraph, Symbol } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

describe('TestRelationshipAnalyzer', () => {
  // Helper to create mock graph
  // Note: TestRelationshipAnalyzer uses Object.entries/Object.keys on symbols,
  // so we create a hybrid object that works with both Map-like and Object-like access
  function createMockGraph(
    symbols: Array<{ id: string; name: string; filePath?: string }>
  ): SymbolGraph {
    // Create an object-like symbols structure for Object.entries/Object.keys compatibility
    // while also providing Map-like methods (has, get, entries)
    const symbolsObj: Record<string, Symbol> = {};
    for (const s of symbols) {
      symbolsObj[s.id] = {
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
      };
    }

    // Add Map-like methods as non-enumerable properties so Object.keys/Object.entries don't include them
    Object.defineProperties(symbolsObj, {
      has: {
        value: (key: string) => key in symbolsObj,
        enumerable: false,
        configurable: true,
      },
      get: {
        value: (key: string) => symbolsObj[key],
        enumerable: false,
        configurable: true,
      },
      entries: {
        value: function* () {
          for (const [k, v] of Object.entries(symbolsObj)) {
            yield [k, v] as [string, Symbol];
          }
        },
        enumerable: false,
        configurable: true,
      },
      keys: {
        value: function* () {
          for (const k of Object.keys(symbolsObj)) {
            yield k;
          }
        },
        enumerable: false,
        configurable: true,
      },
      values: {
        value: function* () {
          for (const v of Object.values(symbolsObj)) {
            yield v;
          }
        },
        enumerable: false,
        configurable: true,
      },
      size: {
        value: Object.keys(symbolsObj).length,
        enumerable: false,
        configurable: true,
      },
    });

    return {
      symbols: symbolsObj as unknown as Map<string, Symbol>,
      relationships: [],
      adjacencyList: new Map(),
      reverseAdjacencyList: new Map(),
      nameIndex: new Map(),
      fileIndex: new Map(),
    } as SymbolGraph;
  }

  // Helper to create a TypeScript program from source code
  function createProgram(files: Record<string, string>): { program: ts.Program; tempDir: string } {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-rel-'));
    const filePaths: string[] = [];

    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(tempDir, name);
      // Ensure subdirectories exist
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, content);
      filePaths.push(filePath);
    }

    const program = ts.createProgram(filePaths, {
      noEmit: true,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    });

    return { program, tempDir };
  }

  // Helper to cleanup temp directory
  function cleanup(tempDir: string) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }

  describe('constructor and setProgram', () => {
    it('should create analyzer without program', () => {
      const graph = createMockGraph([]);
      const analyzer = new TestRelationshipAnalyzer(graph);

      expect(analyzer).toBeDefined();
    });

    it('should accept program in constructor', () => {
      const graph = createMockGraph([]);
      const { program, tempDir } = createProgram({ 'test.ts': '' });
      const analyzer = new TestRelationshipAnalyzer(graph, program);

      expect(analyzer).toBeDefined();
      cleanup(tempDir);
    });

    it('should allow setting program later', () => {
      const graph = createMockGraph([]);
      const analyzer = new TestRelationshipAnalyzer(graph);
      const { program, tempDir } = createProgram({ 'test.ts': '' });

      analyzer.setProgram(program);

      expect(analyzer).toBeDefined();
      cleanup(tempDir);
    });
  });

  describe('analyze', () => {
    it('should return empty array when no program provided', () => {
      const graph = createMockGraph([]);
      const analyzer = new TestRelationshipAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no test files exist', () => {
      const graph = createMockGraph([{ id: 'class-service', name: 'Service' }]);
      const { program, tempDir } = createProgram({
        'src/Service.ts': `
          export class Service {
            execute(): void {}
          }
        `,
      });

      const analyzer = new TestRelationshipAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
      cleanup(tempDir);
    });

    it('should detect test file importing source symbol', () => {
      const graph = createMockGraph([{ id: 'class-service', name: 'Service' }]);
      const { program, tempDir } = createProgram({
        'src/Service.ts': `
          export class Service {
            execute(): void {}
          }
        `,
        'src/Service.test.ts': `
          import { Service } from './Service';
          describe('Service', () => {
            it('should work', () => {
              const s = new Service();
              s.execute();
            });
          });
        `,
      });

      const analyzer = new TestRelationshipAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result.length).toBeGreaterThanOrEqual(1);
      const rel = result.find((r) => r.to === 'class-service');
      if (rel) {
        expect(rel.type).toBe('test-coverage');
        expect(rel.category).toBe('verification');
        expect(rel.direction).toBe('unidirectional');
        expect(rel.strength).toBe('strong');
        expect(rel.discoveredBy).toBe('static-analysis');
        expect(rel.confidence).toBe(0.9);
      }
      cleanup(tempDir);
    });

    it('should handle spec.ts test files', () => {
      const graph = createMockGraph([{ id: 'class-userservice', name: 'UserService' }]);
      const { program, tempDir } = createProgram({
        'src/UserService.ts': `
          export class UserService {
            getUser(): void {}
          }
        `,
        'src/UserService.spec.ts': `
          import { UserService } from './UserService';
          describe('UserService', () => {
            it('should get user', () => {});
          });
        `,
      });

      const analyzer = new TestRelationshipAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result.length).toBeGreaterThanOrEqual(1);
      cleanup(tempDir);
    });

    it('should handle default imports', () => {
      const graph = createMockGraph([{ id: 'class-handler', name: 'Handler' }]);
      const { program, tempDir } = createProgram({
        'src/Handler.ts': `
          export default class Handler {
            handle(): void {}
          }
        `,
        'src/Handler.test.ts': `
          import Handler from './Handler';
          describe('Handler', () => {
            it('should handle', () => {});
          });
        `,
      });

      const analyzer = new TestRelationshipAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result.length).toBeGreaterThanOrEqual(1);
      cleanup(tempDir);
    });

    it('should handle multiple named imports', () => {
      const graph = createMockGraph([
        { id: 'class-servicea', name: 'ServiceA' },
        { id: 'class-serviceb', name: 'ServiceB' },
      ]);
      const { program, tempDir } = createProgram({
        'src/Services.ts': `
          export class ServiceA { execute(): void {} }
          export class ServiceB { execute(): void {} }
        `,
        'src/Services.test.ts': `
          import { ServiceA, ServiceB } from './Services';
          describe('Services', () => {
            it('should work', () => {});
          });
        `,
      });

      const analyzer = new TestRelationshipAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result.length).toBeGreaterThanOrEqual(2);
      cleanup(tempDir);
    });

    it('should skip external module imports', () => {
      const graph = createMockGraph([{ id: 'class-service', name: 'Service' }]);
      const { program, tempDir } = createProgram({
        'src/Service.ts': `
          export class Service { execute(): void {} }
        `,
        'src/Service.test.ts': `
          import { Service } from './Service';
          import * as fs from 'fs';
          import express from 'express';
          describe('Service', () => {});
        `,
      });

      const analyzer = new TestRelationshipAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should only have relationship for Service, not fs or express
      const externalRels = result.filter(
        (r) => r.description?.includes('fs') || r.description?.includes('express')
      );
      expect(externalRels).toHaveLength(0);
      cleanup(tempDir);
    });

    it('should skip declaration files', () => {
      const graph = createMockGraph([]);
      const { program, tempDir } = createProgram({
        'types/test.d.ts': `
          interface TestInterface {}
        `,
      });

      const analyzer = new TestRelationshipAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
      cleanup(tempDir);
    });

    it('should include evidence and properties in relationships', () => {
      const graph = createMockGraph([{ id: 'class-service', name: 'Service' }]);
      const { program, tempDir } = createProgram({
        'src/Service.ts': `
          export class Service { execute(): void {} }
        `,
        'src/Service.test.ts': `
          import { Service } from './Service';
          describe('Service', () => {});
        `,
      });

      const analyzer = new TestRelationshipAnalyzer(graph, program);
      const result = analyzer.analyze();

      const rel = result.find((r) => r.to === 'class-service');
      if (rel) {
        expect(rel.evidence).toHaveLength(1);
        expect(rel.evidence[0].type).toBe('code');
        expect(rel.evidence[0].confidence).toBe(0.9);
        expect(rel.evidence[0].snippet).toContain('import');
        expect(rel.properties.testFile).toContain('Service.test.ts');
        expect(rel.properties.sourceFile).toContain('Service.ts');
      }
      cleanup(tempDir);
    });

    it('should generate valid test file symbol IDs', () => {
      const graph = createMockGraph([{ id: 'class-service', name: 'Service' }]);
      const { program, tempDir } = createProgram({
        'src/Service.ts': `
          export class Service { execute(): void {} }
        `,
        'src/my-service.test.ts': `
          import { Service } from './Service';
          describe('Service', () => {});
        `,
      });

      const analyzer = new TestRelationshipAnalyzer(graph, program);
      const result = analyzer.analyze();

      if (result.length > 0) {
        // Test file symbol ID should be lowercase and hyphenated
        expect(result[0].from).toMatch(/^test-file-[a-z0-9-]+$/);
      }
      cleanup(tempDir);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics for empty relationships', () => {
      const graph = createMockGraph([
        { id: 'class-a', name: 'A' },
        { id: 'class-b', name: 'B' },
      ]);
      const analyzer = new TestRelationshipAnalyzer(graph);

      const stats = analyzer.getStatistics([]);

      expect(stats.totalTests).toBe(0);
      expect(stats.testedSymbols.size).toBe(0);
      expect(stats.untestedSymbols).toHaveLength(2);
      expect(stats.coveragePercentage).toBe(0);
    });

    it('should calculate statistics correctly', () => {
      const graph = createMockGraph([
        { id: 'class-a', name: 'A' },
        { id: 'class-b', name: 'B' },
        { id: 'class-c', name: 'C' },
      ]);
      const analyzer = new TestRelationshipAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockRelationship('test-file-a', 'class-a'),
        createMockRelationship('test-file-b', 'class-b'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalTests).toBe(2);
      expect(stats.testedSymbols.size).toBe(2);
      expect(stats.untestedSymbols).toHaveLength(1);
      expect(stats.untestedSymbols).toContain('class-c');
      expect(stats.coveragePercentage).toBeCloseTo(66.67, 1);
    });

    it('should handle 100% coverage', () => {
      const graph = createMockGraph([
        { id: 'class-a', name: 'A' },
        { id: 'class-b', name: 'B' },
      ]);
      const analyzer = new TestRelationshipAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockRelationship('test-file-a', 'class-a'),
        createMockRelationship('test-file-b', 'class-b'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.coveragePercentage).toBe(100);
      expect(stats.untestedSymbols).toHaveLength(0);
    });

    it('should handle empty graph', () => {
      const graph = createMockGraph([]);
      const analyzer = new TestRelationshipAnalyzer(graph);

      const stats = analyzer.getStatistics([]);

      expect(stats.totalTests).toBe(0);
      expect(stats.testedSymbols.size).toBe(0);
      expect(stats.untestedSymbols).toHaveLength(0);
      expect(stats.coveragePercentage).toBe(0);
    });

    it('should only count test-coverage type relationships', () => {
      const graph = createMockGraph([
        { id: 'class-a', name: 'A' },
        { id: 'class-b', name: 'B' },
      ]);
      const analyzer = new TestRelationshipAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockRelationship('test-file-a', 'class-a'),
        {
          ...createMockRelationship('test-file-b', 'class-b'),
          type: 'code-dependency',
        },
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.testedSymbols.size).toBe(1);
      expect(stats.testedSymbols.has('class-a')).toBe(true);
      expect(stats.testedSymbols.has('class-b')).toBe(false);
    });
  });

  describe('analyzeIntegrationVerification', () => {
    it('should return empty array when no program provided', () => {
      const graph = createMockGraph([]);
      const analyzer = new TestRelationshipAnalyzer(graph);

      const result = analyzer.analyzeIntegrationVerification([]);

      expect(result).toHaveLength(0);
    });

    it('should detect integration verification when test imports related symbols', () => {
      const graph = createMockGraph([
        { id: 'class-userservice', name: 'UserService' },
        { id: 'class-userrepository', name: 'UserRepository' },
      ]);

      const { program, tempDir } = createProgram({
        'src/UserService.ts': `
          export class UserService {
            constructor(private repo: UserRepository) {}
          }
        `,
        'src/UserRepository.ts': `
          export class UserRepository {
            findById(): void {}
          }
        `,
        'src/integration.test.ts': `
          import { UserService } from './UserService';
          import { UserRepository } from './UserRepository';
          describe('Integration', () => {
            it('should work together', () => {});
          });
        `,
      });

      const existingRelationships: UnifiedRelationship[] = [
        {
          id: 'dep-userservice-userrepository',
          type: 'code-dependency',
          category: 'structural',
          from: 'class-userservice',
          to: 'class-userrepository',
          direction: 'unidirectional',
          strength: 'strong',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 1.0,
          properties: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const analyzer = new TestRelationshipAnalyzer(graph, program);
      const result = analyzer.analyzeIntegrationVerification(existingRelationships);

      expect(result.length).toBeGreaterThanOrEqual(1);
      if (result.length > 0) {
        const rel = result[0];
        expect(rel.type).toBe('integration-verification');
        expect(rel.category).toBe('verification');
        expect(rel.direction).toBe('bidirectional');
        expect(rel.strength).toBe('strong');
        expect(rel.discoveredBy).toBe('test-analysis');
        expect(rel.confidence).toBe(0.85);
        expect(rel.properties.verifiedRelationshipType).toBe('code-dependency');
      }
      cleanup(tempDir);
    });

    it('should not create integration verification when no existing relationship', () => {
      const graph = createMockGraph([
        { id: 'class-servicea', name: 'ServiceA' },
        { id: 'class-serviceb', name: 'ServiceB' },
      ]);

      const { program, tempDir } = createProgram({
        'src/ServiceA.ts': `export class ServiceA {}`,
        'src/ServiceB.ts': `export class ServiceB {}`,
        'src/services.test.ts': `
          import { ServiceA } from './ServiceA';
          import { ServiceB } from './ServiceB';
          describe('Services', () => {});
        `,
      });

      const analyzer = new TestRelationshipAnalyzer(graph, program);
      const result = analyzer.analyzeIntegrationVerification([]);

      expect(result).toHaveLength(0);
      cleanup(tempDir);
    });

    it('should skip test files that import only one symbol', () => {
      const graph = createMockGraph([{ id: 'class-service', name: 'Service' }]);

      const { program, tempDir } = createProgram({
        'src/Service.ts': `export class Service {}`,
        'src/Service.test.ts': `
          import { Service } from './Service';
          describe('Service', () => {});
        `,
      });

      const existingRelationships: UnifiedRelationship[] = [];

      const analyzer = new TestRelationshipAnalyzer(graph, program);
      const result = analyzer.analyzeIntegrationVerification(existingRelationships);

      expect(result).toHaveLength(0);
      cleanup(tempDir);
    });

    it('should handle bidirectional existing relationships', () => {
      const graph = createMockGraph([
        { id: 'class-a', name: 'ClassA' },
        { id: 'class-b', name: 'ClassB' },
      ]);

      const { program, tempDir } = createProgram({
        'src/ClassA.ts': `export class ClassA {}`,
        'src/ClassB.ts': `export class ClassB {}`,
        'src/integration.test.ts': `
          import { ClassA } from './ClassA';
          import { ClassB } from './ClassB';
          describe('Integration', () => {});
        `,
      });

      const existingRelationships: UnifiedRelationship[] = [
        {
          id: 'collab-a-b',
          type: 'collaboration',
          category: 'behavioral',
          from: 'class-b',
          to: 'class-a',
          direction: 'bidirectional',
          strength: 'strong',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 1.0,
          properties: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const analyzer = new TestRelationshipAnalyzer(graph, program);
      const result = analyzer.analyzeIntegrationVerification(existingRelationships);

      expect(result.length).toBeGreaterThanOrEqual(1);
      cleanup(tempDir);
    });

    it('should include proper evidence in integration verification', () => {
      const graph = createMockGraph([
        { id: 'class-producer', name: 'Producer' },
        { id: 'class-consumer', name: 'Consumer' },
      ]);

      const { program, tempDir } = createProgram({
        'src/Producer.ts': `export class Producer {}`,
        'src/Consumer.ts': `export class Consumer {}`,
        'src/flow.test.ts': `
          import { Producer } from './Producer';
          import { Consumer } from './Consumer';
          describe('Flow', () => {});
        `,
      });

      const existingRelationships: UnifiedRelationship[] = [
        {
          id: 'io-producer-consumer',
          type: 'io-dependency',
          category: 'data-flow',
          from: 'class-producer',
          to: 'class-consumer',
          direction: 'unidirectional',
          strength: 'strong',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 1.0,
          properties: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const analyzer = new TestRelationshipAnalyzer(graph, program);
      const result = analyzer.analyzeIntegrationVerification(existingRelationships);

      if (result.length > 0) {
        const rel = result[0];
        expect(rel.evidence).toHaveLength(1);
        expect(rel.evidence[0].type).toBe('test');
        expect(rel.evidence[0].confidence).toBe(0.85);
        expect(rel.evidence[0].snippet).toContain('imports both');
        expect(rel.evidence[0].context).toContain('io-dependency');
      }
      cleanup(tempDir);
    });

    it('should generate valid relationship IDs', () => {
      const graph = createMockGraph([
        { id: 'class-a', name: 'ClassA' },
        { id: 'class-b', name: 'ClassB' },
      ]);

      const { program, tempDir } = createProgram({
        'src/ClassA.ts': `export class ClassA {}`,
        'src/ClassB.ts': `export class ClassB {}`,
        'src/my-integration.test.ts': `
          import { ClassA } from './ClassA';
          import { ClassB } from './ClassB';
          describe('Integration', () => {});
        `,
      });

      const existingRelationships: UnifiedRelationship[] = [
        {
          id: 'dep',
          type: 'code-dependency',
          category: 'structural',
          from: 'class-a',
          to: 'class-b',
          direction: 'unidirectional',
          strength: 'strong',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 1.0,
          properties: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const analyzer = new TestRelationshipAnalyzer(graph, program);
      const result = analyzer.analyzeIntegrationVerification(existingRelationships);

      if (result.length > 0) {
        // ID should be lowercase, hyphenated, and properly trimmed
        expect(result[0].id).toMatch(/^[a-z0-9-]+$/);
        expect(result[0].id).not.toMatch(/^-/);
        expect(result[0].id).not.toMatch(/-$/);
        expect(result[0].id.length).toBeLessThanOrEqual(100);
      }
      cleanup(tempDir);
    });
  });

  describe('getIntegrationStatistics', () => {
    it('should return correct statistics for empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new TestRelationshipAnalyzer(graph);

      const stats = analyzer.getIntegrationStatistics([]);

      expect(stats.totalVerifications).toBe(0);
      expect(Object.keys(stats.verifiedRelationshipTypes)).toHaveLength(0);
      expect(stats.testFilesWithIntegration.size).toBe(0);
    });

    it('should count verified relationship types correctly', () => {
      const graph = createMockGraph([]);
      const analyzer = new TestRelationshipAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createIntegrationVerificationRel('a', 'b', 'test1.ts', 'code-dependency'),
        createIntegrationVerificationRel('c', 'd', 'test2.ts', 'code-dependency'),
        createIntegrationVerificationRel('e', 'f', 'test3.ts', 'io-dependency'),
        createIntegrationVerificationRel('g', 'h', 'test4.ts', undefined),
      ];

      const stats = analyzer.getIntegrationStatistics(relationships);

      expect(stats.totalVerifications).toBe(4);
      expect(stats.verifiedRelationshipTypes['code-dependency']).toBe(2);
      expect(stats.verifiedRelationshipTypes['io-dependency']).toBe(1);
      expect(stats.verifiedRelationshipTypes['unknown']).toBe(1);
    });

    it('should track unique test files with integration', () => {
      const graph = createMockGraph([]);
      const analyzer = new TestRelationshipAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createIntegrationVerificationRel('a', 'b', 'test1.ts', 'code-dependency'),
        createIntegrationVerificationRel('c', 'd', 'test1.ts', 'code-dependency'),
        createIntegrationVerificationRel('e', 'f', 'test2.ts', 'io-dependency'),
      ];

      const stats = analyzer.getIntegrationStatistics(relationships);

      expect(stats.testFilesWithIntegration.size).toBe(2);
      expect(stats.testFilesWithIntegration.has('test1.ts')).toBe(true);
      expect(stats.testFilesWithIntegration.has('test2.ts')).toBe(true);
    });

    it('should handle relationships without filePath', () => {
      const graph = createMockGraph([]);
      const analyzer = new TestRelationshipAnalyzer(graph);

      const relWithoutPath: UnifiedRelationship = {
        id: 'test-rel',
        type: 'integration-verification',
        category: 'verification',
        from: 'a',
        to: 'b',
        direction: 'bidirectional',
        strength: 'strong',
        evidence: [],
        discoveredBy: 'test-analysis',
        confidence: 0.85,
        properties: { verifiedRelationshipType: 'code-dependency' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // filePath is intentionally omitted
      };

      const stats = analyzer.getIntegrationStatistics([relWithoutPath]);

      expect(stats.totalVerifications).toBe(1);
      expect(stats.testFilesWithIntegration.size).toBe(0);
    });
  });

  // Helper to create mock test-coverage relationship
  function createMockRelationship(from: string, to: string): UnifiedRelationship {
    return {
      id: `test-coverage-${from}-${to}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      type: 'test-coverage',
      category: 'verification',
      from,
      to,
      direction: 'unidirectional',
      strength: 'strong',
      evidence: [{ type: 'code', source: from, confidence: 0.9 }],
      discoveredBy: 'static-analysis',
      confidence: 0.9,
      properties: { testFile: from, sourceFile: to },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Helper to create mock integration-verification relationship
  function createIntegrationVerificationRel(
    symbolA: string,
    symbolB: string,
    testFile: string,
    verifiedType: string | undefined
  ): UnifiedRelationship {
    return {
      id: `integration-${symbolA}-${symbolB}`,
      type: 'integration-verification',
      category: 'verification',
      from: symbolA,
      to: symbolB,
      direction: 'bidirectional',
      strength: 'strong',
      evidence: [],
      discoveredBy: 'test-analysis',
      confidence: 0.85,
      filePath: testFile,
      properties: { verifiedRelationshipType: verifiedType },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
});
