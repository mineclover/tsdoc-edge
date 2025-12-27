/**
 * Tests for CoverageReportCommand
 */

import { CoverageReportCommand } from '../../commands/CoverageReportCommand';

describe('CoverageReportCommand', () => {
  let command: CoverageReportCommand;

  beforeEach(() => {
    command = new CoverageReportCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('coverage-report');
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
  });
});
