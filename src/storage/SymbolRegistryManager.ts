/**
 * Symbol Registry Manager
 * @packageDocumentation
 * @responsibility Manage symbol ID registry stored in JSONL
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  DependencyRelation,
  SourceRef,
  SymbolRegistry,
  SymbolRegistryEntry,
} from '../types/registry';
import { IdGenerator } from '../utils/IdGenerator';

/**
 * Symbol Registry Manager
 * Manages the JSONL file containing ID-to-source mappings
 *
 * @id 001
 * @public
 * @responsibility Manage symbol ID registry stored in JSONL with hierarchy tracking
 * @contract Provide CRUD operations for symbol registry with auto-generated qualified names
 * @testScenario Basic ID registration and retrieval
 * @testScenario Hierarchy tracking with parent-child relationships
 * @testScenario Automatic qualifiedName generation
 * @testScenario Depth calculation
 * @testScenario Search functionality
 * @testScenario Dependency management
 * @testScenario Persistence (save/load)
 */
export class SymbolRegistryManager {
  private registryPath: string;
  private registry: SymbolRegistry;
  private idGenerator: IdGenerator;

  /**
   * Create a new SymbolRegistryManager
   * @param registryPath - Path to registry.jsonl file
   */
  constructor(registryPath: string) {
    this.registryPath = registryPath;

    // Load existing registry or create new
    if (fs.existsSync(registryPath)) {
      this.registry = this.load();
    } else {
      this.registry = {
        version: '1.0.0',
        entries: [],
        idGeneratorMode: 'sequential',
      };
    }

    // Initialize ID generator
    this.idGenerator = new IdGenerator({
      mode: this.registry.idGeneratorMode,
    });

    // Register existing IDs
    const existingIds = this.registry.entries.map((e) => e.id);
    this.idGenerator.registerExisting(existingIds);
  }

  /**
   * Load registry from JSONL file
   * @returns Loaded registry
   */
  private load(): SymbolRegistry {
    const content = fs.readFileSync(this.registryPath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      return {
        version: '1.0.0',
        entries: [],
        idGeneratorMode: 'sequential',
      };
    }

    // First line is metadata
    const metadata = JSON.parse(lines[0]);

    // Rest are entries
    const entries: SymbolRegistryEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
      entries.push(JSON.parse(lines[i]));
    }

