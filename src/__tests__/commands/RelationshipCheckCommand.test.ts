/**
 * Tests for RelationshipCheckCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RelationshipCheckCommand } from '../../commands/RelationshipCheckCommand';
import { SEEDED_SYMBOL_IDS, seedRelationshipDatabase } from '../fixtures/relationship-db';

describe('RelationshipCheckCommand', () => {
  let command: RelationshipCheckCommand;

  beforeEach(() => {
    command = new RelationshipCheckCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-check');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
      expect(log.mock.calls.flat().join('\n')).toContain('--human');
    });
  });

  describe('output modes', () => {
    let tempDir: string;
    const originalCwd = process.cwd();

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relationship-check-'));
      process.chdir(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    function captureOutput(): () => string {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      return () => log.mock.calls.flat().join('\n');
    }

    it('prints an XML verdict by default', async () => {
      const output = captureOutput();

      const result = await command.execute([SEEDED_SYMBOL_IDS.source, '--depth', '2']);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml.startsWith('<relationship-check>')).toBe(true);
      expect(xml).toContain(`<symbolId>${SEEDED_SYMBOL_IDS.source}</symbolId>`);
      expect(xml).toContain('<depth>2</depth>');
      expect(xml).toContain('<risk>NORMAL</risk>');
      expect(xml).toContain('<text>Standard code review process</text>');
      expect(xml).not.toContain('<category>');
      expect(xml).not.toContain('\x1b[');
    });

    it('keeps the colored report with --human and runs the sub-reports in text form', async () => {
      seedRelationshipDatabase(tempDir);
      const output = captureOutput();

      const result = await command.execute([SEEDED_SYMBOL_IDS.source, '--human']);
      const text = output();

      expect(result.exitCode).toBe(0);
      expect(text).toContain(`Safety Check: ${SEEDED_SYMBOL_IDS.source}`);
      expect(text).toContain('1. Impact Analysis');
      expect(text).toContain('3. Connection Overview');
      expect(text).toContain('Relationships for: class-source');
      expect(text).toContain('NORMAL RISK CHANGE');
      expect(text).toContain('\x1b[');
      expect(text).not.toContain('<relationship-');
    });

    it('does not mistake --human for the symbol id', async () => {
      const output = captureOutput();

      const result = await command.execute(['--human']);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('Symbol ID required');
    });
  });
});
