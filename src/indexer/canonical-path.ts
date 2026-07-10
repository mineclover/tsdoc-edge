import * as fs from 'node:fs';
import * as path from 'node:path';

/** Resolve path aliases when the target exists, while remaining usable for planned paths. */
export function canonicalFsPath(value: string): string {
  const resolved = path.resolve(value);
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}
