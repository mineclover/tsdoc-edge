/** Shared application service for revision-pinned convention-pack checks. */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { RELATION_SEMANTIC_REGISTRY_VERSION } from '../graph-analysis/edge-semantics';
import {
  createCanonicalEmptyEnrichmentRevision,
  createCanonicalEmptyEvidenceRevision,
  type EnrichmentRevision,
  type EvidenceRevision,
} from '../semantic-graph/analysis-input-revisions';
import type { EffectiveAnalysisInputStamp } from '../semantic-graph/contracts';
import {
  EffectiveAnalysisService,
  providerAnalysisIdentityFromGraph,
} from '../semantic-graph/EffectiveAnalysisService';
import {
  type BindingResolutionDiagnostic,
  ExactBindingResolver,
} from '../spec-graph/BindingResolver';
import { ConformanceEngine, type ConformanceReport } from '../spec-graph/ConformanceEngine';
import {
  type ActiveCanonicalGraphRevision,
  assertGraphRepositoryRevision,
} from '../storage/GraphRepository';
import type { NamingConventionConfig, TsdocConventionConfig } from '../types/config';
import {
  assertCompiledConventionPack,
  validateConventionPackManifest,
} from './ConventionPackCompiler';
import type {
  CompiledConventionPack,
  ConventionCapabilityRequirement,
  ConventionPackManifest,
} from './contracts';
import {
  NamingConventionEvaluator,
  type NamingConventionReport,
} from './NamingConventionEvaluator';
import { TsdocConventionEvaluator, type TsdocConventionReport } from './TsdocConventionEvaluator';
import { loadTsdocEnrichment } from './TsdocEnrichmentLoader';

export interface ConventionCapabilityCheck {
  readonly id: string;
  readonly required: ConventionCapabilityRequirement;
  readonly observedStatus: 'unsupported' | 'partial' | 'complete';
  readonly observedVersion?: string;
}

export interface ConventionCheckInput {
  readonly pack: CompiledConventionPack;
  readonly codeRevision: ActiveCanonicalGraphRevision;
  readonly workspaceRoot: string;
  /** Ephemeral evidence collected for this one check invocation. */
  readonly evidence?: EvidenceRevision;
  /** Exact enrichment selected by retained replay; never recompute from current files when supplied. */
  readonly enrichment?: EnrichmentRevision;
  /** Location-aware naming policy selected from workspace configuration. */
  readonly naming?: NamingConventionConfig;
  /** Exact tag requirements evaluated from the loader-produced enrichment revision. */
  readonly tsdoc?: TsdocConventionConfig;
  /** Optional CI/lockfile pin preventing same-version pack replacement. */
  readonly expectedManifestId?: string;
  /** Required whenever the policy contains an expiring suppression. */
  readonly suppressionAsOf?: string;
}

export interface ConventionCheckResult {
  readonly contractVersion: '1.0';
  readonly resultKind: 'convention-check';
  readonly checkId: string;
  readonly pack: ConventionPackManifest;
  readonly codeRevisionId: string;
  readonly codeGraphFingerprint: string;
  readonly inputStamp: EffectiveAnalysisInputStamp;
  /** Canonical input payloads retained by P4.5 history; no input is selected implicitly. */
  readonly retainedInputs: {
    readonly evidence: EvidenceRevision;
    readonly enrichment: EnrichmentRevision;
    readonly policy: CompiledConventionPack['policy'];
    readonly ruleSet: CompiledConventionPack['ruleSet'];
  };
  /** Configuration is an analysis input and is retained for historical replay. */
  readonly retainedEvaluationConfig: {
    readonly naming: NamingConventionConfig;
    readonly tsdoc: TsdocConventionConfig;
    readonly suppressionAsOf?: string;
  };
  /** Canonical compiled pack required to re-run a retained check. */
  readonly retainedPack: CompiledConventionPack;
  readonly bindingResolutionSetId: string;
  readonly bindingDiagnostics: readonly BindingResolutionDiagnostic[];
  readonly capabilityChecks: readonly ConventionCapabilityCheck[];
  readonly naming: NamingConventionReport;
  readonly tsdoc: TsdocConventionReport;
  readonly conformance: ConformanceReport;
}

/**
 * Execute the first complete convention loop without persisting transient
 * snapshots or binding-resolution sets.
 */
export class ConventionCheckService {
  private readonly analysis = new EffectiveAnalysisService();

