type RunEvidence = {
  workflowName: string;
  status: string;
  conclusion: string;
  headSha: string;
  jobs: Array<{ name: string; status: string; conclusion: string }>;
};

const { validateRun } = require('../../../scripts/verify-release-matrix.cjs') as {
  validateRun: (run: RunEvidence, expectedSha?: string) => void;
};

describe('release matrix verifier', () => {
  it('accepts the complete CI matrix and publish check', () => {
    expect(() => validateRun(createRun(), 'candidate-sha')).not.toThrow();
  });

  it('rejects an incomplete matrix', () => {
    const run = createRun();
    run.jobs = run.jobs.filter((job) => !job.name.includes('macos-15-intel, --maxWorkers=2, 2'));

    expect(() => validateRun(run, 'candidate-sha')).toThrow('Expected 8 test jobs');
  });

  it('rejects a failed matrix job', () => {
    const run = createRun();
    run.jobs.find((job) => job.name === 'test (ubuntu-latest, --runInBand, 1)')!.conclusion =
      'failure';

    expect(() => validateRun(run, 'candidate-sha')).toThrow('Matrix job did not pass');
  });

  it('rejects a run from another candidate revision', () => {
    expect(() => validateRun(createRun(), 'different-sha')).toThrow('does not match expected SHA');
  });
});

function createRun(): RunEvidence {
  const jobs: Array<{ name: string; status: string; conclusion: string }> = [];
  for (const operatingSystem of ['ubuntu-latest', 'macos-15-intel']) {
    for (const execution of ['--runInBand', '--maxWorkers=2']) {
      for (const attempt of [1, 2]) {
        jobs.push({
          name: `test (${operatingSystem}, ${execution}, ${attempt})`,
          status: 'completed',
          conclusion: 'success',
        });
      }
    }
  }
  jobs.push({ name: 'publish-check', status: 'completed', conclusion: 'success' });
  return {
    workflowName: 'CI',
    status: 'completed',
    conclusion: 'success',
    headSha: 'candidate-sha',
    jobs,
  };
}
