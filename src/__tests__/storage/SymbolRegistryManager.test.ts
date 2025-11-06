/**
 * Tests for SymbolRegistryManager
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SymbolRegistryManager } from '../../storage/SymbolRegistryManager';

describe('SymbolRegistryManager', () => {
  let tempDir: string;
  let registryPath: string;

  beforeEach(() => {
    tempDir = path.join(process.cwd(), '.test-temp', `registry-${Date.now()}`);
    registryPath = path.join(tempDir, 'registry.jsonl');
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create new registry if file does not exist', () => {
      const manager = new SymbolRegistryManager(registryPath);
      expect(manager).toBeDefined();
      expect(fs.existsSync(registryPath)).toBe(false); // Not saved yet
    });

    it('should load existing registry if file exists', () => {
      // Create registry file
      const metadata = {
        version: '1.0.0',
        idGeneratorMode: 'sequential',
        nextSequentialId: 5,
        totalEntries: 1,
        lastUpdated: new Date().toISOString(),
      };
      const entry = {
        id: '003',
        sourceRef: {
          filePath: 'src/test.ts',
          symbolName: 'TestClass',
          type: 'class',
        },
        qualifiedName: 'TestClass',
        depth: 0,
        registeredAt: new Date().toISOString(),
      };

      fs.writeFileSync(registryPath, JSON.stringify(metadata) + '\n' + JSON.stringify(entry) + '\n', 'utf-8');

      const manager = new SymbolRegistryManager(registryPath);
      const retrieved = manager.findById('003');
      expect(retrieved).toBeDefined();
      expect(retrieved?.sourceRef.symbolName).toBe('TestClass');
    });
  });

  describe('register', () => {
    it('should register a new symbol and generate ID', () => {
      const manager = new SymbolRegistryManager(registryPath);

      const id = manager.register({
        filePath: 'src/example.ts',
        symbolName: 'ExampleClass',
        type: 'class',
      });

      expect(id).toBeDefined();
      expect(id).toMatch(/^\d{3}$/); // Format: 000, 001, etc.
    });

    it('should return existing ID if symbol already registered', () => {
      const manager = new SymbolRegistryManager(registryPath);

      const id1 = manager.register({
        filePath: 'src/example.ts',
        symbolName: 'ExampleClass',
        type: 'class',
      });

      const id2 = manager.register({
        filePath: 'src/example.ts',
        symbolName: 'ExampleClass',
        type: 'class',
      });

      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different symbols', () => {
      const manager = new SymbolRegistryManager(registryPath);

      const id1 = manager.register({
        filePath: 'src/class1.ts',
        symbolName: 'Class1',
        type: 'class',
      });

      const id2 = manager.register({
        filePath: 'src/class2.ts',
        symbolName: 'Class2',
        type: 'class',
      });

      expect(id1).not.toBe(id2);
    });

    it('should handle parent-child relationships', () => {
      const manager = new SymbolRegistryManager(registryPath);

      const parentId = manager.register({
        filePath: 'src/parent.ts',
        symbolName: 'ParentClass',
        type: 'class',
      });

      const childId = manager.register({
        filePath: 'src/parent.ts',
        symbolName: 'method',
        type: 'method',
        memberOf: parentId,
        memberType: 'instance',
      });

      const child = manager.findById(childId);
      expect(child?.sourceRef.memberOf).toBe(parentId);
      expect(child?.sourceRef.qualifiedName).toBe('ParentClass#method');
      expect(child?.sourceRef.depth).toBe(1);
    });
  });

  describe('findById', () => {
    it('should find symbol by ID', () => {
      const manager = new SymbolRegistryManager(registryPath);

      const id = manager.register({
        filePath: 'src/test.ts',
        symbolName: 'TestSymbol',
        type: 'function',
      });

      const found = manager.findById(id);
      expect(found).toBeDefined();
      expect(found?.sourceRef.symbolName).toBe('TestSymbol');
    });

    it('should return undefined for non-existent ID', () => {
      const manager = new SymbolRegistryManager(registryPath);
      const found = manager.findById('999');
      expect(found).toBeUndefined();
    });
  });

  describe('findBySource', () => {
    it('should find symbol by source reference', () => {
      const manager = new SymbolRegistryManager(registryPath);

      manager.register({
        filePath: 'src/test.ts',
        symbolName: 'TestSymbol',
        type: 'function',
      });

      const found = manager.findBySource({
        filePath: 'src/test.ts',
        symbolName: 'TestSymbol',
        type: 'function',
      });

      expect(found).toBeDefined();
      expect(found?.sourceRef.symbolName).toBe('TestSymbol');
    });

    it('should return undefined for non-existent source', () => {
      const manager = new SymbolRegistryManager(registryPath);

      const found = manager.findBySource({
        filePath: 'src/nonexistent.ts',
        symbolName: 'Nothing',
        type: 'function',
      });

      expect(found).toBeUndefined();
    });
  });

  describe('findByName', () => {
    it('should find symbols by name', () => {
      const manager = new SymbolRegistryManager(registryPath);

      manager.register({
        filePath: 'src/test1.ts',
        symbolName: 'TestSymbol',
        type: 'function',
      });

      manager.register({
        filePath: 'src/test2.ts',
        symbolName: 'TestSymbol',
        type: 'class',
      });

      const found = manager.findByName('TestSymbol');
      expect(found.length).toBe(2);
    });

    it('should return empty array if no matches', () => {
      const manager = new SymbolRegistryManager(registryPath);
      const found = manager.findByName('NonExistent');
      expect(found.length).toBe(0);
    });
  });

  describe('findByFile', () => {
    it('should find all symbols in a file', () => {
      const manager = new SymbolRegistryManager(registryPath);

      manager.register({
        filePath: 'src/multi.ts',
        symbolName: 'Symbol1',
        type: 'class',
      });

      manager.register({
        filePath: 'src/multi.ts',
        symbolName: 'Symbol2',
        type: 'function',
      });

      manager.register({
        filePath: 'src/other.ts',
        symbolName: 'Symbol3',
        type: 'interface',
      });

      const found = manager.findByFile('src/multi.ts');
      expect(found.length).toBe(2);
    });
  });

  describe('save and load', () => {
    it('should persist registry to disk', () => {
      const manager = new SymbolRegistryManager(registryPath);

      manager.register({
        filePath: 'src/persist.ts',
        symbolName: 'PersistTest',
        type: 'class',
      });

      manager.save();

      expect(fs.existsSync(registryPath)).toBe(true);

      // Load in new manager
      const manager2 = new SymbolRegistryManager(registryPath);
      const found = manager2.findByName('PersistTest');
      expect(found.length).toBe(1);
      expect(found[0].sourceRef.symbolName).toBe('PersistTest');
    });

    it('should create directory if it does not exist', () => {
      const deepPath = path.join(tempDir, 'deep', 'nested', 'registry.jsonl');
      const manager = new SymbolRegistryManager(deepPath);

      manager.register({
        filePath: 'src/test.ts',
        symbolName: 'Test',
        type: 'function',
      });

      manager.save();

      expect(fs.existsSync(deepPath)).toBe(true);
    });
  });

  describe('getAllEntries', () => {
    it('should return all registry entries', () => {
      const manager = new SymbolRegistryManager(registryPath);

      manager.register({
        filePath: 'src/test1.ts',
        symbolName: 'Symbol1',
        type: 'class',
      });

      manager.register({
        filePath: 'src/test2.ts',
        symbolName: 'Symbol2',
        type: 'function',
      });

      const entries = manager.getAllEntries();
      expect(entries.length).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return registry statistics', () => {
      const manager = new SymbolRegistryManager(registryPath);

      manager.register({
        filePath: 'src/test1.ts',
        symbolName: 'Symbol1',
        type: 'class',
      });

      manager.register({
        filePath: 'src/test2.ts',
        symbolName: 'Symbol2',
        type: 'function',
      });

      const stats = manager.getStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.version).toBe('1.0.0');
    });
  });

  describe('addDependency', () => {
    it('should add dependency to symbol', () => {
      const manager = new SymbolRegistryManager(registryPath);

      const id = manager.register({
        filePath: 'src/test.ts',
        symbolName: 'TestClass',
        type: 'class',
      });

      manager.addDependency(id, {
        target: 'OtherClass',
        type: 'imports',
        reason: 'Uses functionality',
      });

      const entry = manager.findById(id);
      expect(entry?.dependencies).toBeDefined();
      expect(entry?.dependencies?.length).toBe(1);
      expect(entry?.dependencies?.[0].target).toBe('OtherClass');
    });

    it('should return false for non-existent symbol', () => {
      const manager = new SymbolRegistryManager(registryPath);

      const result = manager.addDependency('999', {
        target: 'SomeClass',
        type: 'imports',
        reason: 'Test',
      });

      expect(result).toBe(false);
    });
  });

  describe('getChildren', () => {
    it('should return child symbols', () => {
      const manager = new SymbolRegistryManager(registryPath);

      const parentId = manager.register({
        filePath: 'src/parent.ts',
        symbolName: 'ParentClass',
        type: 'class',
      });

      manager.register({
        filePath: 'src/parent.ts',
        symbolName: 'method1',
        type: 'method',
        memberOf: parentId,
        memberType: 'instance',
      });

      manager.register({
        filePath: 'src/parent.ts',
        symbolName: 'method2',
        type: 'method',
        memberOf: parentId,
        memberType: 'instance',
      });

      const children = manager.getChildren(parentId);
      expect(children.length).toBe(2);
    });
  });

  describe('qualifiedName generation', () => {
    it('should generate qualified name for top-level symbol', () => {
      const manager = new SymbolRegistryManager(registryPath);

      const id = manager.register({
        filePath: 'src/test.ts',
        symbolName: 'TopLevel',
        type: 'class',
      });

      const entry = manager.findById(id);
      expect(entry?.sourceRef.qualifiedName).toBe('TopLevel');
      expect(entry?.sourceRef.depth).toBe(0);
    });

    it('should generate qualified name for method', () => {
      const manager = new SymbolRegistryManager(registryPath);

      const classId = manager.register({
        filePath: 'src/test.ts',
        symbolName: 'TestClass',
        type: 'class',
      });

      const methodId = manager.register({
        filePath: 'src/test.ts',
        symbolName: 'testMethod',
        type: 'method',
        memberOf: classId,
        memberType: 'instance',
      });

      const entry = manager.findById(methodId);
      expect(entry?.sourceRef.qualifiedName).toBe('TestClass#testMethod');
      expect(entry?.sourceRef.depth).toBe(1);
    });

    it('should generate qualified name for property', () => {
      const manager = new SymbolRegistryManager(registryPath);

      const classId = manager.register({
        filePath: 'src/test.ts',
        symbolName: 'TestClass',
        type: 'class',
      });

      const propId = manager.register({
        filePath: 'src/test.ts',
        symbolName: 'testProp',
        type: 'property',
        memberOf: classId,
        memberType: 'static',
      });

      const entry = manager.findById(propId);
      expect(entry?.sourceRef.qualifiedName).toBe('TestClass.testProp');
      expect(entry?.sourceRef.depth).toBe(1);
    });
  });
});
