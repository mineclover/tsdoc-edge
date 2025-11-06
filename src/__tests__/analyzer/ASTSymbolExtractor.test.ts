/**
 * Tests for ASTSymbolExtractor
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ASTSymbolExtractor } from '../../analyzer/ASTSymbolExtractor';

describe('ASTSymbolExtractor', () => {
  let extractor: ASTSymbolExtractor;
  let tempDir: string;

  beforeEach(() => {
    extractor = new ASTSymbolExtractor();
    tempDir = path.join(process.cwd(), '.test-temp', `ast-extractor-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create ASTSymbolExtractor instance', () => {
      expect(extractor).toBeDefined();
      expect(extractor).toBeInstanceOf(ASTSymbolExtractor);
    });
  });

  describe('extract', () => {
    it('should extract class symbols', () => {
      const testFile = path.join(tempDir, 'class.ts');
      const sourceCode = `
/**
 * Test class
 */
export class TestClass {
  constructor() {}
}
`;

      const result = extractor.extract(testFile, sourceCode);

      expect(result.symbols.length).toBe(1);
      expect(result.symbols[0].name).toBe('TestClass');
      expect(result.symbols[0].type).toBe('class');
      expect(result.symbols[0].isExported).toBe(true);
      expect(result.symbols[0].filePath).toBe(testFile);
      expect(result.symbols[0].summary).toBe('Test class');
    });

    it('should extract interface symbols', () => {
      const testFile = path.join(tempDir, 'interface.ts');
      const sourceCode = `
/**
 * Test interface
 */
export interface TestInterface {
  id: string;
  name: string;
}
`;

      const result = extractor.extract(testFile, sourceCode);

      expect(result.symbols.length).toBe(1);
      expect(result.symbols[0].name).toBe('TestInterface');
      expect(result.symbols[0].type).toBe('interface');
      expect(result.symbols[0].isExported).toBe(true);
      expect(result.symbols[0].isPublic).toBe(true);
    });

    it('should extract function symbols', () => {
      const testFile = path.join(tempDir, 'function.ts');
      const sourceCode = `
/**
 * Test function
 */
export function testFunction(param: string): string {
  return param;
}
`;

      const result = extractor.extract(testFile, sourceCode);

      expect(result.symbols.length).toBe(1);
      expect(result.symbols[0].name).toBe('testFunction');
      expect(result.symbols[0].type).toBe('function');
      expect(result.symbols[0].isExported).toBe(true);
    });

    it('should extract type alias symbols', () => {
      const testFile = path.join(tempDir, 'type.ts');
      const sourceCode = `
/**
 * Test type
 */
export type TestType = {
  id: string;
  value: number;
};
`;

      const result = extractor.extract(testFile, sourceCode);

      expect(result.symbols.length).toBe(1);
      expect(result.symbols[0].name).toBe('TestType');
      expect(result.symbols[0].type).toBe('type');
      expect(result.symbols[0].isExported).toBe(true);
    });

    it('should extract enum symbols', () => {
      const testFile = path.join(tempDir, 'enum.ts');
      const sourceCode = `
/**
 * Test enum
 */
export enum TestEnum {
  ONE = 'one',
  TWO = 'two',
}
`;

      const result = extractor.extract(testFile, sourceCode);

      expect(result.symbols.length).toBe(1);
      expect(result.symbols[0].name).toBe('TestEnum');
      expect(result.symbols[0].type).toBe('enum');
      expect(result.symbols[0].isExported).toBe(true);
    });

    it('should extract class methods with parent symbol', () => {
      const testFile = path.join(tempDir, 'methods.ts');
      const sourceCode = `
export class TestClass {
  /**
   * Public method
   */
  public publicMethod() {}

  /**
   * Private method
   */
  private privateMethod() {}

  /**
   * Method without modifier
   */
  normalMethod() {}
}
`;

      const result = extractor.extract(testFile, sourceCode);

      const classSymbol = result.symbols.find((s) => s.name === 'TestClass');
      expect(classSymbol).toBeDefined();

      const methods = result.symbols.filter((s) => s.type === 'method');
      expect(methods.length).toBe(3);

      const publicMethod = methods.find((m) => m.name === 'TestClass.publicMethod');
      expect(publicMethod).toBeDefined();
      expect(publicMethod?.isPublic).toBe(true);
      expect(publicMethod?.parentSymbol).toBe('TestClass');

      const privateMethod = methods.find((m) => m.name === 'TestClass.privateMethod');
      expect(privateMethod).toBeDefined();
      expect(privateMethod?.isPublic).toBe(false);
      expect(privateMethod?.parentSymbol).toBe('TestClass');
    });

    it('should extract class properties', () => {
      const testFile = path.join(tempDir, 'properties.ts');
      const sourceCode = `
export class TestClass {
  public publicProp: string = 'test';
  private privateProp: number = 42;
  normalProp: boolean = true;
}
`;

      const result = extractor.extract(testFile, sourceCode);

      const properties = result.symbols.filter((s) => s.type === 'property');
      expect(properties.length).toBe(3);

      const publicProp = properties.find((p) => p.name === 'TestClass.publicProp');
      expect(publicProp).toBeDefined();
      expect(publicProp?.isPublic).toBe(true);
      expect(publicProp?.parentSymbol).toBe('TestClass');

      const privateProp = properties.find((p) => p.name === 'TestClass.privateProp');
      expect(privateProp).toBeDefined();
      expect(privateProp?.isPublic).toBe(false);
    });

    it('should extract import declarations', () => {
      const testFile = path.join(tempDir, 'imports.ts');
      const sourceCode = `
