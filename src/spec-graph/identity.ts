/** Deterministic identity and integrity helpers for the specification graph. */

import { createHash } from 'node:crypto';
import {
  type BindingEndpointSelector,
  type EndpointRef,
  type PolicyProvenance,
  type PolicyRevision,
  type PolicyRule,
  type PolicySuppression,
  type ResolvedBindingParticipant,
  type ResolvedSpecBinding,
  SPEC_GRAPH_CONTRACT_VERSION,
  type SpecBindingDeclaration,
  type SpecBindingKind,
  type SpecEdge,
  type SpecEdgeKind,
  type SpecEvidence,
  type SpecGraphProvenance,
  type SpecGraphRevision,
  type SpecNode,
  type SpecNodeKind,
  type SpecProvenance,
  type SpecSourceAnchor,
} from './contracts';

const SPEC_NODE_KINDS = ['spec', 'requirement', 'invariant', 'decision', 'api-contract'] as const;
const SPEC_EDGE_KINDS = ['contains', 'refines', 'requires', 'establishes', 'supersedes'] as const;
const SPEC_STATUSES = ['draft', 'review', 'approved', 'active', 'deprecated', 'archived'] as const;
const SPEC_BINDING_KINDS = ['implementation', 'verification', 'constraint', 'governance'] as const;
const SELECTOR_TYPES = [
  'code-node',
  'code-edge',
  'spec-node',
  'test-evidence',
  'api-surface',
] as const;
const RESOLUTION_ROLES = [
  'implementer',
  'obligation',
  'verifier',
  'subject',
  'constraint',
  'contract',
  'api',
] as const;
const RESOLUTION_STATUSES = ['resolved', 'ambiguous', 'missing', 'stale'] as const;
const RFC3339_WITH_TIMEZONE =
  /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?([Zz]|([+-])(\d{2}):(\d{2}))$/;

type PlainRecord = Readonly<Record<string, unknown>>;

export interface CreateSpecEdgeInput {
  readonly kind: SpecEdgeKind;
  readonly from: string;
  readonly to: string;
  readonly semanticQualifier?: string;
  readonly evidence?: readonly SpecEvidence[];
  readonly provenance: SpecProvenance;
}

/** Create one deterministic durable spec edge. */
export function createSpecEdge(input: CreateSpecEdgeInput): SpecEdge {
  const normalized = immutableJson(input, 'spec edge input') as CreateSpecEdgeInput;
  const record = requireRecord(normalized, 'spec edge input');
  assertAllowedKeys(
    record,
    ['kind', 'from', 'to', 'semanticQualifier', 'evidence', 'provenance'],
    'spec edge input'
  );
  assertOneOf(normalized.kind, SPEC_EDGE_KINDS, 'spec edge kind');
  requireNonEmpty(normalized.from, 'spec edge from');
  requireNonEmpty(normalized.to, 'spec edge to');
  const semanticQualifier = normalizedOptional(
    normalized.semanticQualifier,
    'spec edge semanticQualifier'
  );
  const evidence = normalized.evidence ?? [];
  requireArray(evidence, 'spec edge evidence');
  evidence.forEach((entry, index) => validateSpecEvidence(entry, `spec edge evidence[${index}]`));
  validateSpecProvenance(normalized.provenance, 'spec edge provenance');

  const identityPayload = {
    kind: normalized.kind,
    from: normalized.from,
    to: normalized.to,
    ...(semanticQualifier ? { semanticQualifier } : {}),
  };
  const id = `spec-edge:${digest(identityPayload)}`;
  return immutableJson(
    {
      id,
      ...identityPayload,
      evidence,
      provenance: normalized.provenance,
    },
    'spec edge'
  ) as SpecEdge;
}

/** Identity of an authored selector independent from a particular resolution. */
export function bindingDeclarationDigest(declaration: SpecBindingDeclaration): string {
  return digest(declaration);
}

