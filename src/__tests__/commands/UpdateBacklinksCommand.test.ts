/**
 * Tests for UpdateBacklinksCommand
 * @testScenario Update backlinks across managed documents
 * @testScenario Register source code connections matching ValidateDocsCommand
 * @testScenario Resolve default directories (managed, configured managedDirs, docs)
 * @testScenario Preserve non-backlink sections and maintain idempotency
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { UpdateBacklinksCommand } from '../../commands/UpdateBacklinksCommand';
import { DocumentSymbolRegistry } from '../../doc-symbol/DocumentSymbolRegistry';

// Mock ConfigManager
jest.mock('../../config/ConfigManager', () => ({
  ConfigManager: {
    getInstance: jest.fn(() => ({
      get: jest.fn(() => ({
        paths: { managedDir: 'managed' },
        documentManagement: {
          enabled: true,
          managedDirs: ['managed'],
          ignoreCodeBlocks: true,
        },
      })),
    })),
  },
}));

describe('UpdateBacklinksCommand', () => {
  let command: UpdateBacklinksCommand;
  let consoleSpy: jest.SpyInstance;
  let tempDir: string;

  beforeEach(() => {
    command = new UpdateBacklinksCommand();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'update-backlinks-test-')));
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('update-backlinks');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
    });

    it('should include managed default in usage information', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(output).toContain('managed');
    });
  });

  describe('directory resolution', () => {
    it('should resolve explicit target directory passed as argument', async () => {
      const customDir = path.join(tempDir, 'custom-docs');
      fs.mkdirSync(customDir, { recursive: true });
      fs.writeFileSync(path.join(customDir, 'doc.md'), '# [[CustomDoc]]\n\nContent\n', 'utf8');

      const result = await command.execute([customDir]);
      expect(result.exitCode).toBe(0);
    });

    it('should resolve explicit target directory even with leading options', async () => {
      const customDir = path.join(tempDir, 'custom-docs');
      fs.mkdirSync(customDir, { recursive: true });
      fs.writeFileSync(path.join(customDir, 'doc.md'), '# [[CustomDoc]]\n\nContent\n', 'utf8');

      const result = await command.execute(['--verbose', customDir]);
      expect(result.exitCode).toBe(0);
    });

    it('should default to managed/ when managed/ directory exists on disk', async () => {
      const managedDir = path.join(tempDir, 'managed');
      fs.mkdirSync(managedDir, { recursive: true });
      fs.writeFileSync(path.join(managedDir, 'doc.md'), '# [[ManagedDoc]]\n\nContent\n', 'utf8');

      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
      try {
        const result = await command.execute([]);
        expect(result.exitCode).toBe(0);
      } finally {
        cwdSpy.mockRestore();
      }
    });

    it('should fail with non-zero exit code if directory does not exist', async () => {
      const nonexistent = path.join(tempDir, 'nonexistent');
      const result = await command.execute([nonexistent]);
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('code connection registration', () => {
    it('registers code connections from source: frontmatter and emits Implemented By', async () => {
      const managedDir = path.join(tempDir, 'managed');
      fs.mkdirSync(managedDir, { recursive: true });
      const docPath = path.join(managedDir, 'UserService.md');
      fs.writeFileSync(
        docPath,
        `---
source: src/services/UserService.ts
---

# [[UserService]]

User management service.
`,
        'utf8'
      );

      const registry = new DocumentSymbolRegistry();
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
      try {
        command = new UpdateBacklinksCommand(undefined, undefined, registry);
        const result = await command.execute([managedDir]);
        expect(result.exitCode).toBe(0);

        // Verify registry received the connection
        const conns = registry.getCodeConnections('UserService');
        expect(conns).toEqual([
          expect.objectContaining({
            codeSymbol: 'UserService',
            filePath: 'src/services/UserService.ts',
            line: 1,
            docSymbol: 'UserService',
          }),
        ]);

        // Verify the file was updated with ### Implemented By
        const updated = fs.readFileSync(docPath, 'utf8');
        expect(updated).toContain('### Implemented By');
        expect(updated).toContain('UserService → src/services/UserService.ts:1');
      } finally {
        cwdSpy.mockRestore();
      }
    });

    it('registers code connections from **Source**: body pattern and emits Implemented By', async () => {
      const managedDir = path.join(tempDir, 'managed');
      fs.mkdirSync(managedDir, { recursive: true });
      const docPath = path.join(managedDir, 'BuildCommand.md');
      fs.writeFileSync(
        docPath,
        `---
title: Build Command
---

# [[BuildCommand]]

**Source**: \`src/commands/BuildCommand.ts\`

Build command documentation.
`,
        'utf8'
      );

      const registry = new DocumentSymbolRegistry();
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
      try {
        command = new UpdateBacklinksCommand(undefined, undefined, registry);
        const result = await command.execute([managedDir]);
        expect(result.exitCode).toBe(0);

        const conns = registry.getCodeConnections('BuildCommand');
        expect(conns.length).toBeGreaterThanOrEqual(1);
        expect(conns[0].filePath).toBe('src/commands/BuildCommand.ts');

        const updated = fs.readFileSync(docPath, 'utf8');
        expect(updated).toContain('### Implemented By');
        expect(updated).toContain('BuildCommand → src/commands/BuildCommand.ts:1');
      } finally {
        cwdSpy.mockRestore();
      }
    });
  });

  describe('idempotency and non-destructive updating', () => {
    it('is 100% idempotent across consecutive executions', async () => {
      const managedDir = path.join(tempDir, 'managed');
      fs.mkdirSync(managedDir, { recursive: true });

      const fileA = path.join(managedDir, 'ComponentA.md');
      const fileB = path.join(managedDir, 'ComponentB.md');

      fs.writeFileSync(
        fileA,
        `---
source: src/components/ComponentA.ts
---

# [[ComponentA]]

References [[ComponentB]].
`,
        'utf8'
      );

      fs.writeFileSync(
        fileB,
        `---
source: src/components/ComponentB.ts
---

# [[ComponentB]]

Definition of B.
`,
        'utf8'
      );

      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
      try {
        // Pass 1: generate initial backlinks
        const result1 = await command.execute([managedDir]);
        expect(result1.exitCode).toBe(0);

        const contentA1 = fs.readFileSync(fileA, 'utf8');
        const contentB1 = fs.readFileSync(fileB, 'utf8');

        // Pass 2: execute again
        const command2 = new UpdateBacklinksCommand();
        const result2 = await command2.execute([managedDir]);
        expect(result2.exitCode).toBe(0);

        const contentA2 = fs.readFileSync(fileA, 'utf8');
        const contentB2 = fs.readFileSync(fileB, 'utf8');

        expect(contentA2).toBe(contentA1);
        expect(contentB2).toBe(contentB1);
      } finally {
        cwdSpy.mockRestore();
      }
    });

    it('preserves trailing sections placed after ## Backlinks', async () => {
      const managedDir = path.join(tempDir, 'managed');
      fs.mkdirSync(managedDir, { recursive: true });

      const docPath = path.join(managedDir, 'Sample.md');
      fs.writeFileSync(
        docPath,
        `# [[Sample]]

Intro text.

---

## Backlinks

### Referenced By

- [[OldRef]] → managed/OldRef.md:1

---

## Footnotes

1. Important note that must not be deleted.
`,
        'utf8'
      );

      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
      try {
        const result = await command.execute([managedDir]);
        expect(result.exitCode).toBe(0);

        const updated = fs.readFileSync(docPath, 'utf8');
        expect(updated).toContain('## Footnotes');
        expect(updated).toContain('1. Important note that must not be deleted.');
      } finally {
        cwdSpy.mockRestore();
      }
    });
  });

  describe('dry-run, check, and fail-closed flag validation', () => {
    it('previews updates with --dry-run and -n without writing to disk', async () => {
      const managedDir = path.join(tempDir, 'managed');
      fs.mkdirSync(managedDir, { recursive: true });
      const docPath = path.join(managedDir, 'Service.md');
      const initialContent = `---
source: src/services/Service.ts
---

# [[Service]]

Service overview.
`;
      fs.writeFileSync(docPath, initialContent, 'utf8');
      const fixedPastDate = new Date('2025-01-01T00:00:00.000Z');
      fs.utimesSync(docPath, fixedPastDate, fixedPastDate);
      const initialMtimeMs = fs.statSync(docPath).mtimeMs;

      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
      try {
        const dryRunResult = await command.execute([managedDir, '--dry-run']);
        expect(dryRunResult.exitCode).toBe(0);
        expect(fs.statSync(docPath).mtimeMs).toBe(initialMtimeMs);
        expect(fs.readFileSync(docPath, 'utf8')).toBe(initialContent);

        const output = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
        expect(output).toContain('Would Update (Dry Run)');
        expect(output).toContain('Total: 1 documents would be updated (dry run)');

        // Short flag -n without explicit directory should resolve managed/ and also not write
        consoleSpy.mockClear();
        const shortFlagResult = await command.execute(['-n']);
        expect(shortFlagResult.exitCode).toBe(0);
        expect(fs.statSync(docPath).mtimeMs).toBe(initialMtimeMs);
        expect(fs.readFileSync(docPath, 'utf8')).toBe(initialContent);
      } finally {
        cwdSpy.mockRestore();
      }
    });

    it('returns exitCode 1 for --check when backlinks are out of sync and 0 once synced', async () => {
      const managedDir = path.join(tempDir, 'managed');
      fs.mkdirSync(managedDir, { recursive: true });
      const docPath = path.join(managedDir, 'FeatureA.md');
      const initialContent = `---
source: src/features/FeatureA.ts
---

# [[FeatureA]]

Feature documentation.
`;
      fs.writeFileSync(docPath, initialContent, 'utf8');

      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
      try {
        // Out of sync -> exitCode 1, file untouched
        const checkFail = await command.execute([managedDir, '--check']);
        expect(checkFail.exitCode).toBe(1);
        expect(fs.readFileSync(docPath, 'utf8')).toBe(initialContent);

        // Sync backlinks
        const syncRes = await new UpdateBacklinksCommand().execute([managedDir]);
        expect(syncRes.exitCode).toBe(0);

        // Now synced -> exitCode 0
        const checkPass = await new UpdateBacklinksCommand().execute([managedDir, '--check']);
        expect(checkPass.exitCode).toBe(0);
        expect(checkPass.message).toContain('All backlinks are up to date');
      } finally {
        errorSpy.mockRestore();
        cwdSpy.mockRestore();
      }
    });

    it('rejects unknown flags fail-closed with exitCode 1 without mutating files', async () => {
      const managedDir = path.join(tempDir, 'managed');
      fs.mkdirSync(managedDir, { recursive: true });
      const docPath = path.join(managedDir, 'Doc.md');
      const initialContent = `---
source: src/Doc.ts
---

# [[Doc]]

Doc body.
`;
      fs.writeFileSync(docPath, initialContent, 'utf8');
      const fixedPastDate = new Date('2025-01-01T00:00:00.000Z');
      fs.utimesSync(docPath, fixedPastDate, fixedPastDate);
      const initialMtimeMs = fs.statSync(docPath).mtimeMs;

      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        const result = await command.execute([managedDir, '--bogus']);
        expect(result.exitCode).toBe(1);
        expect(fs.statSync(docPath).mtimeMs).toBe(initialMtimeMs);
        expect(fs.readFileSync(docPath, 'utf8')).toBe(initialContent);
      } finally {
        errorSpy.mockRestore();
      }
    });
  });
});
