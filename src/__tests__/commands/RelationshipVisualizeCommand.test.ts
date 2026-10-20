/**
 * Tests for RelationshipVisualizeCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { RelationshipVisualizeCommand } from '../../commands/RelationshipVisualizeCommand';
import { SEEDED_SYMBOL_IDS, seedRelationshipDatabase } from '../fixtures/relationship-db';

describe('RelationshipVisualizeCommand', () => {
  let command: RelationshipVisualizeCommand;

  beforeEach(() => {
    command = new RelationshipVisualizeCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-visualize');
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
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relationship-visualize-'));
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

    it('prints only the diagram to stdout by default', async () => {
      const output = captureOutput();

      const result = await command.execute([SEEDED_SYMBOL_IDS.source]);
      const diagram = output();

      expect(result.exitCode).toBe(0);
      expect(diagram.startsWith('graph TD')).toBe(true);
      expect(diagram).toContain('Source');
      expect(diagram).not.toContain('Relationship Visualization');
      expect(diagram).not.toContain('\x1b[');
    });

    it('prints an XML summary and writes the file with --output', async () => {
      const output = captureOutput();
      const target = path.join(tempDir, 'diagram.mmd');

      const result = await command.execute([
        SEEDED_SYMBOL_IDS.source,
        '--format',
        'mermaid',
        '--output',
        target,
        '--category',
        'structural',
      ]);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml.startsWith('<relationship-visualization>')).toBe(true);
      expect(xml).toContain(`<symbolId>${SEEDED_SYMBOL_IDS.source}</symbolId>`);
      expect(xml).toContain('<symbolName>Source</symbolName>');
      expect(xml).toContain('<category>structural</category>');
      expect(xml).not.toContain('<type>');
      expect(xml).not.toContain('\x1b[');
      expect(fs.readFileSync(target, 'utf-8')).toContain('graph TD');
    });

    it('keeps the colored report with --human, even before the symbol id', async () => {
      const output = captureOutput();

      const result = await command.execute(['--human', SEEDED_SYMBOL_IDS.source]);
      const text = output();

      expect(result.exitCode).toBe(0);
      expect(text).toContain(`Relationship Visualization: ${SEEDED_SYMBOL_IDS.source}`);
      expect(text).toContain('Symbol: Source (class)');
      expect(text).toContain('graph TD');
      expect(text).toContain('\x1b[');
    });

    it('fails for an unknown symbol in either mode', async () => {
      captureOutput();

      for (const args of [['nothing-here'], ['nothing-here', '--human']]) {
        const result = await command.execute(args);
        expect(result.exitCode).toBe(1);
        expect(result.message).toBe('Symbol not found');
      }
    });
  });
});
