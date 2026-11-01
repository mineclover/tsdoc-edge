/**
 * Tests for FindUnusedDocsCommand
 * @testScenario Find unused documents in human and JSON modes
 * @testScenario Render review and complete action buckets
 * @testScenario Reject unknown CLI flags
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { FindUnusedDocsCommand } from '../../commands/FindUnusedDocsCommand';

describe('FindUnusedDocsCommand', () => {
  let command: FindUnusedDocsCommand;
  let tempDir: string;

  beforeEach(() => {
    command = new FindUnusedDocsCommand();
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'find-unused-cmd-')));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('find-unused-docs');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('should reject unknown flags', async () => {
      const result = await command.execute([tempDir, '--unknown-flag']);
      expect(result.exitCode).not.toBe(0);
    });

    it('should emit structured JSON report with --json', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'orphan-design.md'),
        '---\nstatus: active\n---\n\n# [[OrphanDesign]]\n\nNo code links yet.\n'
      );
      const logs: string[] = [];
      jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      });

      const result = await command.execute([tempDir, '--json']);
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(logs.join('\n')) as {
        summary: { total: number; byAction: Record<string, number> };
        documents: Array<{ reason: string; suggestedAction: string }>;
      };
      expect(parsed.summary.total).toBe(1);
      expect(parsed.summary.byAction.complete).toBe(1);
      expect(parsed.documents[0]?.reason).toBe('no-code-connections');
    });

    it('should render Suggested: Complete Code Connections section in human mode', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'orphan-system.md'),
        '---\nstatus: active\n---\n\n# [[OrphanSystem]]\n\nNeeds code bindings.\n'
      );
      const logs: string[] = [];
      jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      });

      const result = await command.execute([tempDir]);
      expect(result.exitCode).toBe(0);
      const output = logs.join('\n');
      expect(output).toContain('Suggested: Complete Code Connections');
      expect(output).toContain('orphan-system.md');
    });
  });
});
