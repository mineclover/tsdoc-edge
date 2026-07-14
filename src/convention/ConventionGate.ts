/** Shared deterministic gate evaluation for current and retained convention checks. */

import { createHash } from 'node:crypto';
import type { ConventionCheckResult } from './ConventionCheckService';

export type ConventionFailureThreshold = 'error' | 'warning' | 'info' | 'never';
export const CONVENTION_GATE_CONTRACT_VERSION = '1.0' as const;
export const CONVENTION_GATE_EVALUATOR_ID = 'tsdoc-edge/convention-gate' as const;
export const CONVENTION_GATE_EVALUATOR_VERSION = '1.0.0' as const;

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

/** Return all findings that block the selected threshold. */
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

/** Evaluate a gate from a check result without consulting current process configuration. */
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
