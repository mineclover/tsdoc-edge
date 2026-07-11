/**
 * Authoritative fact-occurrence and topology aggregation kernel.
 *
 * CanonicalProjectGraph.edges remains a compatibility projection. This module
 * keeps every provider observation independently addressable before producing
 * the endpoint-level topology used by queries.
 * @packageDocumentation
 */

import { createHash } from 'node:crypto';
import type { CanonicalProjectGraph } from '../indexer/contracts';

export const FACT_TOPOLOGY_CONTRACT_VERSION = '1.0' as const;

export type TopologyPlane = 'compiler-fact' | 'producer-derived' | 'router-derived';
export type UnknownEndpointPolicy = 'reject' | 'quarantine';
export type DuplicateFactPolicy = 'reject' | 'deduplicate-identical';

/** Identity of the concrete provider process/snapshot that emitted a fact. */
export interface FactProviderInstance {
  readonly instanceId: string;
  readonly contractId: string;
  readonly contractVersion: string;
}

/** JSON-shaped source anchor. Provider-specific fields are retained losslessly. */
export interface FactSourceAnchor extends Readonly<Record<string, unknown>> {
  readonly file: string;
  readonly startLine?: number;
  readonly startCol?: number;
  readonly endLine?: number;
  readonly endCol?: number;
}

/** One observation reported by a compiler-fact provider. */
export interface FactOccurrence {
  readonly contractVersion: typeof FACT_TOPOLOGY_CONTRACT_VERSION;
  readonly id: string;
  readonly plane: 'compiler-fact';
  /** Raw provider kind; normalization must not rewrite it to a legacy kind. */
  readonly kind: string;
  readonly from: string;
  readonly to: string;
  readonly semanticQualifier?: string;
  readonly provider: FactProviderInstance;
  readonly providerLocalFactId: string;
  readonly sourceAnchor: FactSourceAnchor;
  /** `null` means that the provider did not report confidence. */
  readonly confidence: number | null;
  readonly capabilities: Readonly<Record<string, unknown>>;
  readonly provenance: Readonly<Record<string, unknown>>;
  readonly producerFields: Readonly<Record<string, unknown>>;
}

export interface CreateFactOccurrenceInput {
  readonly kind: string;
  readonly from: string;
  readonly to: string;
  readonly semanticQualifier?: string;
  readonly provider: FactProviderInstance;
  readonly providerLocalFactId: string;
  readonly sourceAnchor: FactSourceAnchor;
  readonly confidence?: number | null;
  readonly capabilities?: Readonly<Record<string, unknown>>;
  readonly provenance: Readonly<Record<string, unknown>>;
  readonly producerFields?: Readonly<Record<string, unknown>>;
}

/** Lossless occurrence contribution retained on an aggregate topology edge. */
export interface TopologyOccurrenceContribution {
  readonly occurrenceId: string;
  readonly providerInstanceId: string;
  readonly confidence: number | null;
  readonly capabilities: Readonly<Record<string, unknown>>;
  readonly provenance: Readonly<Record<string, unknown>>;
}

export interface TopologyConfidenceSummary {
  readonly strategy: 'maximum-reported';
  readonly value: number | null;
  readonly reportedOccurrenceCount: number;
}

export interface TopologyDerivation {
  readonly owner: string;
  readonly version: string;
  readonly capability: string;
  readonly inputFactIds: readonly string[];
}

interface TopologyEdgeBase {
  readonly contractVersion: typeof FACT_TOPOLOGY_CONTRACT_VERSION;
  readonly id: string;
  readonly kind: string;
  readonly from: string;
  readonly to: string;
  readonly semanticQualifier?: string;
  readonly occurrenceIds: readonly string[];
  readonly occurrenceCount: number;
  readonly confidence: TopologyConfidenceSummary;
  readonly contributions: readonly TopologyOccurrenceContribution[];
}

