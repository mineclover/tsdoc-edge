/**
 * SpecMetricsAggregator tests
 * @public
 */

import { SpecMetricsAggregator } from '../../spec/SpecMetricsAggregator';

describe('SpecMetricsAggregator', () => {
  let aggregator: SpecMetricsAggregator;

  beforeEach(() => {
    aggregator = new SpecMetricsAggregator();
  });

  describe('aggregate', () => {
    it('should aggregate metrics across all 5 dimensions', () => {
      const metrics = aggregator.aggregate({ managedDir: 'managed' });

      expect(metrics).toBeDefined();
      expect(typeof metrics.healthScore).toBe('number');
      expect(metrics.healthScore).toBeGreaterThanOrEqual(0);
      expect(metrics.healthScore).toBeLessThanOrEqual(100);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(metrics.grade);

      // Dimension 1: Document Quality
      expect(metrics.documentQuality).toBeDefined();
      expect(metrics.documentQuality.totalDocuments).toBeGreaterThan(0);
      expect(metrics.documentQuality.averageOverallScore).toBeGreaterThanOrEqual(0);
      expect(metrics.documentQuality.totalScenarios).toBeGreaterThanOrEqual(0);

      // Dimension 2: Lifecycle
      expect(metrics.lifecycle).toBeDefined();
      expect(metrics.lifecycle.activeRatio).toBeGreaterThanOrEqual(0);
      expect(metrics.lifecycle.distribution.active).toBeGreaterThan(0);

      // Dimension 3: SpecGraph Conformance
      expect(metrics.graphConformance).toBeDefined();
      expect(typeof metrics.graphConformance.hasSpecGraph).toBe('boolean');

      // Dimension 4: Module 7-Aspects
      expect(metrics.module7Aspects).toBeDefined();
      expect(metrics.module7Aspects.aspectCoverage.purpose).toBeGreaterThanOrEqual(0);
      expect(metrics.module7Aspects.aspectCoverage.input).toBeGreaterThanOrEqual(0);
      expect(metrics.module7Aspects.averageAspectScore).toBeGreaterThanOrEqual(0);

      // Dimension 5: Code Connectivity
      expect(metrics.codeConnectivity).toBeDefined();
      expect(metrics.codeConnectivity.totalSymbols).toBeGreaterThan(0);
      expect(metrics.codeConnectivity.specCoverageRate).toBeGreaterThanOrEqual(0);

      // Recommendations
      expect(Array.isArray(metrics.recommendations)).toBe(true);
    });

    it('should handle custom managed directory with empty or non-existent path', () => {
      const metrics = aggregator.aggregate({ managedDir: 'non-existent-dir' });

      expect(metrics.documentQuality.totalDocuments).toBe(0);
      expect(metrics.documentQuality.completeCount).toBe(0);
      expect(metrics.healthScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSpecMetricsForFile', () => {
    it('should return context for a spec markdown file', () => {
      const ctx = aggregator.getSpecMetricsForFile('managed/features/lsp-integration.md');

      expect(ctx.isSpecFile).toBe(true);
      expect(ctx.filePath).toBe('managed/features/lsp-integration.md');
      expect(typeof ctx.score).toBe('number');
      expect(ctx.status).toBeDefined();
      expect(Array.isArray(ctx.recommendations)).toBe(true);
    });

    it('should return context for a source code file', () => {
      const ctx = aggregator.getSpecMetricsForFile('src/lsp/service.ts');

      expect(ctx.isSpecFile).toBe(false);
      expect(ctx.filePath).toBe('src/lsp/service.ts');
      expect(ctx.aspectsCoverage).toBeDefined();
      expect(Array.isArray(ctx.recommendations)).toBe(true);
    });

    it('should handle non-existent spec file gracefully', () => {
      const ctx = aggregator.getSpecMetricsForFile('managed/does-not-exist.md');

      expect(ctx.isSpecFile).toBe(true);
      expect(ctx.recommendations.some((r) => r.includes('not found'))).toBe(true);
    });
  });
});
