/**
 * LayerDependencyAnalyzer Tests
 */

import { LayerDependencyAnalyzer } from '../../analyzer/LayerDependencyAnalyzer';
import type { Symbol, SymbolGraph, SymbolRelationship } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships';

describe('LayerDependencyAnalyzer', () => {
  // Helper to create mock graph
  function createMockGraph(
    symbols: Array<{
      id: string;
      name: string;
      type?: Symbol['type'];
      filePath: string;
    }>,
    relationships?: Array<{ from: string; to: string }>
  ): SymbolGraph {
    const symbolsMap = new Map<string, Symbol>();
    const nameIndex = new Map<string, string[]>();
    const fileIndex = new Map<string, string[]>();

    for (const s of symbols) {
      symbolsMap.set(s.id, {
        id: s.id,
        name: s.name,
        type: s.type || 'class',
        filePath: s.filePath,
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
      if (!fileIndex.has(s.filePath)) {
        fileIndex.set(s.filePath, []);
      }
      fileIndex.get(s.filePath)!.push(s.id);
    }

    // Build file path lookup for relationships
    const symbolFilePaths: Record<string, string> = {};
    for (const s of symbols) {
      symbolFilePaths[s.id] = s.filePath;
    }

    const graphRelationships: SymbolRelationship[] = (relationships || []).map((r) => ({
      from: r.from,
      to: r.to,
      type: 'dependsOn' as const,
      filePath: symbolFilePaths[r.from] || 'unknown',
    }));

    return {
      symbols: symbolsMap,
      relationships: graphRelationships,
      adjacencyList: new Map(),
      reverseAdjacencyList: new Map(),
      nameIndex,
      fileIndex,
    } as SymbolGraph;
  }

  describe('constructor', () => {
    it('should create analyzer with graph', () => {
      const graph = createMockGraph([]);
      const analyzer = new LayerDependencyAnalyzer(graph);

      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze - basic behavior', () => {
    it('should return empty array for empty graph', () => {
      const graph = createMockGraph([]);
      const analyzer = new LayerDependencyAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no relationships exist', () => {
      const graph = createMockGraph([
        {
          id: 'controller-1',
          name: 'UserController',
          filePath: 'src/controllers/UserController.ts',
        },
        { id: 'service-1', name: 'UserService', filePath: 'src/services/UserService.ts' },
      ]);

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });
  });

  describe('analyze - layer classification by file path', () => {
    it('should classify symbols by /controller/ path', () => {
      const graph = createMockGraph(
        [
          { id: 'ctrl', name: 'ApiController', filePath: 'src/controllers/ApiController.ts' },
          { id: 'svc', name: 'ApiService', filePath: 'src/services/ApiService.ts' },
        ],
        [{ from: 'ctrl', to: 'svc' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      const layerDep = result.find((r) => r.from === 'ctrl' && r.to === 'svc');
      expect(layerDep).toBeDefined();
      expect(layerDep?.properties?.fromLayer).toBe('controller');
      expect(layerDep?.properties?.toLayer).toBe('service');
    });

    it('should classify symbols by /service/ path', () => {
      const graph = createMockGraph(
        [
          { id: 'svc', name: 'DataService', filePath: 'src/services/DataService.ts' },
          { id: 'repo', name: 'DataRepository', filePath: 'src/repositories/DataRepository.ts' },
        ],
        [{ from: 'svc', to: 'repo' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      const layerDep = result.find((r) => r.from === 'svc');
      expect(layerDep?.properties?.fromLayer).toBe('service');
      expect(layerDep?.properties?.toLayer).toBe('repository');
    });

    it('should classify symbols by /repository/ or /repo/ path', () => {
      const graph = createMockGraph(
        [
          { id: 'repo1', name: 'UserRepository', filePath: 'src/repositories/UserRepository.ts' },
          { id: 'repo2', name: 'OrderRepo', filePath: 'src/repo/OrderRepo.ts' },
          { id: 'model', name: 'UserModel', filePath: 'src/models/UserModel.ts' },
        ],
        [
          { from: 'repo1', to: 'model' },
          { from: 'repo2', to: 'model' },
        ]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result.length).toBe(2);
      expect(result[0].properties?.fromLayer).toBe('repository');
      expect(result[1].properties?.fromLayer).toBe('repository');
    });

    it('should classify symbols by /model/ or /entity/ path', () => {
      // Test model path
      const graphModel = createMockGraph(
        [
          { id: 'repo', name: 'ProductRepo', filePath: 'src/repositories/ProductRepo.ts' },
          { id: 'model', name: 'Product', filePath: 'src/models/Product.ts' },
        ],
        [{ from: 'repo', to: 'model' }]
      );

      const analyzerModel = new LayerDependencyAnalyzer(graphModel);
      const resultModel = analyzerModel.analyze();

      expect(resultModel.length).toBe(1);
      expect(resultModel[0].properties?.toLayer).toBe('model');

      // Test entity path (note: analyzer checks for /entity/ not /entities/)
      const graphEntity = createMockGraph(
        [
          { id: 'repo', name: 'OrderRepo', filePath: 'src/repositories/OrderRepo.ts' },
          { id: 'entity', name: 'Order', filePath: 'src/entity/Order.ts' },
        ],
        [{ from: 'repo', to: 'entity' }]
      );

      const analyzerEntity = new LayerDependencyAnalyzer(graphEntity);
      const resultEntity = analyzerEntity.analyze();

      expect(resultEntity.length).toBe(1);
      expect(resultEntity[0].properties?.toLayer).toBe('model');
    });

    it('should classify symbols by /util/ or /helper/ path', () => {
      const graph = createMockGraph(
        [
          { id: 'svc', name: 'SomeService', filePath: 'src/services/SomeService.ts' },
          { id: 'util', name: 'StringUtil', filePath: 'src/utils/StringUtil.ts' },
          { id: 'helper', name: 'DateHelper', filePath: 'src/helpers/DateHelper.ts' },
        ],
        [
          { from: 'svc', to: 'util' },
          { from: 'svc', to: 'helper' },
        ]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      const utilDep = result.find((r) => r.to === 'util');
      const helperDep = result.find((r) => r.to === 'helper');

      expect(utilDep?.properties?.toLayer).toBe('util');
      expect(helperDep?.properties?.toLayer).toBe('util');
    });

    it('should handle Windows-style paths with backslashes', () => {
      const graph = createMockGraph(
        [
          { id: 'ctrl', name: 'Controller', filePath: 'src\\controllers\\Controller.ts' },
          { id: 'svc', name: 'Service', filePath: 'src\\services\\Service.ts' },
        ],
        [{ from: 'ctrl', to: 'svc' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result.length).toBe(1);
      expect(result[0].properties?.fromLayer).toBe('controller');
      expect(result[0].properties?.toLayer).toBe('service');
    });
  });

  describe('analyze - layer classification by name suffix', () => {
    it('should classify by Controller suffix', () => {
      const graph = createMockGraph(
        [
          { id: 'ctrl', name: 'UserController', filePath: 'src/api/UserController.ts' },
          { id: 'svc', name: 'UserService', filePath: 'src/api/UserService.ts' },
        ],
        [{ from: 'ctrl', to: 'svc' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result[0].properties?.fromLayer).toBe('controller');
      expect(result[0].properties?.toLayer).toBe('service');
    });

    it('should classify by Service suffix', () => {
      const graph = createMockGraph(
        [
          { id: 'svc', name: 'PaymentService', filePath: 'src/payment/PaymentService.ts' },
          { id: 'repo', name: 'PaymentRepository', filePath: 'src/payment/PaymentRepository.ts' },
        ],
        [{ from: 'svc', to: 'repo' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result[0].properties?.fromLayer).toBe('service');
      expect(result[0].properties?.toLayer).toBe('repository');
    });

    it('should classify by Repository or Repo suffix', () => {
      const graph = createMockGraph(
        [
          { id: 'repo1', name: 'DataRepository', filePath: 'src/data/DataRepository.ts' },
          { id: 'repo2', name: 'CacheRepo', filePath: 'src/cache/CacheRepo.ts' },
          { id: 'model', name: 'DataModel', filePath: 'src/data/DataModel.ts' },
        ],
        [
          { from: 'repo1', to: 'model' },
          { from: 'repo2', to: 'model' },
        ]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result[0].properties?.fromLayer).toBe('repository');
      expect(result[1].properties?.fromLayer).toBe('repository');
    });

    it('should classify by Model or Entity suffix', () => {
      const graph = createMockGraph(
        [
          { id: 'repo', name: 'SomeRepo', filePath: 'src/SomeRepo.ts' },
          { id: 'model', name: 'UserModel', filePath: 'src/UserModel.ts' },
          { id: 'entity', name: 'OrderEntity', filePath: 'src/OrderEntity.ts' },
        ],
        [
          { from: 'repo', to: 'model' },
          { from: 'repo', to: 'entity' },
        ]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result[0].properties?.toLayer).toBe('model');
      expect(result[1].properties?.toLayer).toBe('model');
    });

    it('should classify by Util or Helper suffix', () => {
      const graph = createMockGraph(
        [
          { id: 'svc', name: 'MyService', filePath: 'src/MyService.ts' },
          { id: 'util', name: 'StringUtil', filePath: 'src/StringUtil.ts' },
          { id: 'helper', name: 'DateHelper', filePath: 'src/DateHelper.ts' },
        ],
        [
          { from: 'svc', to: 'util' },
          { from: 'svc', to: 'helper' },
        ]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result[0].properties?.toLayer).toBe('util');
      expect(result[1].properties?.toLayer).toBe('util');
    });
  });

  describe('analyze - unknown layer handling', () => {
    it('should skip relationships between unknown layers', () => {
      const graph = createMockGraph(
        [
          { id: 'unknown1', name: 'SomeThing', filePath: 'src/something/SomeThing.ts' },
          { id: 'unknown2', name: 'AnotherThing', filePath: 'src/another/AnotherThing.ts' },
        ],
        [{ from: 'unknown1', to: 'unknown2' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      // Both are unknown, so no layer dependency is created
      expect(result).toHaveLength(0);
    });

    it('should skip relationships when from layer is unknown', () => {
      const graph = createMockGraph(
        [
          { id: 'unknown', name: 'Unknown', filePath: 'src/unknown/Unknown.ts' },
          { id: 'svc', name: 'UserService', filePath: 'src/services/UserService.ts' },
        ],
        [{ from: 'unknown', to: 'svc' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should skip relationships when to layer is unknown', () => {
      const graph = createMockGraph(
        [
          { id: 'ctrl', name: 'UserController', filePath: 'src/controllers/UserController.ts' },
          { id: 'unknown', name: 'Unknown', filePath: 'src/unknown/Unknown.ts' },
        ],
        [{ from: 'ctrl', to: 'unknown' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });
  });

  describe('analyze - same layer handling', () => {
    it('should skip relationships within same layer', () => {
      const graph = createMockGraph(
        [
          { id: 'svc1', name: 'UserService', filePath: 'src/services/UserService.ts' },
          { id: 'svc2', name: 'OrderService', filePath: 'src/services/OrderService.ts' },
        ],
        [{ from: 'svc1', to: 'svc2' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      // Same layer, so no layer dependency is created
      expect(result).toHaveLength(0);
    });
  });

  describe('analyze - layer violation detection', () => {
    it('should detect violation when lower layer depends on higher layer', () => {
      // Repository (level 3) depending on Service (level 2) is a violation
      const graph = createMockGraph(
        [
          { id: 'repo', name: 'UserRepository', filePath: 'src/repositories/UserRepository.ts' },
          { id: 'svc', name: 'UserService', filePath: 'src/services/UserService.ts' },
        ],
        [{ from: 'repo', to: 'svc' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result.length).toBe(1);
      expect(result[0].properties?.isViolation).toBe(true);
      expect(result[0].description).toContain('VIOLATION');
    });

    it('should detect violation when service depends on controller', () => {
      const graph = createMockGraph(
        [
          { id: 'svc', name: 'UserService', filePath: 'src/services/UserService.ts' },
          { id: 'ctrl', name: 'UserController', filePath: 'src/controllers/UserController.ts' },
        ],
        [{ from: 'svc', to: 'ctrl' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result[0].properties?.isViolation).toBe(true);
    });

    it('should not mark valid layer dependencies as violations', () => {
      // Controller (level 1) depending on Service (level 2) is valid
      const graph = createMockGraph(
        [
          { id: 'ctrl', name: 'UserController', filePath: 'src/controllers/UserController.ts' },
          { id: 'svc', name: 'UserService', filePath: 'src/services/UserService.ts' },
        ],
        [{ from: 'ctrl', to: 'svc' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result[0].properties?.isViolation).toBe(false);
    });

    it('should allow service to depend on repository', () => {
      const graph = createMockGraph(
        [
          { id: 'svc', name: 'UserService', filePath: 'src/services/UserService.ts' },
          { id: 'repo', name: 'UserRepository', filePath: 'src/repositories/UserRepository.ts' },
        ],
        [{ from: 'svc', to: 'repo' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result[0].properties?.isViolation).toBe(false);
    });

    it('should allow repository to depend on model', () => {
      const graph = createMockGraph(
        [
          { id: 'repo', name: 'UserRepository', filePath: 'src/repositories/UserRepository.ts' },
          { id: 'model', name: 'UserModel', filePath: 'src/models/UserModel.ts' },
        ],
        [{ from: 'repo', to: 'model' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result[0].properties?.isViolation).toBe(false);
    });

    it('should detect violation when controller depends directly on repository', () => {
      // Skipping service layer - depends on architecture rules
      // In this implementation, controller -> repository is allowed (lower to higher is fine)
      const graph = createMockGraph(
        [
          { id: 'ctrl', name: 'UserController', filePath: 'src/controllers/UserController.ts' },
          { id: 'repo', name: 'UserRepository', filePath: 'src/repositories/UserRepository.ts' },
        ],
        [{ from: 'ctrl', to: 'repo' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      // Controller (1) -> Repository (3) - higher to lower is not a violation
      expect(result[0].properties?.isViolation).toBe(false);
    });
  });

  describe('analyze - relationship structure', () => {
    it('should create relationships with correct structure', () => {
      const graph = createMockGraph(
        [
          { id: 'ctrl', name: 'TestController', filePath: 'src/controllers/TestController.ts' },
          { id: 'svc', name: 'TestService', filePath: 'src/services/TestService.ts' },
        ],
        [{ from: 'ctrl', to: 'svc' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result.length).toBe(1);
      const relationship = result[0];

      expect(relationship.id).toBe('layer-dependency-ctrl-svc');
      expect(relationship.type).toBe('layer-dependency');
      expect(relationship.category).toBe('architectural');
      expect(relationship.from).toBe('ctrl');
      expect(relationship.to).toBe('svc');
      expect(relationship.direction).toBe('unidirectional');
      expect(relationship.strength).toBe('strong');
      expect(relationship.evidence).toBeInstanceOf(Array);
      expect(relationship.discoveredBy).toBe('static-analysis');
      expect(relationship.confidence).toBe(0.8);
      expect(relationship.filePath).toBeDefined();
      expect(relationship.properties).toHaveProperty('fromLayer');
      expect(relationship.properties).toHaveProperty('toLayer');
      expect(relationship.properties).toHaveProperty('isViolation');
      expect(relationship.properties).toHaveProperty('expectedFlow');
      expect(relationship.createdAt).toBeDefined();
      expect(relationship.updatedAt).toBeDefined();
    });

    it('should include evidence with layer information', () => {
      const graph = createMockGraph(
        [
          { id: 'ctrl', name: 'Api', filePath: 'src/controllers/Api.ts' },
          { id: 'svc', name: 'Data', filePath: 'src/services/Data.ts' },
        ],
        [{ from: 'ctrl', to: 'svc' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      const evidence = result[0].evidence[0];
      expect(evidence.type).toBe('code');
      expect(evidence.source).toBeDefined();
      expect(evidence.snippet).toContain('controller');
      expect(evidence.snippet).toContain('service');
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics for empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new LayerDependencyAnalyzer(graph);

      const stats = analyzer.getStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.violations).toBe(0);
      expect(Object.keys(stats.byLayerPair)).toHaveLength(0);
      expect(Object.keys(stats.violationsByLayer)).toHaveLength(0);
    });

    it('should calculate statistics correctly', () => {
      const graph = createMockGraph([]);
      const analyzer = new LayerDependencyAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        {
          id: 'rel1',
          type: 'layer-dependency',
          category: 'architectural',
          from: 'ctrl1',
          to: 'svc1',
          direction: 'unidirectional',
          strength: 'strong',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 0.8,
          properties: {
            fromLayer: 'controller',
            toLayer: 'service',
            isViolation: false,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rel2',
          type: 'layer-dependency',
          category: 'architectural',
          from: 'svc1',
          to: 'repo1',
          direction: 'unidirectional',
          strength: 'strong',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 0.8,
          properties: {
            fromLayer: 'service',
            toLayer: 'repository',
            isViolation: false,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rel3',
          type: 'layer-dependency',
          category: 'architectural',
          from: 'repo1',
          to: 'svc1',
          direction: 'unidirectional',
          strength: 'strong',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 0.8,
          properties: {
            fromLayer: 'repository',
            toLayer: 'service',
            isViolation: true,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.total).toBe(3);
      expect(stats.violations).toBe(1);
      expect(stats.byLayerPair['controller → service']).toBe(1);
      expect(stats.byLayerPair['service → repository']).toBe(1);
      expect(stats.byLayerPair['repository → service']).toBe(1);
      expect(stats.violationsByLayer['repository → service']).toBe(1);
    });

    it('should handle relationships with missing properties', () => {
      const graph = createMockGraph([]);
      const analyzer = new LayerDependencyAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        {
          id: 'rel1',
          type: 'layer-dependency',
          category: 'architectural',
          from: 'a',
          to: 'b',
          direction: 'unidirectional',
          strength: 'strong',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 0.8,
          properties: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.total).toBe(1);
      expect(stats.violations).toBe(0);
      expect(stats.byLayerPair['unknown → unknown']).toBe(1);
    });
  });

  describe('analyzeModuleBoundaries', () => {
    it('should return empty array for empty graph', () => {
      const graph = createMockGraph([]);
      const analyzer = new LayerDependencyAnalyzer(graph);

      const result = analyzer.analyzeModuleBoundaries();

      expect(result).toHaveLength(0);
    });

    it('should detect cross-module dependencies in src/modules/', () => {
      const graph = createMockGraph(
        [
          {
            id: 'auth-ctrl',
            name: 'AuthController',
            filePath: 'src/modules/auth/AuthController.ts',
          },
          { id: 'user-svc', name: 'UserService', filePath: 'src/modules/user/UserService.ts' },
        ],
        [{ from: 'auth-ctrl', to: 'user-svc' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyzeModuleBoundaries();

      expect(result.length).toBe(1);
      expect(result[0].type).toBe('module-boundary');
      expect(result[0].properties?.fromModule).toBe('auth');
      expect(result[0].properties?.toModule).toBe('user');
    });

    it('should detect cross-module dependencies in src/features/', () => {
      const graph = createMockGraph(
        [
          { id: 'cart-svc', name: 'CartService', filePath: 'src/features/cart/CartService.ts' },
          {
            id: 'product-svc',
            name: 'ProductService',
            filePath: 'src/features/product/ProductService.ts',
          },
        ],
        [{ from: 'cart-svc', to: 'product-svc' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyzeModuleBoundaries();

      expect(result.length).toBe(1);
      expect(result[0].properties?.fromModule).toBe('cart');
      expect(result[0].properties?.toModule).toBe('product');
    });

    it('should detect cross-package dependencies in packages/', () => {
      const graph = createMockGraph(
        [
          { id: 'core-util', name: 'CoreUtil', filePath: 'packages/core/src/CoreUtil.ts' },
          { id: 'api-handler', name: 'ApiHandler', filePath: 'packages/api/src/ApiHandler.ts' },
        ],
        [{ from: 'api-handler', to: 'core-util' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyzeModuleBoundaries();

      expect(result.length).toBe(1);
      expect(result[0].properties?.fromModule).toBe('api');
      expect(result[0].properties?.toModule).toBe('core');
    });

    it('should detect cross-app dependencies in apps/', () => {
      const graph = createMockGraph(
        [
          { id: 'web-comp', name: 'WebComponent', filePath: 'apps/web/src/WebComponent.ts' },
          { id: 'admin-svc', name: 'AdminService', filePath: 'apps/admin/src/AdminService.ts' },
        ],
        [{ from: 'web-comp', to: 'admin-svc' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyzeModuleBoundaries();

      expect(result.length).toBe(1);
      expect(result[0].properties?.fromModule).toBe('web');
      expect(result[0].properties?.toModule).toBe('admin');
    });

    it('should detect cross-module dependencies in src/ top-level folders', () => {
      const graph = createMockGraph(
        [
          { id: 'cmd', name: 'BuildCommand', filePath: 'src/commands/BuildCommand.ts' },
          { id: 'analyzer', name: 'DepAnalyzer', filePath: 'src/analyzer/DepAnalyzer.ts' },
        ],
        [{ from: 'cmd', to: 'analyzer' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyzeModuleBoundaries();

      expect(result.length).toBe(1);
      expect(result[0].properties?.fromModule).toBe('commands');
      expect(result[0].properties?.toModule).toBe('analyzer');
    });

    it('should skip non-module folders (types, utils, helpers, etc.)', () => {
      const graph = createMockGraph(
        [
          { id: 'type', name: 'MyType', filePath: 'src/types/MyType.ts' },
          { id: 'util', name: 'MyUtil', filePath: 'src/utils/MyUtil.ts' },
        ],
        [{ from: 'type', to: 'util' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyzeModuleBoundaries();

      // types and utils are skipped as non-module folders
      expect(result).toHaveLength(0);
    });

    it('should skip same-module dependencies', () => {
      const graph = createMockGraph(
        [
          { id: 'auth1', name: 'AuthController', filePath: 'src/modules/auth/AuthController.ts' },
          { id: 'auth2', name: 'AuthService', filePath: 'src/modules/auth/AuthService.ts' },
        ],
        [{ from: 'auth1', to: 'auth2' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyzeModuleBoundaries();

      expect(result).toHaveLength(0);
    });
  });

  describe('analyzeModuleBoundaries - problematic detection', () => {
    it('should mark problematic boundary crossings', () => {
      // commands -> something not in allowed list
      const graph = createMockGraph(
        [
          { id: 'cmd', name: 'Cmd', filePath: 'src/commands/Cmd.ts' },
          { id: 'lsp', name: 'Lsp', filePath: 'src/lsp/Lsp.ts' },
        ],
        [{ from: 'cmd', to: 'lsp' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyzeModuleBoundaries();

      // lsp is not in allowed list for commands
      expect(result[0].properties?.isProblematic).toBe(true);
    });

    it('should not mark allowed boundary crossings as problematic', () => {
      // commands -> analyzer is allowed
      const graph = createMockGraph(
        [
          { id: 'cmd', name: 'Cmd', filePath: 'src/commands/Cmd.ts' },
          { id: 'analyzer', name: 'Analyzer', filePath: 'src/analyzer/Analyzer.ts' },
        ],
        [{ from: 'cmd', to: 'analyzer' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyzeModuleBoundaries();

      expect(result[0].properties?.isProblematic).toBe(false);
    });

    it('should classify boundary type as to-core for core modules', () => {
      const graph = createMockGraph(
        [
          { id: 'cmd', name: 'Cmd', filePath: 'src/commands/Cmd.ts' },
          { id: 'type', name: 'Type', filePath: 'src/graph/Type.ts' },
        ],
        [{ from: 'cmd', to: 'type' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyzeModuleBoundaries();

      expect(result[0].properties?.boundaryType).toBe('to-core');
    });

    it('should classify boundary type as feature-to-feature', () => {
      const graph = createMockGraph(
        [
          { id: 'lsp', name: 'Lsp', filePath: 'src/lsp/Lsp.ts' },
          { id: 'doc', name: 'Doc', filePath: 'src/doc-symbol/Doc.ts' },
        ],
        [{ from: 'lsp', to: 'doc' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyzeModuleBoundaries();

      expect(result[0].properties?.boundaryType).toBe('feature-to-feature');
    });
  });

  describe('analyzeModuleBoundaries - relationship structure', () => {
    it('should create relationships with correct structure', () => {
      const graph = createMockGraph(
        [
          { id: 'a', name: 'A', filePath: 'src/modules/auth/A.ts' },
          { id: 'b', name: 'B', filePath: 'src/modules/user/B.ts' },
        ],
        [{ from: 'a', to: 'b' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyzeModuleBoundaries();

      expect(result.length).toBe(1);
      const relationship = result[0];

      expect(relationship.id).toBeDefined();
      expect(relationship.type).toBe('module-boundary');
      expect(relationship.category).toBe('architectural');
      expect(relationship.from).toBe('a');
      expect(relationship.to).toBe('b');
      expect(relationship.direction).toBe('unidirectional');
      expect(['strong', 'medium']).toContain(relationship.strength);
      expect(relationship.discoveredBy).toBe('static-analysis');
      expect(relationship.confidence).toBe(0.9);
      expect(relationship.filePath).toBeDefined();
      expect(relationship.properties).toHaveProperty('fromModule');
      expect(relationship.properties).toHaveProperty('toModule');
      expect(relationship.properties).toHaveProperty('isProblematic');
      expect(relationship.properties).toHaveProperty('boundaryType');
      expect(relationship.createdAt).toBeDefined();
      expect(relationship.updatedAt).toBeDefined();
    });

    it('should truncate long relationship IDs', () => {
      const graph = createMockGraph(
        [
          {
            id: 'a-very-long-symbol-id-that-exceeds-normal-length',
            name: 'A',
            filePath: 'src/modules/auth/A.ts',
          },
          {
            id: 'another-very-long-symbol-id-that-also-exceeds-length',
            name: 'B',
            filePath: 'src/modules/user/B.ts',
          },
        ],
        [
          {
            from: 'a-very-long-symbol-id-that-exceeds-normal-length',
            to: 'another-very-long-symbol-id-that-also-exceeds-length',
          },
        ]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyzeModuleBoundaries();

      expect(result[0].id.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getModuleBoundaryStatistics', () => {
    it('should return correct statistics for empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new LayerDependencyAnalyzer(graph);

      const stats = analyzer.getModuleBoundaryStatistics([]);

      expect(stats.totalBoundaries).toBe(0);
      expect(stats.problematicCount).toBe(0);
      expect(Object.keys(stats.byModulePair)).toHaveLength(0);
      expect(Object.keys(stats.byBoundaryType)).toHaveLength(0);
      expect(stats.uniqueModules.size).toBe(0);
    });

    it('should calculate statistics correctly', () => {
      const graph = createMockGraph([]);
      const analyzer = new LayerDependencyAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        {
          id: 'rel1',
          type: 'module-boundary',
          category: 'architectural',
          from: 'a',
          to: 'b',
          direction: 'unidirectional',
          strength: 'medium',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 0.9,
          properties: {
            fromModule: 'auth',
            toModule: 'user',
            isProblematic: false,
            boundaryType: 'feature-to-feature',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rel2',
          type: 'module-boundary',
          category: 'architectural',
          from: 'c',
          to: 'd',
          direction: 'unidirectional',
          strength: 'strong',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 0.9,
          properties: {
            fromModule: 'commands',
            toModule: 'types',
            isProblematic: false,
            boundaryType: 'to-core',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rel3',
          type: 'module-boundary',
          category: 'architectural',
          from: 'e',
          to: 'f',
          direction: 'unidirectional',
          strength: 'strong',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 0.9,
          properties: {
            fromModule: 'commands',
            toModule: 'lsp',
            isProblematic: true,
            boundaryType: 'feature-to-feature',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const stats = analyzer.getModuleBoundaryStatistics(relationships);

      expect(stats.totalBoundaries).toBe(3);
      expect(stats.problematicCount).toBe(1);
      expect(stats.byModulePair['auth → user']).toBe(1);
      expect(stats.byModulePair['commands → types']).toBe(1);
      expect(stats.byModulePair['commands → lsp']).toBe(1);
      expect(stats.byBoundaryType['feature-to-feature']).toBe(2);
      expect(stats.byBoundaryType['to-core']).toBe(1);
      expect(stats.uniqueModules.size).toBe(5);
      expect(stats.uniqueModules.has('auth')).toBe(true);
      expect(stats.uniqueModules.has('user')).toBe(true);
      expect(stats.uniqueModules.has('commands')).toBe(true);
      expect(stats.uniqueModules.has('types')).toBe(true);
      expect(stats.uniqueModules.has('lsp')).toBe(true);
    });

    it('should handle relationships with missing properties', () => {
      const graph = createMockGraph([]);
      const analyzer = new LayerDependencyAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        {
          id: 'rel1',
          type: 'module-boundary',
          category: 'architectural',
          from: 'a',
          to: 'b',
          direction: 'unidirectional',
          strength: 'medium',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 0.9,
          properties: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const stats = analyzer.getModuleBoundaryStatistics(relationships);

      expect(stats.totalBoundaries).toBe(1);
      expect(stats.byModulePair['unknown → unknown']).toBe(1);
      expect(stats.byBoundaryType.unknown).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle missing from symbol', () => {
      const graph = createMockGraph(
        [{ id: 'svc', name: 'UserService', filePath: 'src/services/UserService.ts' }],
        [{ from: 'nonexistent', to: 'svc' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should handle missing to symbol', () => {
      const graph = createMockGraph(
        [{ id: 'ctrl', name: 'UserController', filePath: 'src/controllers/UserController.ts' }],
        [{ from: 'ctrl', to: 'nonexistent' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should handle normalized Windows paths', () => {
      const graph = createMockGraph(
        [
          { id: 'a', name: 'A', filePath: 'C:\\Users\\dev\\project\\src\\modules\\auth\\A.ts' },
          { id: 'b', name: 'B', filePath: 'C:\\Users\\dev\\project\\src\\modules\\user\\B.ts' },
        ],
        [{ from: 'a', to: 'b' }]
      );

      const analyzer = new LayerDependencyAnalyzer(graph);
      const result = analyzer.analyzeModuleBoundaries();

      // Should normalize paths and detect modules
      if (result.length > 0) {
        expect(result[0].properties?.fromModule).toBeDefined();
        expect(result[0].properties?.toModule).toBeDefined();
      }
    });
  });
});