/** Identity of one revision-specific binding resolution. */
export function bindingResolutionId(
  resolution: Omit<ResolvedSpecBinding, 'resolutionId' | 'confidence' | 'evidence'>
): string {
  requireNonEmpty(resolution.declarationId, 'binding resolution declarationId');
  requireNonEmpty(resolution.declarationDigest, 'binding resolution declarationDigest');
  requireNonEmpty(resolution.specRevisionId, 'binding resolution specRevisionId');
  requireNonEmpty(resolution.effectiveViewId, 'binding resolution effectiveViewId');
  if (resolution.codeRevisionId !== undefined) {
    requireNonEmpty(resolution.codeRevisionId, 'binding resolution codeRevisionId');
  }
  if (resolution.evidenceRevisionId !== undefined) {
    requireNonEmpty(resolution.evidenceRevisionId, 'binding resolution evidenceRevisionId');
  }
  validateResolverIdentity(resolution.resolver);
  assertOneOf(resolution.status, RESOLUTION_STATUSES, 'binding resolution status');
  const participants = canonicalResolutionParticipants(resolution.participants);

  return `binding-resolution:${digest({
    declarationId: resolution.declarationId,
    declarationDigest: resolution.declarationDigest,
    specRevisionId: resolution.specRevisionId,
    effectiveViewId: resolution.effectiveViewId,
    ...(resolution.codeRevisionId ? { codeRevisionId: resolution.codeRevisionId } : {}),
    ...(resolution.evidenceRevisionId ? { evidenceRevisionId: resolution.evidenceRevisionId } : {}),
    resolver: resolution.resolver,
    status: resolution.status,
    participants,
  })}`;
}

export interface CreateSpecGraphRevisionInput {
  readonly workspaceId: string;
  readonly nodes: readonly SpecNode[];
  readonly edges: readonly SpecEdge[];
  readonly bindings: readonly SpecBindingDeclaration[];
  readonly provenance: SpecGraphProvenance;
}

export interface CreatePolicyRevisionInput {
  readonly relationSemanticRegistryVersion: string;
  readonly lifecycleGateVersion: string;
  readonly rules: readonly PolicyRule[];
  readonly suppressions?: readonly PolicySuppression[];
  readonly provenance: PolicyProvenance;
}

/** Create a content-addressed policy revision shared by every consumer surface. */
export function createPolicyRevision(input: CreatePolicyRevisionInput): PolicyRevision {
  const normalized = immutableJson(input, 'policy revision input') as CreatePolicyRevisionInput;
  const record = requireRecord(normalized, 'policy revision input');
  assertAllowedKeys(
    record,
    [
      'relationSemanticRegistryVersion',
      'lifecycleGateVersion',
      'rules',
      'suppressions',
      'provenance',
    ],
    'policy revision input'
  );
  requireNonEmpty(normalized.relationSemanticRegistryVersion, 'relationSemanticRegistryVersion');
  requireNonEmpty(normalized.lifecycleGateVersion, 'lifecycleGateVersion');
  requireArray(normalized.rules, 'policy rules');
  requireArray(normalized.suppressions ?? [], 'policy suppressions');
  validatePolicyProvenance(normalized.provenance);

  const rules = sortedUnique(
    normalized.rules.map((rule, index) => validatePolicyRule(rule, `policy rule[${index}]`)),
    (rule) => rule.id,
    'policy rule'
  );
  const suppressions = sortedUnique(
    (normalized.suppressions ?? []).map((suppression, index) =>
      normalizePolicySuppression(suppression, `policy suppression[${index}]`)
    ),
    (suppression) => suppression.id,
    'policy suppression'
  );
  const ruleSetDigest = digest({ rules, suppressions });
  const semanticPayload = immutableJson(
    {
      contractVersion: '1.0' as const,
      relationSemanticRegistryVersion: normalized.relationSemanticRegistryVersion,
      lifecycleGateVersion: normalized.lifecycleGateVersion,
      rules,
      suppressions,
      provenance: normalized.provenance,
    },
    'policy semantic payload'
  );
  const contentDigest = digest(semanticPayload);
  return immutableJson(
    {
      revisionId: `policy-revision:${contentDigest}`,
      contentDigest,
      ruleSetDigest,
      ...semanticPayload,
    },
    'policy revision'
  ) as PolicyRevision;
}

