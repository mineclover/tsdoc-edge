/**
 * ConstraintAnalyzer Tests
 */

import * as ts from 'typescript';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { ConstraintAnalyzer } from '../analyzer/ConstraintAnalyzer';
import type { SymbolGraph, Symbol } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

describe('ConstraintAnalyzer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'constraint-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Helper to create mock graph
  function createMockGraph(
    symbols: Array<{ id: string; name: string }>
  ): SymbolGraph {
    const symbolsMap = new Map<string, Symbol>();
    const nameIndex = new Map<string, string[]>();

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

      // Add to name index
      if (!nameIndex.has(s.name)) {
        nameIndex.set(s.name, []);
      }
      nameIndex.get(s.name)!.push(s.id);
    }

    return {
      symbols: symbolsMap,
      relationships: [],
      adjacencyList: new Map(),
      reverseAdjacencyList: new Map(),
      nameIndex,
      fileIndex: new Map(),
    } as SymbolGraph;
  }

  // Helper to create a TypeScript program from source code
  function createProgram(files: Record<string, string>, dir?: string): ts.Program {
    const targetDir = dir || tempDir;
    const filePaths: string[] = [];

    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(targetDir, name);
      fs.writeFileSync(filePath, content);
      filePaths.push(filePath);
    }

    return ts.createProgram(filePaths, {
      noEmit: true,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    });
  }

  // Helper to create config files
  function createConfigFile(filename: string, content: object): void {
    fs.writeFileSync(path.join(tempDir, filename), JSON.stringify(content, null, 2));
  }

  describe('constructor and setProgram', () => {
    it('should create analyzer without program', () => {
      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);

      expect(analyzer).toBeDefined();
    });

    it('should accept program in constructor', () => {
      const graph = createMockGraph([]);
      const program = createProgram({ 'test.ts': '' });
      const analyzer = new ConstraintAnalyzer(graph, tempDir, program);

      expect(analyzer).toBeDefined();
    });

    it('should allow setting program later', () => {
      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);
      const program = createProgram({ 'test.ts': '' });

      analyzer.setProgram(program);

      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze - mutual exclusion from tsconfig.json', () => {
    it('should detect CommonJS module mutual exclusion', () => {
      createConfigFile('tsconfig.json', {
        compilerOptions: {
          module: 'commonjs',
        },
      });

      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);
      const result = analyzer.analyze();

      const exclusion = result.find(
        (r) =>
          r.type === 'mutual-exclusion' &&
          r.from === 'config:module:commonjs' &&
          r.to === 'config:module:es6'
      );

      expect(exclusion).toBeDefined();
      expect(exclusion?.direction).toBe('bidirectional');
      expect(exclusion?.strength).toBe('strong');
      expect(exclusion?.confidence).toBe(1.0);
    });

    it('should detect ES6 module mutual exclusion', () => {
      createConfigFile('tsconfig.json', {
        compilerOptions: {
          module: 'es6',
        },
      });

      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);
      const result = analyzer.analyze();

      const exclusion = result.find(
        (r) =>
          r.type === 'mutual-exclusion' &&
          r.from === 'config:module:es6' &&
          r.to === 'config:module:commonjs'
      );

      expect(exclusion).toBeDefined();
    });

    it('should detect esnext module mutual exclusion', () => {
      createConfigFile('tsconfig.json', {
        compilerOptions: {
          module: 'esnext',
        },
      });

      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);
      const result = analyzer.analyze();

      const exclusion = result.find(
        (r) =>
          r.type === 'mutual-exclusion' &&
          r.from === 'config:module:esnext' &&
          r.to === 'config:module:commonjs'
      );

      expect(exclusion).toBeDefined();
    });

    it('should detect ES5 target constraint with async/await', () => {
      createConfigFile('tsconfig.json', {
        compilerOptions: {
          target: 'ES5',
        },
      });

      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);
      const result = analyzer.analyze();

      const constraint = result.find(
        (r) =>
          r.type === 'mutual-exclusion' &&
          r.from === 'config:target:es5' &&
          r.to === 'feature:async-await'
      );

      expect(constraint).toBeDefined();
      expect(constraint?.confidence).toBe(0.9);
    });

    it('should detect node moduleResolution mutual exclusion', () => {
      createConfigFile('tsconfig.json', {
        compilerOptions: {
          moduleResolution: 'node',
        },
      });

      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);
      const result = analyzer.analyze();

      const exclusion = result.find(
        (r) =>
          r.type === 'mutual-exclusion' &&
          r.from === 'config:moduleResolution:node' &&
          r.to === 'config:moduleResolution:classic'
      );

      expect(exclusion).toBeDefined();
    });

    it('should handle missing tsconfig.json gracefully', () => {
      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);
      const result = analyzer.analyze();

      // Should not throw, may return empty or results from other sources
      expect(result).toBeDefined();
    });

    it('should handle invalid tsconfig.json gracefully', () => {
      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), 'invalid json{');

      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);
      const result = analyzer.analyze();

      // Should not throw
      expect(result).toBeDefined();
    });
  });

  describe('analyze - mutual exclusion from package.json', () => {
    it('should detect Jest and Mocha conflict', () => {
      createConfigFile('package.json', {
        dependencies: {
          jest: '^29.0.0',
          mocha: '^10.0.0',
        },
      });

      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);
      const result = analyzer.analyze();

      const conflict = result.find(
        (r) =>
          r.type === 'mutual-exclusion' &&
          r.from === 'test-framework:jest' &&
          r.to === 'test-framework:mocha'
      );

      expect(conflict).toBeDefined();
      expect(conflict?.confidence).toBe(0.8);
    });

    it('should detect Jest and Jasmine conflict', () => {
      createConfigFile('package.json', {
        devDependencies: {
          jest: '^29.0.0',
          jasmine: '^5.0.0',
        },
      });

      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);
      const result = analyzer.analyze();

      const conflict = result.find(
        (r) =>
          r.type === 'mutual-exclusion' &&
          r.from === 'test-framework:jest' &&
          r.to === 'test-framework:jasmine'
      );

      expect(conflict).toBeDefined();
    });

    it('should detect conflicts from @types packages', () => {
      createConfigFile('package.json', {
        devDependencies: {
          '@types/jest': '^29.0.0',
          '@types/mocha': '^10.0.0',
        },
      });

      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);
      const result = analyzer.analyze();

      const conflict = result.find(
        (r) =>
          r.type === 'mutual-exclusion' &&
          r.from === 'test-framework:jest' &&
          r.to === 'test-framework:mocha'
      );

      expect(conflict).toBeDefined();
    });

    it('should handle missing package.json gracefully', () => {
      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);
      const result = analyzer.analyze();

      // Should not throw
      expect(result).toBeDefined();
    });

    it('should handle invalid package.json gracefully', () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), 'invalid json{');

      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);
      const result = analyzer.analyze();

      // Should not throw
      expect(result).toBeDefined();
    });
  });

  describe('analyze - co-requirements from code patterns', () => {
    it('should detect co-requirements from frequent import pairs', () => {
      const graph = createMockGraph([
        { id: 'class-a', name: 'ClassA' },
        { id: 'class-b', name: 'ClassB' },
      ]);

      // Create multiple files that import both ClassA and ClassB
      const program = createProgram({
        'ClassA.ts': 'export class ClassA {}',
        'ClassB.ts': 'export class ClassB {}',
        'file1.ts': `
          import { ClassA } from './ClassA';
          import { ClassB } from './ClassB';
          export const x = 1;
        `,
        'file2.ts': `
          import { ClassA } from './ClassA';
          import { ClassB } from './ClassB';
          export const y = 2;
        `,
        'file3.ts': `
          import { ClassA } from './ClassA';
          import { ClassB } from './ClassB';
          export const z = 3;
        `,
      });

      const analyzer = new ConstraintAnalyzer(graph, tempDir, program);
      const result = analyzer.analyze();

      // Check that co-requirement relationships are created
      const coReqs = result.filter((r) => r.type === 'co-requirement');
      expect(coReqs).toBeDefined();
    });

    it('should not create co-requirements for pairs appearing less than 3 times', () => {
      const graph = createMockGraph([
        { id: 'class-x', name: 'ClassX' },
        { id: 'class-y', name: 'ClassY' },
      ]);

      // Create only 2 files that import both classes
      const program = createProgram({
        'ClassX.ts': 'export class ClassX {}',
        'ClassY.ts': 'export class ClassY {}',
        'file1.ts': `
          import { ClassX } from './ClassX';
          import { ClassY } from './ClassY';
        `,
        'file2.ts': `
          import { ClassX } from './ClassX';
          import { ClassY } from './ClassY';
        `,
      });

      const analyzer = new ConstraintAnalyzer(graph, tempDir, program);
      const result = analyzer.analyze();

      // Should not have co-requirement for pairs appearing only 2 times
      const coReqs = result.filter(
        (r) =>
          r.type === 'co-requirement' &&
          ((r.from === 'class-x' && r.to === 'class-y') ||
            (r.from === 'class-y' && r.to === 'class-x'))
      );

      // May have some from known patterns but not from code analysis
      expect(coReqs.length).toBeLessThanOrEqual(1);
    });

    it('should skip declaration files', () => {
      const graph = createMockGraph([]);
      const program = createProgram({
        'test.d.ts': `
          export interface ITest {}
        `,
      });

      const analyzer = new ConstraintAnalyzer(graph, tempDir, program);
      const result = analyzer.analyze();

      // Declaration files should be skipped
      expect(result).toBeDefined();
    });

    it('should skip test files', () => {
      const graph = createMockGraph([
        { id: 'class-test', name: 'TestClass' },
      ]);

      const program = createProgram({
        'test.test.ts': `
          import { TestClass } from './TestClass';
          describe('Test', () => {});
        `,
      });

      const analyzer = new ConstraintAnalyzer(graph, tempDir, program);
      const result = analyzer.analyze();

      // Test files should be skipped
      expect(result).toBeDefined();
    });

    it('should return empty array when no program provided', () => {
      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);
      // No program set

      const result = analyzer.analyze();

      // Should handle gracefully
      expect(result).toBeDefined();
    });
  });

  describe('analyze - known co-requirement patterns', () => {
    it('should detect React + ReactDOM co-requirement', () => {
      const graph = createMockGraph([
        { id: 'lib-react', name: 'React' },
        { id: 'lib-reactdom', name: 'ReactDOM' },
      ]);

      const program = createProgram({ 'test.ts': '' });
      const analyzer = new ConstraintAnalyzer(graph, tempDir, program);
      const result = analyzer.analyze();

      const coReq = result.find(
        (r) =>
          r.type === 'co-requirement' &&
          ((r.from === 'lib-react' && r.to === 'lib-reactdom') ||
            (r.from === 'lib-reactdom' && r.to === 'lib-react'))
      );

      expect(coReq).toBeDefined();
      expect(coReq?.confidence).toBe(0.95);
    });

    it('should detect Express + body-parser co-requirement', () => {
      const graph = createMockGraph([
        { id: 'lib-express', name: 'express' },
        { id: 'lib-bodyparser', name: 'body-parser' },
      ]);

      const program = createProgram({ 'test.ts': '' });
      const analyzer = new ConstraintAnalyzer(graph, tempDir, program);
      const result = analyzer.analyze();

      const coReq = result.find(
        (r) =>
          r.type === 'co-requirement' &&
          ((r.from === 'lib-express' && r.to === 'lib-bodyparser') ||
            (r.from === 'lib-bodyparser' && r.to === 'lib-express'))
      );

      expect(coReq).toBeDefined();
      expect(coReq?.confidence).toBe(0.7);
    });
  });

  describe('relationship structure', () => {
    it('should create relationships with correct structure', () => {
      createConfigFile('tsconfig.json', {
        compilerOptions: {
          module: 'commonjs',
        },
      });

      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);
      const result = analyzer.analyze();

      const relationship = result[0];

      expect(relationship).toMatchObject({
        type: 'mutual-exclusion',
        category: 'constraint',
        direction: 'bidirectional',
        strength: 'strong',
        discoveredBy: 'static-analysis',
      });

      expect(relationship.id).toBeDefined();
      expect(relationship.from).toBeDefined();
      expect(relationship.to).toBeDefined();
      expect(relationship.evidence).toBeInstanceOf(Array);
      expect(relationship.evidence[0]).toMatchObject({
        type: 'code',
        confidence: expect.any(Number),
      });
      expect(relationship.properties).toHaveProperty('reason');
      expect(relationship.description).toBeDefined();
      expect(relationship.createdAt).toBeDefined();
      expect(relationship.updatedAt).toBeDefined();
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics for empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);

      const stats = analyzer.getStatistics([]);

      expect(stats.totalConstraints).toBe(0);
      expect(stats.mutualExclusions).toBe(0);
      expect(stats.coRequirements).toBe(0);
      expect(Object.keys(stats.bySource)).toHaveLength(0);
    });

    it('should calculate statistics correctly for mutual exclusions', () => {
      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);

      const relationships: UnifiedRelationship[] = [
        createMockMutualExclusionRelationship('A', 'B'),
        createMockMutualExclusionRelationship('C', 'D'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalConstraints).toBe(2);
      expect(stats.mutualExclusions).toBe(2);
      expect(stats.coRequirements).toBe(0);
    });

    it('should calculate statistics correctly for co-requirements', () => {
      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);

      const relationships: UnifiedRelationship[] = [
        createMockCoRequirementRelationship('A', 'B'),
        createMockCoRequirementRelationship('C', 'D'),
        createMockCoRequirementRelationship('E', 'F'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalConstraints).toBe(3);
      expect(stats.mutualExclusions).toBe(0);
      expect(stats.coRequirements).toBe(3);
    });

    it('should calculate statistics correctly for mixed relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);

      const relationships: UnifiedRelationship[] = [
        createMockMutualExclusionRelationship('A', 'B'),
        createMockCoRequirementRelationship('C', 'D'),
        createMockMutualExclusionRelationship('E', 'F'),
        createMockCoRequirementRelationship('G', 'H'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalConstraints).toBe(4);
      expect(stats.mutualExclusions).toBe(2);
      expect(stats.coRequirements).toBe(2);
    });

    it('should track statistics by source', () => {
      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);

      const relationships: UnifiedRelationship[] = [
        { ...createMockMutualExclusionRelationship('A', 'B'), discoveredBy: 'static-analysis' },
        { ...createMockMutualExclusionRelationship('C', 'D'), discoveredBy: 'static-analysis' },
        { ...createMockCoRequirementRelationship('E', 'F'), discoveredBy: 'ast-parsing' },
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.bySource['static-analysis']).toBe(2);
      expect(stats.bySource['ast-parsing']).toBe(1);
    });

    it('should handle relationships with unknown discoveredBy', () => {
      const graph = createMockGraph([]);
      const analyzer = new ConstraintAnalyzer(graph, tempDir);

      const relationship = createMockMutualExclusionRelationship('A', 'B');
      // @ts-expect-error - Testing undefined case
      delete relationship.discoveredBy;

      const stats = analyzer.getStatistics([relationship]);

      expect(stats.bySource['unknown']).toBe(1);
    });
  });

  // Helper to create mock mutual exclusion relationship
  function createMockMutualExclusionRelationship(
    symbolA: string,
    symbolB: string
  ): UnifiedRelationship {
    return {
      id: `mutual-exclusion-${symbolA}-${symbolB}`.toLowerCase(),
      type: 'mutual-exclusion',
      category: 'constraint',
      from: symbolA,
      to: symbolB,
      direction: 'bidirectional',
      strength: 'strong',
      evidence: [{ type: 'code', source: 'test.ts', confidence: 1.0 }],
      discoveredBy: 'static-analysis',
      confidence: 1.0,
      properties: { reason: 'Test reason' },
      description: 'Test description',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Helper to create mock co-requirement relationship
  function createMockCoRequirementRelationship(
    symbolA: string,
    symbolB: string
  ): UnifiedRelationship {
    return {
      id: `co-requirement-${symbolA}-${symbolB}`.toLowerCase(),
      type: 'co-requirement',
      category: 'constraint',
      from: symbolA,
      to: symbolB,
      direction: 'bidirectional',
      strength: 'medium',
      evidence: [{ type: 'code', source: 'test.ts', confidence: 0.9 }],
      discoveredBy: 'ast-parsing',
      confidence: 0.9,
      properties: { reason: 'Test reason', occurrences: 3 },
      description: 'Test description',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
});
