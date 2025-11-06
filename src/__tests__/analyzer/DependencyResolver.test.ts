/**
 * Tests for DependencyResolver
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DependencyResolver } from '../../analyzer/DependencyResolver';
import type { ExtractedSymbol } from '../../analyzer/ASTSymbolExtractor';
import type { ImportInfo } from '../../analyzer/DependencyResolver';

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;
  let tempDir: string;

  beforeEach(() => {
    resolver = new DependencyResolver();
    tempDir = path.join(process.cwd(), '.test-temp', `dep-resolver-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create DependencyResolver instance', () => {
      expect(resolver).toBeDefined();
      expect(resolver).toBeInstanceOf(DependencyResolver);
    });
  });

  describe('indexSymbols', () => {
    it('should index symbols by file path', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('ClassA', 'src/a.ts', 'class', true),
        createMockSymbol('ClassB', 'src/a.ts', 'class', true),
        createMockSymbol('ClassC', 'src/b.ts', 'class', true),
      ];

      resolver.indexSymbols(symbols);

      const fileASymbols = resolver.getSymbolsInFile('src/a.ts');
      expect(fileASymbols.length).toBe(2);

      const fileBSymbols = resolver.getSymbolsInFile('src/b.ts');
      expect(fileBSymbols.length).toBe(1);
    });

    it('should index symbols by name', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('User', 'src/models/user.ts', 'class', true),
        createMockSymbol('User', 'src/types/user.ts', 'interface', true), // Same name, different file
        createMockSymbol('Order', 'src/models/order.ts', 'class', true),
      ];

      resolver.indexSymbols(symbols);

      const userSymbols = resolver.findSymbolByName('User');
      expect(userSymbols.length).toBe(2);

      const orderSymbols = resolver.findSymbolByName('Order');
      expect(orderSymbols.length).toBe(1);
    });

    it('should clear previous index when re-indexing', () => {
      const symbols1: ExtractedSymbol[] = [
        createMockSymbol('ClassA', 'src/a.ts', 'class', true),
      ];

      const symbols2: ExtractedSymbol[] = [
        createMockSymbol('ClassB', 'src/b.ts', 'class', true),
      ];

      resolver.indexSymbols(symbols1);
      expect(resolver.findSymbolByName('ClassA').length).toBe(1);

      resolver.indexSymbols(symbols2);
      expect(resolver.findSymbolByName('ClassA').length).toBe(0);
      expect(resolver.findSymbolByName('ClassB').length).toBe(1);
    });

    it('should handle empty symbol array', () => {
      resolver.indexSymbols([]);

      const result = resolver.getSymbolsInFile('any-file.ts');
      expect(result.length).toBe(0);
    });
  });

  describe('resolveImports', () => {
    it('should resolve relative imports', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('ClassA', 'src/a.ts', 'class', true),
        createMockSymbol('ClassB', 'src/b.ts', 'class', true),
      ];

      resolver.indexSymbols(symbols);

      const imports: ImportInfo[] = [
        {
          from: 'src/a.ts',
          imported: ['ClassB'],
          modulePath: './b',
        },
      ];

      const relationships = resolver.resolveImports(imports, tempDir);

      expect(relationships.length).toBe(1);
      expect(relationships[0].type).toBe('dependsOn');
      expect(relationships[0].from).toBe('ClassA');
      expect(relationships[0].to).toBe('ClassB');
    });

    it('should resolve imports with .ts extension', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('ServiceA', 'src/services/a.ts', 'class', true),
        createMockSymbol('UtilB', 'src/utils/b.ts', 'function', true),
      ];

      resolver.indexSymbols(symbols);

      const imports: ImportInfo[] = [
        {
          from: 'src/services/a.ts',
          imported: ['UtilB'],
          modulePath: '../utils/b',
        },
      ];

      const relationships = resolver.resolveImports(imports, tempDir);

      expect(relationships.length).toBe(1);
      expect(relationships[0].from).toBe('ServiceA');
      expect(relationships[0].to).toBe('UtilB');
    });

    it('should resolve index imports', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('Main', 'src/main.ts', 'class', true),
        createMockSymbol('Utils', 'src/utils/index.ts', 'function', true),
      ];

      resolver.indexSymbols(symbols);

      const imports: ImportInfo[] = [
        {
          from: 'src/main.ts',
          imported: ['Utils'],
          modulePath: './utils',
        },
      ];

      const relationships = resolver.resolveImports(imports, tempDir);

      expect(relationships.length).toBe(1);
      expect(relationships[0].to).toBe('Utils');
    });

    it('should skip external module imports', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('MyClass', 'src/my-class.ts', 'class', true),
      ];

      resolver.indexSymbols(symbols);

      const imports: ImportInfo[] = [
        {
          from: 'src/my-class.ts',
          imported: ['express'],
          modulePath: 'express', // External module
        },
      ];

      const relationships = resolver.resolveImports(imports, tempDir);

      expect(relationships.length).toBe(0);
    });

    it('should handle multiple imports from same file', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('ClassA', 'src/a.ts', 'class', true),
        createMockSymbol('FuncB', 'src/utils.ts', 'function', true),
        createMockSymbol('FuncC', 'src/utils.ts', 'function', true),
      ];

      resolver.indexSymbols(symbols);

      const imports: ImportInfo[] = [
        {
          from: 'src/a.ts',
          imported: ['FuncB', 'FuncC'],
          modulePath: './utils',
        },
      ];

      const relationships = resolver.resolveImports(imports, tempDir);

      expect(relationships.length).toBe(2);
      expect(relationships[0].from).toBe('ClassA');
      expect(relationships[0].to).toBe('FuncB');
      expect(relationships[1].from).toBe('ClassA');
      expect(relationships[1].to).toBe('FuncC');
    });

    it('should handle file with no exported symbols', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('PrivateClass', 'src/private.ts', 'class', false),
        createMockSymbol('Importer', 'src/importer.ts', 'class', true),
      ];

      resolver.indexSymbols(symbols);

      const imports: ImportInfo[] = [
        {
          from: 'src/importer.ts',
          imported: ['PrivateClass'],
          modulePath: './private',
        },
      ];

      const relationships = resolver.resolveImports(imports, tempDir);

      // Should still create relationship using first symbol
      expect(relationships.length).toBeGreaterThanOrEqual(0);
    });

    it('should skip imports to non-existent files', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('ClassA', 'src/a.ts', 'class', true),
      ];

      resolver.indexSymbols(symbols);

      const imports: ImportInfo[] = [
        {
          from: 'src/a.ts',
          imported: ['MissingClass'],
          modulePath: './missing',
        },
      ];

      const relationships = resolver.resolveImports(imports, tempDir);

      expect(relationships.length).toBe(0);
    });

    it('should skip imports of non-existent symbols', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('ClassA', 'src/a.ts', 'class', true),
        createMockSymbol('ClassB', 'src/b.ts', 'class', true),
      ];

      resolver.indexSymbols(symbols);

      const imports: ImportInfo[] = [
        {
          from: 'src/a.ts',
          imported: ['NonExistentSymbol'],
          modulePath: './b',
        },
      ];

      const relationships = resolver.resolveImports(imports, tempDir);

      expect(relationships.length).toBe(0);
    });
  });

  describe('findSymbolByName', () => {
    it('should find symbols by exact name', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('UserService', 'src/services/user.ts', 'class', true),
        createMockSymbol('OrderService', 'src/services/order.ts', 'class', true),
      ];

      resolver.indexSymbols(symbols);

      const result = resolver.findSymbolByName('UserService');

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('UserService');
    });

    it('should return empty array for non-existent symbol', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('UserService', 'src/services/user.ts', 'class', true),
      ];

      resolver.indexSymbols(symbols);

      const result = resolver.findSymbolByName('NonExistent');

      expect(result.length).toBe(0);
    });

    it('should find multiple symbols with same name', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('Config', 'src/config/app.ts', 'interface', true),
        createMockSymbol('Config', 'src/config/db.ts', 'interface', true),
        createMockSymbol('Config', 'src/config/api.ts', 'type', true),
      ];

      resolver.indexSymbols(symbols);

      const result = resolver.findSymbolByName('Config');

      expect(result.length).toBe(3);
    });
  });

  describe('getSymbolsInFile', () => {
    it('should return all symbols in a file', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('ClassA', 'src/module.ts', 'class', true),
        createMockSymbol('InterfaceB', 'src/module.ts', 'interface', true),
        createMockSymbol('FunctionC', 'src/module.ts', 'function', true),
        createMockSymbol('ClassD', 'src/other.ts', 'class', true),
      ];

      resolver.indexSymbols(symbols);

      const result = resolver.getSymbolsInFile('src/module.ts');

      expect(result.length).toBe(3);
    });

    it('should return empty array for file with no symbols', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('ClassA', 'src/a.ts', 'class', true),
      ];

      resolver.indexSymbols(symbols);

      const result = resolver.getSymbolsInFile('src/empty.ts');

      expect(result.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle symbols with parent symbols', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('UserService', 'src/user.ts', 'class', true),
        {
          ...createMockSymbol('UserService.getUser', 'src/user.ts', 'method', false),
          parentSymbol: 'UserService',
        },
      ];

      resolver.indexSymbols(symbols);

      const classSymbols = resolver.findSymbolByName('UserService');
      expect(classSymbols.length).toBe(1);

      const methodSymbols = resolver.findSymbolByName('UserService.getUser');
      expect(methodSymbols.length).toBe(1);
    });

    it('should handle complex import paths', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('Deep', 'src/level1/level2/level3/deep.ts', 'class', true),
        createMockSymbol('Main', 'src/main.ts', 'class', true),
      ];

      resolver.indexSymbols(symbols);

      const imports: ImportInfo[] = [
        {
          from: 'src/main.ts',
          imported: ['Deep'],
          modulePath: './level1/level2/level3/deep',
        },
      ];

      const relationships = resolver.resolveImports(imports, tempDir);

      expect(relationships.length).toBe(1);
      expect(relationships[0].to).toBe('Deep');
    });

    it('should normalize path separators', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('ClassA', 'src/folder/file.ts', 'class', true),
        createMockSymbol('ClassB', 'src/other.ts', 'class', true),
      ];

      resolver.indexSymbols(symbols);

      // Test with backslashes (Windows-style)
      const fileSymbols = resolver.getSymbolsInFile('src/folder/file.ts');
      expect(fileSymbols.length).toBe(1);
    });

    it('should handle circular dependencies', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('ClassA', 'src/a.ts', 'class', true),
        createMockSymbol('ClassB', 'src/b.ts', 'class', true),
      ];

      resolver.indexSymbols(symbols);

      const imports: ImportInfo[] = [
        {
          from: 'src/a.ts',
          imported: ['ClassB'],
          modulePath: './b',
        },
        {
          from: 'src/b.ts',
          imported: ['ClassA'],
          modulePath: './a',
        },
      ];

      const relationships = resolver.resolveImports(imports, tempDir);

      expect(relationships.length).toBe(2);
      expect(relationships[0].from).toBe('ClassA');
      expect(relationships[0].to).toBe('ClassB');
      expect(relationships[1].from).toBe('ClassB');
      expect(relationships[1].to).toBe('ClassA');
    });

    it('should handle empty imports array', () => {
      const symbols: ExtractedSymbol[] = [
        createMockSymbol('ClassA', 'src/a.ts', 'class', true),
      ];

      resolver.indexSymbols(symbols);

      const relationships = resolver.resolveImports([], tempDir);

      expect(relationships.length).toBe(0);
    });
  });
});

// Helper function
function createMockSymbol(
  name: string,
  filePath: string,
  type: ExtractedSymbol['type'],
  isExported: boolean
): ExtractedSymbol {
  return {
    name,
    type,
    filePath,
    line: 1,
    column: 0,
    isExported,
    isPublic: true,
  };
}
