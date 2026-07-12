/**
 * Symbol Identifier Generator
 * Generates stable identifiers for symbols across refactorings
 * @packageDocumentation
 */

import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateLegacyId } from '../indexer/legacy-id';

/**
 * Symbol identifier components
 */
export interface SymbolIdentifiers {
  /** Permanent UUID (never changes) */
  uuid: string;
  /** Local path (file::symbol) */
  localPath: string;
  /** Global path (@package/scope::symbol) for exported symbols */
  globalPath?: string;
  /** Scope (package/module boundary) */
  scope: string;
  /** Legacy ID (for backwards compatibility) */
  legacyId: string;
}

/**
 * Package.json cache entry
 */
interface PackageInfo {
  name: string;
  version: string;
  exports?: Record<string, unknown>;
  scope: string;
  packageDir: string;
}

/**
 * Symbol Identifier Generator
 * Provides stable, refactoring-resistant identifiers
 */
export class SymbolIdentifierGenerator {
  private packageCache = new Map<string, PackageInfo>();
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Generate all identifiers for a symbol
   */
  generateIdentifiers(
    filePath: string,
    symbolName: string,
    symbolType: string,
    isExported: boolean,
    parentSymbol?: string
  ): SymbolIdentifiers {
    const uuid = randomUUID();
    const localPath = this.generateLocalPath(filePath, symbolName, parentSymbol);
    const scope = this.extractScope(filePath);
    const globalPath = isExported
      ? this.generateGlobalPath(filePath, symbolName, scope, parentSymbol)
      : undefined;
    const legacyId = generateLegacyId(filePath, symbolName, symbolType);

    return { uuid, localPath, globalPath, scope, legacyId };
  }

  /**
   * Generate local path: "path/to/file.ts::SymbolName"
   */
  private generateLocalPath(filePath: string, symbolName: string, parentSymbol?: string): string {
    // Normalize path relative to project root
    const relativePath = path.relative(this.projectRoot, filePath);
    const normalizedPath = relativePath.replace(/\\/g, '/');

    // Include parent symbol if present (for methods/properties)
    const fullSymbolName = parentSymbol ? `${parentSymbol}.${symbolName}` : symbolName;

    return `${normalizedPath}::${fullSymbolName}`;
  }

  /**
   * Generate global path: "@package/scope::SymbolName"
   * Only for exported symbols
   */
  private generateGlobalPath(
    _filePath: string,
    symbolName: string,
    scope: string,
    parentSymbol?: string
  ): string {
    // Include parent symbol if present
    const fullSymbolName = parentSymbol ? `${parentSymbol}.${symbolName}` : symbolName;

    // For now, use scope as-is
    // Future: analyze package.json exports to determine actual export path
    return `${scope}::${fullSymbolName}`;
  }

  /**
   * Extract scope from file path (nearest package.json)
   */
  extractScope(filePath: string): string {
    // Check cache first
    let currentDir = path.dirname(filePath);

    // Walk up directory tree to find package.json
    while (currentDir !== this.projectRoot && currentDir !== path.dirname(currentDir)) {
      const cached = this.packageCache.get(currentDir);
      if (cached) {
        return cached.scope;
      }

      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
          const packageInfo: PackageInfo = {
            name: packageJson.name || 'unknown',
            version: packageJson.version || '0.0.0',
            exports: packageJson.exports,
            scope: this.normalizeScope(packageJson.name || 'unknown'),
            packageDir: currentDir,
          };

          this.packageCache.set(currentDir, packageInfo);
          return packageInfo.scope;
        } catch (_err) {
          // If package.json is invalid, continue up the tree
        }
      }

      currentDir = path.dirname(currentDir);
    }

    // Fallback: use relative path as scope
    const relativePath = path.relative(this.projectRoot, path.dirname(filePath));
    return this.normalizeScope(relativePath);
  }

  /**
   * Normalize scope to @package/subpath format
   */
  private normalizeScope(rawScope: string): string {
    // Already in @package format
    if (rawScope.startsWith('@')) {
      return rawScope;
    }

    // Convert path to scope format
    const normalized = rawScope
      .replace(/\\/g, '/')
      .replace(/^src\//, '')
      .replace(/^packages\//, '');

    return normalized || 'root';
  }

  /**
   * Resolve export path from package.json exports field
   * Future enhancement: analyze package.json exports to determine actual import path
   */
  resolveExportPath(filePath: string, symbolName: string): string | undefined {
    const packageInfo = this.findPackageInfo(filePath);
    if (!packageInfo || !packageInfo.exports) {
      return undefined;
    }

    // TODO: Implement exports field analysis
    // For now, return simple scope-based path
    return `${packageInfo.scope}::${symbolName}`;
  }

  /**
   * Find package info for a file
   */
  private findPackageInfo(filePath: string): PackageInfo | undefined {
    let currentDir = path.dirname(filePath);

    while (currentDir !== this.projectRoot && currentDir !== path.dirname(currentDir)) {
      const cached = this.packageCache.get(currentDir);
      if (cached) {
        return cached;
      }

      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
          const packageInfo: PackageInfo = {
            name: packageJson.name || 'unknown',
            version: packageJson.version || '0.0.0',
            exports: packageJson.exports,
            scope: this.normalizeScope(packageJson.name || 'unknown'),
            packageDir: currentDir,
          };

          this.packageCache.set(currentDir, packageInfo);
          return packageInfo;
        } catch (_err) {
          // Continue
        }
      }

      currentDir = path.dirname(currentDir);
    }

    return undefined;
  }

  /**
   * Clear package cache (useful for testing)
   */
  clearCache(): void {
    this.packageCache.clear();
  }
}
