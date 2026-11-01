/**
 * Canonical filesystem path resolution helpers for project graph indexing.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @context Filesystem path normalization utility ensuring consistent canonical path comparison across symlinked or aliased workspace roots.
 * @functionality Resolves input paths via `path.resolve` and attempts native `fs.realpathSync.native` resolution while falling back cleanly for non-existent planned paths.
 * @sideEffect filesystem: Queries native filesystem realpaths via `fs.realpathSync.native` when target paths exist on disk.
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Resolve path aliases when the target exists, while remaining usable for planned paths.
 *
 * @doc [[ProjectIndexer]]
 * @doc [[TtscPlatformSpecification]]
 * @public
 */
export function canonicalFsPath(value: string): string {
  const resolved = path.resolve(value);
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}