/** Query topology aggregated from one or more source occurrences. */
export interface CompilerFactTopologyEdge extends TopologyEdgeBase {
  readonly plane: 'compiler-fact';
  readonly occurrenceIds: readonly [string, ...string[]];
  readonly derivation?: never;
}

/** Topology synthesized by a named, versioned derivation owner. */
export interface DerivedTopologyEdge extends TopologyEdgeBase {
  readonly plane: 'producer-derived' | 'router-derived';
  readonly occurrenceIds: readonly [];
  readonly occurrenceCount: 0;
  readonly contributions: readonly [];
  readonly derivation: TopologyDerivation;
  readonly provenance: Readonly<Record<string, unknown>>;
}

export type TopologyEdge = CompilerFactTopologyEdge | DerivedTopologyEdge;

export interface CreateDerivedTopologyEdgeInput {
  /** Derived topology cannot be quarantined, so unknown endpoints are rejected. */
  readonly graph: CanonicalProjectGraph;
  readonly plane: DerivedTopologyEdge['plane'];
  readonly kind: string;
  readonly from: string;
  readonly to: string;
  readonly semanticQualifier?: string;
  readonly derivation: TopologyDerivation;
  readonly confidence?: number | null;
  readonly provenance: Readonly<Record<string, unknown>>;
}

export interface FactTopologyPolicies {
  /** Unknown graph endpoints are never silently dropped. */
  readonly unknownEndpoint: UnknownEndpointPolicy;
  /** Conflicting duplicate identities are always rejected. */
  readonly duplicateFact: DuplicateFactPolicy;
}

export interface QuarantinedFactOccurrence {
  readonly occurrence: FactOccurrence;
  readonly unknownEndpointIds: readonly string[];
}

/** Deterministic in-memory projection; persistence is intentionally out of scope. */
export interface FactTopologyProjection {
  readonly contractVersion: typeof FACT_TOPOLOGY_CONTRACT_VERSION;
  readonly projectionId: string;
  readonly graphFingerprint: string;
  readonly policies: FactTopologyPolicies;
  readonly occurrences: readonly FactOccurrence[];
  readonly topologyEdges: readonly CompilerFactTopologyEdge[];
  readonly quarantined: readonly QuarantinedFactOccurrence[];
}

/**
 * Create a source observation whose identity preserves provider instance,
 * provider-local fact, source anchor, raw kind, and semantic endpoints.
 */
export function createFactOccurrence(input: CreateFactOccurrenceInput): FactOccurrence {
  const kind = nonEmpty(input.kind, 'kind');
  const from = nonEmpty(input.from, 'from');
  const to = nonEmpty(input.to, 'to');
  const semanticQualifier = optionalText(input.semanticQualifier);
  const provider = normalizeProvider(input.provider);
  const providerLocalFactId = nonEmpty(input.providerLocalFactId, 'providerLocalFactId');
  const sourceAnchor = normalizeSourceAnchor(input.sourceAnchor);
  const confidence = normalizeConfidence(input.confidence ?? null);
  const capabilities = jsonRecord(input.capabilities ?? {}, 'capabilities');
  const provenance = jsonRecord(input.provenance, 'provenance');
  const producerFields = jsonRecord(input.producerFields ?? {}, 'producerFields');
  const identity = {
    contractVersion: FACT_TOPOLOGY_CONTRACT_VERSION,
    providerInstanceId: provider.instanceId,
    providerLocalFactId,
    kind,
    from,
    to,
    semanticQualifier,
    sourceAnchor,
  };

  return Object.freeze({
    contractVersion: FACT_TOPOLOGY_CONTRACT_VERSION,
    id: `fact-occurrence:${digest(identity)}`,
    plane: 'compiler-fact' as const,
    kind,
    from,
    to,
    ...(semanticQualifier ? { semanticQualifier } : {}),
    provider,
    providerLocalFactId,
    sourceAnchor,
    confidence,
    capabilities,
    provenance,
    producerFields,
  });
}

