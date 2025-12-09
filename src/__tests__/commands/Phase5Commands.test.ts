/**
 * Comprehensive tests for Phase 5 Commands
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  DepsCommand,
  UsedByCommand,
  WhoUsesCommand,
  OrphansCommand,
  UndocumentedCommand,
  TreeCommand,
} from '../../commands/Phase5Commands';
import { SymbolRegistryManager } from '../../storage/SymbolRegistryManager';
import { DatabaseManager } from '../../storage/DatabaseManager';

describe('Phase 5 Commands', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase5-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ========== DepsCommand Tests ==========

  describe('DepsCommand', () => {
    let command: DepsCommand;

    beforeEach(() => {
      command = new DepsCommand();
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('deps');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('dependencies');
    });

    it('should return error without symbol ID', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('required');
    });

    it('should return error if registry not found', async () => {
      const result = await command.execute(['sym-123']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should return error for non-existent symbol', async () => {
      const mockManager = {
        findById: jest.fn().mockReturnValue(null),
        getDependencies: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new DepsCommand(mockManager);
      const result = await cmd.execute(['non-existent-id']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should display dependencies for valid symbol', async () => {
      const mockManager = {
        findById: jest.fn().mockReturnValue({
          sourceRef: { symbolName: 'TestClass' },
        }),
        getDependencies: jest.fn().mockReturnValue([
          {
            targetId: 'sym-dep-1',
            type: 'import',
            reason: 'Used in constructor',
          },
        ]),
      } as any;

      const cmd = new DepsCommand(mockManager);
      const result = await cmd.execute(['sym-123']);

      expect(result.exitCode).toBe(0);
      expect(mockManager.getDependencies).toHaveBeenCalledWith('sym-123');
    });

    it('should handle symbol with no dependencies', async () => {
      const mockManager = {
        findById: jest.fn().mockReturnValue({
          sourceRef: { symbolName: 'TestClass' },
        }),
        getDependencies: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new DepsCommand(mockManager);
      const result = await cmd.execute(['sym-123']);

      expect(result.exitCode).toBe(0);
    });

    it('should show dependency info with type and reason', async () => {
      const mockManager = {
        findById: jest.fn()
          .mockReturnValueOnce({
            sourceRef: { symbolName: 'TestClass' },
          })
          .mockReturnValue({
            sourceRef: { symbolName: 'Dependency', filePath: '/path/to/dep.ts' },
          }),
        getDependencies: jest.fn().mockReturnValue([
          {
            targetId: 'sym-dep-1',
            type: 'import',
            reason: 'Constructor parameter',
          },
          {
            targetId: 'sym-dep-2',
            type: 'method-call',
            reason: 'Called in method',
          },
        ]),
      } as any;

      const cmd = new DepsCommand(mockManager);
      const result = await cmd.execute(['sym-123']);

      expect(result.exitCode).toBe(0);
      const calls = mockManager.getDependencies.mock.calls;
      expect(calls.length).toBe(1);
    });

    it('should accept custom manager', async () => {
      const mockManager = {
        findById: jest.fn().mockReturnValue(null),
        getDependencies: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new DepsCommand(mockManager);
      await cmd.execute(['sym-123']);

      expect(mockManager.findById).toHaveBeenCalledWith('sym-123');
    });
  });

  // ========== UsedByCommand Tests ==========

  describe('UsedByCommand', () => {
    let command: UsedByCommand;

    beforeEach(() => {
      command = new UsedByCommand();
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('used-by');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('uses');
    });

    it('should return error without symbol ID', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('required');
    });

    it('should return error if registry not found', async () => {
      const result = await command.execute(['sym-123']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should return error for non-existent symbol', async () => {
      const mockManager = {
        findById: jest.fn().mockReturnValue(null),
        getUsedBy: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new UsedByCommand(mockManager);
      const result = await cmd.execute(['non-existent-id']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should display usages for valid symbol', async () => {
      const mockManager = {
        findById: jest.fn().mockReturnValue({
          sourceRef: { symbolName: 'TestClass' },
        }),
        getUsedBy: jest.fn().mockReturnValue([
          {
            fromId: 'sym-user-1',
            type: 'instantiation',
            reason: 'Created in factory',
          },
        ]),
      } as any;

      const cmd = new UsedByCommand(mockManager);
      const result = await cmd.execute(['sym-123']);

      expect(result.exitCode).toBe(0);
      expect(mockManager.getUsedBy).toHaveBeenCalledWith('sym-123');
    });

    it('should handle symbol not used by anything', async () => {
      const mockManager = {
        findById: jest.fn().mockReturnValue({
          sourceRef: { symbolName: 'TestClass' },
        }),
        getUsedBy: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new UsedByCommand(mockManager);
      const result = await cmd.execute(['sym-123']);

      expect(result.exitCode).toBe(0);
    });

    it('should show multiple usages', async () => {
      const mockManager = {
        findById: jest.fn()
          .mockReturnValueOnce({
            sourceRef: { symbolName: 'TestClass' },
          })
          .mockReturnValue({
            sourceRef: { symbolName: 'User', filePath: '/path/to/user.ts' },
          }),
        getUsedBy: jest.fn().mockReturnValue([
          { fromId: 'sym-user-1', type: 'instantiation', reason: 'Created' },
          { fromId: 'sym-user-2', type: 'parameter', reason: 'Parameter' },
        ]),
      } as any;

      const cmd = new UsedByCommand(mockManager);
      const result = await cmd.execute(['sym-123']);

      expect(result.exitCode).toBe(0);
    });
  });

  // ========== WhoUsesCommand Tests ==========

  describe('WhoUsesCommand', () => {
    let command: WhoUsesCommand;
    const originalCwd = process.cwd();

    beforeEach(() => {
      command = new WhoUsesCommand();
    });

    afterEach(() => {
      process.chdir(originalCwd);
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('who-uses');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('who uses');
    });

    it('should return error without symbol name', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('required');
    });

    it('should return error if database not found', async () => {
      // Change to temp directory where no database exists
      process.chdir(tempDir);
      const result = await command.execute(['TestSymbol']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should handle symbol not found in database', async () => {
      const mockDbManager = {
        db: {
          prepare: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue([]),
          }),
        },
        close: jest.fn(),
      } as any;

      const cmd = new WhoUsesCommand(mockDbManager);
      const result = await cmd.execute(['NonExistentSymbol']);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should display symbol info', async () => {
      const mockDbManager = {
        db: {
          prepare: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue([
              {
                id: 'sym-1',
                name: 'TestSymbol',
                type: 'class',
                file_path: '/path/to/test.ts',
                line: 10,
                column: 0,
                is_exported: 1,
                is_public: 1,
                summary: 'Test class',
              },
            ]),
          }),
        },
        getDependents: jest.fn().mockReturnValue([]),
        getSymbol: jest.fn().mockReturnValue({ filePath: '/path/to/test.ts' }),
        close: jest.fn(),
      } as any;

      const cmd = new WhoUsesCommand(mockDbManager);
      const result = await cmd.execute(['TestSymbol']);

      expect(result.exitCode).toBe(0);
    });

    it('should find multiple matching symbols', async () => {
      const mockDbManager = {
        db: {
          prepare: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue([
              {
                id: 'sym-1',
                name: 'Test',
                type: 'class',
                file_path: '/path/to/test1.ts',
                line: 10,
                is_exported: 1,
                is_public: 1,
              },
              {
                id: 'sym-2',
                name: 'Test.method',
                type: 'method',
                file_path: '/path/to/test1.ts',
                line: 20,
                is_exported: 1,
                is_public: 1,
              },
            ]),
          }),
        },
        getDependents: jest.fn().mockReturnValue([]),
        getSymbol: jest.fn().mockReturnValue({ filePath: '/path/to/test.ts' }),
        close: jest.fn(),
      } as any;

      const cmd = new WhoUsesCommand(mockDbManager);
      const result = await cmd.execute(['Test']);

      expect(result.exitCode).toBe(0);
    });

    it('should group dependents by file', async () => {
      const mockDbManager = {
        db: {
          prepare: jest.fn()
            .mockReturnValueOnce({
              all: jest.fn().mockReturnValue([
                {
                  id: 'sym-1',
                  name: 'TestSymbol',
                  type: 'class',
                  file_path: '/path/to/test.ts',
                  line: 10,
                  is_exported: 1,
                  is_public: 1,
                },
              ]),
            })
            .mockReturnValue({
              get: jest.fn().mockReturnValue({
                id: 'sym-user-1',
                name: 'User',
                type: 'class',
                file_path: '/path/to/user.ts',
              }),
            }),
        },
        getDependents: jest.fn().mockReturnValue(['sym-user-1']),
        getSymbol: jest.fn().mockReturnValue({ filePath: '/path/to/user.ts' }),
        close: jest.fn(),
      } as any;

      const cmd = new WhoUsesCommand(mockDbManager);
      const result = await cmd.execute(['TestSymbol']);

      expect(result.exitCode).toBe(0);
    });
  });

  // ========== OrphansCommand Tests ==========

  describe('OrphansCommand', () => {
    let command: OrphansCommand;
    const originalCwd = process.cwd();

    beforeEach(() => {
      command = new OrphansCommand();
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('orphans');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('orphan');
    });

    it('should return error if registry not found', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should report no orphans when registry is empty', async () => {
      const mockManager = {
        findOrphans: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new OrphansCommand(mockManager);
      const result = await cmd.execute(['--fast']);

      expect(result.exitCode).toBe(0);
    });

    it('should list orphaned symbols', async () => {
      const mockManager = {
        findOrphans: jest.fn().mockReturnValue(['sym-orphan-1', 'sym-orphan-2']),
        findById: jest.fn()
          .mockReturnValueOnce({
            sourceRef: { symbolName: 'OrphanClass1', filePath: '/path/to/orphan1.ts' },
          })
          .mockReturnValueOnce({
            sourceRef: { symbolName: 'OrphanClass2', filePath: '/path/to/orphan2.ts' },
          }),
      } as any;

      const cmd = new OrphansCommand(mockManager);
      const result = await cmd.execute(['--fast']);

      expect(result.exitCode).toBe(0);
      expect(mockManager.findOrphans).toHaveBeenCalled();
    });

    it('should handle multiple orphans', async () => {
      const mockManager = {
        findOrphans: jest.fn().mockReturnValue([
          'sym-orphan-1',
          'sym-orphan-2',
          'sym-orphan-3',
        ]),
        findById: jest.fn().mockReturnValue({
          sourceRef: { symbolName: 'Orphan', filePath: '/path/to/orphan.ts' },
        }),
      } as any;

      const cmd = new OrphansCommand(mockManager);
      const result = await cmd.execute(['--fast']);

      expect(result.exitCode).toBe(0);
    });

    it('should accept custom manager', async () => {
      const mockManager = {
        findOrphans: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new OrphansCommand(mockManager);
      await cmd.execute(['--fast']);

      expect(mockManager.findOrphans).toHaveBeenCalled();
    });
  });

  // ========== UndocumentedCommand Tests ==========

  describe('UndocumentedCommand', () => {
    let command: UndocumentedCommand;
    const originalCwd = process.cwd();

    beforeEach(() => {
      command = new UndocumentedCommand();
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('undocumented');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('undocumented');
    });

    it('should return error if database not found', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should report no undocumented symbols when all documented', async () => {
      const mockDbManager = {
        db: {
          prepare: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue([]),
          }),
        },
        close: jest.fn(),
      } as any;

      const cmd = new UndocumentedCommand(mockDbManager);
      const result = await cmd.execute([]);

      expect(result.exitCode).toBe(0);
    });

    it('should handle symbols with summary', async () => {
      const mockDbManager = {
        db: {
          prepare: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue([
              {
                id: 'sym-1',
                name: 'DocumentedClass',
                type: 'class',
                file_path: '/path/to/class.ts',
                line: 10,
                column: 0,
                is_exported: 1,
                is_public: 1,
                summary: 'A documented class',
              },
            ]),
          }),
        },
        close: jest.fn(),
      } as any;

      const cmd = new UndocumentedCommand(mockDbManager);
      const result = await cmd.execute([]);

      expect(result.exitCode).toBe(0);
    });

    it('should identify undocumented symbols', async () => {
      const mockDbManager = {
        db: {
          prepare: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue([
              {
                id: 'sym-1',
                name: 'UndocumentedClass',
                type: 'class',
                file_path: '/path/to/class.ts',
                line: 10,
                column: 0,
                is_exported: 1,
                is_public: 1,
                summary: null,
              },
            ]),
          }),
        },
        close: jest.fn(),
      } as any;

      const cmd = new UndocumentedCommand(mockDbManager);
      const result = await cmd.execute([]);

      expect(result.exitCode).toBe(0);
    });

    it('should accept custom database manager', async () => {
      const mockDbManager = {
        db: {
          prepare: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue([]),
          }),
        },
        close: jest.fn(),
      } as any;

      const cmd = new UndocumentedCommand(mockDbManager);
      await cmd.execute([]);

      expect(mockDbManager.db.prepare).toHaveBeenCalled();
    });
  });

  // ========== TreeCommand Tests ==========

  describe('TreeCommand', () => {
    let command: TreeCommand;
    const originalCwd = process.cwd();

    beforeEach(() => {
      command = new TreeCommand();
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('tree');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('hierarchy');
    });

    it('should return error if registry not found', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should report no symbols in empty registry', async () => {
      const mockManager = {
        buildHierarchy: jest.fn().mockReturnValue([]),
        getAll: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new TreeCommand(mockManager);
      const result = await cmd.execute([]);

      expect(result.exitCode).toBe(0);
    });

    it('should display symbol hierarchy', async () => {
      const mockManager = {
        buildHierarchy: jest.fn().mockReturnValue([
          {
            id: 'sym-class-1',
            sourceRef: {
              type: 'class',
              qualifiedName: 'MyClass',
            },
            children: [
              {
                id: 'sym-method-1',
                sourceRef: {
                  type: 'method',
                  qualifiedName: 'MyClass.constructor',
                },
              },
            ],
          },
        ]),
        getAll: jest.fn().mockReturnValue([
          { id: 'sym-class-1' },
          { id: 'sym-method-1' },
        ]),
      } as any;

      const cmd = new TreeCommand(mockManager);
      const result = await cmd.execute([]);

      expect(result.exitCode).toBe(0);
    });

    it('should handle nested hierarchies', async () => {
      const mockManager = {
        buildHierarchy: jest.fn().mockReturnValue([
          {
            id: 'sym-1',
            sourceRef: { type: 'class', qualifiedName: 'Class1' },
            children: [
              {
                id: 'sym-2',
                sourceRef: { type: 'method', qualifiedName: 'Class1.method' },
                children: [
                  {
                    id: 'sym-3',
                    sourceRef: { type: 'variable', qualifiedName: 'local' },
                  },
                ],
              },
            ],
          },
        ]),
        getAll: jest.fn().mockReturnValue([
          { id: 'sym-1' },
          { id: 'sym-2' },
          { id: 'sym-3' },
        ]),
      } as any;

      const cmd = new TreeCommand(mockManager);
      const result = await cmd.execute([]);

      expect(result.exitCode).toBe(0);
    });

    it('should show total symbol count', async () => {
      const mockManager = {
        buildHierarchy: jest.fn().mockReturnValue([
          {
            id: 'sym-1',
            sourceRef: { type: 'class', qualifiedName: 'TestClass' },
            children: [],
          },
        ]),
        getAll: jest.fn().mockReturnValue([
          { id: 'sym-1' },
          { id: 'sym-2' },
          { id: 'sym-3' },
        ]),
      } as any;

      const cmd = new TreeCommand(mockManager);
      const result = await cmd.execute([]);

      expect(result.exitCode).toBe(0);
      expect(mockManager.getAll).toHaveBeenCalled();
    });

    it('should accept custom manager', async () => {
      const mockManager = {
        buildHierarchy: jest.fn().mockReturnValue([]),
        getAll: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new TreeCommand(mockManager);
      await cmd.execute([]);

      expect(mockManager.buildHierarchy).toHaveBeenCalled();
    });
  });
});
