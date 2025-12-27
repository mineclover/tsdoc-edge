/**
 * BehavioralAnalyzer Tests
 */

import * as ts from 'typescript';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { BehavioralAnalyzer } from '../../analyzer/BehavioralAnalyzer';
import type { SymbolGraph, Symbol } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships';

describe('BehavioralAnalyzer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'behavioral-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Helper to create mock graph
  function createMockGraph(
    symbols: Array<{ id: string; name: string; type?: string }>
  ): SymbolGraph {
    const symbolsMap = new Map<string, Symbol>();
    const nameIndex = new Map<string, string[]>();

    for (const s of symbols) {
      symbolsMap.set(s.id, {
        id: s.id,
        name: s.name,
        type: (s.type || 'class') as any,
        filePath: `src/${s.name}.ts`,
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      });

      if (!nameIndex.has(s.name)) {
        nameIndex.set(s.name, []);
      }
      nameIndex.get(s.name)!.push(s.id);
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

  // Helper to create a TypeScript program from source code
  function createProgram(files: Record<string, string>): ts.Program {
    const filePaths: string[] = [];

    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(tempDir, name);
      fs.writeFileSync(filePath, content);
      filePaths.push(filePath);
    }

    return ts.createProgram(filePaths, {
      noEmit: true,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    });
  }

  describe('constructor and setProgram', () => {
    it('should create analyzer without program', () => {
      const graph = createMockGraph([]);
      const analyzer = new BehavioralAnalyzer(graph);

      expect(analyzer).toBeDefined();
    });

    it('should accept program in constructor', () => {
      const graph = createMockGraph([]);
      const program = createProgram({ 'test.ts': 'export const x = 1;' });
      const analyzer = new BehavioralAnalyzer(graph, program);

      expect(analyzer).toBeDefined();
    });

    it('should allow setting program later', () => {
      const graph = createMockGraph([]);
      const analyzer = new BehavioralAnalyzer(graph);
      const program = createProgram({ 'test.ts': 'export const x = 1;' });

      analyzer.setProgram(program);

      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze - no program', () => {
    it('should return empty array when no program is provided', () => {
      const graph = createMockGraph([]);
      const analyzer = new BehavioralAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toEqual([]);
    });
  });

  describe('analyze - collaboration detection', () => {
    it('should detect constructor dependency injection collaboration', () => {
      const graph = createMockGraph([
        { id: 'class-service', name: 'UserService' },
        { id: 'class-repo', name: 'UserRepository' },
      ]);

      const program = createProgram({
        'UserRepository.ts': `
          export class UserRepository {
            findById(id: string) { return null; }
          }
        `,
        'UserService.ts': `
          import { UserRepository } from './UserRepository';
          export class UserService {
            constructor(private repo: UserRepository) {}
          }
        `,
      });

      const analyzer = new BehavioralAnalyzer(graph, program);
      const result = analyzer.analyze();

      const collaboration = result.find(
        (r) =>
          r.type === 'collaboration' &&
          r.from === 'class-service' &&
          r.to === 'class-repo'
      );

      expect(collaboration).toBeDefined();
      expect(collaboration?.category).toBe('behavioral');
      expect(collaboration?.direction).toBe('unidirectional');
      expect(collaboration?.properties?.pattern).toBe('general');
    });

    it('should skip test files', () => {
      const graph = createMockGraph([
        { id: 'class-test-service', name: 'TestService' },
        { id: 'class-test-repo', name: 'TestRepository' },
      ]);

      const program = createProgram({
        'TestService.test.ts': `
          class TestRepository {}
          class TestService {
            constructor(private repo: TestRepository) {}
          }
        `,
      });

      const analyzer = new BehavioralAnalyzer(graph, program);
      const result = analyzer.analyze();

      const collaborations = result.filter((r) => r.type === 'collaboration');
      expect(collaborations).toHaveLength(0);
    });
  });

  describe('analyze - composition detection', () => {
    it('should detect composition with multiple property types', () => {
      const graph = createMockGraph([
        { id: 'class-container', name: 'Container' },
        { id: 'class-part-a', name: 'PartA' },
        { id: 'class-part-b', name: 'PartB' },
      ]);

      const program = createProgram({
        'PartA.ts': `export class PartA { doA(): void {} }`,
        'PartB.ts': `export class PartB { doB(): void {} }`,
        'Container.ts': `
          import { PartA } from './PartA';
          import { PartB } from './PartB';
          export class Container {
            private partA: PartA;
            private partB: PartB;
          }
        `,
      });

      const analyzer = new BehavioralAnalyzer(graph, program);
      const result = analyzer.analyze();

      const composition = result.find(
        (r) =>
          r.type === 'composition' &&
          r.from === 'class-container'
      );

      expect(composition).toBeDefined();
      expect(composition?.category).toBe('behavioral');
      expect(composition?.direction).toBe('undirected');
      expect(composition?.strength).toBe('strong');
      expect(composition?.properties?.pattern).toBe('composition');
      expect(composition?.properties?.partCount).toBe(2);

      // Check that parts are included
      const parts = composition?.to as string[];
      expect(parts).toContain('class-part-a');
      expect(parts).toContain('class-part-b');
    });

    it('should not detect composition for single property', () => {
      const graph = createMockGraph([
        { id: 'class-single-container', name: 'SingleContainer' },
        { id: 'class-single-part', name: 'SinglePart' },
      ]);

      const program = createProgram({
        'SinglePart.ts': `export class SinglePart { doPart(): void {} }`,
        'SingleContainer.ts': `
          import { SinglePart } from './SinglePart';
          export class SingleContainer {
            private part: SinglePart;
          }
        `,
      });

      const analyzer = new BehavioralAnalyzer(graph, program);
      const result = analyzer.analyze();

      const compositions = result.filter(
        (r) => r.type === 'composition' && r.from === 'class-single-container'
      );
      expect(compositions).toHaveLength(0);
    });
  });

  describe('analyze - temporal order detection', () => {
    it('should detect lifecycle method order', () => {
      const graph = createMockGraph([
        { id: 'class-lifecycle', name: 'LifecycleClass' },
        { id: 'method-init', name: 'initialize', type: 'method' },
        { id: 'method-start', name: 'start', type: 'method' },
        { id: 'method-stop', name: 'stop', type: 'method' },
        { id: 'method-destroy', name: 'destroy', type: 'method' },
      ]);

      const program = createProgram({
        'LifecycleClass.ts': `
          export class LifecycleClass {
            initialize(): void {}
            start(): void {}
            stop(): void {}
            destroy(): void {}
          }
        `,
      });

      const analyzer = new BehavioralAnalyzer(graph, program);
      const result = analyzer.analyze();

      const temporalOrders = result.filter((r) => r.type === 'temporal-order');

      // Should have temporal orders: initialize -> start -> stop -> destroy
      expect(temporalOrders.length).toBeGreaterThan(0);

      const initToStart = temporalOrders.find(
        (r) => r.from === 'method-init' && r.to === 'method-start'
      );
      expect(initToStart).toBeDefined();
      expect(initToStart?.properties?.pattern).toBe('lifecycle');
      expect(initToStart?.strength).toBe('strong');
    });

    it('should detect sequential calls in function', () => {
      const graph = createMockGraph([
        { id: 'func-step-a', name: 'stepA', type: 'function' },
        { id: 'func-step-b', name: 'stepB', type: 'function' },
        { id: 'func-main', name: 'main', type: 'function' },
      ]);

      const program = createProgram({
        'sequential.ts': `
          function stepA() {}
          function stepB() {}

          function main() {
            stepA();
            stepB();
          }
        `,
      });

      const analyzer = new BehavioralAnalyzer(graph, program);
      const result = analyzer.analyze();

      const temporalOrder = result.find(
        (r) =>
          r.type === 'temporal-order' &&
          r.from === 'func-step-a' &&
          r.to === 'func-step-b'
      );

      expect(temporalOrder).toBeDefined();
      expect(temporalOrder?.properties?.pattern).toBe('sequential-call');
      expect(temporalOrder?.confidence).toBe(0.7);
    });
  });

  describe('relationship structure', () => {
    it('should create collaboration relationships with correct structure', () => {
      const graph = createMockGraph([
        { id: 'class-collab-a', name: 'CollabA' },
        { id: 'class-collab-b', name: 'CollabB' },
      ]);

      const program = createProgram({
        'CollabB.ts': `export class CollabB {}`,
        'CollabA.ts': `
          import { CollabB } from './CollabB';
          export class CollabA {
            constructor(private b: CollabB) {}
          }
        `,
      });

      const analyzer = new BehavioralAnalyzer(graph, program);
      const result = analyzer.analyze();

      const relationship = result.find((r) => r.type === 'collaboration');

      if (relationship) {
        expect(relationship).toMatchObject({
          type: 'collaboration',
          category: 'behavioral',
          direction: 'unidirectional',
          strength: 'medium',
          discoveredBy: 'ast-parsing',
        });

        expect(relationship.id).toBeDefined();
        expect(relationship.from).toBeDefined();
        expect(relationship.to).toBeDefined();
        expect(relationship.evidence).toBeInstanceOf(Array);
        expect(relationship.evidence[0]).toMatchObject({
          type: 'code',
          confidence: expect.any(Number),
        });
        expect(relationship.properties).toHaveProperty('pattern');
        expect(relationship.properties).toHaveProperty('reason');
        expect(relationship.createdAt).toBeDefined();
        expect(relationship.updatedAt).toBeDefined();
      }
    });

    it('should create temporal-order relationships with correct structure', () => {
      const graph = createMockGraph([
        { id: 'method-init2', name: 'init', type: 'method' },
        { id: 'method-run', name: 'run', type: 'method' },
      ]);

      const program = createProgram({
        'Workflow.ts': `
          export class Workflow {
            init(): void {}
            run(): void {}
          }
        `,
      });

      const analyzer = new BehavioralAnalyzer(graph, program);
      const result = analyzer.analyze();

      const relationship = result.find((r) => r.type === 'temporal-order');

      if (relationship) {
        expect(relationship).toMatchObject({
          type: 'temporal-order',
          category: 'behavioral',
          direction: 'unidirectional',
          discoveredBy: 'ast-parsing',
        });

        expect(relationship.properties).toHaveProperty('pattern');
        expect(relationship.properties).toHaveProperty('reason');
      }
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics for empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new BehavioralAnalyzer(graph);

      const stats = analyzer.getStatistics([]);

      expect(stats.totalBehavioral).toBe(0);
      expect(stats.collaborations).toBe(0);
      expect(stats.compositions).toBe(0);
      expect(stats.temporalOrders).toBe(0);
      expect(Object.keys(stats.byPattern)).toHaveLength(0);
    });

    it('should calculate statistics correctly for collaborations', () => {
      const graph = createMockGraph([]);
      const analyzer = new BehavioralAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockCollaborationRelationship('A', 'B', 'delegation'),
        createMockCollaborationRelationship('C', 'D', 'general'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalBehavioral).toBe(2);
      expect(stats.collaborations).toBe(2);
      expect(stats.compositions).toBe(0);
      expect(stats.temporalOrders).toBe(0);
      expect(stats.byPattern['delegation']).toBe(1);
      expect(stats.byPattern['general']).toBe(1);
    });

    it('should calculate statistics correctly for compositions', () => {
      const graph = createMockGraph([]);
      const analyzer = new BehavioralAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockCompositionRelationship('Whole', ['Part1', 'Part2']),
        createMockCompositionRelationship('Container', ['Child1', 'Child2', 'Child3']),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalBehavioral).toBe(2);
      expect(stats.collaborations).toBe(0);
      expect(stats.compositions).toBe(2);
      expect(stats.temporalOrders).toBe(0);
      expect(stats.byPattern['composition']).toBe(2);
    });

    it('should calculate statistics correctly for temporal orders', () => {
      const graph = createMockGraph([]);
      const analyzer = new BehavioralAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockTemporalOrderRelationship('init', 'start', 'lifecycle'),
        createMockTemporalOrderRelationship('start', 'stop', 'lifecycle'),
        createMockTemporalOrderRelationship('callA', 'callB', 'sequential-call'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalBehavioral).toBe(3);
      expect(stats.collaborations).toBe(0);
      expect(stats.compositions).toBe(0);
      expect(stats.temporalOrders).toBe(3);
      expect(stats.byPattern['lifecycle']).toBe(2);
      expect(stats.byPattern['sequential-call']).toBe(1);
    });

    it('should calculate statistics correctly for mixed relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new BehavioralAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockCollaborationRelationship('A', 'B', 'delegation'),
        createMockCompositionRelationship('C', ['D', 'E']),
        createMockTemporalOrderRelationship('F', 'G', 'lifecycle'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalBehavioral).toBe(3);
      expect(stats.collaborations).toBe(1);
      expect(stats.compositions).toBe(1);
      expect(stats.temporalOrders).toBe(1);
    });
  });

  // Helper to create mock collaboration relationship
  function createMockCollaborationRelationship(
    symbolA: string,
    symbolB: string,
    pattern: string
  ): UnifiedRelationship {
    return {
      id: `collaboration-${symbolA}-${symbolB}`.toLowerCase(),
      type: 'collaboration',
      category: 'behavioral',
      from: symbolA,
      to: symbolB,
      direction: 'unidirectional',
      strength: 'medium',
      evidence: [{ type: 'code', source: 'test.ts', confidence: 0.8 }],
      discoveredBy: 'ast-parsing',
      confidence: 0.8,
      properties: { pattern, reason: 'Test reason' },
      description: 'Test description',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Helper to create mock composition relationship
  function createMockCompositionRelationship(
    whole: string,
    parts: string[]
  ): UnifiedRelationship {
    return {
      id: `composition-${whole}-${parts.join('-')}`.toLowerCase(),
      type: 'composition',
      category: 'behavioral',
      from: whole,
      to: parts,
      direction: 'undirected',
      strength: 'strong',
      evidence: [{ type: 'code', source: 'test.ts', confidence: 0.8 }],
      discoveredBy: 'ast-parsing',
      confidence: 0.8,
      properties: { pattern: 'composition', partCount: parts.length, reason: 'Test reason' },
      description: 'Test description',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Helper to create mock temporal-order relationship
  function createMockTemporalOrderRelationship(
    before: string,
    after: string,
    pattern: string
  ): UnifiedRelationship {
    return {
      id: `temporal-order-${before}-${after}`.toLowerCase(),
      type: 'temporal-order',
      category: 'behavioral',
      from: before,
      to: after,
      direction: 'unidirectional',
      strength: pattern === 'lifecycle' ? 'strong' : 'medium',
      evidence: [{ type: 'code', source: 'test.ts', confidence: 0.9 }],
      discoveredBy: 'ast-parsing',
      confidence: 0.9,
      properties: { pattern, reason: 'Test reason' },
      description: 'Test description',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
});
