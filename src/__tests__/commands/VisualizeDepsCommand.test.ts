/**
 * Tests for VisualizeDepsCommand
 * @testScenario Default output is an XML document carrying the diagram
 * @testScenario --human keeps the colored output
 * @testScenario The diagram file is saved in both modes
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { VisualizeDepsCommand } from '../../commands/VisualizeDepsCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';

const ANSI = '\x1b[';

describe('VisualizeDepsCommand', () => {
  let command: VisualizeDepsCommand;
  let tempDir: string;
  let logSpy: jest.SpyInstance;
  const originalCwd = process.cwd();

  const output = () => logSpy.mock.calls.map((call) => call.join(' ')).join('\n');

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'visualize-deps-')));
    process.chdir(tempDir);
    // Create an empty database so the command has a graph to load
    new DatabaseManager(path.join(tempDir, '.tsdoc.db')).close();
    command = new VisualizeDepsCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('visualize');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
      expect(output()).toContain('--human');
    });

    it('lists the visualizations as XML by default', async () => {
      const result = await command.execute([]);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).not.toContain(ANSI);
      expect(xml.startsWith('<available-visualizations>')).toBe(true);
      expect(xml).toContain('<visualizations count="5">');
      expect(xml).toContain('<diagramsDir>.tsdoc/diagrams</diagramsDir>');
    });

    it('carries the diagram in an XML document and still saves the file', async () => {
      const result = await command.execute(['hotspots']);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).not.toContain(ANSI);
      expect(xml.startsWith('<dependency-visualization>')).toBe(true);
      expect(xml.endsWith('</dependency-visualization>')).toBe(true);
      expect(xml).toContain('<subcommand>hotspots</subcommand>');
      expect(xml).toContain('<outputPath>.tsdoc/diagrams/hotspots.mmd</outputPath>');
      expect(xml).toContain('<format>mermaid</format>');
      expect(xml).not.toContain('Saved to');

      const saved = fs.readFileSync(path.join(tempDir, '.tsdoc/diagrams/hotspots.mmd'), 'utf-8');
      expect(saved.length).toBeGreaterThan(0);
      expect(xml).toContain('<code>');
    });

    it('takes the module limit as the target', async () => {
      await command.execute(['modules', '3']);
      const xml = output();

      expect(xml).toContain('<subcommand>modules</subcommand>');
      expect(xml).toContain('<target>3</target>');
      expect(fs.existsSync(path.join(tempDir, '.tsdoc/diagrams/modules.mmd'))).toBe(true);
    });

    it('reports an empty circular result as XML', async () => {
      const result = await command.execute(['circular']);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).toContain('<subcommand>circular</subcommand>');
      expect(xml).toContain('<circularCount>0</circularCount>');
      expect(xml).not.toContain('<diagram>');
    });

    it('prints the colored output and saves the same file with --human', async () => {
      const result = await command.execute(['hotspots', '--human']);
      const text = output();

      expect(result.exitCode).toBe(0);
      expect(text).toContain('TSDoc Edge - Dependency Visualization');
      expect(text).toContain('Hotspot Diagram');
      expect(text).toContain('Saved to ');
      expect(text).toContain(ANSI);
      expect(text).not.toContain('<dependency-visualization>');
      expect(fs.existsSync(path.join(tempDir, '.tsdoc/diagrams/hotspots.mmd'))).toBe(true);
    });

    it('does not mistake --human for the subcommand', async () => {
      await command.execute(['--human', 'hotspots']);

      expect(output()).toContain('Hotspot Diagram');
    });

    it('keeps the missing-symbol failure as a plain error', async () => {
      const result = await command.execute(['tree', 'does-not-exist']);

      expect(result.exitCode).toBe(1);
      expect(output()).toContain('Symbol not found: does-not-exist');
      expect(output()).not.toContain('<dependency-visualization>');
    });
  });
});
