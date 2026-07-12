/**
 * TestExampleExtractor tests
 * @testScenario Extract test examples from test files
 * @testScenario Assess complexity of test code
 * @testScenario Categorize examples by purpose
 * @testScenario Calculate quality scores
 * @testScenario Create test-as-example relationships
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { type TestExample, TestExampleExtractor } from '../../analyzer/TestExampleExtractor';

describe('TestExampleExtractor', () => {
  let tempDir: string;

  // Mock DatabaseManager
  const createMockDb = (symbols: any[] = []) => ({
    getAllSymbols: jest.fn(() => symbols),
    getSymbol: jest.fn((id: string) => symbols.find((s) => s.id === id)),
  });

  beforeEach(() => {
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'test-extractor-test-'))
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('extractExamples', () => {
    it('should extract test cases from a test file', () => {
      const testFile = path.join(tempDir, 'MyClass.test.ts');
      fs.writeFileSync(
        testFile,
        `
        describe('MyClass', () => {
          it('should create an instance', () => {
            const instance = new MyClass();
            expect(instance).toBeDefined();
          });

          it('should handle input correctly', () => {
            const result = myClass.process('input');
            expect(result).toBe('output');
          });
        });
      `
      );

      const db = createMockDb();
      const extractor = new TestExampleExtractor(db as any);
      const examples = extractor.extractExamples(testFile);

      expect(examples).toHaveLength(2);
      expect(examples[0].description).toBe('should create an instance');
      expect(examples[1].description).toBe('should handle input correctly');
    });

    it('should return empty array for non-existent file', () => {
      const db = createMockDb();
      const extractor = new TestExampleExtractor(db as any);

      const examples = extractor.extractExamples('/nonexistent/file.test.ts');

      expect(examples).toEqual([]);
    });

    it('should extract line numbers correctly', () => {
      const testFile = path.join(tempDir, 'LineTest.test.ts');
      fs.writeFileSync(
        testFile,
        `describe('Test', () => {
  it('first test', () => {
    expect(true).toBe(true);
  });
});`
      );

      const db = createMockDb();
      const extractor = new TestExampleExtractor(db as any);
      const examples = extractor.extractExamples(testFile);

      expect(examples[0].line).toBe(2);
    });

    it('should extract test code correctly', () => {
      const testFile = path.join(tempDir, 'CodeTest.test.ts');
      fs.writeFileSync(
        testFile,
        `describe('Test', () => {
  it('should work', () => {
    const x = 1;
    expect(x).toBe(1);
  });
});`
      );

      const db = createMockDb();
      const extractor = new TestExampleExtractor(db as any);
      const examples = extractor.extractExamples(testFile);

      expect(examples[0].code).toContain('const x = 1');
      expect(examples[0].code).toContain('expect(x).toBe(1)');
    });

    it('should handle arrow function test callbacks', () => {
      const testFile = path.join(tempDir, 'Arrow.test.ts');
      fs.writeFileSync(
        testFile,
        `describe('Test', () => {
  it('arrow test', () => {
    expect(1).toBe(1);
  });
});`
      );

      const db = createMockDb();
      const extractor = new TestExampleExtractor(db as any);
      const examples = extractor.extractExamples(testFile);

      expect(examples).toHaveLength(1);
      expect(examples[0].description).toBe('arrow test');
    });

    it('should handle async test functions', () => {
      const testFile = path.join(tempDir, 'Async.test.ts');
      fs.writeFileSync(
        testFile,
        `describe('Async', () => {
  it('should handle async', async () => {
    const result = await fetchData();
    expect(result).toBeDefined();
  });
});`
      );

      const db = createMockDb();
      const extractor = new TestExampleExtractor(db as any);
      const examples = extractor.extractExamples(testFile);

      expect(examples[0].complexity).not.toBe('simple');
    });
  });

  describe('complexity assessment', () => {
    it('should assess simple test as simple', () => {
      const testFile = path.join(tempDir, 'Simple.test.ts');
      fs.writeFileSync(
        testFile,
        `describe('Simple', () => {
  it('simple test', () => {
    expect(1).toBe(1);
  });
});`
      );

      const db = createMockDb();
      const extractor = new TestExampleExtractor(db as any);
      const examples = extractor.extractExamples(testFile);

      expect(examples[0].complexity).toBe('simple');
    });

    it('should assess test with mocking as medium or complex', () => {
      const testFile = path.join(tempDir, 'Mock.test.ts');
      fs.writeFileSync(
        testFile,
        `describe('Mock', () => {
  it('should mock something', () => {
    const mockFn = jest.fn();
    mockFn();
    expect(mockFn).toHaveBeenCalled();
  });
});`
      );

      const db = createMockDb();
      const extractor = new TestExampleExtractor(db as any);
      const examples = extractor.extractExamples(testFile);

      expect(['medium', 'complex']).toContain(examples[0].complexity);
    });
  });

  describe('example categorization', () => {
    it('should categorize edge case tests', () => {
      const testFile = path.join(tempDir, 'EdgeCase.test.ts');
      fs.writeFileSync(
        testFile,
        `describe('EdgeCase', () => {
  it('should handle edge case with null', () => {
    expect(process(null)).toBeNull();
  });
});`
      );

      const db = createMockDb();
      const extractor = new TestExampleExtractor(db as any);
      const examples = extractor.extractExamples(testFile);

      expect(examples[0].category).toBe('edge-case');
    });

    it('should categorize error handling tests as edge-case', () => {
      const testFile = path.join(tempDir, 'Error.test.ts');
      fs.writeFileSync(
        testFile,
        `describe('Error', () => {
  it('should throw error for invalid input', () => {
    expect(() => process(null)).toThrow();
  });
});`
      );

      const db = createMockDb();
      const extractor = new TestExampleExtractor(db as any);
      const examples = extractor.extractExamples(testFile);

      expect(examples[0].category).toBe('edge-case');
    });

    it('should categorize basic tests as basic-usage', () => {
      const testFile = path.join(tempDir, 'Basic.test.ts');
      fs.writeFileSync(
        testFile,
        `describe('Basic', () => {
  it('should create instance', () => {
    const x = new MyClass();
    expect(x).toBeDefined();
  });
});`
      );

      const db = createMockDb();
      const extractor = new TestExampleExtractor(db as any);
      const examples = extractor.extractExamples(testFile);

      expect(examples[0].category).toBe('basic-usage');
    });
  });

  describe('quality assessment', () => {
    it('should give higher score for good description', () => {
      const testFile = path.join(tempDir, 'Quality.test.ts');
      fs.writeFileSync(
        testFile,
        `describe('Quality', () => {
  it('should correctly validate user input and return appropriate response', () => {
    expect(1).toBe(1);
  });

  it('test', () => {
    expect(1).toBe(1);
  });
});`
      );

      const db = createMockDb();
      const extractor = new TestExampleExtractor(db as any);
      const examples = extractor.extractExamples(testFile);

      expect(examples[0].quality).toBeGreaterThan(examples[1].quality);
    });

    it('should give higher score for tests with multiple assertions', () => {
      const testFile = path.join(tempDir, 'Assertions.test.ts');
      fs.writeFileSync(
        testFile,
        `describe('Assertions', () => {
  it('single assertion', () => {
    expect(1).toBe(1);
  });

  it('multiple assertions', () => {
    expect(1).toBe(1);
    expect(2).toBe(2);
    expect(3).toBe(3);
  });
});`
      );

      const db = createMockDb();
      const extractor = new TestExampleExtractor(db as any);
      const examples = extractor.extractExamples(testFile);

      expect(examples[1].quality).toBeGreaterThan(examples[0].quality);
    });
  });

  describe('createRelationships', () => {
    it('should create relationships for test examples', () => {
      const symbols = [
        { id: 'class-myclass', name: 'MyClass', type: 'class', filePath: '/src/MyClass.ts' },
      ];
      const db = createMockDb(symbols);
      const extractor = new TestExampleExtractor(db as any);

      const examples: TestExample[] = [
        {
          id: 'test-case-myclass-10',
          description: 'should work',
          filePath: '/tests/MyClass.test.ts',
          line: 10,
          code: 'expect(1).toBe(1)',
          testedSymbols: ['class-myclass'],
          complexity: 'simple',
          category: 'basic-usage',
          quality: 7,
        },
      ];

      const relationships = extractor.createRelationships(examples);

      expect(relationships).toHaveLength(1);
      expect(relationships[0].type).toBe('test-as-example');
      expect(relationships[0].from).toBe('test-case-myclass-10');
      expect(relationships[0].to).toBe('class-myclass');
    });

    it('should skip symbols that do not exist in database', () => {
      const db = createMockDb([]); // Empty database
      const extractor = new TestExampleExtractor(db as any);

      const examples: TestExample[] = [
        {
          id: 'test-case-1',
          description: 'test',
          filePath: '/tests/Test.test.ts',
          line: 1,
          code: 'expect(1).toBe(1)',
          testedSymbols: ['nonexistent-symbol'],
          complexity: 'simple',
          category: 'basic-usage',
          quality: 5,
        },
      ];

      const relationships = extractor.createRelationships(examples);

      expect(relationships).toHaveLength(0);
    });

    it('should set strength based on quality', () => {
      const symbols = [
        { id: 'class-a', name: 'A', type: 'class', filePath: '/src/A.ts' },
        { id: 'class-b', name: 'B', type: 'class', filePath: '/src/B.ts' },
      ];
      const db = createMockDb(symbols);
      const extractor = new TestExampleExtractor(db as any);

      const examples: TestExample[] = [
        {
          id: 'test-high',
          description: 'high quality test',
          filePath: '/tests/A.test.ts',
          line: 1,
          code: 'expect(1).toBe(1)',
          testedSymbols: ['class-a'],
          complexity: 'simple',
          category: 'basic-usage',
          quality: 9,
        },
        {
          id: 'test-low',
          description: 'low quality test',
          filePath: '/tests/B.test.ts',
          line: 1,
          code: 'x',
          testedSymbols: ['class-b'],
          complexity: 'simple',
          category: 'basic-usage',
          quality: 3,
        },
      ];

      const relationships = extractor.createRelationships(examples);

      expect(relationships[0].strength).toBe('strong');
      expect(relationships[1].strength).toBe('weak');
    });
  });

  describe('extractAllExamples', () => {
    it('should extract examples from all test files in database', () => {
      const testFile = path.join(tempDir, 'AllTests.test.ts');
      fs.writeFileSync(
        testFile,
        `describe('All', () => {
  it('test one', () => { expect(1).toBe(1); });
});`
      );

      const symbols = [{ id: 'test-1', name: 'test', type: 'function', filePath: testFile }];
      const db = createMockDb(symbols);
      const extractor = new TestExampleExtractor(db as any);

      const examples = extractor.extractAllExamples();

      expect(examples.length).toBeGreaterThanOrEqual(1);
    });
  });
});
