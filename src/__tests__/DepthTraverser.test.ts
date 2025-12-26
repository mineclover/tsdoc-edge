/**
 * DepthTraverser Tests
 */

import { DepthTraverser } from '../graph/DepthTraverser';
import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import type { Symbol } from '../types/graph';

describe('DepthTraverser', () => {
  let graphBuilder: SymbolGraphBuilder;
  let traverser: DepthTraverser;

  beforeEach(() => {
    graphBuilder = new SymbolGraphBuilder();
  });

  // Helper to add symbol
  function addSymbol(id: string, name: string, isExported = true): void {
    graphBuilder.addSymbol({
      id,
      name,
      type: 'class',
      filePath: `src/${name}.ts`,
      line: 1,
      column: 1,
      isExported,
      isPublic: true,
      tests: [],
      designDecisions: [],
    });
  }

  // Helper to add relationship
  function addDependency(from: string, to: string): void {
    graphBuilder.addRelationship({
      from,
      to,
      type: 'dependsOn',
      filePath: '',
    });
  }

  describe('traverse', () => {
    it('should traverse depth 0 (entry points only)', () => {
      addSymbol('A', 'A');
      addSymbol('B', 'B');
      addDependency('A', 'B');

      traverser = new DepthTraverser(graphBuilder);
      const result = traverser.traverse(['A'], {
        maxDepth: 0,
        direction: 'dependencies',
      });

      expect(result.totalSymbols).toBe(1);
      expect(result.symbolsByDepth.get(0)).toHaveLength(1);
      expect(result.symbolsByDepth.get(0)?.[0].id).toBe('A');
      expect(result.maxDepthReached).toBe(0);
    });

    it('should traverse depth 1', () => {
      addSymbol('A', 'A');
      addSymbol('B', 'B');
      addSymbol('C', 'C');
      addDependency('A', 'B');
      addDependency('A', 'C');

      traverser = new DepthTraverser(graphBuilder);
      const result = traverser.traverse(['A'], {
        maxDepth: 1,
        direction: 'dependencies',
      });

      expect(result.totalSymbols).toBe(3);
      expect(result.symbolsByDepth.get(0)).toHaveLength(1);
      expect(result.symbolsByDepth.get(1)).toHaveLength(2);
      expect(result.maxDepthReached).toBe(1);
    });

    it('should traverse multiple depths', () => {
      addSymbol('A', 'A');
      addSymbol('B', 'B');
      addSymbol('C', 'C');
      addDependency('A', 'B');
      addDependency('B', 'C');

      traverser = new DepthTraverser(graphBuilder);
      const result = traverser.traverse(['A'], {
        maxDepth: 2,
        direction: 'dependencies',
      });

      expect(result.totalSymbols).toBe(3);
      expect(result.symbolsByDepth.get(0)).toHaveLength(1);
      expect(result.symbolsByDepth.get(1)).toHaveLength(1);
      expect(result.symbolsByDepth.get(2)).toHaveLength(1);
      expect(result.maxDepthReached).toBe(2);
    });

    it('should respect maxDepth limit', () => {
      addSymbol('A', 'A');
      addSymbol('B', 'B');
      addSymbol('C', 'C');
      addSymbol('D', 'D');
      addDependency('A', 'B');
      addDependency('B', 'C');
      addDependency('C', 'D');

      traverser = new DepthTraverser(graphBuilder);
      const result = traverser.traverse(['A'], {
        maxDepth: 1,
        direction: 'dependencies',
      });

      expect(result.totalSymbols).toBe(2);
      expect(result.symbolsByDepth.has(2)).toBe(false);
    });

    it('should traverse dependents (reverse direction)', () => {
      addSymbol('A', 'A');
      addSymbol('B', 'B');
      addDependency('B', 'A'); // B depends on A

      traverser = new DepthTraverser(graphBuilder);
      const result = traverser.traverse(['A'], {
        maxDepth: 1,
        direction: 'dependents',
      });

      expect(result.totalSymbols).toBe(2);
      const depth1 = result.symbolsByDepth.get(1);
      expect(depth1).toHaveLength(1);
      expect(depth1?.[0].id).toBe('B');
    });

    it('should traverse both directions', () => {
      addSymbol('A', 'A');
      addSymbol('B', 'B');
      addSymbol('C', 'C');
      addDependency('A', 'B'); // A depends on B
      addDependency('C', 'A'); // C depends on A

      traverser = new DepthTraverser(graphBuilder);
      const result = traverser.traverse(['A'], {
        maxDepth: 1,
        direction: 'both',
      });

      expect(result.totalSymbols).toBe(3);
      const depth1Ids = result.symbolsByDepth.get(1)?.map(s => s.id) || [];
      expect(depth1Ids).toContain('B');
      expect(depth1Ids).toContain('C');
    });

    it('should apply filter function', () => {
      addSymbol('A', 'A', true);
      addSymbol('B', 'B', false);
      addSymbol('C', 'C', true);
      addDependency('A', 'B');
      addDependency('A', 'C');

      traverser = new DepthTraverser(graphBuilder);
      const result = traverser.traverse(['A'], {
        maxDepth: 1,
        direction: 'dependencies',
        filter: (s: Symbol) => s.isExported,
      });

      expect(result.totalSymbols).toBe(2);
      const depth1Ids = result.symbolsByDepth.get(1)?.map(s => s.id) || [];
      expect(depth1Ids).toContain('C');
      expect(depth1Ids).not.toContain('B');
    });

    it('should handle multiple entry points', () => {
      addSymbol('A', 'A');
      addSymbol('B', 'B');
      addSymbol('C', 'C');
      addSymbol('D', 'D');
      addDependency('A', 'C');
      addDependency('B', 'D');

      traverser = new DepthTraverser(graphBuilder);
      const result = traverser.traverse(['A', 'B'], {
        maxDepth: 1,
        direction: 'dependencies',
      });

      expect(result.totalSymbols).toBe(4);
      expect(result.symbolsByDepth.get(0)).toHaveLength(2);
      expect(result.symbolsByDepth.get(1)).toHaveLength(2);
    });

    it('should not visit same symbol twice', () => {
      addSymbol('A', 'A');
      addSymbol('B', 'B');
      addSymbol('C', 'C');
      addDependency('A', 'C');
      addDependency('B', 'C');

      traverser = new DepthTraverser(graphBuilder);
      const result = traverser.traverse(['A', 'B'], {
        maxDepth: 1,
        direction: 'dependencies',
      });

      // C should only appear once
      expect(result.totalSymbols).toBe(3);
    });

    it('should handle empty entry points', () => {
      addSymbol('A', 'A');

      traverser = new DepthTraverser(graphBuilder);
      const result = traverser.traverse([], {
        maxDepth: 1,
        direction: 'dependencies',
      });

      expect(result.totalSymbols).toBe(0);
      expect(result.maxDepthReached).toBe(0);
    });

    it('should handle non-existent entry points', () => {
      addSymbol('A', 'A');

      traverser = new DepthTraverser(graphBuilder);
      const result = traverser.traverse(['NonExistent'], {
        maxDepth: 1,
        direction: 'dependencies',
      });

      expect(result.totalSymbols).toBe(0);
    });

    it('should handle symbol with no dependencies', () => {
      addSymbol('A', 'A');

      traverser = new DepthTraverser(graphBuilder);
      const result = traverser.traverse(['A'], {
        maxDepth: 5,
        direction: 'dependencies',
      });

      expect(result.totalSymbols).toBe(1);
      expect(result.maxDepthReached).toBe(0);
    });
  });

  describe('getExportedSymbols', () => {
    it('should return only exported symbols', () => {
      addSymbol('A', 'A', true);
      addSymbol('B', 'B', false);
      addSymbol('C', 'C', true);

      traverser = new DepthTraverser(graphBuilder);
      const exported = traverser.getExportedSymbols();

      expect(exported).toHaveLength(2);
      expect(exported).toContain('A');
      expect(exported).toContain('C');
      expect(exported).not.toContain('B');
    });

    it('should return empty array for no exports', () => {
      addSymbol('A', 'A', false);

      traverser = new DepthTraverser(graphBuilder);
      const exported = traverser.getExportedSymbols();

      expect(exported).toHaveLength(0);
    });
  });

  describe('findSymbolByName', () => {
    it('should find symbol by name', () => {
      addSymbol('symbol-a', 'SymbolA');
      addSymbol('symbol-b', 'SymbolB');

      traverser = new DepthTraverser(graphBuilder);
      const id = traverser.findSymbolByName('SymbolA');

      expect(id).toBe('symbol-a');
    });

    it('should return null for non-existent name', () => {
      addSymbol('symbol-a', 'SymbolA');

      traverser = new DepthTraverser(graphBuilder);
      const id = traverser.findSymbolByName('NonExistent');

      expect(id).toBeNull();
    });
  });
});
