import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadJestJsonEvidence } from '../../convention';

describe('loadJestJsonEvidence', () => {
  const roots: string[] = [];

  afterEach(() => {
    while (roots.length) fs.rmSync(roots.pop()!, { recursive: true, force: true });
  });

  it('normalizes complete source-mapped Jest results without checkout paths', () => {
    const root = fixtureRoot();
    const artifact = writeArtifact(root, [
      { fullName: 'suite passes', status: 'passed', duration: 12 },
      { fullName: 'suite is pending', status: 'pending' },
      { fullName: 'suite fails', status: 'failed', failureMessages: ['expected true'] },
    ]);

    const evidence = loadJestJsonEvidence({
      artifactPath: artifact,
      workspaceRoot: root,
      workspaceId: 'fixture-workspace',
    });

    expect(evidence.provenance).toMatchObject({
      producerId: 'tsdoc-edge/jest-json-evidence-loader',
      producerVersion: '1.0.0',
    });
    expect(
      evidence.items.map((item) => item.kind === 'test-evidence' && item.status).sort()
    ).toEqual(['failed', 'passed', 'skipped']);
    expect(JSON.stringify(evidence)).not.toContain(root);
    expect(
      evidence.items.find(
        (item) => item.kind === 'test-evidence' && item.testName === 'suite passes'
      )
    ).toMatchObject({
      runner: 'jest',
      subjectFiles: [],
      source: { file: 'src/example.test.ts' },
    });
  });

  it.each([
    ['aggregate mismatch', (report: Record<string, unknown>) => ({ ...report, numTotalTests: 99 })],
    [
      'runtime suite error',
      (report: Record<string, unknown>) => ({
        ...report,
        testResults: [
          { ...(report.testResults as object[])[0], testExecError: { message: 'boom' } },
        ],
      }),
    ],
  ])('rejects %s as input error', (_label, mutate) => {
    const root = fixtureRoot();
    const artifact = writeArtifact(root, [{ fullName: 'suite passes', status: 'passed' }], mutate);
    expect(() =>
      loadJestJsonEvidence({
        artifactPath: artifact,
        workspaceRoot: root,
        workspaceId: 'fixture-workspace',
      })
    ).toThrow(/aggregate mismatch|testExecError/);
  });

  it('rejects a source map whose recorded source bytes differ from authored TypeScript', () => {
    const root = fixtureRoot();
    const artifact = writeArtifact(root, [{ fullName: 'suite passes', status: 'passed' }]);
    const map = path.join(root, '.test-dist', 'example.test.js.map');
    const parsed = JSON.parse(fs.readFileSync(map, 'utf8')) as Record<string, unknown>;
    parsed.sourcesContent = ['export const changed = true;\n'];
    fs.writeFileSync(map, JSON.stringify(parsed));
    expect(() =>
      loadJestJsonEvidence({
        artifactPath: artifact,
        workspaceRoot: root,
        workspaceId: 'fixture-workspace',
      })
    ).toThrow('sourcesContent does not match');
  });

  function fixtureRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdoc-jest-evidence-'));
    roots.push(root);
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.mkdirSync(path.join(root, '.test-dist'), { recursive: true });
    const source = 'export const example = true;\n';
    fs.writeFileSync(path.join(root, 'src', 'example.test.ts'), source);
    fs.writeFileSync(path.join(root, '.test-dist', 'example.test.js'), 'exports.example = true;\n');
    fs.writeFileSync(
      path.join(root, '.test-dist', 'example.test.js.map'),
      JSON.stringify({ version: 3, sources: ['../src/example.test.ts'], sourcesContent: [source] })
    );
    return root;
  }

  function writeArtifact(
    root: string,
    assertions: readonly Record<string, unknown>[],
    mutate: (report: Record<string, unknown>) => Record<string, unknown> = (report) => report
  ): string {
    const count = (status: string) =>
      assertions.filter((assertion) => assertion.status === status).length;
    const report = mutate({
      success: count('failed') === 0,
      numPassedTests: count('passed'),
      numFailedTests: count('failed'),
      numPendingTests: count('pending'),
      numTodoTests: count('todo'),
      numTotalTests: assertions.length,
      testResults: [
        {
          name: path.join(root, '.test-dist', 'example.test.js'),
          endTime: 0,
          assertionResults: assertions,
        },
      ],
    });
    const artifact = path.join(root, 'jest.json');
    fs.writeFileSync(artifact, JSON.stringify(report));
    return artifact;
  }
});
