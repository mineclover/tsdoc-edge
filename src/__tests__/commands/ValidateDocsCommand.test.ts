/**
 * ValidateDocsCommand tests
 * @testScenario Validate document symbols
 * @testScenario Report errors and warnings
 * @testScenario Handle non-existent directory
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ValidateDocsCommand } from '../../commands/ValidateDocsCommand';
import { DocumentSymbolRegistry } from '../../doc-symbol/DocumentSymbolRegistry';

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

describe('ValidateDocsCommand', () => {
  let command: ValidateDocsCommand;
  let consoleSpy: jest.SpyInstance;
  let tempDir: string;

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

    it('resolves docs references against canonical managed definitions', async () => {
      const docsDir = path.join(tempDir, 'docs');
      const managedDir = path.join(tempDir, 'managed', 'core-components');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.mkdirSync(managedDir, { recursive: true });
      fs.writeFileSync(
        path.join(docsDir, 'reference.md'),
        '# [[Reference Guide]]\n\nSee [[CanonicalThing]].\n',
        'utf8'
      );
      fs.writeFileSync(
        path.join(managedDir, 'canonical.md'),
        '# [[CanonicalThing]]\n\nCanonical definition.\n',
        'utf8'
      );

      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
      try {
        command = new ValidateDocsCommand();
        const result = await command.execute([docsDir]);
        expect(result.exitCode).toBe(0);
      } finally {
        cwdSpy.mockRestore();
      }
    });

    it('registers source connections without a generated document index', async () => {
      const docsDir = path.join(tempDir, 'managed');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(
        path.join(docsDir, 'implementation.md'),
        `---
source: src/implementation.ts
---
# [[Implementation]]
`,
        'utf8'
      );

      const registry = new DocumentSymbolRegistry();
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
      try {
        command = new ValidateDocsCommand(undefined, registry);
        const result = await command.execute([docsDir]);

        expect(result.exitCode).toBe(0);
        expect(registry.getCodeConnections('Implementation')).toEqual([
          expect.objectContaining({
            codeSymbol: 'Implementation',
            filePath: 'src/implementation.ts',
            docSymbol: 'Implementation',
          }),
        ]);
      } finally {
        cwdSpy.mockRestore();
      }
    });

    it('fails closed with broken_source_path when --verify-sources finds a missing source file', async () => {
      const docsDir = path.join(tempDir, 'managed');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(
        path.join(docsDir, 'missing-source.md'),
        `---
source: src/deleted/MissingFile.ts
---
# [[MissingFile]]
`,
        'utf8'
      );

      const registry = new DocumentSymbolRegistry();
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
      try {
        command = new ValidateDocsCommand(undefined, registry);
        const result = await command.execute([docsDir, '--verify-sources']);

        expect(result.exitCode).not.toBe(0);
        expect(registry.getCodeConnections('MissingFile')).toEqual([]);
        const loggedOutput = consoleSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n');
        expect(loggedOutput).toContain('broken_source_path');
        expect(loggedOutput).toContain(
          'Declared source file does not exist: src/deleted/MissingFile.ts'
        );
      } finally {
        cwdSpy.mockRestore();
      }
    });

    it('passes --verify-sources when declared source files exist on disk (including :line suffixes and globs)', async () => {
      const docsDir = path.join(tempDir, 'managed');
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'Existing.ts'), 'export class Existing {}\n', 'utf8');

      fs.writeFileSync(
        path.join(docsDir, 'existing.md'),
        `---
source: src/Existing.ts:1
---
# [[Existing]]
`,
        'utf8'
      );
      fs.writeFileSync(
        path.join(docsDir, 'glob-source.md'),
        `# [[GlobSource]]

**Source**: \`src/**/*.ts\`
`,
        'utf8'
      );

      const registry = new DocumentSymbolRegistry();
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
      try {
        command = new ValidateDocsCommand(undefined, registry);
        const result = await command.execute(['--verify-sources', docsDir]);

        expect(result.exitCode).toBe(0);
        expect(registry.getCodeConnections('Existing')).toHaveLength(1);
      } finally {
        cwdSpy.mockRestore();
      }
    });

    it('rejects unknown flags fail-closed', async () => {
      command = new ValidateDocsCommand();
      const result = await command.execute([tempDir, '--unknown-flag']);
      expect(result.exitCode).not.toBe(0);
    });
  });
});
