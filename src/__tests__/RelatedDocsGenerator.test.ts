/**
 * RelatedDocsGenerator tests
 * Tests for related documentation generation
 * @public
 */

import { RelatedDocsGenerator } from '../generator/RelatedDocsGenerator';
import type { Symbol } from '../types/graph';

describe('RelatedDocsGenerator', () => {
  let generator: RelatedDocsGenerator;

  beforeEach(() => {
    generator = new RelatedDocsGenerator();
  });

  // Helper to create minimal valid symbol
  const createSymbol = (id: string, name: string, options: Partial<Symbol> = {}): Symbol => ({
    id,
    name,
    type: 'function',
    filePath: `src/${name}.ts`,
    line: 1,
    column: 1,
    isExported: true,
    isPublic: true,
    tests: [],
    designDecisions: [],
    ...options,
  });

  describe('generateRelatedDocs', () => {
    it('should generate documentation for a symbol with related symbols', () => {
      const targetSymbol = createSymbol('001', 'processData', {
        summary: 'Process data from input',
      });

      const relatedDocs = [
        {
          symbol: createSymbol('002', 'validateInput', {
            summary: 'Validate input data',
          }),
          relevance: 1.0,
          reason: 'direct dependency',
        },
      ];

      const result = generator.generateRelatedDocs(targetSymbol, relatedDocs);

      expect(result).toContain('# Implementation Context: processData');
      expect(result).toContain('## Target Symbol');
      expect(result).toContain('## Related Symbols');
      expect(result).toContain('validateInput');
      expect(result).toContain('100%');
      expect(result).toContain('direct dependency');
    });

    it('should handle symbols with no related documentation', () => {
      const targetSymbol = createSymbol('001', 'isolatedFunction');

      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('# Implementation Context: isolatedFunction');
      expect(result).toContain('No related symbols found');
    });

    it('should handle symbols with minimal documentation', () => {
      const targetSymbol = createSymbol('001', 'undocumentedFunc');

      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('*(No documentation)*');
    });

    it('should show responsibility when available', () => {
      const targetSymbol = createSymbol('001', 'test', {
        responsibility: {
          symbolName: 'test',
          description: 'Handle data processing',
          shouldDo: ['Process data'],
          shouldNotDo: ['Modify state'],
        },
      });

      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('**Responsibility:** Handle data processing');
    });

    it('should show contract when available', () => {
      const targetSymbol = createSymbol('001', 'test', {
        contract: {
          symbolName: 'test',
          description: 'Test contract',
          preconditions: ['Input is valid'],
          postconditions: ['Output is validated'],
          invariants: [],
          filePath: 'src/test.ts',
        },
      });

      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('**Contract:**');
      expect(result).toContain('Input is valid');
      expect(result).toContain('Output is validated');
    });

    it('should show tests when available', () => {
      const targetSymbol = createSymbol('001', 'test', {
        tests: [
          {
            symbolName: 'test',
            testFilePath: 'test.test.ts',
            testName: 'should work',
            scenarios: [],
          },
        ],
      });

      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('**Tests:** 1 test(s)');
      expect(result).toContain('test.test.ts');
    });
  });

  describe('generateSummaryReport', () => {
    it('should generate summary statistics', () => {
      const targetSymbol = createSymbol('001', 'mainFunction');

      const relatedDocs = [
        {
          symbol: createSymbol('002', 'dep1', {
            summary: 'Documented function',
          }),
          relevance: 1.0,
          reason: 'direct dependency',
        },
        {
          symbol: createSymbol('003', 'dep2'),
          relevance: 0.6,
          reason: 'co-located in same file',
        },
      ];

      const result = generator.generateSummaryReport(targetSymbol, relatedDocs);

      expect(result).toContain('# Implementation Context Summary: mainFunction');
      expect(result).toContain('## Statistics');
      expect(result).toContain('**Total related symbols:** 2');
      expect(result).toContain('direct dependency: 1');
      expect(result).toContain('co-located in same file: 1');
    });

    it('should handle empty related docs', () => {
      const targetSymbol = createSymbol('001', 'test');

      const result = generator.generateSummaryReport(targetSymbol, []);

      expect(result).toContain('**Total related symbols:** 0');
    });

    it('should identify high-relevance symbols', () => {
      const targetSymbol = createSymbol('001', 'test');

      const relatedDocs = [
        {
          symbol: createSymbol('002', 'highRel1'),
          relevance: 0.9,
          reason: 'direct dependency',
        },
        {
          symbol: createSymbol('003', 'lowRel'),
          relevance: 0.4,
          reason: 'transitive dependency',
        },
        {
          symbol: createSymbol('004', 'highRel2'),
          relevance: 0.8,
          reason: 'used by',
        },
      ];

      const result = generator.generateSummaryReport(targetSymbol, relatedDocs);

      expect(result).toContain('## High-Relevance Symbols');
      expect(result).toContain('2 symbol(s) with relevance ≥ 70%');
      expect(result).toContain('highRel1');
      expect(result).toContain('highRel2');
    });

    it('should calculate documentation quality metrics', () => {
      const targetSymbol = createSymbol('001', 'test');

      const relatedDocs = [
        {
          symbol: createSymbol('002', 'documented', {
            summary: 'Has docs',
            contract: {
              symbolName: 'documented',
              description: 'Contract',
              preconditions: [],
              postconditions: [],
              invariants: [],
              filePath: 'src/documented.ts',
            },
            responsibility: {
              symbolName: 'documented',
              description: 'Responsible for X',
              shouldDo: [],
              shouldNotDo: [],
            },
            tests: [
              {
                symbolName: 'documented',
                testFilePath: 'test.ts',
                testName: 'test',
                scenarios: [],
              },
            ],
          }),
          relevance: 1.0,
          reason: 'direct dependency',
        },
        {
          symbol: createSymbol('003', 'undocumented'),
          relevance: 0.5,
          reason: 'transitive',
        },
      ];

      const result = generator.generateSummaryReport(targetSymbol, relatedDocs);

      expect(result).toContain('## Documentation Quality');
      expect(result).toContain('**Documented:** 1/2');
      expect(result).toContain('**With Contract:** 1/2');
      expect(result).toContain('**With Responsibility:** 1/2');
      expect(result).toContain('**With Tests:** 1/2');
    });
  });
});
