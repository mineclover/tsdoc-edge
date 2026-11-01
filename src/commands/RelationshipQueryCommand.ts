/**
 * Relationship Query Command
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import { type GraphNeighbor, graphEdgeSemantic } from '../graph-analysis';
import { CanonicalAliasContext } from '../indexer';
import { DatabaseManager, type UnifiedRelationshipRow } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult } from './BaseCommand';

interface CanonicalRelationshipCandidate {
  readonly nodeId: string;
  readonly direction: 'from' | 'to';
  readonly rawKind: string;
  readonly type: string;
  readonly category: string;
}

/**
 * Command for querying symbol relationships across Canonical `@ttsc/graph` and Enrichment DB.
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
  --type <type>         Filter by relationship type or canonical edge kind (e.g. calls, type_ref)
  --category <category> Filter by category (e.g. behavioral, structural, type-system, testing)
  --direction <dir>     Filter by direction: from, to, both (default: both)
  --limit <n>           Limit results (default: 50)
  --include-external    Include external/stdlib nodes from canonical graph
  --human               Human-readable output (default)
  --json                JSON output
  --xml                 XML output

Examples:
  tsdoc-edge relationship-query readTsdocComment
  tsdoc-edge relationship-query GraphRepository --category behavioral
  tsdoc-edge relationship-query BuildCommand --type calls --limit 20
  tsdoc-edge relationship-query BuildCommand --direction to --json`;
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
        ['--human', '--json', '--xml', '--include-external'],
        ['--type', '--category', '--direction', '--limit']
      );
      if (flagError) return flagError;

      const positionalArgs = this.getPositionalArgs(args, [
        '--type',
        '--category',
        '--direction',
        '--limit',
      ]);
      if (positionalArgs.length === 0) {
        this.printError('Symbol ID required');
        console.log();
        return this.displayHelp();
      }

      const requestedSymbol = positionalArgs[0];
      let symbolId = requestedSymbol;

      const directionOpt = this.getOption(args, '--direction') || 'both';
      if (!['from', 'to', 'both'].includes(directionOpt)) {
        this.printError(`Invalid direction '${directionOpt}'. Expected from, to, or both.`);
        return this.failure('Invalid direction');
      }

      const parsedLimit = Number.parseInt(this.getOption(args, '--limit') || '50', 10);
      const options = {
        type: this.getOption(args, '--type'),
        category: this.getOption(args, '--category'),
        direction: directionOpt,
        limit: Number.isFinite(parsedLimit) && parsedLimit >= 0 ? parsedLimit : 50,
        includeExternal: this.hasFlag(args, '--include-external'),
      };
      const isJson = this.hasFlag(args, '--json');
      const isXml = this.hasFlag(args, '--xml');

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

        if (dbManager) {
          const resolved = this.resolveSymbol(dbManager, symbolId);
          if (resolved) {
            symbolId = resolved.id;
          }
        }

        const canonicalId = canonicalContext
          ? this.resolveCanonicalId(canonicalContext, requestedSymbol, symbolId)
          : null;
        const canonicalCandidates =
          canonicalId && canonicalContext
            ? this.getCanonicalCandidates(canonicalContext, canonicalId, options)
            : [];
        const canonicalTotalFound = canonicalCandidates.length;

        let rels = dbManager ? dbManager.getUnifiedRelationshipsBySymbol(symbolId) : [];

        // Skip duplicate legacy structural edges when canonical @ttsc/graph resolved the symbol
        if (canonicalId) {
          rels = rels.filter((r) => r.category !== 'structural');
        }

        if (options.type) {
          rels = rels.filter((r) => r.type === options.type);
        }
        if (options.category) {
          rels = rels.filter((r) => r.category === options.category);
        }

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

        // Prioritize canonical @ttsc/graph edges first, then enrichment relationships within shared limit
        const canonicalReturned = canonicalCandidates.slice(0, limit);
        const remainingLimit = Math.max(0, limit - canonicalReturned.length);
        rels = rels.slice(0, remainingLimit);

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
          properties: JSON.stringify(r.properties),
          created_at: r.createdAt,
          updated_at: r.updatedAt,
          description: r.description ?? null,
        })) as UnifiedRelationshipRow[];

        const totalFound = legacyTotalFound + canonicalTotalFound;
        const returned = relationships.length + canonicalReturned.length;
        const xmlArgs = args.filter((arg) => arg !== '--human');

        if (totalFound === 0) {
          if (isJson) {
            console.log(
              JSON.stringify(
                {
                  query: {
                    symbolId,
                    ...(canonicalId ? { canonicalId } : {}),
                    type: options.type || 'all',
                    category: options.category || 'all',
                    direction: options.direction,
                    limit: options.limit,
                  },
                  results: {
                    totalFound: 0,
                    returned: 0,
                  },
                  canonicalRelationships: [],
                  enrichmentRelationships: [],
                  message: 'No relationships found',
                },
                null,
                2
              )
            );
          } else if (isXml) {
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
              xmlArgs
            );
          } else {
            this.printHeader(`Relationships for: ${symbolId}`);
            this.printInfo('No relationships found');
            console.log();
          }
          return this.success('Query complete');
        }

        const byCategory = new Map<string, UnifiedRelationshipRow[]>();
        for (const rel of relationships) {
          if (!byCategory.has(rel.category)) {
            byCategory.set(rel.category, []);
          }
          byCategory.get(rel.category)?.push(rel);
        }

        const byType = new Map<string, number>();
        for (const candidate of canonicalReturned) {
          byType.set(candidate.rawKind, (byType.get(candidate.rawKind) || 0) + 1);
        }
        for (const rel of relationships) {
          byType.set(rel.type, (byType.get(rel.type) || 0) + 1);
        }

        const parseSymbolList = (raw: string): string[] => {
          const parsed: unknown = JSON.parse(raw);
          const list: readonly unknown[] = Array.isArray(parsed) ? parsed : [];
          return list.filter((item): item is string => typeof item === 'string');
        };

        if (isJson) {
          console.log(
            JSON.stringify(
              {
                query: {
                  symbolId,
                  ...(canonicalId ? { canonicalId } : {}),
                  type: options.type || 'all',
                  category: options.category || 'all',
                  direction: options.direction,
                  limit: options.limit,
                },
                results: {
                  totalFound,
                  returned,
                  canonicalFound: canonicalTotalFound,
                  canonicalReturned: canonicalReturned.length,
                  enrichmentFound: legacyTotalFound,
                  enrichmentReturned: relationships.length,
                },
                canonicalRelationships: canonicalReturned,
                enrichmentRelationships: relationships.map((rel) => ({
                  id: rel.id,
                  type: rel.type,
                  category: rel.category,
                  from: parseSymbolList(rel.from_symbols),
                  to: parseSymbolList(rel.to_symbols),
                  direction: rel.direction,
                  strength: rel.strength,
                  confidence: rel.confidence,
                  description: rel.description || undefined,
                })),
                statistics: {
                  byType: Object.fromEntries(
                    Array.from(byType.entries()).sort((a, b) => b[1] - a[1])
                  ),
                },
              },
              null,
              2
            )
          );
        } else if (isXml) {
          const categoriesData: Record<string, Array<Record<string, unknown>>> = {};

          for (const [category, catRels] of byCategory.entries()) {
            categoriesData[category] = catRels.map((rel) => {
              const fromSymbols = parseSymbolList(rel.from_symbols);
              const toSymbols = parseSymbolList(rel.to_symbols);

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
            xmlArgs
          );
        } else {
          this.printHeader(`Relationships for: ${requestedSymbol}`);
          if (canonicalId) {
            console.log(`  ${this.colors.dim}Canonical ID: ${canonicalId}${this.colors.reset}`);
          }
          console.log();

          this.printSection('Query Results');
          this.printInfo(
            returned === totalFound
              ? `Found ${returned} relationships`
              : `Found ${totalFound} relationships; returning ${returned}`
          );
          console.log();

          if (canonicalReturned.length > 0) {
            const deps = canonicalReturned.filter((c) => c.direction === 'from');
            const dependents = canonicalReturned.filter((c) => c.direction === 'to');

            console.log(
              `  ${this.colors.bold}Canonical @ttsc/graph${this.colors.reset} (${canonicalReturned.length}/${canonicalTotalFound})`
            );
            if (deps.length > 0) {
              console.log(`    ${this.colors.cyan}Dependencies (→):${this.colors.reset}`);
              for (const dep of deps) {
                console.log(
                  `      → ${dep.nodeId} ${this.colors.yellow}[${dep.rawKind}]${this.colors.reset} ${this.colors.dim}(${dep.category})${this.colors.reset}`
                );
              }
            }
            if (dependents.length > 0) {
              console.log(`    ${this.colors.cyan}Dependents (←):${this.colors.reset}`);
              for (const dep of dependents) {
                console.log(
                  `      ← ${dep.nodeId} ${this.colors.yellow}[${dep.rawKind}]${this.colors.reset} ${this.colors.dim}(${dep.category})${this.colors.reset}`
                );
              }
            }
            console.log();
          }

          for (const [category, catRels] of byCategory.entries()) {
            console.log(`  ${this.colors.bold}${category}${this.colors.reset} (${catRels.length})`);
            console.log();

            for (const rel of catRels) {
              const fromSymbols = parseSymbolList(rel.from_symbols);
              const toSymbols = parseSymbolList(rel.to_symbols);
              const directionSymbol =
                rel.direction === 'unidirectional'
                  ? '→'
                  : rel.direction === 'bidirectional'
                    ? '↔'
                    : '—';

              console.log(`    ${this.colors.cyan}${rel.type}${this.colors.reset}`);
              console.log(
                `    ${fromSymbols.join(', ')} ${directionSymbol} ${toSymbols.join(', ')}`
              );
              if (rel.description) {
                console.log(`    ${this.colors.dim}${rel.description}${this.colors.reset}`);
              }
              console.log(
                `    ${this.colors.dim}Strength: ${rel.strength}, Confidence: ${rel.confidence}${this.colors.reset}`
              );
              console.log();
            }
          }

          this.printSection('Statistics');
          console.log(`  ${this.colors.dim}Relationships by type:${this.colors.reset}`);
          for (const [type, count] of Array.from(byType.entries()).sort((a, b) => b[1] - a[1])) {
            console.log(`    ${type}: ${this.colors.cyan}${count}${this.colors.reset}`);
          }
          console.log();
        }

        return this.success(
          `Found ${totalFound} relationships; returned ${returned} for ${symbolId}`
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
      if (typeof context.analysis.resolveSymbol === 'function') {
        const resolution = context.analysis.resolveSymbol(query);
        if (resolution.status === 'found') return resolution.node.id;
      }
    }
    return null;
  }

  private getCanonicalCandidates(
    context: CanonicalAliasContext,
    canonicalId: string,
    options: { type?: string; category?: string; direction: string; includeExternal: boolean }
  ): CanonicalRelationshipCandidate[] {
    const externalMode = options.includeExternal ? 'include' : 'exclude';
    const candidates: CanonicalRelationshipCandidate[] = [];
    if (options.direction !== 'to') {
      candidates.push(
        ...context.analysis
          .dependencies(canonicalId, { external: externalMode })
          .flatMap((neighbor) => this.toCanonicalCandidate(neighbor, 'from'))
      );
    }
    if (options.direction !== 'from') {
      candidates.push(
        ...context.analysis
          .dependents(canonicalId, { external: externalMode })
          .flatMap((neighbor) => this.toCanonicalCandidate(neighbor, 'to'))
      );
    }

    return candidates.filter(
      (candidate) =>
        (!options.type || candidate.type === options.type || candidate.rawKind === options.type) &&
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
        rawKind: neighbor.edge.kind,
        type: semantic.relationshipType,
        category: semantic.relationshipCategory,
      },
    ];
  }
}
