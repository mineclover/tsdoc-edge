import {
  createCoverageMetricResult,
  createCoverageSourceIdentity,
} from '../../metrics/CoverageMetricContract';
import {
  applyCoverageMetricGate,
  resolveCoverageMetricGate,
} from '../../metrics/CoverageMetricGate';

describe('CoverageMetricGate', () => {
  const source = createCoverageSourceIdentity('coverage-final.json', '{}');
  const context = {
    graphRevisionId: 'canonical-revision:fixture',
    graphFingerprint: 'sha256:fixture',
    requestedGate: 'warning' as const,
  };

  it('promotes direct evidence when graph identity is complete', () => {
    const metric = createCoverageMetricResult(source, 'execution.function', 1, 1, {
      status: 'direct',
    });

    expect(resolveCoverageMetricGate(metric, context)).toMatchObject({
      eligible: true,
      effectiveGate: 'warning',
    });
    expect(applyCoverageMetricGate(metric, context).policy.gate).toBe('warning');
  });

  it('rejects inferred evidence from a warning or error gate', () => {
    const metric = createCoverageMetricResult(source, 'execution.line', 1, 1, {
      status: 'inferred',
    });

    expect(resolveCoverageMetricGate(metric, context)).toMatchObject({
      eligible: false,
      effectiveGate: 'unsupported',
    });
    expect(applyCoverageMetricGate(metric, context).policy.gate).toBe('unsupported');
  });

  it('requires graph identity for a non-report-only gate', () => {
    const metric = createCoverageMetricResult(source, 'execution.function', 1, 1, {
      status: 'direct',
    });

    expect(
      resolveCoverageMetricGate(metric, {
        ...context,
        graphRevisionId: '',
      })
    ).toMatchObject({ eligible: false, effectiveGate: 'unsupported' });
  });

  it('keeps report-only metrics eligible without graph identity', () => {
    const metric = createCoverageMetricResult(source, 'execution.line', 1, 1, {
      status: 'inferred',
    });

    expect(
      resolveCoverageMetricGate(metric, {
        graphRevisionId: '',
        graphFingerprint: '',
        requestedGate: 'report-only',
      })
    ).toMatchObject({ eligible: true, effectiveGate: 'report-only' });
  });
});
