/**
 * Tests for TestSymbolParser
 * @testScenario Extract test suites from describe blocks
 * @testScenario Extract test cases from it/test blocks
 * @testScenario Extract test scenarios from @testScenario tags
 * @testScenario Build hierarchical test suite structure
 * @testScenario Generate correct test symbol IDs
 */

import { TestSymbolParser } from '../../parser/TestSymbolParser';

describe('TestSymbolParser', () => {
  let parser: TestSymbolParser;

  beforeEach(() => {
    parser = new TestSymbolParser();
  });

  describe('Test Suite Extraction', () => {
    it('should extract a simple describe block', () => {
      const sourceCode = `
describe('DatabaseManager', () => {
  it('should work', () => {});
});
`;

      const result = parser.extract('test.ts', sourceCode);

      expect(result.testSuites).toHaveLength(1);
      expect(result.testSuites[0].name).toBe('DatabaseManager');
      expect(result.testSuites[0].type).toBe('test-suite');
      expect(result.testSuites[0].id).toBe('test-database-manager-test-suite');
      expect(result.testSuites[0].nestingLevel).toBe(0);
      expect(result.testSuites[0].parentSymbol).toBeNull();
    });

    it('should extract nested describe blocks', () => {
      const sourceCode = `
describe('DatabaseManager', () => {
  describe('Symbol Operations', () => {
    it('should insert symbol', () => {});
  });
});
`;

      const result = parser.extract('DatabaseManager.test.ts', sourceCode);

      expect(result.testSuites).toHaveLength(2);

      // Parent suite
      const parent = result.testSuites.find((s) => s.name === 'DatabaseManager');
      expect(parent).toBeDefined();
      expect(parent!.id).toBe('database-manager-test-suite');
      expect(parent!.nestingLevel).toBe(0);
      expect(parent!.parentSymbol).toBeNull();
      expect(parent!.childSuites).toHaveLength(1);

      // Child suite
      const child = result.testSuites.find((s) => s.name === 'Symbol Operations');
      expect(child).toBeDefined();
      expect(child!.id).toBe('database-manager-symbol-operations-test-suite');
      expect(child!.nestingLevel).toBe(1);
      expect(child!.parentSymbol).toBe('database-manager-test-suite');
      expect(parent!.childSuites[0]).toBe(child!.id);
    });

    it('should extract multiple describe blocks at same level', () => {
      const sourceCode = `
describe('DatabaseManager', () => {
  describe('Initialization', () => {});
  describe('Symbol Operations', () => {});
});
`;

      const result = parser.extract('test.ts', sourceCode);

      expect(result.testSuites).toHaveLength(3);

      const parent = result.testSuites.find((s) => s.name === 'DatabaseManager');
      expect(parent!.childSuites).toHaveLength(2);
    });

    it('should skip describe.skip when includeSkipped is false', () => {
      const sourceCode = `
describe('Active', () => {});
describe.skip('Skipped', () => {});
`;

      const result = parser.extract('test.ts', sourceCode, { includeSkipped: false });

      expect(result.testSuites).toHaveLength(1);
      expect(result.testSuites[0].name).toBe('Active');
    });

    it('should include describe.skip when includeSkipped is true', () => {
      const sourceCode = `
describe('Active', () => {});
describe.skip('Skipped', () => {});
`;

      const result = parser.extract('test.ts', sourceCode, { includeSkipped: true });

      expect(result.testSuites).toHaveLength(2);
      expect(result.testSuites[1].name).toBe('Skipped');
    });

    it('should respect maxNestingLevel option', () => {
      const sourceCode = `
describe('Level 0', () => {
  describe('Level 1', () => {
    describe('Level 2', () => {
      it('test', () => {});
    });
  });
});
`;

      const result = parser.extract('test.ts', sourceCode, { maxNestingLevel: 2 });

      expect(result.testSuites).toHaveLength(2);
      expect(result.testSuites.some((s) => s.name === 'Level 2')).toBe(false);
    });
  });

  describe('Test Case Extraction', () => {
    it('should extract it() blocks', () => {
      const sourceCode = `
describe('Suite', () => {
  it('should do something', () => {});
});
`;

      const result = parser.extract('test.ts', sourceCode);

      expect(result.testCases).toHaveLength(1);
      expect(result.testCases[0].name).toBe('should do something');
      expect(result.testCases[0].type).toBe('test-case');
      expect(result.testCases[0].id).toBe('test-suite-should-do-something-test-case');
    });

    it('should extract test() blocks', () => {
      const sourceCode = `
describe('Suite', () => {
  test('should do something', () => {});
});
`;

      const result = parser.extract('test.ts', sourceCode);

      expect(result.testCases).toHaveLength(1);
      expect(result.testCases[0].name).toBe('should do something');
    });

    it('should link test cases to parent suite', () => {
      const sourceCode = `
describe('Suite', () => {
  it('test 1', () => {});
  it('test 2', () => {});
});
`;

      const result = parser.extract('test.ts', sourceCode);

      expect(result.testCases).toHaveLength(2);
      expect(result.testCases[0].parentSymbol).toBe('test-suite-test-suite');
      expect(result.testCases[1].parentSymbol).toBe('test-suite-test-suite');

      const suite = result.testSuites[0];
      expect(suite.testCases).toHaveLength(2);
      expect(suite.testCases).toContain(result.testCases[0].id);
      expect(suite.testCases).toContain(result.testCases[1].id);
    });

    it('should skip it.skip when includeSkipped is false', () => {
      const sourceCode = `
describe('Suite', () => {
  it('active test', () => {});
  it.skip('skipped test', () => {});
});
`;

      const result = parser.extract('test.ts', sourceCode, { includeSkipped: false });

      expect(result.testCases).toHaveLength(1);
      expect(result.testCases[0].name).toBe('active test');
    });

    it('should include it.skip when includeSkipped is true', () => {
      const sourceCode = `
describe('Suite', () => {
  it('active test', () => {});
  it.skip('skipped test', () => {});
});
`;

      const result = parser.extract('test.ts', sourceCode, { includeSkipped: true });

      expect(result.testCases).toHaveLength(2);
      expect(result.testCases[1].name).toBe('skipped test');
    });
  });

  describe('Test Scenario Extraction', () => {
    it('should extract @testScenario tags from JSDoc', () => {
      const sourceCode = `
/**
 * DatabaseManager tests
 * @testScenario Database initialization with schema
 * @testScenario Symbol insertion and retrieval
 */

describe('DatabaseManager', () => {});
`;

      const result = parser.extract('DatabaseManager.test.ts', sourceCode);

      expect(result.testScenarios).toHaveLength(2);
      expect(result.testScenarios[0].name).toBe('Database initialization with schema');
      expect(result.testScenarios[0].type).toBe('test-scenario');
      expect(result.testScenarios[0].id).toBe(
        'database-manager-database-initialization-with-schema-scenario'
      );
      expect(result.testScenarios[1].name).toBe('Symbol insertion and retrieval');
    });

    it('should skip scenario extraction when extractScenarios is false', () => {
      const sourceCode = `
/**
 * @testScenario Some scenario
 */
describe('Suite', () => {});
`;

      const result = parser.extract('test.ts', sourceCode, { extractScenarios: false });

      expect(result.testScenarios).toHaveLength(0);
    });
  });

  describe('Test Coverage Extraction', () => {
    it('should extract tested symbols from test body', () => {
      const sourceCode = `
describe('DatabaseManager', () => {
  it('should insert symbol', () => {
    const result = dbManager.insertSymbol(testSymbol, 0);
    expect(result).toBe(true);
  });
});
`;

      const result = parser.extract('test.ts', sourceCode);

      expect(result.testCases).toHaveLength(1);
      expect(result.testCases[0].testedSymbols).toContain('dbManager');
      expect(result.testCases[0].testedMethods).toContain('insertSymbol');
      expect(result.testCases[0].assertionCount).toBe(1);
    });

    it('should count multiple assertions', () => {
      const sourceCode = `
describe('Test', () => {
  it('should validate', () => {
    expect(a).toBe(1);
    expect(b).toBe(2);
    expect(c).toBe(3);
  });
});
`;

      const result = parser.extract('test.ts', sourceCode);

      expect(result.testCases[0].assertionCount).toBe(3);
    });

    it('should skip coverage extraction when extractCoverage is false', () => {
      const sourceCode = `
describe('Test', () => {
  it('should work', () => {
    dbManager.insertSymbol(symbol);
    expect(true).toBe(true);
  });
});
`;

      const result = parser.extract('test.ts', sourceCode, { extractCoverage: false });

      expect(result.testCases[0].testedSymbols).toHaveLength(0);
      expect(result.testCases[0].testedMethods).toHaveLength(0);
      expect(result.testCases[0].assertionCount).toBeUndefined();
    });
  });

  describe('Symbol ID Generation', () => {
    it('should generate correct IDs for nested structure', () => {
      const sourceCode = `
describe('DatabaseManager', () => {
  describe('Symbol Operations', () => {
    it('should insert symbol', () => {});
  });
});
`;

      const result = parser.extract('DatabaseManager.test.ts', sourceCode);

      const rootSuite = result.testSuites.find((s) => s.nestingLevel === 0);
      const nestedSuite = result.testSuites.find((s) => s.nestingLevel === 1);
      const testCase = result.testCases[0];

      expect(rootSuite!.id).toBe('database-manager-test-suite');
      expect(nestedSuite!.id).toBe('database-manager-symbol-operations-test-suite');
      expect(testCase.id).toBe('database-manager-symbol-operations-should-insert-symbol-test-case');
    });

    it('should convert camelCase to kebab-case', () => {
      const sourceCode = `
describe('TestCamelCase', () => {
  it('should DoSomethingNice', () => {});
});
`;

      const result = parser.extract('test.ts', sourceCode);

      expect(result.testSuites[0].id).toBe('test-test-camel-case-test-suite');
      expect(result.testCases[0].id).toBe(
        'test-test-camel-case-should-do-something-nice-test-case'
      );
    });

    it('should handle special characters in names', () => {
      const sourceCode = `
describe('Test @special #chars!', () => {
  it('should handle $symbols & more', () => {});
});
`;

      const result = parser.extract('test.ts', sourceCode);

      expect(result.testSuites[0].id).toBe('test-test-special-chars-test-suite');
      expect(result.testCases[0].id).toBe(
        'test-test-special-chars-should-handle-symbols-more-test-case'
      );
    });
  });

  describe('File Base Name Extraction', () => {
    it('should extract base name from .test.ts files', () => {
      const sourceCode = 'describe("Test", () => {});';

      const result = parser.extract('src/__tests__/DatabaseManager.test.ts', sourceCode);

      expect(result.testSuites[0].id).toContain('database-manager');
    });

    it('should extract base name from .spec.ts files', () => {
      const sourceCode = 'describe("Test", () => {});';

      const result = parser.extract('src/utils/helpers.spec.ts', sourceCode);

      expect(result.testSuites[0].id).toContain('helpers');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid describe calls', () => {
      const sourceCode = `
describe(); // No arguments
`;

      const result = parser.extract('test.ts', sourceCode);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.testSuites).toHaveLength(0);
    });

    it('should handle invalid it calls', () => {
      const sourceCode = `
describe('Suite', () => {
  it(); // No arguments
});
`;

      const result = parser.extract('test.ts', sourceCode);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle parse errors gracefully', () => {
      const sourceCode = `
this is not valid TypeScript code!!!
`;

      const result = parser.extract('test.ts', sourceCode);

      // Should not throw, should return empty result with errors
      expect(result.testSuites).toHaveLength(0);
      expect(result.testCases).toHaveLength(0);
    });
  });

  describe('Complete Example', () => {
    it('should extract all symbols from a real test file structure', () => {
      const sourceCode = `
/**
 * DatabaseManager tests
 * @testScenario Database initialization with schema
 * @testScenario Symbol insertion and retrieval
 */

describe('DatabaseManager', () => {
  describe('Database Initialization', () => {
    test('should create database file', () => {
      const exists = fs.existsSync(dbPath);
      expect(exists).toBe(true);
    });

    test('should initialize schema', () => {
      const stats = dbManager.getStatistics();
      expect(stats).toBeDefined();
    });
  });

  describe('Symbol Operations', () => {
    it('should insert symbol', () => {
      const result = dbManager.insertSymbol(testSymbol, 0);
      expect(result).toBe(true);
    });

    it('should retrieve symbol by ID', () => {
      const retrieved = dbManager.getSymbol('test-001');
      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('TestFunction');
    });
  });
});
`;

      const result = parser.extract('DatabaseManager.test.ts', sourceCode);

      // Should extract 2 scenarios
      expect(result.testScenarios).toHaveLength(2);

      // Should extract 3 suites (1 root + 2 nested)
      expect(result.testSuites).toHaveLength(3);

      // Should extract 4 test cases
      expect(result.testCases).toHaveLength(4);

      // Check root suite
      const rootSuite = result.testSuites.find((s) => s.name === 'DatabaseManager');
      expect(rootSuite).toBeDefined();
      expect(rootSuite!.childSuites).toHaveLength(2);
      expect(rootSuite!.testCases).toHaveLength(0);

      // Check nested suites
      const initSuite = result.testSuites.find((s) => s.name === 'Database Initialization');
      expect(initSuite).toBeDefined();
      expect(initSuite!.testCases).toHaveLength(2);

      const opsSuite = result.testSuites.find((s) => s.name === 'Symbol Operations');
      expect(opsSuite).toBeDefined();
      expect(opsSuite!.testCases).toHaveLength(2);

      // Check test coverage
      const insertTest = result.testCases.find((t) => t.name === 'should insert symbol');
      expect(insertTest).toBeDefined();
      expect(insertTest!.testedSymbols).toContain('dbManager');
      expect(insertTest!.testedMethods).toContain('insertSymbol');
      expect(insertTest!.assertionCount).toBe(1);

      const retrieveTest = result.testCases.find((t) => t.name === 'should retrieve symbol by ID');
      expect(retrieveTest).toBeDefined();
      expect(retrieveTest!.testedMethods).toContain('getSymbol');
      expect(retrieveTest!.assertionCount).toBe(2);
    });
  });
});
