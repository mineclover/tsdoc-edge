/**
 * Tests for InterfaceDependencyMapper
 */

import { InterfaceDependencyMapper } from '../../analyzer/InterfaceDependencyMapper';
import type { InterfaceInfo } from '../../types/domain';
import type { Symbol } from '../../types/graph';

describe('InterfaceDependencyMapper', () => {
  let mapper: InterfaceDependencyMapper;

  beforeEach(() => {
    mapper = new InterfaceDependencyMapper();
  });

  describe('constructor', () => {
    it('should create InterfaceDependencyMapper', () => {
      expect(mapper).toBeDefined();
    });
  });

  describe('buildDependencyGraph', () => {
    it('should build graph from simple interfaces', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('User', [{ name: 'id', type: 'string', isOptional: false, isReadonly: false }]),
        createInterface('Post', [{ name: 'author', type: 'User', isOptional: false, isReadonly: false }]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);

      expect(graph.interfaces.size).toBe(2);
      expect(graph.dependencies.length).toBeGreaterThan(0);
    });

    it('should detect extends dependencies', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('Base', []),
        createInterface('Derived', [], ['Base']),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);

      const extendsDep = graph.dependencies.find(
        d => d.from === 'Derived' && d.to === 'Base' && d.dependencyType === 'extends'
      );

      expect(extendsDep).toBeDefined();
      expect(extendsDep?.location).toBe('extends');
    });

    it('should detect composition dependencies from properties', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('Address', []),
        createInterface('User', [
          { name: 'address', type: 'Address', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);

      const compositionDep = graph.dependencies.find(
        d => d.from === 'User' && d.to === 'Address' && d.dependencyType === 'composition'
      );

      expect(compositionDep).toBeDefined();
      expect(compositionDep?.via).toBe('address');
      expect(compositionDep?.location).toBe('property');
      expect(compositionDep?.dataFlow).toBe('output');
    });

    it('should detect parameter dependencies from methods', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('User', []),
        createInterface('UserService', [], [], [
          {
            name: 'createUser',
            parameters: [{ name: 'data', type: 'User', isOptional: false }],
            returnType: 'void',
          },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);

      const paramDep = graph.dependencies.find(
        d => d.from === 'UserService' && d.to === 'User' && d.dependencyType === 'parameter'
      );

      expect(paramDep).toBeDefined();
      expect(paramDep?.via).toContain('createUser');
      expect(paramDep?.location).toBe('method');
      expect(paramDep?.dataFlow).toBe('input');
    });

    it('should detect return type dependencies from methods', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('User', []),
        createInterface('UserService', [], [], [
          {
            name: 'getUser',
            parameters: [{ name: 'id', type: 'string', isOptional: false }],
            returnType: 'User',
          },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);

      const returnDep = graph.dependencies.find(
        d => d.from === 'UserService' && d.to === 'User' && d.dependencyType === 'return'
      );

      expect(returnDep).toBeDefined();
      expect(returnDep?.via).toBe('getUser');
      expect(returnDep?.dataFlow).toBe('output');
    });

    it('should handle array types', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('Item', []),
        createInterface('Collection', [
          { name: 'items', type: 'Item[]', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);

      const arrayDep = graph.dependencies.find(
        d => d.from === 'Collection' && d.to === 'Item'
      );

      expect(arrayDep).toBeDefined();
      expect(arrayDep?.typeRelation).toBe('array');
    });

    it('should handle union types', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('Admin', []),
        createInterface('User', []),
        createInterface('Auth', [
          { name: 'principal', type: 'User | Admin', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);

      const deps = graph.dependencies.filter(d => d.from === 'Auth');
      const userDep = deps.find(d => d.to === 'User');
      const adminDep = deps.find(d => d.to === 'Admin');

      expect(userDep).toBeDefined();
      expect(adminDep).toBeDefined();
      expect(userDep?.typeRelation).toBe('union');
      expect(adminDep?.typeRelation).toBe('union');
    });

    it('should handle intersection types', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('Named', []),
        createInterface('Dated', []),
        createInterface('Entity', [
          { name: 'metadata', type: 'Named & Dated', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);

      const deps = graph.dependencies.filter(d => d.from === 'Entity');
      const namedDep = deps.find(d => d.to === 'Named');
      const datedDep = deps.find(d => d.to === 'Dated');

      expect(namedDep).toBeDefined();
      expect(datedDep).toBeDefined();
      expect(namedDep?.typeRelation).toBe('intersection');
      expect(datedDep?.typeRelation).toBe('intersection');
    });

    it('should handle generic types', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('User', []),
        createInterface('Response', [
          { name: 'data', type: 'Promise<User>', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);

      const genericDep = graph.dependencies.find(
        d => d.from === 'Response' && d.to === 'User'
      );

      expect(genericDep).toBeDefined();
      expect(genericDep?.typeRelation).toBe('generic-param');
      expect(genericDep?.genericContext).toContain('Promise');
    });

    it('should handle import map for external types', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('Service', [
          { name: 'db', type: 'Database', isOptional: false, isReadonly: false },
        ]),
      ];

      const importMap = new Map([
        ['Database', { source: 'external-lib', isTypeOnly: true }],
      ]);

      const graph = mapper.buildDependencyGraph(interfaces, importMap);

      const externalDep = graph.dependencies.find(d => d.to === 'Database');

      expect(externalDep).toBeDefined();
      expect(externalDep?.isExternal).toBe(true);
      expect(externalDep?.importSource).toBe('external-lib');
    });

    it('should handle empty interfaces array', () => {
      const graph = mapper.buildDependencyGraph([]);

      expect(graph.interfaces.size).toBe(0);
      expect(graph.dependencies.length).toBe(0);
    });
  });

  describe('getDependencies', () => {
    it('should get dependencies for specific interface', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('User', []),
        createInterface('Post', [
          { name: 'author', type: 'User', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);
      const deps = mapper.getDependencies('Post', graph);

      expect(deps.length).toBeGreaterThan(0);
      expect(deps[0].from).toBe('Post');
    });

    it('should return empty array for interface with no dependencies', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('Standalone', [
          { name: 'value', type: 'string', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);
      const deps = mapper.getDependencies('Standalone', graph);

      expect(deps.length).toBe(0);
    });

    it('should return empty array for non-existent interface', () => {
      const interfaces: InterfaceInfo[] = [createInterface('User', [])];
      const graph = mapper.buildDependencyGraph(interfaces);
      const deps = mapper.getDependencies('NonExistent', graph);

      expect(deps.length).toBe(0);
    });
  });

  describe('getDependents', () => {
    it('should get dependents of specific interface', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('User', []),
        createInterface('Post', [
          { name: 'author', type: 'User', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);
      const dependents = mapper.getDependents('User', graph);

      expect(dependents.length).toBeGreaterThan(0);
      expect(dependents[0].to).toBe('User');
      expect(dependents[0].from).toBe('Post');
    });

    it('should return empty array for unused interface', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('Unused', []),
        createInterface('Other', []),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);
      const dependents = mapper.getDependents('Unused', graph);

      expect(dependents.length).toBe(0);
    });
  });

  describe('findCircularDependencies', () => {
    it('should detect simple circular dependency', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('A', [
          { name: 'b', type: 'B', isOptional: false, isReadonly: false },
        ]),
        createInterface('B', [
          { name: 'a', type: 'A', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);
      const cycles = mapper.findCircularDependencies(graph);

      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should detect three-way circular dependency', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('A', [
          { name: 'b', type: 'B', isOptional: false, isReadonly: false },
        ]),
        createInterface('B', [
          { name: 'c', type: 'C', isOptional: false, isReadonly: false },
        ]),
        createInterface('C', [
          { name: 'a', type: 'A', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);
      const cycles = mapper.findCircularDependencies(graph);

      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should return empty array for acyclic graph', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('Base', []),
        createInterface('Derived', [
          { name: 'base', type: 'Base', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);
      const cycles = mapper.findCircularDependencies(graph);

      expect(cycles.length).toBe(0);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate efferent coupling', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('User', []),
        createInterface('Address', []),
        createInterface('Profile', [
          { name: 'user', type: 'User', isOptional: false, isReadonly: false },
          { name: 'address', type: 'Address', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);
      const metrics = mapper.calculateMetrics('Profile', graph);

      expect(metrics.efferentCoupling).toBe(2);
    });

    it('should calculate afferent coupling', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('User', []),
        createInterface('Post', [
          { name: 'author', type: 'User', isOptional: false, isReadonly: false },
        ]),
        createInterface('Comment', [
          { name: 'user', type: 'User', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);
      const metrics = mapper.calculateMetrics('User', graph);

      expect(metrics.afferentCoupling).toBe(2);
    });

    it('should calculate instability for stable interface', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('Base', []),
        createInterface('Derived1', [], ['Base']),
        createInterface('Derived2', [], ['Base']),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);
      const metrics = mapper.calculateMetrics('Base', graph);

      expect(metrics.instability).toBeLessThan(0.5);
    });

    it('should calculate instability for unstable interface', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('User', []),
        createInterface('Address', []),
        createInterface('Client', [
          { name: 'user', type: 'User', isOptional: false, isReadonly: false },
          { name: 'address', type: 'Address', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);
      const metrics = mapper.calculateMetrics('Client', graph);

      expect(metrics.instability).toBeGreaterThan(0.5);
    });

    it('should return zero for isolated interface', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('Isolated', []),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);
      const metrics = mapper.calculateMetrics('Isolated', graph);

      expect(metrics.efferentCoupling).toBe(0);
      expect(metrics.afferentCoupling).toBe(0);
      expect(metrics.instability).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle nested generic types', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('User', []),
        createInterface('Service', [
          { name: 'data', type: 'Promise<Array<User>>', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);
      const deps = mapper.getDependencies('Service', graph);

      expect(deps.some(d => d.to === 'User')).toBe(true);
    });

    it('should handle type parameters in generics', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('Result', [], [], [], ['T', 'E']),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);

      expect(graph.interfaces.size).toBe(1);
    });

    it('should filter out built-in types', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('Service', [
          { name: 'data', type: 'Promise<string>', isOptional: false, isReadonly: false },
          { name: 'map', type: 'Map<string, number>', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);
      const deps = mapper.getDependencies('Service', graph);

      expect(deps.length).toBe(0);
    });

    it('should handle multiple dependencies to same interface', () => {
      const interfaces: InterfaceInfo[] = [
        createInterface('User', []),
        createInterface('Post', [
          { name: 'author', type: 'User', isOptional: false, isReadonly: false },
          { name: 'editor', type: 'User', isOptional: false, isReadonly: false },
        ]),
      ];

      const graph = mapper.buildDependencyGraph(interfaces);
      const deps = mapper.getDependencies('Post', graph);

      expect(deps.filter(d => d.to === 'User').length).toBe(2);
    });
  });
});

// Helper function to create mock InterfaceInfo
function createInterface(
  name: string,
  properties: Array<{ name: string; type: string; isOptional: boolean; isReadonly: boolean }> = [],
  extendsInterfaces: string[] = [],
  methods: Array<{
    name: string;
    parameters: Array<{ name: string; type: string; isOptional: boolean }>;
    returnType: string;
  }> = [],
  typeParameters: string[] = []
): InterfaceInfo {
  const symbol: Symbol = {
    id: `${name}-id`,
    name,
    type: 'interface',
    filePath: '/test.ts',
    line: 1,
    column: 1,
    isExported: true,
    isPublic: true,
    tests: [],
    designDecisions: [],
  };

  return {
    symbol,
    properties,
    methods,
    extends: extendsInterfaces,
    typeParameters,
  };
}
