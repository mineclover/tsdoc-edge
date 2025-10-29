/**
 * Tests for ConnectivityValidator
 * @testScenario Verify connectivity validation and SSOT compliance
 */

import { SymbolGraphBuilder } from '../graph/SymbolGraphBuilder';
import { Symbol } from '../types/graph';
import { ContractSpec, ResponsibilitySpec } from '../types/tags';
import { ConnectivityValidator } from '../validator/ConnectivityValidator';

describe('ConnectivityValidator', () => {
  let builder: SymbolGraphBuilder;
  let validator: ConnectivityValidator;

  beforeEach(() => {
    builder = new SymbolGraphBuilder();
    validator = new ConnectivityValidator(builder);
  });

  describe('Comprehensive Connectivity Analysis', () => {
    it('should identify all types of issues', () => {
      // Add symbols with various issues
      const symbols: Symbol[] = [
        // Properly documented and tested
        {
          id: 'good',
          name: 'GoodSymbol',
          type: 'function',
          filePath: '/test/good.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'Well documented function',
          contract: {
            symbolName: 'GoodSymbol',
            description: 'Does good things',
            preconditions: [],
            postconditions: [],
            invariants: [],
            filePath: '/test/good.ts',
          },
          responsibility: {
            symbolName: 'GoodSymbol',
            description: 'Handle good things',
            shouldDo: ['do good'],
            shouldNotDo: ['do bad'],
          },
          tests: [
            {
              symbolName: 'GoodSymbol',
              testFilePath: '/test/good.test.ts',
              testName: 'test good',
              scenarios: ['good case'],
            },
          ],
          designDecisions: [],
        },
        // Undocumented
        {
          id: 'undoc',
          name: 'UndocumentedSymbol',
          type: 'function',
          filePath: '/test/undoc.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        // Untested
        {
          id: 'untest',
          name: 'UntestedSymbol',
          type: 'function',
          filePath: '/test/untest.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'Has summary but no tests',
          tests: [],
          designDecisions: [],
        },
        // Orphaned
        {
          id: 'orphan',
          name: 'OrphanSymbol',
          type: 'function',
          filePath: '/test/orphan.ts',
          line: 1,
          column: 0,
          isExported: false,
          isPublic: false,
          tests: [],
          designDecisions: [],
        },
      ];

      symbols.forEach((s) => builder.addSymbol(s));

      // Add relationship to avoid good symbol being orphaned
      builder.addRelationship({
        type: 'dependsOn',
        from: 'good',
        to: 'undoc',
        filePath: '/test/good.ts',
      });

      const analysis = validator.analyze();

      expect(analysis.undocumented.length).toBeGreaterThan(0);
      expect(analysis.untested.length).toBeGreaterThan(0);
      expect(analysis.orphaned.length).toBeGreaterThan(0);
      expect(analysis.connectivityScore).toBeGreaterThanOrEqual(0);
      expect(analysis.connectivityScore).toBeLessThanOrEqual(100);
    });

    it('should achieve perfect score with all symbols properly connected', () => {
      const contract: ContractSpec = {
        symbolName: 'Perfect',
        description: 'Perfect function',
        preconditions: [],
        postconditions: [],
        invariants: [],
        filePath: '/test/perfect.ts',
      };

      const responsibility: ResponsibilitySpec = {
        symbolName: 'Perfect',
        description: 'Perfect responsibility',
        shouldDo: ['be perfect'],
        shouldNotDo: ['be imperfect'],
      };

      const symbol: Symbol = {
        id: 'perfect',
        name: 'Perfect',
        type: 'function',
        filePath: '/test/perfect.ts',
        line: 1,
        column: 0,
        isExported: true,
        isPublic: true,
        summary: 'Perfect function',
        contract,
        responsibility,
        tests: [
          {
            symbolName: 'Perfect',
            testFilePath: '/test/perfect.test.ts',
            testName: 'test perfect',
            scenarios: ['perfect case'],
          },
        ],
        designDecisions: [],
      };

      builder.addSymbol(symbol);

      const analysis = validator.analyze();

      expect(analysis.undocumented).toHaveLength(0);
      expect(analysis.untested).toHaveLength(0);
      expect(analysis.noResponsibility).toHaveLength(0);
      expect(analysis.noContract).toHaveLength(0);
      expect(analysis.brokenLinks).toHaveLength(0);
      expect(analysis.circularDependencies).toHaveLength(0);
      expect(analysis.connectivityScore).toBe(100);
    });
  });

  describe('Broken Link Detection', () => {
    it('should detect broken links to non-existent symbols', () => {
      const symbol: Symbol = {
        id: 'exists',
        name: 'ExistingSymbol',
        type: 'function',
        filePath: '/test/exists.ts',
        line: 1,
        column: 0,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      builder.addSymbol(symbol);

      // Add relationship to non-existent symbol
      builder.addRelationship({
        type: 'dependsOn',
        from: 'exists',
        to: 'nonexistent',
        filePath: '/test/exists.ts',
      });

      const analysis = validator.analyze();

      expect(analysis.brokenLinks.length).toBeGreaterThan(0);
      expect(analysis.brokenLinks[0].to).toBe('nonexistent');
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should detect circular dependencies in analysis', () => {
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

      const analysis = validator.analyze();

      expect(analysis.circularDependencies.length).toBeGreaterThan(0);
    });
  });

  describe('Single Symbol Validation', () => {
    it('should validate a well-documented symbol with no issues', () => {
      const contract: ContractSpec = {
        symbolName: 'Good',
        description: 'Good function',
        preconditions: [],
        postconditions: [],
        invariants: [],
        filePath: '/test/good.ts',
      };

      const responsibility: ResponsibilitySpec = {
        symbolName: 'Good',
        description: 'Good responsibility',
        shouldDo: ['do good'],
        shouldNotDo: ['do bad'],
      };

      const symbol: Symbol = {
        id: 'good',
        name: 'Good',
        type: 'function',
        filePath: '/test/good.ts',
        line: 1,
        column: 0,
        isExported: true,
        isPublic: true,
        summary: 'Good function',
        contract,
        responsibility,
        tests: [
          {
            symbolName: 'Good',
            testFilePath: '/test/good.test.ts',
            testName: 'test good',
            scenarios: ['good case'],
          },
        ],
        designDecisions: [],
      };

      builder.addSymbol(symbol);

      const results = validator.validateSymbol(symbol);
      expect(results).toHaveLength(0);
    });

    it('should detect missing documentation', () => {
      const symbol: Symbol = {
        id: 'undoc',
        name: 'Undocumented',
        type: 'function',
        filePath: '/test/undoc.ts',
        line: 1,
        column: 0,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      builder.addSymbol(symbol);

      const results = validator.validateSymbol(symbol);
      expect(results.some((r) => r.ruleId === 'require-documentation')).toBe(true);
    });

    it('should detect missing tests for public API', () => {
      const symbol: Symbol = {
        id: 'untest',
        name: 'Untested',
        type: 'function',
        filePath: '/test/untest.ts',
        line: 1,
        column: 0,
        isExported: true,
        isPublic: true,
        summary: 'Function without tests',
        tests: [],
        designDecisions: [],
      };

      builder.addSymbol(symbol);

      const results = validator.validateSymbol(symbol);
      expect(results.some((r) => r.ruleId === 'require-tests')).toBe(true);
    });

    it('should detect missing responsibility for public symbols', () => {
      const symbol: Symbol = {
        id: 'noresp',
        name: 'NoResponsibility',
        type: 'function',
        filePath: '/test/noresp.ts',
        line: 1,
        column: 0,
        isExported: true,
        isPublic: true,
        summary: 'Function without responsibility',
        tests: [
          {
            symbolName: 'NoResponsibility',
            testFilePath: '/test/noresp.test.ts',
            testName: 'test',
            scenarios: ['test'],
          },
        ],
        designDecisions: [],
      };

      builder.addSymbol(symbol);

      const results = validator.validateSymbol(symbol);
      expect(results.some((r) => r.ruleId === 'require-responsibility')).toBe(true);
    });

    it('should detect missing contract for public functions', () => {
      const symbol: Symbol = {
        id: 'nocontract',
        name: 'NoContract',
        type: 'function',
        filePath: '/test/nocontract.ts',
        line: 1,
        column: 0,
        isExported: true,
        isPublic: true,
        summary: 'Function without contract',
        responsibility: {
          symbolName: 'NoContract',
          description: 'Has responsibility',
          shouldDo: ['do'],
          shouldNotDo: ['not do'],
        },
        tests: [
          {
            symbolName: 'NoContract',
            testFilePath: '/test/nocontract.test.ts',
            testName: 'test',
            scenarios: ['test'],
          },
        ],
        designDecisions: [],
      };

      builder.addSymbol(symbol);

      const results = validator.validateSymbol(symbol);
      expect(results.some((r) => r.ruleId === 'require-contract')).toBe(true);
    });

    it('should detect orphaned symbols', () => {
      const symbol: Symbol = {
        id: 'orphan',
        name: 'Orphan',
        type: 'function',
        filePath: '/test/orphan.ts',
        line: 1,
        column: 0,
        isExported: false,
        isPublic: false,
        summary: 'Orphaned symbol',
        tests: [],
        designDecisions: [],
      };

      builder.addSymbol(symbol);

      const results = validator.validateSymbol(symbol);
      expect(results.some((r) => r.ruleId === 'no-orphaned-symbols')).toBe(true);
    });
  });

  describe('Report Generation', () => {
    it('should generate a readable connectivity report', () => {
      const symbols: Symbol[] = [
        {
          id: 's1',
          name: 'Symbol1',
          type: 'function',
          filePath: '/test/s1.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'Documented',
          tests: [],
          designDecisions: [],
        },
        {
          id: 's2',
          name: 'Symbol2',
          type: 'function',
          filePath: '/test/s2.ts',
          line: 1,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
      ];

      symbols.forEach((s) => builder.addSymbol(s));

      const report = validator.generateReport();

      expect(report).toContain('Connectivity Analysis Report');
      expect(report).toContain('Overall Score');
      expect(report).toContain('Statistics');
      expect(report).toContain('Total Symbols');
    });
  });

  describe('Detailed Validation Report', () => {
    it('should generate detailed report with all issues', () => {
      // Add symbols with various issues
      const symbols = [
        {
          id: 'good',
          name: 'GoodSymbol',
          type: 'function' as const,
          filePath: '/test/good.ts',
          line: 10,
          column: 0,
          isExported: true,
          isPublic: true,
          summary: 'Well documented',
          contract: {
            symbolName: 'GoodSymbol',
            description: 'Good contract',
            preconditions: ['input is valid'],
            postconditions: ['output is valid'],
            invariants: [],
            filePath: '/test/good.ts',
          },
          responsibility: {
            symbolName: 'GoodSymbol',
            description: 'Handle good things',
            shouldDo: ['do good'],
            shouldNotDo: ['do bad'],
          },
          tests: [
            {
              symbolName: 'GoodSymbol',
              testFilePath: '/test/good.test.ts',
              testName: 'test good',
              scenarios: ['good case'],
            },
          ],
          designDecisions: [],
        },
        {
          id: 'bad',
          name: 'BadSymbol',
          type: 'function' as const,
          filePath: '/test/bad.ts',
          line: 20,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 'ugly',
          name: 'UglySymbol',
          type: 'method' as const,
          filePath: '/test/ugly.ts',
          line: 30,
          column: 0,
          isExported: false,
          isPublic: true,
          summary: 'Has summary but nothing else',
          tests: [],
          designDecisions: [],
        },
      ];

      symbols.forEach((s) => builder.addSymbol(s));

      const report = validator.generateDetailedReport();

      expect(report.totalSymbols).toBe(3);
      expect(report.totalIssues).toBeGreaterThan(0);
      expect(report.issuesBySeverity.error).toBeGreaterThan(0);
      expect(report.issuesByFile.size).toBeGreaterThan(0);
      expect(report.summary.documented).toBe(2);
      expect(report.summary.undocumented).toBe(1);
      expect(report.completionPercentage).toBeGreaterThan(0);
      expect(report.completionPercentage).toBeLessThan(100);
    });

    it('should group issues by file', () => {
      const symbols = [
        {
          id: 's1',
          name: 'Symbol1',
          type: 'function' as const,
          filePath: '/test/file1.ts',
          line: 10,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 's2',
          name: 'Symbol2',
          type: 'function' as const,
          filePath: '/test/file1.ts',
          line: 20,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
        {
          id: 's3',
          name: 'Symbol3',
          type: 'function' as const,
          filePath: '/test/file2.ts',
          line: 10,
          column: 0,
          isExported: true,
          isPublic: true,
          tests: [],
          designDecisions: [],
        },
      ];

      symbols.forEach((s) => builder.addSymbol(s));

      const report = validator.generateDetailedReport();

      expect(report.issuesByFile.size).toBe(2);
      expect(report.issuesByFile.get('/test/file1.ts')?.issueCount).toBeGreaterThan(0);
      expect(report.issuesByFile.get('/test/file2.ts')?.issueCount).toBeGreaterThan(0);
    });

    it('should provide suggested fixes', () => {
      const symbol = {
        id: 'test',
        name: 'TestSymbol',
        type: 'function' as const,
        filePath: '/test/test.ts',
        line: 10,
        column: 0,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      builder.addSymbol(symbol);

      const report = validator.generateDetailedReport();

      expect(report.allIssues.length).toBeGreaterThan(0);
      expect(report.allIssues[0].suggestedFix).toBeDefined();
      expect(report.allIssues[0].suggestedFix).toContain('Add');
    });

    it('should format detailed report as readable text', () => {
      const symbol = {
        id: 'test',
        name: 'TestSymbol',
        type: 'function' as const,
        filePath: '/test/test.ts',
        line: 10,
        column: 0,
        isExported: true,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      builder.addSymbol(symbol);

      const report = validator.generateDetailedReport();
      const formatted = validator.formatDetailedReport(report);

      expect(formatted).toContain('DETAILED VALIDATION REPORT');
      expect(formatted).toContain('SUMMARY');
      expect(formatted).toContain('Total Symbols:');
      expect(formatted).toContain('Total Issues:');
      expect(formatted).toContain('ISSUES BY SEVERITY');
      expect(formatted).toContain('ISSUES BY FILE');
      expect(formatted).toContain('TestSymbol');
      expect(formatted).toContain('line 10');
    });

    it('should calculate correct completion percentage', () => {
      const perfect = {
        id: 'perfect',
        name: 'Perfect',
        type: 'function' as const,
        filePath: '/test/perfect.ts',
        line: 10,
        column: 0,
        isExported: true,
        isPublic: true,
        summary: 'Perfect',
        contract: {
          symbolName: 'Perfect',
          description: 'Perfect',
          preconditions: ['valid'],
          postconditions: ['valid'],
          invariants: [],
          filePath: '/test/perfect.ts',
        },
        responsibility: {
          symbolName: 'Perfect',
          description: 'Perfect',
          shouldDo: ['good'],
          shouldNotDo: ['bad'],
        },
        tests: [
          {
            symbolName: 'Perfect',
            testFilePath: '/test/perfect.test.ts',
            testName: 'test',
            scenarios: ['test'],
          },
        ],
        designDecisions: [],
      };

      builder.addSymbol(perfect);

      const report = validator.generateDetailedReport();

      // Perfect symbol: documented (1/1) + tested (1/1) + responsibility (1/1) + contract (1/1) = 4/4 = 100%
      expect(report.completionPercentage).toBe(100);
    });

    it('should identify missing contract elements', () => {
      const symbol = {
        id: 'incomplete',
        name: 'IncompleteContract',
        type: 'function' as const,
        filePath: '/test/incomplete.ts',
        line: 10,
        column: 0,
        isExported: true,
        isPublic: true,
        summary: 'Has summary',
        contract: {
          symbolName: 'IncompleteContract',
          description: 'Has contract but no conditions',
          preconditions: [],
          postconditions: [],
          invariants: [],
          filePath: '/test/incomplete.ts',
        },
        tests: [
          {
            symbolName: 'IncompleteContract',
            testFilePath: '/test/incomplete.test.ts',
            testName: 'test',
            scenarios: ['test'],
          },
        ],
        designDecisions: [],
      };

      builder.addSymbol(symbol);

      const report = validator.generateDetailedReport();

      const contractIssues = report.allIssues.filter(
        (issue) => issue.issueType === 'missing-precondition'
      );
      expect(contractIssues.length).toBeGreaterThan(0);
      expect(contractIssues[0].missingItems).toContain('preconditions');
      expect(contractIssues[0].missingItems).toContain('postconditions');
    });
  });
});
