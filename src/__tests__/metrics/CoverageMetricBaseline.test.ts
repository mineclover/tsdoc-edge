import {
  compareCoverageMetricBaseline,
  createCoverageMetricBaseline,
} from '../../metrics/CoverageMetricBaseline';
import {
  createCoverageMetricResult,
  createCoverageSourceIdentity,
} from '../../metrics/CoverageMetricContract';

describe('CoverageMetricBaseline', () => {
  it('compares compatible metrics while ignoring report digest changes', () => {
    const baselineSource = createCoverageSourceIdentity('coverage-final.json', '{"run":1}', {
      workspaceId: 'workspace',
    });
    const currentSource = createCoverageSourceIdentity('coverage-final.json', '{"run":2}', {
      workspaceId: 'workspace',
    });
    const baseline = createCoverageMetricBaseline({
      workspaceId: 'workspace',
      metrics: [createCoverageMetricResult(baselineSource, 'execution.line', 3, 4)],
      capturedAt: '2026-07-14T00:00:00.000Z',
    });

    expect(
      compareCoverageMetricBaseline(baseline, {
        workspaceId: 'workspace',
        metrics: [createCoverageMetricResult(currentSource, 'execution.line', 4, 4)],
      })
    ).toMatchObject({
      comparisons: [
        {
          metricId: 'execution.line',
          status: 'improved',
          delta: 0.25,
        },
      ],
    });
  });

  it('marks graph revision changes as uncomparable', () => {
    const source = createCoverageSourceIdentity('coverage-final.json', '{}', {
      workspaceId: 'workspace',
    });
    const baseline = createCoverageMetricBaseline({
      workspaceId: 'workspace',
      graphRevisionId: 'revision-a',
      graphFingerprint: 'fingerprint-a',
      metrics: [createCoverageMetricResult(source, 'execution.function', 1, 2)],
    });

    expect(
      compareCoverageMetricBaseline(baseline, {
        workspaceId: 'workspace',
        graphRevisionId: 'revision-b',
        graphFingerprint: 'fingerprint-b',
        metrics: [createCoverageMetricResult(source, 'execution.function', 2, 2)],
      }).comparisons[0]
    ).toMatchObject({
      status: 'uncomparable',
      reason: 'Input identity changed between baseline and current observation',
    });
  });

  it('marks missing and unchanged metrics explicitly', () => {
    const source = createCoverageSourceIdentity('coverage-final.json', '{}', {
      workspaceId: 'workspace',
    });
    const baseline = createCoverageMetricBaseline({
      workspaceId: 'workspace',
      metrics: [
        createCoverageMetricResult(source, 'execution.line', 1, 2),
        createCoverageMetricResult(source, 'execution.branch', 1, 1),
      ],
    });

    const comparison = compareCoverageMetricBaseline(baseline, {
      workspaceId: 'workspace',
      metrics: [createCoverageMetricResult(source, 'execution.line', 1, 2)],
    });

    expect(comparison.comparisons).toMatchObject([
      { metricId: 'execution.line', status: 'unchanged', delta: 0 },
      {
        metricId: 'execution.branch',
        status: 'uncomparable',
        reason: 'Current observation does not contain this metric',
      },
    ]);
  });
});
