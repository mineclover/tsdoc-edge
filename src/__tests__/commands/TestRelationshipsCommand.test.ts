/**
 * Tests for TestRelationshipsCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { TestRelationshipsCommand } from '../../commands/TestRelationshipsCommand';
import * as databaseManagerModule from '../../storage/DatabaseManager';

describe('TestRelationshipsCommand', () => {
  let command: TestRelationshipsCommand;

  beforeEach(() => {
    command = new TestRelationshipsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('test-relationships');
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
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-relationships-'));
      fs.mkdirSync(path.join(tempDir, 'src'));
      fs.writeFileSync(path.join(tempDir, 'src', 'empty.test.ts'), '// no integrations\n', 'utf-8');
      process.chdir(tempDir);

      // An empty dependency graph keeps the analysis independent of any project database.
      jest.spyOn(databaseManagerModule, 'DatabaseManager').mockImplementation(
        () =>
          ({
            getGraphData: () => ({ symbols: [], dependencies: [] }),
            close: () => undefined,
          }) as unknown as databaseManagerModule.DatabaseManager
      );
    });

    afterEach(() => {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    function captureOutput(): () => string {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      return () => log.mock.calls.flat().join('\n');
    }

    it('prints the coverage report as XML by default', async () => {
      const output = captureOutput();

      const result = await command.execute([]);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml.startsWith('<test-relationship-analysis>')).toBe(true);
      expect(xml).toContain('<mode>full</mode>');
      expect(xml).toContain('<testFilesAnalyzed>1</testFilesAnalyzed>');
      expect(xml).toContain('<verificationBreakdown count="3">');
      expect(xml).toContain('<topUnverified count="0">');
      expect(xml).not.toContain('Building dependency graph');
      expect(xml).not.toContain('\x1b[');
    });

    it('prints only the unverified relationships as XML with --unverified', async () => {
      const output = captureOutput();

      await command.execute(['--unverified']);
      const xml = output();

      expect(xml).toContain('<mode>unverified</mode>');
      expect(xml).toContain('<unverifiedRelationships count="0">');
      expect(xml).not.toContain('<verificationBreakdown');
    });

    it('keeps the colored report with --human', async () => {
      const output = captureOutput();

      const result = await command.execute(['--human']);
      const text = output();

      expect(result.exitCode).toBe(0);
      expect(text).toContain('TSDoc Edge - Test Relationship Analysis');
      expect(text).toContain('Test Files Analyzed:       1');
      expect(text).toContain('\x1b[');
      expect(text).not.toContain('<test-relationship-analysis>');
    });

    it('reports an unknown module with the same error text in both modes', async () => {
      const output = captureOutput();

      for (const args of [
        ['--module', 'Missing'],
        ['--module', 'Missing', '--human'],
      ]) {
        const result = await command.execute(args);
        expect(result.exitCode).toBe(0);
      }

      expect(output().match(/Module not found: Missing/g)).toHaveLength(2);
      expect(output()).not.toContain('<module>');
    });
  });
});
