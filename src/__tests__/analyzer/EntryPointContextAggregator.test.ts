/**
 * EntryPointContextAggregator Tests
 */

import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { EntryPointContextAggregator, UnifiedContext } from '../../analyzer/EntryPointContextAggregator';
import { DatabaseManager } from '../../storage/DatabaseManager';
import type { Symbol } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships/unified';

describe('EntryPointContextAggregator', () => {
  let tempDir: string;
  let dbPath: string;
  let jsonlPath: string;
  let dbManager: DatabaseManager;
  let aggregator: EntryPointContextAggregator;

  beforeEach(() => {
    // Create temp directory for test database
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aggregator-test-'));
    dbPath = path.join(tempDir, 'test.db');
    jsonlPath = path.join(tempDir, 'jsonl');

    // Ensure jsonl directory exists
    fs.mkdirSync(jsonlPath, { recursive: true });

    // Create database manager
    dbManager = new DatabaseManager(dbPath, jsonlPath);
    aggregator = new EntryPointContextAggregator(dbManager);
  });

  afterEach(() => {
    // Close database and cleanup
    try {
      dbManager.close();
    } catch {
      // Ignore close errors
    }

    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // Helper to create a symbol
  function createSymbol(
    id: string,
    name: string,
    filePath: string = 'src/test.ts',
    isExported: boolean = true
  ): Symbol {
    return {
      id,
      name,
      type: 'class',
      filePath,
      line: 1,
      column: 1,
      isExported,
      isPublic: true,
      tests: [],
      designDecisions: [],
    };
  }

  // Helper to insert a symbol into database
  function insertSymbol(symbol: Symbol): void {
    dbManager.insertSymbol(symbol, 0);
  }

  // Helper to insert unified relationship
  function insertRelationship(rel: {
    id: string;
    type: string;
    category: string;
    from: string | string[];
    to: string | string[];
    direction?: string;
    strength?: string;
    properties?: Record<string, any>;
  }): void {
    dbManager.insertUnifiedRelationship({
      id: rel.id,
      type: rel.type,
      category: rel.category,
      fromSymbols: Array.isArray(rel.from) ? rel.from : [rel.from],
      toSymbols: Array.isArray(rel.to) ? rel.to : [rel.to],
      direction: rel.direction || 'unidirectional',
      strength: rel.strength || 'strong',
      evidence: [],
      discoveredBy: 'static-analysis',
      confidence: 1.0,
      properties: rel.properties || {},
    });
  }

  describe('constructor', () => {
    it('should create aggregator with database manager', () => {
      expect(aggregator).toBeDefined();
    });
  });

  describe('gatherContext - entry point type detection', () => {
    it('should detect file entry point by path with slash', () => {
      const context = aggregator.gatherContext('src/services/UserService.ts');
      expect(context.entryPointType).toBe('file');
    });

    it('should detect file entry point by .ts extension', () => {
      const context = aggregator.gatherContext('UserService.ts');
      expect(context.entryPointType).toBe('file');
    });

    it('should detect document entry point by [[]] syntax', () => {
      const context = aggregator.gatherContext('[[FeatureName]]');
      expect(context.entryPointType).toBe('document');
    });

    it('should detect document entry point by spaces', () => {
      const context = aggregator.gatherContext('Feature Name Document');
      expect(context.entryPointType).toBe('document');
    });

    it('should detect symbol entry point for kebab-case IDs', () => {
      const context = aggregator.gatherContext('user-service');
      expect(context.entryPointType).toBe('symbol');
    });

    it('should detect symbol entry point for simple identifiers', () => {
      const context = aggregator.gatherContext('UserService');
      expect(context.entryPointType).toBe('symbol');
    });
  });

  describe('gatherContext - file entry point', () => {
    it('should gather all symbols in a file', () => {
      // Insert symbols in same file
      const sym1 = createSymbol('service-a', 'ServiceA', 'src/services.ts');
      const sym2 = createSymbol('service-b', 'ServiceB', 'src/services.ts');
      insertSymbol(sym1);
      insertSymbol(sym2);

      const context = aggregator.gatherContext('src/services.ts');

      expect(context.entryPointType).toBe('file');
      expect(context.fileSymbols?.length).toBe(2);
    });

    it('should set first exported symbol as primary', () => {
      // Insert symbols - first is exported, second is not
      const exported = createSymbol('exported', 'Exported', 'src/test.ts', true);
      const internal = createSymbol('internal', 'Internal', 'src/test.ts', false);
      insertSymbol(internal);
      insertSymbol(exported);

      const context = aggregator.gatherContext('src/test.ts');

      expect(context.primarySymbol?.id).toBe('exported');
    });

    it('should handle file with no symbols', () => {
      const context = aggregator.gatherContext('src/empty.ts');

      expect(context.fileSymbols).toEqual([]);
      expect(context.primarySymbol).toBeUndefined();
    });

    it('should normalize absolute file paths', () => {
      const sym = createSymbol('test', 'Test', 'src/test.ts');
      insertSymbol(sym);

      // Use absolute path
      const absolutePath = path.join(process.cwd(), 'src/test.ts');
      const context = aggregator.gatherContext(absolutePath);

      expect(context.fileSymbols?.length).toBe(1);
    });
  });

  describe('gatherContext - symbol entry point', () => {
    it('should get primary symbol details', () => {
      const sym = createSymbol('user-service', 'UserService', 'src/user-service.ts');
      insertSymbol(sym);

      const context = aggregator.gatherContext('user-service');

      expect(context.entryPointType).toBe('symbol');
      expect(context.primarySymbol?.id).toBe('user-service');
      expect(context.primarySymbol?.name).toBe('UserService');
    });

    it('should gather dependencies (code-dependency from this symbol)', () => {
      const source = createSymbol('user-service', 'UserService');
      const target = createSymbol('user-repository', 'UserRepository');
      insertSymbol(source);
      insertSymbol(target);

      insertRelationship({
        id: 'dep-1',
        type: 'code-dependency',
        category: 'structural',
        from: 'user-service',
        to: 'user-repository',
      });

      const context = aggregator.gatherContext('user-service');

      expect(context.dependencies.length).toBe(1);
      expect(context.dependencies[0].symbolId).toBe('user-repository');
      expect(context.dependencies[0].relationship).toBe('import');
    });

    it('should gather usedBy (code-dependency to this symbol)', () => {
      const source = createSymbol('user-controller', 'UserController');
      const target = createSymbol('user-service', 'UserService');
      insertSymbol(source);
      insertSymbol(target);

      insertRelationship({
        id: 'dep-1',
        type: 'code-dependency',
        category: 'structural',
        from: 'user-controller',
        to: 'user-service',
      });

      const context = aggregator.gatherContext('user-service');

      expect(context.usedBy.length).toBe(1);
      expect(context.usedBy[0].symbolId).toBe('user-controller');
    });

    it('should gather doc references (doc-reference from this symbol)', () => {
      const sym = createSymbol('user-service', 'UserService');
      insertSymbol(sym);

      insertRelationship({
        id: 'doc-1',
        type: 'doc-reference',
        category: 'semantic',
        from: 'user-service',
        to: 'UserServiceFeature',
        properties: { section: 'Overview' },
      });

      const context = aggregator.gatherContext('user-service');

      expect(context.docReferences.length).toBe(1);
      expect(context.docReferences[0].docSymbol).toBe('UserServiceFeature');
      expect(context.docReferences[0].section).toBe('Overview');
    });

    it('should gather referenced by docs (inferred doc-reference)', () => {
      const sym = createSymbol('user-service', 'UserService');
      insertSymbol(sym);

      insertRelationship({
        id: 'doc-2',
        type: 'doc-reference',
        category: 'semantic',
        from: 'FeatureDoc',
        to: 'user-service',
        properties: {
          inferred: true,
          direction: 'doc-to-code',
        },
      });

      const context = aggregator.gatherContext('user-service');

      expect(context.referencedByDocs.length).toBe(1);
      expect(context.referencedByDocs[0].docSymbol).toBe('FeatureDoc');
      expect(context.referencedByDocs[0].isInferred).toBe(true);
    });

    it('should gather test coverage', () => {
      const sym = createSymbol('user-service', 'UserService');
      insertSymbol(sym);

      insertRelationship({
        id: 'test-1',
        type: 'test-coverage',
        category: 'verification',
        from: 'user-service.test',
        to: 'user-service',
      });

      const context = aggregator.gatherContext('user-service');

      expect(context.testCoverage.length).toBe(1);
      expect(context.testCoverage[0].testSymbol).toBe('user-service.test');
    });

    it('should gather related symbols (naming-pattern-relation)', () => {
      const sym1 = createSymbol('user-service', 'UserService');
      const sym2 = createSymbol('user-repository', 'UserRepository');
      insertSymbol(sym1);
      insertSymbol(sym2);

      insertRelationship({
        id: 'pattern-1',
        type: 'naming-pattern-relation',
        category: 'semantic',
        from: 'user-service',
        to: 'user-repository',
        strength: 'medium',
      });

      const context = aggregator.gatherContext('user-service');

      expect(context.relatedSymbols.length).toBe(1);
      expect(context.relatedSymbols[0].symbolId).toBe('user-repository');
      expect(context.relatedSymbols[0].relationshipType).toBe('naming-pattern-relation');
    });

    it('should gather related symbols (collaboration)', () => {
      const sym1 = createSymbol('service-a', 'ServiceA');
      const sym2 = createSymbol('service-b', 'ServiceB');
      insertSymbol(sym1);
      insertSymbol(sym2);

      insertRelationship({
        id: 'collab-1',
        type: 'collaboration',
        category: 'behavioral',
        from: 'service-a',
        to: 'service-b',
        strength: 'strong',
      });

      const context = aggregator.gatherContext('service-a');

      expect(context.relatedSymbols.length).toBe(1);
      expect(context.relatedSymbols[0].symbolId).toBe('service-b');
      expect(context.relatedSymbols[0].strength).toBe('strong');
    });

    it('should count explicit vs inferred relationships', () => {
      const sym = createSymbol('test-sym', 'TestSym');
      insertSymbol(sym);

      // Explicit relationship
      insertRelationship({
        id: 'explicit-1',
        type: 'code-dependency',
        category: 'structural',
        from: 'test-sym',
        to: 'target-1',
        properties: { inferred: false },
      });

      // Inferred relationship
      insertRelationship({
        id: 'inferred-1',
        type: 'naming-pattern-relation',
        category: 'semantic',
        from: 'test-sym',
        to: 'target-2',
        properties: { inferred: true },
      });

      const context = aggregator.gatherContext('test-sym');

      expect(context.metadata.explicitCount).toBe(1);
      expect(context.metadata.inferredCount).toBe(1);
      expect(context.metadata.totalRelationships).toBe(2);
    });
  });

  describe('gatherContext - document entry point', () => {
    it('should clean [[]] brackets from doc symbol', () => {
      insertRelationship({
        id: 'doc-ref',
        type: 'doc-reference',
        category: 'semantic',
        from: 'some-symbol',
        to: 'FeatureName',
      });

      const context = aggregator.gatherContext('[[FeatureName]]');

      expect(context.entryPointType).toBe('document');
      // Should find relationships for cleaned symbol
    });

    it('should gather code symbols that reference this doc', () => {
      // Use document symbol with spaces to trigger document detection
      insertRelationship({
        id: 'code-to-doc',
        type: 'doc-reference',
        category: 'semantic',
        from: 'user-service',
        to: 'User Service Doc',
        properties: { direction: 'code-to-doc' },
      });

      // Entry point must have spaces or [[]] to be detected as document
      const context = aggregator.gatherContext('User Service Doc');

      expect(context.entryPointType).toBe('document');
      // When querying a document, code-to-doc relationships are added to docReferences
      // The implementation pushes `to` (User Service Doc) to docReferences
      expect(context.docReferences.length).toBe(1);
      expect(context.docReferences[0].docSymbol).toBe('User Service Doc');
    });

    it('should gather inferred doc-to-code references', () => {
      // Use document symbol with spaces to trigger document detection
      insertRelationship({
        id: 'doc-to-code',
        type: 'doc-reference',
        category: 'semantic',
        from: 'User Service Doc',
        to: 'user-service',
        properties: { direction: 'doc-to-code', inferred: true },
      });

      // Entry point must have spaces or [[]] to be detected as document
      const context = aggregator.gatherContext('User Service Doc');

      expect(context.entryPointType).toBe('document');
      expect(context.usedBy.length).toBe(1);
      expect(context.usedBy[0].symbolId).toBe('user-service');
      expect(context.usedBy[0].relationship).toBe('documented-in');
    });

    it('should count relationships correctly for doc entry point', () => {
      // Use document symbol with spaces to trigger document detection
      insertRelationship({
        id: 'rel-1',
        type: 'doc-reference',
        category: 'semantic',
        from: 'symbol-1',
        to: 'Test Doc',
      });

      insertRelationship({
        id: 'rel-2',
        type: 'doc-reference',
        category: 'semantic',
        from: 'Test Doc',
        to: 'symbol-2',
        properties: { inferred: true },
      });

      const context = aggregator.gatherContext('Test Doc');

      expect(context.entryPointType).toBe('document');
      expect(context.metadata.totalRelationships).toBe(2);
    });
  });

  describe('gatherContext - impact analysis', () => {
    it('should calculate direct impact from usedBy count', () => {
      const target = createSymbol('core-lib', 'CoreLib');
      insertSymbol(target);

      // Three symbols depend on core-lib
      for (let i = 1; i <= 3; i++) {
        insertRelationship({
          id: `dep-${i}`,
          type: 'code-dependency',
          category: 'structural',
          from: `consumer-${i}`,
          to: 'core-lib',
        });
      }

      const context = aggregator.gatherContext('core-lib');

      expect(context.impact.directImpact).toBe(3);
    });

    it('should calculate transitive impact', () => {
      const root = createSymbol('root', 'Root');
      const level1 = createSymbol('level1', 'Level1');
      const level2 = createSymbol('level2', 'Level2');
      insertSymbol(root);
      insertSymbol(level1);
      insertSymbol(level2);

      // level1 -> root, level2 -> level1 (chain)
      insertRelationship({
        id: 'dep-1',
        type: 'code-dependency',
        category: 'structural',
        from: 'level1',
        to: 'root',
      });

      insertRelationship({
        id: 'dep-2',
        type: 'code-dependency',
        category: 'structural',
        from: 'level2',
        to: 'level1',
      });

      const context = aggregator.gatherContext('root', 3);

      // Transitive impact should include level1 and level2
      expect(context.impact.transitiveImpact).toBeGreaterThanOrEqual(2);
    });

    it('should include affected tests from test coverage', () => {
      const sym = createSymbol('my-service', 'MyService');
      insertSymbol(sym);

      insertRelationship({
        id: 'test-1',
        type: 'test-coverage',
        category: 'verification',
        from: 'test-file-1',
        to: 'my-service',
      });

      dbManager.insertUnifiedRelationship({
        id: 'test-2',
        type: 'test-coverage',
        category: 'verification',
        fromSymbols: ['test-file-2'],
        toSymbols: ['my-service'],
        direction: 'unidirectional',
        strength: 'strong',
        evidence: [],
        discoveredBy: 'test-analysis',
        confidence: 1.0,
        filePath: 'test/my-service.test.ts',
        properties: {},
      });

      const context = aggregator.gatherContext('my-service');

      expect(context.impact.affectedTests.length).toBeGreaterThanOrEqual(1);
    });

    it('should include affected docs from doc references', () => {
      const sym = createSymbol('my-service', 'MyService');
      insertSymbol(sym);

      insertRelationship({
        id: 'doc-1',
        type: 'doc-reference',
        category: 'semantic',
        from: 'my-service',
        to: 'MyServiceDoc',
      });

      const context = aggregator.gatherContext('my-service');

      expect(context.impact.affectedDocs).toContain('MyServiceDoc');
    });
  });

  describe('gatherContext - metadata', () => {
    it('should include generation timestamp', () => {
      const context = aggregator.gatherContext('test-symbol');

      expect(context.metadata.generatedAt).toBeDefined();
      // Should be valid ISO date
      expect(() => new Date(context.metadata.generatedAt)).not.toThrow();
    });

    it('should include requested depth', () => {
      const context = aggregator.gatherContext('test-symbol', 5);

      expect(context.metadata.depth).toBe(5);
    });

    it('should use default depth of 2', () => {
      const context = aggregator.gatherContext('test-symbol');

      expect(context.metadata.depth).toBe(2);
    });
  });

  describe('gatherContext - affected files calculation', () => {
    it('should include primary symbol file', () => {
      const sym = createSymbol('my-service', 'MyService', 'src/my-service.ts');
      insertSymbol(sym);

      const context = aggregator.gatherContext('my-service');

      expect(context.impact.affectedFiles).toContain('src/my-service.ts');
    });

    it('should include files from dependencies', () => {
      const source = createSymbol('service', 'Service', 'src/service.ts');
      const dep = createSymbol('repo', 'Repo', 'src/repo.ts');
      insertSymbol(source);
      insertSymbol(dep);

      insertRelationship({
        id: 'dep-1',
        type: 'code-dependency',
        category: 'structural',
        from: 'service',
        to: 'repo',
      });

      const context = aggregator.gatherContext('service');

      expect(context.impact.affectedFiles).toContain('src/service.ts');
      expect(context.impact.affectedFiles).toContain('src/repo.ts');
    });

    it('should include files from usedBy symbols', () => {
      const target = createSymbol('target', 'Target', 'src/target.ts');
      const consumer = createSymbol('consumer', 'Consumer', 'src/consumer.ts');
      insertSymbol(target);
      insertSymbol(consumer);

      insertRelationship({
        id: 'dep-1',
        type: 'code-dependency',
        category: 'structural',
        from: 'consumer',
        to: 'target',
      });

      const context = aggregator.gatherContext('target');

      expect(context.impact.affectedFiles).toContain('src/target.ts');
      expect(context.impact.affectedFiles).toContain('src/consumer.ts');
    });
  });

  describe('edge cases', () => {
    it('should handle symbol with no relationships', () => {
      const sym = createSymbol('lonely-symbol', 'LonelySymbol');
      insertSymbol(sym);

      const context = aggregator.gatherContext('lonely-symbol');

      expect(context.dependencies).toHaveLength(0);
      expect(context.usedBy).toHaveLength(0);
      expect(context.docReferences).toHaveLength(0);
      expect(context.referencedByDocs).toHaveLength(0);
      expect(context.relatedSymbols).toHaveLength(0);
      expect(context.testCoverage).toHaveLength(0);
      expect(context.metadata.totalRelationships).toBe(0);
    });

    it('should handle non-existent symbol', () => {
      const context = aggregator.gatherContext('non-existent');

      expect(context.primarySymbol).toBeUndefined();
      expect(context.dependencies).toHaveLength(0);
    });

    it('should handle relationships with array from/to fields', () => {
      const sym = createSymbol('multi', 'Multi');
      insertSymbol(sym);

      // Relationship with array participants
      dbManager.insertUnifiedRelationship({
        id: 'multi-rel',
        type: 'composition',
        category: 'behavioral',
        fromSymbols: ['multi', 'other'],
        toSymbols: ['target-a', 'target-b'],
        direction: 'unidirectional',
        strength: 'strong',
        evidence: [],
        discoveredBy: 'static-analysis',
        confidence: 1.0,
        properties: {},
      });

      const context = aggregator.gatherContext('multi');

      // Should handle array fields properly
      expect(context.metadata.totalRelationships).toBe(1);
    });

    it('should handle depth of 0', () => {
      const sym = createSymbol('test', 'Test');
      insertSymbol(sym);

      insertRelationship({
        id: 'dep',
        type: 'code-dependency',
        category: 'structural',
        from: 'consumer',
        to: 'test',
      });

      const context = aggregator.gatherContext('test', 0);

      expect(context.impact.transitiveImpact).toBe(0);
    });

    it('should handle inheritance relationships for transitive impact', () => {
      const base = createSymbol('base', 'Base');
      const derived = createSymbol('derived', 'Derived');
      insertSymbol(base);
      insertSymbol(derived);

      insertRelationship({
        id: 'inherit',
        type: 'inheritance',
        category: 'structural',
        from: 'derived',
        to: 'base',
      });

      const context = aggregator.gatherContext('base', 2);

      expect(context.impact.transitiveImpact).toBeGreaterThanOrEqual(1);
    });

    it('should handle calls relationships for transitive impact', () => {
      const callee = createSymbol('callee', 'Callee');
      const caller = createSymbol('caller', 'Caller');
      insertSymbol(callee);
      insertSymbol(caller);

      insertRelationship({
        id: 'call',
        type: 'calls',
        category: 'behavioral',
        from: 'caller',
        to: 'callee',
      });

      const context = aggregator.gatherContext('callee', 2);

      expect(context.impact.transitiveImpact).toBeGreaterThanOrEqual(1);
    });
  });
});
