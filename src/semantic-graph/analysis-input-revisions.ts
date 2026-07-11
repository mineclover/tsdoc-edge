/**
 * Immutable, content-addressed evidence and enrichment inputs.
 *
 * These contracts intentionally contain JSON values only. They can therefore
 * be persisted, hashed, and reconstructed without process-local state.
 * @packageDocumentation
 */

import { createHash } from 'node:crypto';

/** Contract shared by the persisted evidence and enrichment planes. */
export const ANALYSIS_INPUT_REVISION_CONTRACT_VERSION = '1.0' as const;

export type AnalysisInputRevisionPlane = 'evidence' | 'enrichment';

/** Provenance for one collected item. Times are evidence, not revision creation metadata. */
export interface AnalysisInputItemProvenance {
  readonly source: 'test-runner' | 'api-extractor' | 'tsdoc-parser' | 'workspace-scan';
  readonly producerId: string;
  readonly producerVersion: string;
  readonly sourceRevision?: string;
  readonly sourceFingerprint?: string;
  readonly observedAt?: string;
}

/** Provenance for the deterministic collection operation that produced a revision. */
export interface AnalysisInputRevisionProvenance {
  readonly source: 'collected' | 'imported-baseline' | 'canonical-empty';
  readonly producerId: string;
  readonly producerVersion: string;
  readonly sourceRevision?: string;
  readonly sourceFingerprint: string;
}

