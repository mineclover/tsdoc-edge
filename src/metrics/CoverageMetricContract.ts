/**
 * Versioned coverage metric contracts and source identity helpers.
 *
 * @packageDocumentation
 * @doc [[Coverage Metrics Contract]]
 */

import { createHash } from 'node:crypto';
import * as path from 'node:path';

export const COVERAGE_METRIC_CONTRACT_ID = 'tsdoc-edge/coverage-metric-result' as const;
export const COVERAGE_METRIC_CONTRACT_VERSION = '1.0' as const;

/** Metric IDs owned by the coverage contract. */
export type CoverageMetricId =
  | 'execution.line'
  | 'execution.function'
  | 'execution.branch'
  | 'test.symbol'
  | 'test.scenario'
  | 'test.integration'
  | 'documentation.symbol'
  | 'quality.health'
  | 'relationship.type'
  | 'graph.policy';

/** Input classes must not be mixed when comparing metric results. */
export type CoverageMetricInputKind = 'legacy-database' | 'canonical-graph' | 'istanbul-report';

/** Evidence status carried by a metric result. */
export type CoverageMetricEvidenceStatus =
  | 'direct'
  | 'inferred'
  | 'estimated'
  | 'historical'
  | 'planned';

/** Stable identity of the report or database used by an adapter. */
export interface CoverageSourceIdentity {
  readonly adapterId: string;
  readonly inputKind: CoverageMetricInputKind;
  readonly reportFormat: string;
  readonly sourcePath: string;
  readonly sourceDigest: string;
  readonly sourceIdentity: string;
  readonly workspaceId?: string;
  readonly capturedAt: string;
}

/** Numerator/denominator value for one ratio metric. */
export interface CoverageMetricValue {
  readonly numerator: number;
  readonly denominator: number;
  readonly ratio: number;
  readonly unit: 'fraction';
}

/** Versioned result envelope used by coverage adapters. */
export interface CoverageMetricResult {
  readonly contractId: typeof COVERAGE_METRIC_CONTRACT_ID;
  readonly contractVersion: typeof COVERAGE_METRIC_CONTRACT_VERSION;
  readonly metricId: CoverageMetricId;
  readonly metricKind: 'ratio';
  readonly source: CoverageSourceIdentity;
  readonly value: CoverageMetricValue;
  readonly evidence: {
    readonly status: CoverageMetricEvidenceStatus;
    readonly confidence: number;
    readonly capturedAt: string;
  };
  readonly policy: {
    readonly gate: 'report-only' | 'warning' | 'error' | 'unsupported';
  };
}

/** File-scoped metric observations retained for later canonical projection. */
export interface CoverageMetricFileResult {
  readonly filePath: string;
  readonly metrics: readonly CoverageMetricResult[];
  readonly functions?: readonly CoverageFunctionEvidence[];
}

/** Function declaration evidence from an Istanbul function map. */
export interface CoverageFunctionEvidence {
  readonly name: string;
  readonly startLine: number;
  readonly startColumn?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
  readonly covered: boolean;
  readonly count: number;
}

/** Options for creating a source identity. */
export interface CoverageSourceIdentityOptions {
  readonly adapterId?: string;
  readonly inputKind?: CoverageMetricInputKind;
  readonly reportFormat?: string;
  readonly workspaceId?: string;
  readonly capturedAt?: string;
}

/** Recompute the identity portion of a source envelope without report bytes. */
export function deriveCoverageSourceIdentity(
  source: Pick<
    CoverageSourceIdentity,
    'adapterId' | 'inputKind' | 'reportFormat' | 'sourceDigest'
  > &
    Partial<Pick<CoverageSourceIdentity, 'workspaceId'>>
): string {
  const identityPayload = JSON.stringify({
    adapterId: source.adapterId,
    inputKind: source.inputKind,
    reportFormat: source.reportFormat,
    sourceDigest: source.sourceDigest,
    workspaceId: source.workspaceId ?? null,
  });
  return `coverage-source:sha256:${createHash('sha256').update(identityPayload).digest('hex')}`;
}

/**
 * Create a stable identity from the exact report bytes and adapter boundary.
 * Capture time and filesystem location are evidence metadata, not identity.
 */
export function createCoverageSourceIdentity(
  sourcePath: string,
  content: string | Buffer,
  options: CoverageSourceIdentityOptions = {}
): CoverageSourceIdentity {
  const adapterId = options.adapterId ?? 'tsdoc-edge/coverage-parser';
  const inputKind = options.inputKind ?? 'istanbul-report';
  const reportFormat = options.reportFormat ?? 'istanbul-json';
  const sourceDigest = `sha256:${createHash('sha256').update(content).digest('hex')}`;
  return {
    adapterId,
    inputKind,
    reportFormat,
    sourcePath: path.resolve(sourcePath),
    sourceDigest,
    sourceIdentity: deriveCoverageSourceIdentity({
      adapterId,
      inputKind,
      reportFormat,
      sourceDigest,
      ...(options.workspaceId ? { workspaceId: options.workspaceId } : {}),
    }),
    ...(options.workspaceId ? { workspaceId: options.workspaceId } : {}),
    capturedAt: options.capturedAt ?? new Date().toISOString(),
  };
}

/** Build a metric result while preserving the source identity. */
export function createCoverageMetricResult(
  source: CoverageSourceIdentity,
  metricId: CoverageMetricId,
  numerator: number,
  denominator: number,
  options: {
    readonly status?: CoverageMetricEvidenceStatus;
    readonly confidence?: number;
    readonly gate?: 'report-only' | 'warning' | 'error' | 'unsupported';
  } = {}
): CoverageMetricResult {
  const safeNumerator = Math.max(0, numerator);
  const safeDenominator = Math.max(0, denominator);

  return {
    contractId: COVERAGE_METRIC_CONTRACT_ID,
    contractVersion: COVERAGE_METRIC_CONTRACT_VERSION,
    metricId,
    metricKind: 'ratio',
    source,
    value: {
      numerator: safeNumerator,
      denominator: safeDenominator,
      ratio: safeDenominator === 0 ? 0 : safeNumerator / safeDenominator,
      unit: 'fraction',
    },
    evidence: {
      status: options.status ?? 'direct',
      confidence: options.confidence ?? 1,
      capturedAt: source.capturedAt,
    },
    policy: {
      gate: options.gate ?? 'report-only',
    },
  };
}
