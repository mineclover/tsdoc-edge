import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

type RunEvidence = {
  workflowName: string;
  status: string;
  conclusion: string;
  headSha: string;
  jobs: Array<{ name: string; status: string; conclusion: string }>;
};

describe('capability owner matrix verifier', () => {
  let temporaryDirectory: string;

  beforeEach(() => {
    temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'tsdoc-edge-capability-owner-matrix-')
    );
  });

  afterEach(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('validates the checked-in promoted C2 owner matrix and its pinned external run evidence', () => {
    const result = runVerifier([]);

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout) as {
      status: string;
      ownerPromotionEligible: boolean;
      failureCanariesPassed: number;
      promotionEvidence: { contractId: string; runId: string; headSha: string };
    };
    expect(output).toMatchObject({
      status: 'promoted',
      ownerPromotionEligible: true,
      failureCanariesPassed: 10,
      promotionEvidence: {
        contractId: 'tsdoc-edge/release-matrix-evidence',
        runId: '29381030071',
        headSha: '72921c748b0cd8c70d66466c9421a8d295bbdd1a',
      },
    });
  });

  it('promotes a candidate matrix only when external matrix evidence passes', () => {
    const candidateMatrixPath = path.join(temporaryDirectory, 'candidate-matrix.json');
    const checkedInMatrix = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), 'scripts/fixtures/capability-owner-matrix.v1.json'),
        'utf8'
      )
    ) as Record<string, unknown>;
    delete checkedInMatrix.promotionEvidence;
    checkedInMatrix.status = 'candidate';
    fs.writeFileSync(candidateMatrixPath, JSON.stringify(checkedInMatrix, null, 2));

    const withoutExternal = runVerifier(['--matrix', candidateMatrixPath]);
    expect(withoutExternal.status).toBe(0);
    expect(JSON.parse(withoutExternal.stdout)).toMatchObject({
      status: 'candidate',
      ownerPromotionEligible: false,
      failureCanariesPassed: 9,
    });

    const inputPath = path.join(temporaryDirectory, 'release-run.json');
    fs.writeFileSync(inputPath, JSON.stringify(createRun()));

    const result = runVerifier([
      '--matrix',
      candidateMatrixPath,
      '--external-matrix-input',
      inputPath,
      '--external-matrix-sha',
      'candidate-sha',
    ]);

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout) as {
      status: string;
      ownerPromotionEligible: boolean;
      externalMatrixEvidence: { contractId: string; headSha: string };
    };
    expect(output).toMatchObject({
      status: 'candidate',
      ownerPromotionEligible: true,
      externalMatrixEvidence: {
        contractId: 'tsdoc-edge/release-matrix-evidence',
        headSha: 'candidate-sha',
      },
    });
  });

  it('rejects a promoted matrix that lacks promotionEvidence', () => {
    const invalidPromotedPath = path.join(temporaryDirectory, 'invalid-promoted-matrix.json');
    const checkedInMatrix = JSON.parse(
      fs.readFileSync(
        path.resolve(process.cwd(), 'scripts/fixtures/capability-owner-matrix.v1.json'),
        'utf8'
      )
    ) as Record<string, unknown>;
    delete checkedInMatrix.promotionEvidence;
    checkedInMatrix.status = 'promoted';
    fs.writeFileSync(invalidPromotedPath, JSON.stringify(checkedInMatrix, null, 2));

    const result = runVerifier(['--matrix', invalidPromotedPath]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Promoted capability owner matrix requires promotionEvidence');
  });

  it('rejects external evidence from another candidate revision', () => {
    const inputPath = path.join(temporaryDirectory, 'release-run.json');
    fs.writeFileSync(inputPath, JSON.stringify(createRun()));

    const result = runVerifier([
      '--external-matrix-input',
      inputPath,
      '--external-matrix-sha',
      'different-sha',
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('does not match expected SHA');
  });
});

function runVerifier(arguments_: string[]): childProcess.SpawnSyncReturns<string> {
  return childProcess.spawnSync(
    process.execPath,
    [path.resolve(process.cwd(), 'scripts/verify-capability-owner-matrix.cjs'), ...arguments_],
    { cwd: process.cwd(), encoding: 'utf8' }
  );
}

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