/** Validate and create a deterministic compiled spec projection. */
export function createSpecGraphRevision(input: CreateSpecGraphRevisionInput): SpecGraphRevision {
  const normalized = immutableJson(
    input,
    'spec graph revision input'
  ) as CreateSpecGraphRevisionInput;
  const record = requireRecord(normalized, 'spec graph revision input');
  assertAllowedKeys(
    record,
    ['workspaceId', 'nodes', 'edges', 'bindings', 'provenance'],
    'spec graph revision input'
  );
  requireNonEmpty(normalized.workspaceId, 'workspaceId');
  requireArray(normalized.nodes, 'spec graph nodes');
  requireArray(normalized.edges, 'spec graph edges');
  requireArray(normalized.bindings, 'spec graph bindings');
  validateSpecGraphProvenance(normalized.provenance);

  normalized.nodes.forEach((node, index) => validateSpecNode(node, `spec node[${index}]`));
  const nodes = sortedUnique(normalized.nodes, (node) => node.id, 'spec node');
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) validateLifecycle(node, nodeById);

  normalized.edges.forEach((edge, index) => validateSpecEdge(edge, nodeById, index));
  const edges = sortedUnique(normalized.edges, (edge) => edge.id, 'spec edge');
  validateSupersedesLineage(edges);

  normalized.bindings.forEach((binding, index) =>
    validateBindingDeclaration(binding, normalized.workspaceId, nodeById, index)
  );
  const bindings = sortedUnique(
    normalized.bindings,
    (binding) => binding.id,
    'binding declaration'
  );

  const semanticPayload = immutableJson(
    {
      contractVersion: SPEC_GRAPH_CONTRACT_VERSION,
      workspaceId: normalized.workspaceId,
      nodes,
      edges,
      bindings,
      provenance: normalized.provenance,
    },
    'spec graph semantic payload'
  );
  const contentFingerprint = digest(semanticPayload);
  return immutableJson(
    {
      ...semanticPayload,
      revisionId: `spec-revision:${contentFingerprint}`,
      contentFingerprint,
    },
    'spec graph revision'
  ) as SpecGraphRevision;
}

function validateSpecNode(value: unknown, label: string): asserts value is SpecNode {
  const node = requireRecord(value, label);
  assertAllowedKeys(node, ['id', 'kind', 'title', 'lifecycle', 'source', 'tags'], label);
  requireNonEmpty(node.id, `${label} id`);
  assertOneOf(node.kind, SPEC_NODE_KINDS, `${label} kind`);
  requireNonEmpty(node.title, `${label} title`);
  validateSpecLifecycle(node.lifecycle, `${label} lifecycle`);
  validateSourceAnchor(node.source, `${label} source`);
  const tags = requireArray(node.tags, `${label} tags`);
  tags.forEach((tag, index) => requireNonEmpty(tag, `${label} tags[${index}]`));
}

function validateSpecLifecycle(value: unknown, label: string): void {
  const lifecycle = requireRecord(value, label);
  assertOneOf(lifecycle.mode, ['inherited', 'independent'] as const, `${label} mode`);
  if (lifecycle.mode === 'inherited') {
    assertAllowedKeys(lifecycle, ['mode', 'aggregateSpecId'], label);
    requireNonEmpty(lifecycle.aggregateSpecId, `${label} aggregateSpecId`);
    return;
  }
  assertAllowedKeys(lifecycle, ['mode', 'status', 'version'], label);
  assertOneOf(lifecycle.status, SPEC_STATUSES, `${label} status`);
  if (lifecycle.version !== undefined) requireNonEmpty(lifecycle.version, `${label} version`);
}

function validateLifecycle(node: SpecNode, nodes: ReadonlyMap<string, SpecNode>): void {
  if (node.kind === 'spec' && node.lifecycle.mode !== 'independent') {
    throw new Error(`Aggregate spec node ${node.id} must have an independent lifecycle`);
  }
  if (node.lifecycle.mode !== 'inherited') return;
  const aggregate = nodes.get(node.lifecycle.aggregateSpecId);
  if (!aggregate || aggregate.kind !== 'spec') {
    throw new Error(
      `Spec node ${node.id} inherits lifecycle from unknown aggregate ${node.lifecycle.aggregateSpecId}`
    );
  }
}

