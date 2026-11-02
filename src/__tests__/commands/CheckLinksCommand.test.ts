/**
 * Tests for CheckLinksCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CheckLinksCommand } from '../../commands/CheckLinksCommand';

describe('CheckLinksCommand', () => {
  let command: CheckLinksCommand;
  let tempDir: string;

  beforeEach(() => {
    command = new CheckLinksCommand();
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'check-links-test-')));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('check-links');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('broken links');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      try {
        const result = await command.execute(['--help']);
        expect(result.exitCode).toBe(0);
      } finally {
        logSpy.mockRestore();
      }
    });

    it('should fail when target path does not exist', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      try {
        const result = await command.execute([path.join(tempDir, 'nonexistent')]);
        expect(result.exitCode).not.toBe(0);
      } finally {
        logSpy.mockRestore();
      }
    });

    it('validates valid Markdown relative links, source paths, and [[Symbol]] checkpoints while ignoring fenced examples and external URLs', async () => {
      const managedDir = path.join(tempDir, 'managed');
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(managedDir, { recursive: true });
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(path.join(srcDir, 'Service.ts'), 'export class Service {}\n', 'utf8');
      fs.writeFileSync(
        path.join(managedDir, 'guide.md'),
        '# [[GuideDoc]]\n\nDetailed guide content.\n',
        'utf8'
      );
      fs.writeFileSync(
        path.join(managedDir, 'service.md'),
        `---
source: src/Service.ts
---
# [[ServiceDoc]]

See [Guide](./guide.md#overview), [Service Source](src/Service.ts#Service), [External](https://example.com), and [Anchor](#section).
Also references [[GuideDoc#details]].

\`\`\`markdown
[Ignored Example](./does-not-exist.md)
[[IgnoredCodeBlockSymbol]]
\`\`\`
`,
        'utf8'
      );

      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      try {
        // Omit path arg to verify default resolution to managed/
        const result = await command.execute(['--json', '--fail-on-broken']);
        expect(result.exitCode).toBe(0);

        const payload = JSON.parse(String(logSpy.mock.calls[0]?.[0])) as {
          sourcePath: string;
          valid: boolean;
          totalLinks: number;
          brokenLinks: number;
        };
        expect(payload.sourcePath).toBe('managed');
        expect(payload.valid).toBe(true);
        expect(payload.totalLinks).toBe(4);
        expect(payload.brokenLinks).toBe(0);
      } finally {
        logSpy.mockRestore();
        cwdSpy.mockRestore();
      }
    });

    it('detects broken Markdown file links, broken source: paths, and broken [[Symbol]] links and fails with --fail-on-broken', async () => {
      const managedDir = path.join(tempDir, 'managed');
      fs.mkdirSync(managedDir, { recursive: true });

      fs.writeFileSync(
        path.join(managedDir, 'broken.md'),
        `---
source: src/DeletedSource.ts
---
# [[BrokenDoc]]

Read [Missing Doc](./missing-guide.md#intro) and [[MissingCheckpoint]].
`,
        'utf8'
      );

      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      try {
        const softResult = await command.execute([managedDir]);
        expect(softResult.exitCode).toBe(0);

        logSpy.mockClear();
        const strictResult = await command.execute([managedDir, '--fail-on-broken', '--json']);
        expect(strictResult.exitCode).not.toBe(0);

        const payload = JSON.parse(String(logSpy.mock.calls[0]?.[0])) as {
          valid: boolean;
          totalLinks: number;
          brokenLinks: number;
          byType: {
            file?: Array<{ target: string }>;
            symbol?: Array<{ target: string }>;
          };
        };
        expect(payload.valid).toBe(false);
        expect(payload.totalLinks).toBe(3);
        expect(payload.brokenLinks).toBe(3);
        expect(payload.byType.file).toHaveLength(2);
        expect(payload.byType.symbol).toHaveLength(1);
        expect(payload.byType.symbol?.[0]?.target).toBe('[[MissingCheckpoint]]');
      } finally {
        logSpy.mockRestore();
        cwdSpy.mockRestore();
      }
    });

    it('preloads canonical managed/ definitions when checking a subdirectory', async () => {
      const managedDir = path.join(tempDir, 'managed');
      const subDir = path.join(managedDir, 'features');
      fs.mkdirSync(subDir, { recursive: true });

      fs.writeFileSync(
        path.join(managedDir, 'root-hub.md'),
        '# [[RootPrimary]]\n\n## [[RootAuxHub]]\n',
        'utf8'
      );
      fs.writeFileSync(
        path.join(subDir, 'child.md'),
        '# [[ChildFeature]]\n\nUses [[RootPrimary]] and [[RootAuxHub]].\n',
        'utf8'
      );

      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      try {
        const result = await command.execute([subDir, '--fail-on-broken', '--json']);
        expect(result.exitCode).toBe(0);

        const payload = JSON.parse(String(logSpy.mock.calls[0]?.[0])) as {
          valid: boolean;
          totalLinks: number;
          brokenLinks: number;
        };
        expect(payload.valid).toBe(true);
        expect(payload.totalLinks).toBe(2);
        expect(payload.brokenLinks).toBe(0);
      } finally {
        logSpy.mockRestore();
        cwdSpy.mockRestore();
      }
    });

    it('rejects unknown flags fail-closed', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      try {
        const result = await command.execute([tempDir, '--unknown-flag']);
        expect(result.exitCode).not.toBe(0);
      } finally {
        logSpy.mockRestore();
      }
    });
  });
});
