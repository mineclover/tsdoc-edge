/**
 * Tests for RelationshipQueryEngine
 */

import { RelationshipQueryEngine } from '../../query/RelationshipQueryEngine';

describe('RelationshipQueryEngine', () => {
  let engine: RelationshipQueryEngine;
  let mockDb: any;

  beforeEach(() => {
    // Create mock database manager
    mockDb = {
      db: {
        prepare: jest.fn().mockReturnValue({
          all: jest.fn().mockReturnValue([]),
          get: jest.fn().mockReturnValue(null),
        }),
      },
      getAllUnifiedRelationships: jest.fn().mockReturnValue([]),
    };
    engine = new RelationshipQueryEngine(mockDb);
  });

  describe('constructor', () => {
    it('should create instance with database manager', () => {
      expect(engine).toBeInstanceOf(RelationshipQueryEngine);
    });
  });

  describe('getContext', () => {
    it('should return context for a symbol', () => {
      const context = engine.getContext('test-symbol');

      expect(context).toBeDefined();
      expect(context.symbolId).toBe('test-symbol');
      expect(context.direct).toEqual([]);
      expect(context.indirect).toEqual([]);
    });

    it('should apply type filter', () => {
      engine.getContext('test-symbol', { types: ['calls'] });

      expect(mockDb.getAllUnifiedRelationships).toHaveBeenCalled();
    });

    it('should apply category filter', () => {
      engine.getContext('test-symbol', { categories: ['behavioral'] });

      expect(mockDb.getAllUnifiedRelationships).toHaveBeenCalled();
    });
  });

  describe('findRelated', () => {
    it('should return related symbols for a symbol', () => {
      const related = engine.findRelated('test-symbol');

      expect(Array.isArray(related)).toBe(true);
    });

    it('should apply type filter', () => {
      engine.findRelated('test-symbol', { types: ['calls'] });

      expect(mockDb.getAllUnifiedRelationships).toHaveBeenCalled();
    });
  });

  describe('findPath', () => {
    it('should find path between two symbols', () => {
      const result = engine.findPath('source', 'target');

      // Empty mock returns null (no path found)
      expect(result).toBeNull();
    });

    it('should respect max depth option', () => {
      engine.findPath('source', 'target', { maxDepth: 3 });

      expect(mockDb.getAllUnifiedRelationships).toHaveBeenCalled();
    });
  });
});