  run(input: ConventionCheckInput): ConventionCheckResult {
    assertCompiledConventionPack(input.pack);
    assertGraphRepositoryRevision(input.codeRevision);
    const manifest = validateConventionPackManifest(input.pack.manifest);
    if (input.expectedManifestId !== undefined) {
      const expectedManifestId = conventionManifestId(input.expectedManifestId);
      if (expectedManifestId !== manifest.manifestId) {
        throw new Error(
          `Convention manifest pin mismatch: expected ${expectedManifestId}, received ${manifest.manifestId}`
        );
      }
    }
    validatePackPins(input.pack, manifest);
    validateWorkspaceRoot(input.workspaceRoot, input.codeRevision);
    validateRegistryVersion(input.pack);
    validateGraphNamespace(manifest, input.codeRevision);
    if (
      input.pack.policy.suppressions.some((suppression) => suppression.expiresAt) &&
      !input.suppressionAsOf
    ) {
      throw new Error(
        'An explicit --suppression-as-of RFC3339 value is required for expiring suppressions'
      );
    }

    const provider = providerAnalysisIdentityFromGraph(input.codeRevision.graph);
    const capabilityChecks = checkCapabilities(manifest, provider.capabilities);
    const workspaceId = manifest.scope.workspaceId;
    const evidence = input.evidence ?? createCanonicalEmptyEvidenceRevision(workspaceId);
    const namingConfig = input.naming ?? EMPTY_NAMING_CONVENTION_CONFIG;
    const tsdocConfig = input.tsdoc ?? EMPTY_TSDOC_CONVENTION_CONFIG;
    const naming = new NamingConventionEvaluator().evaluate(
      input.codeRevision.graph,
      namingConfig,
      { workspaceRoot: input.workspaceRoot }
    );
    const enrichment = input.enrichment
      ? input.enrichment
      : input.tsdoc
        ? loadTsdocEnrichment({
            workspaceRoot: input.workspaceRoot,
            workspaceId,
            graph: input.codeRevision.graph,
          })
        : createCanonicalEmptyEnrichmentRevision(workspaceId);
    const tsdoc = new TsdocConventionEvaluator().evaluate(
      input.codeRevision.graph,
      enrichment,
      tsdocConfig
    );
    const snapshot = this.analysis.createSnapshot({
      code: {
        viewKind: 'persisted-code-revision',
        revisionId: input.codeRevision.metadata.revisionId,
        graph: input.codeRevision.graph,
      },
      spec: { revision: input.pack.spec },
      policy: input.pack.policy,
      evidence,
      enrichment,
      ruleSet: input.pack.ruleSet,
      provider,
      relationSemanticRegistryVersion: RELATION_SEMANTIC_REGISTRY_VERSION,
    });
    const resolver = new ExactBindingResolver({ graphNamespace: manifest.graphNamespace });
    const resolutionReport = resolver.resolveWithDiagnostics(snapshot);
    const bindingSet = this.analysis.resolveBindings(snapshot, {
      identity: resolver.identity,
      resolve: (candidate) => {
        if (candidate !== snapshot) {
          throw new Error('Convention binding resolver received an unexpected analysis snapshot');
        }
        return resolutionReport.resolutions;
      },
    });
    const conformance = new ConformanceEngine().evaluate(bindingSet, input.pack.policy, {
      ...(input.suppressionAsOf ? { suppressionAsOf: input.suppressionAsOf } : {}),
      evidence,
    });
    const checkIdentity = {
      packManifestId: manifest.manifestId,
      codeRevisionId: input.codeRevision.metadata.revisionId,
      inputStamp: snapshot.stamp,
      bindingResolutionSetId: bindingSet.resolutionSetId,
      conformanceReportId: conformance.reportId,
      namingReportId: naming.reportId,
      tsdocReportId: tsdoc.reportId,
      capabilityChecks,
    };
    return Object.freeze({
      contractVersion: '1.0',
      resultKind: 'convention-check',
      checkId: `convention-check:${digest(checkIdentity)}`,
      pack: manifest,
      codeRevisionId: input.codeRevision.metadata.revisionId,
      codeGraphFingerprint: input.codeRevision.graph.fingerprint,
      inputStamp: snapshot.stamp,
      retainedInputs: Object.freeze({
        evidence,
        enrichment,
        policy: input.pack.policy,
        ruleSet: input.pack.ruleSet,
      }),
      retainedEvaluationConfig: Object.freeze({
        naming: namingConfig,
        tsdoc: tsdocConfig,
        ...(input.suppressionAsOf ? { suppressionAsOf: input.suppressionAsOf } : {}),
      }),
      retainedPack: input.pack,
      bindingResolutionSetId: bindingSet.resolutionSetId,
      bindingDiagnostics: resolutionReport.diagnostics,
      capabilityChecks,
      naming,
      tsdoc,
      conformance,
    });
  }
}

const EMPTY_NAMING_CONVENTION_CONFIG: NamingConventionConfig = Object.freeze({
  contractVersion: '1.0',
  rules: Object.freeze([]),
});

