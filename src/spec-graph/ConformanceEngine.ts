/**
 * Minimal revision-bound conformance evaluation over resolved spec bindings.
 *
 * Findings are derived analysis records. They intentionally do not implement
 * the durable graph-edge contract and must be recomputed for another effective
 * view, binding-resolution set, or policy revision.
 */

import { createHash } from 'node:crypto';
import type { BindingResolutionSet } from '../semantic-graph/contracts';
import { assertValidatedBindingResolutionSet } from '../semantic-graph/EffectiveAnalysisService';
import type {
  BindingEndpointSelector,
  CodeEdgeSelector,
  CodeNodeSelector,
  EndpointRef,
  PolicyRevision,
  PolicyRule,
  PolicySuppression,
  ResolvedBindingParticipant,
  ResolvedSpecBinding,
  SpecBindingKind,
} from './contracts';
import { bindingResolutionId, createPolicyRevision, normalizeRfc3339Timestamp } from './identity';

type CodeNodeRef = Extract<EndpointRef, { type: 'code-node' }>;
type CodeEdgeRef = Extract<EndpointRef, { type: 'code-edge' }>;

export const CONFORMANCE_ENGINE_ID = 'tsdoc-edge/minimal-conformance-engine';
export const CONFORMANCE_ENGINE_VERSION = '1.0.0';

export const CONFORMANCE_RULE_IDS: Readonly<Record<SpecBindingKind, string>> = Object.freeze({
  implementation: 'binding.implementation',
  verification: 'binding.verification',
  constraint: 'binding.constraint',
  governance: 'binding.governance',
});

export type ConformanceOutcome =
  | 'satisfied'
  | 'violated'
  | 'indeterminate'
  | 'suppressed'
  | 'disabled';

export interface ConformanceEngineIdentity {
  readonly id: string;
  readonly version: string;
}

export interface ConformanceEvaluationOptions {
  /** Explicit clock input for expiring suppressions; it is included in report identity. */
  readonly suppressionAsOf?: string;
}

export interface ConformanceFinding {
  readonly resultKind: 'derived-conformance-finding';
  readonly findingId: string;
  readonly bindingResolutionSetId: string;
  readonly resolutionId: string;
  readonly declarationId: string;
  readonly obligationKind: SpecBindingKind;
  readonly effectiveViewId: string;
  readonly specRevisionId: string;
  readonly policyRevisionId: string;
  readonly ruleId: string;
  readonly ruleVersion: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly outcome: ConformanceOutcome;
  readonly participantDigest: string;
  readonly diagnosticCodes: readonly string[];
  readonly suppressionId?: string;
}

export interface ConformanceSummary {
  readonly total: number;
  readonly satisfied: number;
  readonly violated: number;
  readonly indeterminate: number;
  readonly suppressed: number;
  readonly disabled: number;
}

export interface ConformanceReport {
  readonly contractVersion: '1.0';
  readonly resultKind: 'derived-conformance-report';
  readonly reportId: string;
  readonly engine: ConformanceEngineIdentity;
  readonly bindingResolutionSetId: string;
  readonly effectiveViewId: string;
  readonly specRevisionId: string;
  readonly policyRevisionId: string;
  readonly policyDigest: string;
  readonly suppressionAsOf?: string;
  readonly findings: readonly ConformanceFinding[];
  readonly summary: ConformanceSummary;
  /** Suppressions not applied to a non-satisfied exact endpoint in this report. */
  readonly unappliedSuppressionIds: readonly string[];
}

interface RuleDecision {
  readonly id: string;
  readonly version: string;
  readonly enabled: boolean;
  readonly severity: 'error' | 'warning' | 'info';
}

interface FindingDraft {
  readonly resolution: ResolvedSpecBinding;
  readonly obligationKind: SpecBindingKind;
  readonly rule: RuleDecision;
  readonly outcome: ConformanceOutcome;
  readonly participantDigest: string;
  readonly diagnosticCodes: readonly string[];
  readonly suppressionId?: string;
}

