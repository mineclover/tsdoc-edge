/**
 * Tests for OrphansCommand
 */

import { OrphansCommand } from '../../commands/OrphansCommand';
import type { SymbolRegistryManager } from '../../storage/SymbolRegistryManager';

const registryEntry = (id: string, symbolName: string, filePath: string, type: string) => ({
  id,
  sourceRef: { filePath, symbolName, type, line: 1 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('OrphansCommand', () => {
  let command: OrphansCommand;

  beforeEach(() => {
    command = new OrphansCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('orphans');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('orphan');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('output format (--fast, registry based)', () => {
    let consoleSpy: jest.SpyInstance;
    const output = () => consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const entries = new Map([
        ['svc', registryEntry('svc', 'Service', 'src/svc.ts', 'class')],
        ['svc-spec', registryEntry('svc-spec', 'specHelper', 'src/svc.test.ts', 'function')],
      ]);
      const manager = {
        findOrphans: jest.fn().mockReturnValue(['svc', 'svc-spec']),
        findById: jest.fn((id: string) => entries.get(id)),
      } as unknown as SymbolRegistryManager;
      command = new OrphansCommand(manager);
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('prints an XML document by default', async () => {
      const result = await command.execute(['--fast']);

      expect(result.exitCode).toBe(0);
      expect(output().startsWith('<orphans>')).toBe(true);
      expect(output()).toContain('<totalFound>2</totalFound>');
      expect(output()).toContain('<mode>fast</mode>');
      expect(output()).toContain('<id>svc</id>');
      expect(output()).toContain('<name>Service</name>');
      expect(output()).toContain('<type>class</type>');
      expect(output()).toContain('<filePath>src/svc.ts</filePath>');
      expect(output()).not.toContain('\x1b[');
    });

    it('applies --exclude-tests to the XML list', async () => {
      await command.execute(['--fast', '--exclude-tests']);

      expect(output()).toContain('<totalFound>1</totalFound>');
      expect(output()).toContain('<excludeTests>true</excludeTests>');
      expect(output()).not.toContain('svc-spec');
    });

    it('prints the colored text report with --human', async () => {
      await command.execute(['--fast', '--human']);

      expect(output()).toContain('Orphaned Symbols');
      expect(output()).toContain('Using fast mode');
      expect(output()).toContain('Found 2 orphaned symbols:');
      expect(output()).toContain('Location: src/svc.ts');
      expect(output()).toContain('\x1b[');
      expect(output()).not.toContain('<orphans>');
    });

    it('still fails without a registry in both formats', async () => {
      const missing = new OrphansCommand();
      const cwd = jest.spyOn(process, 'cwd').mockReturnValue('/nonexistent-tsdoc-edge-dir');

      const xml = await missing.execute(['--fast']);
      const human = await missing.execute(['--fast', '--human']);
      cwd.mockRestore();

      expect(xml.exitCode).toBe(1);
      expect(human.exitCode).toBe(1);
      expect(output()).toContain('No registry found.');
    });
  });
});
