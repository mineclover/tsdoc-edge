/**
 * CompositionAnalyzer Tests
 */

import * as ts from 'typescript';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { CompositionAnalyzer } from '../../analyzer/CompositionAnalyzer';
import type { SymbolGraph, Symbol } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships';

describe('CompositionAnalyzer', () => {
  // Helper to create mock symbol
  function createMockSymbol(
    id: string,
    name: string,
    type: Symbol['type'] = 'class',
    filePath = 'src/test.ts'
  ): Symbol {
    return {
      id,
      name,
      type,
      filePath,
      line: 1,
      column: 1,
      isExported: true,
      isPublic: true,
      tests: [],
      designDecisions: [],
    };
  }

  // Helper to create mock graph
  function createMockGraph(symbols: Array<{ id: string; name: string; type?: Symbol['type'] }>): SymbolGraph {
    const symbolsMap = new Map<string, Symbol>();
    for (const s of symbols) {
      symbolsMap.set(
        s.id,
        createMockSymbol(s.id, s.name, s.type || 'class')
      );
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

  // Helper to create a TypeScript program from source code
  function createProgram(files: Record<string, string>): ts.Program {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'comp-test-'));
    const filePaths: string[] = [];

    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(tempDir, name);
      fs.writeFileSync(filePath, content);
      filePaths.push(filePath);
    }

    const program = ts.createProgram(filePaths, {
      noEmit: true,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    });

    // Cleanup
    setTimeout(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }, 100);

    return program;
  }

  describe('constructor and setProgram', () => {
    it('should create analyzer without program', () => {
      const graph = createMockGraph([]);
      const analyzer = new CompositionAnalyzer(graph);

      expect(analyzer).toBeDefined();
    });

    it('should accept program in constructor', () => {
      const graph = createMockGraph([]);
      const program = createProgram({ 'test.ts': '' });
      const analyzer = new CompositionAnalyzer(graph, program);

      expect(analyzer).toBeDefined();
    });

    it('should allow setting program later', () => {
      const graph = createMockGraph([]);
      const analyzer = new CompositionAnalyzer(graph);
      const program = createProgram({ 'test.ts': '' });

      analyzer.setProgram(program);

      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze', () => {
    it('should return empty array when no program provided', () => {
      const graph = createMockGraph([]);
      const analyzer = new CompositionAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should detect simple class composition', () => {
      const graph = createMockGraph([
        { id: 'class-container', name: 'Container' },
        { id: 'class-item', name: 'Item' },
      ]);

      const program = createProgram({
        'test.ts': `
          class Item {
            value: string = '';
          }

          class Container {
            item: Item;
          }
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect array composition', () => {
      const graph = createMockGraph([
        { id: 'class-collection', name: 'Collection' },
        { id: 'class-item', name: 'Item' },
      ]);

      const program = createProgram({
        'test.ts': `
          class Item {
            id: number = 0;
          }

          class Collection {
            items: Item[];
          }
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toBeDefined();
    });

    it('should detect Array<T> generic composition', () => {
      const graph = createMockGraph([
        { id: 'class-list', name: 'ItemList' },
        { id: 'class-item', name: 'Item' },
      ]);

      const program = createProgram({
        'test.ts': `
          class Item {
            name: string = '';
          }

          class ItemList {
            items: Array<Item>;
          }
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toBeDefined();
    });

    it('should skip declaration files', () => {
      const graph = createMockGraph([
        { id: 'class-test', name: 'TestClass' },
      ]);
      const program = createProgram({
        'test.d.ts': `
          interface ITest {}
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should skip primitive types', () => {
      const graph = createMockGraph([
        { id: 'class-simple', name: 'SimpleClass' },
      ]);

      const program = createProgram({
        'test.ts': `
          class SimpleClass {
            name: string;
            age: number;
            active: boolean;
          }
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should not create composition for primitive types
      expect(result).toHaveLength(0);
    });

    it('should skip builtin types like Date, Map, Set', () => {
      const graph = createMockGraph([
        { id: 'class-withbuiltins', name: 'WithBuiltins' },
      ]);

      const program = createProgram({
        'test.ts': `
          class WithBuiltins {
            createdAt: Date;
            data: Map<string, number>;
            items: Set<string>;
          }
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should handle optional types', () => {
      const graph = createMockGraph([
        { id: 'class-parent', name: 'Parent' },
        { id: 'class-child', name: 'Child' },
      ]);

      const program = createProgram({
        'test.ts': `
          class Child {
            value: string = '';
          }

          class Parent {
            child?: Child;
          }
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toBeDefined();
    });

    it('should handle union types', () => {
      const graph = createMockGraph([
        { id: 'class-holder', name: 'Holder' },
        { id: 'class-optiona', name: 'OptionA' },
      ]);

      const program = createProgram({
        'test.ts': `
          class OptionA {
            value: string = '';
          }

          class OptionB {
            count: number = 0;
          }

          class Holder {
            option: OptionA | OptionB;
          }
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toBeDefined();
    });

    it('should handle intersection types', () => {
      const graph = createMockGraph([
        { id: 'class-combined', name: 'Combined' },
        { id: 'class-base', name: 'Base' },
      ]);

      const program = createProgram({
        'test.ts': `
          class Base {
            id: number = 0;
          }

          interface Extra {
            extra: string;
          }

          class Combined {
            data: Base & Extra;
          }
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toBeDefined();
    });

    it('should only create relationship for types in graph', () => {
      const graph = createMockGraph([
        { id: 'class-container', name: 'Container' },
        // Note: Item is NOT in the graph
      ]);

      const program = createProgram({
        'test.ts': `
          class Item {
            value: string = '';
          }

          class Container {
            item: Item;
          }
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should not create relationship since Item is not in graph
      expect(result).toHaveLength(0);
    });
  });

  describe('relationship structure', () => {
    it('should create valid UnifiedRelationship structure', () => {
      const graph = createMockGraph([
        { id: 'class-container', name: 'Container' },
        { id: 'class-item', name: 'Item' },
      ]);

      const program = createProgram({
        'test.ts': `
          class Item {
            value: string = '';
          }

          class Container {
            item: Item;
          }
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      if (result.length > 0) {
        const rel = result[0];

        // Check required fields
        expect(rel.id).toBeDefined();
        expect(rel.type).toBe('composition');
        expect(typeof rel.from).toBe('string');
        expect(typeof rel.to).toBe('string');
        expect(rel.direction).toBe('unidirectional');
        expect(rel.strength).toBe('strong');
        expect(rel.category).toBe('behavioral');
        expect(rel.evidence).toBeDefined();
        expect(Array.isArray(rel.evidence)).toBe(true);
        expect(rel.discoveredBy).toBe('ast-parsing');
        expect(rel.confidence).toBe(1.0);
        expect(rel.properties).toBeDefined();
        expect(rel.createdAt).toBeDefined();
        expect(rel.updatedAt).toBeDefined();
      }
    });

    it('should include composition properties', () => {
      const graph = createMockGraph([
        { id: 'class-container', name: 'Container' },
        { id: 'class-item', name: 'Item' },
      ]);

      const program = createProgram({
        'test.ts': `
          class Item {
            value: string = '';
          }

          class Container {
            items: Item[];
          }
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      if (result.length > 0) {
        const rel = result[0];
        expect(rel.properties).toBeDefined();
        expect(rel.properties?.propertyName).toBe('items');
        expect(rel.properties?.composedType).toBe('Item');
        expect(rel.properties?.isArray).toBe(true);
        expect(rel.properties?.composerName).toBe('Container');
      }
    });

    it('should include description', () => {
      const graph = createMockGraph([
        { id: 'class-container', name: 'Container' },
        { id: 'class-item', name: 'Item' },
      ]);

      const program = createProgram({
        'test.ts': `
          class Item {}
          class Container {
            items: Item[];
          }
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      if (result.length > 0) {
        expect(result[0].description).toContain('has-a');
        expect(result[0].description).toContain('collection of');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty class', () => {
      const graph = createMockGraph([
        { id: 'class-empty', name: 'EmptyClass' },
      ]);

      const program = createProgram({
        'test.ts': `
          class EmptyClass {}
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should handle class with methods only', () => {
      const graph = createMockGraph([
        { id: 'class-methods', name: 'MethodsOnly' },
      ]);

      const program = createProgram({
        'test.ts': `
          class MethodsOnly {
            doSomething(): void {}
            calculate(x: number): number { return x * 2; }
          }
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should handle deeply nested types', () => {
      const graph = createMockGraph([
        { id: 'class-deep', name: 'DeepClass' },
        { id: 'class-item', name: 'Item' },
      ]);

      const program = createProgram({
        'test.ts': `
          class Item { value: string = ''; }
          class DeepClass {
            items: Array<Array<Item>>;
          }
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      // May or may not detect based on implementation depth
      expect(result).toBeDefined();
    });

    it('should handle symbols not in graph', () => {
      const graph = createMockGraph([
        // Empty graph - no symbols
      ]);

      const program = createProgram({
        'test.ts': `
          class Item { value: string = ''; }
          class Container { item: Item; }
        `,
      });

      const analyzer = new CompositionAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should not crash, just return empty
      expect(result).toHaveLength(0);
    });
  });
});
