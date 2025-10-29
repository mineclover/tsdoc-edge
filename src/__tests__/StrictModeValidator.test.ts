/**
 * Tests for StrictModeValidator
 * @testScenario Verify strict mode validation for 6-category documentation
 */

import { StrictModeValidator } from '../validator/StrictModeValidator';
import { EnhancedSymbolDoc } from '../types/enhanced-tags';

describe('StrictModeValidator', () => {
  let validator: StrictModeValidator;

  beforeEach(() => {
    validator = new StrictModeValidator();
  });

  describe('Complete Documentation', () => {
    it('should validate complete documentation as compliant', () => {
      const doc: EnhancedSymbolDoc = {
        symbolId: 'test-symbol',
        problemSolving: {
          description: 'Solves data processing problem',
          context: 'Large CSV files need processing',
        },
        functionality: {
          mainFeatures: ['Load data', 'Clean data', 'Save data'],
          components: [
            {
              name: 'loadData',
              description: 'Loads CSV file',
              signature: '(filePath: string) => DataFrame',
            },
          ],
        },
        errorExperiences: [
          {
            id: 'err-001',
            errorType: 'ValueError',
            message: 'Input array too large',
            context: 'Processing large files',
            solution: 'Use chunksize parameter',
          },
        ],
        decisions: [
          {
            id: 'dec-001',
            title: 'Use concurrent.futures',
            decision: 'Use concurrent.futures for parallelism',
            rationale: 'Better for I/O bound tasks',
            alternatives: [
              {
                option: 'multiprocessing.Pool',
                reason: 'Less effective for I/O bound',
              },
            ],
            consequences: ['Better performance'],
            date: '2024-01-01',
            status: 'accepted',
          },
        ],
        dependencies: [
          {
            target: 'config_loader',
            type: 'module',
            reason: 'Load configuration',
          },
        ],
        futurePlans: [
          {
            id: 'plan-001',
            title: 'Add streaming support',
            description: 'Support streaming for very large files',
            priority: 'high',
            status: 'planned',
            createdAt: '2024-01-01',
          },
        ],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        version: '1.0.0',
      };

      const result = validator.validate(doc, true);

      expect(result.isCompliant).toBe(true);
      expect(result.missingCategories).toHaveLength(0);
      expect(result.incompleteCategories).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.complianceScore).toBe(100);
    });
  });

  describe('Missing Categories', () => {
    it('should detect missing problem solving', () => {
      const doc: Partial<EnhancedSymbolDoc> = {
        symbolId: 'test-symbol',
        functionality: {
          mainFeatures: ['Feature 1'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        dependencies: [],
        futurePlans: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        version: '1.0.0',
      } as any;

      const result = validator.validate(doc as EnhancedSymbolDoc, true);

      expect(result.isCompliant).toBe(false);
      expect(result.missingCategories).toContain('problemSolving');
    });

    it('should detect missing functionality', () => {
      const doc: Partial<EnhancedSymbolDoc> = {
        symbolId: 'test-symbol',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        errorExperiences: [],
        decisions: [],
        dependencies: [],
        futurePlans: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        version: '1.0.0',
      } as any;

      const result = validator.validate(doc as EnhancedSymbolDoc, true);

      expect(result.isCompliant).toBe(false);
      expect(result.missingCategories).toContain('functionality');
    });

    it('should detect missing dependencies', () => {
      const doc: Partial<EnhancedSymbolDoc> = {
        symbolId: 'test-symbol',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Feature'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        futurePlans: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        version: '1.0.0',
      } as any;

      const result = validator.validate(doc as EnhancedSymbolDoc, true);

      expect(result.isCompliant).toBe(false);
      expect(result.missingCategories).toContain('dependencies');
    });

    it('should detect missing future plans', () => {
      const doc: Partial<EnhancedSymbolDoc> = {
        symbolId: 'test-symbol',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Feature'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        dependencies: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        version: '1.0.0',
      } as any;

      const result = validator.validate(doc as EnhancedSymbolDoc, true);

      expect(result.isCompliant).toBe(false);
      expect(result.missingCategories).toContain('futurePlans');
    });
  });

  describe('Incomplete Fields', () => {
    it('should detect missing description in problem solving', () => {
      const doc: EnhancedSymbolDoc = {
        symbolId: 'test-symbol',
        problemSolving: {
          description: '',
          context: 'Test context',
        },
        functionality: {
          mainFeatures: ['Feature'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        dependencies: [],
        futurePlans: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        version: '1.0.0',
      };

      const result = validator.validate(doc, true);

      expect(result.isCompliant).toBe(false);
      expect(result.incompleteCategories.some((c) => c.category === 'problemSolving')).toBe(true);
    });

    it('should detect empty main features', () => {
      const doc: EnhancedSymbolDoc = {
        symbolId: 'test-symbol',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: [],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        dependencies: [],
        futurePlans: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        version: '1.0.0',
      };

      const result = validator.validate(doc, true);

      expect(result.isCompliant).toBe(false);
      expect(result.incompleteCategories.some((c) => c.category === 'functionality')).toBe(true);
    });
  });

  describe('Public API vs Private', () => {
    it('should warn about missing errors for public API', () => {
      const doc: EnhancedSymbolDoc = {
        symbolId: 'test-symbol',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Feature'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        dependencies: [],
        futurePlans: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        version: '1.0.0',
      };

      const result = validator.validate(doc, true);

      expect(result.errors.some((e) => e.category === 'errorExperiences')).toBe(true);
    });

    it('should be more lenient for private symbols', () => {
      const doc: EnhancedSymbolDoc = {
        symbolId: 'test-symbol',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Feature'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        dependencies: [],
        futurePlans: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        version: '1.0.0',
      };

      const result = validator.validate(doc, false);

      // Should not error about missing error experiences for private symbols
      const hasErrorExp = result.errors.some((e) => e.category === 'errorExperiences');
      expect(hasErrorExp).toBe(false);
    });
  });

  describe('Compliance Score', () => {
    it('should calculate correct score for partial compliance', () => {
      const doc: EnhancedSymbolDoc = {
        symbolId: 'test-symbol',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: ['Feature'],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        dependencies: [],
        futurePlans: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        version: '1.0.0',
      };

      const result = validator.validate(doc, false);

      expect(result.complianceScore).toBeGreaterThan(0);
      expect(result.complianceScore).toBeLessThan(100);
    });
  });

  describe('Report Generation', () => {
    it('should generate readable report', () => {
      const doc: EnhancedSymbolDoc = {
        symbolId: 'test-symbol',
        problemSolving: {
          description: 'Test',
          context: 'Test',
        },
        functionality: {
          mainFeatures: [],
          components: [],
        },
        errorExperiences: [],
        decisions: [],
        dependencies: [],
        futurePlans: [],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        version: '1.0.0',
      };

      const result = validator.validate(doc, true);
      const report = validator.generateReport(result);

      expect(report).toContain('Strict Mode Validation Report');
      expect(report).toContain('test-symbol');
      expect(report).toContain('Compliance Score');
    });
  });
});
