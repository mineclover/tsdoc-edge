/**
 * Shared deterministic gate evaluation for current and retained convention checks.
 *
 * @doc [[ConventionCheck]]
 * @doc [[Convention Pack Check]]
 * @context Deterministic CI and CLI failure-threshold gate over completed convention-check results across conformance, naming, TSDoc, graph-lint, and coverage findings.
 * @functionality Filters violated and indeterminate findings meeting a severity threshold and computes a content-addressed gate decision without consulting ambient process configuration.
 * @packageDocumentation
 */

import { createHash } from 'node:crypto';
import type { ConventionCheckResult } from './ConventionCheckService';

/**
 * Severity threshold controlling when convention findings fail a gate check.
 *
 * @doc [[ConventionCheck]]
 * @public
 */
export type ConventionFailureThreshold = 'error' | 'warning' | 'info' | 'never';

/**
 * Schema contract version for deterministic convention gate decisions.
 *
 * @doc [[ConventionCheck]]
 * @public
 */
export const CONVENTION_GATE_CONTRACT_VERSION = '1.0' as const;

/**
 * Canonical evaluator identifier for convention gate decisions.
 *
 * @doc [[ConventionCheck]]
 * @public
 */
export const CONVENTION_GATE_EVALUATOR_ID = 'tsdoc-edge/convention-gate' as const;

/**
 * SemVer version of the deterministic convention gate evaluator.
 *
 * @doc [[ConventionCheck]]
 * @public
 */
export const CONVENTION_GATE_EVALUATOR_VERSION = '1.0.0' as const;

/**
 * Immutable content-addressed decision emitted by convention gate evaluation.
 *
 * @doc [[ConventionCheck]]
 * @public
 */
export interface ConventionGateDecision {
  readonly contractVersion: typeof CONVENTION_GATE_CONTRACT_VERSION;
  readonly evaluatorId: typeof CONVENTION_GATE_EVALUATOR_ID;
  readonly evaluatorVersion: typeof CONVENTION_GATE_EVALUATOR_VERSION;
  readonly gateId: string;
  readonly failureThreshold: ConventionFailureThreshold;
  readonly failed: boolean;
  readonly blockingFindingIds: readonly string[];
}

type GateFinding =
  | ConventionCheckResult['conformance']['findings'][number]
  | ConventionCheckResult['naming']['findings'][number]
  | ConventionCheckResult['tsdoc']['findings'][number]
  | ConventionCheckResult['graphLint']['findings'][number]
  | NonNullable<ConventionCheckResult['coverage']>['findings'][number];

/**
 * Return all findings that block the selected threshold.
 *
 * @doc [[ConventionCheck]]
 * @public
 */
export function blockingConventionFindings(
  result: ConventionCheckResult,
  threshold: ConventionFailureThreshold
): readonly GateFinding[] {
  if (threshold === 'never') return [];
  const minimum = severityRank(threshold);
  return [
    ...result.conformance.findings,
    ...result.naming.findings,
    ...result.tsdoc.findings,
    ...result.graphLint.findings,
    ...(result.coverage?.findings ?? []),
  ].filter(
    (finding) =>
      (finding.outcome === 'violated' || finding.outcome === 'indeterminate') &&
      severityRank(finding.severity) >= minimum
  );
}

/**
 * Evaluate a gate from a check result without consulting current process configuration.
 *
 * @doc [[ConventionCheck]]
 * @public
 */
export function evaluateConventionGate(
  result: ConventionCheckResult,
  failureThreshold: ConventionFailureThreshold
): ConventionGateDecision {
  const blockingFindingIds = Object.freeze(
    blockingConventionFindings(result, failureThreshold).map((finding) => finding.findingId)
  );
  const identity = JSON.stringify({
    contractVersion: CONVENTION_GATE_CONTRACT_VERSION,
    evaluatorId: CONVENTION_GATE_EVALUATOR_ID,
    evaluatorVersion: CONVENTION_GATE_EVALUATOR_VERSION,
    checkId: result.checkId,
    failureThreshold,
    blockingFindingIds,
  });
  return Object.freeze({
    contractVersion: CONVENTION_GATE_CONTRACT_VERSION,
    evaluatorId: CONVENTION_GATE_EVALUATOR_ID,
    evaluatorVersion: CONVENTION_GATE_EVALUATOR_VERSION,
    gateId: `convention-gate:${createHash('sha256').update(identity).digest('hex')}`,
    failureThreshold,
    failed: blockingFindingIds.length > 0,
    blockingFindingIds,
  });
}

function severityRank(value: Exclude<ConventionFailureThreshold, 'never'>): number {
  return value === 'error' ? 3 : value === 'warning' ? 2 : 1;
}
