/**
 * SymbolRegistryManager tests
 * @testScenario Basic ID registration and retrieval
 * @testScenario Hierarchy tracking with parent-child relationships
 * @testScenario Automatic qualifiedName generation
 * @testScenario Depth calculation
 * @testScenario Search functionality
 */

import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('SymbolRegistryManager', () => {
  let tempDir: string;
  let registryPath: string;
  let manager: SymbolRegistryManager;

  beforeEach(() => {
    // Create temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-test-'));
    registryPath = path.join(tempDir, 'registry.jsonl');
    manager = new SymbolRegistryManager(registryPath);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Basic Registration', () => {
    test('should register a new symbol and generate ID', () => {
      const id = manager.register({
        filePath: 'src/utils.ts',
        symbolName: 'parseData',
        type: 'function',
        line: 10,
      });

      expect(id).toBe('000');

      const entry = manager.findById(id);
      expect(entry).toBeDefined();
      expect(entry?.sourceRef.symbolName).toBe('parseData');
      expect(entry?.sourceRef.type).toBe('function');
    });

    test('should generate sequential IDs', () => {
      const id1 = manager.register({
        filePath: 'src/utils.ts',
        symbolName: 'parseData',
        type: 'function',
      });

      const id2 = manager.register({
        filePath: 'src/utils.ts',
        symbolName: 'formatData',
        type: 'function',
      });

      expect(id1).toBe('000');
      expect(id2).toBe('001');
    });

    test('should list all symbols', () => {
      manager.register({
        filePath: 'src/utils.ts',
        symbolName: 'parseData',
        type: 'function',
      });

      manager.register({
        filePath: 'src/utils.ts',
        symbolName: 'formatData',
        type: 'function',
      });

      const all = manager.getAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('Hierarchy Support', () => {
    test('should register class with methods', () => {
      const classId = manager.register({
        filePath: 'src/DataService.ts',
        symbolName: 'DataService',
        type: 'class',
      });

      const methodId = manager.register({
        filePath: 'src/DataService.ts',
        symbolName: 'getData',
        type: 'method',
        memberOf: classId,
        memberType: 'instance',
      });

      expect(classId).toBe('000');
      expect(methodId).toBe('001');

      const method = manager.findById(methodId);
      expect(method?.sourceRef.memberOf).toBe(classId);
      expect(method?.sourceRef.memberType).toBe('instance');
    });

    test('should auto-generate qualifiedName for instance method', () => {
      const classId = manager.register({
        filePath: 'src/DataService.ts',
        symbolName: 'DataService',
        type: 'class',
      });

      const methodId = manager.register({
        filePath: 'src/DataService.ts',
        symbolName: 'getData',
        type: 'method',
        memberOf: classId,
        memberType: 'instance',
      });

      const method = manager.findById(methodId);
      expect(method?.sourceRef.qualifiedName).toBe('DataService#getData');
    });

    test('should auto-generate qualifiedName for static method', () => {
      const classId = manager.register({
        filePath: 'src/DataService.ts',
        symbolName: 'DataService',
        type: 'class',
      });

      const methodId = manager.register({
        filePath: 'src/DataService.ts',
        symbolName: 'create',
        type: 'method',
        memberOf: classId,
        memberType: 'static',
      });

      const method = manager.findById(methodId);
      expect(method?.sourceRef.qualifiedName).toBe('DataService.create');
    });

    test('should auto-generate qualifiedName for inner function', () => {
      const classId = manager.register({
        filePath: 'src/DataService.ts',
        symbolName: 'DataService',
        type: 'class',
      });

      const methodId = manager.register({
        filePath: 'src/DataService.ts',
        symbolName: 'getData',
        type: 'method',
        memberOf: classId,
        memberType: 'instance',
      });

      const innerId = manager.register({
        filePath: 'src/DataService.ts',
        symbolName: 'sanitize',
        type: 'function',
        memberOf: methodId,
        memberType: 'inner',
      });

      const inner = manager.findById(innerId);
      expect(inner?.sourceRef.qualifiedName).toBe('DataService#getData~sanitize');
    });

    test('should calculate depth correctly', () => {
      const classId = manager.register({
        filePath: 'src/DataService.ts',
        symbolName: 'DataService',
        type: 'class',
      });

      const methodId = manager.register({
        filePath: 'src/DataService.ts',
        symbolName: 'getData',
        type: 'method',
        memberOf: classId,
        memberType: 'instance',
      });

      const innerId = manager.register({
        filePath: 'src/DataService.ts',
        symbolName: 'sanitize',
        type: 'function',
        memberOf: methodId,
        memberType: 'inner',
      });

      const classEntry = manager.findById(classId);
      const methodEntry = manager.findById(methodId);
      const innerEntry = manager.findById(innerId);

      expect(classEntry?.sourceRef.depth).toBe(0);
      expect(methodEntry?.sourceRef.depth).toBe(1);
      expect(innerEntry?.sourceRef.depth).toBe(2);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      const classId = manager.register({
        filePath: 'src/UserService.ts',
        symbolName: 'UserService',
        type: 'class',
      });

      manager.register({
        filePath: 'src/UserService.ts',
        symbolName: 'createUser',
        type: 'method',
        memberOf: classId,
        memberType: 'instance',
      });

      manager.register({
        filePath: 'src/UserService.ts',
        symbolName: 'getUser',
        type: 'method',
        memberOf: classId,
        memberType: 'instance',
      });
    });

    test('should find by qualified name', () => {
      const entry = manager.findByQualifiedName('UserService#createUser');
      expect(entry).toBeDefined();
      expect(entry?.sourceRef.symbolName).toBe('createUser');
    });

    test('should return undefined for non-existent qualified name', () => {
      const entry = manager.findByQualifiedName('UserService#deleteUser');
      expect(entry).toBeUndefined();
    });

    test('should search by partial string', () => {
      const results = manager.search('User');
      expect(results.length).toBeGreaterThanOrEqual(3);
    });

    test('should search by method name', () => {
      const results = manager.search('createUser');
      expect(results).toHaveLength(1);
      expect(results[0].sourceRef.symbolName).toBe('createUser');
    });

    test('should get children of a parent', () => {
      const classEntry = manager.findByQualifiedName('UserService');
      expect(classEntry).toBeDefined();

      const children = manager.getChildren(classEntry!.id);
      expect(children).toHaveLength(2);
    });

    test('should get all descendants', () => {
      const classId = manager.register({
        filePath: 'src/DataService.ts',
        symbolName: 'DataService',
        type: 'class',
      });

      const methodId = manager.register({
        filePath: 'src/DataService.ts',
        symbolName: 'process',
        type: 'method',
        memberOf: classId,
        memberType: 'instance',
      });

      manager.register({
        filePath: 'src/DataService.ts',
        symbolName: 'helper',
        type: 'function',
        memberOf: methodId,
        memberType: 'inner',
      });

      const descendants = manager.getDescendants(classId);
      expect(descendants).toHaveLength(2); // method + inner function
    });
  });

  describe('Hierarchy Building', () => {
    test('should build hierarchy tree', () => {
      const classId = manager.register({
        filePath: 'src/UserService.ts',
        symbolName: 'UserService',
        type: 'class',
      });

      manager.register({
        filePath: 'src/UserService.ts',
        symbolName: 'createUser',
        type: 'method',
        memberOf: classId,
        memberType: 'instance',
      });

      manager.register({
        filePath: 'src/UserService.ts',
        symbolName: 'getUser',
        type: 'method',
        memberOf: classId,
        memberType: 'instance',
      });

      const hierarchy = manager.buildHierarchy();
      expect(hierarchy).toHaveLength(1); // One root
      expect(hierarchy[0].id).toBe(classId);
      expect(hierarchy[0].children).toHaveLength(2);
    });

    test('should handle multiple root symbols', () => {
      manager.register({
        filePath: 'src/UserService.ts',
        symbolName: 'UserService',
        type: 'class',
      });

      manager.register({
        filePath: 'src/DataService.ts',
        symbolName: 'DataService',
        type: 'class',
      });

      const hierarchy = manager.buildHierarchy();
      expect(hierarchy).toHaveLength(2);
    });
  });

  describe('Dependency Management', () => {
    test('should add dependency between symbols', () => {
      const id1 = manager.register({
        filePath: 'src/UserService.ts',
        symbolName: 'UserService',
        type: 'class',
      });

      const id2 = manager.register({
        filePath: 'src/Database.ts',
        symbolName: 'Database',
        type: 'class',
      });

      manager.addDependency(id1, id2, 'Database connection', 'runtime');

      const deps = manager.getDependencies(id1);
      expect(deps).toHaveLength(1);
      expect(deps[0].targetId).toBe(id2);
      expect(deps[0].type).toBe('runtime');
    });

    test('should get reverse dependencies', () => {
      const id1 = manager.register({
        filePath: 'src/UserService.ts',
        symbolName: 'UserService',
        type: 'class',
      });

      const id2 = manager.register({
        filePath: 'src/Database.ts',
        symbolName: 'Database',
        type: 'class',
      });

      manager.addDependency(id1, id2, 'Database connection', 'runtime');

      const usedBy = manager.getUsedBy(id2);
      expect(usedBy).toHaveLength(1);
      expect(usedBy[0].fromId).toBe(id1);
      expect(usedBy[0].reason).toBe('Database connection');
    });
  });

  describe('Persistence', () => {
    test('should save and load registry', () => {
      const id = manager.register({
        filePath: 'src/utils.ts',
        symbolName: 'parseData',
        type: 'function',
      });

      manager.save();

      // Create new manager instance
      const manager2 = new SymbolRegistryManager(registryPath);
      const entry = manager2.findById(id);

      expect(entry).toBeDefined();
      expect(entry?.sourceRef.symbolName).toBe('parseData');
    });

    test('should preserve hierarchy on save/load', () => {
      const classId = manager.register({
        filePath: 'src/UserService.ts',
        symbolName: 'UserService',
        type: 'class',
      });

      manager.register({
        filePath: 'src/UserService.ts',
        symbolName: 'createUser',
        type: 'method',
        memberOf: classId,
        memberType: 'instance',
      });

      manager.save();

      // Create new manager instance
      const manager2 = new SymbolRegistryManager(registryPath);
      const method = manager2.findByQualifiedName('UserService#createUser');

      expect(method).toBeDefined();
      expect(method?.sourceRef.memberOf).toBe(classId);
      expect(method?.sourceRef.qualifiedName).toBe('UserService#createUser');
      expect(method?.sourceRef.depth).toBe(1);
    });
  });

  describe('Statistics', () => {
    test('should get statistics', () => {
      manager.register({
        filePath: 'src/utils.ts',
        symbolName: 'parseData',
        type: 'function',
      });

      manager.register({
        filePath: 'src/helpers.ts',
        symbolName: 'formatData',
        type: 'function',
      });

      const stats = manager.getStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.fileCount).toBe(2);
    });
  });

  describe('Type-based Duplicate Detection', () => {
    test('should differentiate symbols by type', () => {
      const classId = manager.register({
        filePath: 'src/User.ts',
        symbolName: 'User',
        type: 'class',
      });

      const interfaceId = manager.register({
        filePath: 'src/User.ts',
        symbolName: 'User',
        type: 'interface',
      });

      expect(classId).not.toBe(interfaceId);

      const classEntry = manager.findBySourceRef({
        filePath: 'src/User.ts',
        symbolName: 'User',
        type: 'class',
      });

      const interfaceEntry = manager.findBySourceRef({
        filePath: 'src/User.ts',
        symbolName: 'User',
        type: 'interface',
      });

      expect(classEntry?.id).toBe(classId);
      expect(interfaceEntry?.id).toBe(interfaceId);
    });

    test('should find without type matching when specified', () => {
      manager.register({
        filePath: 'src/Data.ts',
        symbolName: 'Data',
        type: 'class',
      });

      const found = manager.findBySourceRef(
        {
          filePath: 'src/Data.ts',
          symbolName: 'Data',
          type: 'interface',
        },
        false // includeType = false
      );

      expect(found).toBeDefined();
    });
  });

  describe('QualifiedName Duplicate Detection', () => {
    test('should find duplicate qualified names', () => {
      const class1Id = manager.register({
        filePath: 'src/User.ts',
        symbolName: 'User',
        type: 'class',
      });

      manager.register({
        filePath: 'src/User.ts',
        symbolName: 'save',
        type: 'method',
        memberOf: class1Id,
        memberType: 'instance',
      });

      const class2Id = manager.register({
        filePath: 'src/Admin.ts',
        symbolName: 'User',
        type: 'class',
      });

      manager.register({
        filePath: 'src/Admin.ts',
        symbolName: 'save',
        type: 'method',
        memberOf: class2Id,
        memberType: 'instance',
      });

      const duplicates = manager.findDuplicateQualifiedNames();
      expect(duplicates.length).toBeGreaterThan(0);

      const userDup = duplicates.find((d) => d.qualifiedName === 'User');
      expect(userDup).toBeDefined();
      expect(userDup?.entries).toHaveLength(2);
    });

    test('should not report unique qualified names', () => {
      manager.register({
        filePath: 'src/User.ts',
        symbolName: 'User',
        type: 'class',
      });

      const duplicates = manager.findDuplicateQualifiedNames();
      expect(duplicates).toHaveLength(0);
    });
  });

  describe('Refactoring Detection', () => {
    test('should detect moved symbols', () => {
      manager.register({
        filePath: 'src/old/User.ts',
        symbolName: 'User',
        type: 'class',
      });

      manager.register({
        filePath: 'src/new/User.ts',
        symbolName: 'User',
        type: 'class',
      });

      const moved = manager.detectMoved('User', 'class');
      expect(moved).toHaveLength(2);
      expect(moved[0].sourceRef.filePath).not.toBe(moved[1].sourceRef.filePath);
    });

    test('should not detect moved when in same file', () => {
      manager.register({
        filePath: 'src/User.ts',
        symbolName: 'User',
        type: 'class',
      });

      const moved = manager.detectMoved('User', 'class');
      expect(moved).toHaveLength(0);
    });

    test('should detect potential renames in file', () => {
      manager.register({
        filePath: 'src/User.ts',
        symbolName: 'OldUser',
        type: 'class',
      });

      manager.register({
        filePath: 'src/User.ts',
        symbolName: 'NewUser',
        type: 'class',
      });

      const renames = manager.detectPotentialRenames('src/User.ts', 'class');
      expect(renames).toHaveLength(2);
    });

    test('should find symbols by name pattern', () => {
      manager.register({
        filePath: 'src/UserService.ts',
        symbolName: 'UserService',
        type: 'class',
      });

      manager.register({
        filePath: 'src/UserController.ts',
        symbolName: 'UserController',
        type: 'class',
      });

      const matches = manager.findByNamePattern(/^User/);
      expect(matches).toHaveLength(2);
    });
  });

  describe('Registry Integrity Validation', () => {
    test('should validate clean registry', () => {
      manager.register({
        filePath: 'src/User.ts',
        symbolName: 'User',
        type: 'class',
      });

      const validation = manager.validateIntegrity();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    test('should detect orphaned parent references', () => {
      const id = manager.register({
        filePath: 'src/User.ts',
        symbolName: 'save',
        type: 'method',
        memberOf: 'non-existent-id',
      });

      const validation = manager.validateIntegrity();
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some((w) => w.includes('non-existent parent'))).toBe(true);
    });

    test('should detect invalid dependency references', () => {
      const id1 = manager.register({
        filePath: 'src/User.ts',
        symbolName: 'User',
        type: 'class',
      });

      const id2 = manager.register({
        filePath: 'src/Database.ts',
        symbolName: 'Database',
        type: 'class',
      });

      // Add valid dependency first
      manager.addDependency(id1, id2, 'Uses database');

      // Manually corrupt the dependency by modifying the registry
      const entry = manager.findById(id1);
      if (entry && entry.uses) {
        entry.uses.push({ targetId: 'non-existent-id', reason: 'Invalid dependency' });
      }

      const validation = manager.validateIntegrity();
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(
        validation.warnings.some((w) => w.includes('dependency to non-existent symbol'))
      ).toBe(true);
    });

    test('should include duplicate qualified names in stats', () => {
      manager.register({
        filePath: 'src/User1.ts',
        symbolName: 'User',
        type: 'class',
      });

      manager.register({
        filePath: 'src/User2.ts',
        symbolName: 'User',
        type: 'class',
      });

      const stats = manager.getStats();
      expect(stats.duplicateQualifiedNames).toBe(1);
    });

    test('should detect circular dependencies (uses cycle)', () => {
      const id1 = manager.register({
        filePath: 'src/A.ts',
        symbolName: 'A',
        type: 'class',
      });

      const id2 = manager.register({
        filePath: 'src/B.ts',
        symbolName: 'B',
        type: 'class',
      });

      const id3 = manager.register({
        filePath: 'src/C.ts',
        symbolName: 'C',
        type: 'class',
      });

      // Create cycle: A → B → C → A
      manager.addDependency(id1, id2, 'A uses B');
      manager.addDependency(id2, id3, 'B uses C');
      manager.addDependency(id3, id1, 'C uses A');

      const validation = manager.validateIntegrity();
      expect(validation.isValid).toBe(true); // Cycles are warnings, not errors
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(
        validation.warnings.some((w) => w.includes('Circular dependency detected'))
      ).toBe(true);
    });

    test('should detect circular parent references as warning', () => {
      const id1 = manager.register({
        filePath: 'src/A.ts',
        symbolName: 'A',
        type: 'class',
      });

      const id2 = manager.register({
        filePath: 'src/B.ts',
        symbolName: 'B',
        type: 'class',
      });

      // Manually create circular parent reference (shouldn't happen normally)
      const entry1 = manager.findById(id1);
      const entry2 = manager.findById(id2);

      if (entry1 && entry2) {
        entry1.sourceRef.memberOf = id2;
        entry2.sourceRef.memberOf = id1;
      }

      const validation = manager.validateIntegrity();
      expect(validation.isValid).toBe(true); // No errors, only warnings
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(
        validation.warnings.some((w) => w.includes('Circular parent reference'))
      ).toBe(true);
    });

    test('should expose detectDependencyCycles method', () => {
      const id1 = manager.register({
        filePath: 'src/A.ts',
        symbolName: 'A',
        type: 'class',
      });

      const id2 = manager.register({
        filePath: 'src/B.ts',
        symbolName: 'B',
        type: 'class',
      });

      manager.addDependency(id1, id2, 'A uses B');
      manager.addDependency(id2, id1, 'B uses A');

      const cycles = manager.detectDependencyCycles();
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0]).toContain(id1);
      expect(cycles[0]).toContain(id2);
    });
  });
});