const EMPTY_TSDOC_CONVENTION_CONFIG: TsdocConventionConfig = Object.freeze({
  contractVersion: '1.0',
  rules: Object.freeze([]),
});

function validatePackPins(pack: CompiledConventionPack, manifest: ConventionPackManifest): void {
  if (
    manifest.spec.revisionId !== pack.spec.revisionId ||
    manifest.spec.contentFingerprint !== pack.spec.contentFingerprint
  ) {
    throw new Error('Convention pack spec revision pin does not match compiled content');
  }
  if (
    manifest.policy.revisionId !== pack.policy.revisionId ||
    manifest.policy.contentDigest !== pack.policy.contentDigest
  ) {
    throw new Error('Convention pack policy revision pin does not match compiled content');
  }
  if (
    manifest.ruleSet.revisionId !== pack.ruleSet.revisionId ||
    manifest.ruleSet.contentFingerprint !== pack.ruleSet.contentFingerprint
  ) {
    throw new Error('Convention pack rule-set pin does not match compiled content');
  }
}

function validateRegistryVersion(pack: CompiledConventionPack): void {
  if (pack.policy.relationSemanticRegistryVersion !== RELATION_SEMANTIC_REGISTRY_VERSION) {
    throw new Error(
      `Convention pack requires relation semantic registry ${pack.policy.relationSemanticRegistryVersion}, current runtime is ${RELATION_SEMANTIC_REGISTRY_VERSION}`
    );
  }
}

function validateWorkspaceRoot(
  workspaceRoot: string,
  codeRevision: ActiveCanonicalGraphRevision
): void {
  const expected = pathValue(workspaceRoot);
  const observed = pathValue(codeRevision.graph.rootDir);
  if (expected !== observed) {
    throw new Error(`Convention graph root mismatch: expected ${expected}, received ${observed}`);
  }
}

function validateGraphNamespace(
  manifest: ConventionPackManifest,
  codeRevision: ActiveCanonicalGraphRevision
): void {
  const required = manifest.graphNamespace;
  const observed = textValue(codeRevision.graph.provenance.graphNamespace);
  if (required && required !== observed) {
    const refreshCommand =
      `tsdoc-edge build src --canonical-graph --graph-namespace=${required} ` +
      '--router-module=<artifact-source>';
    throw new Error(
      `Convention pack graph namespace mismatch: expected ${required}, received ${observed ?? '<none>'}. ` +
        `Refresh the canonical graph with: ${refreshCommand}`
    );
  }
}

function checkCapabilities(
  manifest: ConventionPackManifest,
  observed: Readonly<Record<string, unknown>>
): readonly ConventionCapabilityCheck[] {
  return Object.freeze(
    Object.entries(manifest.capabilities)
      .sort(([left], [right]) => compareText(left, right))
      .map(([id, required]) => {
        const capability = capabilityValue(observed[id]);
        if (statusRank(capability.status) < statusRank(required.minimumStatus)) {
          throw new Error(
            `Convention capability ${id} requires ${required.minimumStatus}, provider reports ${capability.status}`
          );
        }
        if (required.version && capability.version !== required.version) {
          throw new Error(
            `Convention capability ${id} requires version ${required.version}, provider reports ${capability.version ?? '<none>'}`
          );
        }
        return Object.freeze({
          id,
          required,
          observedStatus: capability.status,
          ...(capability.version ? { observedVersion: capability.version } : {}),
        });
      })
  );
}

function capabilityValue(value: unknown): {
  status: 'unsupported' | 'partial' | 'complete';
  version?: string;
} {
  if (value === true) return { status: 'complete' };
  if (value === false || value === undefined || value === null) {
    return { status: 'unsupported' };
  }
  if (typeof value === 'string' && value.trim()) {
    return { status: 'complete', version: value };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { status: 'unsupported' };
  }
  const record = value as Record<string, unknown>;
  const status = record.status;
  if (status !== 'unsupported' && status !== 'partial' && status !== 'complete') {
    return { status: 'unsupported' };
  }
  return {
    status,
    ...(textValue(record.version) ? { version: textValue(record.version) } : {}),
  };
}

function statusRank(value: 'unsupported' | 'partial' | 'complete'): number {
  return value === 'complete' ? 2 : value === 'partial' ? 1 : 0;
}

function textValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function conventionManifestId(value: string): string {
  if (!/^convention-pack:[a-f0-9]{64}$/.test(value)) {
    throw new Error('expectedManifestId must be a canonical convention-pack SHA-256 identifier');
  }
  return value;
}

function pathValue(value: string): string {
  const resolved = path.resolve(value);
  return fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
}

function digest(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
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

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
