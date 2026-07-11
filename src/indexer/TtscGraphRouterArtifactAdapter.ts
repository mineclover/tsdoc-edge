/**
 * Adapter from ttsc-graph-router raw artifacts to ProjectIndexer input.
 * @packageDocumentation
 */

import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { canonicalFsPath } from './canonical-path';
import type {
  ProjectGraphInput,
  ProjectGraphSource,
  ProjectGraphSourceEdge,
  ProjectGraphSourceNode,
  ProjectIndexRequest,
} from './contracts';
import { normalizeRouterDiagnostics } from './diagnostics-contract';

export const SUPPORTED_TTSC_GRAPH_ARTIFACT_CONTRACT_VERSION = '1.0.0' as const;

interface RouterArtifactContract {
  id: string;
  version: string;
  schema: string;
  factPlane: string;
}

interface RouterArtifactCapabilities {
  factPlane: string;
  snapshot: string;
  structuralSynthesis: boolean;
  unsavedBuffers: boolean;
  diagnosticsCollected: boolean;
  compilerVersionReported: boolean;
  evidenceCoordinates: string;
  unknownFields: string;
}

interface RouterArtifactProducer {
  name: string;
  version: string;
  binary: string | null;
  binaryVersion: string | null;
}

interface RouterArtifactProvenance {
  contractVersion: string;
  router: { name: string; version: string };
  producer: RouterArtifactProducer;
  compilerVersion: null;
  project: string;
  tsconfig: string;
  cacheFingerprint: string;
  refreshedAt: string;
  refreshed: boolean;
}

interface RouterArtifact {
  repo: { cwd: string; tsconfig: string };
  dump: {
    project: string;
    tsconfig: string;
    nodes: ProjectGraphSourceNode[];
    edges: ProjectGraphSourceEdge[];
    diagnostics?: unknown[];
    [key: string]: unknown;
  };
  producer: RouterArtifactProducer;
  meta: {
    repoId: string;
    cwd: string;
    tsconfig: string;
    fingerprint: string;
    refreshedAt: string;
    stale: boolean;
    refreshed: boolean;
    nodes: number;
    edges: number;
    summary?: Record<string, unknown>;
    [key: string]: unknown;
  };
  contract: RouterArtifactContract;
  capabilities: RouterArtifactCapabilities;
  provenance: RouterArtifactProvenance;
}

interface RouterValidation {
  ok: boolean;
  contract: RouterArtifactContract;
  errors: Array<{ path: string; message: string }>;
  drift?: Record<string, unknown>;
}

interface GraphRouterModule {
  resolveRepoGraphArtifactTarget(configPath: string, repoId: string): unknown;
  loadRepoGraphArtifact(
    configPath: string,
    repoId: string,
    options?: { refresh?: boolean }
  ): Promise<unknown>;
  validateGraphArtifact(artifact: unknown): unknown;
}

export interface TtscGraphRouterArtifactAdapterOptions {
  configPath: string;
  repoId: string;
  /** Stable cross-plane workspace identity; defaults to the router repo ID. */
  workspaceId?: string;
  /** Stable graph namespace; defaults to `ttsc:<repoId>`. */
  graphNamespace?: string;
  /** Package name, file URL, or absolute path to the built ESM entrypoint. */
  moduleSpecifier?: string;
  /** Requested compatibility gate; it is not compiler-version provenance. */
  typescriptCompatibilityTarget?: string;
  /** Exact graph package/binary version accepted by this adapter. */
  expectedGraphVersion?: string;
  /** Exact cross-package artifact contract accepted by this adapter. */
  expectedArtifactContractVersion?: string;
  /** Test/host injection point that avoids coupling this package to ESM details. */
  moduleLoader?: () => Promise<GraphRouterModule>;
}

/**
 * Supplies raw `@ttsc/graph` facts through the graph-router artifact API.
 *
 * The router is not reclassified as a compiler parser: `@ttsc/graph` remains
 * the producer and this adapter only crosses the package/cache boundary.
 *
 * @public
 */
