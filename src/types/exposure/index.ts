/**
 * Exposure and visibility tracking types
 *
 * @packageDocumentation
 * @doc [[Types Index]]
 * @context Package, module, barrel, and symbol visibility boundary analysis contracts
 * @functionality Defines ScopeLevel, Accessibility, ExposureScope, VisibilityBoundary, SymbolExposure, ExportAnalysis, PackageExportConfig, PackageExportMap, BarrelFile, and BarrelExport schemas
 */

/**
 * Scope level (visibility boundary)
 * @doc [[Types Index]]
 * @public
 */
export enum ScopeLevel {
  /** Accessible from external packages */
  PUBLIC = 'public',
  /** Accessible within same package only */
  PACKAGE = 'package',
  /** Accessible within same module only */
  MODULE = 'module',
  /** Accessible within same file only */
  FILE = 'file',
  /** Accessible within class/function only */
  PRIVATE = 'private',
}

/**
 * Accessibility modifier
 * @doc [[Types Index]]
 * @public
 */
export enum Accessibility {
  /** TypeScript public */
  PUBLIC = 'public',
  /** TypeScript protected */
  PROTECTED = 'protected',
  /** TypeScript private */
  PRIVATE = 'private',
  /** Internal (TypeScript private + package-scoped) */
  INTERNAL = 'internal',
}

/**
 * Exposure scope configuration
 * @doc [[Types Index]]
 * @public
 */
export interface ExposureScope {
  /** Scope level */
  level: ScopeLevel;

  /** Package/module boundaries */
  boundaries: string[];

  /** Barrel file path (if exported via barrel) */
  exportedVia?: string;
}

/**
 * Visibility boundary definition
 * @doc [[Types Index]]
 * @public
 */
export interface VisibilityBoundary {
  /** Packages/modules that can import this symbol */
  canBeImportedBy: string[];

  /** Packages/modules that cannot import this symbol */
  restrictedTo?: string[];

  /** Reason for restriction */
  reason?: string;
}

/**
 * Symbol exposure information
 * @doc [[Types Index]]
 * @public
 */
export interface SymbolExposure {
  /** Symbol ID */
  symbolId: string;

  /** Exposure scope */
  exposureScope: ExposureScope;

  /** Export path (actual import path) */
  exportPath?: string;

  /** Accessibility modifier */
  accessibility: Accessibility;

  /** Visibility boundaries */
  visibilityBoundary: VisibilityBoundary;
}

/**
 * Export analysis result
 * @doc [[Types Index]]
 * @public
 */
export interface ExportAnalysis {
  /** Symbol ID */
  symbolId: string;

  /** Is exported from file */
  isExported: boolean;

  /** Is exported from package (via package.json exports) */
  isPackageExport: boolean;

  /** Export path (import path) */
  exportPath?: string;

  /** Barrel files that re-export this symbol */
  barrelFiles: string[];

  /** Direct importers (files that import this symbol) */
  directImporters: string[];

  /** Indirect importers (files that import via barrel) */
  indirectImporters: string[];
}

/**
 * Package export configuration (from package.json)
 * @doc [[Types Index]]
 * @public
 */
export interface PackageExportConfig {
  /** Package name */
  packageName: string;

  /** Package root directory */
  packageRoot: string;

  /** Export map from package.json */
  exports: Record<string, string | PackageExportMap>;

  /** Main entry point */
  main?: string;

  /** Module entry point */
  module?: string;

  /** TypeScript types entry point */
  types?: string;
}

/**
 * Package export map entry
 * @doc [[Types Index]]
 * @public
 */
export interface PackageExportMap {
  /** CommonJS export */
  require?: string;

  /** ES module export */
  import?: string;

  /** TypeScript types */
  types?: string;

  /** Default export */
  default?: string;
}

/**
 * Barrel file analysis
 * @doc [[Types Index]]
 * @public
 */
export interface BarrelFile {
  /** Barrel file path */
  filePath: string;

  /** Symbols re-exported by this barrel */
  exports: BarrelExport[];

  /** Whether this is the main barrel (index.ts at package root) */
  isMain: boolean;
}

/**
 * Barrel export entry
 * @doc [[Types Index]]
 * @public
 */
export interface BarrelExport {
  /** Symbol name */
  symbolName: string;

  /** Symbol ID */
  symbolId?: string;

  /** Source file path */
  sourcePath: string;

  /** Export type (named or default) */
  exportType: 'named' | 'default' | 'namespace';

  /** Alias (if renamed) */
  alias?: string;
}
