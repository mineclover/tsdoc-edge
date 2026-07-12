/**
 * ExposureAnalyzer - Analyzes symbol exposure and visibility boundaries
 *
 * Tracks:
 * - Scope levels (public, package, module, file, private)
 * - Export paths (actual import paths)
 * - Accessibility modifiers
 * - Visibility boundaries
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  Accessibility,
  BarrelExport,
  BarrelFile,
  ExposureScope,
  PackageExportConfig,
  ScopeLevel,
  SymbolExposure,
  VisibilityBoundary,
} from '../types/exposure';
import type { Symbol } from '../types/graph/graph';

/**
 * Analyzes symbol exposure and visibility
 */
export class ExposureAnalyzer {
  private projectRoot: string;
  private packageConfigCache: Map<string, PackageExportConfig> = new Map();
  private barrelFilesCache: Map<string, BarrelFile> = new Map();

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Analyze exposure for a symbol
   */
  analyzeSymbol(symbol: Symbol): SymbolExposure {
    const scopeLevel = this.determineScopeLevel(symbol);
    const exportPath = this.resolveExportPath(symbol);
    const accessibility = this.determineAccessibility(symbol);
    const visibilityBoundary = this.inferVisibilityBoundary(symbol, scopeLevel);

    const exposureScope: ExposureScope = {
      level: scopeLevel,
      boundaries: this.extractBoundaries(symbol.filePath),
      exportedVia: this.findBarrelFile(symbol.filePath, symbol.name),
    };

    return {
      symbolId: symbol.id,
      exposureScope,
      exportPath,
      accessibility,
      visibilityBoundary,
    };
  }

  /**
   * Determine scope level of symbol
   */
  private determineScopeLevel(symbol: Symbol): ScopeLevel {
    // Check if exported
    if (!symbol.isExported) {
      // Not exported = at most file-scoped
      if (symbol.isPublic) {
        return 'file' as ScopeLevel;
      }
      return 'private' as ScopeLevel;
    }

    // Check if exported from package (via package.json exports)
    const packageConfig = this.findPackageConfig(symbol.filePath);
    if (packageConfig) {
      const isPackageExport = this.isPackageExport(symbol, packageConfig);
      if (isPackageExport) {
        return 'public' as ScopeLevel;
      }
    }

    // Check if in barrel file
    const barrelFile = this.findBarrelFile(symbol.filePath, symbol.name);
    if (barrelFile) {
      // Exported via barrel = package-scoped or public
      if (this.isMainBarrel(barrelFile)) {
        return 'public' as ScopeLevel;
      }
      return 'package' as ScopeLevel;
    }

    // Exported but not via barrel = module-scoped
    return 'module' as ScopeLevel;
  }

  /**
   * Determine accessibility modifier
   */
  private determineAccessibility(symbol: Symbol): Accessibility {
    if (!symbol.isPublic) {
      return 'private' as Accessibility;
    }

    // Check TypeScript accessibility modifiers from summary/source
    // This is a heuristic - ideally we'd parse the AST
    if (symbol.type === 'method' || symbol.type === 'property') {
      // For class members, check if public/protected/private
      // Default to public if exported
      return 'public' as Accessibility;
    }

    // Check if internal (exported but not in package.json exports)
    const packageConfig = this.findPackageConfig(symbol.filePath);
    if (packageConfig && !this.isPackageExport(symbol, packageConfig)) {
      return 'internal' as Accessibility;
    }

    return 'public' as Accessibility;
  }

  /**
   * Infer visibility boundary
   */
  private inferVisibilityBoundary(symbol: Symbol, scopeLevel: ScopeLevel): VisibilityBoundary {
    const boundary: VisibilityBoundary = {
      canBeImportedBy: [],
      restrictedTo: undefined,
      reason: undefined,
    };

    switch (scopeLevel) {
      case 'public':
        boundary.canBeImportedBy = ['*'];
        break;

      case 'package': {
        const packageName = this.extractPackageName(symbol.filePath);
        boundary.canBeImportedBy = packageName ? [packageName] : [];
        boundary.restrictedTo = packageName ? [packageName] : [];
        boundary.reason = 'Package-internal API';
        break;
      }

      case 'module': {
        const modulePath = this.extractModulePath(symbol.filePath);
        boundary.canBeImportedBy = modulePath ? [modulePath] : [];
        boundary.restrictedTo = modulePath ? [modulePath] : [];
        boundary.reason = 'Module-internal API';
        break;
      }

      case 'file':
        boundary.canBeImportedBy = [symbol.filePath];
        boundary.restrictedTo = [symbol.filePath];
        boundary.reason = 'File-internal';
        break;

      case 'private':
        boundary.canBeImportedBy = [];
        boundary.restrictedTo = [];
        boundary.reason = 'Private scope';
        break;
    }

    return boundary;
  }