/** Stable one-based source location used by evidence and enrichment items. */
export interface AnalysisInputSourceAnchor {
  readonly file: string;
  readonly contentDigest: string;
  readonly startLine?: number;
  readonly startColumn?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

/** Raw result emitted by a test runner before binding resolution. */
export interface RawTestEvidenceItem {
  readonly kind: 'test-evidence';
  readonly id: string;
  readonly runner: string;
  readonly testName: string;
  readonly status: 'passed' | 'failed' | 'skipped' | 'unknown';
  readonly source: AnalysisInputSourceAnchor;
  readonly subjectFiles: readonly string[];
  readonly durationMs?: number;
  readonly messageDigest?: string;
  readonly provenance: AnalysisInputItemProvenance;
}

/** Raw API export observation before it is bound to a contract or code node. */
export interface ApiSurfaceEvidenceItem {
  readonly kind: 'api-surface';
  readonly id: string;
  readonly packageName: string;
  readonly packageVersion?: string;
  readonly module?: string;
  readonly exportName: string;
  readonly surfaceKind?: 'class' | 'function' | 'interface' | 'type' | 'value' | 'namespace';
  readonly signatureDigest: string;
  readonly source?: AnalysisInputSourceAnchor;
  readonly provenance: AnalysisInputItemProvenance;
}

export type EvidenceItem = RawTestEvidenceItem | ApiSurfaceEvidenceItem;

export interface TsdocTagEnrichment {
  readonly name: string;
  readonly text?: string;
}

/** TSDoc projection that augments a code node without changing canonical code identity. */
export interface TsdocEnrichmentItem {
  readonly kind: 'tsdoc';
  readonly id: string;
  readonly symbolId: string;
  readonly source: AnalysisInputSourceAnchor;
  readonly summary?: string;
  readonly remarks?: string;
  readonly tags: readonly TsdocTagEnrichment[];
  readonly provenance: AnalysisInputItemProvenance;
}

export type EnrichmentItem = TsdocEnrichmentItem;

export interface EvidenceRevision {
  readonly contractVersion: typeof ANALYSIS_INPUT_REVISION_CONTRACT_VERSION;
  readonly plane: 'evidence';
  readonly workspaceId: string;
  readonly revisionId: string;
  readonly contentFingerprint: string;
  readonly items: readonly EvidenceItem[];
  readonly provenance: AnalysisInputRevisionProvenance;
}

export interface EnrichmentRevision {
  readonly contractVersion: typeof ANALYSIS_INPUT_REVISION_CONTRACT_VERSION;
  readonly plane: 'enrichment';
  readonly workspaceId: string;
  readonly revisionId: string;
  readonly contentFingerprint: string;
  readonly items: readonly EnrichmentItem[];
  readonly provenance: AnalysisInputRevisionProvenance;
}

export interface CreateEvidenceRevisionInput {
  readonly workspaceId: string;
  readonly items: readonly EvidenceItem[];
  readonly provenance: AnalysisInputRevisionProvenance;
}

export interface CreateEnrichmentRevisionInput {
  readonly workspaceId: string;
  readonly items: readonly EnrichmentItem[];
  readonly provenance: AnalysisInputRevisionProvenance;
}

/** Create a deterministic, deeply immutable evidence revision. */
export function createEvidenceRevision(input: CreateEvidenceRevisionInput): EvidenceRevision {
  const workspaceId = requiredText(input.workspaceId, 'workspaceId');
  const items = sortedUnique(
    input.items.map(normalizeEvidenceItem),
    (item) => item.id,
    'evidence item'
  );
  return createRevision('evidence', workspaceId, items, input.provenance);
}

/** Create a deterministic, deeply immutable enrichment revision. */
export function createEnrichmentRevision(input: CreateEnrichmentRevisionInput): EnrichmentRevision {
  const workspaceId = requiredText(input.workspaceId, 'workspaceId');
  const items = sortedUnique(
    input.items.map(normalizeEnrichmentItem),
    (item) => item.id,
    'enrichment item'
  );
  return createRevision('enrichment', workspaceId, items, input.provenance);
}

/** Canonical empty evidence input used when no evidence provider is configured. */
export function createCanonicalEmptyEvidenceRevision(workspaceId: string): EvidenceRevision {
  return createEvidenceRevision({
    workspaceId,
    items: [],
    provenance: canonicalEmptyProvenance('evidence'),
  });
}

/** Canonical empty enrichment input used when no enrichment provider is configured. */
export function createCanonicalEmptyEnrichmentRevision(workspaceId: string): EnrichmentRevision {
  return createEnrichmentRevision({
    workspaceId,
    items: [],
    provenance: canonicalEmptyProvenance('enrichment'),
  });
}

export function createCanonicalEmptyRevision(
  plane: 'evidence',
  workspaceId: string
): EvidenceRevision;
export function createCanonicalEmptyRevision(
  plane: 'enrichment',
  workspaceId: string
): EnrichmentRevision;
/** Create the one canonical empty revision for a plane and workspace. */
export function createCanonicalEmptyRevision(
  plane: AnalysisInputRevisionPlane,
  workspaceId: string
): EvidenceRevision | EnrichmentRevision {
  return plane === 'evidence'
    ? createCanonicalEmptyEvidenceRevision(workspaceId)
    : createCanonicalEmptyEnrichmentRevision(workspaceId);
}

function createRevision(
  plane: 'evidence',
  workspaceId: string,
  items: readonly EvidenceItem[],
  provenance: AnalysisInputRevisionProvenance
): EvidenceRevision;
function createRevision(
  plane: 'enrichment',
  workspaceId: string,
  items: readonly EnrichmentItem[],
  provenance: AnalysisInputRevisionProvenance
): EnrichmentRevision;
function createRevision(
  plane: AnalysisInputRevisionPlane,
  workspaceId: string,
  items: readonly (EvidenceItem | EnrichmentItem)[],
  provenance: AnalysisInputRevisionProvenance
): EvidenceRevision | EnrichmentRevision {
  const normalizedProvenance = normalizeRevisionProvenance(provenance);
  const semanticPayload = {
    contractVersion: ANALYSIS_INPUT_REVISION_CONTRACT_VERSION,
    plane,
    workspaceId,
    items,
    provenance: normalizedProvenance,
  };
  const contentFingerprint = digest(semanticPayload);
  return immutableJson({
    ...semanticPayload,
    revisionId: `${plane}-revision:${contentFingerprint}`,
    contentFingerprint,
  }) as EvidenceRevision | EnrichmentRevision;
}

function normalizeEvidenceItem(item: EvidenceItem): EvidenceItem {
  requiredText(item.id, 'evidence item id');
  if (item.kind === 'test-evidence') {
    requiredText(item.runner, `test evidence ${item.id} runner`);
    requiredText(item.testName, `test evidence ${item.id} testName`);
    assertOneOf(
      item.status,
      ['passed', 'failed', 'skipped', 'unknown'] as const,
      `test evidence ${item.id} status`
    );
    if (
      item.durationMs !== undefined &&
      (!Number.isFinite(item.durationMs) || item.durationMs < 0)
    ) {
      throw new Error(`test evidence ${item.id} durationMs must be a non-negative finite number`);
    }
    return immutableJson({
      ...item,
      source: normalizeSourceAnchor(item.source, `test evidence ${item.id}`),
      subjectFiles: sortedUnique(
        item.subjectFiles.map((file) =>
          requiredText(file, `test evidence ${item.id} subject file`)
        ),
        (file) => file,
        `test evidence ${item.id} subject file`
      ),
      provenance: normalizeItemProvenance(item.provenance),
    });
  }

  if (item.kind === 'api-surface') {
    requiredText(item.packageName, `API surface ${item.id} packageName`);
    requiredText(item.exportName, `API surface ${item.id} exportName`);
    requiredText(item.signatureDigest, `API surface ${item.id} signatureDigest`);
    if (item.surfaceKind !== undefined) {
      assertOneOf(
        item.surfaceKind,
        ['class', 'function', 'interface', 'type', 'value', 'namespace'] as const,
        `API surface ${item.id} surfaceKind`
      );
    }
    return immutableJson({
      ...item,
      ...(item.source
        ? { source: normalizeSourceAnchor(item.source, `API surface ${item.id}`) }
        : {}),
      provenance: normalizeItemProvenance(item.provenance),
    });
  }

  throw new Error(`Unsupported evidence item kind: ${(item as { kind?: unknown }).kind}`);
}

function normalizeEnrichmentItem(item: EnrichmentItem): EnrichmentItem {
  requiredText(item.id, 'enrichment item id');
  if (item.kind !== 'tsdoc') {
    throw new Error(`Unsupported enrichment item kind: ${(item as { kind?: unknown }).kind}`);
  }
  requiredText(item.symbolId, `TSDoc enrichment ${item.id} symbolId`);
  const tags = [...item.tags]
    .map((tag) => ({
      name: requiredText(tag.name, `TSDoc enrichment ${item.id} tag name`),
      ...(tag.text === undefined ? {} : { text: tag.text }),
    }))
    .sort((left, right) =>
      compareText(`${left.name}\0${left.text ?? ''}`, `${right.name}\0${right.text ?? ''}`)
    );
  return immutableJson({
    ...item,
    source: normalizeSourceAnchor(item.source, `TSDoc enrichment ${item.id}`),
    tags,
    provenance: normalizeItemProvenance(item.provenance),
  });
}

function normalizeSourceAnchor(
  source: AnalysisInputSourceAnchor,
  label: string
): AnalysisInputSourceAnchor {
  requiredText(source.file, `${label} source file`);
  requiredText(source.contentDigest, `${label} source contentDigest`);
  for (const [name, value] of Object.entries({
    startLine: source.startLine,
    startColumn: source.startColumn,
    endLine: source.endLine,
    endColumn: source.endColumn,
  })) {
    if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
      throw new Error(`${label} source ${name} must be a positive integer`);
    }
  }
  return immutableJson(source);
}

