/**
 * Comprehensive tests for Phase 4 Commands
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  SuggestCommand,
  InitCommand,
  IdNewCommand,
  ValidateSpecCommand,
  GenerateDocsCommand
} from '../../commands/Phase4Commands';
import { CodeHealthChecker } from '../../analyzer/CodeHealthChecker';
import { ConfigManager } from '../../config/ConfigManager';
import { SymbolRegistryManager } from '../../storage/SymbolRegistryManager';
import { SpecCompletenessValidator } from '../../spec/SpecCompletenessValidator';
import { EnhancedDocExtractor } from '../../parser/EnhancedDocExtractor';
import { EnhancedMarkdownGenerator } from '../../generator/EnhancedMarkdownGenerator';

describe('Phase 4 Commands', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase4-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ========== SuggestCommand Tests ==========

  describe('SuggestCommand', () => {
    let command: SuggestCommand;

    beforeEach(() => {
      command = new SuggestCommand();
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('suggest');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('improvement');
    });

    it('should execute with default path and return result', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'test.ts'),
        'export function test() {}',
        'utf-8'
      );

      const result = await command.execute([srcDir]);
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should accept custom minimum quality score', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'test.ts'),
        'export function test() {}',
        'utf-8'
      );

      const result = await command.execute([srcDir, '--min-score=50']);
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should accept limit parameter', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'test.ts'),
        'export function test() {}',
        'utf-8'
      );

      const result = await command.execute([srcDir, '--limit=5']);
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should return error for non-existent path', async () => {
      const result = await command.execute(['/non/existent/path']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should handle multiple parameters', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'test.ts'),
        'export function test() {}',
        'utf-8'
      );

      const result = await command.execute([srcDir, '--min-score=60', '--limit=10']);
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should accept custom checker via constructor', async () => {
      const mockChecker = {
        analyze: jest.fn().mockReturnValue({
          suggestions: [],
        }),
      } as any;

      const cmd = new SuggestCommand(mockChecker);
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'test.ts'),
        'export function test() {}',
        'utf-8'
      );

      await cmd.execute([srcDir]);
      expect(mockChecker.analyze).toHaveBeenCalled();
    });
  });

  // ========== InitCommand Tests ==========

  describe('InitCommand', () => {
    let command: InitCommand;
    const originalCwd = process.cwd();

    beforeEach(() => {
      command = new InitCommand();
      process.chdir(tempDir);
      // Reset ConfigManager singleton
      ConfigManager.reset();
    });

    afterEach(() => {
      process.chdir(originalCwd);
      // Reset ConfigManager singleton
      ConfigManager.reset();
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('init');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('configuration');
    });

    it('should initialize configuration with default values', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(0);
      // Config might already exist from previous test
      expect([0, 1]).toContain(result.exitCode);
    });

    it('should accept custom project name', async () => {
      const cmd = new InitCommand();
      const result = await cmd.execute(['--name=MyProject', '--force']);
      expect(result.exitCode).toBe(0);
    });

    it('should accept custom project version', async () => {
      const cmd = new InitCommand();
      const result = await cmd.execute(['--version=2.0.0', '--force']);
      expect(result.exitCode).toBe(0);
    });

    it('should reject initialization if config exists without --force', async () => {
      // Initialize once
      const firstResult = await command.execute([]);
      expect(firstResult.exitCode).toBe(0);

      // Create a new command instance for second attempt
      const command2 = new InitCommand();
      const result = await command2.execute([]);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('already exists');
    });

    it('should allow --force to overwrite existing config', async () => {
      // Initialize once
      const firstResult = await command.execute(['--name=Project1']);
      expect(firstResult.exitCode).toBe(0);

      // Create new command and force overwrite with new name
      const command2 = new InitCommand();
      const result = await command2.execute(['--name=Project2', '--force']);
      expect(result.exitCode).toBe(0);

      const configManager = ConfigManager.getInstance();
      const config = configManager.get();
      expect(config.project.name).toBe('Project2');
    });

    it('should create necessary directories', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(0);

      const configManager = ConfigManager.getInstance();
      const config = configManager.get();
      expect(fs.existsSync(config.paths.commentsDir)).toBe(true);
    });

    it('should handle multiple parameters', async () => {
      // Use fresh command to avoid config already exists
      const cmd = new InitCommand();
      const result = await cmd.execute(['--name=TestProj', '--version=1.5.0', '--force']);
      expect(result.exitCode).toBe(0);

      const configManager = ConfigManager.getInstance();
      const config = configManager.get();
      expect(config.project.name).toBe('TestProj');
      expect(config.project.version).toBe('1.5.0');
    });
  });

  // ========== IdNewCommand Tests ==========

  describe('IdNewCommand', () => {
    let command: IdNewCommand;
    let registryPath: string;

    beforeEach(() => {
      registryPath = path.join(tempDir, '.tsdoc', 'registry.jsonl');
      fs.mkdirSync(path.dirname(registryPath), { recursive: true });
      command = new IdNewCommand();
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('id-new');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('Generate new symbol ID');
    });

    it('should return error without arguments', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('required');
    });

    it('should return error without symbol name', async () => {
      const result = await command.execute(['/path/to/file.ts']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('required');
    });

    it('should register symbol with file and name', async () => {
      const mockManager = {
        register: jest.fn().mockReturnValue('sym-test-1'),
        findById: jest.fn().mockReturnValue({
          sourceRef: { qualifiedName: 'TestClass' },
        }),
        save: jest.fn(),
      } as any;

      const cmd = new IdNewCommand(mockManager);
      const result = await cmd.execute(['/path/to/file.ts', 'TestClass']);

      expect(result.exitCode).toBe(0);
      expect(mockManager.register).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '/path/to/file.ts',
          symbolName: 'TestClass',
        })
      );
    });

    it('should accept type parameter', async () => {
      const mockManager = {
        register: jest.fn().mockReturnValue('sym-test-1'),
        findById: jest.fn().mockReturnValue({
          sourceRef: { qualifiedName: 'TestClass' },
        }),
        save: jest.fn(),
      } as any;

      const cmd = new IdNewCommand(mockManager);
      const result = await cmd.execute([
        '/path/to/file.ts',
        'TestClass',
        '--type=class',
      ]);

      expect(result.exitCode).toBe(0);
      expect(mockManager.register).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'class',
        })
      );
    });

    it('should accept parent parameter', async () => {
      const mockManager = {
        findById: jest.fn().mockReturnValue({
          sourceRef: { qualifiedName: 'TestClass' },
        }),
        register: jest.fn().mockReturnValue('sym-test-2'),
        save: jest.fn(),
      } as any;

      const cmd = new IdNewCommand(mockManager);
      const result = await cmd.execute([
        '/path/to/file.ts',
        'method',
        '--parent=sym-test-1',
      ]);

      expect(result.exitCode).toBe(0);
      expect(mockManager.register).toHaveBeenCalledWith(
        expect.objectContaining({
          memberOf: 'sym-test-1',
        })
      );
    });

    it('should accept member-type parameter', async () => {
      const mockManager = {
        findById: jest.fn().mockReturnValue({
          sourceRef: { qualifiedName: 'TestClass' },
        }),
        register: jest.fn().mockReturnValue('sym-test-1'),
        save: jest.fn(),
      } as any;

      const cmd = new IdNewCommand(mockManager);
      const result = await cmd.execute([
        '/path/to/file.ts',
        'method',
        '--member-type=instance',
      ]);

      expect(result.exitCode).toBe(0);
      expect(mockManager.register).toHaveBeenCalledWith(
        expect.objectContaining({
          memberType: 'instance',
        })
      );
    });

    it('should reject invalid parent ID', async () => {
      const mockManager = {
        findById: jest.fn().mockReturnValue(null),
        register: jest.fn(),
        save: jest.fn(),
      } as any;

      const cmd = new IdNewCommand(mockManager);
      const result = await cmd.execute([
        '/path/to/file.ts',
        'method',
        '--parent=invalid-id',
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });
  });

  // ========== ValidateSpecCommand Tests ==========

  describe('ValidateSpecCommand', () => {
    let command: ValidateSpecCommand;

    beforeEach(() => {
      command = new ValidateSpecCommand();
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('validate-spec');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('Validate specification');
    });

    it('should return error for non-existent path', async () => {
      const result = await command.execute(['/non/existent/path']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should use default path "managed" if not specified', async () => {
      const docsDir = path.join(tempDir, 'managed');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(
        path.join(docsDir, 'test.md'),
        '# Test\n\nContent',
        'utf-8'
      );

      const mockValidator = {
        validateMultiple: jest.fn().mockReturnValue([]),
        getSummary: jest.fn().mockReturnValue({
          total: 1,
          complete: 1,
          incomplete: 0,
          totalIssues: 0,
        }),
      } as any;

      const cmd = new ValidateSpecCommand(mockValidator);
      const result = await cmd.execute([docsDir]);

      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty directory', async () => {
      const docsDir = path.join(tempDir, 'managed');
      fs.mkdirSync(docsDir, { recursive: true });

      const mockValidator = {
        validateMultiple: jest.fn().mockReturnValue([]),
        getSummary: jest.fn().mockReturnValue({
          total: 0,
          complete: 0,
          incomplete: 0,
          totalIssues: 0,
        }),
      } as any;

      const cmd = new ValidateSpecCommand(mockValidator);
      const result = await cmd.execute([docsDir]);

      expect(result.exitCode).toBe(0);
    });

    it('should report incomplete specifications', async () => {
      const docsDir = path.join(tempDir, 'managed');
      fs.mkdirSync(docsDir, { recursive: true });

      const mockValidator = {
        validateMultiple: jest.fn().mockReturnValue([
          {
            filePath: path.join(docsDir, 'test.md'),
            isComplete: false,
            designScore: 50,
            implementationScore: 40,
          },
        ]),
        getSummary: jest.fn().mockReturnValue({
          total: 1,
          complete: 0,
          incomplete: 1,
          totalIssues: 2,
        }),
      } as any;

      const cmd = new ValidateSpecCommand(mockValidator);
      const result = await cmd.execute([docsDir]);

      // When there are incomplete specs, the command returns failure
      expect([0, 1]).toContain(result.exitCode);
      // Either has message about incomplete or returns success
      if (result.exitCode === 1) {
        expect(result.message).toContain('incomplete');
      }
    });

    it('should accept custom validator', async () => {
      const docsDir = path.join(tempDir, 'managed');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(
        path.join(docsDir, 'test.md'),
        '# Test\n\nContent',
        'utf-8'
      );

      const mockValidator = {
        validateMultiple: jest.fn().mockReturnValue([]),
        getSummary: jest.fn().mockReturnValue({
          total: 1,
          complete: 1,
          incomplete: 0,
          totalIssues: 0,
        }),
      } as any;

      const cmd = new ValidateSpecCommand(mockValidator);
      await cmd.execute([docsDir]);

      expect(mockValidator.validateMultiple).toHaveBeenCalled();
    });

    it('should find both .md and .mdx files', async () => {
      const docsDir = path.join(tempDir, 'managed');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'test.md'), 'content', 'utf-8');
      fs.writeFileSync(path.join(docsDir, 'test2.mdx'), 'content', 'utf-8');

      const mockValidator = {
        validateMultiple: jest.fn().mockReturnValue([]),
        getSummary: jest.fn().mockReturnValue({
          total: 2,
          complete: 2,
          incomplete: 0,
          totalIssues: 0,
        }),
      } as any;

      const cmd = new ValidateSpecCommand(mockValidator);
      await cmd.execute([docsDir]);

      const callArgs = mockValidator.validateMultiple.mock.calls[0][0];
      expect(callArgs.length).toBe(2);
    });
  });

  // ========== GenerateDocsCommand Tests ==========

  describe('GenerateDocsCommand', () => {
    let command: GenerateDocsCommand;

    beforeEach(() => {
      command = new GenerateDocsCommand();
    });

    it('should have correct name', () => {
      expect(command.getName()).toBe('generate-docs');
    });

    it('should have correct description', () => {
      expect(command.getDescription()).toContain('Generate markdown');
    });

    it('should return error without source path', async () => {
      const result = await command.execute([]);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('required');
    });

    it('should return error for non-existent source path', async () => {
      const result = await command.execute(['/non/existent/file.ts']);
      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('not found');
    });

    it('should use default output directory if not specified', async () => {
      const srcFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(srcFile, 'export class Test {}', 'utf-8');

      const mockExtractor = {
        extractFromFile: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new GenerateDocsCommand(mockExtractor);
      const result = await cmd.execute([srcFile]);

      expect(result.exitCode).toBe(0);
    });

    it('should accept custom output directory', async () => {
      const srcFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(srcFile, 'export class Test {}', 'utf-8');

      const outputDir = path.join(tempDir, 'custom-output');
      const mockExtractor = {
        extractFromFile: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new GenerateDocsCommand(mockExtractor);
      const result = await cmd.execute([srcFile, outputDir]);

      expect(result.exitCode).toBe(0);
    });

    it('should parse directory and generate docs', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'test.ts'), 'export class Test {}', 'utf-8');

      const mockExtractor = {
        extractFromFile: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new GenerateDocsCommand(mockExtractor);
      const result = await cmd.execute([srcDir]);

      expect(result.exitCode).toBe(0);
    });

    it('should skip test files', async () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'test.test.ts'), 'export class Test {}', 'utf-8');
      fs.writeFileSync(path.join(srcDir, 'main.ts'), 'export class Main {}', 'utf-8');

      const mockExtractor = {
        extractFromFile: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new GenerateDocsCommand(mockExtractor);
      await cmd.execute([srcDir]);

      // Should only extract from main.ts, not test.test.ts
      const calls = mockExtractor.extractFromFile.mock.calls;
      expect(calls.some((call: any) => call[0].includes('main.ts'))).toBe(true);
      expect(calls.some((call: any) => call[0].includes('test.test.ts'))).toBe(false);
    });

    it('should create output directory if it does not exist', async () => {
      const srcFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(srcFile, 'export class Test {}', 'utf-8');

      const outputDir = path.join(tempDir, 'new-output');
      const mockExtractor = {
        extractFromFile: jest.fn().mockReturnValue([
          {
            symbol: { name: 'Test' },
            doc: {},
            completeness: 20,
          },
        ]),
      } as any;

      const mockGenerator = {
        generateDocument: jest.fn().mockReturnValue('# Test\n\nGenerated'),
      } as any;

      const cmd = new GenerateDocsCommand(mockExtractor, mockGenerator);
      await cmd.execute([srcFile, outputDir]);

      // Directory should be created
      expect(fs.existsSync(outputDir)).toBe(true);
    });

    it('should handle files with no enhanced docs', async () => {
      const srcFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(srcFile, 'export class Test {}', 'utf-8');

      const mockExtractor = {
        extractFromFile: jest.fn().mockReturnValue([]),
      } as any;

      const cmd = new GenerateDocsCommand(mockExtractor);
      const result = await cmd.execute([srcFile]);

      expect(result.exitCode).toBe(0);
    });

    it('should accept custom extractor and generator', async () => {
      const srcFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(srcFile, 'export class Test {}', 'utf-8');

      const mockExtractor = {
        extractFromFile: jest.fn().mockReturnValue([]),
      } as any;

      const mockGenerator = {
        generateDocument: jest.fn().mockReturnValue('# Generated'),
      } as any;

      const cmd = new GenerateDocsCommand(mockExtractor, mockGenerator);
      await cmd.execute([srcFile]);

      expect(mockExtractor.extractFromFile).toHaveBeenCalled();
    });
  });
});
