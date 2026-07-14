/**
 * Immutable baseline snapshots and comparable coverage metric trends.
 *
 * @packageDocumentation
 * @doc [[Coverage Metrics Contract]]
 */

import { createHash } from 'node:crypto';
import type {
  CoverageMetricId,
  CoverageMetricResult,
  CoverageSourceIdentity,
} from './CoverageMetricContract';

export const COVERAGE_METRIC_BASELINE_CONTRACT_VERSION = '1.0' as const;

/** A complete identity for the input boundary used by a baseline. */
export interface CoverageMetricInputIdentity {
  readonly adapterId: string;
  readonly inputKind: CoverageSourceIdentity['inputKind'];
  readonly reportFormat: string;
  readonly workspaceId?: string;
  readonly graphRevisionId?: string;
  readonly graphFingerprint?: string;
}

/** Immutable metric snapshot used as a named comparison point. */
export interface CoverageMetricBaselineRevision {
  readonly contractVersion: typeof COVERAGE_METRIC_BASELINE_CONTRACT_VERSION;
  readonly baselineId: string;
  readonly workspaceId: string;
  readonly reportId?: string;
  readonly graphRevisionId?: string;
  readonly graphFingerprint?: string;
  readonly inputIdentity: CoverageMetricInputIdentity;
  readonly metrics: readonly CoverageMetricResult[];
  readonly capturedAt: string;
}

/** Input for creating a content-addressed baseline snapshot. */
export interface CreateCoverageMetricBaselineInput {
  readonly workspaceId: string;
  readonly reportId?: string;
  readonly graphRevisionId?: string;
  readonly graphFingerprint?: string;
  readonly metrics: readonly CoverageMetricResult[];
  readonly capturedAt?: string;
}

export type CoverageMetricComparisonStatus = 'improved' | 'declined' | 'unchanged' | 'uncomparable';

/** One metric's change from a baseline to a current observation. */
export interface CoverageMetricComparison {
  readonly metricId: CoverageMetricId;
  readonly status: CoverageMetricComparisonStatus;
  readonly baselineValue?: CoverageMetricResult['value'];
  readonly currentValue?: CoverageMetricResult['value'];
  readonly delta?: number;
  readonly reason?: string;
}

/** Result of comparing one current observation against a pinned baseline. */
export interface CoverageMetricBaselineComparison {
  readonly baselineId: string;
  readonly workspaceId: string;
  readonly inputIdentity: CoverageMetricInputIdentity;
  readonly comparisons: readonly CoverageMetricComparison[];
}

/** Current observation input for baseline comparison. */
export interface CoverageMetricComparisonInput {
  readonly workspaceId: string;
  readonly graphRevisionId?: string;
  readonly graphFingerprint?: string;
  readonly metrics: readonly CoverageMetricResult[];
}

/** Create a baseline whose identity is derived from its complete payload. */
export function createCoverageMetricBaseline(
  input: CreateCoverageMetricBaselineInput
): CoverageMetricBaselineRevision {
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const inputIdentity = createCoverageMetricInputIdentity(input.metrics, {
    workspaceId: input.workspaceId,
    graphRevisionId: input.graphRevisionId,
    graphFingerprint: input.graphFingerprint,
  });
  const baseline = {
    contractVersion: COVERAGE_METRIC_BASELINE_CONTRACT_VERSION,
    baselineId: '',
    workspaceId: input.workspaceId,
    ...(input.reportId ? { reportId: input.reportId } : {}),
    ...(input.graphRevisionId ? { graphRevisionId: input.graphRevisionId } : {}),
    ...(input.graphFingerprint ? { graphFingerprint: input.graphFingerprint } : {}),
    inputIdentity,
    metrics: input.metrics,
    capturedAt,
  } satisfies Omit<CoverageMetricBaselineRevision, 'baselineId'> & { baselineId: string };
  const baselineId = `coverage-baseline:sha256:${sha256(stableJson({ ...baseline, baselineId: undefined }))}`;
  return validateCoverageMetricBaseline({ ...baseline, baselineId });
}