/** Create and validate a non-compiler topology relation. */
export function createDerivedTopologyEdge(
  input: CreateDerivedTopologyEdgeInput
): DerivedTopologyEdge {
  if (input.plane !== 'producer-derived' && input.plane !== 'router-derived') {
    throw new Error(`Invalid derived topology plane: ${input.plane}`);
  }
  const kind = nonEmpty(input.kind, 'kind');
  const from = nonEmpty(input.from, 'from');
  const to = nonEmpty(input.to, 'to');
  const semanticQualifier = optionalText(input.semanticQualifier);
  const derivation = normalizeDerivation(input.derivation);
  const confidenceValue = normalizeConfidence(input.confidence ?? null);
  const confidence = Object.freeze({
    strategy: 'maximum-reported' as const,
    value: confidenceValue,
    reportedOccurrenceCount: 0,
  });
  const provenance = jsonRecord(input.provenance, 'provenance');
  const id = topologyEdgeId({
    plane: input.plane,
    kind,
    from,
    to,
    semanticQualifier,
    derivation,
  });

  const edge: DerivedTopologyEdge = Object.freeze({
    contractVersion: FACT_TOPOLOGY_CONTRACT_VERSION,
    id,
    plane: input.plane,
    kind,
    from,
    to,
    ...(semanticQualifier ? { semanticQualifier } : {}),
    occurrenceIds: Object.freeze([]) as readonly [],
    occurrenceCount: 0 as const,
    confidence,
    contributions: Object.freeze([]) as readonly [],
    derivation,
    provenance,
  });
  assertTopologyEdge(edge, input.graph);
  return edge;
}

/**
 * Aggregate accepted occurrences by `(plane, kind, from, to, qualifier)`.
 *
 * Malformed facts always fail. Unknown graph endpoints follow the explicit
 * reject/quarantine policy. Exact duplicate facts may only be collapsed when
 * `deduplicate-identical` is selected; identity conflicts always fail.
 */
export function buildFactTopologyProjection(options: {
  readonly graph: CanonicalProjectGraph;
  readonly occurrences: readonly FactOccurrence[];
  readonly policies: FactTopologyPolicies;
}): FactTopologyProjection {
  validateGraph(options.graph);
  validatePolicies(options.policies);
  const normalized = normalizeAndDeduplicate(options.occurrences, options.policies.duplicateFact);
  const nodeIds = new Set(options.graph.nodes.map((node) => node.id));
  const accepted: FactOccurrence[] = [];
  const quarantined: QuarantinedFactOccurrence[] = [];

  for (const occurrence of normalized) {
    const unknownEndpointIds = [...new Set([occurrence.from, occurrence.to])]
      .filter((id) => !nodeIds.has(id))
      .sort(compareText);
    if (unknownEndpointIds.length === 0) {
      accepted.push(occurrence);
      continue;
    }
    if (options.policies.unknownEndpoint === 'reject') {
      throw new Error(
        `Fact occurrence ${occurrence.id} references unknown endpoint(s): ${unknownEndpointIds.join(', ')}`
      );
    }
    quarantined.push(
      Object.freeze({
        occurrence,
        unknownEndpointIds: Object.freeze(unknownEndpointIds),
      })
    );
  }

  const topologyEdges = aggregateCompilerFacts(accepted);
  const policies = Object.freeze({ ...options.policies });
  const projectionPayload = {
    contractVersion: FACT_TOPOLOGY_CONTRACT_VERSION,
    graphFingerprint: options.graph.fingerprint,
    policies,
    occurrences: accepted,
    topologyEdges,
    quarantined,
  };

  return Object.freeze({
    contractVersion: FACT_TOPOLOGY_CONTRACT_VERSION,
    projectionId: `fact-topology-projection:${digest(projectionPayload)}`,
    graphFingerprint: options.graph.fingerprint,
    policies,
    occurrences: Object.freeze(accepted),
    topologyEdges,
    quarantined: Object.freeze(quarantined),
  });
}

