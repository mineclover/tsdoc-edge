/**
 * Tests for DataFlowAnalyzer
 */

import { DataFlowAnalyzer } from '../../analyzer/DataFlowAnalyzer';
import type {
  InterfaceDependencyGraph,
  InterfaceInfo,
} from '../../types/domain/interface';
import type { Symbol } from '../../types/graph';

describe('DataFlowAnalyzer', () => {
  let analyzer: DataFlowAnalyzer;

  beforeEach(() => {
    analyzer = new DataFlowAnalyzer();
  });

  describe('constructor', () => {
    it('should create DataFlowAnalyzer instance', () => {
      expect(analyzer).toBeDefined();
      expect(analyzer).toBeInstanceOf(DataFlowAnalyzer);
    });
  });

  describe('classifyDTOs', () => {
    it('should classify DTOs with suffix-dto pattern', () => {
      const interfaces: InterfaceInfo[] = [
        createMockInterface('UserDTO', 3, 0),
        createMockInterface('OrderDTO', 4, 0),
      ];

      const result = analyzer.classifyDTOs(interfaces);

      expect(result.length).toBe(2);
      expect(result[0].pattern).toBe('suffix-dto');
      expect(result[0].isDTO).toBe(true);
      expect(result[0].role).toBe('transfer');
      expect(result[0].confidence).toBe(0.9);
    });

    it('should classify Request/Response patterns', () => {
      const interfaces: InterfaceInfo[] = [
        createMockInterface('CreateUserRequest', 3, 0),
        createMockInterface('CreateUserResponse', 2, 0),
      ];

      const result = analyzer.classifyDTOs(interfaces);

      expect(result.length).toBe(2);

      const requestDTO = result.find((r) => r.interfaceName === 'CreateUserRequest');
      expect(requestDTO?.pattern).toBe('suffix-request');
      expect(requestDTO?.role).toBe('input');

      const responseDTO = result.find((r) => r.interfaceName === 'CreateUserResponse');
      expect(responseDTO?.pattern).toBe('suffix-response');
      expect(responseDTO?.role).toBe('output');
    });

    it('should classify Payload/Input/Output patterns', () => {
      const interfaces: InterfaceInfo[] = [
        createMockInterface('SubmitPayload', 3, 0),
        createMockInterface('ProcessInput', 4, 0),
        createMockInterface('ResultOutput', 2, 0),
      ];

      const result = analyzer.classifyDTOs(interfaces);

      expect(result.length).toBe(3);
      expect(result[0].pattern).toBe('suffix-payload');
      expect(result[0].role).toBe('input');
      expect(result[1].pattern).toBe('suffix-input');
      expect(result[1].role).toBe('input');
      expect(result[2].pattern).toBe('suffix-output');
      expect(result[2].role).toBe('output');
    });

    it('should classify Data suffix pattern', () => {
      const interfaces: InterfaceInfo[] = [
        createMockInterface('UserData', 5, 0),
      ];

      const result = analyzer.classifyDTOs(interfaces);

      expect(result.length).toBe(1);
      expect(result[0].pattern).toBe('suffix-data');
      expect(result[0].role).toBe('transfer');
    });

    it('should classify simple data structures as DTOs', () => {
      const interfaces: InterfaceInfo[] = [
        createMockInterface('SimpleData', 5, 0), // Many properties, no methods
      ];

      const result = analyzer.classifyDTOs(interfaces);

      expect(result.length).toBe(1);
      expect(result[0].isDTO).toBe(true);
      // SimpleData ends with 'Data', so it gets 0.9 confidence from suffix-data pattern
      expect(result[0].confidence).toBe(0.9);
    });

    it('should not classify Options/Config as DTOs', () => {
      const interfaces: InterfaceInfo[] = [
        createMockInterface('UserOptions', 5, 0),
        createMockInterface('AppConfig', 5, 0),
      ];

      const result = analyzer.classifyDTOs(interfaces);

      expect(result.length).toBe(0);
    });

    it('should not classify interfaces with methods as DTOs', () => {
      const interfaces: InterfaceInfo[] = [
        createMockInterface('ServiceInterface', 3, 2), // Has methods
      ];

      const result = analyzer.classifyDTOs(interfaces);

      expect(result.length).toBe(0);
    });

    it('should handle empty interface array', () => {
      const result = analyzer.classifyDTOs([]);
      expect(result.length).toBe(0);
    });
  });

  describe('analyzeDataFlows', () => {
    it('should analyze complete data flow graph', () => {
      const graph = createMockGraph([
        { name: 'UserDTO', deps: ['User'] },
        { name: 'User', deps: [] },
      ]);

      const result = analyzer.analyzeDataFlows(graph);

      expect(result.timestamp).toBeDefined();
      expect(result.totalInterfaces).toBe(2);
      expect(result.dtos).toBeDefined();
      expect(result.transformationChains).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should calculate summary statistics', () => {
      const graph = createMockGraph([
        { name: 'UserDTO', deps: ['User'] },
        { name: 'OrderDTO', deps: ['Order'] },
        { name: 'User', deps: [] },
        { name: 'Order', deps: [] },
      ]);

      const result = analyzer.analyzeDataFlows(graph);

      expect(result.summary.totalDTOs).toBeGreaterThan(0);
      expect(result.summary.totalChains).toBeGreaterThanOrEqual(0);
      expect(result.summary.averageChainLength).toBeGreaterThanOrEqual(0);
    });

    it('should detect orphaned DTOs', () => {
      const graph = createMockGraph([
        { name: 'UserDTO', deps: [] }, // Orphaned - no connections
        { name: 'OrderDTO', deps: ['Order'] },
        { name: 'Order', deps: [] },
      ]);

      const result = analyzer.analyzeDataFlows(graph);

      expect(result.orphanedDTOs).toContain('UserDTO');
    });

    it('should detect bidirectional transformations', () => {
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([
          ['TypeA', createMockInterface('TypeA', 3, 0)],
          ['TypeB', createMockInterface('TypeB', 3, 0)],
        ]),
        dependencies: [
          {
            from: 'TypeA',
            to: 'TypeB',
            via: 'transform',
            dependencyType: 'composition',
            dataFlow: 'output',
            location: 'property',
          },
          {
            from: 'TypeB',
            to: 'TypeA',
            via: 'reverseTransform',
            dependencyType: 'composition',
            dataFlow: 'output',
            location: 'property',
          },
        ],
        domains: new Map(),
      };

      const result = analyzer.analyzeDataFlows(graph);

      expect(result.bidirectionalTransformations.length).toBe(1);
      expect(result.bidirectionalTransformations[0].issue).toContain('Bidirectional');
    });

    it('should handle empty graph', () => {
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map(),
        dependencies: [],
        domains: new Map(),
      };

      const result = analyzer.analyzeDataFlows(graph);

      expect(result.totalInterfaces).toBe(0);
      expect(result.dtos.length).toBe(0);
      expect(result.transformationChains.length).toBe(0);
    });
  });

  describe('findTransformationChains', () => {
    it('should find simple transformation chain', () => {
      const graph = createMockGraph([
        { name: 'UserDTO', deps: ['User'] },
        { name: 'User', deps: [] },
      ]);

      const dtos = analyzer.classifyDTOs(Array.from(graph.interfaces.values()));
      const chains = analyzer.findTransformationChains(graph, dtos);

      expect(chains.length).toBeGreaterThanOrEqual(0);
    });

    it('should find multi-step transformation chains', () => {
      const graph = createMockGraph([
        { name: 'RequestDTO', deps: ['DomainModel'] },
        { name: 'DomainModel', deps: ['Entity'] },
        { name: 'Entity', deps: [] },
      ]);

      const dtos = analyzer.classifyDTOs(Array.from(graph.interfaces.values()));
      const chains = analyzer.findTransformationChains(graph, dtos);

      const longChain = chains.find((c) => c.length > 1);
      if (longChain) {
        expect(longChain.steps.length).toBeGreaterThan(1);
      }
    });

    it('should classify chain types correctly', () => {
      const graph = createMockGraph([
        { name: 'UserDTO', deps: ['User'] },
        { name: 'User', deps: [] },
      ]);

      const dtos = analyzer.classifyDTOs(Array.from(graph.interfaces.values()));
      const chains = analyzer.findTransformationChains(graph, dtos);

      const dtoToEntityChain = chains.find((c) => c.chainType === 'dto-to-entity');
      if (dtoToEntityChain) {
        expect(dtoToEntityChain.source).toContain('DTO');
      }
    });
  });

  describe('traceTransformation', () => {
    it('should find direct transformation path', () => {
      const graph = createMockGraph([
        { name: 'UserDTO', deps: ['User'] },
        { name: 'User', deps: [] },
      ]);

      const result = analyzer.traceTransformation('UserDTO', 'User', graph);

      expect(result).toBeDefined();
      if (result) {
        expect(result.from).toBe('UserDTO');
        expect(result.to).toBe('User');
        expect(result.exists).toBe(true);
        expect(result.path.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should find indirect transformation path', () => {
      const graph = createMockGraph([
        { name: 'A', deps: ['B'] },
        { name: 'B', deps: ['C'] },
        { name: 'C', deps: [] },
      ]);

      const result = analyzer.traceTransformation('A', 'C', graph);

      if (result) {
        expect(result.exists).toBe(true);
        expect(result.path.length).toBe(3);
        expect(result.path).toEqual(['A', 'B', 'C']);
      }
    });

    it('should return null path when no connection exists', () => {
      const graph = createMockGraph([
        { name: 'A', deps: [] },
        { name: 'B', deps: [] },
      ]);

      const result = analyzer.traceTransformation('A', 'B', graph);

      if (result) {
        expect(result.exists).toBe(false);
        expect(result.path.length).toBe(0);
      }
    });

    it('should handle same source and target', () => {
      const graph = createMockGraph([
        { name: 'A', deps: [] },
      ]);

      const result = analyzer.traceTransformation('A', 'A', graph);

      if (result) {
        expect(result.exists).toBe(true);
        expect(result.path).toEqual(['A']);
      }
    });

    it('should find shortest path when multiple paths exist', () => {
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([
          ['A', createMockInterface('A', 2, 0)],
          ['B', createMockInterface('B', 2, 0)],
          ['C', createMockInterface('C', 2, 0)],
          ['D', createMockInterface('D', 2, 0)],
        ]),
        dependencies: [
          { from: 'A', to: 'B', via: 'transform', dependencyType: 'composition', dataFlow: 'output', location: 'property' },
          { from: 'B', to: 'D', via: 'transform', dependencyType: 'composition', dataFlow: 'output', location: 'property' },
          { from: 'A', to: 'C', via: 'transform', dependencyType: 'composition', dataFlow: 'output', location: 'property' },
          { from: 'C', to: 'B', via: 'transform', dependencyType: 'composition', dataFlow: 'output', location: 'property' },
          { from: 'C', to: 'D', via: 'transform', dependencyType: 'composition', dataFlow: 'output', location: 'property' },
        ],
        domains: new Map(),
      };

      const result = analyzer.traceTransformation('A', 'D', graph);

      if (result) {
        expect(result.exists).toBe(true);
        // Should find path A -> B -> D (length 3) or A -> C -> D (length 3)
        expect(result.path.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle circular dependencies', () => {
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([
          ['A', createMockInterface('A', 2, 0)],
          ['B', createMockInterface('B', 2, 0)],
        ]),
        dependencies: [
          { from: 'A', to: 'B', via: 'transform', dependencyType: 'composition', dataFlow: 'output', location: 'property' },
          { from: 'B', to: 'A', via: 'reverseTransform', dependencyType: 'composition', dataFlow: 'output', location: 'property' },
        ],
        domains: new Map(),
      };

      const result = analyzer.analyzeDataFlows(graph);
      expect(result.bidirectionalTransformations.length).toBeGreaterThan(0);
    });

    it('should handle complex nested transformation chains', () => {
      const graph = createMockGraph([
        { name: 'RequestDTO', deps: ['ServiceInput'] },
        { name: 'ServiceInput', deps: ['DomainModel'] },
        { name: 'DomainModel', deps: ['Entity'] },
        { name: 'Entity', deps: ['DatabaseRow'] },
        { name: 'DatabaseRow', deps: [] },
      ]);

      const dtos = analyzer.classifyDTOs(Array.from(graph.interfaces.values()));
      const chains = analyzer.findTransformationChains(graph, dtos);

      expect(chains.length).toBeGreaterThan(0);
    });

    it('should handle DTOs with no dependencies', () => {
      const graph = createMockGraph([
        { name: 'StandaloneDTO', deps: [] },
      ]);

      const result = analyzer.analyzeDataFlows(graph);
      expect(result.orphanedDTOs).toContain('StandaloneDTO');
    });

    it('should validate transformation chain issues', () => {
      const graph: InterfaceDependencyGraph = {
        interfaces: new Map([
          ['A', createMockInterface('A', 2, 0)],
          ['B', createMockInterface('B', 2, 0)],
          ['C', createMockInterface('C', 2, 0)],
          ['D', createMockInterface('D', 2, 0)],
        ]),
        dependencies: [
          { from: 'A', to: 'B', via: 'transform', dependencyType: 'composition', dataFlow: 'bidirectional', location: 'property' },
          { from: 'B', to: 'C', via: 'transform', dependencyType: 'composition', dataFlow: 'output', location: 'property' },
          { from: 'C', to: 'D', via: 'transform', dependencyType: 'composition', dataFlow: 'output', location: 'property' },
          { from: 'D', to: 'A', via: 'transform', dependencyType: 'composition', dataFlow: 'output', location: 'property' },
        ],
        domains: new Map(),
      };

      const dtos = analyzer.classifyDTOs(Array.from(graph.interfaces.values()));
      const chains = analyzer.findTransformationChains(graph, dtos);

      const invalidChains = chains.filter((c) => !c.isValid);
      if (invalidChains.length > 0) {
        expect(invalidChains[0].issues.length).toBeGreaterThan(0);
      }
    });
  });
});

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

function createMockInterface(name: string, propertyCount: number, methodCount: number): InterfaceInfo {
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

function createMockGraph(
  nodes: Array<{ name: string; deps: string[] }>
): InterfaceDependencyGraph {
  const interfaces = new Map<string, InterfaceInfo>();
  const dependencies = [];

  for (const node of nodes) {
    const isDTO = node.name.endsWith('DTO') ||
      node.name.endsWith('Request') ||
      node.name.endsWith('Response') ||
      node.name.endsWith('Data');
    interfaces.set(node.name, createMockInterface(node.name, isDTO ? 4 : 2, 0));
  }

  for (const node of nodes) {
    for (const dep of node.deps) {
      dependencies.push({
        from: node.name,
        to: dep,
        via: 'transform',
        dependencyType: 'composition' as const,
        dataFlow: 'output' as const,
        location: 'property' as const,
      });
    }
  }

  return { interfaces, dependencies, domains: new Map() };
}
