import {
  evaluateCoverageMetricPolicy,
  parseCoverageMetricThresholds,
} from '../../convention/CoverageMetricPolicy';
import {
  createCoverageMetricResult,
  createCoverageSourceIdentity,
} from '../../metrics/CoverageMetricContract';

describe('CoverageMetricPolicy', () => {
  const source = createCoverageSourceIdentity('coverage-final.json', '{"fixture":true}');
  const context = {
    reportId: 'coverage-report:fixture',
    graphRevisionId: 'canonical-revision:fixture',
    graphFingerprint: 'sha256:fixture',
    requestedGate: 'error' as const,
  };

  it('keeps direct evidence eligible for an error gate', () => {
    const report = evaluateCoverageMetricPolicy({
      ...context,
      metrics: [createCoverageMetricResult(source, 'execution.line', 4, 4)],
    });

    expect(report).toMatchObject({
      contractVersion: '1.0',
      reportId: context.reportId,
      requestedGate: 'error',
      findings: [],
    });
    expect(report.metrics[0]?.decision).toMatchObject({
      eligible: true,
      effectiveGate: 'error',
    });
  });

  it('emits an indeterminate finding for inferred evidence instead of promoting it', () => {
    const report = evaluateCoverageMetricPolicy({
      ...context,
      requestedGate: 'warning',
      metrics: [
        createCoverageMetricResult(source, 'execution.line', 4, 4, {
          status: 'inferred',
        }),
      ],
    });

    expect(report.findings).toMatchObject([
      {
        ruleId: 'coverage.metric-gate',
        metricId: 'execution.line',
        severity: 'warning',
        outcome: 'indeterminate',
      },
    ]);
    expect(report.metrics[0]?.decision).toMatchObject({
      eligible: false,
      effectiveGate: 'unsupported',
    });
  });

  it('rejects an empty report because a gate must have explicit metric evidence', () => {
    expect(() => evaluateCoverageMetricPolicy({ ...context, metrics: [] })).toThrow(
      'has no metrics'
    );
  });

  it('enforces explicit direct-evidence ratio thresholds', () => {
    const report = evaluateCoverageMetricPolicy({
      ...context,
      thresholds: parseCoverageMetricThresholds('execution.line=0.8'),
      metrics: [createCoverageMetricResult(source, 'execution.line', 3, 4)],
    });

    expect(report.thresholds).toEqual([{ metricId: 'execution.line', minimum: 0.8 }]);
    expect(report.findings).toMatchObject([
      {
        metricId: 'execution.line',
        outcome: 'violated',
        threshold: 0.8,
        actualRatio: 0.75,
      },
    ]);
  });

  it('keeps threshold evaluation indeterminate when evidence is not direct', () => {
    const report = evaluateCoverageMetricPolicy({
      ...context,
      thresholds: [{ metricId: 'execution.line', minimum: 0.8 }],
      metrics: [
        createCoverageMetricResult(source, 'execution.line', 4, 4, {
          status: 'inferred',
        }),
      ],
    });

    expect(report.findings).toMatchObject([
      {
        metricId: 'execution.line',
        outcome: 'indeterminate',
        threshold: 0.8,
      },
    ]);
  });

  it('rejects malformed, duplicate, and out-of-range threshold declarations', () => {
    expect(() => parseCoverageMetricThresholds('execution.line')).toThrow('metric.id=value');
    expect(() => parseCoverageMetricThresholds('execution.line=1.1')).toThrow('between 0 and 1');
    expect(() => parseCoverageMetricThresholds('execution.line=0.8,execution.line=0.9')).toThrow(
      'Duplicate'
    );
  });
});