function validateSpecEdge(
  value: unknown,
  nodes: ReadonlyMap<string, SpecNode>,
  index: number
): asserts value is SpecEdge {
  const label = `spec edge[${index}]`;
  const edge = requireRecord(value, label);
  assertAllowedKeys(
    edge,
    ['id', 'kind', 'from', 'to', 'semanticQualifier', 'evidence', 'provenance'],
    label
  );
  requireNonEmpty(edge.id, `${label} id`);
  assertOneOf(edge.kind, SPEC_EDGE_KINDS, `${label} kind`);
  requireNonEmpty(edge.from, `${label} from`);
  requireNonEmpty(edge.to, `${label} to`);
  if (edge.semanticQualifier !== undefined) {
    requireNonEmpty(edge.semanticQualifier, `${label} semanticQualifier`);
  }
  const evidence = requireArray(edge.evidence, `${label} evidence`);
  evidence.forEach((entry, evidenceIndex) =>
    validateSpecEvidence(entry, `${label} evidence[${evidenceIndex}]`)
  );
  validateSpecProvenance(edge.provenance, `${label} provenance`);

  const typed = edge as unknown as SpecEdge;
  const from = nodes.get(typed.from);
  const to = nodes.get(typed.to);
  if (!from || !to) {
    throw new Error(`Spec edge ${typed.id} has an unknown endpoint: ${typed.from} -> ${typed.to}`);
  }
  if (!allowsEndpoints(typed.kind, from.kind, to.kind)) {
    throw new Error(
      `Spec edge ${typed.kind} does not allow ${from.kind} -> ${to.kind}: ${typed.from} -> ${typed.to}`
    );
  }
  if (typed.kind === 'supersedes' && typed.from === typed.to) {
    throw new Error(`Spec edge ${typed.id} cannot supersede itself`);
  }
  const expected = createSpecEdge({
    kind: typed.kind,
    from: typed.from,
    to: typed.to,
    ...(typed.semanticQualifier ? { semanticQualifier: typed.semanticQualifier } : {}),
    evidence: typed.evidence,
    provenance: typed.provenance,
  });
  if (typed.id !== expected.id) {
    throw new Error(`Spec edge identity mismatch: expected ${expected.id}, received ${typed.id}`);
  }
}

function validateSpecEvidence(value: unknown, label: string): void {
  const evidence = requireRecord(value, label);
  assertAllowedKeys(evidence, ['source', 'description'], label);
  validateSourceAnchor(evidence.source, `${label} source`);
  if (evidence.description !== undefined) {
    requireNonEmpty(evidence.description, `${label} description`);
  }
}

function validateSupersedesLineage(edges: readonly SpecEdge[]): void {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.kind !== 'supersedes') continue;
    const targets = adjacency.get(edge.from) ?? [];
    targets.push(edge.to);
    adjacency.set(edge.from, targets);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string): void => {
    if (visiting.has(nodeId)) {
      throw new Error(`Spec supersedes lineage contains a cycle through ${nodeId}`);
    }
    if (visited.has(nodeId)) return;
    visiting.add(nodeId);
    for (const target of adjacency.get(nodeId) ?? []) visit(target);
    visiting.delete(nodeId);
    visited.add(nodeId);
  };
  for (const nodeId of [...adjacency.keys()].sort(compareText)) visit(nodeId);
}

function validateBindingDeclaration(
  value: unknown,
  workspaceId: string,
  nodes: ReadonlyMap<string, SpecNode>,
  index: number
): asserts value is SpecBindingDeclaration {
  const label = `binding declaration[${index}]`;
  const binding = requireRecord(value, label);
  requireNonEmpty(binding.id, `${label} id`);
  assertOneOf(binding.kind, SPEC_BINDING_KINDS, `${label} kind`);
  requireNonEmpty(binding.specNodeId, `${label} specNodeId`);
  validateSourceAnchor(binding.source, `${label} source`);
  validateSpecProvenance(binding.provenance, `${label} provenance`);

  const specNode = nodes.get(binding.specNodeId as string);
  if (!specNode) {
    throw new Error(`Binding ${binding.id} references unknown spec node ${binding.specNodeId}`);
  }
  validateBindingSpecNodeKind(binding.kind, specNode.kind, binding.id as string);

  switch (binding.kind) {
    case 'implementation':
      assertAllowedKeys(
        binding,
        ['id', 'kind', 'specNodeId', 'target', 'source', 'provenance'],
        label
      );
      assertSelectorType(binding.target, ['code-node', 'api-surface'], `${label} target`);
      validateSelector(binding.target, workspaceId, nodes, `${label} target`);
      return;
    case 'verification':
      assertAllowedKeys(
        binding,
        ['id', 'kind', 'specNodeId', 'verifier', 'subject', 'source', 'provenance'],
        label
      );
      assertSelectorType(binding.verifier, ['test-evidence'], `${label} verifier`);
      assertSelectorType(
        binding.subject,
        ['spec-node', 'code-node', 'code-edge', 'api-surface'],
        `${label} subject`
      );
      validateSelector(binding.verifier, workspaceId, nodes, `${label} verifier`);
      validateSelector(binding.subject, workspaceId, nodes, `${label} subject`);
      return;
    case 'constraint':
      assertAllowedKeys(
        binding,
        ['id', 'kind', 'specNodeId', 'target', 'source', 'provenance'],
        label
      );
      assertSelectorType(
        binding.target,
        ['spec-node', 'code-node', 'code-edge', 'api-surface'],
        `${label} target`
      );
      validateSelector(binding.target, workspaceId, nodes, `${label} target`);
      return;
    case 'governance':
      assertAllowedKeys(
        binding,
        ['id', 'kind', 'specNodeId', 'target', 'source', 'provenance'],
        label
      );
      assertSelectorType(binding.target, ['code-node', 'api-surface'], `${label} target`);
      validateSelector(binding.target, workspaceId, nodes, `${label} target`);
      return;
  }
}

