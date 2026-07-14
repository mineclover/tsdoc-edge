/** Bind coverage metric gate eligibility to the revision-pinned convention result. */

import { createHash } from 'node:crypto';
import type { CoverageMetricId, CoverageMetricResult } from '../metrics/CoverageMetricContract';
import {
  type CoverageMetricGateDecision,
  type CoverageMetricGateRequest,
  resolveCoverageMetricGate,
} from '../metrics/CoverageMetricGate';

export const COVERAGE_METRIC_POLICY_CONTRACT_VERSION = '1.0' as const;

export interface CoverageMetricPolicyInput {
  readonly reportId: string;
  readonly graphRevisionId: string;
  readonly graphFingerprint: string;
  readonly requestedGate: CoverageMetricGateRequest;
  readonly metrics: readonly CoverageMetricResult[];
  readonly thresholds?: readonly CoverageMetricPolicyThreshold[];
}

/** Minimum ratio requested for one metric ID; values are fractions from 0 to 1. */
export interface CoverageMetricPolicyThreshold {
  readonly metricId: CoverageMetricId;
  readonly minimum: number;
}

export interface CoverageMetricPolicyMetric {
  readonly metric: CoverageMetricResult;
  readonly decision: CoverageMetricGateDecision;
}

/** A convention finding emitted when requested metric gate evidence is unsupported. */
export interface CoverageMetricPolicyFinding {
  readonly findingId: string;
  readonly ruleId: 'coverage.metric-gate';
  readonly metricId: CoverageMetricResult['metricId'];
  readonly severity: 'error' | 'warning' | 'info';
  readonly outcome: 'satisfied' | 'violated' | 'indeterminate';
  readonly threshold?: number;
  readonly actualRatio?: number;
  readonly message: string;
}

export interface CoverageMetricPolicyReport {
  readonly contractVersion: typeof COVERAGE_METRIC_POLICY_CONTRACT_VERSION;
  readonly reportId: string;
  readonly graphRevisionId: string;
  readonly graphFingerprint: string;
  readonly requestedGate: CoverageMetricGateRequest;
  readonly thresholds: readonly CoverageMetricPolicyThreshold[];
  readonly metrics: readonly CoverageMetricPolicyMetric[];
  readonly findings: readonly CoverageMetricPolicyFinding[];
}

/** Evaluate gate eligibility and explicit ratio thresholds without weakening evidence semantics. */
export function evaluateCoverageMetricPolicy(
  input: CoverageMetricPolicyInput
): CoverageMetricPolicyReport {
  if (input.metrics.length === 0) {
    throw new Error(`Coverage metric policy has no metrics: ${input.reportId}`);
  }
  const context = {
    graphRevisionId: input.graphRevisionId,
    graphFingerprint: input.graphFingerprint,
    requestedGate: input.requestedGate,
  } as const;
  const thresholds = normalizeThresholds(input.thresholds ?? []);
  const policyIdentity = { ...input, thresholds };
  const thresholdByMetricId = new Map(
    thresholds.map((threshold) => [threshold.metricId, threshold])
  );
  const metrics = input.metrics.map((metric) => ({
    metric,
    decision: resolveCoverageMetricGate(metric, context),
  }));
  const severity = severityFor(input.requestedGate);
  const findings: CoverageMetricPolicyFinding[] = metrics.flatMap(
    ({ metric, decision }): CoverageMetricPolicyFinding[] => {
      const threshold = thresholdByMetricId.get(metric.metricId);
      if (!decision.eligible) {
        const message = `Coverage metric ${metric.metricId} cannot enter ${input.requestedGate} gate: ${decision.reason}`;
        return [
          {
            findingId: `coverage-finding:${sha256(
              JSON.stringify({ policyIdentity, metricId: metric.metricId, decision })
            )}`,
            ruleId: 'coverage.metric-gate' as const,
            metricId: metric.metricId,
            severity,
            outcome: 'indeterminate' as const,
            ...(threshold ? { threshold: threshold.minimum } : {}),
            message,
          },
        ];
      }
      if (threshold && metric.value.ratio < threshold.minimum) {
        return [
          {
            findingId: `coverage-finding:${sha256(
              JSON.stringify({ policyIdentity, metricId: metric.metricId, threshold, metric })
            )}`,
            ruleId: 'coverage.metric-gate' as const,
            metricId: metric.metricId,
            severity,
            outcome: 'violated' as const,
            threshold: threshold.minimum,
            actualRatio: metric.value.ratio,
            message: `Coverage metric ${metric.metricId} is ${metric.value.ratio.toFixed(4)}, below the minimum ${threshold.minimum.toFixed(4)}`,
          },
        ];
      }
      return [];
    }
  );
  return Object.freeze({
    contractVersion: COVERAGE_METRIC_POLICY_CONTRACT_VERSION,
    reportId: input.reportId,
    graphRevisionId: input.graphRevisionId,
    graphFingerprint: input.graphFingerprint,
    requestedGate: input.requestedGate,
    thresholds,
    metrics: Object.freeze(metrics),
    findings: Object.freeze(findings),
  });
}

/** Parse the CLI form `metric.id=0.8,other.metric=0.9` into canonical thresholds. */
export function parseCoverageMetricThresholds(
  value: string
): readonly CoverageMetricPolicyThreshold[] {
  if (!value.trim()) throw new Error('Coverage metric thresholds must not be empty');
  return normalizeThresholds(
    value.split(',').map((entry) => {
      const separator = entry.indexOf('=');
      const metricId = entry.slice(0, separator).trim();
      const rawMinimum = entry.slice(separator + 1).trim();
      if (separator <= 0 || !metricId || !rawMinimum) {
        throw new Error(`Coverage threshold must use metric.id=value: ${entry}`);
      }
      return {
        metricId: metricId as CoverageMetricId,
        minimum: Number(rawMinimum),
      };
    })
  );
}

function normalizeThresholds(
  thresholds: readonly CoverageMetricPolicyThreshold[]
): readonly CoverageMetricPolicyThreshold[] {
  const validMetricIds = new Set<CoverageMetricId>([
    'execution.line',
    'execution.function',
    'execution.branch',
    'test.symbol',
    'test.scenario',
    'test.integration',
    'documentation.symbol',
    'quality.health',
    'relationship.type',
    'graph.policy',
  ]);
  const seen = new Set<CoverageMetricId>();
  return Object.freeze(
    [...thresholds]
      .map((threshold) => {
        if (!validMetricIds.has(threshold.metricId)) {
          throw new Error(`Unsupported coverage metric threshold: ${threshold.metricId}`);
        }
        if (!Number.isFinite(threshold.minimum) || threshold.minimum < 0 || threshold.minimum > 1) {
          throw new Error(
            `Coverage threshold must be a number between 0 and 1: ${threshold.metricId}`
          );
        }
        if (seen.has(threshold.metricId)) {
          throw new Error(`Duplicate coverage metric threshold: ${threshold.metricId}`);
        }
        seen.add(threshold.metricId);
        return Object.freeze({ metricId: threshold.metricId, minimum: threshold.minimum });
      })
      .sort((left, right) => left.metricId.localeCompare(right.metricId))
  );
}

function severityFor(gate: CoverageMetricGateRequest): 'error' | 'warning' | 'info' {
  return gate === 'error' ? 'error' : gate === 'warning' ? 'warning' : 'info';
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
