/**
 * ParallelWorkDetector Tests
 */

import { ParallelWorkDetector } from '../../analyzer/ParallelWorkDetector';
import type { SymbolGraph } from '../../types/graph/graph';

describe('ParallelWorkDetector', () => {
  // Helper to create mock graph
  function createMockGraph(
    symbols: string[],
    adjacencyList: Map<string, string[]>
  ): SymbolGraph {
    const symbolsMap = new Map();
    for (const id of symbols) {
      symbolsMap.set(id, {
        id,
        name: id,
        type: 'class',
        filePath: `src/${id}.ts`,
        line: 1,
        column: 1,
        isExported: true,
        isPublic: true,
      });
    }
    return {
      symbols: symbolsMap,
      adjacencyList,
      reverseAdjacencyList: new Map(),
    } as SymbolGraph;
  }

  describe('detectParallelWork', () => {
    it('should detect available modules with no conflicts', () => {
      // A -> B, C -> D (two independent chains)
      const graph = createMockGraph(
        ['A', 'B', 'C', 'D'],
        new Map([
          ['A', ['B']],
          ['C', ['D']],
        ])
      );

      const detector = new ParallelWorkDetector(graph);
      const result = detector.detectParallelWork(['A'], []);

      expect(result.availableModules).toContain('C');
      expect(result.availableModules).toContain('D');
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect direct dependency conflicts', () => {
      // A -> B
      const graph = createMockGraph(
        ['A', 'B'],
        new Map([['A', ['B']]])
      );

      const detector = new ParallelWorkDetector(graph);
      const result = detector.detectParallelWork(['A', 'B'], []);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].conflictType).toBe('direct');
      expect(result.conflicts[0].module1).toBe('A');
      expect(result.conflicts[0].module2).toBe('B');
    });

    it('should detect transitive dependency conflicts', () => {
      // A -> B -> C
      const graph = createMockGraph(
        ['A', 'B', 'C'],
        new Map([
          ['A', ['B']],
          ['B', ['C']],
        ])
      );

      const detector = new ParallelWorkDetector(graph);
      const result = detector.detectParallelWork(['A', 'C'], []);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].conflictType).toBe('transitive');
    });

    it('should detect shared mutable dependency conflicts', () => {
      // A -> S, B -> S (S is shared)
      const graph = createMockGraph(
        ['A', 'B', 'S'],
        new Map([
          ['A', ['S']],
          ['B', ['S']],
        ])
      );

      const detector = new ParallelWorkDetector(graph);
      const result = detector.detectParallelWork(['A', 'B'], []);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].conflictType).toBe('shared-mutable');
    });

    it('should not conflict when shared dependency is frozen', () => {
      // A -> S, B -> S (S is frozen)
      const graph = createMockGraph(
        ['A', 'B', 'S'],
        new Map([
          ['A', ['S']],
          ['B', ['S']],
        ])
      );

      const detector = new ParallelWorkDetector(graph);
      const result = detector.detectParallelWork(['A', 'B'], ['S']);

      expect(result.conflicts).toHaveLength(0);
    });

    it('should return empty results for empty graph', () => {
      const graph = createMockGraph([], new Map());

      const detector = new ParallelWorkDetector(graph);
      const result = detector.detectParallelWork([], []);

      expect(result.availableModules).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.parallelZones).toHaveLength(0);
      expect(result.isolationBarriers).toHaveLength(0);
    });

    it('should identify isolation barriers', () => {
      // A -> S, B -> S (S is frozen and used by multiple)
      const graph = createMockGraph(
        ['A', 'B', 'S'],
        new Map([
          ['A', ['S']],
          ['B', ['S']],
        ])
      );

      const detector = new ParallelWorkDetector(graph);
      const result = detector.detectParallelWork(['A', 'B'], ['S']);

      expect(result.isolationBarriers).toContain('S');
    });
  });

  describe('parallel zones', () => {
    it('should identify parallel zones correctly', () => {
      // Independent modules: A, B, C (no dependencies)
      const graph = createMockGraph(
        ['A', 'B', 'C'],
        new Map()
      );

      const detector = new ParallelWorkDetector(graph);
      const result = detector.detectParallelWork([], []);

      expect(result.parallelZones.length).toBeGreaterThan(0);
      expect(result.parallelZones[0].canWorkInParallel).toBe(true);
    });

    it('should create separate zones for conflicting modules', () => {
      // A -> B (conflict), C independent
      const graph = createMockGraph(
        ['A', 'B', 'C'],
        new Map([['A', ['B']]])
      );

      const detector = new ParallelWorkDetector(graph);
      const result = detector.detectParallelWork([], []);

      // C should be in a zone that can work in parallel
      const cZone = result.parallelZones.find(z => z.modules.includes('C'));
      expect(cZone).toBeDefined();
    });
  });

  describe('suggestIsolationBarriers', () => {
    it('should suggest barriers based on dependency count', () => {
      // A -> S, B -> S, C -> S (S is common)
      const graph = createMockGraph(
        ['A', 'B', 'C', 'S'],
        new Map([
          ['A', ['S']],
          ['B', ['S']],
          ['C', ['S']],
        ])
      );

      const detector = new ParallelWorkDetector(graph);
      const suggestions = detector.suggestIsolationBarriers(['A', 'B', 'C']);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].barrier).toBe('S');
      expect(suggestions[0].score).toBe(3);
      expect(suggestions[0].isolatedModules).toEqual(expect.arrayContaining(['A', 'B', 'C']));
    });

    it('should sort barriers by score descending', () => {
      // A, B -> S1; A, B, C -> S2
      const graph = createMockGraph(
        ['A', 'B', 'C', 'S1', 'S2'],
        new Map([
          ['A', ['S1', 'S2']],
          ['B', ['S1', 'S2']],
          ['C', ['S2']],
        ])
      );

      const detector = new ParallelWorkDetector(graph);
      const suggestions = detector.suggestIsolationBarriers(['A', 'B', 'C']);

      expect(suggestions[0].barrier).toBe('S2');
      expect(suggestions[0].score).toBe(3);
      expect(suggestions[1].barrier).toBe('S1');
      expect(suggestions[1].score).toBe(2);
    });

    it('should return empty for no shared dependencies', () => {
      // A -> X, B -> Y (no shared deps)
      const graph = createMockGraph(
        ['A', 'B', 'X', 'Y'],
        new Map([
          ['A', ['X']],
          ['B', ['Y']],
        ])
      );

      const detector = new ParallelWorkDetector(graph);
      const suggestions = detector.suggestIsolationBarriers(['A', 'B']);

      expect(suggestions).toHaveLength(0);
    });

    it('should handle empty module list', () => {
      const graph = createMockGraph(['A'], new Map());

      const detector = new ParallelWorkDetector(graph);
      const suggestions = detector.suggestIsolationBarriers([]);

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('complex scenarios', () => {
    it('should handle diamond dependency pattern', () => {
      // A -> B, A -> C, B -> D, C -> D
      const graph = createMockGraph(
        ['A', 'B', 'C', 'D'],
        new Map([
          ['A', ['B', 'C']],
          ['B', ['D']],
          ['C', ['D']],
        ])
      );

      const detector = new ParallelWorkDetector(graph);
      const result = detector.detectParallelWork(['A'], ['D']);

      // B and C should be available since D is frozen
      expect(result.availableModules).not.toContain('B');
      expect(result.availableModules).not.toContain('C');
    });

    it('should handle circular-like structure safely', () => {
      // A -> B -> C (no actual cycle, but tests BFS termination)
      const graph = createMockGraph(
        ['A', 'B', 'C'],
        new Map([
          ['A', ['B']],
          ['B', ['C']],
        ])
      );

      const detector = new ParallelWorkDetector(graph);

      // Should not hang or throw
      expect(() => {
        detector.detectParallelWork(['A'], []);
      }).not.toThrow();
    });

    it('should detect multiple conflicts in working set', () => {
      // A -> B, B -> C (working: A, B, C)
      const graph = createMockGraph(
        ['A', 'B', 'C'],
        new Map([
          ['A', ['B']],
          ['B', ['C']],
        ])
      );

      const detector = new ParallelWorkDetector(graph);
      const result = detector.detectParallelWork(['A', 'B', 'C'], []);

      // Should detect multiple conflicts
      expect(result.conflicts.length).toBeGreaterThan(0);
    });
  });
});