function validateBindingSpecNodeKind(
  bindingKind: SpecBindingKind,
  nodeKind: SpecNodeKind,
  bindingId: string
): void {
  const allowed: Readonly<Record<SpecBindingKind, readonly SpecNodeKind[]>> = {
    implementation: ['requirement', 'invariant', 'api-contract'],
    verification: ['requirement', 'invariant', 'api-contract'],
    constraint: ['invariant'],
    governance: ['api-contract'],
  };
  if (!allowed[bindingKind].includes(nodeKind)) {
    throw new Error(
      `Binding ${bindingId} kind ${bindingKind} does not allow spec node kind ${nodeKind}`
    );
  }
}

function validateSelector(
  value: unknown,
  workspaceId: string,
  nodes: ReadonlyMap<string, SpecNode> | undefined,
  label: string
): asserts value is BindingEndpointSelector {
  const record = requireRecord(value, label);
  assertOneOf(record.type, SELECTOR_TYPES, `${label} type`);
  requireNonEmpty(record.workspaceId, `${label} workspaceId`);
  if (record.workspaceId !== workspaceId) {
    throw new Error(
      `${label} workspace mismatch: expected ${workspaceId}, received ${record.workspaceId}`
    );
  }
  validateOptionalText(record.providerId, `${label} providerId`);

  switch (record.type) {
    case 'code-node': {
      assertAllowedKeys(
        record,
        [
          'type',
          'workspaceId',
          'providerId',
          'graphNamespace',
          'canonicalNodeId',
          'providerNodeId',
          'packageName',
          'packageVersion',
          'file',
          'qualifiedName',
          'kind',
          'sourceAnchor',
        ],
        label
      );
      for (const field of [
        'graphNamespace',
        'canonicalNodeId',
        'providerNodeId',
        'packageName',
        'packageVersion',
        'file',
        'qualifiedName',
        'kind',
      ] as const) {
        validateOptionalText(record[field], `${label} ${field}`);
      }
      const identityFields = [
        record.canonicalNodeId,
        record.providerNodeId,
        record.packageName,
        record.file,
        record.qualifiedName,
        record.kind,
      ];
      if (!identityFields.some((entry) => typeof entry === 'string' && entry.trim())) {
        throw new Error(`${label} must constrain at least one code-node identity field`);
      }
      validateRange(record.sourceAnchor, `${label} sourceAnchor`);
      return;
    }
    case 'code-edge':
      assertAllowedKeys(
        record,
        [
          'type',
          'workspaceId',
          'providerId',
          'graphNamespace',
          'plane',
          'kind',
          'from',
          'to',
          'occurrenceId',
        ],
        label
      );
      validateOptionalText(record.graphNamespace, `${label} graphNamespace`);
      validateOptionalText(record.kind, `${label} kind`);
      validateOptionalText(record.occurrenceId, `${label} occurrenceId`);
      if (record.plane !== undefined) {
        assertOneOf(
          record.plane,
          ['compiler-fact', 'producer-derived', 'router-derived'] as const,
          `${label} plane`
        );
      }
      assertSelectorType(record.from, ['code-node'], `${label} from`);
      assertSelectorType(record.to, ['code-node'], `${label} to`);
      validateSelector(record.from, workspaceId, nodes, `${label} from`);
      validateSelector(record.to, workspaceId, nodes, `${label} to`);
      return;
    case 'spec-node':
      assertAllowedKeys(record, ['type', 'workspaceId', 'specNodeId'], label);
      requireNonEmpty(record.specNodeId, `${label} specNodeId`);
      if (nodes && !nodes.has(record.specNodeId as string)) {
        throw new Error(`${label} references unknown spec node ${record.specNodeId}`);
      }
      return;
    case 'test-evidence':
      assertAllowedKeys(
        record,
        ['type', 'workspaceId', 'providerId', 'evidenceId', 'file', 'testName', 'runner'],
        label
      );
      for (const field of ['evidenceId', 'file', 'testName', 'runner'] as const) {
        validateOptionalText(record[field], `${label} ${field}`);
      }
      if (
        ![record.evidenceId, record.file, record.testName].some(
          (entry) => normalizedOptional(entry) !== undefined
        )
      ) {
        throw new Error(`${label} must constrain evidenceId, file, or testName`);
      }
      return;
    case 'api-surface':
      assertAllowedKeys(
        record,
        [
          'type',
          'workspaceId',
          'providerId',
          'packageName',
          'packageVersion',
          'module',
          'exportName',
        ],
        label
      );
      requireNonEmpty(record.packageName, `${label} packageName`);
      for (const field of ['packageVersion', 'module', 'exportName'] as const) {
        validateOptionalText(record[field], `${label} ${field}`);
      }
      return;
  }
}

