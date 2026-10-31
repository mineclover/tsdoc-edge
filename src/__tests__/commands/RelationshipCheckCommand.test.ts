/**
 * Tests for RelationshipCheckCommand
 */

import { RelationshipCheckCommand } from '../../commands/RelationshipCheckCommand';

describe('RelationshipCheckCommand', () => {
  let command: RelationshipCheckCommand;

  beforeEach(() => {
    command = new RelationshipCheckCommand();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('relationship-check');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('supports options placed before symbol ID (e.g. --depth 2 <symbol>)', async () => {
      const executeJsonModeSpy = jest
        .spyOn(command as any, 'executeJsonMode')
        .mockResolvedValue({ success: true, exitCode: 0, message: 'JSON output complete' });

      const result = await command.execute(['--depth', '2', '--json', 'my-symbol']);

      expect(result.exitCode).toBe(0);
      expect(executeJsonModeSpy).toHaveBeenCalledWith('my-symbol', {
        depth: 2,
        category: undefined,
        json: true,
      });
    });

    it('supports --depth=N syntax before symbol ID', async () => {
      const executeJsonModeSpy = jest
        .spyOn(command as any, 'executeJsonMode')
        .mockResolvedValue({ success: true, exitCode: 0, message: 'JSON output complete' });

      const result = await command.execute(['--depth=5', '--json', 'my-symbol']);

      expect(result.exitCode).toBe(0);
      expect(executeJsonModeSpy).toHaveBeenCalledWith('my-symbol', {
        depth: 5,
        category: undefined,
        json: true,
      });
    });

    it('requires symbol ID when options passed without symbol', async () => {
      jest.spyOn(console, 'log').mockImplementation();
      const result = await command.execute(['--depth', '2']);
      expect(result.exitCode).toBe(0); // displayHelp exits with 0
    });
  });
});