import { foo, bar } from './foo';
import * as utils from './utils';
import defaultExport from './default';
`;

      const result = extractor.extract(testFile, sourceCode);

      expect(result.imports.length).toBe(3);

      const namedImport = result.imports[0];
      expect(namedImport.from).toBe(testFile);
      expect(namedImport.modulePath).toBe('./foo');
      expect(namedImport.imported).toEqual(['foo', 'bar']);

      const namespaceImport = result.imports[1];
      expect(namespaceImport.modulePath).toBe('./utils');
      expect(namespaceImport.imported).toEqual(['utils']);

      const defaultImport = result.imports[2];
      expect(defaultImport.modulePath).toBe('./default');
      expect(defaultImport.imported).toEqual(['defaultExport']);
    });

    it('should extract re-exports', () => {
      const testFile = path.join(tempDir, 'reexport.ts');
      const sourceCode = `
export { Foo, Bar } from './foo';
export * from './utils';
`;

      const result = extractor.extract(testFile, sourceCode);

      expect(result.imports.length).toBe(2);

      const namedReExport = result.imports[0];
      expect(namedReExport.modulePath).toBe('./foo');
      expect(namedReExport.imported).toEqual(['Foo', 'Bar']);

      const wildcardReExport = result.imports[1];
      expect(wildcardReExport.modulePath).toBe('./utils');
      expect(wildcardReExport.imported).toEqual(['*']);
    });

    it('should handle symbols without JSDoc', () => {
      const testFile = path.join(tempDir, 'no-jsdoc.ts');
      const sourceCode = `
export class NoDocClass {
  method() {}
}
`;

      const result = extractor.extract(testFile, sourceCode);

      expect(result.symbols.length).toBe(2);
      expect(result.symbols[0].summary).toBeUndefined();
      expect(result.symbols[1].summary).toBeUndefined();
    });

    it('should handle complex JSDoc comments', () => {
      const testFile = path.join(tempDir, 'complex-jsdoc.ts');
      const sourceCode = `
/**
 * Complex documentation
 * @param param1 - First parameter
 * @param param2 - Second parameter
 * @returns Return value
 * @example
 * const result = complexFunc('a', 'b');
 */
export function complexFunc(param1: string, param2: string): string {
  return param1 + param2;
}
`;

      const result = extractor.extract(testFile, sourceCode);

      expect(result.symbols.length).toBe(1);
      expect(result.symbols[0].summary).toBeDefined();
      expect(result.symbols[0].summary).toContain('Complex documentation');
    });

    it('should handle empty source code', () => {
      const testFile = path.join(tempDir, 'empty.ts');
      const sourceCode = '';

      const result = extractor.extract(testFile, sourceCode);

      expect(result.symbols.length).toBe(0);
      expect(result.imports.length).toBe(0);
      expect(result.relationships.length).toBe(0);
    });

    it('should preserve line and column information', () => {
      const testFile = path.join(tempDir, 'positions.ts');
      const sourceCode = `
export class FirstClass {}

export class SecondClass {}
`;

      const result = extractor.extract(testFile, sourceCode);

      expect(result.symbols.length).toBe(2);
      expect(result.symbols[0].line).toBeDefined();
      expect(result.symbols[0].column).toBeDefined();
      expect(result.symbols[1].line).toBeGreaterThan(result.symbols[0].line);
    });

    it('should handle nested interface members', () => {
      const testFile = path.join(tempDir, 'interface-members.ts');
      const sourceCode = `
export interface ComplexInterface {
  id: string;
  nested: {
    prop1: number;
    prop2: boolean;
  };
  method(): void;
}
`;

      const result = extractor.extract(testFile, sourceCode);

      const interfaceSymbol = result.symbols.find((s) => s.name === 'ComplexInterface');
      expect(interfaceSymbol).toBeDefined();
      expect(interfaceSymbol?.type).toBe('interface');
    });
  });

  describe('edge cases', () => {
    it('should handle symbols with same name in different scopes', () => {
      const testFile = path.join(tempDir, 'same-name.ts');
      const sourceCode = `
export class Container {
  value: string = 'test';
}

export function Container() {
  return 'function';
}
`;

      const result = extractor.extract(testFile, sourceCode);

      const symbols = result.symbols.filter((s) => s.name === 'Container');
      expect(symbols.length).toBe(2);
    });

    it('should handle private classes', () => {
      const testFile = path.join(tempDir, 'private-class.ts');
      const sourceCode = `
class PrivateClass {
  method() {}
}

export class PublicClass {}
`;

      const result = extractor.extract(testFile, sourceCode);

      const privateClass = result.symbols.find((s) => s.name === 'PrivateClass');
      expect(privateClass).toBeDefined();
      expect(privateClass?.isExported).toBe(false);

      const publicClass = result.symbols.find((s) => s.name === 'PublicClass');
      expect(publicClass?.isExported).toBe(true);
    });

    it('should handle symbols with special characters in names', () => {
      const testFile = path.join(tempDir, 'special-names.ts');
      const sourceCode = `
export class _UnderscoreClass {}
export class $DollarClass {}
`;

      const result = extractor.extract(testFile, sourceCode);

      expect(result.symbols.some((s) => s.name === '_UnderscoreClass')).toBe(true);
      expect(result.symbols.some((s) => s.name === '$DollarClass')).toBe(true);
    });

    it('should handle multiple exports from same file', () => {
      const testFile = path.join(tempDir, 'multiple-exports.ts');
      const sourceCode = `
export class ClassA {}
export class ClassB {}
export interface InterfaceA {}
export type TypeA = string;
export enum EnumA { ONE, TWO }
export function functionA() {}
`;

      const result = extractor.extract(testFile, sourceCode);

      expect(result.symbols.length).toBe(6);
      expect(result.symbols.every((s) => s.isExported)).toBe(true);
    });
  });
});