/** Evaluate the four role-based binding obligations against one pinned policy. */
export class ConformanceEngine {
  readonly identity: ConformanceEngineIdentity;

  constructor(identity: Partial<ConformanceEngineIdentity> = {}) {
    this.identity = Object.freeze({
      id: identity.id ?? CONFORMANCE_ENGINE_ID,
      version: identity.version ?? CONFORMANCE_ENGINE_VERSION,
    });
    requireNonEmpty(this.identity.id, 'engine.id');
    requireNonEmpty(this.identity.version, 'engine.version');
  }

  evaluate(
    bindingSet: BindingResolutionSet,
    policy: PolicyRevision,
    options: ConformanceEvaluationOptions = {}
  ): ConformanceReport {
    validateEvaluationBoundary(bindingSet, policy);
    const suppressionAsOf = normalizeSuppressionClock(options.suppressionAsOf);
    const usedSuppressionIds = new Set<string>();
    const resolutions = sortedUniqueResolutions(bindingSet.resolutions);
    const findings = resolutions.map((resolution) => {
      const obligationKind = inferObligationKind(resolution);
      const rule = ruleDecision(policy, obligationKind);
      const participantDigest = digest(resolution.participants);
      const diagnosticCodes = participantDiagnosticCodes(obligationKind, resolution.participants);
      const baseOutcome = bindingOutcome(obligationKind, resolution.participants);
      const suppression =
        rule.enabled && baseOutcome !== 'satisfied'
          ? matchingSuppression(
              policy.suppressions,
              rule.id,
              resolution.participants,
              suppressionAsOf
            )
          : undefined;
      if (suppression) usedSuppressionIds.add(suppression.id);
      const outcome: ConformanceOutcome = !rule.enabled
        ? 'disabled'
        : suppression
          ? 'suppressed'
          : baseOutcome;
      const draft: FindingDraft = {
        resolution,
        obligationKind,
        rule,
        outcome,
        participantDigest,
        diagnosticCodes,
        ...(suppression ? { suppressionId: suppression.id } : {}),
      };
      return createFinding(bindingSet, policy, this.identity, draft);
    });
    findings.sort((left, right) => compareText(left.findingId, right.findingId));
    const summary = summarize(findings);
    const unappliedSuppressionIds = policy.suppressions
      .map((suppression) => suppression.id)
      .filter((id) => !usedSuppressionIds.has(id))
      .sort(compareText);
    const identityPayload = {
      contractVersion: '1.0' as const,
      engine: this.identity,
      bindingResolutionSetId: bindingSet.resolutionSetId,
      effectiveViewId: bindingSet.snapshotId,
      specRevisionId: bindingSet.inputStamp.specRevisionId,
      policyRevisionId: policy.revisionId,
      policyDigest: policy.contentDigest,
      suppressionAsOf,
      findingIds: findings.map((finding) => finding.findingId),
      unappliedSuppressionIds,
    };

    return Object.freeze({
      contractVersion: '1.0',
      resultKind: 'derived-conformance-report',
      reportId: `conformance-report:${digest(identityPayload)}`,
      engine: this.identity,
      bindingResolutionSetId: bindingSet.resolutionSetId,
      effectiveViewId: bindingSet.snapshotId,
      specRevisionId: bindingSet.inputStamp.specRevisionId,
      policyRevisionId: policy.revisionId,
      policyDigest: policy.contentDigest,
      ...(suppressionAsOf ? { suppressionAsOf } : {}),
      findings: Object.freeze(findings),
      summary,
      unappliedSuppressionIds: Object.freeze(unappliedSuppressionIds),
    });
  }
}

