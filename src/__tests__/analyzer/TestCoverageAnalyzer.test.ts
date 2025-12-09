/**
 * Tests for TestCoverageAnalyzer
 *
 * Tests the relationship extraction between test symbols and implementation symbols.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  TestCoverageAnalyzer,
  type TestRelationship,
  type RelationshipExtractionResult,
} from '../../analyzer/TestCoverageAnalyzer';
import { DatabaseManager } from '../../storage/DatabaseManager';
import type { TestCase, TestSuite, TestScenario, TestSymbol } from '../../types/test-symbols';

describe('TestCoverageAnalyzer', () => {
  let analyzer: TestCoverageAnalyzer;
  let db: DatabaseManager;
  let tempDir: string;

  beforeAll(() => {
    // Create temp directory for test database
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-edge-test-'));
  });

  afterAll(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    db = new DatabaseManager(tempDir);
    analyzer = new TestCoverageAnalyzer(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('constructor', () => {
    it('should create TestCoverageAnalyzer instance', () => {
      expect(analyzer).toBeDefined();
      expect(analyzer).toBeInstanceOf(TestCoverageAnalyzer);
    });
  });

  describe('analyzeTestCoverage', () => {
    it('should return empty results for empty input', () => {
      const result = analyzer.analyzeTestCoverage([]);

      expect(result.testCoverageRelations).toEqual([]);
      expect(result.containsRelations).toEqual([]);
      expect(result.coversScenarioRelations).toEqual([]);
      expect(result.coverageStats.totalTestCases).toBe(0);
    });

    it('should create contains relationships for test suites', () => {
      const testSuite: TestSuite = {
        id: 'suite-1',
        name: 'Test Suite',
        type: 'test-suite',
        filePath: '/test/example.test.ts',
        line: 1,
        column: 0,
        parentSymbol: null,
        childSuites: ['suite-2'],
        testCases: ['case-1'],
        nestingLevel: 0,
        isExported: false,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      const childSuite: TestSuite = {
        id: 'suite-2',
        name: 'Child Suite',
        type: 'test-suite',
        filePath: '/test/example.test.ts',
        line: 10,
        column: 0,
        parentSymbol: 'suite-1',
        childSuites: [],
        testCases: [],
        nestingLevel: 1,
        isExported: false,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      const testCase: TestCase = {
        id: 'case-1',
        name: 'should work',
        type: 'test-case',
        filePath: '/test/example.test.ts',
        line: 5,
        column: 0,
        parentSymbol: 'suite-1',
        testedSymbols: [],
        testedMethods: [],
        assertionCount: 1,
        isExported: false,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      const result = analyzer.analyzeTestCoverage([testSuite, childSuite, testCase]);

      expect(result.containsRelations.length).toBeGreaterThan(0);

      // Find suite -> child suite relationship
      const suiteToChild = result.containsRelations.find(
        (r) => r.fromSymbols.includes('suite-1') && r.toSymbols.includes('suite-2')
      );
      expect(suiteToChild).toBeDefined();
      expect(suiteToChild?.type).toBe('contains');

      // Find suite -> test case relationship
      const suiteToCase = result.containsRelations.find(
        (r) => r.fromSymbols.includes('suite-1') && r.toSymbols.includes('case-1')
      );
      expect(suiteToCase).toBeDefined();
      expect(suiteToCase?.type).toBe('contains');
    });

    it('should return correct coverage stats', () => {
      const testCase1: TestCase = {
        id: 'case-1',
        name: 'test 1',
        type: 'test-case',
        filePath: '/test/a.test.ts',
        line: 1,
        column: 0,
        parentSymbol: null,
        testedSymbols: [],
        testedMethods: [],
        assertionCount: 3,
        isExported: false,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      const testCase2: TestCase = {
        id: 'case-2',
        name: 'test 2',
        type: 'test-case',
        filePath: '/test/b.test.ts',
        line: 1,
        column: 0,
        parentSymbol: null,
        testedSymbols: [],
        testedMethods: [],
        assertionCount: 2,
        isExported: false,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      const result = analyzer.analyzeTestCoverage([testCase1, testCase2]);

      expect(result.coverageStats.totalTestCases).toBe(2);
      expect(result.coverageStats.averageAssertions).toBe(2.5);
    });

    it('should handle test cases without assertions', () => {
      const testCase: TestCase = {
        id: 'case-no-assert',
        name: 'test without assertions',
        type: 'test-case',
        filePath: '/test/empty.test.ts',
        line: 1,
        column: 0,
        parentSymbol: null,
        testedSymbols: [],
        testedMethods: [],
        assertionCount: 0,
        isExported: false,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      const result = analyzer.analyzeTestCoverage([testCase]);

      expect(result.coverageStats.totalTestCases).toBe(1);
      expect(result.coverageStats.averageAssertions).toBe(0);
    });

    it('should handle mixed symbol types', () => {
      const testSuite: TestSuite = {
        id: 'suite-mixed',
        name: 'Mixed Suite',
        type: 'test-suite',
        filePath: '/test/mixed.test.ts',
        line: 1,
        column: 0,
        parentSymbol: null,
        childSuites: [],
        testCases: ['case-mixed'],
        nestingLevel: 0,
        isExported: false,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      const testCase: TestCase = {
        id: 'case-mixed',
        name: 'mixed test',
        type: 'test-case',
        filePath: '/test/mixed.test.ts',
        line: 5,
        column: 0,
        parentSymbol: 'suite-mixed',
        testedSymbols: ['SomeClass'],
        testedMethods: ['someMethod'],
        assertionCount: 1,
        isExported: false,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      const scenario: TestScenario = {
        id: 'scenario-1',
        name: 'mixed scenario',
        type: 'test-scenario',
        filePath: '/test/mixed.test.ts',
        line: 3,
        column: 0,
        parentSymbol: null,
        coveredBy: [],
        description: 'A mixed scenario for testing',
        isExported: false,
        isPublic: true,
        tests: [],
        designDecisions: [],
      };

      const result = analyzer.analyzeTestCoverage([testSuite, testCase, scenario]);

      expect(result.coverageStats.totalTestCases).toBe(1);
      expect(result.coverageStats.totalScenarios).toBe(1);
    });
  });

  describe('RelationshipExtractionResult interface', () => {
    it('should have correct structure', () => {
      const result: RelationshipExtractionResult = {
        testCoverageRelations: [],
        containsRelations: [],
        coversScenarioRelations: [],
        coverageStats: {
          totalTestCases: 0,
          testCasesWithCoverage: 0,
          totalTestedSymbols: 0,
          totalScenarios: 0,
          scenariosWithCoverage: 0,
          averageAssertions: 0,
        },
      };

      expect(result.testCoverageRelations).toEqual([]);
      expect(result.containsRelations).toEqual([]);
      expect(result.coversScenarioRelations).toEqual([]);
      expect(result.coverageStats.totalTestCases).toBe(0);
    });
  });

  describe('TestRelationship interface', () => {
    it('should have correct structure', () => {
      const relation: TestRelationship = {
        id: 'test-relation-1',
        type: 'test-coverage',
        fromSymbols: ['test-case-1'],
        toSymbols: ['class-myclass'],
        category: 'testing',
        confidence: 0.8,
        metadata: {
          testedMethods: ['doSomething'],
          assertionCount: 3,
        },
      };

      expect(relation.id).toBe('test-relation-1');
      expect(relation.type).toBe('test-coverage');
      expect(relation.category).toBe('testing');
      expect(relation.confidence).toBe(0.8);
      expect(relation.metadata.testedMethods).toContain('doSomething');
    });

    it('should support contains relationship type', () => {
      const relation: TestRelationship = {
        id: 'contains-1',
        type: 'contains',
        fromSymbols: ['suite-1'],
        toSymbols: ['case-1'],
        category: 'testing',
        confidence: 1.0,
        metadata: {
          nestingLevel: 1,
        },
      };

      expect(relation.type).toBe('contains');
      expect(relation.metadata.nestingLevel).toBe(1);
    });

    it('should support covers-scenario relationship type', () => {
      const relation: TestRelationship = {
        id: 'covers-scenario-1',
        type: 'covers-scenario',
        fromSymbols: ['case-1'],
        toSymbols: ['scenario-1'],
        category: 'testing',
        confidence: 0.7,
        metadata: {},
      };

      expect(relation.type).toBe('covers-scenario');
      expect(relation.confidence).toBe(0.7);
    });
  });
});
