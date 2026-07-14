type SpawnLike = (
  command: string,
  args: readonly string[],
  options: Record<string, unknown>
) => Record<string, unknown>;

const { spawnManaged } = require('../../../scripts/process-group.cjs') as {
  spawnManaged: (
    spawn: SpawnLike,
    command: string,
    args: readonly string[],
    options: Record<string, unknown>
  ) => Record<string, unknown>;
};

describe('process-group orchestration', () => {
  it('creates a detached group only at the orchestration boundary', () => {
    const spawn = jest.fn(
      (_command: string, _args: readonly string[], options: Record<string, unknown>) => options
    );

    const environment = { ...process.env };
    delete environment.TSDOC_EDGE_PROCESS_GROUP_OWNER;
    const options = spawnManaged(spawn, process.execPath, ['--version'], {
      env: environment,
      stdio: 'ignore',
    }) as Record<string, unknown>;

    expect(options.detached).toBe(process.platform !== 'win32');
    expect((options.env as Record<string, string>).TSDOC_EDGE_PROCESS_GROUP_OWNER).toBe('1');
  });

  it('keeps descendants in the existing group', () => {
    const spawn = jest.fn(
      (_command: string, _args: readonly string[], options: Record<string, unknown>) => options
    );

    const options = spawnManaged(spawn, process.execPath, ['--version'], {
      env: { ...process.env, TSDOC_EDGE_PROCESS_GROUP_OWNER: '1' },
      stdio: 'ignore',
    }) as Record<string, unknown>;

    expect(options.detached).toBe(false);
  });
});