export class TtscGraphRouterArtifactAdapter implements ProjectGraphSource {
  readonly id = 'ttsc-graph-router-artifact';
  private readonly typescriptCompatibilityTarget: string;
  private readonly expectedGraphVersion: string;
  private readonly expectedArtifactContractVersion: string;
  private readonly workspaceId: string;
  private readonly graphNamespace: string;

  constructor(private readonly options: TtscGraphRouterArtifactAdapterOptions) {
    if (!options.repoId.trim() || options.repoId !== options.repoId.trim()) {
      throw new Error('ttsc graph-router repoId must be nonempty canonical text');
    }
    this.workspaceId = canonicalIdentity(options.workspaceId ?? options.repoId, 'workspaceId');
    this.graphNamespace = canonicalIdentity(
      options.graphNamespace ?? `ttsc:${options.repoId}`,
      'graphNamespace'
    );
    this.typescriptCompatibilityTarget = options.typescriptCompatibilityTarget ?? '7.0';
    // This exact producer pin is the current TypeScript 7 stabilization policy.
    // Artifact contract/capability negotiation remains a separate boundary.
    this.expectedGraphVersion = options.expectedGraphVersion ?? '0.18.4';
    this.expectedArtifactContractVersion =
      options.expectedArtifactContractVersion ?? SUPPORTED_TTSC_GRAPH_ARTIFACT_CONTRACT_VERSION;
    if (!/^7\.0(?:\.|$)/.test(this.typescriptCompatibilityTarget)) {
      throw new Error(
        `ttsc graph-router compatibility must target TypeScript 7.0, got ${this.typescriptCompatibilityTarget}`
      );
    }
    if (!options.moduleLoader && !options.moduleSpecifier) {
      throw new Error('moduleSpecifier is required until @ttsc-ex/ttsc-graph-router is installed');
    }
  }

  async load(request: ProjectIndexRequest): Promise<ProjectGraphInput> {
    if (request.contentOverrides && request.contentOverrides.size > 0) {
      throw new Error(
        'ttsc graph-router artifacts cannot represent unsaved buffers; use an LSP overlay source'
      );
    }

    const router = await this.loadModule();
    const configPath = path.resolve(this.options.configPath);
    const targetValue = router.resolveRepoGraphArtifactTarget(configPath, this.options.repoId);
    assertRouterTarget(targetValue);
    const target = targetValue;
    const targetRoot = canonicalFsPath(target.cwd);
    const requestedRoot = canonicalFsPath(request.rootDir);
    if (requestedRoot !== targetRoot) {
      throw new Error(
        `Graph-router repo ${this.options.repoId} resolves to ${targetRoot}, not ${requestedRoot}`
      );
    }
    const targetTsconfig = canonicalFsPath(path.resolve(targetRoot, target.tsconfig));
    if (request.tsconfigPath) {
      const requestedTsconfig = canonicalFsPath(path.resolve(requestedRoot, request.tsconfigPath));
      if (requestedTsconfig !== targetTsconfig) {
        throw new Error(
          `Graph-router tsconfig mismatch: requested ${requestedTsconfig}, configured ${targetTsconfig}`
        );
      }
    }

    // Force freshness by default: the current router fingerprint does not hash
    // repeated content edits within an already-dirty file.
    const refresh = request.refresh ?? true;
    const loadedValue = await router.loadRepoGraphArtifact(configPath, this.options.repoId, {
      refresh,
    });
    assertRouterArtifact(loadedValue);
    const loaded = loadedValue;
    const validationValue = router.validateGraphArtifact(loaded.dump);
    assertRouterValidation(validationValue);
    const validation = validationValue;
    if (!validation.ok) {
      const details = validation.errors
        .map((error) => `${error.path}: ${error.message}`)
        .join('; ');
      throw new Error(`Invalid ttsc graph artifact: ${details}`);
    }
    this.validateProducer(loaded.producer);
    this.validateArtifactEnvelope(loaded, validation, targetRoot, targetTsconfig);

    const loadedRoot = targetRoot;
    const loadedTsconfig = targetTsconfig;
    const diagnostics = loaded.capabilities.diagnosticsCollected
      ? normalizeRouterDiagnostics(loaded.dump.diagnostics ?? [], { rootDir: loadedRoot })
      : undefined;
    return {
      rootDir: loadedRoot,
      tsconfigPath: loadedTsconfig,
      // Unknown producer fields and kinds are intentionally preserved.
      nodes: loaded.dump.nodes.map((node) => ({ ...node })),
      edges: loaded.dump.edges.map((edge) => ({ ...edge })),
      diagnostics,
      provenance: {
        adapter: this.id,
        producer: loaded.producer.name,
        workspaceId: this.workspaceId,
        graphNamespace: this.graphNamespace,
        producerVersion: loaded.producer.version,
        producerBinary: loaded.producer.binary,
        producerBinaryVersion: loaded.producer.binaryVersion,
        artifactContractId: loaded.contract.id,
        artifactContractVersion: loaded.contract.version,
        artifactSchema: loaded.contract.schema,
        artifactFactPlane: loaded.contract.factPlane,
        artifactCapabilities: { ...loaded.capabilities },
        routerName: loaded.provenance.router.name,
        routerVersion: loaded.provenance.router.version,
        compilerVersion: loaded.provenance.compilerVersion,
        typescriptCompatibilityTarget: this.typescriptCompatibilityTarget,
        diagnosticsCollected: loaded.capabilities.diagnosticsCollected,
        routerRepoId: this.options.repoId,
        routerConfigPath: configPath,
        routerFingerprint: loaded.meta.fingerprint,
        refreshedAt: loaded.meta.refreshedAt,
        refreshed: loaded.meta.refreshed,
        refreshRequested: refresh,
        artifactDrift: validation.drift ?? {},
      },
    };
  }

