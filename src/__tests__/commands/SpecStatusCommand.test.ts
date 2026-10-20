/**
 * Tests for SpecStatusCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SpecStatusCommand } from '../../commands/SpecStatusCommand';
import type { SpecStatusManager } from '../../spec/SpecStatusManager';

describe('SpecStatusCommand', () => {
  let command: SpecStatusCommand;

  beforeEach(() => {
    command = new SpecStatusCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('spec-status');
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

    it('documents --human in the help text', async () => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      try {
        await command.execute(['--help']);
        expect(log.mock.calls.flat().join('\n')).toContain('--human');
      } finally {
        log.mockRestore();
      }
    });
  });

  describe('output formats', () => {
    let tempDir: string;
    let docPath: string;
    let manager: {
      getAllowedTransitions: jest.Mock;
      validateTransition: jest.Mock;
      applyTransition: jest.Mock;
      getStatusDistribution: jest.Mock;
      getPromotableDocs: jest.Mock;
    };
    let log: jest.SpyInstance;

    const output = () => log.mock.calls.flat().join('\n');
    const rel = (file: string) => path.relative(process.cwd(), file);

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-status-'));
      docPath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(docPath, '---\nstatus: draft\n---\n# Spec\n');

      manager = {
        getAllowedTransitions: jest.fn().mockReturnValue(['review', 'archived']),
        validateTransition: jest.fn().mockImplementation((_file: string, status: string) =>
          status === 'review'
            ? {
                from: 'draft',
                to: 'review',
                valid: true,
                checks: [{ name: 'Transition Allowed', passed: true, message: 'allowed' }],
              }
            : {
                from: 'draft',
                to: status,
                valid: false,
                checks: [{ name: 'Completeness', passed: false, message: 'Score < 50%' }],
              }
        ),
        applyTransition: jest.fn().mockReturnValue(true),
        getStatusDistribution: jest.fn().mockReturnValue({
          draft: 3,
          review: 1,
          approved: 0,
          active: 0,
          deprecated: 0,
          archived: 0,
        }),
        getPromotableDocs: jest.fn().mockReturnValue([
          {
            filePath: docPath,
            currentStatus: 'draft',
            targetStatus: 'review',
            canPromote: true,
            reason: 'All checks passed',
          },
          {
            filePath: path.join(tempDir, 'other.md'),
            currentStatus: 'draft',
            targetStatus: 'review',
            canPromote: false,
            reason: 'Score too low',
          },
        ]),
      };
      command = new SpecStatusCommand(manager as unknown as SpecStatusManager);
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    describe('show', () => {
      it('prints the status and allowed transitions as XML by default', async () => {
        const result = await command.execute(['show', docPath]);

        expect(result.exitCode).toBe(0);
        const xml = output();
        expect(xml.startsWith('<spec-status-show>')).toBe(true);
        expect(xml.endsWith('</spec-status-show>')).toBe(true);
        expect(xml).toContain(`<file>${rel(docPath)}</file>`);
        expect(xml).toContain('<currentStatus>draft</currentStatus>');
        expect(xml).toContain('<allowedTransitions count="2">');
        expect(xml).toContain('<status>review</status>');
        expect(xml).toContain('<valid>true</valid>');
        expect(xml).toContain('<valid>false</valid>');
        expect(xml).toContain('<message>Score &lt; 50%</message>');
        expect(xml).not.toContain('\x1b[');
      });

      it('keeps the colored text output behind --human', async () => {
        const result = await command.execute(['show', docPath, '--human']);

        expect(result.exitCode).toBe(0);
        expect(output()).toContain('Specification Status');
        expect(output()).toContain('Allowed transitions:');
        expect(output()).toContain('Score < 50%');
        expect(output()).not.toContain('<spec-status-show>');
      });

      it('accepts --human before the subcommand', async () => {
        await command.execute(['--human', 'show', docPath]);

        expect(output()).toContain('Specification Status');
      });
    });

    describe('promote', () => {
      it('promotes and reports the checks as XML by default', async () => {
        const result = await command.execute(['promote', docPath, 'review']);

        expect(result.exitCode).toBe(0);
        expect(manager.applyTransition).toHaveBeenCalledWith(docPath, 'review');
        const xml = output();
        expect(xml.startsWith('<spec-status-promote>')).toBe(true);
        expect(xml).toContain('<targetStatus>review</targetStatus>');
        expect(xml).toContain('<promoted>true</promoted>');
        expect(xml).toContain('<name>Transition Allowed</name>');
        expect(xml).not.toContain('\x1b[');
      });

      it('reports a failed validation as XML, exits non-zero and does not promote', async () => {
        const result = await command.execute(['promote', docPath, 'archived']);

        expect(result.exitCode).toBe(1);
        expect(manager.applyTransition).not.toHaveBeenCalled();
        const xml = output();
        expect(xml).toContain('<promoted>false</promoted>');
        expect(xml).toContain('<passed>false</passed>');
        expect(xml).not.toContain('\x1b[');
      });

      it('keeps the colored text output behind --human', async () => {
        const result = await command.execute(['promote', docPath, 'review', '--human']);

        expect(result.exitCode).toBe(0);
        expect(manager.applyTransition).toHaveBeenCalledWith(docPath, 'review');
        expect(output()).toContain('Promoting Specification');
        expect(output()).toContain('Successfully promoted to "review"');
        expect(output()).not.toContain('<spec-status-promote>');
      });

      it('keeps the failure text behind --human', async () => {
        const result = await command.execute(['promote', docPath, 'archived', '--human']);

        expect(result.exitCode).toBe(1);
        expect(manager.applyTransition).not.toHaveBeenCalled();
        expect(output()).toContain('Cannot promote: validation failed');
      });
    });

    describe('list-ready', () => {
      it('prints ready and not-ready documents as XML by default', async () => {
        const result = await command.execute(['list-ready', tempDir]);

        expect(result.exitCode).toBe(0);
        const xml = output();
        expect(xml.startsWith('<spec-status-ready>')).toBe(true);
        expect(xml).toContain('<readyCount>1</readyCount>');
        expect(xml).toContain('<notReadyCount>1</notReadyCount>');
        expect(xml).toContain('<ready count="1">');
        expect(xml).toContain('<notReady count="1">');
        expect(xml).toContain(`<file>${rel(docPath)}</file>`);
        expect(xml).toContain('<reason>Score too low</reason>');
        expect(xml).not.toContain('\x1b[');
      });

      it('keeps the colored text output behind --human', async () => {
        await command.execute(['list-ready', tempDir, '--human']);

        expect(output()).toContain('Documents Ready for Promotion');
        expect(output()).toContain('draft → review');
        expect(output()).not.toContain('<spec-status-ready>');
      });
    });

    describe('stats', () => {
      it('prints the distribution as XML by default', async () => {
        const result = await command.execute(['stats', tempDir]);

        expect(result.exitCode).toBe(0);
        const xml = output();
        expect(xml.startsWith('<spec-status-stats>')).toBe(true);
        expect(xml).toContain('<total>4</total>');
        expect(xml).toContain('<distribution count="6">');
        expect(xml).toContain('<status>draft</status>');
        expect(xml).toContain('<count>3</count>');
        expect(xml).toContain('<percent>75</percent>');
        expect(xml).not.toContain('\x1b[');
      });

      it('treats --human as a flag, not as the directory argument', async () => {
        const originalCwd = process.cwd();
        process.chdir(tempDir);
        try {
          // No ./managed here: the error must name the default directory, not "--human".
          const result = await command.execute(['stats', '--human']);

          expect(result.exitCode).toBe(1);
          expect(output()).toContain('Directory not found');
          expect(output()).toContain('managed');
          expect(output()).not.toContain('--human');
        } finally {
          process.chdir(originalCwd);
        }
      });

      it('keeps the colored text output behind --human', async () => {
        await command.execute(['stats', tempDir, '--human']);

        expect(output()).toContain('Specification Status Distribution');
        expect(output()).toContain('Total documents');
        expect(output()).toContain('draft');
        expect(output()).toContain('(75.0%)');
        expect(output()).not.toContain('<spec-status-stats>');
      });
    });

    it('keeps the error output for an unknown subcommand', async () => {
      const result = await command.execute(['bogus']);

      expect(result.exitCode).toBe(1);
      expect(output()).toContain('Unknown subcommand: bogus');
    });
  });
});
