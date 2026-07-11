/** Application boundary composing a raw provider with the canonical ProjectIndexer. */

import { canonicalFsPath } from '../indexer/canonical-path';
import type {
  ProjectGraphInput,
  ProjectGraphSource,
  ProjectIndexRequest,
  ProjectIndexResult,
} from '../indexer/contracts';
import { ProjectIndexer } from '../indexer/ProjectIndexer';
import type { ProviderProjectInput, ProviderSnapshot, SemanticGraphProvider } from './contracts';
import type {
  NormalizedProviderSnapshot,
  ProviderSnapshotNormalizer,
} from './ProviderSnapshotNormalizer';

/** One pinned raw snapshot and its canonical compatibility projection. */
export interface ProviderProjectIndexResult extends ProjectIndexResult {
  readonly providerSnapshot: ProviderSnapshot;
  readonly normalizedSnapshot: NormalizedProviderSnapshot;
}

/**
 * Executes the only supported provider-to-canonical sequence.
 *
 * Provider implementations cannot bypass `ProviderSnapshotNormalizer` or hand
 * canonical ids directly to persistence through this boundary.
 */
export class ProviderProjectIndexer {
  constructor(
    private readonly provider: SemanticGraphProvider,
    private readonly normalizer: ProviderSnapshotNormalizer
  ) {}

  /** Capture, normalize, and assemble one whole-project snapshot. */
  async index(input: ProviderProjectInput): Promise<ProviderProjectIndexResult> {
    const requestedRoot = canonicalFsPath(input.rootDir);
    if (requestedRoot !== this.normalizer.rootDir) {
      throw new Error(
        `ProviderProjectIndexer root mismatch: requested ${requestedRoot}, normalizer uses ${this.normalizer.rootDir}`
      );
    }
    const providerSnapshot = immutableJson(await this.provider.snapshot(input));
    if (providerSnapshot.workspaceId !== input.workspaceId) {
      throw new Error(
        `Provider snapshot workspace mismatch: requested ${input.workspaceId}, received ${providerSnapshot.workspaceId}`
      );
    }
    const expectedIdentity = this.provider.identity();
    if (stableJson(providerSnapshot.identity) !== stableJson(expectedIdentity)) {
      throw new Error('Provider snapshot identity does not match provider.identity()');
    }
    const normalizedSnapshot = this.normalizer.normalize(providerSnapshot);
    const projectInput = normalizedSnapshot.projectInput;
    const result = await new ProjectIndexer(new NormalizedProjectGraphSource(projectInput)).index({
      rootDir: projectInput.rootDir,
      tsconfigPath: projectInput.tsconfigPath,
    });
    return Object.freeze({
      ...result,
      providerSnapshot,
      normalizedSnapshot,
    });
  }
}

class NormalizedProjectGraphSource implements ProjectGraphSource {
  readonly id = 'provider-snapshot-normalizer';

  constructor(private readonly input: ProjectGraphInput) {}

  async load(_request: ProjectIndexRequest): Promise<ProjectGraphInput> {
    return this.input;
  }
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown, seen = new Set<object>()): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Provider snapshot requires finite numbers');
    return value;
  }
  if (typeof value !== 'object') {
    throw new Error(`Provider snapshot cannot contain ${typeof value}`);
  }
  if (seen.has(value)) throw new Error('Provider snapshot cannot contain cycles');
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((entry) => canonicalize(entry, seen));
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error('Provider snapshot requires plain JSON objects');
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, child]) => [key, canonicalize(child, seen)])
    );
  } finally {
    seen.delete(value);
  }
}

function immutableJson<T>(value: T): T {
  return deepFreeze(JSON.parse(stableJson(value)) as T);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