function createFinding(
  bindingSet: BindingResolutionSet,
  policy: PolicyRevision,
  engine: ConformanceEngineIdentity,
  draft: FindingDraft
): ConformanceFinding {
  const payload = {
    engine,
    bindingResolutionSetId: bindingSet.resolutionSetId,
    resolutionId: draft.resolution.resolutionId,
    declarationId: draft.resolution.declarationId,
    obligationKind: draft.obligationKind,
    effectiveViewId: bindingSet.snapshotId,
    specRevisionId: bindingSet.inputStamp.specRevisionId,
    policyRevisionId: policy.revisionId,
    ruleId: draft.rule.id,
    ruleVersion: draft.rule.version,
    severity: draft.rule.severity,
    outcome: draft.outcome,
    participantDigest: draft.participantDigest,
    diagnosticCodes: draft.diagnosticCodes,
    suppressionId: draft.suppressionId,
  };
  return Object.freeze({
    resultKind: 'derived-conformance-finding',
    findingId: `conformance-finding:${digest(payload)}`,
    ...payload,
    diagnosticCodes: Object.freeze([...draft.diagnosticCodes]),
  });
}

function validateEvaluationBoundary(
  bindingSet: BindingResolutionSet,
  policy: PolicyRevision
): void {
  assertValidatedBindingResolutionSet(bindingSet);
  const canonicalPolicy = createPolicyRevision({
    relationSemanticRegistryVersion: policy.relationSemanticRegistryVersion,
    lifecycleGateVersion: policy.lifecycleGateVersion,
    rules: policy.rules,
    suppressions: policy.suppressions,
    provenance: policy.provenance,
  });
  if (stableJson(policy) !== stableJson(canonicalPolicy)) {
    throw new Error('Policy revision identity does not match its canonical content');
  }
  requireNonEmpty(bindingSet.resolutionSetId, 'bindingResolutionSetId');
  if (bindingSet.stamp.bindingResolutionSetId !== bindingSet.resolutionSetId) {
    throw new Error('Binding resolution set stamp does not match resolutionSetId');
  }
  if (bindingSet.snapshotId !== bindingSet.inputStamp.effectiveViewId) {
    throw new Error('Binding resolution set snapshot does not match its effective input view');
  }
  if (bindingSet.inputStamp.policyRevisionId !== policy.revisionId) {
    throw new Error(
      `Policy revision mismatch: binding set uses ${bindingSet.inputStamp.policyRevisionId}, received ${policy.revisionId}`
    );
  }
  if (bindingSet.inputStamp.policyDigest !== policy.contentDigest) {
    throw new Error('Policy digest mismatch at conformance evaluation boundary');
  }
  const ruleIds = new Set<string>();
  for (const rule of policy.rules) {
    requireNonEmpty(rule.id, 'policy rule id');
    requireNonEmpty(rule.version, `policy rule ${rule.id} version`);
    if (ruleIds.has(rule.id)) throw new Error(`Duplicate policy rule id: ${rule.id}`);
    ruleIds.add(rule.id);
  }
  const suppressionIds = new Set<string>();
  for (const suppression of policy.suppressions) {
    requireNonEmpty(suppression.id, 'policy suppression id');
    if (suppressionIds.has(suppression.id)) {
      throw new Error(`Duplicate policy suppression id: ${suppression.id}`);
    }
    suppressionIds.add(suppression.id);
    if (suppression.expiresAt) {
      parseClock(suppression.expiresAt, `suppression ${suppression.id} expiresAt`);
    }
  }
  for (const resolution of bindingSet.resolutions) {
    if (resolution.specRevisionId !== bindingSet.inputStamp.specRevisionId) {
      throw new Error(
        `Resolution ${resolution.resolutionId} uses spec revision ${resolution.specRevisionId}`
      );
    }
    if (resolution.effectiveViewId !== bindingSet.snapshotId) {
      throw new Error(
        `Resolution ${resolution.resolutionId} uses effective view ${resolution.effectiveViewId}`
      );
    }
    if (stableJson(resolution.resolver) !== stableJson(bindingSet.resolver)) {
      throw new Error(`Resolution ${resolution.resolutionId} uses a different resolver identity`);
    }
    validateResolutionShape(resolution);
    if (resolution.codeRevisionId !== bindingSet.inputStamp.code.codeRevisionId) {
      throw new Error(
        `Resolution ${resolution.resolutionId} does not pin the current code revision`
      );
    }
    const evidenceRevisionId =
      inferObligationKind(resolution) === 'verification'
        ? bindingSet.inputStamp.evidenceRevisionId
        : undefined;
    if (resolution.evidenceRevisionId !== evidenceRevisionId) {
      throw new Error(
        `Resolution ${resolution.resolutionId} does not pin the expected evidence revision`
      );
    }
    const expectedResolutionId = bindingResolutionId({
      declarationId: resolution.declarationId,
      declarationDigest: resolution.declarationDigest,
      specRevisionId: resolution.specRevisionId,
      effectiveViewId: resolution.effectiveViewId,
      codeRevisionId: resolution.codeRevisionId,
      evidenceRevisionId: resolution.evidenceRevisionId,
      resolver: resolution.resolver,
      status: resolution.status,
      participants: resolution.participants,
    });
    if (resolution.resolutionId !== expectedResolutionId) {
      throw new Error(`Resolution ${resolution.resolutionId} has an invalid content identity`);
    }
  }
  const expectedResolutionSetId = `binding-resolution-set:${digest({
    snapshotId: bindingSet.snapshotId,
    resolver: bindingSet.resolver,
    resolutionIds: bindingSet.resolutions
      .map((resolution) => resolution.resolutionId)
      .sort(compareText),
  })}`;
  if (bindingSet.resolutionSetId !== expectedResolutionSetId) {
    throw new Error('Binding resolution set has an invalid content identity');
  }
}

