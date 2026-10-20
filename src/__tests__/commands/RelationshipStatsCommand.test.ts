/**
 * Tests for RelationshipStatsCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RelationshipStatsCommand } from '../../commands/RelationshipStatsCommand';
import { seedRelationshipDatabase } from '../fixtures/relationship-db';

describe('RelationshipStatsCommand', () => {
  let command: RelationshipStatsCommand;

  beforeEach(() => {
    command = new RelationshipStatsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-stats');
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
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relationship-stats-'));
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

    it('prints an XML document by default', async () => {
      seedRelationshipDatabase(tempDir);
      const output = captureOutput();

      const result = await command.execute([]);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml.startsWith('<relationship-stats>')).toBe(true);
      expect(xml.trimEnd().endsWith('</relationship-stats>')).toBe(true);
      expect(xml).toContain('<totalSymbols>2</totalSymbols>');
      expect(xml).toContain('<totalRelationships>3</totalRelationships>');
      expect(xml).toContain('<name>structural</name>');
      expect(xml).not.toContain('<typeBreakdown');
      expect(xml).not.toContain('\x1b[');
    });

    it('adds the per-type breakdown to the XML with --detailed', async () => {
      seedRelationshipDatabase(tempDir);
      const output = captureOutput();

      await command.execute(['--detailed']);
      const xml = output();

      expect(xml).toContain('<typeBreakdown count="28">');
      expect(xml).toContain('<type>code-dependency</type>');
    });

    it('prints the colored text report with --human', async () => {
      seedRelationshipDatabase(tempDir);
      const output = captureOutput();

      const result = await command.execute(['--human']);
      const text = output();

      expect(result.exitCode).toBe(0);
      expect(text).toContain('TSDoc Edge - Relationship Statistics');
      expect(text).toContain('Overall Statistics');
      expect(text).toContain('\x1b[');
      expect(text).not.toContain('<relationship-stats>');
    });

    it('fails without a database in either mode', async () => {
      for (const args of [[], ['--human']]) {
        const result = await command.execute(args);
        expect(result.exitCode).toBe(1);
        expect(result.message).toContain('Database not found');
      }
    });
  });
});
