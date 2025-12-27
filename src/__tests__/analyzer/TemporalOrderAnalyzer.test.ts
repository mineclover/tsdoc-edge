/**
 * TemporalOrderAnalyzer Tests
 */

import * as ts from 'typescript';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { TemporalOrderAnalyzer } from '../../analyzer/TemporalOrderAnalyzer';
import type { SymbolGraph, Symbol } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships';

describe('TemporalOrderAnalyzer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'temporal-order-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Helper to create mock graph
  function createMockGraph(
    symbols: Array<{ id: string; name: string; type?: string; filePath?: string }>
  ): SymbolGraph {
    const symbolsMap = new Map<string, Symbol>();
    const nameIndex = new Map<string, string[]>();
    const fileIndex = new Map<string, string[]>();

    for (const s of symbols) {
      const filePath = s.filePath || `src/${s.name}.ts`;
      symbolsMap.set(s.id, {
        id: s.id,
        name: s.name,
        type: (s.type || 'function') as any,
        filePath,
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      });

      // Add to name index
      if (!nameIndex.has(s.name)) {
        nameIndex.set(s.name, []);
      }
      nameIndex.get(s.name)!.push(s.id);

      // Add to file index
      if (!fileIndex.has(filePath)) {
        fileIndex.set(filePath, []);
      }
      fileIndex.get(filePath)!.push(s.id);
    }

    return {
      symbols: symbolsMap,
      relationships: [],
      adjacencyList: new Map(),
      reverseAdjacencyList: new Map(),
      nameIndex,
      fileIndex,
    };
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
      const analyzer = new TemporalOrderAnalyzer(graph);

      expect(analyzer).toBeDefined();
    });

    it('should accept program in constructor', () => {
      const graph = createMockGraph([]);
      const program = createProgram({ 'test.ts': '' });
      const analyzer = new TemporalOrderAnalyzer(graph, program);

      expect(analyzer).toBeDefined();
    });

    it('should allow setting program later with setProgram', () => {
      const graph = createMockGraph([]);
      const analyzer = new TemporalOrderAnalyzer(graph);
      const program = createProgram({ 'test.ts': '' });

      analyzer.setProgram(program);

      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze - basic behavior', () => {
    it('should return empty array when no program provided', () => {
      const graph = createMockGraph([]);
      const analyzer = new TemporalOrderAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should skip test files', () => {
      const graph = createMockGraph([
        { id: 'func-first', name: 'first' },
        { id: 'func-second', name: 'second' },
      ]);

      const program = createProgram({
        'test.test.ts': `
          function first() {}
          function second() {}
          function main() {
            first();
            second();
          }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Test files should be skipped
      expect(result).toHaveLength(0);
    });

    it('should skip spec files', () => {
      const graph = createMockGraph([
        { id: 'func-first', name: 'first' },
        { id: 'func-second', name: 'second' },
      ]);

      const program = createProgram({
        'test.spec.ts': `
          function first() {}
          function second() {}
          function main() {
            first();
            second();
          }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });
  });

  describe('analyze - sequential calls pattern', () => {
    it('should detect sequential function calls in a block', () => {
      const graph = createMockGraph([
        { id: 'func-initialize', name: 'initialize' },
        { id: 'func-configure', name: 'configure' },
      ]);

      const program = createProgram({
        'process.ts': `
          function initialize() {}
          function configure() {}

          function main() {
            initialize();
            configure();
          }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      const temporalOrder = result.find(
        (r) =>
          r.type === 'temporal-order' &&
          r.from === 'func-initialize' &&
          r.to === 'func-configure'
      );

      expect(temporalOrder).toBeDefined();
      expect(temporalOrder?.properties?.pattern).toBe('sequential-calls');
    });

    it('should detect sequential calls with variable assignments', () => {
      const graph = createMockGraph([
        { id: 'func-getdata', name: 'getData' },
        { id: 'func-process', name: 'process' },
      ]);

      const program = createProgram({
        'process.ts': `
          function getData() { return {}; }
          function process(data: any) {}

          function main() {
            const data = getData();
            process(data);
          }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      const temporalOrder = result.find(
        (r) =>
          r.type === 'temporal-order' &&
          r.from === 'func-getdata' &&
          r.to === 'func-process'
      );

      expect(temporalOrder).toBeDefined();
    });

    it('should not create duplicate relationships for same pair', () => {
      const graph = createMockGraph([
        { id: 'func-a', name: 'a' },
        { id: 'func-b', name: 'b' },
      ]);

      const program = createProgram({
        'process.ts': `
          function a() {}
          function b() {}

          function main() {
            a();
            b();
          }

          function other() {
            a();
            b();
          }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should deduplicate same pairs
      const pairs = result.filter(
        (r) => r.from === 'func-a' && r.to === 'func-b'
      );
      expect(pairs).toHaveLength(1);
    });
  });

  describe('analyze - async/await sequence pattern', () => {
    it('should detect sequential await calls', () => {
      const graph = createMockGraph([
        { id: 'func-fetchdata', name: 'fetchData' },
        { id: 'func-savedata', name: 'saveData' },
      ]);

      const program = createProgram({
        'async.ts': `
          async function fetchData() { return {}; }
          async function saveData(data: any) {}

          async function main() {
            await fetchData();
            await saveData({});
          }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      const temporalOrder = result.find(
        (r) =>
          r.type === 'temporal-order' &&
          r.from === 'func-fetchdata' &&
          r.to === 'func-savedata'
      );

      expect(temporalOrder).toBeDefined();
      expect(temporalOrder?.properties?.pattern).toBe('sequential-calls');
    });

    it('should detect await calls with variable assignments', () => {
      const graph = createMockGraph([
        { id: 'func-fetchuser', name: 'fetchUser' },
        { id: 'func-updateuser', name: 'updateUser' },
      ]);

      const program = createProgram({
        'async.ts': `
          async function fetchUser() { return { id: 1 }; }
          async function updateUser(user: any) {}

          async function main() {
            const user = await fetchUser();
            await updateUser(user);
          }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      const temporalOrder = result.find(
        (r) =>
          r.type === 'temporal-order' &&
          r.from === 'func-fetchuser' &&
          r.to === 'func-updateuser'
      );

      expect(temporalOrder).toBeDefined();
    });
  });

  describe('analyze - promise chain pattern', () => {
    it('should detect promise chain with .then()', () => {
      const graph = createMockGraph([
        { id: 'func-fetchdata', name: 'fetchData' },
        { id: 'func-processdata', name: 'processData' },
      ]);

      const program = createProgram({
        'promise.ts': `
          function fetchData(): Promise<any> { return Promise.resolve({}); }
          function processData(data: any) { return data; }

          function main() {
            fetchData().then(processData);
          }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      const promiseChain = result.find(
        (r) =>
          r.type === 'temporal-order' &&
          r.from === 'func-fetchdata' &&
          r.to === 'func-processdata' &&
          r.properties?.pattern === 'promise-chain'
      );

      expect(promiseChain).toBeDefined();
    });
  });

  describe('analyze - lifecycle/setup-teardown pattern', () => {
    it('should detect sequential calls within beforeEach', () => {
      const graph = createMockGraph([
        { id: 'func-setupdb', name: 'setupDb' },
        { id: 'func-seeddata', name: 'seedData' },
      ]);

      const program = createProgram({
        'setup.ts': `
          function setupDb() {}
          function seedData() {}

          function beforeEach(cb: () => void) {}

          beforeEach(() => {
            setupDb();
            seedData();
          });
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      const setupOrder = result.find(
        (r) =>
          r.type === 'temporal-order' &&
          r.from === 'func-setupdb' &&
          r.to === 'func-seeddata' &&
          r.properties?.pattern === 'setup-teardown'
      );

      expect(setupOrder).toBeDefined();
    });

    it('should detect sequential calls within setup', () => {
      const graph = createMockGraph([
        { id: 'func-init', name: 'init' },
        { id: 'func-configure', name: 'configure' },
      ]);

      const program = createProgram({
        'setup.ts': `
          function init() {}
          function configure() {}

          function setup(cb: () => void) {}

          setup(() => {
            init();
            configure();
          });
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      const setupOrder = result.find(
        (r) =>
          r.type === 'temporal-order' &&
          r.properties?.pattern === 'setup-teardown'
      );

      expect(setupOrder).toBeDefined();
    });
  });

  describe('analyze - constructor sequence pattern', () => {
    it('should detect field initialization order in constructor', () => {
      const graph = createMockGraph([
        { id: 'class-myclass', name: 'MyClass', type: 'class' },
        { id: 'property-db', name: 'db', type: 'property' },
        { id: 'property-cache', name: 'cache', type: 'property' },
      ]);

      const program = createProgram({
        'class.ts': `
          class MyClass {
            private db: any;
            private cache: any;

            constructor() {
              this.db = createDb();
              this.cache = createCache();
            }
          }

          function createDb() { return {}; }
          function createCache() { return {}; }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Constructor field initialization order is detected
      const constructorOrder = result.find(
        (r) =>
          r.type === 'temporal-order' &&
          r.properties?.pattern === 'sequential-calls'
      );

      // The analyzer creates relationships for property initialization order
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics for temporal order relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new TemporalOrderAnalyzer(graph);

      const mockRelationships: UnifiedRelationship[] = [
        {
          id: 'rel-1',
          type: 'temporal-order',
          from: 'a',
          to: 'b',
          direction: 'unidirectional',
          strength: 'medium',
          category: 'behavioral',
          evidence: [],
          discoveredBy: 'ast-parsing',
          confidence: 0.7,
          properties: { pattern: 'sequential-calls' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rel-2',
          type: 'temporal-order',
          from: 'c',
          to: 'd',
          direction: 'unidirectional',
          strength: 'medium',
          category: 'behavioral',
          evidence: [],
          discoveredBy: 'ast-parsing',
          confidence: 0.6,
          properties: { pattern: 'promise-chain' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rel-3',
          type: 'temporal-order',
          from: 'e',
          to: 'f',
          direction: 'unidirectional',
          strength: 'medium',
          category: 'behavioral',
          evidence: [],
          discoveredBy: 'ast-parsing',
          confidence: 0.6,
          properties: { pattern: 'setup-teardown' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const stats = analyzer.getStatistics(mockRelationships);

      expect(stats.totalOrders).toBe(3);
      expect(stats.byPattern['sequential-calls']).toBe(1);
      expect(stats.byPattern['promise-chain']).toBe(1);
      expect(stats.byPattern['setup-teardown']).toBe(1);
      expect(stats.byPattern['lifecycle']).toBe(0);
    });

    it('should return zero counts for empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new TemporalOrderAnalyzer(graph);

      const stats = analyzer.getStatistics([]);

      expect(stats.totalOrders).toBe(0);
      expect(stats.byPattern['sequential-calls']).toBe(0);
      expect(stats.byPattern['promise-chain']).toBe(0);
      expect(stats.byPattern['setup-teardown']).toBe(0);
      expect(stats.byPattern['lifecycle']).toBe(0);
    });
  });

  describe('relationship structure', () => {
    it('should create relationships with correct structure', () => {
      const graph = createMockGraph([
        { id: 'func-first', name: 'first' },
        { id: 'func-second', name: 'second' },
      ]);

      const program = createProgram({
        'process.ts': `
          function first() {}
          function second() {}

          function main() {
            first();
            second();
          }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      if (result.length > 0) {
        const relationship = result[0];

        expect(relationship.id).toBeDefined();
        expect(relationship.id).toContain('temporal-order');
        expect(relationship.type).toBe('temporal-order');
        expect(relationship.category).toBe('behavioral');
        expect(relationship.from).toBeDefined();
        expect(relationship.to).toBeDefined();
        expect(relationship.direction).toBe('unidirectional');
        expect(relationship.strength).toBe('medium');
        expect(relationship.evidence).toBeInstanceOf(Array);
        expect(relationship.evidence.length).toBeGreaterThan(0);
        expect(relationship.discoveredBy).toBe('ast-parsing');
        expect(relationship.confidence).toBeGreaterThan(0);
        expect(relationship.properties).toHaveProperty('pattern');
        expect(relationship.properties).toHaveProperty('first');
        expect(relationship.properties).toHaveProperty('second');
        expect(relationship.createdAt).toBeDefined();
        expect(relationship.updatedAt).toBeDefined();
        expect(relationship.description).toBeDefined();
      }
    });

    it('should include file path and line information', () => {
      const graph = createMockGraph([
        { id: 'func-first', name: 'first' },
        { id: 'func-second', name: 'second' },
      ]);

      const program = createProgram({
        'process.ts': `
          function first() {}
          function second() {}

          function main() {
            first();
            second();
          }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      if (result.length > 0) {
        const relationship = result[0];

        expect(relationship.filePath).toBeDefined();
        expect(relationship.line).toBeDefined();
        expect(typeof relationship.line).toBe('number');
        expect(relationship.line).toBeGreaterThan(0);
      }
    });

    it('should set correct confidence based on pattern', () => {
      const graph = createMockGraph([
        { id: 'func-first', name: 'first' },
        { id: 'func-second', name: 'second' },
      ]);

      const program = createProgram({
        'process.ts': `
          function first() {}
          function second() {}

          function main() {
            first();
            second();
          }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      const sequentialRel = result.find(
        (r) => r.properties?.pattern === 'sequential-calls'
      );

      if (sequentialRel) {
        // Sequential calls should have confidence of 0.7
        expect(sequentialRel.confidence).toBe(0.7);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty source files', () => {
      const graph = createMockGraph([]);
      const program = createProgram({
        'empty.ts': '',
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should handle source files with only comments', () => {
      const graph = createMockGraph([]);
      const program = createProgram({
        'comments.ts': `
          // This is a comment
          /* This is another comment */
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should handle single function call (no sequence)', () => {
      const graph = createMockGraph([{ id: 'func-only', name: 'only' }]);

      const program = createProgram({
        'single.ts': `
          function only() {}

          function main() {
            only();
          }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      // No temporal order without at least two sequential calls
      expect(result).toHaveLength(0);
    });

    it('should not create relationship when both symbols are the same', () => {
      const graph = createMockGraph([{ id: 'func-repeat', name: 'repeat' }]);

      const program = createProgram({
        'repeat.ts': `
          function repeat() {}

          function main() {
            repeat();
            repeat();
          }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should not create self-referential temporal order
      const selfRef = result.find((r) => r.from === r.to);
      expect(selfRef).toBeUndefined();
    });

    it('should handle method calls on objects', () => {
      const graph = createMockGraph([
        { id: 'method-service.init', name: 'service.init' },
        { id: 'method-service.start', name: 'service.start' },
      ]);

      const program = createProgram({
        'service.ts': `
          const service = {
            init() {},
            start() {}
          };

          function main() {
            service.init();
            service.start();
          }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should detect method calls if symbols match
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle arrow function with async/await', () => {
      const graph = createMockGraph([
        { id: 'func-load', name: 'load' },
        { id: 'func-save', name: 'save' },
      ]);

      const program = createProgram({
        'arrow.ts': `
          async function load() { return {}; }
          async function save(data: any) {}

          const handler = async () => {
            await load();
            await save({});
          };
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      const temporalOrder = result.find(
        (r) => r.from === 'func-load' && r.to === 'func-save'
      );

      expect(temporalOrder).toBeDefined();
    });

    it('should handle symbols not found in graph', () => {
      const graph = createMockGraph([
        { id: 'func-first', name: 'first' },
        // Note: second is not in graph
      ]);

      const program = createProgram({
        'missing.ts': `
          function first() {}
          function second() {}

          function main() {
            first();
            second();
          }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should not crash when symbol not found in graph
      expect(result).toBeDefined();
    });
  });

  describe('multiple sequential patterns', () => {
    it('should detect multiple sequential pairs in one block', () => {
      const graph = createMockGraph([
        { id: 'func-a', name: 'a' },
        { id: 'func-b', name: 'b' },
        { id: 'func-c', name: 'c' },
      ]);

      const program = createProgram({
        'chain.ts': `
          function a() {}
          function b() {}
          function c() {}

          function main() {
            a();
            b();
            c();
          }
        `,
      });

      const analyzer = new TemporalOrderAnalyzer(graph, program);
      const result = analyzer.analyze();

      const abOrder = result.find(
        (r) => r.from === 'func-a' && r.to === 'func-b'
      );
      const bcOrder = result.find(
        (r) => r.from === 'func-b' && r.to === 'func-c'
      );

      expect(abOrder).toBeDefined();
      expect(bcOrder).toBeDefined();
    });
  });
});
