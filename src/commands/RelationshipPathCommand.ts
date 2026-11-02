/**
 * Optimized Relationship Path Command
 *
 * @doc [[RelationshipPathCommand]]
 * @doc [[RelationshipCommands]]
 * @packageDocumentation
 * @context Shortest-path and multi-hop relationship discovery via `tsdoc-edge relationship path`
 * @functionality Runs bounded BFS path search between source and target symbols across canonical `@ttsc/graph` and `.tsdoc.db`
 * @sideEffect console: Writes discovered relationship paths or `--json` output to stdout
 * @sideEffect database: Reads canonical `@ttsc/graph` and `DatabaseManager` SQLite repositories (read)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CanonicalAliasContext } from '../indexer';
import type { CanonicalGraphNode } from '../indexer/contracts';
import { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult } from './BaseCommand';
import { isExternalCanonicalNode, projectCanonicalEdgeToOntology } from './canonicalReadHelper';

/** A node in a relationship path */
interface PathNode {
  symbolId: string;
  relationshipType: string;
  category: string;
}

/** A path between two symbols through relationships */
interface SymbolPath {
  nodes: PathNode[];
  length: number;
  strength: number;
}

/** An edge in the relationship graph */
interface GraphEdge {
  to: string;
  type: string;
  category: string;
}

const CONTAINER_KINDS = new Set(['class', 'interface', 'enum', 'namespace', 'module', 'type']);

/**
 * Optimized command for finding paths between symbols across Canonical `@ttsc/graph` and Enrichment DB.
 *
 * @doc [[RelationshipPathCommand]]
 * @sideEffect console: Writes discovered symbol paths to stdout; reads SQLite repositories
 * @public
 */
export class RelationshipPathCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'relationship-path';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Find connection paths between two symbols';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge relationship path <from-symbol> <to-symbol> [options]

Finds paths connecting two symbols through Canonical @ttsc/graph and Enrichment relationships.

Options:
  --max-length <n>      Maximum path length in hops (default: 6)
  --limit <n>           Maximum number of paths to show (default: 10)
  --category <cat>      Filter by relationship category
  --shortest-only       Show only shortest paths
  --include-external    Include external/stdlib nodes from canonical graph
  --json                Output as JSON