  /**
   * Resolve export path (actual import path)
   */
  private resolveExportPath(symbol: Symbol): string | undefined {
    if (!symbol.isExported) {
      return undefined;
    }

    // Check package.json exports
    const packageConfig = this.findPackageConfig(symbol.filePath);
    if (packageConfig) {
      const exportPath = this.resolvePackageExportPath(symbol, packageConfig);
      if (exportPath) {
        return exportPath;
      }
    }

    // Fallback: construct from file path
    const relativePath = path.relative(this.projectRoot, symbol.filePath);
    const packageName = this.extractPackageName(symbol.filePath);

    if (packageName) {
      // Remove file extension and index
      const pathWithoutExt = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
      const pathWithoutIndex = pathWithoutExt.replace(/\/index$/, '');
      return `${packageName}/${pathWithoutIndex}`;
    }

    return undefined;
  }

  /**
   * Extract boundaries (package/module names)
   */
  private extractBoundaries(filePath: string): string[] {
    const boundaries: string[] = [];

    const packageName = this.extractPackageName(filePath);
    if (packageName) {
      boundaries.push(packageName);
    }

    const modulePath = this.extractModulePath(filePath);
    if (modulePath) {
      boundaries.push(modulePath);
    }

    return boundaries;
  }

  /**
   * Find barrel file that exports this symbol
   */
  private findBarrelFile(filePath: string, symbolName: string): string | undefined {
    const dir = path.dirname(filePath);

    // Check for index.ts in same directory
    const indexPath = path.join(dir, 'index.ts');
    if (fs.existsSync(indexPath)) {
      const barrel = this.analyzeBarrelFile(indexPath);
      if (barrel.exports.some((exp) => exp.symbolName === symbolName)) {
        return indexPath;
      }
    }

    // Check parent directories
    let currentDir = path.dirname(dir);
    const packageRoot = this.findPackageRoot(filePath);

    while (currentDir.startsWith(packageRoot)) {
      const parentIndexPath = path.join(currentDir, 'index.ts');
      if (fs.existsSync(parentIndexPath)) {
        const barrel = this.analyzeBarrelFile(parentIndexPath);
        if (barrel.exports.some((exp) => exp.symbolName === symbolName)) {
          return parentIndexPath;
        }
      }
      currentDir = path.dirname(currentDir);
    }

    return undefined;
  }

  /**
   * Analyze barrel file
   */
  private analyzeBarrelFile(barrelPath: string): BarrelFile {
    // Check cache
    if (this.barrelFilesCache.has(barrelPath)) {
      return this.barrelFilesCache.get(barrelPath)!;
    }

    const exports: BarrelExport[] = [];
    const packageRoot = this.findPackageRoot(barrelPath);
    const isMain =
      path.basename(barrelPath) === 'index.ts' && path.dirname(barrelPath) === packageRoot;

    // Parse file to extract exports
    // Simplified - in production, use TypeScript Compiler API
    const content = fs.readFileSync(barrelPath, 'utf-8');
    const exportRegex =
      /export\s+(?:\*\s+as\s+(\w+)\s+from|{([^}]+)}\s+from|(\w+)\s+from)\s+['"]([^'"]+)['"]/g;

