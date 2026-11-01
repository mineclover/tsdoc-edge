/**
 * ValidateTsdocCommand tests
 * @public
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ValidateTsdocCommand } from '../../commands/ValidateTsdocCommand';

describe('ValidateTsdocCommand', () => {
  let command: ValidateTsdocCommand;

  beforeEach(() => {
    command = new ValidateTsdocCommand();
  });

  it('should have correct name and aliases', () => {
    expect(command.getName()).toBe('validate-tsdoc');
    expect(command.getAlias()).toContain('tsdoc-val');
    expect(command.getAlias()).toContain('tsdoc-validate');
  });

  it('should display help when --help flag is provided', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const result = await command.execute(['--help']);

    expect(result.exitCode).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('tsdoc-edge validate-tsdoc'));
    consoleSpy.mockRestore();
  });

  it('should validate tsdoc.json and report JSON when --json is provided', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const result = await command.execute(['--json', 'src/storage']);

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]?.[0];
    const parsed = JSON.parse(output);

    expect(parsed.tsdocConfig).toBeDefined();
    expect(parsed.tsdocConfig.valid).toBe(true);
    expect(parsed.filesScanned).toBeGreaterThan(0);
    expect(parsed.commentsScanned).toBeGreaterThan(0);
    expect(Array.isArray(parsed.issues)).toBe(true);
    expect(result.exitCode).toBe(0);

    consoleSpy.mockRestore();
  });

  it('should fail when target path does not exist', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const result = await command.execute(['non-existent-directory']);

    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('Target path does not exist');
    consoleSpy.mockRestore();
  });

  it('should auto-fix or update tsdoc.json when --fix is provided', async () => {
    const tempConfigPath = path.join(process.cwd(), '.temp.test.tsdoc.json');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    try {
      const result = await command.execute(['--config', tempConfigPath, '--fix', 'src/utils']);

      expect(fs.existsSync(tempConfigPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(tempConfigPath, 'utf-8'));
      expect(content.$schema).toContain('tsdoc.schema.json');
      expect(content.tagDefinitions).toHaveLength(22);
      expect(result.exitCode).toBe(0);
    } finally {
      if (fs.existsSync(tempConfigPath)) {
        fs.unlinkSync(tempConfigPath);
      }
      consoleSpy.mockRestore();
    }
  });
});
