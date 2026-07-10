/**
 * File URI helpers shared by the LSP protocol boundary.
 * @packageDocumentation
 */

import { fileURLToPath, pathToFileURL } from 'node:url';

/** Convert a file URI to a native path, rejecting virtual/non-file documents. */
export function filePathFromUri(uri: string): string | null {
  try {
    const parsed = new URL(uri);
    return parsed.protocol === 'file:' ? fileURLToPath(parsed) : null;
  } catch {
    return null;
  }
}

/** Convert a native path to an escaped file URI, optionally with a line fragment. */
export function fileUriFromPath(filePath: string, line?: number): string {
  const uri = pathToFileURL(filePath);
  if (line !== undefined) uri.hash = `L${line}`;
  return uri.href;
}

/** Resolve the best workspace root advertised during initialize. */
export function resolveWorkspaceRoot(
  workspaceFolderUris: readonly string[] | undefined,
  rootUri: string | null | undefined,
  fallback: string
): string {
  for (const candidate of [...(workspaceFolderUris ?? []), ...(rootUri ? [rootUri] : [])]) {
    const filePath = filePathFromUri(candidate);
    if (filePath) return filePath;
  }
  return fallback;
}

/** Whether a path belongs to a TypeScript source-file lane handled by the LSP. */
export function isTypeScriptSourcePath(filePath: string): boolean {
  return /\.(?:[cm]?ts|tsx)$/i.test(filePath);
}