    return {
      version: metadata.version || '1.0.0',
      idGeneratorMode: metadata.idGeneratorMode || 'sequential',
      nextSequentialId: metadata.nextSequentialId,
      entries,
    };
  }

  /**
   * Save registry to JSONL file
   */
  save(): void {
    const dir = path.dirname(this.registryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const lines: string[] = [];

    // First line: metadata
    const metadata = {
      version: this.registry.version,
      idGeneratorMode: this.registry.idGeneratorMode,
      nextSequentialId: this.registry.nextSequentialId,
      totalEntries: this.registry.entries.length,
      lastUpdated: new Date().toISOString(),
    };
    lines.push(JSON.stringify(metadata));

    // Following lines: one entry per line
    for (const entry of this.registry.entries) {
      lines.push(JSON.stringify(entry));
    }

    fs.writeFileSync(this.registryPath, lines.join('\n') + '\n', 'utf-8');
  }

  /**
   * Register a new symbol and generate unique ID
   *
   * If symbol already exists, returns existing ID.
   * Auto-generates qualifiedName and calculates hierarchy depth.
   *
   * @param sourceRef - Source location and metadata
   * @param tags - Optional classification tags
   * @param notes - Optional developer notes
   * @returns Generated or existing ID (e.g., "001", "002")
   *
   * @example
   * ```typescript
   * const id = manager.register({
   *   filePath: 'src/User.ts',
   *   symbolName: 'User',
   *   type: 'class'
   * }, ['model', 'api']);
   * // => "001"
   * ```
   */
  register(sourceRef: SourceRef, tags?: string[], notes?: string): string {
    // Check if already exists
    const existing = this.findBySourceRef(sourceRef);
    if (existing) {
      return existing.id;
    }

    const id = this.idGenerator.generate();
    const now = new Date().toISOString();

    // Auto-generate qualifiedName and depth if not provided
    const enrichedSourceRef = this.enrichSourceRef(sourceRef);

    const entry: SymbolRegistryEntry = {
      id,
      sourceRef: enrichedSourceRef,
      createdAt: now,
      updatedAt: now,
      tags,
      notes,
    };

    this.registry.entries.push(entry);
    return id;
  }

  /**
   * Enrich source reference with computed fields
   * @param sourceRef - Original source reference
   * @returns Enriched source reference with qualifiedName and depth
   */
  private enrichSourceRef(sourceRef: SourceRef): SourceRef {
    const enriched = { ...sourceRef };

    // Calculate depth
    if (enriched.depth === undefined) {
      enriched.depth = this.calculateDepth(sourceRef);
    }

    // Generate qualifiedName
    if (!enriched.qualifiedName) {
      enriched.qualifiedName = this.generateQualifiedName(sourceRef);
    }

    return enriched;
  }

  /**
   * Calculate hierarchy depth
   * @param sourceRef - Source reference
   * @returns Depth level (0 = top-level, 1 = method, 2+ = nested)
   */
  private calculateDepth(sourceRef: SourceRef): number {
    if (!sourceRef.memberOf) {
      return 0; // Top-level symbol
    }

    // Find parent and recursively calculate depth
    const parent = this.findById(sourceRef.memberOf);
    if (!parent) {
      return 1; // Parent not found, assume depth 1
    }

    return 1 + this.calculateDepth(parent.sourceRef);
  }

  /**
   * Generate qualified name using JSDoc convention
   * @param sourceRef - Source reference
   * @returns Qualified name (e.g., "ClassName#method")
   */
  private generateQualifiedName(sourceRef: SourceRef): string {
    if (!sourceRef.memberOf) {
      // Top-level symbol: just the name
      return sourceRef.symbolName;
    }

    // Find parent symbol
    const parent = this.findById(sourceRef.memberOf);
    if (!parent) {
      return sourceRef.symbolName;
    }

    // Determine separator based on memberType
    let separator = '#'; // default: instance
    if (sourceRef.memberType === 'static') {
      separator = '.';
    } else if (sourceRef.memberType === 'inner') {
      separator = '~';
    }

    // Build qualified name recursively
    const parentQualified = parent.sourceRef.qualifiedName || parent.sourceRef.symbolName;
    return `${parentQualified}${separator}${sourceRef.symbolName}`;
  }

  /**
   * Find entry by ID
   * @param id - Symbol ID
   * @returns Registry entry or undefined
   */
  findById(id: string): SymbolRegistryEntry | undefined {
    return this.registry.entries.find((e) => e.id === id);
  }

  /**
   * Find entry by source reference
   *
   * Enhanced duplicate detection with type-based matching.
   * By default, distinguishes between class User and interface User.
   *
   * @param sourceRef - Source reference to search
   * @param includeType - Include type in matching (default: true)
   * @returns Registry entry or undefined if not found
   *
   * @example
   * ```typescript
   * // Find class User specifically
   * const entry = manager.findBySourceRef({
   *   filePath: 'src/User.ts',
   *   symbolName: 'User',
   *   type: 'class'
   * });
   *
   * // Find any User (ignore type)
   * const anyUser = manager.findBySourceRef({
   *   filePath: 'src/User.ts',
   *   symbolName: 'User',
   *   type: 'interface'
   * }, false);
   * ```
   */
  findBySourceRef(
    sourceRef: SourceRef,
    includeType: boolean = true
  ): SymbolRegistryEntry | undefined {
    return this.registry.entries.find((e) => {
      const filePathMatch = e.sourceRef.filePath === sourceRef.filePath;
      const symbolNameMatch = e.sourceRef.symbolName === sourceRef.symbolName;
      const typeMatch = includeType ? e.sourceRef.type === sourceRef.type : true;

      return filePathMatch && symbolNameMatch && typeMatch;
    });
  }

  /**
   * Update source reference for an ID (when code is moved/renamed)
   * @param id - Symbol ID
   * @param newSourceRef - New source reference
   * @returns True if updated
   */
  updateSourceRef(id: string, newSourceRef: SourceRef): boolean {
    const entry = this.findById(id);
    if (!entry) {
      return false;
    }

    entry.sourceRef = newSourceRef;
    entry.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Get all entries
   * @returns All registry entries
   */
  getAll(): SymbolRegistryEntry[] {
    return [...this.registry.entries];
  }

  /**
   * Get entries by file path
   * @param filePath - File path
   * @returns Entries in that file
   */
  getByFile(filePath: string): SymbolRegistryEntry[] {
    return this.registry.entries.filter((e) => e.sourceRef.filePath === filePath);
  }

  /**
   * Get entries by tag
   * @param tag - Tag name
   * @returns Entries with that tag
   */
  getByTag(tag: string): SymbolRegistryEntry[] {
    return this.registry.entries.filter((e) => e.tags?.includes(tag));
  }

  /**
   * Delete entry by ID
   * @param id - Symbol ID
   * @returns True if deleted
   */
  delete(id: string): boolean {
    const index = this.registry.entries.findIndex((e) => e.id === id);
    if (index === -1) {
      return false;
    }

    this.registry.entries.splice(index, 1);
    return true;
  }

  /**
   * Add dependency relationship
   * @param fromId - Source symbol ID
   * @param toId - Target symbol ID
   * @param reason - Why this dependency exists
   * @param type - Dependency type
   * @returns True if added
   */
  addDependency(
    fromId: string,
    toId: string,
    reason: string,
    type?: 'runtime' | 'type-only' | 'dev'
  ): boolean {
    const entry = this.findById(fromId);
    if (!entry) {
      return false;
    }

    // Check if target exists
    const target = this.findById(toId);
    if (!target) {
      return false;
    }

    // Initialize uses array if needed
    if (!entry.uses) {
      entry.uses = [];
    }

    // Check if already exists
    const exists = entry.uses.some((dep) => dep.targetId === toId);
    if (exists) {
      return false;
    }

    // Add dependency
    entry.uses.push({ targetId: toId, reason, type });
    entry.updatedAt = new Date().toISOString();

    return true;
  }

  /**
   * Get dependencies of a symbol
   * @param id - Symbol ID
   * @returns Array of dependencies
   */
  getDependencies(id: string): DependencyRelation[] {
    const entry = this.findById(id);
    return entry?.uses || [];
  }

  /**
   * Get reverse dependencies (who uses this symbol)
   * @param id - Symbol ID
   * @returns Array of symbols that use this one
   */
  getUsedBy(id: string): Array<{ fromId: string; reason: string; type?: string }> {
    const usedBy: Array<{ fromId: string; reason: string; type?: string }> = [];

    for (const entry of this.registry.entries) {
      if (entry.uses) {
        for (const dep of entry.uses) {
          if (dep.targetId === id) {
            usedBy.push({
              fromId: entry.id,
              reason: dep.reason,
              type: dep.type,
            });
          }
        }
      }
    }

    return usedBy;
  }

  /**
   * Get dependency graph
   * @returns Adjacency list representation
   */
  getDependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const entry of this.registry.entries) {
      const deps = entry.uses?.map((d) => d.targetId) || [];
      graph.set(entry.id, deps);
    }

    return graph;
  }

  /**
   * Find orphaned symbols (no dependencies and not used by anyone)
   * @returns Array of orphaned symbol IDs
   */
  findOrphans(): string[] {
    const orphans: string[] = [];

    for (const entry of this.registry.entries) {
      const hasDeps = (entry.uses?.length || 0) > 0;
      const isUsed = this.getUsedBy(entry.id).length > 0;

      if (!hasDeps && !isUsed) {
        orphans.push(entry.id);
      }
    }

    return orphans;
  }

  /**
   * Find entry by qualified name
   * @param qualifiedName - Qualified name (e.g., "DataProcessor#loadCSV")
   * @returns Registry entry or undefined
   */
  findByQualifiedName(qualifiedName: string): SymbolRegistryEntry | undefined {
    return this.registry.entries.find((e) => e.sourceRef.qualifiedName === qualifiedName);
  }

  /**
   * Find duplicate qualified names across registry
   *
   * Identifies symbols with identical qualifiedNames, which may indicate:
   * - Naming conflicts
   * - Code duplication
   * - Refactoring artifacts
   *
   * @returns Array of duplicates with qualifiedName and affected entries
   *
   * @example
   * ```typescript
   * const duplicates = manager.findDuplicateQualifiedNames();
   * // => [{ qualifiedName: 'User', entries: [entry1, entry2] }]
   * ```
   */
  findDuplicateQualifiedNames(): Array<{
    qualifiedName: string;
    entries: SymbolRegistryEntry[];
  }> {
    const nameMap = new Map<string, SymbolRegistryEntry[]>();

    for (const entry of this.registry.entries) {
      const qn = entry.sourceRef.qualifiedName;
      if (!qn) continue;

      if (!nameMap.has(qn)) {
        nameMap.set(qn, []);
      }
      nameMap.get(qn)!.push(entry);
    }

    const duplicates: Array<{ qualifiedName: string; entries: SymbolRegistryEntry[] }> = [];
    for (const [qualifiedName, entries] of nameMap.entries()) {
      if (entries.length > 1) {
        duplicates.push({ qualifiedName, entries });
      }
    }

    return duplicates;
  }

  /**
   * Get direct children of a symbol
   * @param parentId - Parent symbol ID
   * @returns Array of child entries
   */
  getChildren(parentId: string): SymbolRegistryEntry[] {
    return this.registry.entries.filter((e) => e.sourceRef.memberOf === parentId);
  }

  /**
   * Get all descendants of a symbol (recursive)
   * @param parentId - Parent symbol ID
   * @returns Array of all descendant entries
   */
  getDescendants(parentId: string): SymbolRegistryEntry[] {
    const descendants: SymbolRegistryEntry[] = [];
    const children = this.getChildren(parentId);

    for (const child of children) {
      descendants.push(child);
      // Recursively get grandchildren
      descendants.push(...this.getDescendants(child.id));
    }

    return descendants;
  }

  /**
   * Build hierarchy tree starting from root symbols
   * @returns Array of root entries with nested children
   */
  buildHierarchy(): Array<SymbolRegistryEntry & { children?: SymbolRegistryEntry[] }> {
    // Find root symbols (no parent)
    const roots = this.registry.entries.filter((e) => !e.sourceRef.memberOf);

    // Build tree recursively
    const buildTree = (
      entry: SymbolRegistryEntry
    ): SymbolRegistryEntry & { children?: SymbolRegistryEntry[] } => {
      const children = this.getChildren(entry.id);
      if (children.length === 0) {
        return entry;
      }
      return {
        ...entry,
        children: children.map(buildTree),
      };
    };

    return roots.map(buildTree);
  }

  /**
   * Search symbols by name or qualified name
   * @param query - Search query
   * @returns Matching entries
   */
  search(query: string): SymbolRegistryEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.registry.entries.filter(
      (e) =>
        e.sourceRef.symbolName.toLowerCase().includes(lowerQuery) ||
        e.sourceRef.qualifiedName?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Detect moved symbols across files
   *
   * Finds symbols with identical name in different files,
   * indicating potential file refactoring or migration.
   *
   * @param symbolName - Symbol name to search
   * @param type - Optional type filter
   * @returns Entries in different files, empty if none found
   */
  detectMoved(symbolName: string, type?: string): SymbolRegistryEntry[] {
    const matches = this.registry.entries.filter((e) => {
      const nameMatch = e.sourceRef.symbolName === symbolName;
      const typeMatch = type ? e.sourceRef.type === type : true;
      return nameMatch && typeMatch;
    });

    // If found in multiple files, it's likely moved
    if (matches.length > 1) {
      const files = new Set(matches.map((m) => m.sourceRef.filePath));
      if (files.size > 1) {
        return matches;
      }
    }

    return [];
  }

  /**
   * Detect renamed symbols (same file, different name, similar signature)
   * @param filePath - File path
   * @param type - Symbol type
   * @returns Array of entries in same file with same type
   */
  detectPotentialRenames(filePath: string, type: string): SymbolRegistryEntry[] {
    return this.registry.entries.filter(
      (e) => e.sourceRef.filePath === filePath && e.sourceRef.type === type
    );
  }

  /**
   * Find symbols by name pattern (for refactoring detection)
   * @param pattern - RegExp pattern or string
   * @returns Matching entries
   */
  findByNamePattern(pattern: string | RegExp): SymbolRegistryEntry[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    return this.registry.entries.filter((e) => regex.test(e.sourceRef.symbolName));
  }

  /**
   * Detect dependency cycles (circular dependencies in uses)
   * @returns Array of cycles, each cycle is array of symbol IDs
   */
  detectDependencyCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (symbolId: string, path: string[]): void => {
      visited.add(symbolId);
      recursionStack.add(symbolId);
      path.push(symbolId);

      const entry = this.findById(symbolId);
      if (entry && entry.uses) {
        for (const dep of entry.uses) {
          const depId = dep.targetId;
          if (!visited.has(depId)) {
            dfs(depId, [...path]);
          } else if (recursionStack.has(depId)) {
            // Found a cycle
            const cycleStart = path.indexOf(depId);
            const cycle = path.slice(cycleStart);
            cycle.push(depId); // Complete the cycle
            cycles.push(cycle);
          }
        }
      }

      recursionStack.delete(symbolId);
    };

    for (const entry of this.registry.entries) {
      if (!visited.has(entry.id)) {
        dfs(entry.id, []);
      }
    }

    return cycles;
  }

  /**
   * Validate registry integrity
   *
   * Performs comprehensive checks:
   * - Duplicate IDs (error)
   * - Duplicate qualified names (warning)
   * - Orphaned parent references (warning)
   * - Circular parent references (warning)
   * - Circular dependencies (warning)
   * - Invalid dependency targets (warning)
   *
   * @returns Validation result
   * @returns result.isValid - True if no errors (warnings OK)
   * @returns result.errors - Critical issues requiring fixes
   * @returns result.warnings - Non-critical issues for review
   *
   * @example
   * ```typescript
   * const validation = manager.validateIntegrity();
   * if (!validation.isValid) {
   *   console.error('Errors:', validation.errors);
   * }
   * if (validation.warnings.length > 0) {
   *   console.warn('Warnings:', validation.warnings);
   * }
   * ```
   */
  validateIntegrity(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate IDs
    const idSet = new Set<string>();
    for (const entry of this.registry.entries) {
      if (idSet.has(entry.id)) {
        errors.push(`Duplicate ID found: ${entry.id}`);
      }
      idSet.add(entry.id);
    }

    // Check for duplicate qualified names
    const duplicateQNames = this.findDuplicateQualifiedNames();
    for (const dup of duplicateQNames) {
      warnings.push(
        `Duplicate qualified name: ${dup.qualifiedName} (IDs: ${dup.entries.map((e) => e.id).join(', ')})`
      );
    }

    // Check for orphaned parent references
    const allIds = new Set(this.registry.entries.map((e) => e.id));
    for (const entry of this.registry.entries) {
      if (entry.sourceRef.memberOf && !allIds.has(entry.sourceRef.memberOf)) {
        warnings.push(
          `Symbol ${entry.id} references non-existent parent: ${entry.sourceRef.memberOf}`
        );
      }
    }

    // Check for circular parent references (hierarchy cycle)
    // This is a data integrity issue but may occur during refactoring
    for (const entry of this.registry.entries) {
      const visited = new Set<string>();
      let current = entry;
      while (current.sourceRef.memberOf) {
        if (visited.has(current.id)) {
          warnings.push(
            `Circular parent reference detected for symbol: ${entry.id} (hierarchy cycle: ${Array.from(visited).join(' → ')} → ${current.id})`
          );
          break;
        }
        visited.add(current.id);
        const parent = this.findById(current.sourceRef.memberOf);
        if (!parent) break;
        current = parent;
      }
    }

    // Check for circular dependency references (uses cycle)
    // This is common in real codebases (e.g., A imports B, B imports A)
    const depCycles = this.detectDependencyCycles();
    for (const cycle of depCycles) {
      warnings.push(`Circular dependency detected: ${cycle.join(' → ')}`);
    }

    // Check for invalid dependency references
    for (const entry of this.registry.entries) {
      if (entry.uses) {
        for (const dep of entry.uses) {
          if (!allIds.has(dep.targetId)) {
            warnings.push(
              `Symbol ${entry.id} has dependency to non-existent symbol: ${dep.targetId}`
            );
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEntries: number;
    idStats: ReturnType<IdGenerator['getStats']>;
    fileCount: number;
    tagCount: number;
    totalDependencies: number;
    orphanCount: number;
    duplicateQualifiedNames: number;
  } {
    const files = new Set(this.registry.entries.map((e) => e.sourceRef.filePath));
    const tags = new Set(this.registry.entries.flatMap((e) => e.tags || []));
    const totalDeps = this.registry.entries.reduce((sum, e) => sum + (e.uses?.length || 0), 0);

    return {
      totalEntries: this.registry.entries.length,
      idStats: this.idGenerator.getStats(),
      fileCount: files.size,
      tagCount: tags.size,
      totalDependencies: totalDeps,
      orphanCount: this.findOrphans().length,
      duplicateQualifiedNames: this.findDuplicateQualifiedNames().length,
    };
  }
}
