/**
 * Tests for ImproveCommand
 */

import { ImproveCommand } from '../../commands/ImproveCommand';

type ImproverResult = {
  initialScore: number;
  finalScore: number;
  iterations: number;
  filesModified: number;
  symbolsFixed: number;
};

describe('ImproveCommand', () => {
  let command: ImproveCommand;

  beforeEach(() => {
    command = new ImproveCommand();
  });

  describe('metadata', () => {
    it('should return command name', () => {
      expect(command.getName()).toBe('improve');
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

  describe('output format', () => {
    const result: ImproverResult = {
      initialScore: 50,
      finalScore: 85,
      iterations: 2,
      filesModified: 3,
      symbolsFixed: 7,
    };

    const useImprover = (improve: jest.Mock): void => {
      (command as unknown as { improver: { improve: jest.Mock } }).improver = { improve };
    };

    const run = async (
      args: string[]
    ): Promise<{ output: string; exitCode: number; errors: string }> => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const commandResult = await command.execute(args);
      return {
        output: log.mock.calls.map((call) => call.join(' ')).join('\n'),
        errors: error.mock.calls.map((call) => call.join(' ')).join('\n'),
        exitCode: commandResult.exitCode,
      };
    };

    it('prints only an XML document by default', async () => {
      const improve = jest.fn().mockReturnValue(result);
      useImprover(improve);

      const { output, exitCode } = await run(['--target=80', '--dry-run']);

      expect(exitCode).toBe(0);
      expect(improve).toHaveBeenCalledWith(
        expect.objectContaining({ targetScore: 80, dryRun: true })
      );
      expect(output.startsWith('<recursive-improvement>')).toBe(true);
      expect(output.endsWith('</recursive-improvement>')).toBe(true);
      expect(output).toContain('<finalScore>85</finalScore>');
      expect(output).toContain('<improvement>35</improvement>');
      expect(output).toContain('<targetReached>true</targetReached>');
      expect(output).not.toContain('\x1b[');
    });

    it('keeps the non-zero exit code when the target is not reached', async () => {
      useImprover(jest.fn().mockReturnValue({ ...result, finalScore: 60 }));

      const { output, exitCode } = await run(['--target=80']);

      expect(exitCode).toBe(1);
      expect(output).toContain('<targetReached>false</targetReached>');
    });

    it('keeps --verbose progress off stdout so the XML stays well-formed', async () => {
      useImprover(
        jest.fn().mockImplementation(() => {
          console.log('Iteration 1 progress');
          return result;
        })
      );

      const { output, errors } = await run(['--verbose']);

      expect(output).not.toContain('Iteration 1 progress');
      expect(errors).toContain('Iteration 1 progress');
      expect(output.startsWith('<recursive-improvement>')).toBe(true);
    });

    it('prints the colored report with --human', async () => {
      useImprover(jest.fn().mockReturnValue(result));

      const { output, exitCode } = await run(['--human']);

      expect(exitCode).toBe(0);
      expect(output).toContain('TSDoc Edge - Recursive Improvement');
      expect(output).toContain('Target score reached!');
      expect(output).toContain('\x1b[');
      expect(output).not.toContain('<recursive-improvement>');
    });
  });
});
