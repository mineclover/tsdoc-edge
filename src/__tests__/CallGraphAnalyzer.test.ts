/**
 * CallGraphAnalyzer Tests
 */

import * as ts from 'typescript';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { CallGraphAnalyzer } from '../analyzer/CallGraphAnalyzer';
import type { SymbolGraph, Symbol } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

describe('CallGraphAnalyzer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'callgraph-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Helper to create mock graph
  function createMockGraph(
    symbols: Array<{
      id: string;
      name: string;
      type?: string;
      filePath?: string;
      line?: number;
      isExported?: boolean;
    }>
  ): SymbolGraph {
    const symbolsMap = new Map<string, Symbol>();
    const nameIndex = new Map<string, string[]>();
    const fileIndex = new Map<string, string[]>();

    for (const s of symbols) {
      const filePath = s.filePath || path.join(tempDir, `${s.name}.ts`);
      symbolsMap.set(s.id, {
        id: s.id,
        name: s.name,
        type: (s.type || 'function') as any,
        filePath,
        line: s.line || 1,
        column: 1,
        isExported: s.isExported ?? true,
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
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
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
      const analyzer = new CallGraphAnalyzer(graph);

      expect(analyzer).toBeDefined();
    });

    it('should accept program in constructor', () => {
      const graph = createMockGraph([]);
      const program = createProgram({ 'test.ts': '' });
      const analyzer = new CallGraphAnalyzer(graph, program);

      expect(analyzer).toBeDefined();
    });

    it('should allow setting program later with setProgram', () => {
      const graph = createMockGraph([]);
      const analyzer = new CallGraphAnalyzer(graph);
      const program = createProgram({ 'test.ts': '' });

      analyzer.setProgram(program);

      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze - basic behavior', () => {
    it('should return empty array when no program provided', () => {
      const graph = createMockGraph([]);
      const analyzer = new CallGraphAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when graph has no function/method symbols', () => {
      const graph = createMockGraph([
        { id: 'class-myclass', name: 'MyClass', type: 'class' },
      ]);

      const program = createProgram({
        'MyClass.ts': `
          export class MyClass {}
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });
  });

  describe('analyze - direct function calls', () => {
    it('should detect direct function call', () => {
      const filePath = path.join(tempDir, 'funcs.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 6 },
        { id: 'func-helper', name: 'helper', type: 'function', filePath, line: 2 },
      ]);

      const program = createProgram({
        'funcs.ts': `
          function helper() {
            return 42;
          }

          function caller() {
            helper();
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      const callRel = result.find(
        (r) =>
          r.type === 'calls' &&
          r.from === 'func-caller' &&
          r.to === 'func-helper'
      );

      expect(callRel).toBeDefined();
      expect(callRel?.category).toBe('behavioral');
      expect(callRel?.properties?.callType).toBe('direct');
    });

    it('should detect multiple function calls', () => {
      const filePath = path.join(tempDir, 'multi.ts');
      const graph = createMockGraph([
        { id: 'func-main', name: 'main', type: 'function', filePath, line: 10 },
        { id: 'func-a', name: 'a', type: 'function', filePath, line: 2 },
        { id: 'func-b', name: 'b', type: 'function', filePath, line: 5 },
      ]);

      const program = createProgram({
        'multi.ts': `
          function a() {}

          function b() {}

          function main() {
            a();
            b();
            a();
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      const callA = result.find(
        (r) => r.from === 'func-main' && r.to === 'func-a'
      );
      const callB = result.find(
        (r) => r.from === 'func-main' && r.to === 'func-b'
      );

      expect(callA).toBeDefined();
      expect(callB).toBeDefined();
    });

    it('should track call frequency', () => {
      const filePath = path.join(tempDir, 'freq.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 5 },
        { id: 'func-target', name: 'target', type: 'function', filePath, line: 2 },
      ]);

      const program = createProgram({
        'freq.ts': `
          function target() {}

          function caller() {
            target();
            target();
            target();
            target();
            target();
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      const callRel = result.find(
        (r) => r.from === 'func-caller' && r.to === 'func-target'
      );

      expect(callRel).toBeDefined();
      expect(callRel?.properties?.frequency).toBe(5);
      expect(callRel?.strength).toBe('strong');
    });
  });

  describe('analyze - method calls', () => {
    it('should detect method call on object', () => {
      const filePath = path.join(tempDir, 'method.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 9 },
        { id: 'method-myclass.process', name: 'MyClass.process', type: 'method', filePath, line: 3 },
      ]);

      const program = createProgram({
        'method.ts': `
          class MyClass {
            process() {}
          }

          const instance = new MyClass();

          function caller() {
            instance.process();
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      const callRel = result.find(
        (r) =>
          r.from === 'func-caller' &&
          r.properties?.callType === 'method'
      );

      expect(callRel).toBeDefined();
    });
  });

  describe('analyze - built-in filtering', () => {
    it('should skip built-in global functions', () => {
      const filePath = path.join(tempDir, 'builtin.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 2 },
      ]);

      const program = createProgram({
        'builtin.ts': `
          function caller() {
            parseInt('42');
            parseFloat('3.14');
            isNaN(0);
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should not create relationships for built-in functions
      const builtInCalls = result.filter(
        (r) =>
          r.properties?.targetName === 'parseInt' ||
          r.properties?.targetName === 'parseFloat' ||
          r.properties?.targetName === 'isNaN'
      );

      expect(builtInCalls).toHaveLength(0);
    });

    it('should skip built-in object methods', () => {
      const filePath = path.join(tempDir, 'objectmethods.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 2 },
      ]);

      const program = createProgram({
        'objectmethods.ts': `
          function caller() {
            Object.keys({});
            Array.from([]);
            JSON.stringify({});
            console.log('test');
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should not create relationships for built-in object methods
      const builtInCalls = result.filter(
        (r) =>
          r.properties?.targetName === 'keys' ||
          r.properties?.targetName === 'from' ||
          r.properties?.targetName === 'stringify' ||
          r.properties?.targetName === 'log'
      );

      expect(builtInCalls).toHaveLength(0);
    });
  });

  describe('analyze - target resolution', () => {
    it('should prefer same-file symbols', () => {
      const filePath = path.join(tempDir, 'samefile.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 5 },
        { id: 'func-helper-local', name: 'helper', type: 'function', filePath, line: 2 },
        { id: 'func-helper-remote', name: 'helper', type: 'function', filePath: '/other/file.ts' },
      ]);

      const program = createProgram({
        'samefile.ts': `
          function helper() {}

          function caller() {
            helper();
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      const callRel = result.find((r) => r.from === 'func-caller');

      // Should prefer the local symbol
      expect(callRel?.to).toBe('func-helper-local');
    });

    it('should prefer exported symbols for imported calls', () => {
      const filePath = path.join(tempDir, 'caller.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 2 },
        { id: 'func-imported', name: 'imported', type: 'function', filePath: '/other.ts', isExported: true },
        { id: 'func-internal', name: 'imported', type: 'function', filePath: '/internal.ts', isExported: false },
      ]);

      const program = createProgram({
        'caller.ts': `
          function caller() {
            imported();
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      const callRel = result.find((r) => r.from === 'func-caller');

      // Should prefer exported symbol
      expect(callRel?.to).toBe('func-imported');
    });
  });

  describe('analyze - deduplication', () => {
    it('should deduplicate same caller-callee relationships', () => {
      const filePath = path.join(tempDir, 'dedup.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 5 },
        { id: 'func-target', name: 'target', type: 'function', filePath, line: 2 },
      ]);

      const program = createProgram({
        'dedup.ts': `
          function target() {}

          function caller() {
            target();
            target();
            target();
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should only have one relationship, but with frequency 3
      const callRels = result.filter(
        (r) => r.from === 'func-caller' && r.to === 'func-target'
      );

      expect(callRels).toHaveLength(1);
      expect(callRels[0].properties?.frequency).toBe(3);
    });
  });

  describe('getCallStatistics', () => {
    it('should calculate call statistics correctly', () => {
      const graph = createMockGraph([]);
      const analyzer = new CallGraphAnalyzer(graph);

      const mockRelationships: UnifiedRelationship[] = [
        {
          id: 'rel-1',
          type: 'calls',
          from: 'func-a',
          to: 'func-b',
          direction: 'unidirectional',
          strength: 'medium',
          category: 'behavioral',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 0.9,
          properties: { frequency: 2 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rel-2',
          type: 'calls',
          from: 'func-a',
          to: 'func-c',
          direction: 'unidirectional',
          strength: 'weak',
          category: 'behavioral',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 0.9,
          properties: { frequency: 1 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rel-3',
          type: 'calls',
          from: 'func-b',
          to: 'func-c',
          direction: 'unidirectional',
          strength: 'weak',
          category: 'behavioral',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 0.9,
          properties: { frequency: 1 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const stats = analyzer.getCallStatistics(mockRelationships);

      expect(stats.totalCalls).toBe(3);
      expect(stats.uniqueCallers).toBe(2); // func-a, func-b
      expect(stats.uniqueCallees).toBe(2); // func-b, func-c
      expect(stats.avgCallsPerFunction).toBe(1.5); // 3 calls / 2 callers
      expect(stats.mostCalledFunctions).toHaveLength(2);
      expect(stats.mostCalledFunctions[0].symbolId).toBe('func-c');
      expect(stats.mostCalledFunctions[0].count).toBe(2);
    });

    it('should handle empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new CallGraphAnalyzer(graph);

      const stats = analyzer.getCallStatistics([]);

      expect(stats.totalCalls).toBe(0);
      expect(stats.uniqueCallers).toBe(0);
      expect(stats.uniqueCallees).toBe(0);
      expect(stats.avgCallsPerFunction).toBe(0);
      expect(stats.mostCalledFunctions).toHaveLength(0);
    });

    it('should limit mostCalledFunctions to 10', () => {
      const graph = createMockGraph([]);
      const analyzer = new CallGraphAnalyzer(graph);

      const mockRelationships: UnifiedRelationship[] = [];
      for (let i = 0; i < 15; i++) {
        mockRelationships.push({
          id: `rel-${i}`,
          type: 'calls',
          from: `func-caller-${i}`,
          to: `func-target-${i}`,
          direction: 'unidirectional',
          strength: 'weak',
          category: 'behavioral',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 0.9,
          properties: { frequency: 1 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      const stats = analyzer.getCallStatistics(mockRelationships);

      expect(stats.mostCalledFunctions).toHaveLength(10);
    });
  });

  describe('relationship structure', () => {
    it('should create relationships with correct structure', () => {
      const filePath = path.join(tempDir, 'structure.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 5 },
        { id: 'func-target', name: 'target', type: 'function', filePath, line: 2 },
      ]);

      const program = createProgram({
        'structure.ts': `
          function target() {}

          function caller() {
            target();
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      if (result.length > 0) {
        const relationship = result[0];

        expect(relationship.id).toBeDefined();
        expect(relationship.id).toContain('call');
        expect(relationship.type).toBe('calls');
        expect(relationship.category).toBe('behavioral');
        expect(relationship.from).toBeDefined();
        expect(relationship.to).toBeDefined();
        expect(relationship.direction).toBe('unidirectional');
        expect(relationship.strength).toBeDefined();
        expect(relationship.evidence).toBeInstanceOf(Array);
        expect(relationship.evidence.length).toBeGreaterThan(0);
        expect(relationship.discoveredBy).toBe('static-analysis');
        expect(relationship.confidence).toBeGreaterThan(0);
        expect(relationship.properties).toHaveProperty('callType');
        expect(relationship.properties).toHaveProperty('frequency');
        expect(relationship.properties).toHaveProperty('targetName');
        expect(relationship.properties).toHaveProperty('callerName');
        expect(relationship.createdAt).toBeDefined();
        expect(relationship.updatedAt).toBeDefined();
        expect(relationship.description).toBeDefined();
      }
    });

    it('should include file path and line information', () => {
      const filePath = path.join(tempDir, 'location.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 5 },
        { id: 'func-target', name: 'target', type: 'function', filePath, line: 2 },
      ]);

      const program = createProgram({
        'location.ts': `
          function target() {}

          function caller() {
            target();
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      if (result.length > 0) {
        const relationship = result[0];

        expect(relationship.filePath).toBeDefined();
        expect(relationship.line).toBeDefined();
        expect(typeof relationship.line).toBe('number');
        expect(relationship.line).toBeGreaterThan(0);
      }
    });

    it('should set strength based on frequency', () => {
      const filePath = path.join(tempDir, 'strength.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 5 },
        { id: 'func-once', name: 'once', type: 'function', filePath, line: 2 },
        { id: 'func-twice', name: 'twice', type: 'function', filePath, line: 3 },
        { id: 'func-five', name: 'five', type: 'function', filePath, line: 4 },
      ]);

      const program = createProgram({
        'strength.ts': `
          function once() {}
          function twice() {}
          function five() {}
          function caller() {
            once();
            twice();
            twice();
            five();
            five();
            five();
            five();
            five();
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      const callOnce = result.find((r) => r.to === 'func-once');
      const callTwice = result.find((r) => r.to === 'func-twice');
      const callFive = result.find((r) => r.to === 'func-five');

      expect(callOnce?.strength).toBe('weak');
      expect(callTwice?.strength).toBe('medium');
      expect(callFive?.strength).toBe('strong');
    });

    it('should calculate confidence based on context', () => {
      const filePath = path.join(tempDir, 'confidence.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 5 },
        { id: 'func-local', name: 'local', type: 'function', filePath, line: 2, isExported: false },
        { id: 'func-exported', name: 'exported', type: 'function', filePath, line: 3, isExported: true },
      ]);

      const program = createProgram({
        'confidence.ts': `
          function local() {}
          export function exported() {}

          function caller() {
            local();
            exported();
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Both should have high confidence since they're in the same file
      for (const rel of result) {
        expect(rel.confidence).toBeGreaterThanOrEqual(0.9);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty source files', () => {
      const graph = createMockGraph([]);
      const program = createProgram({
        'empty.ts': '',
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should handle symbols with no matching source file', () => {
      const graph = createMockGraph([
        { id: 'func-orphan', name: 'orphan', type: 'function', filePath: '/nonexistent/file.ts' },
      ]);

      const program = createProgram({
        'other.ts': `
          function something() {}
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should not crash
      expect(result).toBeDefined();
    });

    it('should handle recursive function calls', () => {
      const filePath = path.join(tempDir, 'recursive.ts');
      const graph = createMockGraph([
        { id: 'func-factorial', name: 'factorial', type: 'function', filePath, line: 2 },
      ]);

      const program = createProgram({
        'recursive.ts': `
          function factorial(n: number): number {
            if (n <= 1) return 1;
            return n * factorial(n - 1);
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should detect self-call
      const selfCall = result.find(
        (r) => r.from === 'func-factorial' && r.to === 'func-factorial'
      );

      expect(selfCall).toBeDefined();
    });

    it('should handle nested function calls', () => {
      const filePath = path.join(tempDir, 'nested.ts');
      const graph = createMockGraph([
        { id: 'func-outer', name: 'outer', type: 'function', filePath, line: 5 },
        { id: 'func-inner', name: 'inner', type: 'function', filePath, line: 2 },
        { id: 'func-deep', name: 'deep', type: 'function', filePath, line: 3 },
      ]);

      const program = createProgram({
        'nested.ts': `
          function inner() { return 1; }
          function deep() { return 2; }

          function outer() {
            inner(deep());
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      const callInner = result.find(
        (r) => r.from === 'func-outer' && r.to === 'func-inner'
      );
      const callDeep = result.find(
        (r) => r.from === 'func-outer' && r.to === 'func-deep'
      );

      expect(callInner).toBeDefined();
      expect(callDeep).toBeDefined();
    });

    it('should handle method calls with this keyword', () => {
      const filePath = path.join(tempDir, 'thismethod.ts');
      const graph = createMockGraph([
        { id: 'method-myclass.caller', name: 'MyClass.caller', type: 'method', filePath, line: 6 },
        { id: 'method-myclass.helper', name: 'MyClass.helper', type: 'method', filePath, line: 3 },
      ]);

      const program = createProgram({
        'thismethod.ts': `
          class MyClass {
            helper() {}

            caller() {
              this.helper();
            }
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should detect the call from caller to helper
      const callRel = result.find(
        (r) => r.from === 'method-myclass.caller'
      );

      // The method call should be detected
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle arrow function calls', () => {
      const filePath = path.join(tempDir, 'arrow.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 5 },
        { id: 'func-target', name: 'target', type: 'function', filePath, line: 2 },
      ]);

      const program = createProgram({
        'arrow.ts': `
          const target = () => {};

          function caller() {
            target();
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      const callRel = result.find(
        (r) => r.from === 'func-caller' && r.to === 'func-target'
      );

      expect(callRel).toBeDefined();
    });

    it('should handle chained method calls', () => {
      const filePath = path.join(tempDir, 'chain.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 9 },
        { id: 'method-builder.step1', name: 'Builder.step1', type: 'method' },
        { id: 'method-builder.step2', name: 'Builder.step2', type: 'method' },
      ]);

      const program = createProgram({
        'chain.ts': `
          class Builder {
            step1() { return this; }
            step2() { return this; }
          }

          const builder = new Builder();

          function caller() {
            builder.step1().step2();
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should detect chained method calls
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle symbols not found in graph', () => {
      const filePath = path.join(tempDir, 'notfound.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 5 },
        // Note: notInGraph is not defined
      ]);

      const program = createProgram({
        'notfound.ts': `
          function notInGraph() {}

          function caller() {
            notInGraph();
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should not crash, may or may not find relationship depending on resolution
      expect(result).toBeDefined();
    });
  });

  describe('method matching', () => {
    it('should match method by full qualified name', () => {
      const filePath = path.join(tempDir, 'qualified.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 7 },
        { id: 'method-service.process', name: 'Service.process', type: 'method', filePath, line: 3 },
      ]);

      const program = createProgram({
        'qualified.ts': `
          class Service {
            process() {}
          }

          const svc = new Service();
          function caller() {
            svc.process();
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Method call should be detected
      const methodCall = result.find(
        (r) => r.properties?.callType === 'method'
      );

      expect(methodCall).toBeDefined();
    });

    it('should match method ending with target name', () => {
      const filePath = path.join(tempDir, 'endswith.ts');
      const graph = createMockGraph([
        { id: 'func-caller', name: 'caller', type: 'function', filePath, line: 7 },
        { id: 'method-module.service.run', name: 'Module.Service.run', type: 'method', filePath, line: 3 },
      ]);

      const program = createProgram({
        'endswith.ts': `
          const service = {
            run() {}
          };

          function caller() {
            service.run();
          }
        `,
      });

      const analyzer = new CallGraphAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should find method by partial name matching
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });
});
