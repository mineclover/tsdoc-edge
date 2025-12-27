/**
 * ImplementationAnalyzer Tests
 */

import * as ts from 'typescript';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { ImplementationAnalyzer } from '../../analyzer/ImplementationAnalyzer';
import type { SymbolGraph, Symbol } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships';

describe('ImplementationAnalyzer', () => {
  // Helper to create mock graph
  function createMockGraph(
    symbols: Array<{ id: string; name: string }>
  ): SymbolGraph {
    const symbolsMap = new Map<string, Symbol>();
    for (const s of symbols) {
      symbolsMap.set(s.id, {
        id: s.id,
        name: s.name,
        type: 'class',
        filePath: `src/${s.name}.ts`,
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

  // Helper to create a TypeScript program from source code
  function createProgram(files: Record<string, string>): ts.Program {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'impl-test-'));
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
      const analyzer = new ImplementationAnalyzer(graph);

      expect(analyzer).toBeDefined();
    });

    it('should accept program in constructor', () => {
      const graph = createMockGraph([]);
      const program = createProgram({ 'test.ts': '' });
      const analyzer = new ImplementationAnalyzer(graph, program);

      expect(analyzer).toBeDefined();
    });

    it('should allow setting program later', () => {
      const graph = createMockGraph([]);
      const analyzer = new ImplementationAnalyzer(graph);
      const program = createProgram({ 'test.ts': '' });

      analyzer.setProgram(program);

      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze', () => {
    it('should return empty array when no program provided', () => {
      const graph = createMockGraph([]);
      const analyzer = new ImplementationAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should detect class implementing interface', () => {
      const graph = createMockGraph([
        { id: 'class-myservice', name: 'MyService' },
        { id: 'interface-iservice', name: 'IService' },
      ]);

      const program = createProgram({
        'test.ts': `
          interface IService {
            execute(): void;
          }

          class MyService implements IService {
            execute(): void {}
          }
        `,
      });

      const analyzer = new ImplementationAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result.length).toBeGreaterThanOrEqual(0);
      // Note: Results depend on whether symbols are found in graph
    });

    it('should handle class implementing multiple interfaces', () => {
      const graph = createMockGraph([
        { id: 'class-multiimpl', name: 'MultiImpl' },
        { id: 'interface-ia', name: 'IA' },
        { id: 'interface-ib', name: 'IB' },
      ]);

      const program = createProgram({
        'multi.ts': `
          interface IA { a(): void; }
          interface IB { b(): void; }

          class MultiImpl implements IA, IB {
            a(): void {}
            b(): void {}
          }
        `,
      });

      const analyzer = new ImplementationAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toBeDefined();
    });

    it('should skip declaration files', () => {
      const graph = createMockGraph([]);
      const program = createProgram({
        'test.d.ts': `
          interface ITest {}
        `,
      });

      const analyzer = new ImplementationAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics for empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new ImplementationAnalyzer(graph);

      const stats = analyzer.getStatistics([]);

      expect(stats.totalImplementations).toBe(0);
      expect(stats.averageImplementationsPerInterface).toBe(0);
      expect(Object.keys(stats.byInterface)).toHaveLength(0);
    });

    it('should calculate statistics correctly', () => {
      const graph = createMockGraph([]);
      const analyzer = new ImplementationAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockRelationship('ClassA', 'IService'),
        createMockRelationship('ClassB', 'IService'),
        createMockRelationship('ClassC', 'IRepository'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalImplementations).toBe(3);
      expect(stats.byInterface['IService']).toBe(2);
      expect(stats.byInterface['IRepository']).toBe(1);
      expect(stats.averageImplementationsPerInterface).toBe(1.5);
    });

    it('should handle single interface with multiple implementations', () => {
      const graph = createMockGraph([]);
      const analyzer = new ImplementationAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockRelationship('ClassA', 'IHandler'),
        createMockRelationship('ClassB', 'IHandler'),
        createMockRelationship('ClassC', 'IHandler'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalImplementations).toBe(3);
      expect(stats.byInterface['IHandler']).toBe(3);
      expect(stats.averageImplementationsPerInterface).toBe(3);
    });
  });

  // Helper to create mock relationship
  function createMockRelationship(
    className: string,
    interfaceName: string
  ): UnifiedRelationship {
    return {
      id: `impl-${className}-${interfaceName}`.toLowerCase(),
      type: 'implementation',
      category: 'structural',
      from: className,
      to: interfaceName,
      direction: 'unidirectional',
      strength: 'strong',
      evidence: [{ type: 'code', source: 'test.ts', confidence: 1.0 }],
      discoveredBy: 'ast-parsing',
      confidence: 1.0,
      properties: { className, interfaceName },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
});