function assertSelectorType(
  value: unknown,
  allowed: readonly BindingEndpointSelector['type'][],
  label: string
): void {
  const record = requireRecord(value, label);
  if (!allowed.includes(record.type as BindingEndpointSelector['type'])) {
    throw new Error(`${label} has unsupported selector type: ${String(record.type)}`);
  }
}

function validateSourceAnchor(value: unknown, label: string): asserts value is SpecSourceAnchor {
  const anchor = requireRecord(value, label);
  assertAllowedKeys(
    anchor,
    ['documentId', 'file', 'symbol', 'section', 'range', 'contentDigest'],
    label
  );
  requireNonEmpty(anchor.documentId, `${label}.documentId`);
  requireNonEmpty(anchor.file, `${label}.file`);
  requireNonEmpty(anchor.contentDigest, `${label}.contentDigest`);
  validateOptionalText(anchor.symbol, `${label}.symbol`);
  validateOptionalText(anchor.section, `${label}.section`);
  validateRange(anchor.range, `${label}.range`);
}

function validateRange(value: unknown, label: string): void {
  if (value === undefined) return;
  const range = requireRecord(value, label);
  assertAllowedKeys(range, ['startLine', 'startColumn', 'endLine', 'endColumn'], label);
  const startLine = positiveInteger(range.startLine, `${label}.startLine`);
  const startColumn = optionalPositiveInteger(range.startColumn, `${label}.startColumn`);
  const endLine = optionalPositiveInteger(range.endLine, `${label}.endLine`);
  const endColumn = optionalPositiveInteger(range.endColumn, `${label}.endColumn`);
  if (endLine !== undefined && endLine < startLine) {
    throw new Error(`${label}.endLine cannot precede startLine`);
  }
  if (
    endLine === startLine &&
    startColumn !== undefined &&
    endColumn !== undefined &&
    endColumn < startColumn
  ) {
    throw new Error(`${label}.endColumn cannot precede startColumn`);
  }
}

function validateSpecProvenance(value: unknown, label: string): asserts value is SpecProvenance {
  const provenance = requireRecord(value, label);
  assertAllowedKeys(
    provenance,
    ['source', 'extractorId', 'extractorVersion', 'sourceRevision', 'authoredSourceFingerprint'],
    label
  );
  assertOneOf(
    provenance.source,
    ['managed-document', 'imported-baseline'] as const,
    `${label} source`
  );
  requireNonEmpty(provenance.extractorId, `${label} extractorId`);
  requireNonEmpty(provenance.extractorVersion, `${label} extractorVersion`);
  validateOptionalText(provenance.sourceRevision, `${label} sourceRevision`);
  validateOptionalText(provenance.authoredSourceFingerprint, `${label} authoredSourceFingerprint`);
}

function validateSpecGraphProvenance(value: unknown): asserts value is SpecGraphProvenance {
  validateSpecProvenance(value, 'spec graph provenance');
  const provenance = value as unknown as PlainRecord;
  requireNonEmpty(
    provenance.authoredSourceFingerprint,
    'spec graph provenance authoredSourceFingerprint'
  );
}

function validatePolicyRule(value: unknown, label: string): PolicyRule {
  const rule = requireRecord(value, label);
  assertAllowedKeys(rule, ['id', 'version', 'enabled', 'severity', 'parameters'], label);
  requireNonEmpty(rule.id, `${label} id`);
  requireNonEmpty(rule.version, `${label} version`);
  if (typeof rule.enabled !== 'boolean') throw new Error(`${label} enabled must be a boolean`);
  if (rule.severity !== undefined) {
    assertOneOf(rule.severity, ['error', 'warning', 'info'] as const, `${label} severity`);
  }
  if (rule.parameters !== undefined) requireRecord(rule.parameters, `${label} parameters`);
  return rule as unknown as PolicyRule;
}