/** Validate a baseline and recompute its content-addressed identity. */
export function validateCoverageMetricBaseline(
  baseline: CoverageMetricBaselineRevision
): CoverageMetricBaselineRevision {
  requiredText(baseline.baselineId, 'baselineId');
  requiredText(baseline.workspaceId, 'workspaceId');
  requiredText(baseline.capturedAt, 'capturedAt');
  if (baseline.metrics.length === 0) {
    throw new Error(`Coverage metric baseline has no metrics: ${baseline.baselineId}`);
  }
  const expectedInputIdentity = createCoverageMetricInputIdentity(baseline.metrics, {
    workspaceId: baseline.workspaceId,
    graphRevisionId: baseline.graphRevisionId,
    graphFingerprint: baseline.graphFingerprint,
  });
  if (stableJson(baseline.inputIdentity) !== stableJson(expectedInputIdentity)) {
    throw new Error(`Coverage metric baseline input identity mismatch: ${baseline.baselineId}`);
  }
  const metricIds = new Set<CoverageMetricId>();
  for (const metric of baseline.metrics) {
    if (metricIds.has(metric.metricId)) {
      throw new Error(`Coverage metric baseline has duplicate metric: ${metric.metricId}`);
    }
    metricIds.add(metric.metricId);
  }
  const expectedId = `coverage-baseline:sha256:${sha256(
    stableJson({ ...baseline, baselineId: undefined })
  )}`;
  if (baseline.baselineId !== expectedId) {
    throw new Error(`Coverage metric baseline identity mismatch: ${baseline.baselineId}`);
  }
  return baseline;
}

/** Compare metrics only when their input boundaries and units remain stable. */
export function compareCoverageMetricBaseline(
  baseline: CoverageMetricBaselineRevision,
  current: CoverageMetricComparisonInput
): CoverageMetricBaselineComparison {
  const validatedBaseline = validateCoverageMetricBaseline(baseline);
  requiredText(current.workspaceId, 'workspaceId');
  const currentInputIdentity = createCoverageMetricInputIdentity(current.metrics, {
    workspaceId: current.workspaceId,
    graphRevisionId: current.graphRevisionId,
    graphFingerprint: current.graphFingerprint,
  });
  const sameInput =
    current.workspaceId === validatedBaseline.workspaceId &&
    stableJson(currentInputIdentity) === stableJson(validatedBaseline.inputIdentity);
  const currentByMetric = new Map(current.metrics.map((metric) => [metric.metricId, metric]));

  return {
    baselineId: validatedBaseline.baselineId,
    workspaceId: validatedBaseline.workspaceId,
    inputIdentity: currentInputIdentity,
    comparisons: validatedBaseline.metrics.map((baselineMetric) => {
      const currentMetric = currentByMetric.get(baselineMetric.metricId);
      if (!sameInput) {
        return {
          metricId: baselineMetric.metricId,
          status: 'uncomparable',
          reason: 'Input identity changed between baseline and current observation',
        };
      }
      if (!currentMetric) {
        return {
          metricId: baselineMetric.metricId,
          status: 'uncomparable',
          baselineValue: baselineMetric.value,
          reason: 'Current observation does not contain this metric',
        };
      }
      if (baselineMetric.value.unit !== currentMetric.value.unit) {
        return {
          metricId: baselineMetric.metricId,
          status: 'uncomparable',
          baselineValue: baselineMetric.value,
          currentValue: currentMetric.value,
          reason: 'Metric units changed between baseline and current observation',
        };
      }
      const delta = currentMetric.value.ratio - baselineMetric.value.ratio;
      return {
        metricId: baselineMetric.metricId,
        status: delta > 0 ? 'improved' : delta < 0 ? 'declined' : 'unchanged',
        baselineValue: baselineMetric.value,
        currentValue: currentMetric.value,
        delta,
      };
    }),
  };
}

/** Derive the stable input boundary while intentionally ignoring report digest/time. */
export function createCoverageMetricInputIdentity(
  metrics: readonly CoverageMetricResult[],
  options: {
    readonly workspaceId: string;
    readonly graphRevisionId?: string;
    readonly graphFingerprint?: string;
  }
): CoverageMetricInputIdentity {
  if (metrics.length === 0) {
    throw new Error('Coverage metric input identity requires at least one metric');
  }
  const [first] = metrics;
  const identity = {
    adapterId: first.source.adapterId,
    inputKind: first.source.inputKind,
    reportFormat: first.source.reportFormat,
    ...(options.workspaceId ? { workspaceId: options.workspaceId } : {}),
    ...(options.graphRevisionId ? { graphRevisionId: options.graphRevisionId } : {}),
    ...(options.graphFingerprint ? { graphFingerprint: options.graphFingerprint } : {}),
  } satisfies CoverageMetricInputIdentity;
  for (const metric of metrics) {
    if (
      metric.source.adapterId !== identity.adapterId ||
      metric.source.inputKind !== identity.inputKind ||
      metric.source.reportFormat !== identity.reportFormat
    ) {
      throw new Error('Coverage metrics in one baseline must share an input identity');
    }
  }
  return identity;
}

function requiredText(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Coverage metric baseline ${field} must be non-empty`);
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }
  return value;
}