/** Validate the structural invariants shared by persisted and transient topology. */
export function assertTopologyEdge(edge: TopologyEdge, graph?: CanonicalProjectGraph): void {
  if (edge.contractVersion !== FACT_TOPOLOGY_CONTRACT_VERSION) {
    throw new Error(`Unsupported topology contract version: ${edge.contractVersion}`);
  }
  if (
    edge.plane !== 'compiler-fact' &&
    edge.plane !== 'producer-derived' &&
    edge.plane !== 'router-derived'
  ) {
    throw new Error(`Invalid topology plane: ${edge.plane}`);
  }
  nonEmpty(edge.id, 'topology edge id');
  nonEmpty(edge.kind, 'topology edge kind');
  nonEmpty(edge.from, 'topology edge from');
  nonEmpty(edge.to, 'topology edge to');
  if (graph) {
    validateGraph(graph);
    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    const unknown = [...new Set([edge.from, edge.to])]
      .filter((id) => !nodeIds.has(id))
      .sort(compareText);
    if (unknown.length > 0) {
      throw new Error(
        `Topology edge ${edge.id} references unknown endpoint(s): ${unknown.join(', ')}`
      );
    }
  }
  if (edge.plane === 'compiler-fact') {
    if (edge.occurrenceIds.length === 0 || edge.occurrenceCount === 0) {
      throw new Error('compiler-fact topology requires at least one occurrence');
    }
    if ('derivation' in edge && edge.derivation !== undefined) {
      throw new Error('compiler-fact topology must not have derivation metadata');
    }
    if (edge.occurrenceCount !== edge.occurrenceIds.length) {
      throw new Error('compiler-fact topology occurrenceCount does not match occurrenceIds');
    }
    if (edge.contributions.length !== edge.occurrenceIds.length) {
      throw new Error('compiler-fact topology contributions do not match occurrenceIds');
    }
    const contributionIds = edge.contributions.map((entry) => entry.occurrenceId);
    if (stableJson(contributionIds) !== stableJson(edge.occurrenceIds)) {
      throw new Error('compiler-fact topology contribution order does not match occurrenceIds');
    }
    assertTopologyIdentity(edge);
    return;
  }
  const derivation = (edge as { readonly derivation?: TopologyDerivation }).derivation;
  if (!derivation) {
    throw new Error(`${edge.plane} topology requires derivation metadata`);
  }
  normalizeDerivation(derivation);
  if (
    edge.occurrenceCount !== 0 ||
    edge.occurrenceIds.length !== 0 ||
    edge.contributions.length !== 0
  ) {
    throw new Error(`${edge.plane} topology must not claim direct compiler occurrences`);
  }
  assertTopologyIdentity(edge);
}

function assertTopologyIdentity(edge: TopologyEdge): void {
  const expectedId = topologyEdgeId(edge);
  if (edge.id !== expectedId) {
    throw new Error(`Topology edge identity mismatch: expected ${expectedId}, received ${edge.id}`);
  }
}

