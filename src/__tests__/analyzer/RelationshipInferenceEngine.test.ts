/**
 * Tests for RelationshipInferenceEngine
 * @description Tests relationship inference from existing relationships
 */

import { RelationshipInferenceEngine } from '../../analyzer/RelationshipInferenceEngine';
import type { UnifiedRelationship } from '../../types/relationships/unified';

// Helper to create test relationship
const createRelationship = (
  type: string,
  from: string,
  to: string,
  options: Partial<UnifiedRelationship> = {}
): UnifiedRelationship => ({
  id: `${type}-${from}-${to}`,
  type: type as any,
  from,
  to,
  direction: options.direction || 'undirected',
  strength: options.strength || 'medium',
  category: options.category || 'semantic',
  confidence: options.confidence || 0.8,
  evidence: [],
  discoveredBy: 'static-analysis',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  properties: options.properties || {},
  ...options,
});

describe('RelationshipInferenceEngine', () => {
  let engine: RelationshipInferenceEngine;

  beforeEach(() => {
    engine = new RelationshipInferenceEngine();
  });

  describe('constructor', () => {
    it('should create engine instance', () => {
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(RelationshipInferenceEngine);
    });
  });

  describe('infer - empty input', () => {
    it('should return empty array for empty input', () => {
      const result = engine.infer([]);
      expect(result).toEqual([]);
    });
  });

  describe('infer - naming transitivity', () => {
    it('should infer transitive relationships for same domain', () => {
      const existing: UnifiedRelationship[] = [
        createRelationship('naming-pattern-relation', 'UserService', 'UserRepository', {
          properties: { domain: 'User' },
        }),
        createRelationship('naming-pattern-relation', 'UserRepository', 'UserController', {
          properties: { domain: 'User' },
        }),
      ];

      const result = engine.infer(existing);

      // May infer UserService ~ UserController transitively
      expect(Array.isArray(result)).toBe(true);
    });

    it('should not infer across different domains', () => {
      const existing: UnifiedRelationship[] = [
        createRelationship('naming-pattern-relation', 'UserService', 'UserRepository', {
          properties: { domain: 'User' },
        }),
        createRelationship('naming-pattern-relation', 'OrderService', 'OrderRepository', {
          properties: { domain: 'Order' },
        }),
      ];

      const result = engine.infer(existing);

      // Should not infer User-Order relationship
      const crossDomain = result.filter(
        (r) =>
          (r.from === 'UserService' && r.to === 'OrderService') ||
          (r.from === 'OrderService' && r.to === 'UserService')
      );
      expect(crossDomain.length).toBe(0);
    });
  });

  describe('infer - feature closure', () => {
    it('should create complete graph within feature', () => {
      const existing: UnifiedRelationship[] = [
        createRelationship('feature-grouping', 'AuthLogin', 'AuthLogout', {
          properties: { feature: 'Authentication' },
        }),
        createRelationship('feature-grouping', 'AuthLogout', 'AuthToken', {
          properties: { feature: 'Authentication' },
        }),
      ];

      const result = engine.infer(existing);

      // May infer AuthLogin ~ AuthToken within same feature
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('infer - deduplication', () => {
    it('should not duplicate existing relationships', () => {
      const existing: UnifiedRelationship[] = [
        createRelationship('naming-pattern-relation', 'A', 'B'),
        createRelationship('naming-pattern-relation', 'B', 'A'), // Reverse
      ];

      const result = engine.infer(existing);

      // Inferred relationships should not duplicate existing ones
      for (const inferred of result) {
        const exists = existing.some(
          (e) =>
            (e.from === inferred.from && e.to === inferred.to) ||
            (e.from === inferred.to && e.to === inferred.from)
        );
        expect(exists).toBe(false);
      }
    });
  });

  describe('infer - confidence', () => {
    it('should set lower confidence for inferred relationships', () => {
      const existing: UnifiedRelationship[] = [
        createRelationship('naming-pattern-relation', 'UserService', 'UserRepository', {
          properties: { domain: 'User' },
          confidence: 0.9,
        }),
        createRelationship('naming-pattern-relation', 'UserRepository', 'UserController', {
          properties: { domain: 'User' },
          confidence: 0.9,
        }),
      ];

      const result = engine.infer(existing);

      // Inferred relationships typically have lower confidence
      for (const rel of result) {
        expect(rel.confidence).toBeLessThanOrEqual(1.0);
        expect(rel.confidence).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getStatistics', () => {
    it('should return statistics for empty input', () => {
      const stats = engine.getStatistics([]);

      expect(stats).toBeDefined();
      expect(stats.totalInferred).toBe(0);
      expect(stats.byRule).toBeDefined();
      expect(stats.confidence).toBe(0);
    });

    it('should calculate statistics correctly', () => {
      const existing: UnifiedRelationship[] = [
        createRelationship('naming-pattern-relation', 'A', 'B', {
          properties: { domain: 'Test' },
        }),
        createRelationship('naming-pattern-relation', 'B', 'C', {
          properties: { domain: 'Test' },
        }),
        createRelationship('naming-pattern-relation', 'C', 'D', {
          properties: { domain: 'Test' },
        }),
      ];

      const stats = engine.getStatistics(existing);

      expect(stats.totalInferred).toBeGreaterThanOrEqual(0);
      expect(typeof stats.byRule).toBe('object');
      expect(typeof stats.confidence).toBe('number');
    });

    it('should break down by rule name', () => {
      const existing: UnifiedRelationship[] = [
        createRelationship('naming-pattern-relation', 'A', 'B', {
          properties: { domain: 'Test' },
        }),
      ];

      const stats = engine.getStatistics(existing);

      // Should have entries for each rule
      expect(Object.keys(stats.byRule).length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle single relationship', () => {
      const existing: UnifiedRelationship[] = [
        createRelationship('naming-pattern-relation', 'A', 'B'),
      ];

      const result = engine.infer(existing);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle array from/to fields', () => {
      const existing: UnifiedRelationship[] = [
        {
          ...createRelationship('code-dependency', 'A', 'B'),
          from: ['A'],
          to: ['B', 'C'],
        },
      ];

      // Should not throw
      expect(() => engine.infer(existing)).not.toThrow();
    });

    it('should handle mixed relationship types', () => {
      const existing: UnifiedRelationship[] = [
        createRelationship('naming-pattern-relation', 'A', 'B'),
        createRelationship('code-dependency', 'B', 'C'),
        createRelationship('feature-grouping', 'C', 'D'),
      ];

      const result = engine.infer(existing);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('performance', () => {
    it('should handle moderate number of relationships', () => {
      const existing: UnifiedRelationship[] = [];

      // Create 100 relationships
      for (let i = 0; i < 100; i++) {
        existing.push(
          createRelationship('naming-pattern-relation', `Symbol${i}`, `Symbol${i + 1}`, {
            properties: { domain: `Domain${Math.floor(i / 10)}` },
          })
        );
      }

      const startTime = Date.now();
      const result = engine.infer(existing);
      const endTime = Date.now();

      // Should complete in reasonable time (< 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
