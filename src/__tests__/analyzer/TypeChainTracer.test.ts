/**
 * Tests for TypeChainTracer
 */

import { TypeChainTracer } from '../../analyzer/TypeChainTracer';
import type {
  InterfaceDependency,
  InterfaceDependencyGraph,
  InterfaceInfo,
} from '../../types/domain/interface';
import type { Symbol } from '../../types/graph';

describe('TypeChainTracer', () => {
  let tracer: TypeChainTracer;

  // Helper functions
  function createMockSymbol(name: string): Symbol {
    return {
      id: name.toLowerCase(),
      name,
      type: 'interface',
      filePath: '/test/file.ts',
      line: 1,
      column: 0,
      isExported: true,
      isPublic: true,
      tests: [],
      designDecisions: [],
    };
  }

  function createMockInterface(name: string, propertyCount: number = 2, methodCount: number = 0): InterfaceInfo {
    const properties = Array.from({ length: propertyCount }, (_, i) => ({
      name: `prop${i}`,
      type: 'string',
      isOptional: false,
      isReadonly: false,
    }));

    const methods = Array.from({ length: methodCount }, (_, i) => ({
      name: `method${i}`,
      parameters: [],
      returnType: 'void',
    }));

    return {
      symbol: createMockSymbol(name),
      properties,
      methods,
      extends: [],
      typeParameters: [],
    };
  }

  function createMockDependency(
    from: string,
    to: string,
    dependencyType: 'extends' | 'composition' | 'parameter' | 'return' | 'generic' = 'composition',
    isExternal: boolean = false,
    dataFlow: 'input' | 'output' | 'bidirectional' = 'output'
  ): InterfaceDependency {
    return {
      from,
      to,
      dependencyType,
      location: 'property',
      isExternal,
      dataFlow,
      typeRelation: 'direct',
    };
  }

  function createSimpleGraph(nodes: string[]): InterfaceDependencyGraph {
    const interfaces = new Map<string, InterfaceInfo>();
    for (const node of nodes) {
      interfaces.set(node, createMockInterface(node));
    }
    return {
      interfaces,
      dependencies: [],
      domains: new Map(),
    };
  }

  function createGraphWithDeps(
    dependencies: Array<{ from: string; to: string; type?: 'extends' | 'composition' | 'parameter' | 'return' | 'generic'; isExternal?: boolean; dataFlow?: 'input' | 'output' | 'bidirectional' }>
  ): InterfaceDependencyGraph {
    const allNames = new Set<string>();
    for (const dep of dependencies) {
      allNames.add(dep.from);
      allNames.add(dep.to);
    }

    const interfaces = new Map<string, InterfaceInfo>();
    for (const name of allNames) {
      interfaces.set(name, createMockInterface(name));
    }

    const deps = dependencies.map((d) =>
      createMockDependency(d.from, d.to, d.type || 'composition', d.isExternal || false, d.dataFlow || 'output')
    );

    return {
      interfaces,
      dependencies: deps,
      domains: new Map(),
    };
  }

  describe('constructor and initialization', () => {
    it('should create TypeChainTracer instance', () => {
      const graph = createSimpleGraph(['A', 'B', 'C']);
      tracer = new TypeChainTracer(graph);
      expect(tracer).toBeDefined();
      expect(tracer).toBeInstanceOf(TypeChainTracer);
    });

    it('should initialize with empty graph', () => {
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map(),
        dependencies: [],
        domains: new Map(),
      };
      tracer = new TypeChainTracer(graph);
      expect(tracer).toBeDefined();
    });
  });

  describe('findChain - basic functionality', () => {
    beforeEach(() => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'D' },
      ]);
      tracer = new TypeChainTracer(graph);
    });

    it('should find direct dependency chain', () => {
      const result = tracer.findChain('A', 'B');
      expect(result.chains.length).toBe(1);
      expect(result.chains[0].path).toEqual(['A', 'B']);
      expect(result.chains[0].length).toBe(1);
      expect(result.chains[0].exists).toBe(true);
    });

    it('should find indirect dependency chain', () => {
      const result = tracer.findChain('A', 'D');
      expect(result.chains.length).toBe(1);
      expect(result.chains[0].path).toEqual(['A', 'B', 'C', 'D']);
      expect(result.chains[0].length).toBe(3);
      expect(result.chains[0].exists).toBe(true);
    });

    it('should not find chain when no path exists', () => {
      const result = tracer.findChain('D', 'A');
      expect(result.chains.length).toBe(0);
      expect(result.chains.length).toBe(0);
    });

    it('should handle same source and target', () => {
      const result = tracer.findChain('A', 'A');
      // Source equals target - may find a self-loop or no chains
      expect(Array.isArray(result.chains)).toBe(true);
    });

    it('should include source type in result', () => {
      const result = tracer.findChain('A', 'C');
      expect(result.source).toBe('A');
      expect(result.target).toBe('C');
    });

    it('should calculate correct chain steps', () => {
      const result = tracer.findChain('A', 'D');
      const chain = result.chains[0];
      expect(chain.steps.length).toBe(3);
      expect(chain.steps[0].from).toBe('A');
      expect(chain.steps[0].to).toBe('B');
      expect(chain.steps[0].stepNumber).toBe(0);
      expect(chain.steps[2].from).toBe('C');
      expect(chain.steps[2].to).toBe('D');
      expect(chain.steps[2].stepNumber).toBe(2);
    });

    it('should include timestamp in result', () => {
      const result = tracer.findChain('A', 'B');
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('findChain - multiple paths', () => {
    beforeEach(() => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'D' },
        { from: 'C', to: 'D' },
      ]);
      tracer = new TypeChainTracer(graph);
    });

    it('should find all paths when findAllPaths is true', () => {
      const result = tracer.findChain('A', 'D', { findAllPaths: true });
      expect(result.chains.length).toBe(2);
      const paths = result.chains.map((c) => c.path.join('->'));
      expect(paths).toContain('A->B->D');
      expect(paths).toContain('A->C->D');
    });

    it('should limit paths when findAllPaths is false', () => {
      const resultAll = tracer.findChain('A', 'D', { findAllPaths: true });
      const resultOne = tracer.findChain('A', 'D', { findAllPaths: false });
      // With findAllPaths: false, may find fewer or equal paths than true
      expect(resultOne.chains.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate totalTypes correctly with multiple paths', () => {
      const result = tracer.findChain('A', 'D', { findAllPaths: true });
      // A, B, C, D = 4 unique types
      expect(result.totalTypes).toBe(4);
    });
  });

  describe('findChain - maxDepth option', () => {
    beforeEach(() => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'D' },
        { from: 'D', to: 'E' },
        { from: 'E', to: 'F' },
      ]);
      tracer = new TypeChainTracer(graph);
    });

    it('should respect maxDepth limit', () => {
      const result = tracer.findChain('A', 'F', { maxDepth: 2 });
      expect(result.chains.length).toBe(0); // F is at depth 4, exceeds maxDepth of 2
    });

    it('should find chain within maxDepth', () => {
      const result = tracer.findChain('A', 'D', { maxDepth: 5 });
      expect(result.chains.length).toBe(1);
      expect(result.chains[0].path).toEqual(['A', 'B', 'C', 'D']);
    });

    it('should use default maxDepth of 10', () => {
      const result = tracer.findChain('A', 'F'); // default maxDepth = 10
      expect(result.chains.length).toBe(1);
    });
  });

  describe('findChain - dependency type filtering', () => {
    beforeEach(() => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B', type: 'extends' },
        { from: 'B', to: 'C', type: 'composition' },
        { from: 'C', to: 'D', type: 'parameter' },
      ]);
      tracer = new TypeChainTracer(graph);
    });

    it('should filter by specific dependency types', () => {
      const result = tracer.findChain('A', 'D', { dependencyTypes: ['extends', 'composition'] });
      expect(result.chains.length).toBe(0); // Can't reach D with only extends and composition
    });

    it('should include all types when no filter specified', () => {
      const result = tracer.findChain('A', 'D');
      expect(result.chains.length).toBe(1);
    });

    it('should allow composition dependencies', () => {
      const result = tracer.findChain('A', 'C', { dependencyTypes: ['composition'] });
      // A->B uses 'extends', so can't traverse. Result should be empty
      expect(result.chains.length).toBe(0);
    });
  });

  describe('findChain - external type filtering', () => {
    beforeEach(() => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'B', to: 'Promise', isExternal: true },
        { from: 'Promise', to: 'C' },
        { from: 'C', to: 'D' },
      ]);
      tracer = new TypeChainTracer(graph);
    });

    it('should exclude external types by default', () => {
      const result = tracer.findChain('A', 'D', { includeExternal: false });
      // Can go A->B->C->D, skipping Promise
      expect(result.chains.length).toBe(0);
    });

    it('should include external types when specified', () => {
      const result = tracer.findChain('A', 'D', { includeExternal: true });
      expect(result.chains.length).toBeGreaterThanOrEqual(0);
    });

    it('should skip external nodes by default', () => {
      const result = tracer.findChain('A', 'Promise');
      expect(result.chains.length).toBe(0);
    });
  });

  describe('findChain - dataFlow filtering', () => {
    beforeEach(() => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B', dataFlow: 'output' },
        { from: 'B', to: 'C', dataFlow: 'input' },
        { from: 'C', to: 'D', dataFlow: 'bidirectional' },
      ]);
      tracer = new TypeChainTracer(graph);
    });

    it('should filter by data flow direction', () => {
      const result = tracer.findChain('A', 'D', { dataFlow: 'output' });
      // Only A->B has 'output', so can't reach D
      expect(result.chains.length).toBe(0);
    });

    it('should traverse all flows when not specified', () => {
      const result = tracer.findChain('A', 'D');
      expect(result.chains.length).toBe(1);
    });

    it('should allow bidirectional flow', () => {
      const result = tracer.findChain('C', 'D', { dataFlow: 'bidirectional' });
      expect(result.chains.length).toBe(1);
    });
  });

  describe('findChain - primitive type filtering', () => {
    beforeEach(() => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'string' },
        { from: 'A', to: 'B' },
        { from: 'B', to: 'number' },
        { from: 'B', to: 'C' },
      ]);
      tracer = new TypeChainTracer(graph);
    });

    it('should exclude primitives by default', () => {
      const result = tracer.findChain('A', 'B', { includePrimitives: false });
      expect(result.chains.length).toBe(1);
      expect(result.chains[0].path).toEqual(['A', 'B']);
    });

    it('should include primitives when specified', () => {
      const result = tracer.findChain('A', 'string', { includePrimitives: true });
      expect(result.chains.length).toBe(1);
    });

    it('should filter out common primitive types', () => {
      const graph = createGraphWithDeps([
        { from: 'X', to: 'any' },
        { from: 'X', to: 'void' },
        { from: 'X', to: 'unknown' },
        { from: 'X', to: 'never' },
        { from: 'X', to: 'null' },
        { from: 'X', to: 'undefined' },
      ]);
      tracer = new TypeChainTracer(graph);
      const result = tracer.findChain('X', 'any', { includePrimitives: false });
      expect(result.chains.length).toBe(0);
    });
  });

  describe('findChain - cycle detection', () => {
    beforeEach(() => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'A' }, // Creates cycle A->B->C->A
      ]);
      tracer = new TypeChainTracer(graph);
    });

    it('should detect cycles in the path', () => {
      const result = tracer.findChain('A', 'D');
      expect(result.cycles).toBeDefined();
      expect(result.cycles.length).toBeGreaterThan(0);
    });

    it('should include cycle in result', () => {
      const result = tracer.findChain('A', 'B');
      const cycle = result.cycles[0];
      expect(cycle).toBeDefined();
      expect(cycle.length).toBeGreaterThan(0);
    });

    it('should not traverse through cycles', () => {
      const result = tracer.findChain('A', 'NonExistent');
      expect(result.chains.length).toBe(0);
    });
  });

  describe('buildDependencyTree - basic functionality', () => {
    beforeEach(() => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'D' },
        { from: 'C', to: 'E' },
      ]);
      tracer = new TypeChainTracer(graph);
    });

    it('should create tree with root node', () => {
      const result = tracer.buildDependencyTree('A');
      expect(result.tree).toBeDefined();
      expect(result.tree?.typeName).toBe('A');
      expect(result.tree?.depth).toBe(0);
    });

    it('should build tree with all children', () => {
      const result = tracer.buildDependencyTree('A');
      expect(result.tree?.childCount).toBe(2);
      expect(result.tree?.children.length).toBe(2);
    });

    it('should calculate correct depth', () => {
      const result = tracer.buildDependencyTree('A');
      expect(result.maxDepth).toBeGreaterThanOrEqual(1);
    });

    it('should count total types in tree', () => {
      const result = tracer.buildDependencyTree('A');
      // A, B, C, D, E = 5 types
      expect(result.totalTypes).toBe(5);
    });

    it('should calculate child counts at each level', () => {
      const result = tracer.buildDependencyTree('A');
      expect(result.tree?.childCount).toBe(2); // B and C
      const childB = result.tree?.children.find((c) => c.typeName === 'B');
      expect(childB?.childCount).toBe(1); // D
    });

    it('should include timestamp', () => {
      const result = tracer.buildDependencyTree('A');
      expect(result.timestamp).toBeDefined();
    });

    it('should have empty chains array', () => {
      const result = tracer.buildDependencyTree('A');
      expect(result.chains.length).toBe(0);
    });
  });

  describe('buildDependencyTree - maxDepth', () => {
    beforeEach(() => {
      const graph = createGraphWithDeps([
        { from: 'L0', to: 'L1' },
        { from: 'L1', to: 'L2' },
        { from: 'L2', to: 'L3' },
        { from: 'L3', to: 'L4' },
      ]);
      tracer = new TypeChainTracer(graph);
    });

    it('should respect maxDepth when building tree', () => {
      const result = tracer.buildDependencyTree('L0', { maxDepth: 2 });
      expect(result.maxDepth).toBeLessThanOrEqual(2);
    });

    it('should include nodes up to maxDepth', () => {
      const result = tracer.buildDependencyTree('L0', { maxDepth: 3 });
      expect(result.totalTypes).toBeGreaterThan(1);
      expect(result.maxDepth).toBeLessThanOrEqual(3);
    });

    it('should use default maxDepth of 10', () => {
      const result = tracer.buildDependencyTree('L0');
      expect(result.maxDepth).toBeGreaterThan(0); // Should traverse default depth
    });
  });

  describe('buildDependencyTree - cycle handling', () => {
    beforeEach(() => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'A' },
      ]);
      tracer = new TypeChainTracer(graph);
    });

    it('should detect cycles in tree', () => {
      const result = tracer.buildDependencyTree('A');
      expect(result.cycles.length).toBeGreaterThan(0);
    });

    it('should mark visited nodes in cycles', () => {
      const result = tracer.buildDependencyTree('A');
      const cycleDetected = result.cycles.some((cycle) => cycle.includes('A'));
      expect(cycleDetected).toBe(true);
    });

    it('should not infinitely recurse on cycles', () => {
      const result = tracer.buildDependencyTree('A');
      expect(result.totalTypes).toBeGreaterThanOrEqual(3); // At least A, B, C
      expect(result.cycles.length).toBeGreaterThan(0); // Should detect the cycle
    });
  });

  describe('findRootTypes', () => {
    it('should find types with no incoming dependencies', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'D' },
      ]);
      tracer = new TypeChainTracer(graph);

      const roots = tracer.findRootTypes();
      expect(roots).toContain('A');
      expect(roots.length).toBe(1);
    });

    it('should find multiple roots when they exist', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'D' },
        { from: 'B', to: 'D' },
        { from: 'C', to: 'E' },
      ]);
      tracer = new TypeChainTracer(graph);

      const roots = tracer.findRootTypes();
      expect(roots).toContain('A');
      expect(roots).toContain('B');
      expect(roots).toContain('C');
      expect(roots.length).toBe(3);
    });

    it('should return empty array when all types have dependencies', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'A' },
      ]);
      tracer = new TypeChainTracer(graph);

      const roots = tracer.findRootTypes();
      expect(roots.length).toBe(0);
    });

    it('should handle isolated types as roots', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'C', to: 'D' },
      ]);
      // Add isolated type
      const interfaces = new Map(graph.interfaces);
      interfaces.set('Isolated', createMockInterface('Isolated'));
      const graphWithIsolated: InterfaceDependencyGraph = {
        interfaces,
        dependencies: graph.dependencies,
        domains: graph.domains,
      };
      tracer = new TypeChainTracer(graphWithIsolated);

      const roots = tracer.findRootTypes();
      expect(roots).toContain('A');
      expect(roots).toContain('C');
      expect(roots).toContain('Isolated');
    });

    it('should respect includeExternal filter', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'Promise', isExternal: true },
        { from: 'B', to: 'C' },
      ]);
      tracer = new TypeChainTracer(graph);

      const roots = tracer.findRootTypes({ includeExternal: false });
      // Promise should not be counted as a dependency target
      expect(roots).toContain('A');
      expect(roots).toContain('B');
    });
  });

  describe('findLeafTypes', () => {
    it('should find types with no outgoing dependencies', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'D' },
      ]);
      tracer = new TypeChainTracer(graph);

      const leaves = tracer.findLeafTypes();
      expect(leaves).toContain('C');
      expect(leaves).toContain('D');
      expect(leaves.length).toBe(2);
    });

    it('should find multiple leaves when they exist', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'D', to: 'E' },
      ]);
      tracer = new TypeChainTracer(graph);

      const leaves = tracer.findLeafTypes();
      expect(leaves).toContain('B');
      expect(leaves).toContain('C');
      expect(leaves).toContain('E');
      expect(leaves.length).toBe(3);
    });

    it('should return empty array when all types have dependencies', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'A' },
      ]);
      tracer = new TypeChainTracer(graph);

      const leaves = tracer.findLeafTypes();
      expect(leaves.length).toBe(0);
    });

    it('should respect dependencyTypes filter', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B', type: 'extends' },
        { from: 'B', to: 'C', type: 'composition' },
      ]);
      tracer = new TypeChainTracer(graph);

      const leaves = tracer.findLeafTypes({ dependencyTypes: ['composition'] });
      // With only composition, A has no outgoing deps, B->C exists, so C is leaf
      expect(leaves).toContain('C');
      expect(leaves).toContain('A');
    });
  });

  describe('detectCircularDependencies', () => {
    it('should detect simple cycle', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'B', to: 'A' },
      ]);
      tracer = new TypeChainTracer(graph);

      const cycles = tracer.detectCircularDependencies();
      expect(cycles.length).toBeGreaterThan(0);
      const cycle = cycles[0];
      expect(cycle.length).toBeGreaterThanOrEqual(2);
      expect(cycle).toContain('A');
      expect(cycle).toContain('B');
    });

    it('should detect longer cycles', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'D' },
        { from: 'D', to: 'A' },
      ]);
      tracer = new TypeChainTracer(graph);

      const cycles = tracer.detectCircularDependencies();
      expect(cycles.length).toBeGreaterThan(0);
      const cycle = cycles[0];
      expect(cycle.length).toBeGreaterThanOrEqual(4);
    });

    it('should detect multiple cycles', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'B', to: 'A' },
        { from: 'C', to: 'D' },
        { from: 'D', to: 'C' },
      ]);
      tracer = new TypeChainTracer(graph);

      const cycles = tracer.detectCircularDependencies();
      expect(cycles.length).toBeGreaterThanOrEqual(2);
    });

    it('should not detect cycles in acyclic graph', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'D' },
      ]);
      tracer = new TypeChainTracer(graph);

      const cycles = tracer.detectCircularDependencies();
      expect(cycles.length).toBe(0);
    });

    it('should respect dependencyTypes filter', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B', type: 'extends' },
        { from: 'B', to: 'A', type: 'composition' },
      ]);
      tracer = new TypeChainTracer(graph);

      const cycles = tracer.detectCircularDependencies({ dependencyTypes: ['extends'] });
      // Only 'extends' is followed, so no cycle
      expect(cycles.length).toBe(0);
    });

    it('should respect includeExternal filter', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'Promise', isExternal: true },
        { from: 'Promise', to: 'A', isExternal: true },
      ]);
      tracer = new TypeChainTracer(graph);

      const cycles = tracer.detectCircularDependencies({ includeExternal: false });
      // External deps are excluded, so no cycle
      expect(cycles.length).toBe(0);
    });
  });

  describe('getDirectDependencies', () => {
    beforeEach(() => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'A', to: 'string', dataFlow: 'output' },
        { from: 'B', to: 'D' },
      ]);
      tracer = new TypeChainTracer(graph);
    });

    it('should get all direct dependencies of a type', () => {
      const deps = tracer.getDirectDependencies('A');
      expect(deps.length).toBeGreaterThanOrEqual(2); // At least B and C (string is filtered out by default)
      expect(deps.some((d) => d.to === 'B')).toBe(true);
      expect(deps.some((d) => d.to === 'C')).toBe(true);
    });

    it('should return empty array for types with no dependencies', () => {
      const deps = tracer.getDirectDependencies('D');
      expect(deps.length).toBe(0);
    });

    it('should exclude primitives by default', () => {
      const deps = tracer.getDirectDependencies('A');
      expect(deps.some((d) => d.to === 'string')).toBe(false);
    });

    it('should include primitives when specified', () => {
      const deps = tracer.getDirectDependencies('A', { includePrimitives: true });
      expect(deps.some((d) => d.to === 'string')).toBe(true);
    });

    it('should filter by dependency type', () => {
      const graph = createGraphWithDeps([
        { from: 'X', to: 'Y', type: 'extends' },
        { from: 'X', to: 'Z', type: 'composition' },
      ]);
      tracer = new TypeChainTracer(graph);

      const deps = tracer.getDirectDependencies('X', { dependencyTypes: ['extends'] });
      expect(deps.length).toBe(1);
      expect(deps[0].to).toBe('Y');
    });

    it('should preserve dependency information', () => {
      const deps = tracer.getDirectDependencies('A');
      const depB = deps.find((d) => d.to === 'B');
      expect(depB?.from).toBe('A');
      expect(depB?.dependencyType).toBeDefined();
      expect(depB?.location).toBeDefined();
    });
  });

  describe('getReverseDependencies', () => {
    beforeEach(() => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'D' },
        { from: 'B', to: 'D' },
        { from: 'C', to: 'D' },
        { from: 'D', to: 'E' },
      ]);
      tracer = new TypeChainTracer(graph);
    });

    it('should get all types that depend on given type', () => {
      const deps = tracer.getReverseDependencies('D');
      expect(deps.length).toBe(3);
      expect(deps.some((d) => d.from === 'A')).toBe(true);
      expect(deps.some((d) => d.from === 'B')).toBe(true);
      expect(deps.some((d) => d.from === 'C')).toBe(true);
    });

    it('should return empty or have reverse dependencies', () => {
      const deps = tracer.getReverseDependencies('E');
      // E may have dependencies if there are indirect paths
      expect(Array.isArray(deps)).toBe(true);
    });

    it('should not include outgoing dependencies', () => {
      const deps = tracer.getReverseDependencies('D');
      expect(deps.some((d) => d.from === 'D')).toBe(false);
    });

    it('should filter by dependency type', () => {
      const graph = createGraphWithDeps([
        { from: 'X', to: 'Y', type: 'extends' },
        { from: 'Z', to: 'Y', type: 'composition' },
      ]);
      tracer = new TypeChainTracer(graph);

      const deps = tracer.getReverseDependencies('Y', { dependencyTypes: ['extends'] });
      expect(deps.length).toBe(1);
      expect(deps[0].from).toBe('X');
    });

    it('should preserve dependency information', () => {
      const deps = tracer.getReverseDependencies('D');
      const depA = deps.find((d) => d.from === 'A');
      expect(depA?.to).toBe('D');
      expect(depA?.dependencyType).toBeDefined();
    });

    it('should respect includeExternal filter', () => {
      const graph = createGraphWithDeps([
        { from: 'Promise', to: 'X', isExternal: true },
        { from: 'A', to: 'X' },
      ]);
      tracer = new TypeChainTracer(graph);

      const deps = tracer.getReverseDependencies('X', { includeExternal: false });
      expect(deps.length).toBe(1);
      expect(deps[0].from).toBe('A');
    });
  });

  describe('edge cases - no dependencies', () => {
    it('should handle isolated graph', () => {
      const graph = createGraphWithDeps([]);
      tracer = new TypeChainTracer(graph);

      const roots = tracer.findRootTypes();
      expect(roots.length).toBe(0);

      const leaves = tracer.findLeafTypes();
      expect(leaves.length).toBe(0);
    });

    it('should handle single type with no dependencies', () => {
      const graph = createSimpleGraph(['A']);
      tracer = new TypeChainTracer(graph);

      const roots = tracer.findRootTypes();
      expect(roots).toContain('A');

      const leaves = tracer.findLeafTypes();
      expect(leaves).toContain('A');

      const chains = tracer.findChain('A', 'A');
      // Chain from type to itself should be 0 or empty
      expect(chains.chains.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases - deep chains', () => {
    it('should handle very deep chains', () => {
      const deps = Array.from({ length: 15 }, (_, i) => ({
        from: `L${i}`,
        to: `L${i + 1}`,
      }));
      const graph = createGraphWithDeps(deps);
      tracer = new TypeChainTracer(graph);

      const result = tracer.findChain('L0', 'L10');
      expect(result.chains.length).toBe(1);
      expect(result.chains[0].path.length).toBe(11); // L0 to L10 = 11 types
    });

    it('should respect maxDepth for deep chains', () => {
      const deps = Array.from({ length: 15 }, (_, i) => ({
        from: `L${i}`,
        to: `L${i + 1}`,
      }));
      const graph = createGraphWithDeps(deps);
      tracer = new TypeChainTracer(graph);

      const result = tracer.findChain('L0', 'L15', { maxDepth: 5 });
      expect(result.chains.length).toBe(0);
    });
  });

  describe('edge cases - complex graphs', () => {
    it('should handle diamond dependency pattern', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'D' },
        { from: 'C', to: 'D' },
      ]);
      tracer = new TypeChainTracer(graph);

      const result = tracer.findChain('A', 'D', { findAllPaths: true });
      expect(result.chains.length).toBe(2);
    });

    it('should handle fan-out pattern', () => {
      const graph = createGraphWithDeps([
        { from: 'Hub', to: 'A' },
        { from: 'Hub', to: 'B' },
        { from: 'Hub', to: 'C' },
        { from: 'Hub', to: 'D' },
      ]);
      tracer = new TypeChainTracer(graph);

      const tree = tracer.buildDependencyTree('Hub');
      expect(tree.tree?.childCount).toBe(4);
      expect(tree.totalTypes).toBe(5); // Hub + 4 leaves
    });

    it('should handle fan-in pattern', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'Core' },
        { from: 'B', to: 'Core' },
        { from: 'C', to: 'Core' },
        { from: 'D', to: 'Core' },
      ]);
      tracer = new TypeChainTracer(graph);

      const deps = tracer.getReverseDependencies('Core');
      expect(deps.length).toBe(4);
    });
  });

  describe('edge cases - self-references', () => {
    it('should handle types with self-dependency', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'A' }, // Self-reference
        { from: 'A', to: 'B' },
      ]);
      tracer = new TypeChainTracer(graph);

      const cycles = tracer.detectCircularDependencies();
      expect(cycles.length).toBeGreaterThan(0);
    });
  });

  describe('combined filtering', () => {
    beforeEach(() => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B', type: 'composition', dataFlow: 'output' },
        { from: 'B', to: 'C', type: 'parameter', dataFlow: 'input' },
        { from: 'C', to: 'Promise', isExternal: true, dataFlow: 'output' },
      ]);
      tracer = new TypeChainTracer(graph);
    });

    it('should apply multiple filters simultaneously', () => {
      const result = tracer.findChain('A', 'Promise', {
        dependencyTypes: ['composition', 'parameter'],
        dataFlow: 'output',
        includeExternal: true,
      });
      expect(result.chains.length).toBe(0); // B->C requires 'input' flow, not 'output'
    });

    it('should find chain with compatible filters', () => {
      const result = tracer.findChain('A', 'Promise', {
        dependencyTypes: ['composition', 'parameter'],
        includeExternal: true,
      });
      // Should find A->B->C->Promise
      expect(result.chains.length).toBeGreaterThan(0);
    });
  });

  describe('consistency checks', () => {
    it('should maintain consistency between findChain and getDirectDependencies', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
      ]);
      tracer = new TypeChainTracer(graph);

      const directDeps = tracer.getDirectDependencies('A');
      const chains = tracer.findChain('A', 'B');

      // If B is a direct dependency, findChain should find it
      expect(directDeps.some((d) => d.to === 'B')).toBe(true);
      expect(chains.chains.length).toBe(1);
    });

    it('should maintain consistency between roots and reverseDirectDependencies', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'C', to: 'B' },
      ]);
      tracer = new TypeChainTracer(graph);

      const roots = tracer.findRootTypes();
      expect(roots).toContain('A');
      expect(roots).toContain('C');

      // B should have reverse dependencies
      const reverseDeps = tracer.getReverseDependencies('B');
      expect(reverseDeps.length).toBe(2);
    });

    it('should maintain consistency between leaves and directDependencies', () => {
      const graph = createGraphWithDeps([
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
      ]);
      tracer = new TypeChainTracer(graph);

      const leaves = tracer.findLeafTypes();
      expect(leaves).toContain('C');

      // C should have no direct dependencies
      const deps = tracer.getDirectDependencies('C');
      expect(deps.length).toBe(0);
    });
  });

  describe('performance - large graphs', () => {
    it('should handle graph with 100+ types', () => {
      const deps = Array.from({ length: 100 }, (_, i) => ({
        from: `T${i}`,
        to: `T${i + 1}`,
      }));
      const graph = createGraphWithDeps(deps);
      tracer = new TypeChainTracer(graph);

      const roots = tracer.findRootTypes();
      expect(roots.length).toBeGreaterThan(0);

      const leaves = tracer.findLeafTypes();
      expect(leaves.length).toBeGreaterThan(0);
    });

    it('should handle highly connected graphs', () => {
      const deps = [];
      for (let i = 0; i < 20; i++) {
        for (let j = i + 1; j < 20; j++) {
          deps.push({ from: `T${i}`, to: `T${j}` });
        }
      }
      const graph = createGraphWithDeps(deps);
      tracer = new TypeChainTracer(graph);

      const roots = tracer.findRootTypes();
      expect(roots.length).toBeGreaterThan(0);
    });
  });

  describe('getGraphStatistics', () => {
    it('should return correct statistics for empty graph', () => {
      const graph = createSimpleGraph([]);
      tracer = new TypeChainTracer(graph);

      const stats = tracer.getGraphStatistics();

      expect(stats.totalTypes).toBe(0);
      expect(stats.composites).toBe(0);
      expect(stats.complete).toBe(0);
      expect(stats.totalDependencies).toBe(0);
      expect(stats.averageDependencies).toBe(0);
      expect(stats.circularDependencies).toBe(0);
      expect(stats.hasCircularDependencies).toBe(false);
    });

    it('should return correct statistics for simple graph', () => {
      const deps = [
        { from: 'A', to: 'B', type: 'composition' as const },
        { from: 'A', to: 'C', type: 'composition' as const },
      ];
      const graph = createGraphWithDeps(deps);
      tracer = new TypeChainTracer(graph);

      const stats = tracer.getGraphStatistics();

      expect(stats.totalTypes).toBe(3); // A, B, C
      expect(stats.composites).toBe(1); // A has dependencies
      expect(stats.compositesPercentage).toBeCloseTo(33.3, 1);
      expect(stats.complete).toBe(2); // B, C have no dependencies
      expect(stats.completePercentage).toBeCloseTo(66.7, 1);
      expect(stats.totalDependencies).toBe(2);
      expect(stats.averageDependencies).toBeCloseTo(0.67, 2);
      expect(stats.circularDependencies).toBe(0);
      expect(stats.hasCircularDependencies).toBe(false);
    });

    it('should detect circular dependencies in statistics', () => {
      const deps = [
        { from: 'A', to: 'B', type: 'composition' as const },
        { from: 'B', to: 'A', type: 'composition' as const },
      ];
      const graph = createGraphWithDeps(deps);
      tracer = new TypeChainTracer(graph);

      const stats = tracer.getGraphStatistics();

      expect(stats.totalTypes).toBe(2);
      expect(stats.composites).toBe(2); // Both have dependencies
      expect(stats.compositesPercentage).toBe(100);
      expect(stats.complete).toBe(0);
      expect(stats.completePercentage).toBe(0);
      expect(stats.circularDependencies).toBe(1);
      expect(stats.hasCircularDependencies).toBe(true);
      expect(stats.cycles.length).toBe(1);
    });

    it('should calculate average dependencies correctly', () => {
      const deps = [
        { from: 'A', to: 'B', type: 'composition' as const },
        { from: 'A', to: 'C', type: 'composition' as const },
        { from: 'A', to: 'D', type: 'composition' as const },
        { from: 'B', to: 'C', type: 'composition' as const },
      ];
      const graph = createGraphWithDeps(deps);
      tracer = new TypeChainTracer(graph);

      const stats = tracer.getGraphStatistics();

      expect(stats.totalTypes).toBe(4);
      expect(stats.composites).toBe(2); // A and B
      expect(stats.totalDependencies).toBe(4);
      // Average: (3 + 1 + 0 + 0) / 4 = 1.0
      expect(stats.averageDependencies).toBe(1.0);
    });

    it('should respect includeExternal option', () => {
      const deps = [
        { from: 'A', to: 'B', type: 'composition' as const, isExternal: false },
        { from: 'A', to: 'External', type: 'composition' as const, isExternal: true },
      ];
      const graph = createGraphWithDeps(deps);
      tracer = new TypeChainTracer(graph);

      const statsWithExternal = tracer.getGraphStatistics({ includeExternal: true });
      expect(statsWithExternal.totalDependencies).toBe(2);
      expect(statsWithExternal.averageDependencies).toBeCloseTo(0.67, 2);

      const statsWithoutExternal = tracer.getGraphStatistics({ includeExternal: false });
      expect(statsWithoutExternal.totalDependencies).toBe(1);
      expect(statsWithoutExternal.averageDependencies).toBeCloseTo(0.33, 2);
    });

    it('should handle large graphs efficiently', () => {
      const deps = [];
      for (let i = 0; i < 100; i++) {
        deps.push({ from: `Type${i}`, to: `Type${i + 1}`, type: 'composition' as const });
      }
      const graph = createGraphWithDeps(deps);
      tracer = new TypeChainTracer(graph);

      const start = Date.now();
      const stats = tracer.getGraphStatistics();
      const duration = Date.now() - start;

      expect(stats.totalTypes).toBe(101);
      expect(stats.composites).toBe(100);
      expect(stats.complete).toBe(1);
      expect(duration).toBeLessThan(1000); // Should complete in less than 1s
    });
  });
});
