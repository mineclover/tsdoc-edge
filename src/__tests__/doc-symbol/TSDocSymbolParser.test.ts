/**
 * TSDocSymbolParser tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { TSDocSymbolParser } from '../../doc-symbol/TSDocSymbolParser';

describe('TSDocSymbolParser', () => {
  let tempDir: string;
  let parser: TSDocSymbolParser;

  beforeEach(() => {
    tempDir = path.join(process.cwd(), '.test-temp', `tsdoc-parser-test-${Math.random()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    parser = new TSDocSymbolParser();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('parseCodeFile', () => {
    it('should return empty array for non-existent file', () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.ts');
      const connections = parser.parseCodeFile(nonExistentFile);
      expect(connections).toEqual([]);
    });

    it('should parse @doc tag from class declaration', () => {
      const filePath = path.join(tempDir, 'test.ts');
      const code = `
/**
 * Test class
 * @doc [[TestSymbol]]
 */
export class TestClass {
  method() {}
}
`;
      fs.writeFileSync(filePath, code, 'utf-8');

      const connections = parser.parseCodeFile(filePath);
      expect(connections).toHaveLength(1);
      expect(connections[0].codeSymbol).toBe('TestClass');
      expect(connections[0].docSymbol).toBe('TestSymbol');
      expect(connections[0].filePath).toBe(filePath);
      expect(connections[0].line).toBeGreaterThan(0);
      expect(connections[0].section).toBeUndefined();
    });

    it('should parse @doc tag with section', () => {
      const filePath = path.join(tempDir, 'test.ts');
      const code = `
/**
 * Test class
 * @doc [[TestSymbol#Section]]
 */
export class TestClass {}
`;
      fs.writeFileSync(filePath, code, 'utf-8');

      const connections = parser.parseCodeFile(filePath);
      expect(connections).toHaveLength(1);
      expect(connections[0].docSymbol).toBe('TestSymbol');
      expect(connections[0].section).toBe('Section');
    });

    it('should parse @doc tag from function declaration', () => {
      const filePath = path.join(tempDir, 'test.ts');
      const code = `
/**
 * Test function
 * @doc [[FunctionDoc]]
 */
export function testFunction() {}
`;
      fs.writeFileSync(filePath, code, 'utf-8');

      const connections = parser.parseCodeFile(filePath);
      expect(connections).toHaveLength(1);
      expect(connections[0].codeSymbol).toBe('testFunction');
      expect(connections[0].docSymbol).toBe('FunctionDoc');
    });

    it('should parse @doc tag from interface declaration', () => {
      const filePath = path.join(tempDir, 'test.ts');
      const code = `
/**
 * Test interface
 * @doc [[InterfaceDoc]]
 */
export interface TestInterface {
  prop: string;
}
`;
      fs.writeFileSync(filePath, code, 'utf-8');

      const connections = parser.parseCodeFile(filePath);
      expect(connections).toHaveLength(1);
      expect(connections[0].codeSymbol).toBe('TestInterface');
      expect(connections[0].docSymbol).toBe('InterfaceDoc');
    });

    it('should parse @doc tag from type alias', () => {
      const filePath = path.join(tempDir, 'test.ts');
      const code = `
/**
 * Test type
 * @doc [[TypeDoc]]
 */
export type TestType = string | number;
`;
      fs.writeFileSync(filePath, code, 'utf-8');

      const connections = parser.parseCodeFile(filePath);
      expect(connections).toHaveLength(1);
      expect(connections[0].codeSymbol).toBe('TestType');
      expect(connections[0].docSymbol).toBe('TypeDoc');
    });

    it('should parse multiple @doc tags in same file', () => {
      const filePath = path.join(tempDir, 'test.ts');
      const code = `
/**
 * First class
 * @doc [[Symbol1]]
 */
export class Class1 {}

/**
 * Second class
 * @doc [[Symbol2]]
 */
export class Class2 {}
`;
      fs.writeFileSync(filePath, code, 'utf-8');

      const connections = parser.parseCodeFile(filePath);
      expect(connections).toHaveLength(2);
      expect(connections[0].docSymbol).toBe('Symbol1');
      expect(connections[1].docSymbol).toBe('Symbol2');
    });

    it('should ignore comments without @doc tag', () => {
      const filePath = path.join(tempDir, 'test.ts');
      const code = `
/**
 * Test class without @doc
 * @public
 */
export class TestClass {}
`;
      fs.writeFileSync(filePath, code, 'utf-8');

      const connections = parser.parseCodeFile(filePath);
      expect(connections).toEqual([]);
    });

    it('should ignore malformed @doc tags', () => {
      const filePath = path.join(tempDir, 'test.ts');
      const code = `
/**
 * Test class
 * @doc TestSymbol (missing brackets)
 */
export class TestClass {}
`;
      fs.writeFileSync(filePath, code, 'utf-8');

      const connections = parser.parseCodeFile(filePath);
      expect(connections).toEqual([]);
    });

    it('should handle @doc tag with extra whitespace', () => {
      const filePath = path.join(tempDir, 'test.ts');
      const code = `
