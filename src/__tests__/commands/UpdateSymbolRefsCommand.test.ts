/**
 * Tests for UpdateSymbolRefsCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { UpdateSymbolRefsCommand } from '../../commands/UpdateSymbolRefsCommand';
import type { DocumentSymbolParser } from '../../doc-symbol/DocumentSymbolParser';
import type { SymbolReferenceGenerator } from '../../doc-symbol/SymbolReferenceGenerator';
import type { SymbolRegistryManager } from '../../storage/SymbolRegistryManager';

const ANSI = '\x1b[';

describe('UpdateSymbolRefsCommand', () => {
  let command: UpdateSymbolRefsCommand;

  beforeEach(() => {
    command = new UpdateSymbolRefsCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('update-symbol-refs');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('symbol');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const result = await command.execute(['--help']);
      const out = consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');
      consoleSpy.mockRestore();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('--human');
    });
  });

  describe('output formats', () => {
    const originalCwd = process.cwd();
    let tempDir: string;
    let docFile: string;
    let consoleSpy: jest.SpyInstance;
    let generator: { batchUpdate: jest.Mock; getUnresolved: jest.Mock };

    const output = (): string => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

    const createCommand = (): UpdateSymbolRefsCommand => {
      const parser = {
        parse: jest.fn().mockReturnValue({
          filePath: docFile,
          auxiliaries: [],
          references: [],
          codeReferences: [],
          symbolFootnoteRefs: [
            { identifier: 'Alpha', line: 3 },
            { identifier: 'Alpha', line: 5 },
            { identifier: 'Gone', line: 7 },
          ],
        }),
      } as unknown as DocumentSymbolParser;
      return new UpdateSymbolRefsCommand(
        parser,
        {} as SymbolRegistryManager,
        generator as unknown as SymbolReferenceGenerator
      );
    };

    beforeEach(() => {
      tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'update-refs-test-')));
      fs.mkdirSync(path.join(tempDir, '.tsdoc'));
      fs.writeFileSync(path.join(tempDir, '.tsdoc', 'registry.jsonl'), '', 'utf-8');
      fs.mkdirSync(path.join(tempDir, 'managed'));
      docFile = path.join(tempDir, 'managed', 'doc.md');
      fs.writeFileSync(docFile, '# [[Doc]]\n', 'utf-8');
      generator = {
        batchUpdate: jest.fn().mockReturnValue({
          updated: 1,
          skipped: 0,
          errors: [{ file: 'bad.md', error: 'write failed' }],
        }),
        getUnresolved: jest.fn().mockReturnValue([{ identifier: 'Gone', line: 7 }]),
      };
      process.chdir(tempDir);
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should report the update as XML by default', async () => {
      const result = await createCommand().execute([]);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(generator.batchUpdate).toHaveBeenCalledTimes(1);
      expect(out.startsWith('<update-symbol-refs>')).toBe(true);
      expect(out.trimEnd().endsWith('</update-symbol-refs>')).toBe(true);
      expect(out).toContain('<docsDir>managed</docsDir>');
      expect(out).toContain('<documentsUpdated>1</documentsUpdated>');
      expect(out).toContain('<uniqueRefs>2</uniqueRefs>');
      expect(out).toContain('<identifier>Gone</identifier>');
      expect(out).toContain('<message>write failed</message>');
      expect(out).not.toContain(ANSI);
    });

    it('should emit an empty document when no footnote references exist', async () => {
      const parser = {
        parse: jest.fn().mockReturnValue({ filePath: docFile, symbolFootnoteRefs: [] }),
      } as unknown as DocumentSymbolParser;
      const empty = new UpdateSymbolRefsCommand(
        parser,
        {} as SymbolRegistryManager,
        generator as unknown as SymbolReferenceGenerator
      );

      const result = await empty.execute(['managed']);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(generator.batchUpdate).not.toHaveBeenCalled();
      expect(out).toContain('<documentsProcessed>0</documentsProcessed>');
      expect(out).toContain('<documents count="0">');
    });

    it('should keep the colored terminal output with --human', async () => {
      const result = await createCommand().execute(['managed', '--human']);
      const out = output();

      expect(result.exitCode).toBe(0);
      expect(out).toContain('Updating Symbol References');
      expect(out).toMatch(/doc\.md \(.*2.* refs\)/);
      expect(out).toContain('Unresolved References');
      expect(out).toContain('Line 7: [^Gone]');
      expect(out).toContain('write failed');
      expect(out).toContain('Total: 1 documents updated');
      expect(out).toContain('Unresolved: 1 references');
      expect(out).toContain(ANSI);
      expect(out).not.toContain('<update-symbol-refs>');
    });

    it('should keep failing when the symbol registry is missing', async () => {
      fs.rmSync(path.join(tempDir, '.tsdoc', 'registry.jsonl'));

      const xml = await createCommand().execute([]);
      const human = await createCommand().execute(['--human']);

      expect(xml.exitCode).toBe(1);
      expect(human.exitCode).toBe(1);
      expect(output()).toContain('No symbol registry found');
      expect(output()).not.toContain('<update-symbol-refs>');
    });

    it('should fail for a missing path', async () => {
      const result = await createCommand().execute(['nope']);

      expect(result.exitCode).toBe(1);
      expect(output()).toContain('Path not found');
    });
  });
});
