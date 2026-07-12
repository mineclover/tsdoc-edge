/** Compile one authored convention-pack source into exact analysis revisions. */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { RELATION_SEMANTIC_REGISTRY_VERSION } from '../graph-analysis/edge-semantics';
import { createRuleSetRevision } from '../semantic-graph/EffectiveAnalysisService';
import {
  EXACT_BINDING_RESOLVER_ID,
  EXACT_BINDING_RESOLVER_VERSION,
} from '../spec-graph/BindingResolver';
import {
  CONFORMANCE_ENGINE_ID,
  CONFORMANCE_ENGINE_VERSION,
  CONFORMANCE_RULE_IDS,
} from '../spec-graph/ConformanceEngine';
import type {
  PolicyRule,
  PolicySuppression,
  SpecBindingDeclaration,
  SpecGraphProvenance,
  SpecNode,
  SpecProvenance,
  SpecSourceAnchor,
} from '../spec-graph/contracts';
import {
  createPolicyRevision,
  createSpecEdge,
  createSpecGraphRevision,
} from '../spec-graph/identity';
import {
  CONVENTION_PACK_COMPILER_ID,
  CONVENTION_PACK_COMPILER_VERSION,
  CONVENTION_PACK_CONTRACT_VERSION,
  CONVENTION_PACK_MANIFEST_CONTRACT_ID,
  CONVENTION_PACK_SOURCE_CONTRACT_ID,
  type CompiledConventionPack,
  type ConventionCapabilityRequirement,
  type ConventionPackManifest,
  type ConventionPackSource,
  type ConventionPolicyRevisionPin,
  type ConventionRevisionPin,
} from './contracts';

const CANONICAL_SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const SUPPORTED_RULE_IDS = new Set<string>(Object.values(CONFORMANCE_RULE_IDS));
const SUPPORTED_RULE_VERSIONS: Readonly<Record<string, string>> = Object.freeze({
  [CONFORMANCE_RULE_IDS.implementation]: '1.0.0',
  [CONFORMANCE_RULE_IDS.verification]: '2.0.0',
  [CONFORMANCE_RULE_IDS.constraint]: '1.0.0',
  [CONFORMANCE_RULE_IDS.governance]: '1.0.0',
});
const materializedConventionPacks = new WeakSet<object>();

export interface ConventionPackSourceContext {
  /** Workspace-relative authored file path. */
  readonly file: string;
  /** Digest of the exact authored bytes. */
  readonly contentDigest: string;
}

export interface CompileConventionPackFileOptions {
  readonly workspaceRoot?: string;
}

/** Require the exact process-local object emitted by the convention compiler. */
export function assertCompiledConventionPack(pack: CompiledConventionPack): void {
  if (!materializedConventionPacks.has(pack)) {
    throw new Error('Compiled convention pack was not materialized by ConventionPackCompiler');
  }
}