    for (const match of content.matchAll(exportRegex)) {
      const [, namespaceExport, namedExports, defaultExport, sourcePath] = match;

      if (namespaceExport) {
        exports.push({
          symbolName: namespaceExport,
          sourcePath: this.resolveImportPath(barrelPath, sourcePath),
          exportType: 'namespace',
        });
      } else if (namedExports) {
        const names = namedExports.split(',').map((n) => n.trim());
        for (const name of names) {
          const [originalName, alias] = name.split(' as ').map((s) => s.trim());
          exports.push({
            symbolName: originalName,
            sourcePath: this.resolveImportPath(barrelPath, sourcePath),
            exportType: 'named',
            alias: alias || undefined,
          });
        }
      } else if (defaultExport) {
        exports.push({
          symbolName: defaultExport,
          sourcePath: this.resolveImportPath(barrelPath, sourcePath),
          exportType: 'default',
        });
      }
    }

    const result: BarrelFile = {
      filePath: barrelPath,
      exports,
      isMain,
    };

    this.barrelFilesCache.set(barrelPath, result);
    return result;
  }

  /**
   * Check if barrel is main (package root)
   */
  private isMainBarrel(barrelPath: string): boolean {
    const packageRoot = this.findPackageRoot(barrelPath);
    return path.basename(barrelPath) === 'index.ts' && path.dirname(barrelPath) === packageRoot;
  }

  /**
   * Find package.json config
   */
  private findPackageConfig(filePath: string): PackageExportConfig | undefined {
    const packageRoot = this.findPackageRoot(filePath);

    // Check cache
    if (this.packageConfigCache.has(packageRoot)) {
      return this.packageConfigCache.get(packageRoot);
    }

    const packageJsonPath = path.join(packageRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return undefined;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const config: PackageExportConfig = {
        packageName: packageJson.name || '',
        packageRoot,
        exports: packageJson.exports || {},
        main: packageJson.main,
        module: packageJson.module,
        types: packageJson.types,
      };

      this.packageConfigCache.set(packageRoot, config);
      return config;
    } catch {
      return undefined;
    }
  }

  /**
   * Check if symbol is package export
   */
  private isPackageExport(symbol: Symbol, packageConfig: PackageExportConfig): boolean {
    if (!packageConfig.exports || Object.keys(packageConfig.exports).length === 0) {
      return false;
    }

    const relativePath = path.relative(packageConfig.packageRoot, symbol.filePath);

    // Check exports map
    for (const [_exportPath, target] of Object.entries(packageConfig.exports)) {
      const targetPath = typeof target === 'string' ? target : target.import || target.default;
      if (targetPath && relativePath.startsWith(targetPath.replace('./', ''))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolve package export path
   */
  private resolvePackageExportPath(
    symbol: Symbol,
    packageConfig: PackageExportConfig
  ): string | undefined {
    const relativePath = path.relative(packageConfig.packageRoot, symbol.filePath);

    for (const [exportPath, target] of Object.entries(packageConfig.exports)) {
      const targetPath = typeof target === 'string' ? target : target.import || target.default;
      if (targetPath && relativePath.startsWith(targetPath.replace('./', ''))) {
        const subpath = relativePath.substring(targetPath.replace('./', '').length);
        return `${packageConfig.packageName}${exportPath === '.' ? '' : exportPath}${subpath}`;
      }
    }

    return undefined;
  }

  /**
   * Find package root directory
   */
  private findPackageRoot(filePath: string): string {
    let currentDir = path.dirname(filePath);

    while (currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }

    return this.projectRoot;
  }

  /**
   * Extract package name from file path
   */
  private extractPackageName(filePath: string): string | undefined {
    const packageConfig = this.findPackageConfig(filePath);
    return packageConfig?.packageName;
  }

  /**
   * Extract module path (directory path within package)
   */
  private extractModulePath(filePath: string): string | undefined {
    const packageRoot = this.findPackageRoot(filePath);
    const relativePath = path.relative(packageRoot, path.dirname(filePath));

    if (relativePath) {
      const packageName = this.extractPackageName(filePath);
      return packageName ? `${packageName}/${relativePath}` : relativePath;
    }

    return undefined;
  }

  /**
   * Resolve import path relative to barrel file
   */
  private resolveImportPath(barrelPath: string, importPath: string): string {
    if (importPath.startsWith('.')) {
      return path.resolve(path.dirname(barrelPath), importPath);
    }
    return importPath;
  }
}
