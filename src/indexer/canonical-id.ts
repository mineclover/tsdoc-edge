/**
 * Canonical graph node id helpers (`path#qualifiedName:kind`).
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @context Canonical `@ttsc/graph` node identity parser and formatter supporting persisted `path#qualifiedName:kind` IDs and in-memory `@overlay` provisional IDs.
 * @functionality Parses canonical and provisional overlay node IDs into structured file, qualified-name, and kind components, formats normalized POSIX IDs, and detects transient overlay namespaces.
 * @packageDocumentation
 */

/**
 * Canonical node identifier grammar emitted by `@ttsc/graph`.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export const CANONICAL_ID_SCHEME = '@ttsc/graph:path#qualifiedName:kind' as const;

/**
 * Suffix marking transient unsaved-buffer overlay node identifiers.
 *
 * @doc [[ProjectIndexer]]
 * @public
 */
export const OVERLAY_ID_SUFFIX = '@overlay' as const;

/**
 * Parsed canonical node id components.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export interface ParsedCanonicalId {
  readonly filePath: string;
  readonly qualifiedName: string;
  readonly kind: string;
  readonly provisional: boolean;
}

/**
 * Parse a canonical or provisional overlay node id.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export function parseCanonicalId(id: string): ParsedCanonicalId | null {
  const provisional = id.endsWith(OVERLAY_ID_SUFFIX);
  const base = provisional ? id.slice(0, -OVERLAY_ID_SUFFIX.length) : id;
  const hash = base.lastIndexOf('#');
  const colon = base.lastIndexOf(':');
  if (hash <= 0 || colon <= hash + 1) return null;
  return {
    filePath: base.slice(0, hash),
    qualifiedName: base.slice(hash + 1, colon),
    kind: base.slice(colon + 1),
    provisional,
  };
}

/**
 * Format a canonical node id. Provisional ids are never persisted.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export function formatCanonicalId(
  filePath: string,
  qualifiedName: string,
  kind: string,
  provisional = false
): string {
  const id = `${normalizePath(filePath)}#${qualifiedName}:${kind}`;
  return provisional ? `${id}${OVERLAY_ID_SUFFIX}` : id;
}

/**
 * Whether an id belongs to an in-memory unsaved overlay namespace.
 *
 * @doc [[ProjectIndexer]]
 * @public
 */
export function isProvisionalOverlayId(id: string): boolean {
  return id.endsWith(OVERLAY_ID_SUFFIX);
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}
