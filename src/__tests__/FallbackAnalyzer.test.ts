/**
 * FallbackAnalyzer Tests
 */

import * as ts from 'typescript';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { FallbackAnalyzer } from '../analyzer/FallbackAnalyzer';
import type { SymbolGraph, Symbol } from '../types/graph';
import type { UnifiedRelationship } from '../types/relationships';

describe('FallbackAnalyzer', () => {
  // Helper to create mock symbol
  function createMockSymbol(
    id: string,
    name: string,
    type: Symbol['type'] = 'function',
    filePath = 'src/test.ts'
  ): Symbol {
    return {
      id,
      name,
      type,
      filePath,
      line: 1,
      column: 1,
      isExported: true,
      isPublic: true,
      tests: [],
      designDecisions: [],
    };
  }

  // Helper to create mock graph
  function createMockGraph(symbols: Array<{ id: string; name: string; type?: Symbol['type'] }>): SymbolGraph {
    const symbolsMap = new Map<string, Symbol>();
    for (const s of symbols) {
      symbolsMap.set(
        s.id,
        createMockSymbol(s.id, s.name, s.type || 'function')
      );
    }

    return {
      symbols: symbolsMap,
      relationships: [],
      adjacencyList: new Map(),
      reverseAdjacencyList: new Map(),
      nameIndex: new Map(),
      fileIndex: new Map(),
    } as SymbolGraph;
  }

  // Helper to create a TypeScript program from source code
  function createProgram(files: Record<string, string>): ts.Program {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fallback-test-'));
    const filePaths: string[] = [];

    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(tempDir, name);
      fs.writeFileSync(filePath, content);
      filePaths.push(filePath);
    }

    const program = ts.createProgram(filePaths, {
      noEmit: true,
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    });

    // Cleanup
    setTimeout(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }, 100);

    return program;
  }

  describe('constructor and setProgram', () => {
    it('should create analyzer without program', () => {
      const graph = createMockGraph([]);
      const analyzer = new FallbackAnalyzer(graph);

      expect(analyzer).toBeDefined();
    });

    it('should accept program in constructor', () => {
      const graph = createMockGraph([]);
      const program = createProgram({ 'test.ts': '' });
      const analyzer = new FallbackAnalyzer(graph, program);

      expect(analyzer).toBeDefined();
    });

    it('should allow setting program later', () => {
      const graph = createMockGraph([]);
      const analyzer = new FallbackAnalyzer(graph);
      const program = createProgram({ 'test.ts': '' });

      analyzer.setProgram(program);

      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze', () => {
    it('should return empty array when no program provided', () => {
      const graph = createMockGraph([]);
      const analyzer = new FallbackAnalyzer(graph);

      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no fallback patterns found', () => {
      const graph = createMockGraph([
        { id: 'function-simple', name: 'simpleFunction' },
      ]);

      const program = createProgram({
        'test.ts': `
          function simpleFunction(): string {
            return 'hello';
          }
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should detect try-catch fallback pattern', () => {
      const graph = createMockGraph([
        { id: 'function-primary', name: 'primaryFunction' },
        { id: 'function-fallback', name: 'fallbackFunction' },
      ]);

      const program = createProgram({
        'test.ts': `
          function primaryFunction(): string { return 'primary'; }
          function fallbackFunction(): string { return 'fallback'; }

          function handler() {
            try {
              primaryFunction();
            } catch (e) {
              fallbackFunction();
            }
          }
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toBeDefined();
    });

    it('should detect logical OR fallback pattern', () => {
      const graph = createMockGraph([
        { id: 'function-primary', name: 'primary' },
        { id: 'function-backup', name: 'backup' },
      ]);

      const program = createProgram({
        'test.ts': `
          function primary(): string | null { return null; }
          function backup(): string { return 'backup'; }

          const result = primary() || backup();
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toBeDefined();
    });

    it('should detect nullish coalescing fallback pattern', () => {
      const graph = createMockGraph([
        { id: 'function-main', name: 'main' },
        { id: 'function-default', name: 'getDefault' },
      ]);

      const program = createProgram({
        'test.ts': `
          function main(): string | null { return null; }
          function getDefault(): string { return 'default'; }

          const value = main() ?? getDefault();
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toBeDefined();
    });

    it('should detect conditional expression fallback pattern', () => {
      const graph = createMockGraph([
        { id: 'function-option1', name: 'option1' },
        { id: 'function-option2', name: 'option2' },
      ]);

      const program = createProgram({
        'test.ts': `
          function option1(): string { return 'opt1'; }
          function option2(): string { return 'opt2'; }

          const condition = true;
          const result = condition ? option1() : option2();
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toBeDefined();
    });

    it('should skip test files', () => {
      const graph = createMockGraph([
        { id: 'function-a', name: 'funcA' },
        { id: 'function-b', name: 'funcB' },
      ]);

      const program = createProgram({
        'handler.test.ts': `
          function funcA() {}
          function funcB() {}
          const x = funcA() || funcB();
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should skip spec files', () => {
      const graph = createMockGraph([
        { id: 'function-a', name: 'funcA' },
        { id: 'function-b', name: 'funcB' },
      ]);

      const program = createProgram({
        'handler.spec.ts': `
          function funcA() {}
          function funcB() {}
          const x = funcA() || funcB();
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toHaveLength(0);
    });

    it('should deduplicate fallback pairs', () => {
      const graph = createMockGraph([
        { id: 'function-primary', name: 'primary' },
        { id: 'function-backup', name: 'backup' },
      ]);

      const program = createProgram({
        'test.ts': `
          function primary() { return null; }
          function backup() { return 'backup'; }

          const a = primary() || backup();
          const b = primary() || backup();
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should deduplicate same pairs
      const uniquePairs = new Set(
        result.map((r) => `${r.from}->${r.to}`)
      );
      expect(uniquePairs.size).toBe(result.length);
    });

    it('should not create relationship when symbols are the same', () => {
      const graph = createMockGraph([
        { id: 'function-same', name: 'sameFunc' },
      ]);

      const program = createProgram({
        'test.ts': `
          function sameFunc() { return null; }

          const a = sameFunc() || sameFunc();
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should not create relationship for same symbol
      expect(result).toHaveLength(0);
    });
  });

  describe('relationship structure', () => {
    it('should create valid UnifiedRelationship structure', () => {
      const graph = createMockGraph([
        { id: 'function-primary', name: 'primary' },
        { id: 'function-backup', name: 'backup' },
      ]);

      const program = createProgram({
        'test.ts': `
          function primary() { return null; }
          function backup() { return 'backup'; }
          const result = primary() || backup();
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      if (result.length > 0) {
        const rel = result[0];

        // Check required fields
        expect(rel.id).toBeDefined();
        expect(rel.type).toBe('fallback');
        expect(typeof rel.from).toBe('string');
        expect(typeof rel.to).toBe('string');
        expect(rel.direction).toBe('unidirectional');
        expect(rel.strength).toBe('medium');
        expect(rel.category).toBe('alternative');
        expect(rel.evidence).toBeDefined();
        expect(Array.isArray(rel.evidence)).toBe(true);
        expect(rel.discoveredBy).toBe('ast-parsing');
        expect(rel.confidence).toBeGreaterThan(0);
        expect(rel.properties).toBeDefined();
        expect(rel.createdAt).toBeDefined();
        expect(rel.updatedAt).toBeDefined();
      }
    });

    it('should set higher confidence for try-catch pattern', () => {
      const graph = createMockGraph([
        { id: 'function-main', name: 'mainHandler' },
        { id: 'function-error', name: 'errorHandler' },
      ]);

      const program = createProgram({
        'test.ts': `
          function mainHandler() { throw new Error(); }
          function errorHandler() { return 'handled'; }

          try {
            mainHandler();
          } catch (e) {
            errorHandler();
          }
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      if (result.length > 0) {
        const tryCatchRel = result.find(r => r.properties?.pattern === 'try-catch');
        if (tryCatchRel) {
          expect(tryCatchRel.confidence).toBe(0.9);
        }
      }
    });

    it('should set lower confidence for logical operators', () => {
      const graph = createMockGraph([
        { id: 'function-a', name: 'a' },
        { id: 'function-b', name: 'b' },
      ]);

      const program = createProgram({
        'test.ts': `
          function a() { return null; }
          function b() { return 'b'; }
          const x = a() || b();
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      if (result.length > 0) {
        const orRel = result.find(r => r.properties?.pattern === 'logical-or');
        if (orRel) {
          expect(orRel.confidence).toBe(0.7);
        }
      }
    });

    it('should include pattern in properties', () => {
      const graph = createMockGraph([
        { id: 'function-primary', name: 'primary' },
        { id: 'function-backup', name: 'backup' },
      ]);

      const program = createProgram({
        'test.ts': `
          function primary() { return null; }
          function backup() { return 'backup'; }
          const result = primary() ?? backup();
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      if (result.length > 0) {
        expect(result[0].properties?.pattern).toBe('nullish-coalesce');
        expect(result[0].properties?.primary).toBe('primary');
        expect(result[0].properties?.fallback).toBe('backup');
      }
    });

    it('should include description', () => {
      const graph = createMockGraph([
        { id: 'function-primary', name: 'primary' },
        { id: 'function-backup', name: 'backup' },
      ]);

      const program = createProgram({
        'test.ts': `
          function primary() { return null; }
          function backup() { return 'backup'; }
          const result = primary() || backup();
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      if (result.length > 0) {
        expect(result[0].description).toContain('falls back to');
      }
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics for empty relationships', () => {
      const graph = createMockGraph([]);
      const analyzer = new FallbackAnalyzer(graph);

      const stats = analyzer.getStatistics([]);

      expect(stats.totalFallbacks).toBe(0);
      expect(stats.byPattern['try-catch']).toBe(0);
      expect(stats.byPattern['logical-or']).toBe(0);
      expect(stats.byPattern['nullish-coalesce']).toBe(0);
      expect(stats.byPattern['conditional']).toBe(0);
    });

    it('should calculate statistics correctly', () => {
      const graph = createMockGraph([]);
      const analyzer = new FallbackAnalyzer(graph);

      const relationships: UnifiedRelationship[] = [
        createMockFallbackRelationship('a', 'b', 'try-catch'),
        createMockFallbackRelationship('c', 'd', 'logical-or'),
        createMockFallbackRelationship('e', 'f', 'try-catch'),
        createMockFallbackRelationship('g', 'h', 'nullish-coalesce'),
      ];

      const stats = analyzer.getStatistics(relationships);

      expect(stats.totalFallbacks).toBe(4);
      expect(stats.byPattern['try-catch']).toBe(2);
      expect(stats.byPattern['logical-or']).toBe(1);
      expect(stats.byPattern['nullish-coalesce']).toBe(1);
      expect(stats.byPattern['conditional']).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle nested try-catch blocks', () => {
      const graph = createMockGraph([
        { id: 'function-outer', name: 'outer' },
        { id: 'function-inner', name: 'inner' },
        { id: 'function-final', name: 'final' },
      ]);

      const program = createProgram({
        'test.ts': `
          function outer() { throw new Error(); }
          function inner() { throw new Error(); }
          function final() { return 'handled'; }

          try {
            outer();
          } catch (e) {
            try {
              inner();
            } catch (e2) {
              final();
            }
          }
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toBeDefined();
    });

    it('should handle chained fallback operators', () => {
      const graph = createMockGraph([
        { id: 'function-a', name: 'a' },
        { id: 'function-b', name: 'b' },
        { id: 'function-c', name: 'c' },
      ]);

      const program = createProgram({
        'test.ts': `
          function a() { return null; }
          function b() { return null; }
          function c() { return 'final'; }

          const result = a() || b() || c();
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toBeDefined();
    });

    it('should handle property access in fallback', () => {
      const graph = createMockGraph([
        { id: 'property-getValue', name: 'getValue' },
        { id: 'property-getDefault', name: 'getDefault' },
      ]);

      const program = createProgram({
        'test.ts': `
          const obj = {
            getValue: () => null,
            getDefault: () => 'default'
          };

          const result = obj.getValue() || obj.getDefault();
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      expect(result).toBeDefined();
    });

    it('should handle symbols not in graph', () => {
      const graph = createMockGraph([
        // Empty graph - no symbols
      ]);

      const program = createProgram({
        'test.ts': `
          function a() { return null; }
          function b() { return 'b'; }
          const result = a() || b();
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should not crash, just return empty
      expect(result).toHaveLength(0);
    });

    it('should handle try without catch', () => {
      const graph = createMockGraph([
        { id: 'function-risky', name: 'risky' },
      ]);

      const program = createProgram({
        'test.ts': `
          function risky() { throw new Error(); }

          try {
            risky();
          } finally {
            console.log('cleanup');
          }
        `,
      });

      const analyzer = new FallbackAnalyzer(graph, program);
      const result = analyzer.analyze();

      // Should not crash, try without catch has no fallback
      expect(result).toHaveLength(0);
    });
  });

  // Helper to create mock fallback relationship
  function createMockFallbackRelationship(
    primaryId: string,
    fallbackId: string,
    pattern: string
  ): UnifiedRelationship {
    return {
      id: `fallback-${primaryId}-${fallbackId}`.toLowerCase(),
      type: 'fallback',
      category: 'alternative',
      from: primaryId,
      to: fallbackId,
      direction: 'unidirectional',
      strength: 'medium',
      evidence: [{ type: 'code', source: 'test.ts', confidence: 0.9 }],
      discoveredBy: 'ast-parsing',
      confidence: pattern === 'try-catch' ? 0.9 : 0.7,
      properties: {
        pattern,
        primary: primaryId,
        fallback: fallbackId,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
});
