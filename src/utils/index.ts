/**
 * Utility functions for TSDoc Edge
 *
 * @packageDocumentation
 * @doc [[Utilities Index]]
 * @context Shared low-level string, line-ending, path-extension, and configuration helpers used across CLI and core modules
 * @functionality Re-exports `ConfigLoader` and provides pure string/path predicate helpers
 */

export { ConfigLoader } from './ConfigLoader';

/**
 * Check if a string is empty or whitespace only
 * @param str - String to check
 * @returns True if string is empty or whitespace only
 * @doc [[Utilities Index]]
 * @public
 */
export function isEmptyOrWhitespace(str: string): boolean {
  return !str || str.trim().length === 0;
}

/**
 * Normalize line endings to LF
 * @param text - Text to normalize
 * @returns Text with normalized line endings
 * @doc [[Utilities Index]]
 * @public
 */
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Extract file extension from path
 * @param filePath - File path
 * @returns File extension without dot
 * @doc [[Utilities Index]]
 * @public
 */
export function getFileExtension(filePath: string): string {
  const lastDotIndex = filePath.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return filePath.substring(lastDotIndex + 1);
}

/**
 * Check if file is TypeScript or JavaScript
 * @param filePath - File path to check
 * @returns True if file is TS or JS
 * @doc [[Utilities Index]]
 * @public
 */
export function isTypeScriptOrJavaScript(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  return ['ts', 'tsx', 'js', 'jsx'].includes(ext);
}