function validateResolutionShape(resolution: ResolvedSpecBinding): void {
  for (const participant of resolution.participants) {
    const cardinality = participant.refs.length;
    if (participant.status === 'resolved' && cardinality !== 1) {
      throw new Error(
        `Resolution ${resolution.resolutionId} resolved role ${participant.role} must have exactly one endpoint`
      );
    }
    if (participant.status === 'ambiguous' && cardinality < 2) {
      throw new Error(
        `Resolution ${resolution.resolutionId} ambiguous role ${participant.role} must retain every candidate`
      );
    }
    if (participant.status === 'missing' && cardinality !== 0) {
      throw new Error(
        `Resolution ${resolution.resolutionId} missing role ${participant.role} cannot retain endpoints`
      );
    }
  }
  const statuses = resolution.participants.map((participant) => participant.status);
  const aggregate = statuses.every((status) => status === 'resolved')
    ? 'resolved'
    : statuses.includes('ambiguous')
      ? 'ambiguous'
      : statuses.includes('stale')
        ? 'stale'
        : 'missing';
  if (resolution.status !== aggregate) {
    throw new Error(
      `Resolution ${resolution.resolutionId} status ${resolution.status} does not match participant status ${aggregate}`
    );
  }
}

function sortedUniqueResolutions(
  resolutions: readonly ResolvedSpecBinding[]
): ResolvedSpecBinding[] {
  const seen = new Set<string>();
  const sorted = [...resolutions].sort((left, right) =>
    compareText(left.resolutionId, right.resolutionId)
  );
  for (const resolution of sorted) {
    if (seen.has(resolution.resolutionId)) {
      throw new Error(`Duplicate binding resolution id: ${resolution.resolutionId}`);
    }
    seen.add(resolution.resolutionId);
  }
  return sorted;
}

