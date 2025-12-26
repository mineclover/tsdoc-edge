/**
 * BidirectionalDocReferenceGenerator Tests
 */

import { BidirectionalDocReferenceGenerator } from '../analyzer/BidirectionalDocReferenceGenerator';
import type { UnifiedRelationship } from '../types/relationships/unified';

describe('BidirectionalDocReferenceGenerator', () => {
  let generator: BidirectionalDocReferenceGenerator;

  beforeEach(() => {
    generator = new BidirectionalDocReferenceGenerator();
  });

  // Helper to create a doc-reference relationship
  function createDocReference(
    id: string,
    from: string | string[],
    to: string | string[],
    additionalProps?: Record<string, unknown>
  ): UnifiedRelationship {
    return {
      id,
      type: 'doc-reference',
      from: Array.isArray(from) ? from : [from],
      to: Array.isArray(to) ? to : [to],
      direction: 'unidirectional',
      strength: 'strong',
      category: 'semantic',
      evidence: [{ type: 'documentation', source: 'test', confidence: 1.0 }],
      discoveredBy: 'documentation',
      confidence: 0.9,
      filePath: 'src/test.ts',
      line: 10,
      properties: additionalProps || {},
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };
  }

  describe('generateReverseRelationships', () => {
    it('should generate reverse relationships from forward doc-references', () => {
      const forward = createDocReference(
        'ref-1',
        'class-userservice',
        'doc:UserGuide'
      );

      const reverses = generator.generateReverseRelationships([forward]);

      expect(reverses).toHaveLength(1);
      expect(reverses[0].id).toBe('doc-reference-reverse-ref-1');
      expect(reverses[0].from).toEqual(['doc:UserGuide']);
      expect(reverses[0].to).toEqual(['class-userservice']);
      expect(reverses[0].properties?.inferred).toBe(true);
      expect(reverses[0].properties?.reverseOf).toBe('ref-1');
      expect(reverses[0].properties?.direction).toBe('doc-to-code');
    });

    it('should skip non-doc-reference relationships', () => {
      const nonDocRef: UnifiedRelationship = {
        id: 'dep-1',
        type: 'code-dependency',
        from: ['A'],
        to: ['B'],
        direction: 'unidirectional',
        strength: 'strong',
        category: 'structural',
        evidence: [],
        discoveredBy: 'static-analysis',
        confidence: 1.0,
        properties: {},
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };

      const reverses = generator.generateReverseRelationships([nonDocRef]);

      expect(reverses).toHaveLength(0);
    });

    it('should handle multiple forward relationships', () => {
      const forwards = [
        createDocReference('ref-1', 'class-a', 'doc:DocA'),
        createDocReference('ref-2', 'class-b', 'doc:DocB'),
        createDocReference('ref-3', 'interface-c', 'doc:DocC'),
      ];

      const reverses = generator.generateReverseRelationships(forwards);

      expect(reverses).toHaveLength(3);
      expect(reverses[0].from).toEqual(['doc:DocA']);
      expect(reverses[1].from).toEqual(['doc:DocB']);
      expect(reverses[2].from).toEqual(['doc:DocC']);
    });

    it('should preserve section in description', () => {
      const forward = createDocReference(
        'ref-1',
        'function-handleclick',
        'doc:Events',
        { section: 'click-handling' }
      );

      const reverses = generator.generateReverseRelationships([forward]);

      expect(reverses[0].description).toContain('#click-handling');
    });

    it('should handle empty input', () => {
      const reverses = generator.generateReverseRelationships([]);
      expect(reverses).toHaveLength(0);
    });

    it('should preserve evidence from forward relationship', () => {
      const forward = createDocReference('ref-1', 'class-a', 'doc:DocA');
      forward.evidence = [
        { type: 'documentation', source: 'jsdoc', confidence: 0.95 },
        { type: 'code', source: 'ast', confidence: 1.0 },
      ];

      const reverses = generator.generateReverseRelationships([forward]);

      expect(reverses[0].evidence.length).toBeGreaterThanOrEqual(2);
      expect(reverses[0].evidence[0]).toEqual(forward.evidence[0]);
      expect(reverses[0].evidence[1]).toEqual(forward.evidence[1]);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics for mixed relationships', () => {
      const relationships: UnifiedRelationship[] = [
        // Forward relationships
        createDocReference('ref-1', 'class-userservice', 'doc:UserGuide'),
        createDocReference('ref-2', 'interface-config', 'doc:Configuration'),
        // Reverse relationships (inferred)
        createDocReference('rev-1', 'doc:UserGuide', 'class-userservice', {
          inferred: true,
          direction: 'doc-to-code',
        }),
      ];

      const stats = generator.getStatistics(relationships);

      expect(stats.total).toBe(3);
      expect(stats.forward).toBe(2);
      expect(stats.reverse).toBe(1);
    });

    it('should count unique code and doc symbols', () => {
      const relationships: UnifiedRelationship[] = [
        createDocReference('ref-1', 'class-a', 'doc:DocA'),
        createDocReference('ref-2', 'class-a', 'doc:DocB'), // Same code symbol
        createDocReference('ref-3', 'function-b', 'doc:DocA'), // Same doc symbol
      ];

      const stats = generator.getStatistics(relationships);

      expect(stats.uniqueCodeSymbols).toBe(2); // class-a, function-b
      expect(stats.uniqueDocSymbols).toBe(2); // doc:DocA, doc:DocB
    });

    it('should skip non-doc-reference relationships', () => {
      const relationships: UnifiedRelationship[] = [
        createDocReference('ref-1', 'class-a', 'doc:DocA'),
        {
          id: 'dep-1',
          type: 'code-dependency',
          from: ['X'],
          to: ['Y'],
          direction: 'unidirectional',
          strength: 'strong',
          category: 'structural',
          evidence: [],
          discoveredBy: 'static-analysis',
          confidence: 1.0,
          properties: {},
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ];

      const stats = generator.getStatistics(relationships);

      expect(stats.total).toBe(1);
    });

    it('should return zeros for empty input', () => {
      const stats = generator.getStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.forward).toBe(0);
      expect(stats.reverse).toBe(0);
      expect(stats.uniqueCodeSymbols).toBe(0);
      expect(stats.uniqueDocSymbols).toBe(0);
    });

    it('should identify code symbols by pattern', () => {
      const relationships: UnifiedRelationship[] = [
        createDocReference('ref-1', 'class-userservice', 'doc:Guide'),
        createDocReference('ref-2', 'interface-config', 'doc:Config'),
        createDocReference('ref-3', 'function-handler', 'doc:API'),
        createDocReference('ref-4', 'test-runner', 'doc:Testing'),
      ];

      const stats = generator.getStatistics(relationships);

      expect(stats.uniqueCodeSymbols).toBe(4);
      expect(stats.uniqueDocSymbols).toBe(4);
    });
  });
});