function normalizeItemProvenance(
  provenance: AnalysisInputItemProvenance
): AnalysisInputItemProvenance {
  assertOneOf(
    provenance.source,
    ['test-runner', 'api-extractor', 'tsdoc-parser', 'workspace-scan'] as const,
    'item provenance source'
  );
  requiredText(provenance.producerId, 'item provenance producerId');
  requiredText(provenance.producerVersion, 'item provenance producerVersion');
  return immutableJson(provenance);
}

function normalizeRevisionProvenance(
  provenance: AnalysisInputRevisionProvenance
): AnalysisInputRevisionProvenance {
  assertOneOf(
    provenance.source,
    ['collected', 'imported-baseline', 'canonical-empty'] as const,
    'revision provenance source'
  );
  requiredText(provenance.producerId, 'revision provenance producerId');
  requiredText(provenance.producerVersion, 'revision provenance producerVersion');
  requiredText(provenance.sourceFingerprint, 'revision provenance sourceFingerprint');
  return immutableJson(provenance);
}

function canonicalEmptyProvenance(
  plane: AnalysisInputRevisionPlane
): AnalysisInputRevisionProvenance {
  return Object.freeze({
    source: 'canonical-empty',
    producerId: 'tsdoc-edge/canonical-empty-analysis-input',
    producerVersion: ANALYSIS_INPUT_REVISION_CONTRACT_VERSION,
    sourceFingerprint: `empty:${plane}`,
  });
}

function sortedUnique<T>(
  values: readonly T[],
  identity: (value: T) => string,
  label: string
): readonly T[] {
  const sorted = [...values].sort((left, right) => compareText(identity(left), identity(right)));
  for (let index = 1; index < sorted.length; index += 1) {
    if (identity(sorted[index - 1]) === identity(sorted[index])) {
      throw new Error(`Duplicate ${label} identity: ${identity(sorted[index])}`);
    }
  }
  return Object.freeze(sorted);
}

function requiredText(value: string, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function assertOneOf<T extends string>(value: T, allowed: readonly T[], label: string): void {
  if (!allowed.includes(value)) {
    throw new Error(`${label} has unsupported value: ${value}`);
  }
}

function digest(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown, seen = new Set<object>()): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Analysis input revisions require finite numbers');
    return value;
  }
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new Error('Analysis input revisions cannot contain cycles');
    seen.add(value);
    const result = value.map((entry) => {
      const canonical = canonicalize(entry, seen);
      if (canonical === undefined) {
        throw new Error('Analysis input revision arrays cannot contain undefined');
      }
      return canonical;
    });
    seen.delete(value);
    return result;
  }
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    if (
      Object.getPrototypeOf(object) !== Object.prototype &&
      Object.getPrototypeOf(object) !== null
    ) {
      throw new Error('Analysis input revisions require plain JSON objects');
    }
    if (seen.has(object)) throw new Error('Analysis input revisions cannot contain cycles');
    seen.add(object);
    const result = Object.fromEntries(
      Object.entries(object)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, entry]) => [key, canonicalize(entry, seen)])
    );
    seen.delete(object);
    return result;
  }
  throw new Error(`Analysis input revisions cannot contain ${typeof value}`);
}

function immutableJson<T>(value: T): T {
  return deepFreeze(JSON.parse(stableJson(value)) as T);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const entry of Object.values(value as Record<string, unknown>)) deepFreeze(entry);
  }
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
