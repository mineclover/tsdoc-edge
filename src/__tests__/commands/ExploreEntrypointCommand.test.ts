/**
 * Tests for ExploreEntrypointCommand
 * @testScenario Default output is an XML document
 * @testScenario --human keeps the colored report
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ExploreEntrypointCommand } from '../../commands/ExploreEntrypointCommand';
import { DatabaseManager } from '../../storage/DatabaseManager';

const ANSI = '\x1b[';

describe('ExploreEntrypointCommand', () => {
  let command: ExploreEntrypointCommand;
  let tempDir: string;
  let logSpy: jest.SpyInstance;
  const originalCwd = process.cwd();

  const output = () => logSpy.mock.calls.map((call) => call.join(' ')).join('\n');

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'explore-entrypoint-')));
    fs.mkdirSync(path.join(tempDir, 'managed'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'managed', 'index.md'),
      '# [[Index]]\n\nSee [[Child Doc]].\n'
    );
    fs.writeFileSync(path.join(tempDir, 'managed', 'child-doc.md'), '# [[Child Doc]]\n');
    process.chdir(tempDir);
    // Empty database: the command only needs it to exist
    new DatabaseManager(path.join(tempDir, '.tsdoc.db')).close();
    command = new ExploreEntrypointCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('explore-entrypoint');
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
      const result = await command.execute(['managed/index.md']);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).not.toContain(ANSI);
      expect(xml.startsWith('<entrypoint-exploration>')).toBe(true);
      expect(xml.endsWith('</entrypoint-exploration>')).toBe(true);
      expect(xml).toContain('<entrypoint>managed/index.md</entrypoint>');
      expect(xml).toContain('<detectOrphans>false</detectOrphans>');
      expect(xml).toContain('<docsTraversed>2</docsTraversed>');
      expect(xml).toContain('<discoveredDocs count="2">');
      expect(xml).toContain('<path>managed/child-doc.md</path>');
      expect(xml).not.toContain('<orphans>');
      expect(xml).not.toContain('NaN');
    });

    it('adds the orphans section with --detect-orphans', async () => {
      const result = await command.execute(['managed/index.md', '--detect-orphans']);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml).toContain('<detectOrphans>true</detectOrphans>');
      expect(xml).toContain('<orphans>');
      expect(xml).toContain('<orphanedFileCount>0</orphanedFileCount>');
      expect(xml).toContain('<orphanedSymbolCount>0</orphanedSymbolCount>');
    });

    it('prints the colored report with --human', async () => {
      const result = await command.execute(['--human', 'managed/index.md']);
      const text = output();

      expect(result.exitCode).toBe(0);
      expect(text).toContain('Explore Entrypoint: index.md');
      expect(text).toContain('Exploration Statistics');
      expect(text).toContain('Next Steps');
      expect(text).toContain(ANSI);
      expect(text).not.toContain('<entrypoint-exploration>');
    });

    it('keeps the argument errors as plain error messages', async () => {
      expect((await command.execute([])).exitCode).toBe(1);
      expect((await command.execute(['missing.md'])).exitCode).toBe(1);
      expect((await command.execute(['package.json'])).exitCode).toBe(1);
      expect(output()).not.toContain('<entrypoint-exploration>');
    });
  });
});