function aggregateCompilerFacts(
  occurrences: readonly FactOccurrence[]
): readonly CompilerFactTopologyEdge[] {
  const groups = new Map<string, FactOccurrence[]>();
  for (const occurrence of occurrences) {
    const id = topologyEdgeId({
      plane: 'compiler-fact',
      kind: occurrence.kind,
      from: occurrence.from,
      to: occurrence.to,
      semanticQualifier: occurrence.semanticQualifier,
    });
    const group = groups.get(id) ?? [];
    group.push(occurrence);
    groups.set(id, group);
  }

  return Object.freeze(
    [...groups.entries()]
      .sort(([left], [right]) => compareText(left, right))
      .map(([id, facts]) => {
        const ordered = facts.sort((left, right) => compareText(left.id, right.id));
        const first = ordered[0];
        if (!first) throw new Error(`Topology edge ${id} has no occurrences`);
        const occurrenceIds = Object.freeze(ordered.map((fact) => fact.id)) as readonly [
          string,
          ...string[],
        ];
        const contributions = Object.freeze(
          ordered.map((fact) =>
            Object.freeze({
              occurrenceId: fact.id,
              providerInstanceId: fact.provider.instanceId,
              confidence: fact.confidence,
              capabilities: fact.capabilities,
              provenance: fact.provenance,
            })
          )
        );
        const reported = ordered
          .map((fact) => fact.confidence)
          .filter((value): value is number => value !== null)
          .sort((left, right) => left - right);
        const confidence = Object.freeze({
          strategy: 'maximum-reported' as const,
          value: reported.length > 0 ? reported[reported.length - 1] : null,
          reportedOccurrenceCount: reported.length,
        });
        const edge: CompilerFactTopologyEdge = Object.freeze({
          contractVersion: FACT_TOPOLOGY_CONTRACT_VERSION,
          id,
          plane: 'compiler-fact' as const,
          kind: first.kind,
          from: first.from,
          to: first.to,
          ...(first.semanticQualifier ? { semanticQualifier: first.semanticQualifier } : {}),
          occurrenceIds,
          occurrenceCount: occurrenceIds.length,
          confidence,
          contributions,
        });
        assertTopologyEdge(edge);
        return edge;
      })
  );
}

function normalizeAndDeduplicate(
  occurrences: readonly FactOccurrence[],
  policy: DuplicateFactPolicy
): FactOccurrence[] {
  const byId = new Map<string, FactOccurrence>();
  for (const occurrence of occurrences) {
    const normalized = normalizeOccurrence(occurrence);
    const existing = byId.get(normalized.id);
    if (!existing) {
      byId.set(normalized.id, normalized);
      continue;
    }
    if (stableJson(existing) !== stableJson(normalized)) {
      throw new Error(`Conflicting duplicate fact occurrence id: ${normalized.id}`);
    }
    if (policy === 'reject') {
      throw new Error(`Duplicate fact occurrence id: ${normalized.id}`);
    }
  }
  return [...byId.values()].sort((left, right) => compareText(left.id, right.id));
}

function normalizeOccurrence(value: FactOccurrence): FactOccurrence {
  if (value.contractVersion !== FACT_TOPOLOGY_CONTRACT_VERSION) {
    throw new Error(`Unsupported fact occurrence contract version: ${value.contractVersion}`);
  }
  if (value.plane !== 'compiler-fact') throw new Error(`Invalid fact plane: ${value.plane}`);
  const normalized = createFactOccurrence({
    kind: value.kind,
    from: value.from,
    to: value.to,
    semanticQualifier: value.semanticQualifier,
    provider: value.provider,
    providerLocalFactId: value.providerLocalFactId,
    sourceAnchor: value.sourceAnchor,
    confidence: value.confidence,
    capabilities: value.capabilities,
    provenance: value.provenance,
    producerFields: value.producerFields,
  });
  if (normalized.id !== value.id) {
    throw new Error(
      `Fact occurrence identity mismatch: expected ${normalized.id}, received ${value.id}`
    );
  }
  return normalized;
}

function topologyEdgeId(input: {
  readonly plane: TopologyPlane;
  readonly kind: string;
  readonly from: string;
  readonly to: string;
  readonly semanticQualifier?: string;
  readonly derivation?: TopologyDerivation;
}): string {
  const derivationIdentity =
    input.plane === 'compiler-fact'
      ? undefined
      : input.derivation
        ? {
            owner: input.derivation.owner,
            version: input.derivation.version,
            capability: input.derivation.capability,
          }
        : undefined;
  return `topology-edge:${digest({
    contractVersion: FACT_TOPOLOGY_CONTRACT_VERSION,
    plane: input.plane,
    kind: input.kind,
    from: input.from,
    to: input.to,
    semanticQualifier: optionalText(input.semanticQualifier),
    derivation: derivationIdentity,
  })}`;
}