  private validateProducer(producer: RouterArtifact['producer']): void {
    if (producer.name !== '@ttsc/graph') {
      throw new Error(`Expected @ttsc/graph producer, got ${producer.name}`);
    }
    if (producer.version !== this.expectedGraphVersion) {
      throw new Error(`Expected @ttsc/graph ${this.expectedGraphVersion}, got ${producer.version}`);
    }
    const binaryVersion = producer.binaryVersion?.match(/^ttscgraph\s+(\S+)/)?.[1];
    if (
      !producer.binary ||
      !path.isAbsolute(producer.binary) ||
      binaryVersion !== producer.version
    ) {
      throw new Error(
        `Graph producer binary does not match @ttsc/graph ${producer.version}: ${producer.binaryVersion ?? 'unavailable'}`
      );
    }
  }

  private validateArtifactEnvelope(
    artifact: RouterArtifact,
    validation: RouterValidation,
    targetRoot: string,
    targetTsconfig: string
  ): void {
    const contract = artifact.contract;
    if (
      contract?.id !== '@ttsc-ex/ttsc-graph-router/raw-graph-artifact' ||
      contract.schema !== '@ttsc/graph/ITtscGraphDump' ||
      contract.factPlane !== 'raw'
    ) {
      throw new Error('Unsupported ttsc graph artifact contract identity');
    }
    if (contract.version !== this.expectedArtifactContractVersion) {
      throw new Error(
        `Expected ttsc graph artifact contract ${this.expectedArtifactContractVersion}, got ${contract.version}`
      );
    }
    if (
      validation.contract?.id !== contract.id ||
      validation.contract.version !== contract.version ||
      validation.contract.schema !== contract.schema ||
      validation.contract.factPlane !== contract.factPlane
    ) {
      throw new Error('ttsc graph artifact validator contract does not match the loaded artifact');
    }

    const capabilities = artifact.capabilities;
    if (
      capabilities?.factPlane !== 'raw' ||
      capabilities.snapshot !== 'saved-files' ||
      capabilities.structuralSynthesis !== false ||
      capabilities.unsavedBuffers !== false ||
      capabilities.compilerVersionReported !== false ||
      capabilities.evidenceCoordinates !== 'one-based' ||
      capabilities.unknownFields !== 'preserved' ||
      typeof capabilities.diagnosticsCollected !== 'boolean'
    ) {
      throw new Error('Unsupported ttsc graph artifact capabilities');
    }
    const diagnosticsPresent = hasOwn(artifact.dump, 'diagnostics');
    if (capabilities.diagnosticsCollected !== diagnosticsPresent) {
      throw new Error(
        'ttsc graph artifact diagnostics capability does not match dump field presence'
      );
    }
    if (capabilities.diagnosticsCollected) {
      if (!diagnosticsPresent) {
        throw new Error('ttsc graph artifact declared diagnostics but dump.diagnostics is missing');
      }
    }

    const provenance = artifact.provenance;
    if (
      provenance?.contractVersion !== contract.version ||
      provenance.router?.name !== '@ttsc-ex/ttsc-graph-router' ||
      typeof provenance.router.version !== 'string' ||
      provenance.router.version.trim() === '' ||
      provenance.compilerVersion !== null ||
      provenance.project !== artifact.dump.project ||
      provenance.tsconfig !== artifact.dump.tsconfig ||
      provenance.cacheFingerprint !== artifact.meta.fingerprint ||
      provenance.refreshedAt !== artifact.meta.refreshedAt ||
      provenance.refreshed !== artifact.meta.refreshed ||
      !sameProducer(provenance.producer, artifact.producer)
    ) {
      throw new Error('ttsc graph artifact provenance does not match its loaded envelope');
    }

    const loadedRoot = canonicalFsPath(artifact.repo.cwd);
    const loadedTsconfig = canonicalFsPath(path.resolve(loadedRoot, artifact.repo.tsconfig));
    if (loadedRoot !== targetRoot || loadedTsconfig !== targetTsconfig) {
      throw new Error(`Graph-router target changed while loading ${this.options.repoId}`);
    }

    const dumpRoot = canonicalFsPath(artifact.dump.project);
    const dumpTsconfig = canonicalFsPath(path.resolve(dumpRoot, artifact.dump.tsconfig));
    if (dumpRoot !== targetRoot || dumpTsconfig !== targetTsconfig) {
      throw new Error(`ttsc graph artifact envelope mismatch: ${dumpRoot} / ${dumpTsconfig}`);
    }

    const metaRoot = canonicalFsPath(artifact.meta.cwd);
    const metaTsconfig = canonicalFsPath(path.resolve(metaRoot, artifact.meta.tsconfig));
    if (
      artifact.meta.repoId !== this.options.repoId ||
      metaRoot !== targetRoot ||
      metaTsconfig !== targetTsconfig ||
      artifact.meta.stale !== false ||
      artifact.meta.nodes !== artifact.dump.nodes.length ||
      artifact.meta.edges !== artifact.dump.edges.length
    ) {
      throw new Error('ttsc graph artifact cache metadata does not match its loaded dump');
    }
  }