function normalizePolicySuppression(value: unknown, label: string): PolicySuppression {
  const suppression = requireRecord(value, label);
  assertAllowedKeys(suppression, ['id', 'ruleId', 'target', 'reason', 'expiresAt'], label);
  requireNonEmpty(suppression.id, `${label} id`);
  requireNonEmpty(suppression.ruleId, `${label} ruleId`);
  requireNonEmpty(suppression.reason, `${label} reason`);
  const target = requireRecord(suppression.target, `${label} target`);
  requireNonEmpty(target.workspaceId, `${label} target workspaceId`);
  validateSelector(suppression.target, target.workspaceId as string, undefined, `${label} target`);
  const expiresAt =
    suppression.expiresAt === undefined
      ? undefined
      : normalizeRfc3339Timestamp(suppression.expiresAt, `${label} expiresAt`);
  return immutableJson(
    {
      id: suppression.id,
      ruleId: suppression.ruleId,
      target: suppression.target,
      reason: suppression.reason,
      ...(expiresAt ? { expiresAt } : {}),
    },
    label
  ) as PolicySuppression;
}

function validatePolicyProvenance(value: unknown): asserts value is PolicyProvenance {
  const provenance = requireRecord(value, 'policy provenance');
  assertAllowedKeys(
    provenance,
    ['source', 'compilerId', 'compilerVersion', 'sourceFingerprint'],
    'policy provenance'
  );
  assertOneOf(
    provenance.source,
    ['managed-policy', 'workspace-config', 'default'] as const,
    'policy provenance source'
  );
  requireNonEmpty(provenance.compilerId, 'policy provenance compilerId');
  requireNonEmpty(provenance.compilerVersion, 'policy provenance compilerVersion');
  requireNonEmpty(provenance.sourceFingerprint, 'policy provenance sourceFingerprint');
}

