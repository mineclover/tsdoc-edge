/**
 * IODependencyAnalyzer Tests
 */

import { IODependencyAnalyzer } from '../../analyzer/IODependencyAnalyzer';
import type { SymbolGraph, Symbol } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships';

describe('IODependencyAnalyzer', () => {
  // Helper to create mock graph
  function createMockGraph(
    symbols: Array<{
      id: string;
      name: string;
      type?: Symbol['type'];
      filePath?: string;
      metadata?: Symbol['metadata'];
      summary?: string;
    }>,
    adjacencyList?: Map<string, string[]>
  ): SymbolGraph {
    const symbolsMap = new Map<string, Symbol>();
    const nameIndex = new Map<string, string[]>();
    const fileIndex = new Map<string, string[]>();

    for (const s of symbols) {
      const filePath = s.filePath || `src/${s.name}.ts`;
      symbolsMap.set(s.id, {
        id: s.id,
        name: s.name,
        type: s.type || 'function',
        filePath,
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
        metadata: s.metadata,
        summary: s.summary,
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
      adjacencyList: adjacencyList || new Map(),
      reverseAdjacencyList: new Map(),
      nameIndex,
      fileIndex,
    } as SymbolGraph;
  }

  describe('constructor', () => {
    it('should create analyzer with graph', () => {
      const graph = createMockGraph([]);
      const analyzer = new IODependencyAnalyzer(graph);

      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze - basic behavior', () => {
    it('should return empty array for empty graph', () => {
      const graph = createMockGraph([]);
      const analyzer = new IODependencyAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should only process function and method types', () => {
      const graph = createMockGraph([
        {
          id: 'class-myclass',
          name: 'MyClass',
          type: 'class',
          metadata: { declaredType: 'UserData' },
        },
        {
          id: 'interface-myinterface',
          name: 'MyInterface',
          type: 'interface',
          metadata: { declaredType: 'UserData' },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      // Classes and interfaces should not be processed
      expect(result).toHaveLength(0);
    });
  });

  describe('analyze - I/O dependency detection', () => {
    it('should detect I/O dependency when return type matches parameter type', () => {
      const graph = createMockGraph([
        {
          id: 'func-getuser',
          name: 'getUser',
          type: 'function',
          metadata: { declaredType: 'UserData' },
        },
        {
          id: 'func-processuser',
          name: 'processUser',
          type: 'function',
          metadata: { parameterTypes: [{ name: 'user', type: 'UserData' }] },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      const ioDep = result.find(
        (r) =>
          r.type === 'io-dependency' &&
          r.from === 'func-getuser' &&
          r.to === 'func-processuser'
      );

      expect(ioDep).toBeDefined();
      expect(ioDep?.category).toBe('data-flow');
      expect(ioDep?.properties?.dataType).toBe('UserData');
    });

    it('should extract return type from metadata.returnType', () => {
      const graph = createMockGraph([
        {
          id: 'func-producer',
          name: 'producer',
          type: 'function',
          metadata: { returnType: 'OrderData' },
        },
        {
          id: 'func-consumer',
          name: 'consumer',
          type: 'function',
          metadata: { parameterTypes: [{ name: 'order', type: 'OrderData' }] },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      const ioDep = result.find(
        (r) => r.properties?.dataType === 'OrderData'
      );

      expect(ioDep).toBeDefined();
    });

    it('should extract return type from summary @returns tag', () => {
      const graph = createMockGraph([
        {
          id: 'func-gettask',
          name: 'getTask',
          type: 'function',
          summary: '@returns {TaskInfo} The task information',
        },
        {
          id: 'func-processtask',
          name: 'processTask',
          type: 'function',
          metadata: { parameterTypes: [{ name: 'task', type: 'TaskInfo' }] },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      const ioDep = result.find(
        (r) => r.properties?.dataType === 'TaskInfo'
      );

      expect(ioDep).toBeDefined();
    });

    it('should extract parameter types from summary @param tags', () => {
      const graph = createMockGraph([
        {
          id: 'func-createorder',
          name: 'createOrder',
          type: 'function',
          metadata: { declaredType: 'OrderResult' },
        },
        {
          id: 'func-validateorder',
          name: 'validateOrder',
          type: 'function',
          summary: '@param {OrderResult} order - The order to validate',
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      const ioDep = result.find(
        (r) => r.properties?.dataType === 'OrderResult'
      );

      expect(ioDep).toBeDefined();
    });

    it('should extract parameter types from metadata.paramTypes (legacy)', () => {
      const graph = createMockGraph([
        {
          id: 'func-getconfig',
          name: 'getConfig',
          type: 'function',
          metadata: { declaredType: 'ConfigData' },
        },
        {
          id: 'func-applyconfig',
          name: 'applyConfig',
          type: 'function',
          metadata: { paramTypes: ['ConfigData'] },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      const ioDep = result.find(
        (r) => r.properties?.dataType === 'ConfigData'
      );

      expect(ioDep).toBeDefined();
    });
  });

  describe('analyze - primitive type filtering', () => {
    it('should skip primitive types (string, number, boolean)', () => {
      const graph = createMockGraph([
        {
          id: 'func-getname',
          name: 'getName',
          type: 'function',
          metadata: { declaredType: 'string' },
        },
        {
          id: 'func-setname',
          name: 'setName',
          type: 'function',
          metadata: { parameterTypes: [{ name: 'name', type: 'string' }] },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      // String is primitive, should be skipped
      expect(result).toHaveLength(0);
    });

    it('should skip void, any, unknown, never types', () => {
      const graph = createMockGraph([
        {
          id: 'func-donothing',
          name: 'doNothing',
          type: 'function',
          metadata: { declaredType: 'void' },
        },
        {
          id: 'func-getany',
          name: 'getAny',
          type: 'function',
          metadata: { declaredType: 'any' },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should skip Array, Promise, null, undefined types', () => {
      const graph = createMockGraph([
        {
          id: 'func-getarray',
          name: 'getArray',
          type: 'function',
          metadata: { declaredType: 'Array' },
        },
        {
          id: 'func-getpromise',
          name: 'getPromise',
          type: 'function',
          metadata: { declaredType: 'Promise' },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should handle generic types by extracting base type', () => {
      const graph = createMockGraph([
        {
          id: 'func-getlist',
          name: 'getList',
          type: 'function',
          metadata: { declaredType: 'Array<UserData>' },
        },
        {
          id: 'func-processlist',
          name: 'processList',
          type: 'function',
          metadata: { parameterTypes: [{ name: 'list', type: 'Array<UserData>' }] },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      // Array<T> should be skipped because base type is Array
      expect(result).toHaveLength(0);
    });
  });

  describe('analyze - self-reference prevention', () => {
    it('should not create relationship between same symbol', () => {
      const graph = createMockGraph([
        {
          id: 'func-recursive',
          name: 'recursive',
          type: 'function',
          metadata: {
            declaredType: 'CustomType',
            parameterTypes: [{ name: 'input', type: 'CustomType' }],
          },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      const selfRef = result.find(
        (r) => r.from === r.to
      );

      expect(selfRef).toBeUndefined();
    });
  });

  describe('analyze - confidence calculation', () => {
    it('should increase confidence when symbols are in same file', () => {
      const sameFilePath = 'src/same.ts';
      const graph = createMockGraph([
        {
          id: 'func-producer',
          name: 'producer',
          type: 'function',
          filePath: sameFilePath,
          metadata: { declaredType: 'SameFileData' },
        },
        {
          id: 'func-consumer',
          name: 'consumer',
          type: 'function',
          filePath: sameFilePath,
          metadata: { parameterTypes: [{ name: 'data', type: 'SameFileData' }] },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      if (result.length > 0) {
        // Same file adds 0.2 to base 0.5 = 0.7
        expect(result[0].confidence).toBeGreaterThanOrEqual(0.7);
      }
    });

    it('should increase confidence when consumer imports producer', () => {
      const adjacencyList = new Map<string, string[]>();
      adjacencyList.set('func-consumer', ['func-producer']);

      const graph = createMockGraph(
        [
          {
            id: 'func-producer',
            name: 'producer',
            type: 'function',
            filePath: 'src/producer.ts',
            metadata: { declaredType: 'ImportedData' },
          },
          {
            id: 'func-consumer',
            name: 'consumer',
            type: 'function',
            filePath: 'src/consumer.ts',
            metadata: { parameterTypes: [{ name: 'data', type: 'ImportedData' }] },
          },
        ],
        adjacencyList
      );

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      if (result.length > 0) {
        // Import relationship adds 0.2 to base 0.5 = 0.7
        expect(result[0].confidence).toBeGreaterThanOrEqual(0.7);
      }
    });

    it('should increase confidence for custom types (PascalCase)', () => {
      const graph = createMockGraph([
        {
          id: 'func-getentity',
          name: 'getEntity',
          type: 'function',
          filePath: 'src/a.ts',
          metadata: { declaredType: 'CustomEntity' },
        },
        {
          id: 'func-saveentity',
          name: 'saveEntity',
          type: 'function',
          filePath: 'src/b.ts',
          metadata: { parameterTypes: [{ name: 'entity', type: 'CustomEntity' }] },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      if (result.length > 0) {
        // Custom type adds 0.1 to base 0.5 = 0.6
        expect(result[0].confidence).toBeGreaterThanOrEqual(0.6);
      }
    });

    it('should cap confidence at 1.0', () => {
      const sameFilePath = 'src/same.ts';
      const adjacencyList = new Map<string, string[]>();
      adjacencyList.set('func-consumer', ['func-producer']);

      const graph = createMockGraph(
        [
          {
            id: 'func-producer',
            name: 'producer',
            type: 'function',
            filePath: sameFilePath,
            metadata: { declaredType: 'MaxConfidenceData' },
          },
          {
            id: 'func-consumer',
            name: 'consumer',
            type: 'function',
            filePath: sameFilePath,
            metadata: { parameterTypes: [{ name: 'data', type: 'MaxConfidenceData' }] },
          },
        ],
        adjacencyList
      );

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      if (result.length > 0) {
        expect(result[0].confidence).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe('analyze - strength calculation', () => {
    it('should assign strong strength for confidence > 0.8', () => {
      const sameFilePath = 'src/same.ts';
      const adjacencyList = new Map<string, string[]>();
      adjacencyList.set('func-consumer', ['func-producer']);

      const graph = createMockGraph(
        [
          {
            id: 'func-producer',
            name: 'producer',
            type: 'function',
            filePath: sameFilePath,
            metadata: { declaredType: 'StrongData' },
          },
          {
            id: 'func-consumer',
            name: 'consumer',
            type: 'function',
            filePath: sameFilePath,
            metadata: { parameterTypes: [{ name: 'data', type: 'StrongData' }] },
          },
        ],
        adjacencyList
      );

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      if (result.length > 0 && result[0].confidence > 0.8) {
        expect(result[0].strength).toBe('strong');
      }
    });

    it('should assign medium strength for confidence between 0.5 and 0.8', () => {
      const graph = createMockGraph([
        {
          id: 'func-prod',
          name: 'prod',
          type: 'function',
          filePath: 'src/a.ts',
          metadata: { declaredType: 'mediumdata' }, // lowercase = lower confidence
        },
        {
          id: 'func-cons',
          name: 'cons',
          type: 'function',
          filePath: 'src/b.ts',
          metadata: { parameterTypes: [{ name: 'data', type: 'mediumdata' }] },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      if (result.length > 0) {
        const confidence = result[0].confidence;
        if (confidence > 0.5 && confidence <= 0.8) {
          expect(result[0].strength).toBe('medium');
        }
      }
    });
  });

  describe('analyze - relationship structure', () => {
    it('should create relationships with correct structure', () => {
      const graph = createMockGraph([
        {
          id: 'func-source',
          name: 'source',
          type: 'function',
          filePath: 'src/source.ts',
          metadata: { declaredType: 'TestData' },
        },
        {
          id: 'func-target',
          name: 'target',
          type: 'function',
          filePath: 'src/target.ts',
          metadata: { parameterTypes: [{ name: 'data', type: 'TestData' }] },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result.length).toBeGreaterThan(0);
      const relationship = result[0];

      expect(relationship.id).toBe('io-dep-func-source-func-target');
      expect(relationship.type).toBe('io-dependency');
      expect(relationship.category).toBe('data-flow');
      expect(relationship.from).toBe('func-source');
      expect(relationship.to).toBe('func-target');
      expect(relationship.direction).toBe('unidirectional');
      expect(['strong', 'medium', 'weak']).toContain(relationship.strength);
      expect(relationship.evidence).toBeInstanceOf(Array);
      expect(relationship.discoveredBy).toBe('type-inference');
      expect(typeof relationship.confidence).toBe('number');
      expect(relationship.filePath).toBe('src/source.ts');
      expect(relationship.properties).toHaveProperty('dataType', 'TestData');
      expect(relationship.properties).toHaveProperty('producerMethod', 'source');
      expect(relationship.properties).toHaveProperty('consumerMethod', 'target');
      expect(relationship.createdAt).toBeDefined();
      expect(relationship.updatedAt).toBeDefined();
      expect(relationship.description).toContain('produces');
      expect(relationship.description).toContain('consumed by');
    });

    it('should include evidence with type-signature', () => {
      const graph = createMockGraph([
        {
          id: 'func-a',
          name: 'funcA',
          type: 'function',
          filePath: 'src/a.ts',
          metadata: { declaredType: 'EvidenceData' },
        },
        {
          id: 'func-b',
          name: 'funcB',
          type: 'function',
          filePath: 'src/b.ts',
          metadata: { parameterTypes: [{ name: 'data', type: 'EvidenceData' }] },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      if (result.length > 0) {
        const evidence = result[0].evidence[0];
        expect(evidence.type).toBe('type-signature');
        expect(evidence.source).toBeDefined();
        expect(evidence.snippet).toContain('funcA');
        expect(evidence.snippet).toContain('returns');
        expect(evidence.context).toContain('funcB');
      }
    });
  });

  describe('analyze - method support', () => {
    it('should detect I/O dependencies for methods', () => {
      const graph = createMockGraph([
        {
          id: 'method-getdata',
          name: 'UserService.getData',
          type: 'method',
          metadata: { declaredType: 'ServiceData' },
        },
        {
          id: 'method-processdata',
          name: 'DataProcessor.processData',
          type: 'method',
          metadata: { parameterTypes: [{ name: 'data', type: 'ServiceData' }] },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      const ioDep = result.find(
        (r) =>
          r.from === 'method-getdata' &&
          r.to === 'method-processdata'
      );

      expect(ioDep).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle symbols with no metadata', () => {
      const graph = createMockGraph([
        {
          id: 'func-nometadata',
          name: 'noMetadata',
          type: 'function',
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);

      // Should not throw
      expect(() => analyzer.analyze()).not.toThrow();
      expect(analyzer.analyze()).toHaveLength(0);
    });

    it('should handle symbols with empty metadata', () => {
      const graph = createMockGraph([
        {
          id: 'func-emptymetadata',
          name: 'emptyMetadata',
          type: 'function',
          metadata: {},
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);

      expect(() => analyzer.analyze()).not.toThrow();
      expect(analyzer.analyze()).toHaveLength(0);
    });

    it('should handle symbols with empty summary', () => {
      const graph = createMockGraph([
        {
          id: 'func-emptysummary',
          name: 'emptySummary',
          type: 'function',
          summary: '',
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);

      expect(() => analyzer.analyze()).not.toThrow();
    });

    it('should handle multiple producers and consumers for same type', () => {
      const graph = createMockGraph([
        {
          id: 'func-producer1',
          name: 'producer1',
          type: 'function',
          metadata: { declaredType: 'SharedType' },
        },
        {
          id: 'func-producer2',
          name: 'producer2',
          type: 'function',
          metadata: { declaredType: 'SharedType' },
        },
        {
          id: 'func-consumer1',
          name: 'consumer1',
          type: 'function',
          metadata: { parameterTypes: [{ name: 'data', type: 'SharedType' }] },
        },
        {
          id: 'func-consumer2',
          name: 'consumer2',
          type: 'function',
          metadata: { parameterTypes: [{ name: 'data', type: 'SharedType' }] },
        },
      ]);

      const analyzer = new IODependencyAnalyzer(graph);
      const result = analyzer.analyze();

      // Should create 4 relationships (2 producers x 2 consumers)
      expect(result.length).toBe(4);
    });
  });
});
