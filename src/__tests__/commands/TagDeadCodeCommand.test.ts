/**
 * Tests for TagDeadCodeCommand
 */

import { TagDeadCodeCommand } from '../../commands/TagDeadCodeCommand';
import type { DatabaseManager } from '../../storage/DatabaseManager';

describe('TagDeadCodeCommand', () => {
  let command: TagDeadCodeCommand;
  let mockDb: Partial<DatabaseManager>;

  beforeEach(() => {
    mockDb = {
      getAllSymbols: jest.fn().mockResolvedValue([]),
      countIncomingCalls: jest.fn().mockReturnValue(0),
      countIncomingReferences: jest.fn().mockReturnValue(0),
      getCallerFilePaths: jest.fn().mockReturnValue([]),
      close: jest.fn(),
    };
    command = new TagDeadCodeCommand(mockDb as unknown as DatabaseManager);
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('tag-dead-code');
    });

    it('should return command description', () => {
      expect(command.getDescription()).toContain('Annotate');
    });
  });

  describe('execute', () => {
    it('should display help with --help flag', async () => {
      const result = await command.execute(['--help']);
      expect(result.exitCode).toBe(0);
    });

    it('should forward arguments with --tag defaulted when neither --tag nor --untag is provided', async () => {
      const detectorSpy = jest
        .spyOn(command.detector, 'execute')
        .mockResolvedValue({ exitCode: 0 });

      const result = await command.execute(['src/sample', '--dry-run']);
      expect(result.exitCode).toBe(0);
      expect(detectorSpy).toHaveBeenCalledWith(['src/sample', '--dry-run', '--tag']);
      detectorSpy.mockRestore();
    });

    it('should preserve --untag when explicitly supplied', async () => {
      const detectorSpy = jest
        .spyOn(command.detector, 'execute')
        .mockResolvedValue({ exitCode: 0 });

      const result = await command.execute(['src/sample', '--untag']);
      expect(result.exitCode).toBe(0);
      expect(detectorSpy).toHaveBeenCalledWith(['src/sample', '--untag']);
      detectorSpy.mockRestore();
    });
  });
});