  private async loadModule(): Promise<GraphRouterModule> {
    const loaded: unknown = this.options.moduleLoader
      ? await this.options.moduleLoader()
      : await nativeImport(moduleSpecifier(this.options.moduleSpecifier));
    assertGraphRouterModule(loaded);
    return loaded;
  }
}

function canonicalIdentity(value: string, label: string): string {
  if (!value.trim() || value !== value.trim()) {
    throw new Error(`ttsc graph-router ${label} must be nonempty canonical text`);
  }
  return value;
}

function moduleSpecifier(value: string | undefined): string {
  if (!value) throw new Error('moduleSpecifier is required');
  if (value.startsWith('file:')) return value;
  if (path.isAbsolute(value) || value.startsWith('./') || value.startsWith('../')) {
    return pathToFileURL(path.resolve(value)).href;
  }
  return value;
}

// TypeScript CommonJS rewrites import() to require(), which cannot load the
// router's ESM build. Constructing the native loader keeps this boundary ESM-safe.
const nativeImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<unknown>;

function sameProducer(
  left: RouterArtifact['producer'],
  right: RouterArtifact['producer']
): boolean {
  return (
    left?.name === right.name &&
    left.version === right.version &&
    left.binary === right.binary &&
    left.binaryVersion === right.binaryVersion
  );
}

