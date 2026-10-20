/**
 * Tests for SpecDiffCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { SpecDiffCommand } from '../../commands/SpecDiffCommand';
import type { SpecVersionManager, VersionDiff } from '../../spec/SpecVersionManager';

describe('SpecDiffCommand', () => {
  let command: SpecDiffCommand;

  beforeEach(() => {
    command = new SpecDiffCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('spec-diff');
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
    const versionDiff: VersionDiff = {
      from: '1.0.0',
      to: '2.0.0',
      changes: { added: ['New Section'], removed: ['Old <Section>'], modified: [] },
      summary: 'Added: New Section | Removed: Old <Section>',
    };

    let tempDir: string;
    let docPath: string;
    let diff: jest.Mock;
    let log: jest.SpyInstance;

    const output = () => log.mock.calls.flat().join('\n');

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-diff-'));
      docPath = path.join(tempDir, 'spec.md');
      fs.writeFileSync(docPath, '---\nversion: 2.0.0\n---\n# Spec\n');
      diff = jest.fn().mockReturnValue(versionDiff);
      command = new SpecDiffCommand({ diff } as unknown as SpecVersionManager);
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('prints only the XML document by default', async () => {
      const result = await command.execute([docPath, '1.0.0', '2.0.0']);

      expect(result.exitCode).toBe(0);
      expect(diff).toHaveBeenCalledWith(docPath, '1.0.0', '2.0.0');
      const xml = output();
      expect(xml.startsWith('<spec-diff>')).toBe(true);
      expect(xml.endsWith('</spec-diff>')).toBe(true);
      expect(xml).toContain('<from>1.0.0</from>');
      expect(xml).toContain('<to>2.0.0</to>');
      expect(xml).toContain('<addedCount>1</addedCount>');
      expect(xml).toContain('<added count="1">');
      expect(xml).toContain('<section>New Section</section>');
      expect(xml).toContain('<section>Old &lt;Section&gt;</section>');
      expect(xml).toContain('<modified count="0">');
      expect(xml).not.toContain('\x1b[');
    });

    it('keeps the colored text output behind --human', async () => {
      const result = await command.execute([docPath, '1.0.0', '2.0.0', '--human']);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('Specification Version Comparison');
      expect(output()).toContain('+ New Section');
      expect(output()).toContain('- Old <Section>');
      expect(output()).not.toContain('<spec-diff>');
    });

    it('requires the file and both versions in either mode', async () => {
      const result = await command.execute([docPath, '1.0.0']);

      expect(result.exitCode).toBe(1);
      expect(output()).toContain('Usage: tsdoc-edge spec-diff');
      expect(diff).not.toHaveBeenCalled();
    });
  });
});
