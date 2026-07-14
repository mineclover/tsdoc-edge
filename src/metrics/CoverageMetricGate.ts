/**
 * Gate eligibility for canonical coverage evidence.
 *
 * @packageDocumentation
 * @doc [[Coverage Metrics Contract]]
 */

import type { CoverageMetricResult } from './CoverageMetricContract';

/** Gate levels a caller may request for a coverage metric. */
export type CoverageMetricGateRequest = 'report-only' | 'warning' | 'error';

/** Graph identity required before a metric can enter a convention gate. */
export interface CoverageMetricGateContext {
  readonly graphRevisionId: string;
  readonly graphFingerprint: string;
  readonly requestedGate: CoverageMetricGateRequest;
}

/** Deterministic decision explaining whether a metric may enter a gate. */
export interface CoverageMetricGateDecision {
  readonly eligible: boolean;
  readonly requestedGate: CoverageMetricGateRequest;
  readonly effectiveGate: CoverageMetricResult['policy']['gate'];
  readonly reason: string;
}

/**
 * Resolve gate eligibility without weakening evidence semantics.
 *
 * `direct` evidence with both graph identities may be promoted to warning or
 * error. Inferred, estimated, or identity-less evidence is explicitly marked
 * unsupported rather than silently becoming a gate finding.
 */
export function resolveCoverageMetricGate(
  metric: CoverageMetricResult,
  context: CoverageMetricGateContext
): CoverageMetricGateDecision {
  if (context.requestedGate === 'report-only') {
    return {
      eligible: true,
      requestedGate: context.requestedGate,
      effectiveGate: 'report-only',
      reason: 'Report-only gate requested',
    };
  }

  if (!context.graphRevisionId.trim() || !context.graphFingerprint.trim()) {
    return {
      eligible: false,
      requestedGate: context.requestedGate,
      effectiveGate: 'unsupported',
      reason: 'A graph revision ID and fingerprint are required for a gated metric',
    };
  }

  if (metric.evidence.status !== 'direct') {
    return {
      eligible: false,
      requestedGate: context.requestedGate,
      effectiveGate: 'unsupported',
      reason: `Only direct evidence may enter a ${context.requestedGate} gate`,
    };
  }

  return {
    eligible: true,
    requestedGate: context.requestedGate,
    effectiveGate: context.requestedGate,
    reason: 'Direct evidence is pinned to a canonical graph revision',
  };
}

/** Apply the resolved gate while preserving every other metric field. */
export function applyCoverageMetricGate(
  metric: CoverageMetricResult,
  context: CoverageMetricGateContext
): CoverageMetricResult {
  const decision = resolveCoverageMetricGate(metric, context);
  return {
    ...metric,
    policy: { gate: decision.effectiveGate },
  };
}