function inferObligationKind(resolution: ResolvedSpecBinding): SpecBindingKind {
  const roleCounts = new Map<string, number>();
  for (const participant of resolution.participants) {
    roleCounts.set(participant.role, (roleCounts.get(participant.role) ?? 0) + 1);
  }
  for (const [role, count] of roleCounts) {
    if (count > 1) {
      throw new Error(`Resolution ${resolution.resolutionId} repeats participant role ${role}`);
    }
  }
  const markers: readonly [SpecBindingKind, ResolvedBindingParticipant['role']][] = [
    ['implementation', 'implementer'],
    ['verification', 'verifier'],
    ['constraint', 'constraint'],
    ['governance', 'api'],
  ];
  const matched = markers.filter(([, role]) => roleCounts.has(role));
  if (matched.length !== 1) {
    throw new Error(
      `Resolution ${resolution.resolutionId} does not identify exactly one obligation kind`
    );
  }
  return matched[0][0];
}

function requiredRoles(kind: SpecBindingKind): readonly ResolvedBindingParticipant['role'][] {
  switch (kind) {
    case 'implementation':
      return ['obligation', 'implementer'];
    case 'verification':
      return ['obligation', 'verifier', 'subject'];
    case 'constraint':
      return ['constraint', 'subject'];
    case 'governance':
      return ['contract', 'api'];
  }
}

function bindingOutcome(
  kind: SpecBindingKind,
  participants: readonly ResolvedBindingParticipant[]
): Extract<ConformanceOutcome, 'satisfied' | 'violated' | 'indeterminate'> {
  const byRole = new Map(participants.map((participant) => [participant.role, participant]));
  const statuses = requiredRoles(kind).map((role) => byRole.get(role)?.status ?? 'missing');
  if (statuses.includes('ambiguous') || statuses.includes('stale')) return 'indeterminate';
  if (statuses.includes('missing')) return 'violated';
  return 'satisfied';
}

function participantDiagnosticCodes(
  kind: SpecBindingKind,
  participants: readonly ResolvedBindingParticipant[]
): readonly string[] {
  const byRole = new Map(participants.map((participant) => [participant.role, participant]));
  return Object.freeze(
    requiredRoles(kind)
      .map((role) => ({ role, status: byRole.get(role)?.status ?? 'missing' }))
      .filter(({ status }) => status !== 'resolved')
      .map(({ role, status }) => `binding.${kind}.${role}.${status}`)
      .sort(compareText)
  );
}

function ruleDecision(policy: PolicyRevision, kind: SpecBindingKind): RuleDecision {
  const id = CONFORMANCE_RULE_IDS[kind];
  const authored = policy.rules.find((rule) => rule.id === id);
  return authored ? authoredRuleDecision(authored) : defaultRuleDecision(id);
}

function authoredRuleDecision(rule: PolicyRule): RuleDecision {
  return Object.freeze({
    id: rule.id,
    version: rule.version,
    enabled: rule.enabled,
    severity: rule.severity ?? 'warning',
  });
}

function defaultRuleDecision(id: string): RuleDecision {
  return Object.freeze({ id, version: 'default-1', enabled: true, severity: 'warning' });
}

function matchingSuppression(
  suppressions: readonly PolicySuppression[],
  ruleId: string,
  participants: readonly ResolvedBindingParticipant[],
  suppressionAsOf: string | undefined
): PolicySuppression | undefined {
  const refs = participants.flatMap((participant) => participant.refs);
  return [...suppressions]
    .sort((left, right) => compareText(left.id, right.id))
    .find(
      (suppression) =>
        suppression.ruleId === ruleId &&
        suppressionIsActive(suppression, suppressionAsOf) &&
        refs.some((ref) => exactSuppressionTargetMatch(suppression.target, ref))
    );
}

function suppressionIsActive(
  suppression: PolicySuppression,
  suppressionAsOf: string | undefined
): boolean {
  if (!suppression.expiresAt) return true;
  if (!suppressionAsOf) return false;
  const expiresAt = parseClock(suppression.expiresAt, `suppression ${suppression.id} expiresAt`);
  const asOf = parseClock(suppressionAsOf, 'suppressionAsOf');
  return asOf <= expiresAt;
}

