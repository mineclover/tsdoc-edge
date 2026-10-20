/**
 * Tests for TypeChainCommand, FindRootTypesCommand and DetectCircularTypesCommand
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  DetectCircularTypesCommand,
  FindRootTypesCommand,
  TypeChainCommand,
} from '../../commands/TypeChainCommand';

describe('TypeChainCommand', () => {
  let command: TypeChainCommand;

  beforeEach(() => {
    command = new TypeChainCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('type-chain');
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
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'type-chain-'));
      fs.mkdirSync(path.join(tempDir, 'src'));
      fs.writeFileSync(
        path.join(tempDir, 'src', 'models.ts'),
        [
          'export interface Address { street: string; }',
          'export interface User { name: string; address: Address; }',
          'export interface Node { next: Node; }',
          '',
        ].join('\n'),
        'utf-8'
      );
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

    it('prints the dependency tree as XML by default', async () => {
      const output = captureOutput();

      const result = await command.execute(['User']);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml.startsWith('<type-dependency-tree>')).toBe(true);
      expect(xml).toContain('<source>User</source>');
      expect(xml).toContain('<typeName>Address</typeName>');
      expect(xml).toContain('<via>address</via>');
      expect(xml).toContain('<totalTypes>3</totalTypes>');
      expect(xml).not.toContain('Type Chain Analysis');
      expect(xml).not.toContain('\x1b[');
    });

    it('prints the chain between two types as XML', async () => {
      const output = captureOutput();

      const result = await command.execute(['User', 'Address']);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml.startsWith('<type-chain>')).toBe(true);
      expect(xml).toContain('<pathCount>1</pathCount>');
      expect(xml).toContain('<to>Address</to>');
      expect(xml).not.toContain('\x1b[');
    });

    it('keeps the colored text with --human, even before the type name', async () => {
      const output = captureOutput();

      const result = await command.execute(['--human', 'User']);
      const text = output();

      expect(result.exitCode).toBe(0);
      expect(text).toContain('Type Chain Analysis');
      expect(text).toContain('Dependency Tree: User');
      expect(text).toContain('\x1b[');
      expect(text).not.toContain('<type-dependency-tree>');
    });

    it('fails for an unknown type in either mode', async () => {
      captureOutput();

      for (const args of [['Missing'], ['Missing', '--human']]) {
        const result = await command.execute(args);
        expect(result.exitCode).toBe(1);
        expect(result.message).toBe('Type not found');
      }
    });

    it('lists root and leaf types as XML', async () => {
      const output = captureOutput();

      const result = await new FindRootTypesCommand().execute([]);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml.startsWith('<root-types>')).toBe(true);
      expect(xml).toContain('<name>User</name>');
      expect(xml).toContain('<usedBy>1</usedBy>');
      expect(xml).not.toContain('\x1b[');
    });

    it('lists root and leaf types as colored text with --human', async () => {
      const output = captureOutput();

      await new FindRootTypesCommand().execute(['--human']);
      const text = output();

      expect(text).toContain('Root Types Analysis');
      expect(text).toContain('\x1b[');
      expect(text).not.toContain('<root-types>');
    });

    it('reports circular dependencies as XML', async () => {
      const output = captureOutput();

      const result = await new DetectCircularTypesCommand().execute([]);
      const xml = output();

      expect(result.exitCode).toBe(0);
      expect(xml.startsWith('<circular-types>')).toBe(true);
      expect(xml).toContain('<cycleCount>1</cycleCount>');
      expect(xml).toContain('<path>Node → Node</path>');
      expect(xml).not.toContain('\x1b[');
    });

    it('reports circular dependencies as colored text with --human', async () => {
      const output = captureOutput();

      await new DetectCircularTypesCommand().execute(['--human']);
      const text = output();

      expect(text).toContain('Circular Dependency Detection');
      expect(text).toContain('Node → Node');
      expect(text).toContain('\x1b[');
      expect(text).not.toContain('<circular-types>');
    });
  });
});
