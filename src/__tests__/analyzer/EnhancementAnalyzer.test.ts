/**
 * EnhancementAnalyzer Tests
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { EnhancementAnalyzer } from '../../analyzer/EnhancementAnalyzer';
import type { Symbol, SymbolGraph } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships';

describe('EnhancementAnalyzer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'enhancement-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Helper to create mock graph
  function createMockGraph(
    symbols: Array<{ id: string; name: string; type?: string; filePath?: string }>
  ): SymbolGraph {
    const symbolsMap = new Map<string, Symbol>();
    const nameIndex = new Map<string, string[]>();
    const fileIndex = new Map<string, string[]>();

    for (const s of symbols) {
      const filePath = s.filePath || `src/${s.name}.ts`;
      symbolsMap.set(s.id, {
        id: s.id,
        name: s.name,
        type: (s.type || 'class') as any,
        filePath,
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

  // Helper to write TypeScript files in temp directory
  function writeFiles(files: Record<string, string>): void {
    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(tempDir, name);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content);
    }
  }

  describe('constructor', () => {
    it('should create analyzer with graph', () => {
      const graph = createMockGraph([]);
      const analyzer = new EnhancementAnalyzer(graph);

      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze - basic @enhances tag detection', () => {
    it('should detect @enhances tag in class', () => {
      const graph = createMockGraph([
        { id: 'class-cacheddb', name: 'CachedDatabase' },
        { id: 'class-database', name: 'Database' },
      ]);

      writeFiles({
        'src/cached.ts': `
          /**
           * Enhanced database with caching
           * @enhances Database
           */
          export class CachedDatabase {
            // Implementation
          }
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      const enhancement = result.find(
        (r) => r.type === 'enhancement' && r.from === 'class-cacheddb' && r.to === 'Database'
      );

      expect(enhancement).toBeDefined();
      expect(enhancement?.category).toBe('semantic');
      expect(enhancement?.direction).toBe('unidirectional');
    });

    it('should detect @enhances tag in function', () => {
      const graph = createMockGraph([{ id: 'func-loggedhandler', name: 'loggedHandler' }]);

      writeFiles({
        'src/handler.ts': `
          /**
           * Handler with logging
           * @enhances BaseHandler
           */
          export function loggedHandler() {
            // Implementation
          }
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      const enhancement = result.find(
        (r) => r.type === 'enhancement' && r.from === 'func-loggedhandler' && r.to === 'BaseHandler'
      );

      expect(enhancement).toBeDefined();
    });

    it('should detect @enhances tag in interface', () => {
      const graph = createMockGraph([{ id: 'interface-extendeduser', name: 'ExtendedUser' }]);

      writeFiles({
        'src/user.ts': `
          /**
           * Extended user interface
           * @enhances BaseUser
           */
          export interface ExtendedUser {
            id: number;
            name: string;
            role: string;
          }
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      const enhancement = result.find(
        (r) =>
          r.type === 'enhancement' && r.from === 'interface-extendeduser' && r.to === 'BaseUser'
      );

      expect(enhancement).toBeDefined();
    });

    it('should detect @enhances tag in type alias', () => {
      const graph = createMockGraph([{ id: 'type-enhancedconfig', name: 'EnhancedConfig' }]);

      writeFiles({
        'src/config.ts': `
          /**
           * Enhanced configuration
           * @enhances BaseConfig
           */
          export type EnhancedConfig = {
            extended: boolean;
          };
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      const enhancement = result.find(
        (r) => r.type === 'enhancement' && r.from === 'type-enhancedconfig' && r.to === 'BaseConfig'
      );

      expect(enhancement).toBeDefined();
    });

    it('should detect @enhances tag in method', () => {
      const graph = createMockGraph([{ id: 'method-process', name: 'process' }]);

      writeFiles({
        'src/processor.ts': `
          export class Processor {
            /**
             * Enhanced processing
             * @enhances BaseProcessor.process
             */
            process() {
              // Implementation
            }
          }
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      const enhancement = result.find(
        (r) =>
          r.type === 'enhancement' &&
          r.from === 'method-process' &&
          r.to === 'BaseProcessor.process'
      );

      expect(enhancement).toBeDefined();
    });

    it('should detect @enhances tag in variable declaration', () => {
      const graph = createMockGraph([{ id: 'var-enhancedlogger', name: 'enhancedLogger' }]);

      writeFiles({
        'src/logger.ts': `
          /**
           * Enhanced logger
           * @enhances console
           */
          export const enhancedLogger = {
            log: (msg: string) => console.log(\`[LOG] \${msg}\`),
          };
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      const enhancement = result.find(
        (r) => r.type === 'enhancement' && r.from === 'var-enhancedlogger' && r.to === 'console'
      );

      expect(enhancement).toBeDefined();
    });
  });

  describe('analyze - multiple @enhances tags', () => {
    it('should detect multiple enhancement relationships', () => {
      const graph = createMockGraph([
        { id: 'class-a', name: 'EnhancedA' },
        { id: 'class-b', name: 'EnhancedB' },
      ]);

      writeFiles({
        'src/enhanced.ts': `
          /**
           * Enhanced A
           * @enhances BaseA
           */
          export class EnhancedA {}

          /**
           * Enhanced B
           * @enhances BaseB
           */
          export class EnhancedB {}
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result).toHaveLength(2);
    });
  });

  describe('analyze - directory traversal', () => {
    it('should traverse nested directories', () => {
      const graph = createMockGraph([{ id: 'class-nested', name: 'NestedEnhanced' }]);

      writeFiles({
        'src/deep/nested/enhanced.ts': `
          /**
           * Deeply nested
           * @enhances BaseNested
           */
          export class NestedEnhanced {}
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should skip node_modules directory', () => {
      const graph = createMockGraph([{ id: 'class-npm', name: 'NpmPackage' }]);

      writeFiles({
        'node_modules/package/index.ts': `
          /**
           * NPM package
           * @enhances SomeBase
           */
          export class NpmPackage {}
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      // Should not find anything in node_modules
      const npmEnhancement = result.find((r) => r.to === 'SomeBase');
      expect(npmEnhancement).toBeUndefined();
    });

    it('should skip dist directory', () => {
      const graph = createMockGraph([{ id: 'class-dist', name: 'DistClass' }]);

      writeFiles({
        'dist/compiled.ts': `
          /**
           * Compiled file
           * @enhances CompiledBase
           */
          export class DistClass {}
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      const distEnhancement = result.find((r) => r.to === 'CompiledBase');
      expect(distEnhancement).toBeUndefined();
    });

    it('should skip build directory', () => {
      const graph = createMockGraph([{ id: 'class-build', name: 'BuildClass' }]);

      writeFiles({
        'build/output.ts': `
          /**
           * Build output
           * @enhances BuildBase
           */
          export class BuildClass {}
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      const buildEnhancement = result.find((r) => r.to === 'BuildBase');
      expect(buildEnhancement).toBeUndefined();
    });
  });

  describe('analyze - enhancer not in graph', () => {
    it('should not create relationship when enhancer symbol not found', () => {
      const graph = createMockGraph([]);

      writeFiles({
        'src/notingraph.ts': `
          /**
           * Not in graph
           * @enhances SomeBase
           */
          export class NotInGraph {}
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      // Should not create relationship when enhancer not in graph
      expect(result).toHaveLength(0);
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics correctly', () => {
      const graph = createMockGraph([]);
      const analyzer = new EnhancementAnalyzer(graph);

      const mockRelationships: UnifiedRelationship[] = [
        {
          id: 'rel-1',
          type: 'enhancement',
          from: 'class-a',
          to: 'BaseA',
          direction: 'unidirectional',
          strength: 'medium',
          category: 'semantic',
          evidence: [],
          discoveredBy: 'documentation',
          confidence: 1.0,
          filePath: '/src/a.ts',
          properties: { enhancerSymbol: 'A', enhancedSymbol: 'BaseA' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rel-2',
          type: 'enhancement',
          from: 'class-b',
          to: 'BaseA',
          direction: 'unidirectional',
          strength: 'medium',
          category: 'semantic',
          evidence: [],
          discoveredBy: 'documentation',
          confidence: 1.0,
          filePath: '/src/b.ts',
          properties: { enhancerSymbol: 'B', enhancedSymbol: 'BaseA' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'rel-3',
          type: 'enhancement',
          from: 'class-a',
          to: 'BaseC',
          direction: 'unidirectional',
          strength: 'medium',
          category: 'semantic',
          evidence: [],
          discoveredBy: 'documentation',
          confidence: 1.0,
          filePath: '/src/a.ts',
          properties: { enhancerSymbol: 'A', enhancedSymbol: 'BaseC' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const stats = analyzer.getStatistics(mockRelationships);

      expect(stats.total).toBe(3);
      expect(stats.uniqueEnhancers).toBe(2); // class-a, class-b
      expect(stats.uniqueEnhanced).toBe(2); // BaseA, BaseC
      expect(stats.byFile['/src/a.ts']).toBe(2);
      expect(stats.byFile['/src/b.ts']).toBe(1);
    });

    it('should handle array from/to in statistics', () => {
      const graph = createMockGraph([]);
      const analyzer = new EnhancementAnalyzer(graph);

      const mockRelationships: UnifiedRelationship[] = [
        {
          id: 'rel-1',
          type: 'enhancement',
          from: ['class-a', 'class-b'],
          to: ['BaseA', 'BaseB'],
          direction: 'unidirectional',
          strength: 'medium',
          category: 'semantic',
          evidence: [],
          discoveredBy: 'documentation',
          confidence: 1.0,
          filePath: '/src/multi.ts',
          properties: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const stats = analyzer.getStatistics(mockRelationships);

      expect(stats.total).toBe(1);
      expect(stats.uniqueEnhancers).toBe(2);
      expect(stats.uniqueEnhanced).toBe(2);
    });

    it('should return zero counts for empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new EnhancementAnalyzer(graph);

      const stats = analyzer.getStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.uniqueEnhancers).toBe(0);
      expect(stats.uniqueEnhanced).toBe(0);
      expect(Object.keys(stats.byFile)).toHaveLength(0);
    });
  });

  describe('relationship structure', () => {
    it('should create relationships with correct structure', () => {
      const graph = createMockGraph([{ id: 'class-enhanced', name: 'EnhancedService' }]);

      writeFiles({
        'src/service.ts': `
          /**
           * Enhanced service
           * @enhances BaseService
           */
          export class EnhancedService {}
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      if (result.length > 0) {
        const relationship = result[0];

        expect(relationship.id).toBeDefined();
        expect(relationship.id).toContain('enhancement');
        expect(relationship.type).toBe('enhancement');
        expect(relationship.category).toBe('semantic');
        expect(relationship.from).toBeDefined();
        expect(relationship.to).toBeDefined();
        expect(relationship.direction).toBe('unidirectional');
        expect(relationship.strength).toBe('medium');
        expect(relationship.evidence).toBeInstanceOf(Array);
        expect(relationship.evidence.length).toBeGreaterThan(0);
        expect(relationship.discoveredBy).toBe('documentation');
        expect(relationship.confidence).toBe(1.0);
        expect(relationship.properties).toHaveProperty('enhancerSymbol');
        expect(relationship.properties).toHaveProperty('enhancedSymbol');
        expect(relationship.createdAt).toBeDefined();
        expect(relationship.updatedAt).toBeDefined();
        expect(relationship.description).toBeDefined();
      }
    });

    it('should include file path and line information', () => {
      const graph = createMockGraph([{ id: 'class-enhanced', name: 'EnhancedClass' }]);

      writeFiles({
        'src/enhanced.ts': `
          /**
           * Enhanced class
           * @enhances BaseClass
           */
          export class EnhancedClass {}
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      if (result.length > 0) {
        const relationship = result[0];

        expect(relationship.filePath).toBeDefined();
        expect(relationship.line).toBeDefined();
        expect(typeof relationship.line).toBe('number');
        expect(relationship.line).toBeGreaterThan(0);
      }
    });

    it('should include evidence with correct snippet', () => {
      const graph = createMockGraph([{ id: 'class-enhanced', name: 'EnhancedLogger' }]);

      writeFiles({
        'src/logger.ts': `
          /**
           * Enhanced logger
           * @enhances ConsoleLogger
           */
          export class EnhancedLogger {}
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      if (result.length > 0) {
        const evidence = result[0].evidence[0];

        expect(evidence.type).toBe('documentation');
        expect(evidence.snippet).toBe('@enhances ConsoleLogger');
        expect(evidence.confidence).toBe(1.0);
        expect(evidence.context).toContain('EnhancedLogger');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle non-existent directory', () => {
      const graph = createMockGraph([]);
      const analyzer = new EnhancementAnalyzer(graph);

      const nonExistentDir = path.join(tempDir, 'does-not-exist');
      const result = analyzer.analyze(nonExistentDir);

      expect(result).toHaveLength(0);
    });

    it('should handle empty directory', () => {
      const graph = createMockGraph([]);
      const analyzer = new EnhancementAnalyzer(graph);

      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir);

      const result = analyzer.analyze(emptyDir);

      expect(result).toHaveLength(0);
    });

    it('should handle files without @enhances tag', () => {
      const graph = createMockGraph([{ id: 'class-normal', name: 'NormalClass' }]);

      writeFiles({
        'src/normal.ts': `
          /**
           * Normal class without enhancement
           */
          export class NormalClass {}
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result).toHaveLength(0);
    });

    it('should handle empty TypeScript files', () => {
      const graph = createMockGraph([]);

      writeFiles({
        'src/empty.ts': '',
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result).toHaveLength(0);
    });

    it('should handle files with only comments', () => {
      const graph = createMockGraph([]);

      writeFiles({
        'src/comments.ts': `
          // Just a comment
          /* Another comment */
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result).toHaveLength(0);
    });

    it('should handle @enhances with no value', () => {
      const graph = createMockGraph([{ id: 'class-incomplete', name: 'IncompleteEnhanced' }]);

      writeFiles({
        'src/incomplete.ts': `
          /**
           * Incomplete enhancement
           * @enhances
           */
          export class IncompleteEnhanced {}
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      // Should not create relationship for empty @enhances
      expect(result).toHaveLength(0);
    });

    it('should trim whitespace from @enhances value', () => {
      const graph = createMockGraph([{ id: 'class-whitespace', name: 'WhitespaceClass' }]);

      writeFiles({
        'src/whitespace.ts': `
          /**
           * Whitespace test
           * @enhances   BaseWithWhitespace
           */
          export class WhitespaceClass {}
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      if (result.length > 0) {
        expect(result[0].to).toBe('BaseWithWhitespace');
      }
    });

    it('should handle malformed TypeScript files gracefully', () => {
      const graph = createMockGraph([]);

      writeFiles({
        'src/malformed.ts': `
          /**
           * @enhances Something
           */
          export class { // Missing class name
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);

      // Should not throw
      expect(() => analyzer.analyze(tempDir)).not.toThrow();
    });

    it('should only process .ts files', () => {
      const graph = createMockGraph([{ id: 'class-jsfile', name: 'JsClass' }]);

      writeFiles({
        'src/notts.js': `
          /**
           * JavaScript file
           * @enhances JsBase
           */
          export class JsClass {}
        `,
        'src/notts.json': `{
          "enhances": "JsonBase"
        }`,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      // Should not process non-TypeScript files
      expect(result).toHaveLength(0);
    });
  });

  describe('JSDoc comment handling', () => {
    it('should handle multiline JSDoc comments', () => {
      const graph = createMockGraph([{ id: 'class-multiline', name: 'MultilineDoc' }]);

      writeFiles({
        'src/multiline.ts': `
          /**
           * This is a class with
           * a multiline documentation
           * comment that spans
           * multiple lines.
           *
           * @enhances BaseMultiline
           * @see Related documentation
           */
          export class MultilineDoc {}
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result.length).toBe(1);
      expect(result[0].to).toBe('BaseMultiline');
    });

    it('should handle @enhances alongside other tags', () => {
      const graph = createMockGraph([{ id: 'class-manytags', name: 'ManyTags' }]);

      writeFiles({
        'src/manytags.ts': `
          /**
           * Class with many tags
           * @public
           * @enhances BaseManytags
           * @deprecated Use something else
           * @see Other class
           */
          export class ManyTags {}
        `,
      });

      const analyzer = new EnhancementAnalyzer(graph);
      const result = analyzer.analyze(tempDir);

      expect(result.length).toBe(1);
      expect(result[0].to).toBe('BaseManytags');
    });
  });
});