Examples:
  tsdoc-edge relationship path SyncCommand GraphRepository
  tsdoc-edge relationship path BuildCommand DatabaseManager --shortest-only
  tsdoc-edge relationship path SyncCommand SpecGraphRepository --max-length 4 --json`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const flagError = this.validateAllowedFlags(
        args,
        ['--shortest-only', '--json', '--include-external'],
        ['--max-length', '--limit', '--category']
      );
      if (flagError) return flagError;

      const positionalArgs = this.getPositionalArgs(args, [
        '--max-length',
        '--limit',
        '--category',
      ]);

      if (positionalArgs.length < 2) {
        this.printError('Two symbol IDs required: <from-symbol> <to-symbol>');
        console.log();
        return this.displayHelp();
      }

      const fromSymbol = positionalArgs[0];
      const toSymbol = positionalArgs[1];

      const parsedMaxLen = Number.parseInt(this.getOption(args, '--max-length') || '6', 10);
      const parsedLimit = Number.parseInt(this.getOption(args, '--limit') || '10', 10);
      const options = {
        maxLength: Number.isFinite(parsedMaxLen) && parsedMaxLen > 0 ? parsedMaxLen : 6,
        limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10,
        category: this.getOption(args, '--category'),
        shortestOnly: this.hasFlag(args, '--shortest-only'),
        includeExternal: this.hasFlag(args, '--include-external'),
        json: this.hasFlag(args, '--json'),
      };

      if (!options.json) {
        this.printHeader(`Paths: ${fromSymbol} → ${toSymbol}`);
      }

      const dbPath = this.getDatabasePath();
      const hasLegacyDb = fs.existsSync(dbPath);
      let canonicalContext: CanonicalAliasContext | null = null;
      let dbManager: DatabaseManager | null = null;

      try {
        canonicalContext = CanonicalAliasContext.tryOpen(process.cwd());
        if (!hasLegacyDb && !canonicalContext) {
          const dbCheck = this.checkDatabaseExists();
          if (dbCheck) return dbCheck;
        }
        if (hasLegacyDb) {
          dbManager = new DatabaseManager(dbPath);
        }

        const legacyFrom = dbManager ? this.resolveSymbol(dbManager, fromSymbol) : null;
        const legacyTo = dbManager ? this.resolveSymbol(dbManager, toSymbol) : null;

        const canonicalFrom = canonicalContext
          ? this.resolveCanonicalEndpoint(
              canonicalContext,
              fromSymbol,
              legacyFrom?.id,
              options.includeExternal
            )
          : null;
        const canonicalTo = canonicalContext
          ? this.resolveCanonicalEndpoint(
              canonicalContext,
              toSymbol,
              legacyTo?.id,
              options.includeExternal
            )
          : null;

        const resolvedFromId = canonicalFrom?.id ?? legacyFrom?.id ?? null;
        const resolvedFromName = canonicalFrom?.name ?? legacyFrom?.symbol.name ?? fromSymbol;
        const resolvedToId = canonicalTo?.id ?? legacyTo?.id ?? null;
        const resolvedToName = canonicalTo?.name ?? legacyTo?.symbol.name ?? toSymbol;

        if (!resolvedFromId) {
          this.printError(`Source symbol not found: ${fromSymbol}`);
          return { message: 'Source symbol not found', exitCode: 1 };
        }

        if (!resolvedToId) {
          this.printError(`Target symbol not found: ${toSymbol}`);
          return { message: 'Target symbol not found', exitCode: 1 };
        }

        if (!options.json) {
          console.log();
          this.printInfo(
            `Building relationship graph (${canonicalContext ? 'canonical @ttsc/graph' : 'enrichment DB'})...`
          );
        }

        const startBuild = Date.now();
        const adjacency = this.buildAdjacencyList(
          dbManager,
          options.category,
          canonicalContext,
          options.includeExternal
        );
        const buildTime = Date.now() - startBuild;
        if (!options.json) {
          this.printInfo(`Graph built in ${buildTime}ms (${adjacency.size} active source nodes)`);
          console.log();
          this.printInfo(`Searching for paths (max length: ${options.maxLength})...`);
        }

        const startSearch = Date.now();
        const reverseAdjacency = this.buildReverseAdjacency(adjacency);
        const paths = this.findPathsBidirectional(
          adjacency,
          reverseAdjacency,
          resolvedFromId,
          resolvedToId,
          options.maxLength
        );
        const searchTime = Date.now() - startSearch;

        paths.sort((a, b) => {
          if (a.length !== b.length) return a.length - b.length;
          return b.strength - a.strength;
        });

        let displayPaths = paths;
        if (options.shortestOnly && paths.length > 0) {
          const shortestLength = paths[0].length;
          displayPaths = paths.filter((p) => p.length === shortestLength);
        }
        displayPaths = displayPaths.slice(0, options.limit);

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                source: canonicalContext ? 'canonical-graph' : 'enrichment-db',
                from: { query: fromSymbol, id: resolvedFromId, name: resolvedFromName },
                to: { query: toSymbol, id: resolvedToId, name: resolvedToName },
                totalPaths: paths.length,
                returned: displayPaths.length,
                paths: displayPaths.map((p) => ({
                  length: p.length,
                  strength: Number(p.strength.toFixed(4)),
                  nodes: p.nodes.map((n) => ({
                    symbolId: n.symbolId,
                    displayId: this.formatDisplayId(n.symbolId, canonicalContext),
                    ...(n.relationshipType ? { relationshipType: n.relationshipType } : {}),
                    ...(n.category ? { category: n.category } : {}),
                  })),
                })),
                stats: {
                  shortestLength: paths.length > 0 ? paths[0].length : 0,
                  longestLength: paths.length > 0 ? paths[paths.length - 1].length : 0,
                  buildTimeMs: buildTime,
                  searchTimeMs: searchTime,
                },
              },
              null,
              2
            )
          );
          return this.success(
            `Found ${paths.length} path(s) between ${resolvedFromName} and ${resolvedToName}`
          );
        }

        this.printInfo(`Search completed in ${searchTime}ms`);
        console.log();

        if (paths.length === 0) {
          this.printInfo('No paths found between these symbols');
          console.log();
          return this.success('Search complete');
        }

        this.printSection('Connection Paths');
        this.printInfo(`Found ${paths.length} path(s), showing ${displayPaths.length}`);
        console.log();

        for (let i = 0; i < displayPaths.length; i++) {
          const pathData = displayPaths[i];
          const strengthBar = '█'.repeat(Math.max(1, Math.round(pathData.strength * 10)));

          console.log(
            `  ${this.colors.bold}Path ${i + 1}${this.colors.reset} (length: ${pathData.length}, strength: ${strengthBar})`
          );
          console.log();

          for (let j = 0; j < pathData.nodes.length; j++) {
            const node = pathData.nodes[j];
            const displayLabel = this.formatDisplayId(node.symbolId, canonicalContext);

            if (j === 0) {
              console.log(`    ${this.colors.cyan}${displayLabel}${this.colors.reset}`);
            } else {
              const prevNode = pathData.nodes[j - 1];
              console.log(
                `      ${this.colors.dim}↓ ${prevNode.relationshipType} (${prevNode.category})${this.colors.reset}`
              );
              console.log(`    ${this.colors.cyan}${displayLabel}${this.colors.reset}`);
            }
          }
          console.log();
        }

        console.log();
        this.printSection('Path Statistics');

        const avgLength = paths.reduce((sum, p) => sum + p.length, 0) / paths.length;
        const shortestLength = paths[0].length;
        const longestLength = paths[paths.length - 1].length;

        console.log(`  Total paths found: ${this.colors.cyan}${paths.length}${this.colors.reset}`);
        console.log(
          `  Shortest path: ${this.colors.cyan}${shortestLength}${this.colors.reset} hops`
        );
        console.log(`  Longest path: ${this.colors.cyan}${longestLength}${this.colors.reset} hops`);
        console.log(
          `  Average length: ${this.colors.cyan}${avgLength.toFixed(1)}${this.colors.reset} hops`
        );
        console.log(`  Build time: ${this.colors.cyan}${buildTime}ms${this.colors.reset}`);
        console.log(`  Search time: ${this.colors.cyan}${searchTime}ms${this.colors.reset}`);
        console.log();

        const categoryCount = new Map<string, number>();
        for (const pathData of paths) {
          for (const node of pathData.nodes) {
            if (node.category) {
              categoryCount.set(node.category, (categoryCount.get(node.category) || 0) + 1);
            }
          }
        }

        if (categoryCount.size > 0) {
          console.log(`  ${this.colors.dim}Categories used:${this.colors.reset}`);
          for (const [category, count] of Array.from(categoryCount.entries()).sort(
            (a, b) => b[1] - a[1]
          )) {
            console.log(
              `    ${category}: ${this.colors.cyan}${count}${this.colors.reset} connections`
            );
          }
          console.log();
        }

        return this.success(
          `Found ${paths.length} path(s) between ${resolvedFromName} and ${resolvedToName}`
        );
      } finally {
        try {
          canonicalContext?.close();
        } finally {
          dbManager?.close();
        }
      }
    });
  }

  private resolveCanonicalEndpoint(
    context: CanonicalAliasContext,
    query: string,
    legacyId: string | undefined,
    includeExternal: boolean
  ): { id: string; name: string } | null {
    if (legacyId) {
      const aliased = context.resolveCanonicalId(legacyId);
      if (aliased) {
        const node = context.analysis.index.getNode(aliased);
        if (node && (includeExternal || !isExternalCanonicalNode(node))) {
          return { id: node.id, name: node.qualifiedName ?? node.name ?? node.id };
        }
      }
    }

    const direct = context.resolveCanonicalId(query);
    if (direct) {
      const node = context.analysis.index.getNode(direct);
      if (node && (includeExternal || !isExternalCanonicalNode(node))) {
        return { id: node.id, name: node.qualifiedName ?? node.name ?? node.id };
      }
    }

    const candidates = context.graph.nodes.filter(
      (node) => includeExternal || !isExternalCanonicalNode(node)
    );
    const exactMatches = candidates.filter(
      (node) => node.id === query || node.qualifiedName === query || node.name === query
    );
    if (exactMatches.length > 0) {
      const best = this.pickBestCanonicalCandidate(exactMatches);
      return { id: best.id, name: best.qualifiedName ?? best.name ?? best.id };
    }

    const lower = query.toLowerCase();
    const caseMatches = candidates.filter(
      (node) =>
        (node.qualifiedName ?? '').toLowerCase() === lower ||
        (node.name ?? '').toLowerCase() === lower
    );
    if (caseMatches.length > 0) {
      const best = this.pickBestCanonicalCandidate(caseMatches);
      return { id: best.id, name: best.qualifiedName ?? best.name ?? best.id };
    }

    return null;
  }

  private pickBestCanonicalCandidate(nodes: readonly CanonicalGraphNode[]): CanonicalGraphNode {
    const kindRank = (kind: string): number => {
      switch (kind) {
        case 'class':
          return 0;
        case 'interface':
          return 1;
        case 'function':
          return 2;
        case 'type':
          return 3;
        case 'enum':
          return 4;
        case 'variable':
          return 5;
        case 'method':
          return 6;
        default:
          return 7;
      }
    };

    return [...nodes].sort((left, right) => {
      const leftExport = left.exported ? 0 : 1;
      const rightExport = right.exported ? 0 : 1;
      if (leftExport !== rightExport) return leftExport - rightExport;
      const leftRank = kindRank(left.kind);
      const rightRank = kindRank(right.kind);
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.id.localeCompare(right.id);
    })[0];
  }

  private formatDisplayId(symbolId: string, context: CanonicalAliasContext | null): string {
    if (!context) return symbolId;
    const node = context.analysis.index.getNode(symbolId);
    if (!node) return symbolId;
    const rawFile = node.file ?? node.evidence?.file;
    const relFile = rawFile
      ? path.isAbsolute(rawFile)
        ? path.relative(context.graph.rootDir, rawFile)
        : rawFile
      : '';
    const symbolLabel = node.qualifiedName ?? node.name ?? node.id;
    return relFile ? `${relFile}#${symbolLabel}:${node.kind}` : `${symbolLabel}:${node.kind}`;
  }

  /**
   * Build forward adjacency list from Canonical `@ttsc/graph` and Enrichment DB.
   */
  private buildAdjacencyList(
    dbManager: DatabaseManager | null,
    category?: string,
    canonicalContext?: CanonicalAliasContext | null,
    includeExternal = false
  ): Map<string, GraphEdge[]> {
    const adjacency = new Map<string, GraphEdge[]>();
    const addEdge = (from: string, to: string, type: string, edgeCategory: string): void => {
      if (!from || !to || from === to) return;
      let list = adjacency.get(from);
      if (!list) {
        list = [];
        adjacency.set(from, list);
      }
      list.push({ to, type, category: edgeCategory });
    };

    if (canonicalContext) {
      const allowedNodes = canonicalContext.graph.nodes.filter(
        (node) => includeExternal || !isExternalCanonicalNode(node)
      );
      const allowedSet = new Set(allowedNodes.map((n) => n.id));

      for (const edge of canonicalContext.graph.edges) {
        if (!allowedSet.has(edge.from) || !allowedSet.has(edge.to)) {
          continue;
        }
        const projected = projectCanonicalEdgeToOntology(edge);
        if (category && projected.category !== category) {
          continue;
        }
        addEdge(edge.from, edge.to, projected.rawKind, projected.category);
      }

      // Bridge container symbols (Class/Interface) with their own member methods/fields in the same file
      if (!category || category === 'structural') {
        const containersByFile = new Map<string, CanonicalGraphNode[]>();
        for (const node of allowedNodes) {
          const fileKey = node.file ?? node.evidence?.file;
          if (!fileKey || !CONTAINER_KINDS.has(node.kind)) continue;
          let list = containersByFile.get(fileKey);
          if (!list) {
            list = [];
            containersByFile.set(fileKey, list);
          }
          list.push(node);
        }

        for (const node of allowedNodes) {
          const fileKey = node.file ?? node.evidence?.file;
          const qName = node.qualifiedName;
          if (!fileKey || !qName || !qName.includes('.')) continue;
          const containers = containersByFile.get(fileKey);
          if (!containers) continue;
          for (const container of containers) {
            const containerName = container.qualifiedName ?? container.name;
            if (containerName && qName.startsWith(`${containerName}.`)) {
              addEdge(container.id, node.id, 'has-member', 'structural');
              addEdge(node.id, container.id, 'member-of', 'structural');
            }
          }
        }
      }
    }

    if (dbManager) {
      let relationships = dbManager.getAllUnifiedRelationships();
      if (canonicalContext) {
        relationships = relationships.filter((r) => r.category !== 'structural');
      }
      if (category) {
        relationships = relationships.filter((r) => r.category === category);
      }

      for (const rel of relationships) {
        const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
        const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];

        for (const rawFrom of fromSymbols) {
          if (!rawFrom) continue;
          const from = canonicalContext?.resolver.legacyToCanonical(rawFrom) ?? rawFrom;
          for (const rawTo of toSymbols) {
            if (!rawTo) continue;
            const to = canonicalContext?.resolver.legacyToCanonical(rawTo) ?? rawTo;
            addEdge(from, to, rel.type, rel.category);
          }
        }
      }
    }

    return adjacency;
  }

  /**
   * Build reverse adjacency list for backward search
   */
  private buildReverseAdjacency(forward: Map<string, GraphEdge[]>): Map<string, GraphEdge[]> {
    const reverse = new Map<string, GraphEdge[]>();

    for (const [from, edges] of forward.entries()) {
      for (const edge of edges) {
        if (!reverse.has(edge.to)) {
          reverse.set(edge.to, []);
        }

        reverse.get(edge.to)?.push({
          to: from,
          type: edge.type,
          category: edge.category,
        });
      }
    }

    return reverse;
  }

  /**
   * Find paths using memory-efficient BFS
   */
  private findPathsBidirectional(
    forward: Map<string, GraphEdge[]>,
    _reverse: Map<string, GraphEdge[]>,
    fromSymbol: string,
    toSymbol: string,
    maxLength: number
  ): SymbolPath[] {
    const allPaths: SymbolPath[] = [];
    const maxPaths = 100;

    if (!forward.has(fromSymbol) && fromSymbol !== toSymbol) {
      return [];
    }

    const queue: Array<{
      symbolId: string;
      path: PathNode[];
      visited: Set<string>;
    }> = [
      {
        symbolId: fromSymbol,
        path: [{ symbolId: fromSymbol, relationshipType: '', category: '' }],
        visited: new Set([fromSymbol]),
      },
    ];

    let iterations = 0;
    const maxIterations = 50000;

    while (queue.length > 0 && iterations < maxIterations && allPaths.length < maxPaths) {
      iterations++;

      const current = queue.shift();
      if (!current) break;
      const { symbolId, path: currentPath, visited } = current;

      if (symbolId === toSymbol && currentPath.length > 1) {
        const strength = this.calculatePathStrength(currentPath);
        allPaths.push({
          nodes: currentPath,
          length: currentPath.length - 1,
          strength,
        });
        continue;
      }

      if (currentPath.length > maxLength) continue;

      const neighbors = forward.get(symbolId);
      if (!neighbors) continue;

      for (const edge of neighbors) {
        if (visited.has(edge.to) && edge.to !== toSymbol) continue;

        const newPath = [
          ...currentPath.slice(0, -1),
          {
            symbolId: currentPath[currentPath.length - 1].symbolId,
            relationshipType: edge.type,
            category: edge.category,
          },
          {
            symbolId: edge.to,
            relationshipType: '',
            category: '',
          },
        ];

        const newVisited = new Set(visited);
        newVisited.add(edge.to);

        queue.push({
          symbolId: edge.to,
          path: newPath,
          visited: newVisited,
        });
      }
    }

    const uniquePaths = new Map<string, SymbolPath>();
    for (const pathData of allPaths) {
      const key = pathData.nodes.map((n) => n.symbolId).join('→');
      const existing = uniquePaths.get(key);
      if (!existing || existing.strength < pathData.strength) {
        uniquePaths.set(key, pathData);
      }
    }

    return Array.from(uniquePaths.values());
  }

  private calculatePathStrength(pathNodes: PathNode[]): number {
    if (pathNodes.length <= 1) return 1.0;
    return 1.0 / pathNodes.length;
  }

  private get colors() {
    return {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      red: '\x1b[31m',
    };
  }
}
