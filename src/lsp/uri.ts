/**
 * File URI helpers shared by the LSP protocol boundary.
 *
 * @packageDocumentation
 * @doc [[LspAndCoverageSurfaceSpecification]]
 * @doc [[LSP Integration]]
 * @context Protocol boundary translation between LSP `file:` URIs and native workspace filesystem paths
 * @functionality File URI decoding, line-anchored URI encoding, workspace root resolution, and TypeScript path filtering
 */

import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Convert a file URI to a native path, rejecting virtual/non-file documents.
 *
 * @doc [[LspAndCoverageSurfaceSpecification]]
 * @doc [[LSP Integration]]
 * @public
 */
export function filePathFromUri(uri: string): string | null {
  try {
    const parsed = new URL(uri);
    return parsed.protocol === 'file:' ? fileURLToPath(parsed) : null;
  } catch {
    return null;
  }
}

/**
 * Convert a native path to an escaped file URI, optionally with a line fragment.
 *
 * @doc [[LspAndCoverageSurfaceSpecification]]
 * @doc [[LSP Integration]]
 * @public
 */
export function fileUriFromPath(filePath: string, line?: number): string {
  const uri = pathToFileURL(filePath);
  if (line !== undefined) uri.hash = `L${line}`;
  return uri.href;
}

/**
 * Resolve the best workspace root advertised during initialize.
 *
 * @doc [[LspAndCoverageSurfaceSpecification]]
 * @doc [[LSP Integration]]
 * @public
 */
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

/**
 * Whether a path belongs to a TypeScript source-file lane handled by the LSP.
 *
 * @doc [[LspAndCoverageSurfaceSpecification]]
 * @doc [[LSP Integration]]
 * @public
 */
export function isTypeScriptSourcePath(filePath: string): boolean {
  return /\.(?:[cm]?ts|tsx)$/i.test(filePath);
}
