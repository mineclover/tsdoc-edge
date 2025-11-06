/**
 * RelatedDocsGenerator tests
 * @public
 */

import { RelatedDocsGenerator, type RelatedDocEntry } from '../../generator/RelatedDocsGenerator';
import type { Symbol } from '../../types/graph';

describe('RelatedDocsGenerator', () => {
  let generator: RelatedDocsGenerator;

  const createMockSymbol = (overrides?: Partial<Symbol>): Symbol => ({
    id: 'test-id',
    name: 'TestSymbol',
    type: 'function',
    filePath: '/src/test.ts',
    line: 1,
    isPublic: true,
    isExported: true,
    // summary omitted (undefined),
    // responsibility omitted (undefined),
    // contract omitted (undefined),
    tests: [],
    designDecisions: [],
    ...overrides,
  });

  const createRelatedEntry = (
    symbol: Symbol,
    relevance: number,
    reason: string
  ): RelatedDocEntry => ({
    symbol,
    relevance,
    reason,
  });

  beforeEach(() => {
    generator = new RelatedDocsGenerator();
  });

  describe('generateRelatedDocs', () => {
    it('should generate documentation header', () => {
      const targetSymbol = createMockSymbol({ name: 'MainFunction' });
      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('# Implementation Context: MainFunction');
    });

    it('should include target symbol section', () => {
      const targetSymbol = createMockSymbol({
        name: 'TargetFunc',
        type: 'function',
        filePath: '/src/main.ts',
        line: 10,
        summary: 'Main function',
      });
      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('## Target Symbol');
      expect(result).toContain('### TargetFunc');
      expect(result).toContain('**Type:** `function`');
      expect(result).toContain('**Location:** `/src/main.ts:10`');
      expect(result).toContain('**Summary:** Main function');
    });

    it('should show "No related symbols" when list is empty', () => {
      const targetSymbol = createMockSymbol();
      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('## Related Symbols');
      expect(result).toContain('No related symbols found.');
    });

    it('should list related symbols with relevance', () => {
      const targetSymbol = createMockSymbol({ name: 'Target' });
      const relatedSymbol = createMockSymbol({ name: 'Related' });
      const related = [createRelatedEntry(relatedSymbol, 0.85, 'Direct dependency')];

      const result = generator.generateRelatedDocs(targetSymbol, related);

      expect(result).toContain('### Related');
      expect(result).toContain('**Relevance:** 85%');
      expect(result).toContain('Direct dependency');
    });

    it('should show exported status', () => {
      const targetSymbol = createMockSymbol({
        isExported: true,
        isPublic: true,
      });
      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('**Exported:** Yes');
      expect(result).toContain('**Public API:** Yes');
    });

    it('should show not exported status', () => {
      const targetSymbol = createMockSymbol({
        isExported: false,
        isPublic: false,
      });
      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('**Exported:** No');
      expect(result).toContain('**Public API:** No');
    });

    it('should include symbol summary when present', () => {
      const targetSymbol = createMockSymbol({
        summary: 'This is a test summary',
      });
      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('**Summary:** This is a test summary');
    });

    it('should show "No documentation" when summary is missing', () => {
      const targetSymbol = createMockSymbol({ summary: null });
      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('**Summary:** *(No documentation)*');
    });

    it('should include responsibility when present', () => {
      const targetSymbol = createMockSymbol({
        responsibility: {
          description: 'Manages user data',
          scope: 'users',
        },
      });
      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('**Responsibility:** Manages user data');
    });

    it('should include contract preconditions and postconditions', () => {
      const targetSymbol = createMockSymbol({
        contract: {
          preconditions: ['Input must be valid', 'User must be authenticated'],
          postconditions: ['Data is saved', 'Event is emitted'],
          invariants: [],
        },
      });
      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('**Contract:**');
      expect(result).toContain('*Preconditions:*');
      expect(result).toContain('- Input must be valid');
      expect(result).toContain('*Postconditions:*');
      expect(result).toContain('- Data is saved');
    });

    it('should include test information', () => {
      const targetSymbol = createMockSymbol({
        tests: [
          {
            testName: 'should work correctly',
            testFilePath: '/test/main.test.ts',
          },
          {
            testName: 'should handle errors',
            testFilePath: '/test/main.test.ts',
          },
        ],
      });
      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('**Tests:** 2 test(s)');
      expect(result).toContain('/test/main.test.ts: `should work correctly`');
      expect(result).toContain('/test/main.test.ts: `should handle errors`');
    });

    it('should include design decisions', () => {
      const targetSymbol = createMockSymbol({
        designDecisions: ['Use async/await', 'Implement caching'],
      });
      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('**Design Decisions:**');
      expect(result).toContain('- Use async/await');
      expect(result).toContain('- Implement caching');
    });

    it('should render multiple related symbols', () => {
      const targetSymbol = createMockSymbol({ name: 'Target' });
      const related = [
        createRelatedEntry(createMockSymbol({ name: 'Related1' }), 0.9, 'Dependency'),
        createRelatedEntry(createMockSymbol({ name: 'Related2' }), 0.7, 'User'),
        createRelatedEntry(createMockSymbol({ name: 'Related3' }), 0.5, 'Similar'),
      ];

      const result = generator.generateRelatedDocs(targetSymbol, related);

      expect(result).toContain('Found 3 related symbols');
      expect(result).toContain('### Related1');
      expect(result).toContain('### Related2');
      expect(result).toContain('### Related3');
    });

    it('should show relevance bars correctly', () => {
      const targetSymbol = createMockSymbol();
      const related = [
        createRelatedEntry(createMockSymbol({ name: 'VeryHigh' }), 0.95, 'Test'),
        createRelatedEntry(createMockSymbol({ name: 'High' }), 0.75, 'Test'),
        createRelatedEntry(createMockSymbol({ name: 'Medium' }), 0.55, 'Test'),
        createRelatedEntry(createMockSymbol({ name: 'Low' }), 0.35, 'Test'),
        createRelatedEntry(createMockSymbol({ name: 'VeryLow' }), 0.15, 'Test'),
      ];

      const result = generator.generateRelatedDocs(targetSymbol, related);

      expect(result).toContain('### VeryHigh 🔴🔴🔴🔴🔴');
      expect(result).toContain('### High 🔴🔴🔴🔴⚪');
      expect(result).toContain('### Medium 🔴🔴🔴⚪⚪');
      expect(result).toContain('### Low 🔴🔴⚪⚪⚪');
      expect(result).toContain('### VeryLow 🔴⚪⚪⚪⚪');
    });

    it('should show contract summary for related symbols', () => {
      const targetSymbol = createMockSymbol();
      const relatedSymbol = createMockSymbol({
        name: 'Related',
        contract: {
          preconditions: ['Pre1', 'Pre2'],
          postconditions: ['Post1'],
          invariants: [],
        },
      });
      const related = [createRelatedEntry(relatedSymbol, 0.8, 'Test')];

      const result = generator.generateRelatedDocs(targetSymbol, related);

      expect(result).toContain('**Contract:** 2 precondition(s), 1 postcondition(s)');
    });

    it('should separate related symbols with horizontal rules', () => {
      const targetSymbol = createMockSymbol();
      const related = [
        createRelatedEntry(createMockSymbol({ name: 'R1' }), 0.8, 'Test'),
        createRelatedEntry(createMockSymbol({ name: 'R2' }), 0.7, 'Test'),
      ];

      const result = generator.generateRelatedDocs(targetSymbol, related);

      const hrCount = (result.match(/---/g) || []).length;
      expect(hrCount).toBeGreaterThan(2);
    });
  });

  describe('generateSummaryReport', () => {
    it('should generate summary header', () => {
      const targetSymbol = createMockSymbol({ name: 'TestFunc' });
      const result = generator.generateSummaryReport(targetSymbol, []);

      expect(result).toContain('# Implementation Context Summary: TestFunc');
    });

    it('should show total related symbols count', () => {
      const targetSymbol = createMockSymbol();
      const related = [
        createRelatedEntry(createMockSymbol(), 0.8, 'Test'),
        createRelatedEntry(createMockSymbol(), 0.7, 'Test'),
        createRelatedEntry(createMockSymbol(), 0.6, 'Test'),
      ];

      const result = generator.generateSummaryReport(targetSymbol, related);

      expect(result).toContain('## Statistics');
      expect(result).toContain('- **Total related symbols:** 3');
    });

    it('should group and count relationship types', () => {
      const targetSymbol = createMockSymbol();
      const related = [
        createRelatedEntry(createMockSymbol(), 0.8, 'Dependency'),
        createRelatedEntry(createMockSymbol(), 0.7, 'Dependency'),
        createRelatedEntry(createMockSymbol(), 0.6, 'User'),
        createRelatedEntry(createMockSymbol(), 0.5, 'Similar'),
      ];

      const result = generator.generateSummaryReport(targetSymbol, related);

      expect(result).toContain('**Relationship types:**');
      expect(result).toContain('- Dependency: 2');
      expect(result).toContain('- User: 1');
      expect(result).toContain('- Similar: 1');
    });

    it('should handle multiple reasons in single entry', () => {
      const targetSymbol = createMockSymbol();
      const related = [
        createRelatedEntry(createMockSymbol(), 0.8, 'Dependency, Similar'),
      ];

      const result = generator.generateSummaryReport(targetSymbol, related);

      expect(result).toContain('- Dependency: 1');
      expect(result).toContain('- Similar: 1');
    });

    it('should list high-relevance symbols', () => {
      const targetSymbol = createMockSymbol();
      const related = [
        createRelatedEntry(createMockSymbol({ name: 'HighRel' }), 0.9, 'Dependency'),
        createRelatedEntry(createMockSymbol({ name: 'MedRel' }), 0.6, 'User'),
        createRelatedEntry(createMockSymbol({ name: 'AnotherHigh' }), 0.8, 'Similar'),
      ];

      const result = generator.generateSummaryReport(targetSymbol, related);

      expect(result).toContain('## High-Relevance Symbols');
      expect(result).toContain('2 symbol(s) with relevance ≥ 70%');
      expect(result).toContain('- **HighRel** (90%)');
      expect(result).toContain('- **AnotherHigh** (80%)');
      expect(result).not.toContain('- **MedRel**');
    });

    it('should not show high-relevance section if none exist', () => {
      const targetSymbol = createMockSymbol();
      const related = [
        createRelatedEntry(createMockSymbol(), 0.6, 'Test'),
        createRelatedEntry(createMockSymbol(), 0.5, 'Test'),
      ];

      const result = generator.generateSummaryReport(targetSymbol, related);

      expect(result).not.toContain('## High-Relevance Symbols');
    });

    it('should calculate documentation quality metrics', () => {
      const targetSymbol = createMockSymbol();
      const related = [
        createRelatedEntry(
          createMockSymbol({
            summary: 'Documented',
            contract: { preconditions: [], postconditions: [], invariants: [] },
            responsibility: { description: 'Test', scope: 'test' },
            tests: [{ testName: 'test', testFilePath: '/test.ts' }],
          }),
          0.8,
          'Test'
        ),
        createRelatedEntry(createMockSymbol({ summary: null }), 0.7, 'Test'),
      ];

      const result = generator.generateSummaryReport(targetSymbol, related);

      expect(result).toContain('## Documentation Quality');
      expect(result).toContain('- **Documented:** 1/2 (50%)');
      expect(result).toContain('- **With Contract:** 1/2 (50%)');
      expect(result).toContain('- **With Responsibility:** 1/2 (50%)');
      expect(result).toContain('- **With Tests:** 1/2 (50%)');
    });

    it('should handle zero documented symbols', () => {
      const targetSymbol = createMockSymbol();
      const related = [
        createRelatedEntry(createMockSymbol({ summary: null }), 0.5, 'Test'),
      ];

      const result = generator.generateSummaryReport(targetSymbol, related);

      expect(result).toContain('- **Documented:** 0/1 (0%)');
    });

    it('should handle all documented symbols', () => {
      const targetSymbol = createMockSymbol();
      const related = [
        createRelatedEntry(createMockSymbol({ summary: 'Doc1' }), 0.8, 'Test'),
        createRelatedEntry(createMockSymbol({ summary: 'Doc2' }), 0.7, 'Test'),
      ];

      const result = generator.generateSummaryReport(targetSymbol, related);

      expect(result).toContain('- **Documented:** 2/2 (100%)');
    });

    it('should handle empty related symbols list', () => {
      const targetSymbol = createMockSymbol();
      const result = generator.generateSummaryReport(targetSymbol, []);

      expect(result).toContain('- **Total related symbols:** 0');
    });

    it('should handle symbols with empty string summary as undocumented', () => {
      const targetSymbol = createMockSymbol();
      const related = [
        createRelatedEntry(createMockSymbol({ summary: '' }), 0.5, 'Test'),
        createRelatedEntry(createMockSymbol({ summary: '   ' }), 0.5, 'Test'),
      ];

      const result = generator.generateSummaryReport(targetSymbol, related);

      expect(result).toContain('- **Documented:** 0/2 (0%)');
    });

    it('should sort relationship types by count', () => {
      const targetSymbol = createMockSymbol();
      const related = [
        createRelatedEntry(createMockSymbol(), 0.8, 'Type1'),
        createRelatedEntry(createMockSymbol(), 0.7, 'Type2'),
        createRelatedEntry(createMockSymbol(), 0.6, 'Type2'),
        createRelatedEntry(createMockSymbol(), 0.5, 'Type2'),
      ];

      const result = generator.generateSummaryReport(targetSymbol, related);

      const type2Index = result.indexOf('- Type2: 3');
      const type1Index = result.indexOf('- Type1: 1');
      expect(type2Index).toBeLessThan(type1Index);
    });
  });

  describe('edge cases', () => {
    it('should handle symbols with very long names', () => {
      const targetSymbol = createMockSymbol({
        name: 'VeryLongSymbolNameThatExceedsNormalLengthExpectations',
      });
      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('VeryLongSymbolNameThatExceedsNormalLengthExpectations');
    });

    it('should handle symbols with special characters', () => {
      const targetSymbol = createMockSymbol({ name: '$_special-Name_123' });
      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('$_special-Name_123');
    });

    it('should handle exact 70% relevance threshold', () => {
      const targetSymbol = createMockSymbol();
      const related = [
        createRelatedEntry(createMockSymbol({ name: 'Exactly70' }), 0.7, 'Test'),
      ];

      const result = generator.generateSummaryReport(targetSymbol, related);

      expect(result).toContain('## High-Relevance Symbols');
      expect(result).toContain('- **Exactly70** (70%)');
    });

    it('should handle relevance just below threshold', () => {
      const targetSymbol = createMockSymbol();
      const related = [
        createRelatedEntry(createMockSymbol({ name: 'Below70' }), 0.69, 'Test'),
      ];

      const result = generator.generateSummaryReport(targetSymbol, related);

      expect(result).not.toContain('- **Below70**');
    });

    it('should handle symbols with no tests', () => {
      const targetSymbol = createMockSymbol({ tests: [] });
      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).not.toContain('**Tests:**');
    });

    it('should handle symbols with no design decisions', () => {
      const targetSymbol = createMockSymbol({ designDecisions: [] });
      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).not.toContain('**Design Decisions:**');
    });

    it('should handle very long file paths', () => {
      const targetSymbol = createMockSymbol({
        filePath: '/very/long/path/to/deeply/nested/directory/structure/file.ts',
      });
      const result = generator.generateRelatedDocs(targetSymbol, []);

      expect(result).toContain('/very/long/path/to/deeply/nested/directory/structure/file.ts');
    });

    it('should handle zero relevance', () => {
      const targetSymbol = createMockSymbol();
      const related = [
        createRelatedEntry(createMockSymbol({ name: 'ZeroRel' }), 0, 'Test'),
      ];

      const result = generator.generateRelatedDocs(targetSymbol, related);

      expect(result).toContain('**Relevance:** 0%');
    });

    it('should handle 100% relevance', () => {
      const targetSymbol = createMockSymbol();
      const related = [
        createRelatedEntry(createMockSymbol({ name: 'Perfect' }), 1.0, 'Test'),
      ];

      const result = generator.generateRelatedDocs(targetSymbol, related);

      expect(result).toContain('**Relevance:** 100%');
    });
  });
});