/** Read and compile one workspace-local JSON convention pack. */
export function compileConventionPackFile(
  filePath: string,
  options: CompileConventionPackFileOptions = {}
): CompiledConventionPack {
  const requestedWorkspaceRoot = path.resolve(options.workspaceRoot ?? process.cwd());
  if (
    !fs.existsSync(requestedWorkspaceRoot) ||
    !fs.statSync(requestedWorkspaceRoot).isDirectory()
  ) {
    throw new Error(`Convention pack workspace root not found: ${requestedWorkspaceRoot}`);
  }
  const requestedPath = path.resolve(requestedWorkspaceRoot, filePath);
  if (!fs.existsSync(requestedPath) || !fs.statSync(requestedPath).isFile()) {
    throw new Error(`Convention pack source not found: ${requestedPath}`);
  }
  const workspaceRoot = fs.realpathSync(requestedWorkspaceRoot);
  const absolutePath = fs.realpathSync(requestedPath);
  const relativePath = path.relative(workspaceRoot, absolutePath).split(path.sep).join('/');
  if (!relativePath || relativePath === '..' || relativePath.startsWith('../')) {
    throw new Error('Convention pack source must resolve to a file inside the workspace root');
  }
  const sourceText = fs.readFileSync(absolutePath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(sourceText);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid convention pack JSON: ${detail}`);
  }
  return compileConventionPackSource(parsed, {
    file: relativePath,
    contentDigest: `sha256:${digestText(sourceText)}`,
  });
}

/** Compile an already parsed source using explicit, deterministic source identity. */
export function compileConventionPackSource(
  source: unknown,
  context: ConventionPackSourceContext
): CompiledConventionPack {
  const normalized = strictJsonClone(source, 'convention pack source') as ConventionPackSource;
  const record = requireRecord(normalized, 'convention pack source');
  assertAllowedKeys(
    record,
    [
      'contractId',
      'contractVersion',
      'packId',
      'packVersion',
      'scope',
      'graphNamespace',
      'capabilities',
      'spec',
      'policy',
    ],
    'convention pack source'
  );
  if (normalized.contractId !== CONVENTION_PACK_SOURCE_CONTRACT_ID) {
    throw new Error(
      `Unsupported convention pack source contract: ${String(normalized.contractId)}`
    );
  }
  if (normalized.contractVersion !== CONVENTION_PACK_CONTRACT_VERSION) {
    throw new Error(
      `Unsupported convention pack source version: ${String(normalized.contractVersion)}`
    );
  }
  if (requireText(normalized.packId, 'packId') !== normalized.packId) {
    throw new Error('packId must not contain leading or trailing whitespace');
  }
  if (requireText(normalized.packVersion, 'packVersion') !== normalized.packVersion) {
    throw new Error('packVersion must not contain leading or trailing whitespace');
  }
  if (!CANONICAL_SEMVER.test(normalized.packVersion)) {
    throw new Error(`packVersion must be canonical SemVer: ${normalized.packVersion}`);
  }
  if (requireText(context.file, 'convention pack source file') !== context.file) {
    throw new Error('Convention pack source file must be canonical text');
  }
  if (
    requireText(context.contentDigest, 'convention pack source contentDigest') !==
    context.contentDigest
  ) {
    throw new Error('Convention pack source contentDigest must be canonical text');
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(context.contentDigest)) {
    throw new Error('Convention pack source contentDigest must be a canonical SHA-256 identifier');
  }

  const scope = normalizeScope(normalized.scope);
  const graphNamespace = optionalText(normalized.graphNamespace, 'graphNamespace');
  const capabilities = normalizeCapabilities(normalized.capabilities ?? {});
  const itemProvenance: SpecProvenance = Object.freeze({
    source: 'managed-document',
    extractorId: CONVENTION_PACK_COMPILER_ID,
    extractorVersion: CONVENTION_PACK_COMPILER_VERSION,
    sourceRevision: normalized.packVersion,
  });
  const graphProvenance: SpecGraphProvenance = Object.freeze({
    ...itemProvenance,
    authoredSourceFingerprint: context.contentDigest,
  });
  const anchor = (symbol: string): SpecSourceAnchor =>
    Object.freeze({
      documentId: normalized.packId,
      file: context.file,
      symbol,
      contentDigest: context.contentDigest,
    });

  const specSource = requireRecord(normalized.spec, 'convention pack spec');
  assertAllowedKeys(specSource, ['nodes', 'edges', 'bindings'], 'convention pack spec');
  const nodeSources = requireArray(specSource.nodes, 'convention pack spec nodes');
  const edgeSources = requireArray(specSource.edges ?? [], 'convention pack spec edges');
  const bindingSources = requireArray(specSource.bindings, 'convention pack spec bindings');
  if (bindingSources.length === 0) {
    throw new Error('Convention pack must contain at least one spec binding');
  }

  const nodes = nodeSources.map((value, index) => {
    const node = requireRecord(value, `convention pack spec node[${index}]`);
    assertAllowedKeys(
      node,
      ['id', 'kind', 'title', 'lifecycle', 'tags'],
      `convention pack spec node[${index}]`
    );
    const id = requireText(node.id, `convention pack spec node[${index}] id`);
    return { ...node, source: anchor(id) } as unknown as SpecNode;
  });
  const edges = edgeSources.map((value, index) => {
    const edge = requireRecord(value, `convention pack spec edge[${index}]`);
    assertAllowedKeys(
      edge,
      ['kind', 'from', 'to', 'semanticQualifier'],
      `convention pack spec edge[${index}]`
    );
    const from = requireText(edge.from, `convention pack spec edge[${index}] from`);
    const to = requireText(edge.to, `convention pack spec edge[${index}] to`);
    return createSpecEdge({
      kind: edge.kind as Parameters<typeof createSpecEdge>[0]['kind'],
      from,
      to,
      ...(edge.semanticQualifier === undefined
        ? {}
        : {
            semanticQualifier: requireText(
              edge.semanticQualifier,
              `convention pack spec edge[${index}] semanticQualifier`
            ),
          }),
      evidence: [{ source: anchor(`${from}->${to}`) }],
      provenance: itemProvenance,
    });
  });
  const bindings = bindingSources.map((value, index) => {
    const binding = requireRecord(value, `convention pack binding[${index}]`);
    assertBindingSourceShape(binding, index);
    const id = requireText(binding.id, `convention pack binding[${index}] id`);
    return {
      ...binding,
      source: anchor(id),
      provenance: itemProvenance,
    } as unknown as SpecBindingDeclaration;
  });
  const spec = createSpecGraphRevision({
    workspaceId: scope.workspaceId,
    nodes,
    edges,
    bindings,
    provenance: graphProvenance,
  });

  const policySource = requireRecord(normalized.policy, 'convention pack policy');
  assertAllowedKeys(
    policySource,
    ['relationSemanticRegistryVersion', 'lifecycleGateVersion', 'rules', 'suppressions'],
    'convention pack policy'
  );
  const rules = requireArray(policySource.rules, 'convention pack policy rules') as PolicyRule[];
  const suppressions = requireArray(
    policySource.suppressions ?? [],
    'convention pack policy suppressions'
  ) as PolicySuppression[];
  for (const [index, rule] of rules.entries()) {
    const ruleRecord = requireRecord(rule, `convention pack policy rule[${index}]`);
    const ruleId = requireText(ruleRecord.id, `convention pack policy rule[${index}] id`);
    if (!SUPPORTED_RULE_IDS.has(ruleId)) {
      throw new Error(`Unsupported convention rule id in v1: ${ruleId}`);
    }
    if (ruleRecord.version !== SUPPORTED_RULE_VERSIONS[ruleId]) {
      throw new Error(
        `Unsupported convention rule contract: ${ruleId}@${String(ruleRecord.version)}`
      );
    }
    if (ruleRecord.parameters !== undefined) {
      throw new Error(`Convention rule parameters are not executable in v1: ${ruleId}`);
    }
    if (ruleRecord.severity === undefined) {
      throw new Error(`Convention rule severity must be explicit in v1: ${ruleId}`);
    }
  }
  const relationSemanticRegistryVersion =
    policySource.relationSemanticRegistryVersion === undefined
      ? RELATION_SEMANTIC_REGISTRY_VERSION
      : requireText(
          policySource.relationSemanticRegistryVersion,
          'policy relationSemanticRegistryVersion'
        );
  const policy = createPolicyRevision({
    relationSemanticRegistryVersion,
    lifecycleGateVersion: requireText(
      policySource.lifecycleGateVersion,
      'policy lifecycleGateVersion'
    ),
    rules,
    suppressions,
    provenance: {
      source: 'managed-policy',
      compilerId: CONVENTION_PACK_COMPILER_ID,
      compilerVersion: CONVENTION_PACK_COMPILER_VERSION,
      sourceFingerprint: context.contentDigest,
    },
  });
  validateExecutablePolicy(bindings, policy.rules, policy.suppressions);

  const ruleSet = createRuleSetRevision({
    analyzerVersions: {
      [EXACT_BINDING_RESOLVER_ID]: EXACT_BINDING_RESOLVER_VERSION,
      [CONFORMANCE_ENGINE_ID]: CONFORMANCE_ENGINE_VERSION,
    },
  });
  const semanticPayload = {
    contractId: CONVENTION_PACK_MANIFEST_CONTRACT_ID,
    contractVersion: CONVENTION_PACK_CONTRACT_VERSION,
    packId: normalized.packId,
    packVersion: normalized.packVersion,
    scope,
    ...(graphNamespace ? { graphNamespace } : {}),
    capabilities,
    spec: {
      revisionId: spec.revisionId,
      contentFingerprint: spec.contentFingerprint,
    },
    policy: {
      revisionId: policy.revisionId,
      contentDigest: policy.contentDigest,
    },
    ruleSet: {
      revisionId: ruleSet.revisionId,
      contentFingerprint: ruleSet.contentFingerprint,
    },
    provenance: graphProvenance,
  } as const;
  const contentDigest = digest(semanticPayload);
  const manifest = validateConventionPackManifest({
    ...semanticPayload,
    manifestId: `convention-pack:${contentDigest}`,
    contentDigest,
  });
  const compiled = Object.freeze({ manifest, spec, policy, ruleSet });
  materializedConventionPacks.add(compiled);
  return compiled;
}

/** Recompute and validate a compiled manifest before it selects analysis inputs. */
export function validateConventionPackManifest(value: unknown): ConventionPackManifest {
  const normalized = strictJsonClone(value, 'convention pack manifest');
  const manifest = requireRecord(normalized, 'convention pack manifest');
  assertAllowedKeys(
    manifest,
    [
      'contractId',
      'contractVersion',
      'manifestId',
      'contentDigest',
      'packId',
      'packVersion',
      'scope',
      'graphNamespace',
      'capabilities',
      'spec',
      'policy',
      'ruleSet',
      'provenance',
    ],
    'convention pack manifest'
  );
  if (manifest.contractId !== CONVENTION_PACK_MANIFEST_CONTRACT_ID) {
    throw new Error(
      `Unsupported convention pack manifest contract: ${String(manifest.contractId)}`
    );
  }
  if (manifest.contractVersion !== CONVENTION_PACK_CONTRACT_VERSION) {
    throw new Error(
      `Unsupported convention pack manifest version: ${String(manifest.contractVersion)}`
    );
  }
  const packId = canonicalText(manifest.packId, 'manifest packId');
  const packVersion = canonicalText(manifest.packVersion, 'manifest packVersion');
  if (!CANONICAL_SEMVER.test(packVersion)) {
    throw new Error(`manifest packVersion must be canonical SemVer: ${packVersion}`);
  }
  const scope = normalizeScope(manifest.scope);
  const graphNamespace = optionalText(manifest.graphNamespace, 'manifest graphNamespace');
  const capabilities = normalizeCapabilities(manifest.capabilities);
  const spec = normalizeRevisionPin(
    manifest.spec,
    'spec-revision:',
    'contentFingerprint',
    'manifest spec'
  );
  const policy = normalizeRevisionPin(
    manifest.policy,
    'policy-revision:',
    'contentDigest',
    'manifest policy'
  );
  const ruleSet = normalizeRevisionPin(
    manifest.ruleSet,
    'rule-set-revision:',
    'contentFingerprint',
    'manifest ruleSet'
  );
  const provenanceRecord = requireRecord(manifest.provenance, 'manifest provenance');
  assertAllowedKeys(
    provenanceRecord,
    ['source', 'extractorId', 'extractorVersion', 'sourceRevision', 'authoredSourceFingerprint'],
    'manifest provenance'
  );
  if (provenanceRecord.source !== 'managed-document') {
    throw new Error('Convention pack manifest provenance must be managed-document');
  }
  const provenance: SpecGraphProvenance = Object.freeze({
    source: 'managed-document',
    extractorId: canonicalText(provenanceRecord.extractorId, 'manifest provenance extractorId'),
    extractorVersion: canonicalText(
      provenanceRecord.extractorVersion,
      'manifest provenance extractorVersion'
    ),
    ...(provenanceRecord.sourceRevision === undefined
      ? {}
      : {
          sourceRevision: canonicalText(
            provenanceRecord.sourceRevision,
            'manifest provenance sourceRevision'
          ),
        }),
    authoredSourceFingerprint: canonicalText(
      provenanceRecord.authoredSourceFingerprint,
      'manifest provenance authoredSourceFingerprint'
    ),
  });
  if (
    provenance.extractorId !== CONVENTION_PACK_COMPILER_ID ||
    provenance.extractorVersion !== CONVENTION_PACK_COMPILER_VERSION ||
    provenance.sourceRevision !== packVersion
  ) {
    throw new Error('Convention pack manifest provenance does not match the v1 compiler identity');
  }
  const semanticPayload = {
    contractId: CONVENTION_PACK_MANIFEST_CONTRACT_ID,
    contractVersion: CONVENTION_PACK_CONTRACT_VERSION,
    packId,
    packVersion,
    scope,
    ...(graphNamespace ? { graphNamespace } : {}),
    capabilities,
    spec,
    policy,
    ruleSet,
    provenance,
  } as const;
  const expectedDigest = digest(semanticPayload);
  const contentDigest = canonicalDigest(manifest.contentDigest, 'manifest contentDigest');
  const manifestId = canonicalText(manifest.manifestId, 'manifestId');
  if (contentDigest !== expectedDigest || manifestId !== `convention-pack:${expectedDigest}`) {
    throw new Error('Convention pack manifest identity does not match its canonical content');
  }
  return immutableJson({ ...semanticPayload, manifestId, contentDigest }) as ConventionPackManifest;
}

function normalizeScope(value: unknown): ConventionPackSource['scope'] {
  const scope = requireRecord(value, 'convention pack scope');
  assertAllowedKeys(scope, ['kind', 'workspaceId'], 'convention pack scope');
  if (scope.kind !== 'workspace') {
    throw new Error(`Unsupported convention pack scope: ${String(scope.kind)}`);
  }
  return Object.freeze({
    kind: 'workspace',
    workspaceId: requireText(scope.workspaceId, 'convention pack scope workspaceId'),
  });
}

function normalizeCapabilities(
  value: unknown
): Readonly<Record<string, ConventionCapabilityRequirement>> {
  const capabilities = requireRecord(value, 'convention pack capabilities');
  const normalized: Record<string, ConventionCapabilityRequirement> = {};
  for (const [id, requirementValue] of Object.entries(capabilities).sort(([left], [right]) =>
    compareText(left, right)
  )) {
    requireText(id, 'convention capability id');
    const requirement = requireRecord(requirementValue, `convention capability ${id}`);
    assertAllowedKeys(requirement, ['minimumStatus', 'version'], `convention capability ${id}`);
    if (requirement.minimumStatus !== 'partial' && requirement.minimumStatus !== 'complete') {
      throw new Error(`Invalid minimumStatus for convention capability ${id}`);
    }
    normalized[id] = Object.freeze({
      minimumStatus: requirement.minimumStatus,
      ...(requirement.version === undefined
        ? {}
        : { version: requireText(requirement.version, `convention capability ${id} version`) }),
    });
  }
  return Object.freeze(normalized);
}

function normalizeRevisionPin(
  value: unknown,
  revisionPrefix: string,
  fingerprintKey: 'contentFingerprint',
  label: string
): ConventionRevisionPin;
function normalizeRevisionPin(
  value: unknown,
  revisionPrefix: string,
  fingerprintKey: 'contentDigest',
  label: string
): ConventionPolicyRevisionPin;
function normalizeRevisionPin(
  value: unknown,
  revisionPrefix: string,
  fingerprintKey: 'contentFingerprint' | 'contentDigest',
  label: string
): ConventionRevisionPin | ConventionPolicyRevisionPin {
  const pin = requireRecord(value, label);
  assertAllowedKeys(pin, ['revisionId', fingerprintKey], label);
  const fingerprint = canonicalDigest(pin[fingerprintKey], `${label} ${fingerprintKey}`);
  const revisionId = canonicalText(pin.revisionId, `${label} revisionId`);
  if (revisionId !== `${revisionPrefix}${fingerprint}`) {
    throw new Error(`${label} revisionId does not match ${fingerprintKey}`);
  }
  return fingerprintKey === 'contentFingerprint'
    ? Object.freeze({ revisionId, contentFingerprint: fingerprint })
    : Object.freeze({ revisionId, contentDigest: fingerprint });
}

function assertBindingSourceShape(binding: Record<string, unknown>, index: number): void {
  const label = `convention pack binding[${index}]`;
  const base = ['id', 'kind', 'specNodeId'];
  switch (binding.kind) {
    case 'implementation':
      assertAllowedKeys(binding, [...base, 'target'], label);
      return;
    case 'verification':
      assertAllowedKeys(binding, [...base, 'verifier', 'subject'], label);
      return;
    case 'constraint':
    case 'governance':
      assertAllowedKeys(binding, [...base, 'target'], label);
      return;
    default:
      throw new Error(`Unsupported convention binding kind: ${String(binding.kind)}`);
  }
}

function validateExecutablePolicy(
  bindings: readonly SpecBindingDeclaration[],
  rules: readonly PolicyRule[],
  suppressions: readonly PolicySuppression[]
): void {
  const ruleIds = new Set(rules.map((rule) => rule.id));
  const usedRuleIds = new Set<string>();
  for (const kind of new Set(bindings.map((binding) => binding.kind))) {
    const expected = CONFORMANCE_RULE_IDS[kind];
    usedRuleIds.add(expected);
    if (!ruleIds.has(expected)) {
      throw new Error(`Convention pack must explicitly define policy rule ${expected}`);
    }
  }
  if (!rules.some((rule) => rule.enabled && usedRuleIds.has(rule.id))) {
    throw new Error('Convention pack must enable at least one rule used by a binding');
  }
  for (const suppression of suppressions) {
    if (!ruleIds.has(suppression.ruleId)) {
      throw new Error(
        `Convention suppression ${suppression.id} references undefined rule ${suppression.ruleId}`
      );
    }
  }
}

function strictJsonClone(value: unknown, label: string, seen = new Set<object>()): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${label} contains a non-finite number`);
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new Error(`${label} contains a cycle`);
    seen.add(value);
    const clone = value.map((entry, index) => {
      if (Object.getOwnPropertyDescriptor(value, index) === undefined) {
        throw new Error(`${label} contains a sparse array`);
      }
      return strictJsonClone(entry, `${label}[${index}]`, seen);
    });
    seen.delete(value);
    return clone;
  }
  if (typeof value !== 'object') {
    throw new Error(`${label} contains a non-JSON value`);
  }
  const object = value as object;
  if (seen.has(object)) throw new Error(`${label} contains a cycle`);
  const prototype = Object.getPrototypeOf(object);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${label} contains a non-plain object`);
  }
  if (Object.getOwnPropertySymbols(object).length > 0) {
    throw new Error(`${label} contains symbol keys`);
  }
  seen.add(object);
  const clone: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const [key, child] of Object.entries(object as Record<string, unknown>)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
      throw new Error(`${label} contains a forbidden object key: ${key}`);
    }
    clone[key] = strictJsonClone(child, `${label}.${key}`, seen);
  }
  seen.delete(object);
  return clone;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function requireText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}

function canonicalText(value: unknown, label: string): string {
  const normalized = requireText(value, label);
  if (normalized !== value) throw new Error(`${label} must not contain surrounding whitespace`);
  return normalized;
}

function canonicalDigest(value: unknown, label: string): string {
  const normalized = canonicalText(value, label);
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest`);
  }
  return normalized;
}

function optionalText(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : requireText(value, label);
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string
): void {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(value).filter((key) => !allowedSet.has(key));
  if (unknown.length > 0) throw new Error(`${label} has unknown field(s): ${unknown.join(', ')}`);
}

function digest(value: unknown): string {
  return digestText(stableJson(value));
}

function digestText(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => compareText(left, right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function immutableJson<T>(value: T): T {
  if (Array.isArray(value)) {
    value.forEach((child) => immutableJson(child));
    return Object.freeze(value);
  }
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((child) => immutableJson(child));
    return Object.freeze(value);
  }
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
