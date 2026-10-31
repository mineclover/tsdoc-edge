/**
 * SpecMetricsCommand tests
 * @public
 */

import { SpecMetricsCommand } from '../../commands/SpecMetricsCommand';

describe('SpecMetricsCommand', () => {
  let command: SpecMetricsCommand;

  beforeEach(() => {
    command = new SpecMetricsCommand();
  });

  it('should have correct name and aliases', () => {
    expect(command.getName()).toBe('spec-metrics');
    expect(command.getAlias()).toContain('sp-metrics');
    expect(command.getAlias()).toContain('sp-m');
  });

  it('should display help when --help flag is provided', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const result = await command.execute(['--help']);

    expect(result.exitCode).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('tsdoc-edge spec-metrics'));
    consoleSpy.mockRestore();
  });

  it('should output JSON when --json flag is provided', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const result = await command.execute(['--json', '--dir', 'managed/specs']);

    expect(result.exitCode).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]?.[0];
    const parsed = JSON.parse(output);

    expect(parsed.healthScore).toBeDefined();
    expect(parsed.documentQuality).toBeDefined();
    expect(parsed.lifecycle).toBeDefined();
    expect(parsed.specGraph.conformanceEvaluated).toBe(false);
    expect(parsed.module7Aspects).toBeDefined();
    expect(parsed.codeConnectivity).toBeDefined();

    consoleSpy.mockRestore();
  });

  it('should execute dashboard display without flags', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const result = await command.execute(['--dir', 'managed/specs']);

    expect(result.exitCode).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Specification Metrics (managed/specs)')
    );
    consoleSpy.mockRestore();
  });
});
