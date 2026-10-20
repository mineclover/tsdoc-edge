/**
 * Tests for RelationshipExportCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RelationshipExportCommand } from '../../commands/RelationshipExportCommand';
import { seedRelationshipDatabase } from '../fixtures/relationship-db';

describe('RelationshipExportCommand', () => {
  let command: RelationshipExportCommand;

  beforeEach(() => {
    command = new RelationshipExportCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-export');
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
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relationship-export-'));
      process.chdir(tempDir);
      seedRelationshipDatabase(tempDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    function captureOutput(): () => string {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      return () => log.mock.calls.flat().join('\n');
    }

    it('prints only the exported content to stdout by default', async () => {
      const output = captureOutput();

      const result = await command.execute(['--format', 'json']);
      const exported = JSON.parse(output());

      expect(result.exitCode).toBe(0);
      expect(exported.metadata.totalRelationships).toBe(3);
      expect(exported.relationships).toHaveLength(3);
    });

    it('prints an XML summary and writes the file with --output', async () => {
      const output = captureOutput();
      const target = path.join(tempDir, 'graph.dot');

      const result = await command.execute([
        '--format',
        'dot',
        '--category',
        'structural',
        '--output',
        target,
      ]);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml.startsWith('<relationship-export>')).toBe(true);
      expect(xml).toContain('<format>dot</format>');
      expect(xml).toContain(`<outputFile>${target}</outputFile>`);
      expect(xml).toContain('<totalRelationships>2</totalRelationships>');
      expect(xml).toContain('<category>structural</category>');
      expect(xml).not.toContain('<minConfidence>');
      expect(xml).not.toContain('\x1b[');
      expect(fs.readFileSync(target, 'utf-8')).toContain('digraph relationships');
    });

    it('keeps the colored report with --human', async () => {
      const output = captureOutput();
      const target = path.join(tempDir, 'out.csv');

      await command.execute(['--format', 'csv', '--output', target, '--human']);
      const text = output();

      expect(text).toContain('Export Relationships (CSV)');
      expect(text).toContain(`Exported to: ${target}`);
      expect(text).toContain('\x1b[');
      expect(text).not.toContain('<relationship-export>');
      expect(fs.readFileSync(target, 'utf-8')).toContain('rel-dependency');
    });

    it('fails on an unknown format', async () => {
      captureOutput();

      const result = await command.execute(['--format', 'bogus']);

      expect(result.exitCode).toBe(1);
    });
  });
});
