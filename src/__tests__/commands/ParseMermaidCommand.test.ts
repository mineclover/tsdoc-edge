/**
 * Tests for ParseMermaidCommand
 * @testScenario Default output is an XML document
 * @testScenario --human keeps the colored report
 * @testScenario --generate-docs writes the same files in both modes
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ParseMermaidCommand } from '../../commands/ParseMermaidCommand';

const ANSI = '\x1b[';

const DIAGRAM = [
  '# [[Parse Fixture]]',
  '',
  '```mermaid',
  'graph TB',
  '    subgraph "Core Group"',
  '        Alpha["Alpha<br/>✅ 1,200 items"]',
  '        Beta["Beta"]',
  '    end',
  '    Alpha --> Beta',
  '    Beta -.-> Gamma["Gamma"]',
  '```',
  '',
].join('\n');

describe('ParseMermaidCommand', () => {
  let command: ParseMermaidCommand;
  let tempDir: string;
  let logSpy: jest.SpyInstance;
  const originalCwd = process.cwd();

  const output = () => logSpy.mock.calls.map((call) => call.join(' ')).join('\n');

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'parse-mermaid-')));
    fs.writeFileSync(path.join(tempDir, 'diagram.mmd'), DIAGRAM);
    process.chdir(tempDir);
    command = new ParseMermaidCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('parse-mermaid');
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

    it('prints an XML document by default', async () => {
      const result = await command.execute(['diagram.mmd']);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).not.toContain(ANSI);
      expect(xml.startsWith('<mermaid-parse>')).toBe(true);
      expect(xml.endsWith('</mermaid-parse>')).toBe(true);
      expect(xml).toContain('<file>diagram.mmd</file>');
      expect(xml).toContain('<diagramType>graph</diagramType>');
      expect(xml).toContain('<generateDocs>false</generateDocs>');
      expect(xml).toContain('<subgraphs count="1">');
      expect(xml).toContain('<name>Alpha</name>');
      expect(xml).toContain('<metricsCount>1200</metricsCount>');
      expect(xml).toContain('<relationships count="2">');
      expect(xml).toContain('<type>dotted</type>');
      expect(xml).not.toContain('<generation>');
      expect(xml).not.toContain('Tip:');
    });

    it('prints the colored report with --human', async () => {
      const result = await command.execute(['diagram.mmd', '--human']);
      const text = output();

      expect(result.exitCode).toBe(0);
      expect(text).toContain('Parse Mermaid: diagram.mmd');
      expect(text).toContain('Diagram Metadata');
      expect(text).toContain('Tip: Use --generate-docs');
      expect(text).toContain(ANSI);
      expect(text).not.toContain('<mermaid-parse>');
    });

    it('does not mistake --human for the diagram path', async () => {
      const result = await command.execute(['--human', 'diagram.mmd']);

      expect(result.exitCode).toBe(0);
      expect(output()).toContain('Diagram Metadata');
    });

    it('keeps the argument errors as plain error messages', async () => {
      expect((await command.execute([])).exitCode).toBe(1);
      expect((await command.execute(['missing.mmd'])).exitCode).toBe(1);
      expect(output()).toContain('File not found: missing.mmd');

      fs.writeFileSync(path.join(tempDir, 'notes.txt'), 'x');
      expect((await command.execute(['notes.txt'])).exitCode).toBe(1);
      expect(output()).not.toContain('<mermaid-parse>');
    });

    it('generates docs and reports them in XML', async () => {
      const result = await command.execute(['diagram.mmd', '--generate-docs', '--output', 'out']);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).toContain('<generateDocs>true</generateDocs>');
      expect(xml).toContain('<aborted>false</aborted>');
      expect(xml).toContain('<createdDirectory>true</createdDirectory>');
      expect(xml).toContain('<action>created</action>');
      expect(xml).not.toContain(ANSI);

      const generated = fs.readdirSync(path.join(tempDir, 'out'));
      expect(generated.length).toBeGreaterThan(0);
      expect(xml).toContain(`<generatedCount>${generated.length}</generatedCount>`);
    });

    it('does not overwrite existing docs without --force, in either mode', async () => {
      await command.execute(['diagram.mmd', '--generate-docs', '--output', 'out']);
      const [first] = fs.readdirSync(path.join(tempDir, 'out'));
      const docPath = path.join(tempDir, 'out', first);
      fs.writeFileSync(docPath, 'edited');

      logSpy.mockClear();
      const xmlResult = await command.execute([
        'diagram.mmd',
        '--generate-docs',
        '--output',
        'out',
      ]);
      expect(xmlResult.exitCode).toBe(0);
      expect(output()).toContain('<aborted>true</aborted>');
      expect(output()).toContain(`<filename>${first}</filename>`);
      expect(fs.readFileSync(docPath, 'utf-8')).toBe('edited');

      logSpy.mockClear();
      await command.execute(['diagram.mmd', '--generate-docs', '--output', 'out', '--human']);
      expect(output()).toContain('Use --force to overwrite existing files');
      expect(fs.readFileSync(docPath, 'utf-8')).toBe('edited');

      logSpy.mockClear();
      await command.execute(['diagram.mmd', '--generate-docs', '--output', 'out', '--force']);
      expect(output()).toContain('<action>updated</action>');
      expect(fs.readFileSync(docPath, 'utf-8')).not.toBe('edited');
    });

    it('prints the generation progress with --human', async () => {
      await command.execute(['diagram.mmd', '--generate-docs', '--output', 'out', '--human']);
      const text = output();

      expect(text).toContain('Generating H2 Reference Documentation');
      expect(text).toContain('as H2 reference)');
      expect(text).toContain('Next steps:');
      expect(fs.readdirSync(path.join(tempDir, 'out')).length).toBeGreaterThan(0);
    });
  });
});
