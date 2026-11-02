import { DataTraceCommand, RelationshipCommand, SymbolUnifiedCommand } from '../../commands';

describe('DataTraceCommand & Unified CLI Routing (symbol trace / relationship trace)', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('displays help when invoked with --help or no arguments', async () => {
    const cmd = new DataTraceCommand();
    const res = await cmd.execute(['--help']);
    expect(res.exitCode).toBe(0);
    const out = consoleLogSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(out).toContain('tsdoc-edge symbol trace <target>');
    expect(out).toContain('tsdoc-edge relationship trace <target>');
  });

  it('rejects unknown flags and invalid --tier or --depth options', async () => {
    const cmd = new DataTraceCommand();
    const unknownFlag = await cmd.execute(['SpecGraphRevision', '--not-a-flag']);
    expect(unknownFlag.exitCode).not.toBe(0);

    const badTier = await cmd.execute(['SpecGraphRevision', '--tier=invalid']);
    expect(badTier.exitCode).not.toBe(0);

    const badDepth = await cmd.execute(['SpecGraphRevision', '--depth=99']);
    expect(badDepth.exitCode).not.toBe(0);
  });

  it('rejects a value flag with no value', async () => {
    const cmd = new DataTraceCommand();
    const result = await cmd.execute(['OrderDto', '--tier']);
    expect(result.exitCode).not.toBe(0);
    expect(consoleLogSpy.mock.calls.flat().join(' ')).toContain('Missing value for --tier');
  });

  it('rejects non-integer depth values', async () => {
    const cmd = new DataTraceCommand();
    const result = await cmd.execute(['OrderDto', '--depth', '2.5']);
    expect(result.exitCode).not.toBe(0);
  });

  it('renders LLM Markdown when the target is missing', async () => {
    const cmd = new DataTraceCommand();
    const result = await cmd.execute(['DefinitelyMissingDataTraceTarget', '--llm']);
    expect(result.exitCode).not.toBe(0);
    expect(consoleLogSpy.mock.calls.map((c) => c.join(' ')).join('\n')).toContain('# Data Trace:');
  });

  it('routes through `symbol trace` and `relationship trace` and returns structured JSON', async () => {
    const symCmd = new SymbolUnifiedCommand();
    const symRes = await symCmd.execute([
      'trace',
      'SpecGraphRevision.bindings',
      '--tier=all',
      '--json',
    ]);
    expect(symRes.exitCode).toBe(0);
    const jsonOut = JSON.parse(consoleLogSpy.mock.calls.map((c) => c.join(' ')).join('\n'));
    expect(jsonOut).toMatchObject({
      status: 'found',
      query: {
        target: 'SpecGraphRevision.bindings',
        tier: 'all',
      },
    });

    consoleLogSpy.mockClear();
    const relCmd = new RelationshipCommand();
    const relRes = await relCmd.execute([
      'trace',
      'SpecExtractCommand.execute',
      'ConventionCheckCommand.execute',
      '--tier=type-flow',
      '--llm',
    ]);
    expect(relRes.exitCode).toBe(0);
    const out = consoleLogSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(out).toContain(
      '# Data Trace: SpecExtractCommand.execute -> ConventionCheckCommand.execute'
    );
  });
});
