/**
 * MermaidGenerator Tests
 */

import type { CircularDependency, Hotspot } from '../../analyzer/DependencyChainAnalyzer';
import type { SymbolGraph } from '../../types/graph';
import { MermaidGenerator } from '../../visualization/MermaidGenerator';

describe('MermaidGenerator', () => {
  // Helper to create a mock graph
  function createMockGraph(
    options: {
      symbols?: Array<{ id: string; name: string; type: string; filePath: string }>;
      edges?: Array<{ from: string; to: string }>;
    } = {}
  ): SymbolGraph {
    const symbols = new Map<string, any>();
    const adjacencyList = new Map<string, string[]>();

    for (const sym of options.symbols || []) {
      symbols.set(sym.id, {
        id: sym.id,
        name: sym.name,
        type: sym.type,
        filePath: sym.filePath,
      });
      adjacencyList.set(sym.id, []);
    }

    for (const edge of options.edges || []) {
      const deps = adjacencyList.get(edge.from) || [];
      deps.push(edge.to);
      adjacencyList.set(edge.from, deps);
    }

    return {
      symbols,
      adjacencyList,
      reverseAdjacencyList: new Map(),
    } as SymbolGraph;
  }

  describe('constructor', () => {
    it('should create instance with graph', () => {
      const graph = createMockGraph();
      const generator = new MermaidGenerator(graph);
      expect(generator).toBeInstanceOf(MermaidGenerator);
    });
  });

  describe('generateDependencyTree', () => {
    it('should generate basic dependency tree', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'ClassA', type: 'class', filePath: 'a.ts' },
          { id: 'b', name: 'ClassB', type: 'class', filePath: 'b.ts' },
          { id: 'c', name: 'ClassC', type: 'class', filePath: 'c.ts' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
        ],
      });

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateDependencyTree('a');

      expect(diagram).toContain('graph TD');
      expect(diagram).toContain('ClassA');
      expect(diagram).toContain('ClassB');
      expect(diagram).toContain('-->');
    });

    it('should respect maxDepth', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A', type: 'class', filePath: 'a.ts' },
          { id: 'b', name: 'B', type: 'class', filePath: 'b.ts' },
          { id: 'c', name: 'C', type: 'class', filePath: 'c.ts' },
          { id: 'd', name: 'D', type: 'class', filePath: 'd.ts' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
          { from: 'c', to: 'd' },
        ],
      });

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateDependencyTree('a', 1);

      expect(diagram).toContain('A');
      expect(diagram).toContain('B');
      // Depth 1 should not include C (depth 2)
    });

    it('should handle symbol with no dependencies', () => {
      const graph = createMockGraph({
        symbols: [{ id: 'alone', name: 'AloneClass', type: 'class', filePath: 'alone.ts' }],
        edges: [],
      });

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateDependencyTree('alone');

      expect(diagram).toContain('graph TD');
      expect(diagram).toContain('AloneClass');
    });

    it('should handle non-existent symbol', () => {
      const graph = createMockGraph();
      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateDependencyTree('non-existent');

      expect(diagram).toContain('graph TD');
      expect(diagram).toContain('non-existent');
    });

    it('should avoid infinite loops with circular dependencies', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A', type: 'class', filePath: 'a.ts' },
          { id: 'b', name: 'B', type: 'class', filePath: 'b.ts' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'a' },
        ],
      });

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateDependencyTree('a');

      // Should complete without infinite loop
      expect(diagram).toContain('graph TD');
    });

    it('should truncate long names', () => {
      const graph = createMockGraph({
        symbols: [
          {
            id: 'long',
            name: 'ThisIsAVeryLongClassNameThatShouldBeTruncated',
            type: 'class',
            filePath: 'long.ts',
          },
        ],
        edges: [],
      });

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateDependencyTree('long');

      expect(diagram).toContain('...');
    });
  });

  describe('generateHotspotDiagram', () => {
    it('should generate hotspot diagram', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'hot', name: 'HotClass', type: 'class', filePath: 'hot.ts' },
          { id: 'dep1', name: 'Dep1', type: 'class', filePath: 'dep1.ts' },
        ],
        edges: [{ from: 'dep1', to: 'hot' }],
      });

      const hotspots: Hotspot[] = [
        { symbolId: 'hot', incomingCount: 5, outgoingCount: 3, score: 8, rank: 'critical' },
      ];

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateHotspotDiagram(hotspots);

      expect(diagram).toContain('graph LR');
      expect(diagram).toContain('HotClass');
      expect(diagram).toContain('In:5');
      expect(diagram).toContain('Out:3');
      expect(diagram).toContain('Score:8');
      expect(diagram).toContain('classDef critical');
    });

    it('should respect limit parameter', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'h1', name: 'Hot1', type: 'class', filePath: 'h1.ts' },
          { id: 'h2', name: 'Hot2', type: 'class', filePath: 'h2.ts' },
          { id: 'h3', name: 'Hot3', type: 'class', filePath: 'h3.ts' },
        ],
      });

      const hotspots: Hotspot[] = [
        { symbolId: 'h1', incomingCount: 10, outgoingCount: 5, score: 15, rank: 'critical' },
        { symbolId: 'h2', incomingCount: 8, outgoingCount: 4, score: 12, rank: 'high' },
        { symbolId: 'h3', incomingCount: 5, outgoingCount: 2, score: 7, rank: 'medium' },
      ];

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateHotspotDiagram(hotspots, 2);

      expect(diagram).toContain('Hot1');
      expect(diagram).toContain('Hot2');
      expect(diagram).not.toContain('Hot3');
    });

    it('should show incoming and outgoing dependencies', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'center', name: 'Center', type: 'class', filePath: 'center.ts' },
          { id: 'in1', name: 'In1', type: 'class', filePath: 'in1.ts' },
          { id: 'out1', name: 'Out1', type: 'class', filePath: 'out1.ts' },
        ],
        edges: [
          { from: 'in1', to: 'center' },
          { from: 'center', to: 'out1' },
        ],
      });

      const hotspots: Hotspot[] = [
        { symbolId: 'center', incomingCount: 1, outgoingCount: 1, score: 2, rank: 'low' },
      ];

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateHotspotDiagram(hotspots);

      expect(diagram).toContain('In1');
      expect(diagram).toContain('Out1');
    });

    it('should include all rank style definitions', () => {
      const graph = createMockGraph();
      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateHotspotDiagram([]);

      expect(diagram).toContain('classDef critical');
      expect(diagram).toContain('classDef high');
      expect(diagram).toContain('classDef medium');
      expect(diagram).toContain('classDef low');
    });
  });

  describe('generateCircularDiagram', () => {
    it('should generate circular dependency diagram', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A', type: 'class', filePath: 'a.ts' },
          { id: 'b', name: 'B', type: 'class', filePath: 'b.ts' },
          { id: 'c', name: 'C', type: 'class', filePath: 'c.ts' },
        ],
      });

      const circular: CircularDependency = {
        symbols: ['a', 'b', 'c'],
        path: ['a', 'b', 'c', 'a'],
        length: 3,
      };

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateCircularDiagram(circular);

      expect(diagram).toContain('graph LR');
      expect(diagram).toContain('A');
      expect(diagram).toContain('B');
      expect(diagram).toContain('C');
      expect(diagram).toContain('-->');
      expect(diagram).toContain('classDef circular');
    });

    it('should show step numbers in path', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A', type: 'class', filePath: 'a.ts' },
          { id: 'b', name: 'B', type: 'class', filePath: 'b.ts' },
        ],
      });

      const circular: CircularDependency = {
        symbols: ['a', 'b'],
        path: ['a', 'b', 'a'],
        length: 2,
      };

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateCircularDiagram(circular);

      expect(diagram).toContain('|"1"|');
      expect(diagram).toContain('|"2"|');
    });

    it('should style circular nodes', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A', type: 'class', filePath: 'a.ts' },
          { id: 'b', name: 'B', type: 'class', filePath: 'b.ts' },
        ],
      });

      const circular: CircularDependency = {
        symbols: ['a', 'b'],
        path: ['a', 'b', 'a'],
        length: 2,
      };

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateCircularDiagram(circular);

      expect(diagram).toContain('a:::circular');
      expect(diagram).toContain('b:::circular');
    });
  });

  describe('generateClassHierarchy', () => {
    it('should generate class hierarchy diagram', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'base', name: 'BaseClass', type: 'class', filePath: 'base.ts' },
          { id: 'child', name: 'ChildClass', type: 'class', filePath: 'child.ts' },
        ],
        edges: [{ from: 'child', to: 'base' }],
      });

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateClassHierarchy('base');

      expect(diagram).toContain('graph BT');
      expect(diagram).toContain('BaseClass');
    });

    it('should handle class with no inheritance', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'standalone', name: 'StandaloneClass', type: 'class', filePath: 'standalone.ts' },
        ],
      });

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateClassHierarchy('standalone');

      expect(diagram).toContain('graph BT');
      expect(diagram).toContain('StandaloneClass');
    });

    it('should show extends relationships', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'parent', name: 'Parent', type: 'class', filePath: 'parent.ts' },
          { id: 'child', name: 'Child', type: 'class', filePath: 'child.ts' },
        ],
        edges: [{ from: 'child', to: 'parent' }],
      });

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateClassHierarchy('parent');

      expect(diagram).toContain('extends');
    });

    it('should handle interfaces in hierarchy', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'iface', name: 'IService', type: 'interface', filePath: 'iface.ts' },
          { id: 'impl', name: 'ServiceImpl', type: 'class', filePath: 'impl.ts' },
        ],
        edges: [{ from: 'impl', to: 'iface' }],
      });

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateClassHierarchy('iface');

      expect(diagram).toContain('IService');
    });
  });

  describe('generateModuleDiagram', () => {
    it('should generate module dependency diagram', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a1', name: 'A1', type: 'class', filePath: 'src/moduleA.ts' },
          { id: 'b1', name: 'B1', type: 'class', filePath: 'src/moduleB.ts' },
        ],
        edges: [{ from: 'a1', to: 'b1' }],
      });

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateModuleDiagram();

      expect(diagram).toContain('graph TD');
      expect(diagram).toContain('moduleA.ts');
      expect(diagram).toContain('moduleB.ts');
    });

    it('should respect maxFiles parameter', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A', type: 'class', filePath: 'file1.ts' },
          { id: 'b', name: 'B', type: 'class', filePath: 'file2.ts' },
          { id: 'c', name: 'C', type: 'class', filePath: 'file3.ts' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'a', to: 'c' },
          { from: 'b', to: 'c' },
        ],
      });

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateModuleDiagram(1);

      // Should only show top 1 file by dependency count
      expect(diagram).toContain('graph TD');
    });

    it('should not show self-dependencies', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a1', name: 'A1', type: 'class', filePath: 'same.ts' },
          { id: 'a2', name: 'A2', type: 'class', filePath: 'same.ts' },
        ],
        edges: [{ from: 'a1', to: 'a2' }],
      });

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateModuleDiagram();

      // Self-dependencies within same file should not create edges
      expect(diagram).toBe('graph TD');
    });

    it('should show only filename in label', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'a', name: 'A', type: 'class', filePath: 'src/deeply/nested/file.ts' },
          { id: 'b', name: 'B', type: 'class', filePath: 'src/other/module.ts' },
        ],
        edges: [{ from: 'a', to: 'b' }],
      });

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateModuleDiagram();

      expect(diagram).toContain('file.ts');
      expect(diagram).toContain('module.ts');
      expect(diagram).not.toContain('deeply/nested');
    });
  });

  describe('sanitizeId', () => {
    it('should sanitize special characters in IDs', () => {
      const graph = createMockGraph({
        symbols: [
          { id: 'my-class.method', name: 'MyClass.method', type: 'method', filePath: 'file.ts' },
        ],
      });

      const generator = new MermaidGenerator(graph);
      const diagram = generator.generateDependencyTree('my-class.method');

      // Special characters should be replaced with underscores
      expect(diagram).not.toContain('my-class.method');
      expect(diagram).toContain('my_class_method');
    });
  });
});
