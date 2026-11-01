/**
 * DesignContextCommand tests
 * @testScenario Display design context for a file
 * @testScenario Handle non-existent file
 * @testScenario Show contracts and decisions
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DesignContextCommand } from '../../commands/DesignContextCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';

// Mock ConfigManager
jest.mock('../../config/ConfigManager', () => ({
  ConfigManager: {
    getInstance: jest.fn(() => ({
      get: jest.fn(() => ({
        paths: {
          databasePath: '.tsdoc/db.sqlite',
          jsonlDir: '.tsdoc/jsonl',
          managedDir: 'managed',
        },
        documentManagement: { ignoreCodeBlocks: true },
      })),
      resolvePath: jest.fn((p: string) => p),
    })),
  },
}));

describe('DesignContextCommand', () => {
  let command: DesignContextCommand;
  let consoleSpy: jest.SpyInstance;
  let tempDir: string;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'design-context-test-'))
    );
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getName', () => {
    it('should return "design-context"', () => {
      command = new DesignContextCommand();
      expect(command.getName()).toBe('design-context');
    });
  });

  describe('getAlias', () => {
    it('should return "dc" as alias', () => {
      command = new DesignContextCommand();
      expect(command.getAlias()).toContain('dc');
    });
  });

  describe('getDescription', () => {
    it('should return description', () => {
      command = new DesignContextCommand();
      expect(command.getDescription()).toContain('design');
    });
  });

  describe('execute', () => {
    it('should show help when --help flag is passed', async () => {
      command = new DesignContextCommand();
      const result = await command.execute(['--help']);

      expect(result.exitCode).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should fail when no file path provided', async () => {
      command = new DesignContextCommand();
      const result = await command.execute([]);

      expect(result.exitCode).not.toBe(0);
    });

    it('should fail for non-existent file', async () => {
      command = new DesignContextCommand();
      const result = await command.execute(['/nonexistent/file.ts']);

      expect(result.exitCode).not.toBe(0);
    });

    it('supports --llm flag placed before file path', async () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(testFile, 'export class A {}');

      command = new DesignContextCommand();
      jest.spyOn(command as any, 'checkDatabaseExists').mockReturnValue(null);
      const dbPath = path.join(tempDir, 'symbols.db');
      jest.spyOn(command as any, 'getDatabasePath').mockReturnValue(dbPath);
      // initialize empty db
      const { DatabaseManager } = require('../../storage/DatabaseManager');
      const db = new DatabaseManager(dbPath);
      db.close();

      jest.spyOn(command as any, 'gatherContext').mockResolvedValue({
        filePath: 'test.ts',
        symbols: [],
        relatedDocs: [],
        dependencies: [],
        typeFlows: [],
        tests: [],
        usedBy: [],
        contracts: [],
        decisions: [],
        errorPatterns: [],
        relationships: [],
      });

      const result = await command.execute(['--llm', testFile]);
      expect(result.exitCode).toBe(0);
    });

    it('returns failure when --llm provided without file path', async () => {
      command = new DesignContextCommand();
      const result = await command.execute(['--llm']);
      expect(result.exitCode).not.toBe(0);
    });

    it('fails closed with exitCode 1 when an unknown flag is passed', async () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(testFile, 'export class A {}');

      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      try {
        command = new DesignContextCommand();
        const result = await command.execute([testFile, '--unknown-flag']);

        expect(result.exitCode).toBe(1);
        const loggedOut = consoleSpy.mock.calls.flat().join('\n');
        expect(loggedOut).not.toContain('Design Context:');
        expect(loggedOut).not.toContain('Work Context:');
      } finally {
        errorSpy.mockRestore();
      }
    });

    it('prints "Design Context:" header (not "Work Context:") and Design-First section order in human mode', async () => {
      const testFile = path.join(tempDir, 'OrderService.ts');
      fs.writeFileSync(testFile, 'export class OrderService {}');

      type TestableCommand = {
        checkDatabaseExists: () => null;
        getDatabasePath: () => string;
        gatherContext: () => Promise<Record<string, unknown>>;
      };

      command = new DesignContextCommand();
      const testable = command as unknown as TestableCommand;
      jest.spyOn(testable, 'checkDatabaseExists').mockReturnValue(null);
      const dbPath = path.join(tempDir, 'symbols.db');
      jest.spyOn(testable, 'getDatabasePath').mockReturnValue(dbPath);
      const db = new DatabaseManager(dbPath);
      db.close();

      jest.spyOn(testable, 'gatherContext').mockResolvedValue({
        filePath: 'src/services/OrderService.ts',
        symbols: [
          {
            id: 'order-service',
            name: 'OrderService',
            type: 'class',
            filePath: 'src/services/OrderService.ts',
            line: 1,
            column: 1,
            isExported: true,
            isPublic: true,
            tests: [],
            designDecisions: [],
          },
        ],
        relatedDocs: [
          {
            title: '[[OrderSpec]]',
            path: 'managed/specs/OrderSpec.md',
            symbolRef: 'OrderSpec',
            specStatus: 'active',
            specScore: 92,
          },
          {
            title: '[[BuildCommand]]',
            path: 'managed/commands/BuildCommand.md',
            symbolRef: 'BuildCommand',
            specStatus: 'active',
            specScore: 20,
          },
        ],
        dependencies: [{ name: 'OrderRepo', type: 'class', filePath: 'src/repos/OrderRepo.ts' }],
        typeFlows: [],
        tests: [{ path: 'src/__tests__/OrderService.test.ts', type: 'unit' }],
        usedBy: [{ name: 'OrderController', type: 'class', filePath: 'src/OrderController.ts' }],
        contracts: [
          {
            symbolId: 'order-service',
            symbolName: 'OrderService',
            description: 'Guarantees idempotent order submission',
            preconditions: ['items.length > 0'],
            postconditions: ['persists order record'],
            invariants: ['total >= 0'],
          },
        ],
        decisions: [
          {
            title: 'Use optimistic locking',
            decision: 'Version column check on update',
            rationale: 'Prevent lost updates without row locks',
            status: 'active',
            date: '2026-01-15',
            symbolName: 'OrderService',
          },
        ],
        errorPatterns: [
          {
            symbolName: 'OrderService',
            errorType: 'StaleOrderVersionError',
            message: 'Concurrent order modification',
            solution: 'Reload and retry',
          },
        ],
        relationships: [],
        canonicalGraph: {
          revisionId: 'rev-abc',
          nodeCount: 3,
          internalDependencies: 2,
          internalDependents: 1,
        },
      });

      const result = await command.execute([testFile]);
      const output = consoleSpy.mock.calls.flat().join('\n');

      expect(result.exitCode).toBe(0);
      expect(output).toContain('Design Context: OrderService.ts');
      expect(output).not.toContain('Work Context:');

      // Normative spec vs component checkpoint badges
      expect(output).toContain('[ACTIVE, Spec Score: 92%]');
      expect(output).toContain('[Checkpoint, ACTIVE]');
      expect(output).not.toContain('Score: 20%');

      // Design-First section order
      const docsIdx = output.indexOf('📚 관련 명세 및 체크포인트');
      const contractsIdx = output.indexOf('📜 계약 명세');
      const decisionsIdx = output.indexOf('🧭 설계 의사결정 / ADR');
      const errorsIdx = output.indexOf('⚠️ 오류 패턴 및 예외 계약');
      const graphIdx = output.indexOf('🕸️ 정본 구조 요약');
      const testsIdx = output.indexOf('🧪 검증 테스트');

      expect(docsIdx).toBeGreaterThan(-1);
      expect(contractsIdx).toBeGreaterThan(docsIdx);
      expect(decisionsIdx).toBeGreaterThan(contractsIdx);
      expect(errorsIdx).toBeGreaterThan(decisionsIdx);
      expect(graphIdx).toBeGreaterThan(errorsIdx);
      expect(testsIdx).toBeGreaterThan(graphIdx);
    });

    it('outputs clean parseable JSON without banner noise when --json is passed', async () => {
      const testFile = path.join(tempDir, 'JsonTarget.ts');
      fs.writeFileSync(testFile, 'export class JsonTarget {}');

      type TestableCommand = {
        checkDatabaseExists: () => null;
        getDatabasePath: () => string;
        gatherContext: () => Promise<Record<string, unknown>>;
      };

      command = new DesignContextCommand();
      const testable = command as unknown as TestableCommand;
      jest.spyOn(testable, 'checkDatabaseExists').mockReturnValue(null);
      const dbPath = path.join(tempDir, 'symbols.db');
      jest.spyOn(testable, 'getDatabasePath').mockReturnValue(dbPath);
      const db = new DatabaseManager(dbPath);
      db.close();

      const mockContext = {
        filePath: 'src/JsonTarget.ts',
        symbols: [],
        relatedDocs: [],
        dependencies: [],
        typeFlows: [],
        tests: [],
        usedBy: [],
        contracts: [
          {
            symbolId: 'json-target',
            symbolName: 'JsonTarget',
            description: 'Must serialize cleanly',
            preconditions: [],
            postconditions: [],
            invariants: [],
          },
        ],
        decisions: [],
        errorPatterns: [],
        relationships: [],
      };
      jest.spyOn(testable, 'gatherContext').mockResolvedValue(mockContext);

      const result = await command.execute([testFile, '--json']);
      const rawOutput = consoleSpy.mock.calls.flat().join('\n');

      expect(result.exitCode).toBe(0);
      expect(result.message).toBe('Context generated in JSON format');
      expect(rawOutput).not.toContain('Design Context:');
      expect(rawOutput).not.toContain('Work Context:');
      expect(rawOutput).not.toContain('📄');
      const parsed = JSON.parse(rawOutput) as Record<string, unknown>;
      expect(parsed).toEqual(mockContext);
    });

    it('outputs clean markdown without banner noise when --llm is passed', async () => {
      const testFile = path.join(tempDir, 'LlmTarget.ts');
      fs.writeFileSync(testFile, 'export class LlmTarget {}');

      type TestableCommand = {
        checkDatabaseExists: () => null;
        getDatabasePath: () => string;
        gatherContext: () => Promise<Record<string, unknown>>;
      };

      command = new DesignContextCommand();
      const testable = command as unknown as TestableCommand;
      jest.spyOn(testable, 'checkDatabaseExists').mockReturnValue(null);
      const dbPath = path.join(tempDir, 'symbols.db');
      jest.spyOn(testable, 'getDatabasePath').mockReturnValue(dbPath);
      const db = new DatabaseManager(dbPath);
      db.close();

      jest.spyOn(testable, 'gatherContext').mockResolvedValue({
        filePath: 'src/LlmTarget.ts',
        symbols: [],
        relatedDocs: [
          {
            title: '[[LlmSpec]]',
            path: 'managed/specs/LlmSpec.md',
            symbolRef: 'LlmSpec',
            specStatus: 'active',
            specScore: 88,
          },
          {
            title: '[[BuildCommand]]',
            path: 'managed/commands/BuildCommand.md',
            symbolRef: 'BuildCommand',
            specStatus: 'active',
            specScore: 20,
          },
        ],
        dependencies: [],
        typeFlows: [],
        tests: [],
        usedBy: [],
        contracts: [],
        decisions: [],
        errorPatterns: [],
        relationships: [],
      });

      const result = await command.execute([testFile, '--llm']);
      const rawOutput = consoleSpy.mock.calls.flat().join('\n');

      expect(result.exitCode).toBe(0);
      expect(result.message).toBe('Context generated in LLM format');
      expect(rawOutput.startsWith('# Design Context: src/LlmTarget.ts')).toBe(true);
      expect(rawOutput).not.toContain('Work Context:');
      expect(rawOutput).not.toContain('📄');
      expect(rawOutput).toContain('[ACTIVE, Spec Score: 88%]');
      expect(rawOutput).toContain('[Checkpoint, ACTIVE]');
      expect(rawOutput).not.toContain('Score: 20%');
    });
  });
});
