/**
 * ValidateDocsCommand tests
 * @testScenario Validate document symbols
 * @testScenario Report errors and warnings
 * @testScenario Handle non-existent directory
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ValidateDocsCommand } from '../../commands/ValidateDocsCommand';

// Mock ConfigManager
jest.mock('../../config/ConfigManager', () => ({
  ConfigManager: {
    getInstance: jest.fn(() => ({
      get: jest.fn(() => ({
        paths: { managedDir: 'managed' },
        documentManagement: { ignoreCodeBlocks: true },
      })),
    })),
  },
}));

const ANSI = '\x1b[';

describe('ValidateDocsCommand', () => {
  let command: ValidateDocsCommand;
  let consoleSpy: jest.SpyInstance;
  let tempDir: string;

  const output = (): string => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'validate-docs-test-'))
    );
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getName', () => {
    it('should return "validate-docs"', () => {
      command = new ValidateDocsCommand();
      expect(command.getName()).toBe('validate-docs');
    });
  });

  describe('getDescription', () => {
    it('should return description', () => {
      command = new ValidateDocsCommand();
      expect(command.getDescription()).toContain('Validate');
    });
  });

  describe('execute', () => {
    it('should show help when --help flag is passed', async () => {
      command = new ValidateDocsCommand();
      const result = await command.execute(['--help']);

      expect(result.exitCode).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
      expect(output()).toContain('--human');
    });

    it('should fail for non-existent directory', async () => {
      command = new ValidateDocsCommand();
      const result = await command.execute(['/nonexistent/docs']);

      expect(result.exitCode).not.toBe(0);
    });

    it('should handle empty directory', async () => {
      command = new ValidateDocsCommand();
      const result = await command.execute([tempDir]);

      // Should succeed but with 0 files
      expect(result.exitCode).toBe(0);
    });
  });

  describe('output formats', () => {
    beforeEach(() => {
      command = new ValidateDocsCommand();
    });

    const writeValidDocs = (): void => {
      fs.writeFileSync(path.join(tempDir, 'alpha.md'), '# [[Alpha]]\n\nAlpha doc.\n', 'utf-8');
    };

    const writeBrokenDocs = (): void => {
      // [[Missing]] is referenced but never defined
      fs.writeFileSync(
        path.join(tempDir, 'alpha.md'),
        '# [[Alpha]]\n\nSee [[Missing]] for details.\n',
        'utf-8'
      );
    };

    it('should report a valid run as XML by default', async () => {
      writeValidDocs();

      const result = await command.execute([tempDir]);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out.startsWith('<validate-docs>')).toBe(true);
      expect(out.trimEnd().endsWith('</validate-docs>')).toBe(true);
      expect(out).toContain('<isValid>true</isValid>');
      expect(out).toContain('<totalDefinitions>1</totalDefinitions>');
      expect(out).toContain('<errorCount>0</errorCount>');
      expect(out).toContain('<errors count="0">');
      expect(out).not.toContain(ANSI);
    });

    it('should report errors in the XML document and still fail', async () => {
      writeBrokenDocs();

      const result = await command.execute([tempDir]);
      const out = output();

      expect(result.exitCode).toBe(1);
      expect(result.message).toBe('Validation failed');
      expect(out).toContain('<isValid>false</isValid>');
      expect(out).toContain('<type>missing_primary</type>');
      expect(out).toContain('<symbol>Missing</symbol>');
      expect(out).not.toContain(ANSI);
      expect(out).not.toContain('Validation failed');
    });

    it('should not print the deprecation warning in XML mode', async () => {
      writeValidDocs();
      const legacy = new ValidateDocsCommand(undefined, undefined, true);

      await legacy.execute([tempDir]);

      expect(output()).not.toContain('Deprecation');
      expect(output()).toContain('<validate-docs>');
    });

    it('should accept --human before the docs directory', async () => {
      writeValidDocs();

      const result = await command.execute(['--human', tempDir]);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('All document symbols are valid');
    });

    it('should keep the colored terminal output with --human', async () => {
      writeBrokenDocs();
      const legacy = new ValidateDocsCommand(undefined, undefined, true);

      const result = await legacy.execute([tempDir, '--human']);
      const out = output();

      expect(result.exitCode).toBe(1);
      expect(out).toContain('Deprecation Notice');
      expect(out).toContain('Validating Document Symbols');
      expect(out).toContain('missing_primary');
      expect(out).toContain('Symbol: [[Missing]]');
      expect(out).toContain('Validation failed');
      expect(out).toContain(ANSI);
      expect(out).not.toContain('<validate-docs>');
    });

    it('should fail for a missing directory in both modes', async () => {
      const xml = await command.execute(['/nonexistent/docs']);
      const human = await command.execute(['/nonexistent/docs', '--human']);

      expect(xml.exitCode).toBe(1);
      expect(human.exitCode).toBe(1);
      expect(output()).toContain('Directory not found');
    });
  });
});