/**
 * Test class
 * @doc [[  TestSymbol  ]]
 */
export class TestClass {}
`;
      fs.writeFileSync(filePath, code, 'utf-8');

      const connections = parser.parseCodeFile(filePath);
      expect(connections).toHaveLength(1);
      expect(connections[0].docSymbol).toBe('TestSymbol');
    });

    it('should parse @doc from method declaration', () => {
      const filePath = path.join(tempDir, 'test.ts');
      const code = `
export class TestClass {
  /**
   * Test method
   * @doc [[MethodDoc]]
   */
  testMethod() {}
}
`;
      fs.writeFileSync(filePath, code, 'utf-8');

      const connections = parser.parseCodeFile(filePath);
      expect(connections).toHaveLength(1);
      expect(connections[0].codeSymbol).toBe('testMethod');
      expect(connections[0].docSymbol).toBe('MethodDoc');
    });

    it('should handle empty file', () => {
      const filePath = path.join(tempDir, 'empty.ts');
      fs.writeFileSync(filePath, '', 'utf-8');

      const connections = parser.parseCodeFile(filePath);
      expect(connections).toEqual([]);
    });
  });

  describe('parseMultiple', () => {
    it('should parse multiple files', () => {
      const file1 = path.join(tempDir, 'test1.ts');
      const file2 = path.join(tempDir, 'test2.ts');

      const code1 = `
/**
 * @doc [[Symbol1]]
 */
export class Class1 {}
`;
      const code2 = `
/**
 * @doc [[Symbol2]]
 */
export class Class2 {}
`;

      fs.writeFileSync(file1, code1, 'utf-8');
      fs.writeFileSync(file2, code2, 'utf-8');

      const connections = parser.parseMultiple([file1, file2]);
      expect(connections).toHaveLength(2);
      expect(connections[0].docSymbol).toBe('Symbol1');
      expect(connections[1].docSymbol).toBe('Symbol2');
    });

    it('should return empty array for empty file list', () => {
      const connections = parser.parseMultiple([]);
      expect(connections).toEqual([]);
    });

    it('should skip non-existent files', () => {
      const file1 = path.join(tempDir, 'test1.ts');
      const file2 = path.join(tempDir, 'nonexistent.ts');

      const code1 = `
/**
 * @doc [[Symbol1]]
 */
export class Class1 {}
`;

      fs.writeFileSync(file1, code1, 'utf-8');

      const connections = parser.parseMultiple([file1, file2]);
      expect(connections).toHaveLength(1);
      expect(connections[0].docSymbol).toBe('Symbol1');
    });

    it('should handle files with multiple @doc tags', () => {
      const file1 = path.join(tempDir, 'test1.ts');

      const code1 = `
/**
 * @doc [[Symbol1]]
 */
export class Class1 {}

/**
 * @doc [[Symbol2]]
 */
export class Class2 {}
`;

      fs.writeFileSync(file1, code1, 'utf-8');

      const connections = parser.parseMultiple([file1]);
      expect(connections).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle file with only comments', () => {
      const filePath = path.join(tempDir, 'test.ts');
      const code = `
/**
 * File header comment
 * @doc [[FileDoc]]
 */
`;
      fs.writeFileSync(filePath, code, 'utf-8');

      const connections = parser.parseCodeFile(filePath);
      // Should be empty because @doc is not attached to any declaration
      expect(connections).toEqual([]);
    });

    it('should handle section with special characters', () => {
      const filePath = path.join(tempDir, 'test.ts');
      const code = `
/**
 * Test class
 * @doc [[TestSymbol#Usage & Examples]]
 */
export class TestClass {}
`;
      fs.writeFileSync(filePath, code, 'utf-8');

      const connections = parser.parseCodeFile(filePath);
      expect(connections).toHaveLength(1);
      expect(connections[0].section).toBe('Usage & Examples');
    });

    it('should handle nested classes', () => {
      const filePath = path.join(tempDir, 'test.ts');
      const code = `
export class OuterClass {
  /**
   * @doc [[InnerDoc]]
   */
  static InnerClass = class {};
}
`;
      fs.writeFileSync(filePath, code, 'utf-8');

      const connections = parser.parseCodeFile(filePath);
      // TypeScript AST might not capture nested class names the same way
      // This test verifies the parser doesn't crash
      expect(Array.isArray(connections)).toBe(true);
    });

    it('should handle property declarations', () => {
      const filePath = path.join(tempDir, 'test.ts');
      const code = `
export class TestClass {
  /**
   * @doc [[PropertyDoc]]
   */
  testProperty: string = 'test';
}
`;
      fs.writeFileSync(filePath, code, 'utf-8');

      const connections = parser.parseCodeFile(filePath);
      expect(connections).toHaveLength(1);
      expect(connections[0].codeSymbol).toBe('testProperty');
    });
  });
});