function assertGraphRouterModule(value: unknown): asserts value is GraphRouterModule {
  const module = requireRecord(value, 'ttsc graph-router module');
  for (const name of [
    'resolveRepoGraphArtifactTarget',
    'loadRepoGraphArtifact',
    'validateGraphArtifact',
  ] as const) {
    if (typeof module[name] !== 'function') {
      throw new Error(`ttsc graph-router does not export ${name}; rebuild the integration package`);
    }
  }
}

function assertRouterTarget(value: unknown): asserts value is RouterArtifact['repo'] {
  const target = requireRecord(value, 'router target');
  requireNonEmptyString(target.cwd, 'router target.cwd');
  requireNonEmptyString(target.tsconfig, 'router target.tsconfig');
}

function assertRouterArtifact(value: unknown): asserts value is RouterArtifact {
  const artifact = requireRecord(value, 'artifact');

  const repo = requireRecord(artifact.repo, 'artifact.repo');
  requireNonEmptyString(repo.cwd, 'artifact.repo.cwd');
  requireNonEmptyString(repo.tsconfig, 'artifact.repo.tsconfig');

  const dump = requireRecord(artifact.dump, 'artifact.dump');
  requireNonEmptyString(dump.project, 'artifact.dump.project');
  requireNonEmptyString(dump.tsconfig, 'artifact.dump.tsconfig');
  requireArray(dump.nodes, 'artifact.dump.nodes');
  requireArray(dump.edges, 'artifact.dump.edges');
  if (hasOwn(dump, 'diagnostics')) requireArray(dump.diagnostics, 'artifact.dump.diagnostics');

  assertProducerShape(artifact.producer, 'artifact.producer');

  const meta = requireRecord(artifact.meta, 'artifact.meta');
  requireNonEmptyString(meta.repoId, 'artifact.meta.repoId');
  requireNonEmptyString(meta.cwd, 'artifact.meta.cwd');
  requireNonEmptyString(meta.tsconfig, 'artifact.meta.tsconfig');
  requireNonEmptyString(meta.fingerprint, 'artifact.meta.fingerprint');
  requireCanonicalIsoTimestamp(meta.refreshedAt, 'artifact.meta.refreshedAt');
  requireBoolean(meta.stale, 'artifact.meta.stale');
  requireBoolean(meta.refreshed, 'artifact.meta.refreshed');
  requireNonNegativeInteger(meta.nodes, 'artifact.meta.nodes');
  requireNonNegativeInteger(meta.edges, 'artifact.meta.edges');
  if (hasOwn(meta, 'summary')) requireRecord(meta.summary, 'artifact.meta.summary');

  assertContractShape(artifact.contract, 'artifact.contract');

  const capabilities = requireRecord(artifact.capabilities, 'artifact.capabilities');
  requireNonEmptyString(capabilities.factPlane, 'artifact.capabilities.factPlane');
  requireNonEmptyString(capabilities.snapshot, 'artifact.capabilities.snapshot');
  requireBoolean(capabilities.structuralSynthesis, 'artifact.capabilities.structuralSynthesis');
  requireBoolean(capabilities.unsavedBuffers, 'artifact.capabilities.unsavedBuffers');
  requireBoolean(capabilities.diagnosticsCollected, 'artifact.capabilities.diagnosticsCollected');
  requireBoolean(
    capabilities.compilerVersionReported,
    'artifact.capabilities.compilerVersionReported'
  );
  requireNonEmptyString(
    capabilities.evidenceCoordinates,
    'artifact.capabilities.evidenceCoordinates'
  );
  requireNonEmptyString(capabilities.unknownFields, 'artifact.capabilities.unknownFields');

  const provenance = requireRecord(artifact.provenance, 'artifact.provenance');
  requireNonEmptyString(provenance.contractVersion, 'artifact.provenance.contractVersion');
  const router = requireRecord(provenance.router, 'artifact.provenance.router');
  requireNonEmptyString(router.name, 'artifact.provenance.router.name');
  requireNonEmptyString(router.version, 'artifact.provenance.router.version');
  assertProducerShape(provenance.producer, 'artifact.provenance.producer');
  if (provenance.compilerVersion !== null) {
    throw new Error('artifact.provenance.compilerVersion must be null');
  }
  requireNonEmptyString(provenance.project, 'artifact.provenance.project');
  requireNonEmptyString(provenance.tsconfig, 'artifact.provenance.tsconfig');
  requireNonEmptyString(provenance.cacheFingerprint, 'artifact.provenance.cacheFingerprint');
  requireCanonicalIsoTimestamp(provenance.refreshedAt, 'artifact.provenance.refreshedAt');
  requireBoolean(provenance.refreshed, 'artifact.provenance.refreshed');
}

