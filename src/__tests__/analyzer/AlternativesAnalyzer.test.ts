/**
 * AlternativesAnalyzer Tests
 */

import * as ts from 'typescript';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { AlternativesAnalyzer } from '../../analyzer/AlternativesAnalyzer';
import type { SymbolGraph, Symbol } from '../../types/graph';
import type { UnifiedRelationship } from '../../types/relationships';

describe('AlternativesAnalyzer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alternatives-test-'));
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
  function createProgram(files: Record<string, string>): ts.Program {
    const filePaths: string[] = [];

    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(tempDir, name);
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

  describe('constructor and setProgram', () => {
    it('should create analyzer without program', () => {
      const graph = createMockGraph([]);
      const analyzer = new AlternativesAnalyzer(graph);

      expect(analyzer).toBeDefined();
    });

    it('should accept program in constructor', () => {
      const graph = createMockGraph([]);
      const program = createProgram({ 'test.ts': 'export const x = 1;' });
      const analyzer = new AlternativesAnalyzer(graph, program);

      expect(analyzer).toBeDefined();
    });

    it('should allow setting program later', () => {
      const graph = createMockGraph([]);
      const analyzer = new AlternativesAnalyzer(graph);
      const program = createProgram({ 'test.ts': 'export const x = 1;' });

      analyzer.setProgram(program);

      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze - no program', () => {
    it('should return empty array when no program is provided', () => {
      const graph = createMockGraph([]);
      const analyzer = new AlternativesAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toEqual([]);
    });
  });

  describe('analyze - substitution detection', () => {
    it('should detect multiple classes implementing the same interface', () => {
      const graph = createMockGraph([
        { id: 'class-impl-a', name: 'ImplementationA' },
        { id: 'class-impl-b', name: 'ImplementationB' },
      ]);

      const program = createProgram({
        'IService.ts': `
          export interface IService {
            execute(): void;
          }
        `,
        'ImplementationA.ts': `
          import { IService } from './IService';
          export class ImplementationA implements IService {
            execute(): void {}
          }
        `,
        'ImplementationB.ts': `
          import { IService } from './IService';
          export class ImplementationB implements IService {
            execute(): void {}
          }
        `,
      });

      const analyzer = new AlternativesAnalyzer(graph, program);
      const result = analyzer.analyze();

      const substitution = result.find(
        (r) =>
          r.type === 'substitution' &&
          ((r.from === 'class-impl-a' && r.to === 'class-impl-b') ||
            (r.from === 'class-impl-b' && r.to === 'class-impl-a'))
      );

      expect(substitution).toBeDefined();
      expect(substitution?.category).toBe('alternative');
      expect(substitution?.direction).toBe('bidirectional');
      expect(substitution?.strength).toBe('strong');
    });

    it('should not detect substitution for single implementation', () => {
      const graph = createMockGraph([
        { id: 'class-single', name: 'SingleImpl' },
      ]);

      const program = createProgram({
        'IService.ts': `
          export interface IService {
            execute(): void;
          }
        `,
        'SingleImpl.ts': `
          import { IService } from './IService';
          export class SingleImpl implements IService {
            execute(): void {}
          }
        `,
      });

      const analyzer = new AlternativesAnalyzer(graph, program);
      const result = analyzer.analyze();

      const substitutions = result.filter((r) => r.type === 'substitution');
      expect(substitutions).toHaveLength(0);
    });

    it('should skip test files', () => {
      const graph = createMockGraph([
        { id: 'class-test-a', name: 'TestA' },
        { id: 'class-test-b', name: 'TestB' },
      ]);

      const program = createProgram({
        'IService.ts': `
          export interface IService {
            execute(): void;
          }
        `,
        'TestA.test.ts': `
          import { IService } from './IService';
          class TestA implements IService {
            execute(): void {}
          }
        `,
        'TestB.test.ts': `
          import { IService } from './IService';
          class TestB implements IService {
            execute(): void {}
          }
        `,
      });

      const analyzer = new AlternativesAnalyzer(graph, program);
      const result = analyzer.analyze();

      const substitutions = result.filter((r) => r.type === 'substitution');
      expect(substitutions).toHaveLength(0);
    });
  });

  describe('analyze - fallback detection', () => {
    it('should detect try-catch fallback pattern', () => {
      const graph = createMockGraph([
        { id: 'func-primary', name: 'primaryMethod' },
        { id: 'func-fallback', name: 'fallbackMethod' },
      ]);

      const program = createProgram({
        'fallback.ts': `
          function primaryMethod() { return 'primary'; }
          function fallbackMethod() { return 'fallback'; }

          function main() {
            try {
              primaryMethod();
            } catch (e) {
              fallbackMethod();
            }
          }
        `,
      });

      const analyzer = new AlternativesAnalyzer(graph, program);
      const result = analyzer.analyze();

      const fallback = result.find(
        (r) =>
          r.type === 'fallback' &&
          r.from === 'func-primary' &&
          r.to === 'func-fallback'
      );

      expect(fallback).toBeDefined();
      expect(fallback?.category).toBe('alternative');
      expect(fallback?.direction).toBe('unidirectional');
      expect(fallback?.properties?.pattern).toBe('try-catch');
    });

    it('should detect null coalescing fallback pattern (??)', () => {
      const graph = createMockGraph([
        { id: 'var-primary', name: 'primaryValue' },
        { id: 'var-fallback', name: 'fallbackValue' },
      ]);

      const program = createProgram({
        'nullish.ts': `
          const primaryValue: string | null = null;
          const fallbackValue = 'default';
          const result = primaryValue ?? fallbackValue;
        `,
      });

      const analyzer = new AlternativesAnalyzer(graph, program);
      const result = analyzer.analyze();

      const fallback = result.find(
        (r) =>
          r.type === 'fallback' &&
          r.from === 'var-primary' &&
          r.to === 'var-fallback'
      );

      expect(fallback).toBeDefined();
      expect(fallback?.properties?.pattern).toBe('null-coalescing');
      expect(fallback?.confidence).toBe(0.9);
    });

    it('should detect logical OR fallback pattern (||)', () => {
      const graph = createMockGraph([
        { id: 'var-first', name: 'firstValue' },
        { id: 'var-second', name: 'secondValue' },
      ]);

      const program = createProgram({
        'logical.ts': `
          const firstValue = '';
          const secondValue = 'default';
          const result = firstValue || secondValue;
        `,
      });

      const analyzer = new AlternativesAnalyzer(graph, program);
      const result = analyzer.analyze();

      const fallback = result.find(
        (r) =>
          r.type === 'fallback' &&
          r.from === 'var-first' &&
          r.to === 'var-second'
      );

      expect(fallback).toBeDefined();
      expect(fallback?.properties?.pattern).toBe('null-coalescing');
      expect(fallback?.confidence).toBe(0.7);
    });

    it('should detect conditional (if-else) fallback pattern', () => {
      const graph = createMockGraph([
        { id: 'func-option-a', name: 'optionA' },
        { id: 'func-option-b', name: 'optionB' },
      ]);

      const program = createProgram({
        'conditional.ts': `
          function optionA() { return 'A'; }
          function optionB() { return 'B'; }

          function choose(condition: boolean) {
            if (condition) {
              optionA();
            } else {
              optionB();
            }
          }
        `,
      });

      const analyzer = new AlternativesAnalyzer(graph, program);
      const result = analyzer.analyze();

      const fallback = result.find(
        (r) =>
          r.type === 'fallback' &&
          r.from === 'func-option-a' &&
          r.to === 'func-option-b'
      );

      expect(fallback).toBeDefined();
      expect(fallback?.properties?.pattern).toBe('conditional');
      expect(fallback?.confidence).toBe(0.6);
    });

    it('should not detect fallback when same symbol used in both branches', () => {
      const graph = createMockGraph([
        { id: 'func-same', name: 'sameMethod' },
      ]);

      const program = createProgram({
        'same.ts': `
          function sameMethod() { return 'same'; }

          function main() {
            try {
              sameMethod();
            } catch (e) {
              sameMethod();
            }
          }
        `,
      });

      const analyzer = new AlternativesAnalyzer(graph, program);
      const result = analyzer.analyze();

      const fallbacks = result.filter((r) => r.type === 'fallback');
      expect(fallbacks).toHaveLength(0);
    });
  });

  describe('relationship structure', () => {
    it('should create relationships with correct structure for substitution', () => {
      const graph = createMockGraph([
        { id: 'class-a', name: 'ClassA' },
        { id: 'class-b', name: 'ClassB' },
      ]);

      const program = createProgram({
        'IInterface.ts': `export interface IInterface { doSomething(): void; }`,
        'ClassA.ts': `
          import { IInterface } from './IInterface';
          export class ClassA implements IInterface {
            doSomething(): void {}
          }
        `,
        'ClassB.ts': `
          import { IInterface } from './IInterface';
          export class ClassB implements IInterface {
            doSomething(): void {}
          }
        `,
      });

      const analyzer = new AlternativesAnalyzer(graph, program);
      const result = analyzer.analyze();

      const relationship = result.find((r) => r.type === 'substitution');

      if (relationship) {
        expect(relationship).toMatchObject({
          type: 'substitution',
          category: 'alternative',
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
        expect(relationship.properties).toHaveProperty('interface');
        expect(relationship.properties).toHaveProperty('reason');
        expect(relationship.createdAt).toBeDefined();
        expect(relationship.updatedAt).toBeDefined();
      }
    });

    it('should create relationships with correct structure for fallback', () => {
      const graph = createMockGraph([
        { id: 'func-try', name: 'tryThis' },
        { id: 'func-catch', name: 'catchThis' },
      ]);

      const program = createProgram({
        'fallback.ts': `
          function tryThis() { throw new Error(); }
          function catchThis() { return 'caught'; }

          function main() {
            try {
              tryThis();
            } catch (e) {
              catchThis();
            }
          }
        `,
      });

      const analyzer = new AlternativesAnalyzer(graph, program);
      const result = analyzer.analyze();

      const relationship = result.find((r) => r.type === 'fallback');

      if (relationship) {
        expect(relationship).toMatchObject({
          type: 'fallback',
          category: 'alternative',
          direction: 'unidirectional',
          discoveredBy: 'ast-parsing',
        });

        expect(relationship.properties).toHaveProperty('pattern');
        expect(relationship.properties).toHaveProperty('reason');
      }
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics for empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new AlternativesAnalyzer(graph);

      const stats = analyzer.getStatistics([]);

      expect(stats.totalAlternatives).toBe(0);
      expect(stats.substitutions).toBe(0);
      expect(stats.fallbacks).toBe(0);
      expect(Object.keys(stats.byPattern)).toHaveLength(0);
    });

    it('should calculate statistics correctly for substitutions', () => {
      const graph = createMockGraph([]);
      const analyzer = new AlternativesAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockSubstitutionRelationship('A', 'B'),
        createMockSubstitutionRelationship('C', 'D'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalAlternatives).toBe(2);
      expect(stats.substitutions).toBe(2);
      expect(stats.fallbacks).toBe(0);
    });

    it('should calculate statistics correctly for fallbacks', () => {
      const graph = createMockGraph([]);
      const analyzer = new AlternativesAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockFallbackRelationship('A', 'B', 'try-catch'),
        createMockFallbackRelationship('C', 'D', 'null-coalescing'),
        createMockFallbackRelationship('E', 'F', 'conditional'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalAlternatives).toBe(3);
      expect(stats.substitutions).toBe(0);
      expect(stats.fallbacks).toBe(3);
      expect(stats.byPattern['try-catch']).toBe(1);
      expect(stats.byPattern['null-coalescing']).toBe(1);
      expect(stats.byPattern['conditional']).toBe(1);
    });

    it('should calculate statistics correctly for mixed relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new AlternativesAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockSubstitutionRelationship('A', 'B'),
        createMockFallbackRelationship('C', 'D', 'try-catch'),
        createMockSubstitutionRelationship('E', 'F'),
        createMockFallbackRelationship('G', 'H', 'try-catch'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalAlternatives).toBe(4);
      expect(stats.substitutions).toBe(2);
      expect(stats.fallbacks).toBe(2);
      expect(stats.byPattern['try-catch']).toBe(2);
    });
  });

  // Helper to create mock substitution relationship
  function createMockSubstitutionRelationship(
    symbolA: string,
    symbolB: string
  ): UnifiedRelationship {
    return {
      id: `substitution-${symbolA}-${symbolB}`.toLowerCase(),
      type: 'substitution',
      category: 'alternative',
      from: symbolA,
      to: symbolB,
      direction: 'bidirectional',
      strength: 'strong',
      evidence: [{ type: 'code', source: 'test.ts', confidence: 0.9 }],
      discoveredBy: 'static-analysis',
      confidence: 0.9,
      properties: { interface: 'ITest', reason: 'Test reason' },
      description: 'Test description',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Helper to create mock fallback relationship
  function createMockFallbackRelationship(
    primary: string,
    fallback: string,
    pattern: string
  ): UnifiedRelationship {
    return {
      id: `fallback-${primary}-${fallback}`.toLowerCase(),
      type: 'fallback',
      category: 'alternative',
      from: primary,
      to: fallback,
      direction: 'unidirectional',
      strength: 'strong',
      evidence: [{ type: 'code', source: 'test.ts', confidence: 0.8 }],
      discoveredBy: 'ast-parsing',
      confidence: 0.8,
      properties: { pattern, reason: 'Test reason' },
      description: 'Test description',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
});