/** Suppressions fail closed when a selector needs metadata absent from EndpointRef. */
function exactSuppressionTargetMatch(selector: BindingEndpointSelector, ref: EndpointRef): boolean {
  if (selector.type !== ref.type || selector.workspaceId !== ref.workspaceId) return false;
  switch (selector.type) {
    case 'code-node':
      return ref.type === 'code-node' && exactCodeNodeIdentityMatch(selector, ref);
    case 'code-edge':
      return ref.type === 'code-edge' && exactCodeEdgeIdentityMatch(selector, ref);
    case 'spec-node':
      return ref.type === 'spec-node' && selector.specNodeId === ref.id;
    case 'test-evidence':
      return (
        ref.type === 'test-evidence' &&
        selector.providerId === undefined &&
        selector.file === undefined &&
        selector.testName === undefined &&
        selector.runner === undefined &&
        selector.evidenceId !== undefined &&
        selector.evidenceId === ref.id
      );
    case 'api-surface':
      return false;
  }
}

function exactCodeNodeIdentityMatch(selector: CodeNodeSelector, ref: CodeNodeRef): boolean {
  if (
    selector.providerId !== undefined ||
    selector.packageName !== undefined ||
    selector.packageVersion !== undefined ||
    selector.file !== undefined ||
    selector.qualifiedName !== undefined ||
    selector.kind !== undefined ||
    selector.sourceAnchor !== undefined
  ) {
    return false;
  }
  if (selector.canonicalNodeId === undefined && selector.providerNodeId === undefined) return false;
  return (
    matchesOptional(selector.graphNamespace, ref.graphNamespace) &&
    matchesOptional(selector.canonicalNodeId, ref.id) &&
    matchesOptional(selector.providerNodeId, ref.providerNodeId)
  );
}

function exactCodeEdgeIdentityMatch(selector: CodeEdgeSelector, ref: CodeEdgeRef): boolean {
  if (selector.providerId !== undefined) return false;
  return (
    matchesOptional(selector.graphNamespace, ref.graphNamespace) &&
    matchesOptional(selector.plane, ref.plane) &&
    matchesOptional(selector.kind, ref.kind) &&
    matchesOptional(selector.occurrenceId, ref.occurrenceId) &&
    exactEdgeNodeIdentityMatch(selector.from, ref.from, ref) &&
    exactEdgeNodeIdentityMatch(selector.to, ref.to, ref)
  );
}

function exactEdgeNodeIdentityMatch(
  selector: CodeNodeSelector,
  endpointId: string,
  ref: CodeEdgeRef
): boolean {
  if (
    selector.providerId !== undefined ||
    selector.providerNodeId !== undefined ||
    selector.packageName !== undefined ||
    selector.packageVersion !== undefined ||
    selector.file !== undefined ||
    selector.qualifiedName !== undefined ||
    selector.kind !== undefined ||
    selector.sourceAnchor !== undefined
  ) {
    return false;
  }
  return (
    selector.canonicalNodeId !== undefined &&
    selector.workspaceId === ref.workspaceId &&
    matchesOptional(selector.graphNamespace, ref.graphNamespace) &&
    selector.canonicalNodeId === endpointId
  );
}

function summarize(findings: readonly ConformanceFinding[]): ConformanceSummary {
  const counts: Record<ConformanceOutcome, number> = {
    satisfied: 0,
    violated: 0,
    indeterminate: 0,
    suppressed: 0,
    disabled: 0,
  };
  for (const finding of findings) counts[finding.outcome] += 1;
  return Object.freeze({ total: findings.length, ...counts });
}

function normalizeSuppressionClock(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return new Date(parseClock(value, 'suppressionAsOf')).toISOString();
}

function parseClock(value: string, label: string): number {
  return Date.parse(normalizeRfc3339Timestamp(value, label));
}

function matchesOptional<T>(expected: T | undefined, actual: T | undefined): boolean {
  return expected === undefined || expected === actual;
}

function requireNonEmpty(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} must be a non-empty string`);
}

function digest(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, entry]) => [key, canonicalize(entry)])
    );
  }
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
