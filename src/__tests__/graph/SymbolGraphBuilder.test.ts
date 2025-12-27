/**
 * Tests for SymbolGraphBuilder
 * @testScenario Verify symbol graph building and relationship tracking
 */

import { SymbolGraphBuilder } from '../../graph/SymbolGraphBuilder';
import type { Symbol, SymbolRelationship } from '../../types/graph';

describe('SymbolGraphBuilder', () => {
  let builder: SymbolGraphBuilder;

  beforeEach(() => {
    builder = new SymbolGraphBuilder();
  });

  describe('Symbol Management', () => {
    it('should add a symbol to the graph', () => {
      const symbol: Symbol = {
        id: 'sym1',
        name: 'testFunction',
        type: 'function',
        filePath: '/test/file.ts',
        line: 10,
        column: 0,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      builder.addSymbol(symbol);

      const retrieved = builder.getSymbol('sym1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('testFunction');
    });

    it('should index symbols by name', () => {
      const symbol1: Symbol = {
        id: 'sym1',
        name: 'duplicate',
        type: 'function',
        filePath: '/test/file1.ts',
        line: 10,
        column: 0,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      const symbol2: Symbol = {
        id: 'sym2',
        name: 'duplicate',
        type: 'function',
        filePath: '/test/file2.ts',
        line: 20,
        column: 0,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      builder.addSymbol(symbol1);
      builder.addSymbol(symbol2);

      const symbols = builder.getSymbolsByName('duplicate');
      expect(symbols).toHaveLength(2);
      expect(symbols.map((s) => s.id)).toContain('sym1');
      expect(symbols.map((s) => s.id)).toContain('sym2');
    });

    it('should index symbols by file path', () => {
      const symbol1: Symbol = {
        id: 'sym1',
        name: 'func1',
        type: 'function',
        filePath: '/test/file.ts',
        line: 10,
        column: 0,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      const symbol2: Symbol = {
        id: 'sym2',
        name: 'func2',
        type: 'function',
        filePath: '/test/file.ts',
        line: 20,
        column: 0,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      builder.addSymbol(symbol1);
      builder.addSymbol(symbol2);

      const symbols = builder.getSymbolsInFile('/test/file.ts');
      expect(symbols).toHaveLength(2);
    });
  });

  describe('Relationship Management', () => {
    beforeEach(() => {
      // Add test symbols
      const symbols: Symbol[] = [
        {
          id: 'A',
          name: 'SymbolA',
          type: 'function',
          filePath: '/test/a.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'B',
          name: 'SymbolB',
          type: 'function',
          filePath: '/test/b.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'C',
          name: 'SymbolC',
          type: 'function',
          filePath: '/test/c.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
      ];

      symbols.forEach((s) => builder.addSymbol(s));
    });

    it('should add a relationship between symbols', () => {
      const relationship: SymbolRelationship = {
        type: 'dependsOn',
        from: 'A',
        to: 'B',
        filePath: '/test/a.ts',
      };

      builder.addRelationship(relationship);

      const relationships = builder.getRelationships('A');
      expect(relationships).toHaveLength(1);
      expect(relationships[0].to).toBe('B');
    });

    it('should track dependencies correctly', () => {
      builder.addRelationship({
        type: 'dependsOn',
        from: 'A',
        to: 'B',
        filePath: '/test/a.ts',
      });

      builder.addRelationship({
        type: 'dependsOn',
        from: 'A',
        to: 'C',
        filePath: '/test/a.ts',
      });

      const dependencies = builder.getDependencies('A');
      expect(dependencies).toHaveLength(2);
      expect(dependencies).toContain('B');
      expect(dependencies).toContain('C');
    });

    it('should track dependents (reverse dependencies)', () => {
      builder.addRelationship({
        type: 'dependsOn',
        from: 'A',
        to: 'B',
        filePath: '/test/a.ts',
      });

      builder.addRelationship({
        type: 'dependsOn',
        from: 'C',
        to: 'B',
        filePath: '/test/c.ts',
      });

      const dependents = builder.getDependents('B');
      expect(dependents).toHaveLength(2);
      expect(dependents).toContain('A');
      expect(dependents).toContain('C');
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should detect simple circular dependency (A -> B -> A)', () => {
      const symbols: Symbol[] = [
        {
          id: 'A',
          name: 'SymbolA',
          type: 'function',
          filePath: '/test/a.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'B',
          name: 'SymbolB',
          type: 'function',
          filePath: '/test/b.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
      ];

      symbols.forEach((s) => builder.addSymbol(s));

      builder.addRelationship({
        type: 'dependsOn',
        from: 'A',
        to: 'B',
        filePath: '/test/a.ts',
      });

      builder.addRelationship({
        type: 'dependsOn',
        from: 'B',
        to: 'A',
        filePath: '/test/b.ts',
      });

      const cycles = builder.detectCircularDependencies();
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain('A');
      expect(cycles[0]).toContain('B');
    });

    it('should detect complex circular dependency (A -> B -> C -> A)', () => {
      const symbols: Symbol[] = [
        {
          id: 'A',
          name: 'SymbolA',
          type: 'function',
          filePath: '/test/a.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'B',
          name: 'SymbolB',
          type: 'function',
          filePath: '/test/b.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'C',
          name: 'SymbolC',
          type: 'function',
          filePath: '/test/c.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
      ];

      symbols.forEach((s) => builder.addSymbol(s));

      builder.addRelationship({
        type: 'dependsOn',
        from: 'A',
        to: 'B',
        filePath: '/test/a.ts',
      });

      builder.addRelationship({
        type: 'dependsOn',
        from: 'B',
        to: 'C',
        filePath: '/test/b.ts',
      });

      builder.addRelationship({
        type: 'dependsOn',
        from: 'C',
        to: 'A',
        filePath: '/test/c.ts',
      });

      const cycles = builder.detectCircularDependencies();
      expect(cycles.length).toBeGreaterThan(0);
      const cycle = cycles[0];
      expect(cycle).toContain('A');
      expect(cycle).toContain('B');
      expect(cycle).toContain('C');
    });

    it('should not detect cycles when there are none', () => {
      const symbols: Symbol[] = [
        {
          id: 'A',
          name: 'SymbolA',
          type: 'function',
          filePath: '/test/a.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'B',
          name: 'SymbolB',
          type: 'function',
          filePath: '/test/b.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'C',
          name: 'SymbolC',
          type: 'function',
          filePath: '/test/c.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
      ];

      symbols.forEach((s) => builder.addSymbol(s));

      // Linear chain: A -> B -> C
      builder.addRelationship({
        type: 'dependsOn',
        from: 'A',
        to: 'B',
        filePath: '/test/a.ts',
      });

      builder.addRelationship({
        type: 'dependsOn',
        from: 'B',
        to: 'C',
        filePath: '/test/b.ts',
      });

      const cycles = builder.detectCircularDependencies();
      expect(cycles).toHaveLength(0);
    });
  });

  describe('Graph Statistics', () => {
    it('should calculate correct statistics', () => {
      const symbols: Symbol[] = [
        {
          id: 'A',
          name: 'SymbolA',
          type: 'function',
          filePath: '/test/a.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'B',
          name: 'SymbolB',
          type: 'function',
          filePath: '/test/b.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'C',
          name: 'SymbolC',
          type: 'function',
          filePath: '/test/c.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'D',
          name: 'SymbolD',
          type: 'function',
          filePath: '/test/d.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      symbols.forEach((s) => builder.addSymbol(s));

      // A -> B, A -> C
      builder.addRelationship({
        type: 'dependsOn',
        from: 'A',
        to: 'B',
        filePath: '/test/a.ts',
      });

      builder.addRelationship({
        type: 'dependsOn',
        from: 'A',
        to: 'C',
        filePath: '/test/a.ts',
      });

      // D is orphaned

      const stats = builder.getStatistics();
      expect(stats.totalSymbols).toBe(4);
      expect(stats.totalRelationships).toBe(2);
      expect(stats.maxDependencies).toBe(2);
      expect(stats.orphanedSymbols).toBe(1); // D is orphaned
    });
  });

  describe('Graph Clearing', () => {
    it('should clear all data from the graph', () => {
      const symbol: Symbol = {
        id: 'sym1',
        name: 'testFunction',
        type: 'function',
        filePath: '/test/file.ts',
        line: 10,
        column: 0,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      builder.addSymbol(symbol);
      expect(builder.getAllSymbols()).toHaveLength(1);

      builder.clear();
      expect(builder.getAllSymbols()).toHaveLength(0);
    });
  });
});
