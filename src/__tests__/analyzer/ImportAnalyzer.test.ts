/**
 * ImportAnalyzer tests
 * @testScenario Parse named imports
 * @testScenario Parse default imports
 * @testScenario Parse namespace imports
 * @testScenario Parse type-only imports
 * @testScenario Resolve imported symbols to symbol IDs
 */

import { ImportAnalyzer } from '../../analyzer/ImportAnalyzer';

describe('ImportAnalyzer', () => {
  let analyzer: ImportAnalyzer;

  beforeEach(() => {
    analyzer = new ImportAnalyzer();
  });

  describe('analyzeImports', () => {
    it('should parse named imports', () => {
      const sourceCode = `
        import { DatabaseManager, ConfigManager } from '../storage/DatabaseManager';
      `;

      const result = analyzer.analyzeImports(sourceCode);

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0]).toEqual({
        localName: 'DatabaseManager',
        exportedName: 'DatabaseManager',
        modulePath: '../storage/DatabaseManager',
        isTypeOnly: false,
        isNamespaceImport: false,
      });
      expect(result.imports[1]).toEqual({
        localName: 'ConfigManager',
        exportedName: 'ConfigManager',
        modulePath: '../storage/DatabaseManager',
        isTypeOnly: false,
        isNamespaceImport: false,
      });
    });

    it('should parse renamed imports', () => {
      const sourceCode = `
        import { DatabaseManager as DB } from '../storage/DatabaseManager';
      `;

      const result = analyzer.analyzeImports(sourceCode);

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0]).toEqual({
        localName: 'DB',
        exportedName: 'DatabaseManager',
        modulePath: '../storage/DatabaseManager',
        isTypeOnly: false,
        isNamespaceImport: false,
      });
    });

    it('should parse default imports', () => {
      const sourceCode = `
        import DatabaseManager from '../storage/DatabaseManager';
      `;

      const result = analyzer.analyzeImports(sourceCode);

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0]).toEqual({
        localName: 'DatabaseManager',
        exportedName: 'default',
        modulePath: '../storage/DatabaseManager',
        isTypeOnly: false,
        isNamespaceImport: false,
      });
    });

    it('should parse namespace imports', () => {
      const sourceCode = `
        import * as storage from '../storage/DatabaseManager';
      `;

      const result = analyzer.analyzeImports(sourceCode);

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0]).toEqual({
        localName: 'storage',
        exportedName: '*',
        modulePath: '../storage/DatabaseManager',
        isTypeOnly: false,
        isNamespaceImport: true,
      });
    });

    it('should parse type-only imports', () => {
      const sourceCode = `
        import type { Symbol } from '../../types/graph';
        import { type Config, DatabaseManager } from '../storage/DatabaseManager';
      `;

      const result = analyzer.analyzeImports(sourceCode);

      expect(result.imports).toHaveLength(3);
      expect(result.imports[0].isTypeOnly).toBe(true);
      expect(result.imports[1].isTypeOnly).toBe(true);
      expect(result.imports[2].isTypeOnly).toBe(false);
    });

    it('should parse multiple import statements', () => {
      const sourceCode = `
        import { FileScanner } from '../../scanner/FileScanner';
        import { DatabaseManager } from '../storage/DatabaseManager';
        import { SymbolRegistryManager } from '../../storage/SymbolRegistryManager';
      `;

      const result = analyzer.analyzeImports(sourceCode);

      expect(result.imports).toHaveLength(3);
      expect(result.imports[0].localName).toBe('FileScanner');
      expect(result.imports[1].localName).toBe('DatabaseManager');
      expect(result.imports[2].localName).toBe('SymbolRegistryManager');
    });

    it('should create import map for quick lookup', () => {
      const sourceCode = `
        import { DatabaseManager } from '../storage/DatabaseManager';
        import { FileScanner } from '../../scanner/FileScanner';
      `;

      const result = analyzer.analyzeImports(sourceCode);

      expect(result.importMap.size).toBe(2);
      expect(result.importMap.get('DatabaseManager')).toEqual({
        localName: 'DatabaseManager',
        exportedName: 'DatabaseManager',
        modulePath: '../storage/DatabaseManager',
        isTypeOnly: false,
        isNamespaceImport: false,
      });
    });

    it('should handle mixed import styles', () => {
      const sourceCode = `
        import DefaultExport, { NamedExport, type TypeExport } from '../../module';
      `;

      const result = analyzer.analyzeImports(sourceCode);

      expect(result.imports).toHaveLength(3);
      expect(result.imports[0].exportedName).toBe('default');
      expect(result.imports[1].exportedName).toBe('NamedExport');
      expect(result.imports[2].isTypeOnly).toBe(true);
    });
  });

  describe('extractSymbolFromPath', () => {
    it('should extract symbol from relative path', () => {
      const symbol = analyzer.extractSymbolFromPath('../storage/DatabaseManager');
      expect(symbol).toBe('DatabaseManager');
    });

    it('should extract symbol from nested path', () => {
      const symbol = analyzer.extractSymbolFromPath('../../types/graph/Symbol');
      expect(symbol).toBe('Symbol');
    });

    it('should remove file extension', () => {
      const symbol = analyzer.extractSymbolFromPath('../storage/DatabaseManager.ts');
      expect(symbol).toBe('DatabaseManager');
    });

    it('should return null for node modules', () => {
      const symbol = analyzer.extractSymbolFromPath('typescript');
      expect(symbol).toBeNull();
    });

    it('should handle index files', () => {
      const symbol = analyzer.extractSymbolFromPath('../storage');
      expect(symbol).toBe('storage');
    });
  });

  describe('resolveImportedSymbols', () => {
    it('should resolve named imports to symbol IDs', () => {
      const sourceCode = `
        import { DatabaseManager, ConfigManager } from '../storage/DatabaseManager';
      `;

      const result = analyzer.analyzeImports(sourceCode);
      const symbolMap = analyzer.resolveImportedSymbols(result.imports);

      expect(symbolMap.size).toBe(2);
      expect(symbolMap.get('DatabaseManager')).toContain('database-manager');
      expect(symbolMap.get('ConfigManager')).toContain('config-manager');
    });

    it('should skip type-only imports', () => {
      const sourceCode = `
        import type { Symbol } from '../../types/graph';
        import { DatabaseManager } from '../storage/DatabaseManager';
      `;

      const result = analyzer.analyzeImports(sourceCode);
      const symbolMap = analyzer.resolveImportedSymbols(result.imports);

      expect(symbolMap.size).toBe(1);
      expect(symbolMap.has('Symbol')).toBe(false);
      expect(symbolMap.has('DatabaseManager')).toBe(true);
    });

    it('should include module path as potential symbol', () => {
      const sourceCode = `
        import { Manager as DBManager } from '../storage/DatabaseManager';
      `;

      const result = analyzer.analyzeImports(sourceCode);
      const symbolMap = analyzer.resolveImportedSymbols(result.imports);

      const potentialSymbols = symbolMap.get('DBManager');
      expect(potentialSymbols).toContain('manager'); // from exported name
      expect(potentialSymbols).toContain('database-manager'); // from module path
      expect(potentialSymbols).toContain('dbmanager'); // from local name (consecutive caps)
    });

    it('should convert PascalCase to kebab-case', () => {
      const sourceCode = `
        import { SymbolRegistryManager } from '../../storage/SymbolRegistryManager';
      `;

      const result = analyzer.analyzeImports(sourceCode);
      const symbolMap = analyzer.resolveImportedSymbols(result.imports);

      expect(symbolMap.get('SymbolRegistryManager')).toContain('symbol-registry-manager');
    });

    it('should handle multiple potential symbol IDs', () => {
      const sourceCode = `
        import { Manager as TestManager } from '../../test/TestHelper';
      `;

      const result = analyzer.analyzeImports(sourceCode);
      const symbolMap = analyzer.resolveImportedSymbols(result.imports);

      const potentialSymbols = symbolMap.get('TestManager');
      expect(potentialSymbols).toBeDefined();
      expect(potentialSymbols!.length).toBeGreaterThan(1);
    });
  });
});