/** Normalize a strict calendar-valid RFC3339 timestamp to canonical UTC ISO form. */
export function normalizeRfc3339Timestamp(value: unknown, label: string): string {
  requireNonEmpty(value, label);
  const match = RFC3339_WITH_TIMEZONE.exec(value);
  if (!match) {
    throw new Error(`${label} must be an RFC3339 date-time with an explicit timezone`);
  }
  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    ,
    zone,
    ,
    offsetHourText,
    offsetMinuteText,
  ] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (month < 1 || month > 12) throw new Error(`${label} has an invalid month`);
  if (day < 1 || day > daysInMonth(year, month)) throw new Error(`${label} has an invalid day`);
  if (hour > 23 || minute > 59 || second > 59) {
    throw new Error(`${label} has an invalid time`);
  }
  if (zone.toUpperCase() !== 'Z') {
    const offsetHour = Number(offsetHourText);
    const offsetMinute = Number(offsetMinuteText);
    if (offsetHour > 23 || offsetMinute > 59) {
      throw new Error(`${label} has an invalid timezone offset`);
    }
  }
  const parsed = Date.parse(value.replace('t', 'T').replace('z', 'Z'));
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a valid RFC3339 date-time`);
  return new Date(parsed).toISOString();
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function canonicalResolutionParticipants(
  value: readonly ResolvedBindingParticipant[]
): readonly ResolvedBindingParticipant[] {
  const cloned = immutableJson(value, 'binding resolution participants');
  const participants = requireArray(cloned, 'binding resolution participants');
  const normalized = participants.map((entry, index) => {
    const label = `binding resolution participant[${index}]`;
    const participant = requireRecord(entry, label);
    assertAllowedKeys(participant, ['role', 'status', 'refs'], label);
    assertOneOf(participant.role, RESOLUTION_ROLES, `${label} role`);
    assertOneOf(participant.status, RESOLUTION_STATUSES, `${label} status`);
    const refs = requireArray(participant.refs, `${label} refs`)
      .map((ref, refIndex) => {
        requireRecord(ref, `${label} refs[${refIndex}]`);
        return ref as EndpointRef;
      })
      .sort((left, right) => compareText(stableJson(left), stableJson(right)));
    return immutableJson(
      {
        role: participant.role,
        status: participant.status,
        refs,
      },
      label
    ) as ResolvedBindingParticipant;
  });
  normalized.sort(
    (left, right) =>
      compareText(left.role, right.role) || compareText(stableJson(left), stableJson(right))
  );
  return Object.freeze(normalized);
}

function validateResolverIdentity(value: unknown): void {
  const resolver = requireRecord(value, 'binding resolver identity');
  assertAllowedKeys(resolver, ['id', 'version', 'configDigest'], 'binding resolver identity');
  requireNonEmpty(resolver.id, 'binding resolver identity id');
  requireNonEmpty(resolver.version, 'binding resolver identity version');
  validateOptionalText(resolver.configDigest, 'binding resolver identity configDigest');
}

function allowsEndpoints(kind: SpecEdgeKind, from: SpecNodeKind, to: SpecNodeKind): boolean {
  const obligation = (value: SpecNodeKind): boolean =>
    value === 'requirement' || value === 'invariant' || value === 'api-contract';
  switch (kind) {
    case 'contains':
      return from === 'spec' && to !== 'spec';
    case 'refines':
    case 'requires':
      return obligation(from) && obligation(to);
    case 'establishes':
      return from === 'decision' && obligation(to);
    case 'supersedes':
      return from === to;
  }
}

function sortedUnique<T>(values: readonly T[], keyOf: (value: T) => string, label: string): T[] {
  const seen = new Set<string>();
  const sorted = [...values].sort((left, right) => compareText(keyOf(left), keyOf(right)));
  for (const value of sorted) {
    const key = keyOf(value);
    requireNonEmpty(key, `${label} id`);
    if (seen.has(key)) throw new Error(`Duplicate ${label} id: ${key}`);
    seen.add(key);
  }
  return sorted;
}

function normalizedOptional(value: unknown, label = 'optional value'): string | undefined {
  if (value === undefined) return undefined;
  requireNonEmpty(value, label);
  return value.trim();
}

function validateOptionalText(value: unknown, label: string): void {
  if (value !== undefined) requireNonEmpty(value, label);
}

function requireNonEmpty(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function requireRecord(value: unknown, label: string): PlainRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value as PlainRecord;
}

function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function assertAllowedKeys(value: PlainRecord, allowed: readonly string[], label: string): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) throw new Error(`${label} has unsupported field: ${key}`);
  }
}

function assertOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string
): asserts value is T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`${label} has unsupported value: ${String(value)}`);
  }
}

function positiveInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value as number;
}

function optionalPositiveInteger(value: unknown, label: string): number | undefined {
  return value === undefined ? undefined : positiveInteger(value, label);
}

function digest(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalJson(value, new Set<object>(), 'identity payload'));
}

function immutableJson<T>(value: T, label: string): T {
  return canonicalJson(value, new Set<object>(), label) as T;
}

function canonicalJson(value: unknown, ancestors: Set<object>, path: string): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${path} requires finite JSON numbers`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (
    value === undefined ||
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint'
  ) {
    throw new Error(`${path} cannot contain ${typeof value}; strict JSON values are required`);
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new Error(`${path} cannot contain circular JSON values`);
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw new Error(`${path} cannot contain symbol keys`);
    }
    for (const key of Object.keys(value)) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || String(index) !== key || index >= value.length) {
        throw new Error(`${path} arrays cannot contain non-index properties`);
      }
    }
    ancestors.add(value);
    const clone = Array.from({ length: value.length }, (_, index) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor) throw new Error(`${path} cannot contain sparse arrays`);
      if (!descriptor?.enumerable || descriptor.get || descriptor.set) {
        throw new Error(`${path}[${index}] must be an enumerable JSON data property`);
      }
      return canonicalJson(descriptor.value, ancestors, `${path}[${index}]`);
    });
    ancestors.delete(value);
    return Object.freeze(clone);
  }
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    const prototype = Object.getPrototypeOf(object);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`${path} requires plain JSON objects`);
    }
    if (Object.getOwnPropertySymbols(object).length > 0) {
      throw new Error(`${path} cannot contain symbol keys`);
    }
    if (ancestors.has(object)) throw new Error(`${path} cannot contain circular JSON values`);
    ancestors.add(object);
    const descriptors = Object.getOwnPropertyDescriptors(object);
    const clone: Record<string, unknown> = {};
    for (const key of Object.keys(descriptors).sort(compareText)) {
      const descriptor = descriptors[key];
      if (!descriptor.enumerable || descriptor.get || descriptor.set) {
        throw new Error(`${path}.${key} must be an enumerable JSON data property`);
      }
      Object.defineProperty(clone, key, {
        value: canonicalJson(descriptor.value, ancestors, `${path}.${key}`),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    ancestors.delete(object);
    return Object.freeze(clone);
  }
  throw new Error(`${path} contains an unsupported JSON value`);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