function normalizeProvider(value: FactProviderInstance): FactProviderInstance {
  return Object.freeze({
    instanceId: nonEmpty(value.instanceId, 'provider.instanceId'),
    contractId: nonEmpty(value.contractId, 'provider.contractId'),
    contractVersion: nonEmpty(value.contractVersion, 'provider.contractVersion'),
  });
}

function normalizeSourceAnchor(value: FactSourceAnchor): FactSourceAnchor {
  const result = jsonRecord(value, 'sourceAnchor') as FactSourceAnchor;
  nonEmpty(result.file, 'sourceAnchor.file');
  for (const key of ['startLine', 'startCol', 'endLine', 'endCol'] as const) {
    const coordinate = result[key];
    if (coordinate !== undefined && (!Number.isInteger(coordinate) || coordinate < 0)) {
      throw new Error(`sourceAnchor.${key} must be a non-negative integer`);
    }
  }
  return result;
}

function normalizeConfidence(value: number | null): number | null {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error('confidence must be null or a finite number between 0 and 1');
  }
  return value;
}

function normalizeDerivation(value: TopologyDerivation): TopologyDerivation {
  const inputFactIds = sortedUniqueNonEmpty(value.inputFactIds, 'derivation.inputFactIds');
  if (inputFactIds.length === 0) {
    throw new Error('derivation.inputFactIds must contain at least one fact id');
  }
  return Object.freeze({
    owner: nonEmpty(value.owner, 'derivation.owner'),
    version: nonEmpty(value.version, 'derivation.version'),
    capability: nonEmpty(value.capability, 'derivation.capability'),
    inputFactIds,
  });
}

function validateGraph(graph: CanonicalProjectGraph): void {
  nonEmpty(graph.fingerprint, 'graph.fingerprint');
  const seen = new Set<string>();
  for (const node of graph.nodes) {
    nonEmpty(node.id, 'graph node id');
    if (seen.has(node.id)) throw new Error(`Duplicate canonical graph node id: ${node.id}`);
    seen.add(node.id);
  }
}

function validatePolicies(policies: FactTopologyPolicies): void {
  if (policies.unknownEndpoint !== 'reject' && policies.unknownEndpoint !== 'quarantine') {
    throw new Error(`Unsupported unknown endpoint policy: ${policies.unknownEndpoint}`);
  }
  if (policies.duplicateFact !== 'reject' && policies.duplicateFact !== 'deduplicate-identical') {
    throw new Error(`Unsupported duplicate fact policy: ${policies.duplicateFact}`);
  }
}

function sortedUniqueNonEmpty(values: readonly string[], field: string): readonly string[] {
  const normalized = values.map((value, index) => nonEmpty(value, `${field}[${index}]`));
  const sorted = [...new Set(normalized)].sort(compareText);
  if (sorted.length !== normalized.length) throw new Error(`${field} contains duplicate ids`);
  return Object.freeze(sorted);
}

function optionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function nonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} must be a non-empty string`);
  return normalized;
}

function digest(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalJsonClone(value, 'identity'));
}

function jsonRecord(
  value: Readonly<Record<string, unknown>>,
  field: string
): Readonly<Record<string, unknown>> {
  return canonicalJsonClone(value, field);
}

function canonicalJsonClone<T>(value: T, field: string, ancestors = new WeakSet<object>()): T {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${field} contains a non-finite number`);
    return value;
  }
  if (typeof value !== 'object') throw new Error(`${field} contains a non-JSON value`);
  if (ancestors.has(value)) throw new Error(`${field} contains a circular value`);
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return Object.freeze(
        value.map((entry, index) => canonicalJsonClone(entry, `${field}[${index}]`, ancestors))
      ) as T;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`${field} contains a non-JSON object`);
    }
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => compareText(left, right)
    )) {
      if (entry === undefined) continue;
      result[key] = canonicalJsonClone(entry, `${field}.${key}`, ancestors);
    }
    return Object.freeze(result) as T;
  } finally {
    ancestors.delete(value);
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