function assertRouterValidation(value: unknown): asserts value is RouterValidation {
  const validation = requireRecord(value, 'artifact validation');
  requireBoolean(validation.ok, 'artifact validation.ok');
  assertContractShape(validation.contract, 'artifact validation.contract');
  const errors = requireArray(validation.errors, 'artifact validation.errors');
  errors.forEach((entry, index) => {
    const error = requireRecord(entry, `artifact validation.errors[${index}]`);
    requireNonEmptyString(error.path, `artifact validation.errors[${index}].path`);
    requireNonEmptyString(error.message, `artifact validation.errors[${index}].message`);
  });
  if (hasOwn(validation, 'drift')) {
    const drift = requireRecord(validation.drift, 'artifact validation.drift');
    for (const field of ['nodeFields', 'edgeFields', 'nodeKinds', 'edgeKinds'] as const) {
      if (hasOwn(drift, field))
        requireStringArray(drift[field], `artifact validation.drift.${field}`);
    }
  }
}

function assertProducerShape(
  value: unknown,
  field: string
): asserts value is RouterArtifactProducer {
  const producer = requireRecord(value, field);
  requireNonEmptyString(producer.name, `${field}.name`);
  requireNonEmptyString(producer.version, `${field}.version`);
  requireNullableNonEmptyString(producer.binary, `${field}.binary`);
  requireNullableNonEmptyString(producer.binaryVersion, `${field}.binaryVersion`);
}

function assertContractShape(
  value: unknown,
  field: string
): asserts value is RouterArtifactContract {
  const contract = requireRecord(value, field);
  requireNonEmptyString(contract.id, `${field}.id`);
  requireNonEmptyString(contract.version, `${field}.version`);
  requireNonEmptyString(contract.schema, `${field}.schema`);
  requireNonEmptyString(contract.factPlane, `${field}.factPlane`);
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  return value;
}

function requireStringArray(value: unknown, field: string): void {
  const values = requireArray(value, field);
  values.forEach((entry, index) => requireNonEmptyString(entry, `${field}[${index}]`));
}

function requireNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string`);
  }
}

function requireNullableNonEmptyString(
  value: unknown,
  field: string
): asserts value is string | null {
  if (value !== null) requireNonEmptyString(value, field);
}

function requireBoolean(value: unknown, field: string): asserts value is boolean {
  if (typeof value !== 'boolean') throw new Error(`${field} must be a boolean`);
}

function requireNonNegativeInteger(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
}

function requireCanonicalIsoTimestamp(value: unknown, field: string): asserts value is string {
  requireNonEmptyString(value, field);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== value) {
    throw new Error(`${field} must be a canonical ISO timestamp`);
  }
}

function hasOwn(value: Record<string, unknown>, field: string): boolean {
  return Object.getOwnPropertyDescriptor(value, field) !== undefined;
}
