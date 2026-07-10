/**
 * Canonical graph node id helpers (`path#qualifiedName:kind`).
 * @packageDocumentation
 */

export const CANONICAL_ID_SCHEME = '@ttsc/graph:path#qualifiedName:kind' as const;
export const OVERLAY_ID_SUFFIX = '@overlay' as const;

/** Parsed canonical node id components. */
export interface ParsedCanonicalId {
  readonly filePath: string;
  readonly qualifiedName: string;
  readonly kind: string;
  readonly provisional: boolean;
}

/** Parse a canonical or provisional overlay node id. */
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

/** Format a canonical node id. Provisional ids are never persisted. */
export function formatCanonicalId(
  filePath: string,
  qualifiedName: string,
  kind: string,
  provisional = false
): string {
  const id = `${normalizePath(filePath)}#${qualifiedName}:${kind}`;
  return provisional ? `${id}${OVERLAY_ID_SUFFIX}` : id;
}

/** Whether an id belongs to an in-memory unsaved overlay namespace. */
export function isProvisionalOverlayId(id: string): boolean {
  return id.endsWith(OVERLAY_ID_SUFFIX);
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}
