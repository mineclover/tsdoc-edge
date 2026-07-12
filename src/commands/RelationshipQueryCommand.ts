/**
 * Relationship Query Command
 * @packageDocumentation
 */

import { type GraphNeighbor, graphEdgeSemantic } from '../graph-analysis';
import { CanonicalAliasContext } from '../indexer';
import { DatabaseManager, type UnifiedRelationshipRow } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult } from './BaseCommand';

interface CanonicalRelationshipCandidate {
  readonly nodeId: string;
  readonly direction: 'from' | 'to';
  readonly type: string;
  readonly category: string;
}

/**
 * Command for querying symbol relationships
 * @doc [[RelationshipQueryCommand]]
 * @public
 */
export class RelationshipQueryCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'relationship-query';
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'Query relationships for a specific symbol';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge relationship-query <symbol-id> [options]

Options:
  --type <type>         Filter by relationship type
  --category <category> Filter by category
  --direction <dir>     Filter by direction: from, to, both (default: both)
  --limit <n>           Limit results (default: 50)

Examples:
  tsdoc-edge relationship-query build-command
  tsdoc-edge relationship-query build-command --category behavioral
  tsdoc-edge relationship-query build-command --type collaboration
  tsdoc-edge relationship-query build-command --direction from`;
  }

  /**
   * execute method
   * @param args - args parameter
   * @returns Returns Promise<CommandResult>
   * @public
   */
  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      // Check for help flag
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      // Filter out flags to get positional arguments
      const positionalArgs = args.filter((arg) => !arg.startsWith('--'));
      if (positionalArgs.length === 0) {
        this.printError('Symbol ID required');
        console.log();
        return this.displayHelp();
      }

      const requestedSymbol = positionalArgs[0];
      let symbolId = requestedSymbol;

      // Parse options
      const options = {
        type: this.getOption(args, '--type'),
        category: this.getOption(args, '--category'),
        direction: this.getOption(args, '--direction') || 'both',
        limit: Number.parseInt(this.getOption(args, '--limit') || '50', 10),
      };

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);
      let canonicalContext: CanonicalAliasContext | null = null;
      try {
        canonicalContext = CanonicalAliasContext.tryOpen(process.cwd());

        // Resolve symbol name to ID if needed
        const resolved = this.resolveSymbol(dbManager, symbolId);
        if (resolved) {
          symbolId = resolved.id;
        }
        const canonicalId = canonicalContext
          ? this.resolveCanonicalId(canonicalContext, requestedSymbol, symbolId)
          : null;
        const canonicalCandidates =
          canonicalId && canonicalContext
            ? this.getCanonicalCandidates(canonicalContext, canonicalId, options)
            : [];
        const canonicalTotalFound = canonicalCandidates.length;

        // Use Drizzle ORM to query relationships
        let rels = dbManager.getUnifiedRelationshipsBySymbol(symbolId);

        // Apply filters
        if (options.type) {
          rels = rels.filter((r) => r.type === options.type);
        }
        if (options.category) {
          rels = rels.filter((r) => r.category === options.category);
        }

        // Filter by direction before applying the shared result limit.
        rels = rels.filter((rel) => {
          const fromSymbols = Array.isArray(rel.from) ? rel.from : [rel.from];
          const toSymbols = Array.isArray(rel.to) ? rel.to : [rel.to];
          const isFrom = fromSymbols.includes(symbolId);
          const isTo = toSymbols.includes(symbolId);

          if (options.direction === 'from') return isFrom;
          if (options.direction === 'to') return isTo;
          return isFrom || isTo;
        });

        const legacyTotalFound = rels.length;
        const limit = Math.max(0, options.limit);
        rels = rels.slice(0, limit);
        const canonicalReturned = canonicalCandidates.slice(0, Math.max(0, limit - rels.length));
        const canonicalStructural =
          canonicalId && canonicalTotalFound > 0
            ? {
                canonicalId,
                dependencies: canonicalReturned
                  .filter((candidate) => candidate.direction === 'from')
                  .map((candidate) => candidate.nodeId),
                dependents: canonicalReturned
                  .filter((candidate) => candidate.direction === 'to')
                  .map((candidate) => candidate.nodeId),
                totalFound: canonicalTotalFound,
                returned: canonicalReturned.length,
              }
            : null;

        // Convert to row format for compatibility
        const relationships = rels.map((r) => ({
          id: r.id,
          type: r.type,
          category: r.category,
          from_symbols: JSON.stringify(Array.isArray(r.from) ? r.from : [r.from]),
          to_symbols: JSON.stringify(Array.isArray(r.to) ? r.to : [r.to]),
          direction: r.direction,
          strength: r.strength,
          evidence: JSON.stringify(r.evidence),
          discovered_by: r.discoveredBy,
          confidence: r.confidence,
          file_path: r.filePath ?? null,
          line: r.line ?? null,
          properties: r.properties ? JSON.stringify(r.properties) : null,
          created_at: r.createdAt,
          updated_at: r.updatedAt,
          description: r.description ?? null,
        })) as UnifiedRelationshipRow[];

        const totalFound = legacyTotalFound + canonicalTotalFound;
        const returned = relationships.length + canonicalReturned.length;

        if (totalFound === 0) {
          if (this.hasFlag(args, '--human')) {
            this.printHeader(`Relationships for: ${symbolId}`);
            this.printInfo('No relationships found');
            console.log();
          } else {
            this.printOutput(
              'relationship-query',
              {
                query: {
                  symbolId,
                  type: options.type || 'all',
                  category: options.category || 'all',
                  direction: options.direction,
                  limit: options.limit,
                },
                results: {
                  totalFound: 0,
                  returned: 0,
                },
                message: {
                  text: 'No relationships found',
                },
              },
              args
            );
          }
          return this.success('Query complete');
        }

        // Group by category
        const byCategory = new Map<string, UnifiedRelationshipRow[]>();
        for (const rel of relationships) {
          if (!byCategory.has(rel.category)) {
            byCategory.set(rel.category, []);
          }
          byCategory.get(rel.category)?.push(rel);
        }

        // Build statistics by type
        const byType = new Map<string, number>();
        for (const rel of relationships) {
          byType.set(rel.type, (byType.get(rel.type) || 0) + 1);
        }

        if (this.hasFlag(args, '--human')) {
          // Original color output
          this.printHeader(`Relationships for: ${symbolId}`);

          // Display results
          console.log();
          this.printSection('Query Results');
          this.printInfo(
            returned === totalFound
              ? `Found ${returned} relationships`
              : `Found ${totalFound} relationships; returning ${returned}`
          );
          console.log();

          for (const [category, rels] of byCategory.entries()) {
            console.log(`  ${this.colors.bold}${category}${this.colors.reset} (${rels.length})`);
            console.log();

            for (const rel of rels) {
              const fromSymbols = JSON.parse(rel.from_symbols);
              const toSymbols = JSON.parse(rel.to_symbols);

              const directionSymbol =
                rel.direction === 'unidirectional'
                  ? '→'
                  : rel.direction === 'bidirectional'
                    ? '↔'
                    : '—';

              const fromDisplay = fromSymbols.join(', ');
              const toDisplay = toSymbols.join(', ');

              console.log(`    ${this.colors.cyan}${rel.type}${this.colors.reset}`);
              console.log(`    ${fromDisplay} ${directionSymbol} ${toDisplay}`);
              console.log(
                `    ${this.colors.dim}${rel.description || 'No description'}${this.colors.reset}`
              );
              console.log(
                `    ${this.colors.dim}Strength: ${rel.strength}, Confidence: ${rel.confidence}${this.colors.reset}`
              );
              console.log();
            }
          }

          // Statistics
          console.log();
          this.printSection('Statistics');

          console.log(`  ${this.colors.dim}Relationships by type:${this.colors.reset}`);
          for (const [type, count] of Array.from(byType.entries()).sort((a, b) => b[1] - a[1])) {
            console.log(`    ${type}: ${this.colors.cyan}${count}${this.colors.reset}`);
          }

          if (canonicalStructural) {
            console.log();
            this.printSection('Canonical Structural Graph');
            console.log(`  ${canonicalStructural.canonicalId}`);
            console.log(
              `  Dependencies: ${canonicalStructural.dependencies.length}, Dependents: ${canonicalStructural.dependents.length}`
            );
            console.log(
              `  Returned: ${canonicalStructural.returned}/${canonicalStructural.totalFound}`
            );
          }

          console.log();
        } else {
          // XML output
          const categoriesData: Record<string, Array<Record<string, unknown>>> = {};

          for (const [category, rels] of byCategory.entries()) {
            categoriesData[category] = rels.map((rel) => {
              const fromSymbols = JSON.parse(rel.from_symbols);
              const toSymbols = JSON.parse(rel.to_symbols);

              return {
                id: rel.id,
                type: rel.type,
                from: fromSymbols.join(', '),
                to: toSymbols.join(', '),
                direction: rel.direction,
                strength: rel.strength,
                confidence: rel.confidence,
                description: rel.description || 'No description',
                discoveredBy: rel.discovered_by,
                filePath: rel.file_path || '',
                line: rel.line || '',
              };
            });
          }

          this.printOutput(
            'relationship-query',
            {
              query: {
                symbolId,
                type: options.type || 'all',
                category: options.category || 'all',
                direction: options.direction,
                limit: options.limit,
              },
              results: {
                totalFound,
                returned,
                legacyFound: legacyTotalFound,
                legacyReturned: relationships.length,
                canonicalFound: canonicalTotalFound,
                canonicalReturned: canonicalReturned.length,
              },
              categories: categoriesData,
              statistics: {
                byType: Array.from(byType.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => ({ type, count })),
              },
              ...(canonicalStructural ? { canonicalStructural } : {}),
            },
            args
          );
        }

        return this.success(
          `Found ${totalFound} relationships; returned ${returned} for ${symbolId}`
        );
      } finally {
        try {
          canonicalContext?.close();
        } finally {
          dbManager.close();
        }
      }
    });
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

  private resolveCanonicalId(
    context: CanonicalAliasContext,
    requestedSymbol: string,
    legacySymbolId: string
  ): string | null {
    const aliased = context.resolveCanonicalId(legacySymbolId);
    if (aliased) return aliased;

    for (const query of new Set([requestedSymbol, legacySymbolId])) {
      const resolution = context.analysis.resolveSymbol(query);
      if (resolution.status === 'found') return resolution.node.id;
    }
    return null;
  }

  private getCanonicalCandidates(
    context: CanonicalAliasContext,
    canonicalId: string,
    options: { type?: string; category?: string; direction: string }
  ): CanonicalRelationshipCandidate[] {
    const candidates: CanonicalRelationshipCandidate[] = [];
    if (options.direction !== 'to') {
      candidates.push(
        ...context.analysis
          .dependencies(canonicalId, { external: 'exclude' })
          .flatMap((neighbor) => this.toCanonicalCandidate(neighbor, 'from'))
      );
    }
    if (options.direction !== 'from') {
      candidates.push(
        ...context.analysis
          .dependents(canonicalId, { external: 'exclude' })
          .flatMap((neighbor) => this.toCanonicalCandidate(neighbor, 'to'))
      );
    }

    return candidates.filter(
      (candidate) =>
        (!options.type || candidate.type === options.type) &&
        (!options.category || candidate.category === options.category)
    );
  }

  private toCanonicalCandidate(
    neighbor: GraphNeighbor,
    direction: 'from' | 'to'
  ): CanonicalRelationshipCandidate[] {
    const semantic = graphEdgeSemantic(neighbor.edge.kind);
    if (!semantic.relationshipType || !semantic.relationshipCategory) return [];
    return [
      {
        nodeId: neighbor.node.id,
        direction,
        type: semantic.relationshipType,
        category: semantic.relationshipCategory,
      },
    ];
  }
}
