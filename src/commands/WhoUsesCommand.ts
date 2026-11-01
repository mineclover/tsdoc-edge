/**
 * Who-uses query against the canonical graph with a legacy fallback.
 *
 * @packageDocumentation
 * @doc [[WhoUsesCommand]]
 * @context Reverse dependency lookup invoked via `tsdoc-edge symbol who-uses`
 * @functionality Resolves incoming dependents from the active canonical `@ttsc/graph` revision with fallback to `.tsdoc.db`
 * @sideEffect console: Writes reverse-dependency results in human, `--json`, or `--xml` formats to stdout
 * @sideEffect database: Reads `GraphRepository` and `DatabaseManager` SQLite repositories (read)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CanonicalGraphNode } from '../indexer/contracts';
import { WhoUsesSchema } from '../output/schemas';
import { XmlBuilder } from '../output/XmlBuilder';
import { DatabaseManager } from '../storage/DatabaseManager';
import { GraphRepository } from '../storage/GraphRepository';
import { BaseCommand, type CommandResult } from './BaseCommand';

/**
 * Query reverse or outgoing symbol relationships.
 * @public
 * @doc [[WhoUsesCommand]]
 * @sideEffect console: Writes reverse dependency output to stdout; reads canonical graph and symbol SQLite repositories
 */
export class WhoUsesCommand extends BaseCommand {
  private dbManager?: DatabaseManager;
  constructor(dbManager?: DatabaseManager) {
    super();
    this.dbManager = dbManager;
  }
  /** @returns Command name */
  getName(): string {
    return 'who-uses';
  }
  /** @returns Command description */
  getDescription(): string {
    return 'Show what depends on a symbol (B ← A)';
  }
  protected getUsage(): string {
    return 'tsdoc-edge who-uses <symbol-name> [--json|--xml] [--include-external]';
  }

  /**
   * @param args - Command arguments
   * @returns Command result
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      if (this.hasHelpFlag(args)) return this.displayHelp();
      const invalid = this.validateAllowedFlags(args, ['--json', '--xml', '--include-external']);
      if (invalid) return invalid;
      const query = args.find((arg) => !arg.startsWith('-'));
      if (!query) return this.failure('Symbol name required');
      const options = {
        json: this.hasFlag(args, '--json'),
        xml: this.hasFlag(args, '--xml'),
        includeExternal: this.hasFlag(args, '--include-external'),
      };
      const canonical = this.openCanonical();
      if (canonical) {
        try {
          const nodes = new Map(canonical.revision.graph.nodes.map((item) => [item.id, item]));
          const node = this.resolveSymbolNode(
            canonical.revision.graph.nodes,
            query,
            canonical.revision.aliases
          );
          if (node) {
            const dependents = canonical.revision.graph.edges
              .filter((edge) => edge.to === node.id)
              .map((edge) => ({ edge, node: nodes.get(edge.from) }))
              .filter(
                (
                  item
                ): item is {
                  edge: (typeof canonical.revision.graph.edges)[number];
                  node: CanonicalGraphNode;
                } => Boolean(item.node)
              )
              .filter((item) => options.includeExternal || !this.isExternal(item.node));
            return this.printResult({ source: node, dependents }, options);
          }

          const normalizedFile = this.normalizeFileQuery(query);
          const fileNodes = canonical.revision.graph.nodes.filter(
            (item) => item.file === normalizedFile
          );
          if (fileNodes.length > 0) {
            const fileNodeIds = new Set(fileNodes.map((item) => item.id));
            const seen = new Set<string>();
            const dependents = canonical.revision.graph.edges
              .filter((edge) => fileNodeIds.has(edge.to) && !fileNodeIds.has(edge.from))
              .map((edge) => ({ edge, node: nodes.get(edge.from) }))
              .filter(
                (
                  item
                ): item is {
                  edge: (typeof canonical.revision.graph.edges)[number];
                  node: CanonicalGraphNode;
                } => Boolean(item.node)
              )
              .filter((item) => options.includeExternal || !this.isExternal(item.node))
              .filter((item) => {
                const key = `${item.node.id}:${item.edge.kind}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
            const moduleNode: CanonicalGraphNode = {
              id: normalizedFile,
              sourceId: normalizedFile,
              name: normalizedFile,
              kind: 'module',
              file: normalizedFile,
              evidence: { startLine: 1 },
              exported: true,
            };
            return this.printResult({ source: moduleNode, dependents }, options);
          }
        } finally {
          canonical.repository.close();
        }
      }
      return this.fromLegacy(query, options);
    });
  }

  private fromLegacy(
    query: string,
    options: { json: boolean; xml: boolean; includeExternal: boolean }
  ): CommandResult {
    if (!this.dbManager) {
      const check = this.checkDatabaseExists();
      if (check) return check;
    }
    const db = this.dbManager || new DatabaseManager(this.getDatabasePath(), this.getJsonlPath());
    try {
      const matches = db.findSymbolsByNamePattern(query);
      const symbol =
        matches.find((item) => item.name.toLowerCase() === query.toLowerCase()) ?? matches.at(0);
      if (!symbol) return this.failure(`Symbol not found: ${query}`);
      const ids = new Set<string>();
      for (const rel of db.queryRelationships({ symbolId: symbol.id, limit: 500 })) {
        const to = Array.isArray(rel.to) ? rel.to : [rel.to];
        if (to.includes(symbol.id))
          for (const from of Array.isArray(rel.from) ? rel.from : [rel.from]) ids.add(from);
      }
      for (const item of db.getDependents(symbol.id)) ids.add(item);
      const dependents = db
        .getSymbolsByIds([...ids])
        .filter(
          (item) =>
            options.includeExternal || !this.isExternal({ file: item.file_path, external: false })
        );
      return this.printResult(
        {
          source: {
            id: symbol.id,
            name: symbol.name,
            kind: symbol.type,
            file: symbol.file_path,
            evidence: { startLine: symbol.line },
            exported: Boolean(symbol.is_exported),
            sourceId: symbol.id,
          },
          dependents: dependents.map((item) => ({
            edge: { kind: 'code-dependency', from: item.id, to: symbol.id },
            node: {
              id: item.id,
              name: item.name,
              kind: item.type,
              file: item.file_path,
              evidence: { startLine: item.line },
              external: false,
              sourceId: item.id,
            },
          })),
        },
        options
      );
    } finally {
      if (!this.dbManager) db.close();
    }
  }

  private printResult(
    value: {
      source: CanonicalGraphNode;
      dependents: Array<{
        edge: { kind: string; from: string; to: string };
        node: CanonicalGraphNode;
      }>;
    },
    options: { json: boolean; xml: boolean }
  ): CommandResult {
    const source = value.source;
    const payload = {
      symbol: source,
      dependents: value.dependents.map((item) => ({ ...item.node, relationship: item.edge.kind })),
    };
    if (options.json) console.log(JSON.stringify(payload, null, 2));
    else if (options.xml) {
      const groupedDependents: Record<
        string,
        Array<{ name: string; type: string; file: string; line: number }>
      > = {};
      for (const item of payload.dependents) {
        const group = groupedDependents[item.relationship] ?? [];
        group.push({
          name: item.name ?? item.id,
          type: item.kind,
          file: item.file ?? '',
          line: item.evidence?.startLine ?? 0,
        });
        groupedDependents[item.relationship] = group;
      }
      new XmlBuilder(WhoUsesSchema)
        .section('source', {
          name: source.name,
          type: source.kind,
          file: source.file ?? '',
          line: source.evidence?.startLine ?? 0,
          exported: source.exported ?? false,
        })
        .section('dependents', groupedDependents)
        .print();
    } else {
      this.printHeader(`Who Uses: ${source.name}`);
      console.log(`Type: ${source.kind}`);
      console.log(`File: ${source.file ?? 'unknown'}:${source.evidence?.startLine ?? '?'}`);
      console.log();
      if (payload.dependents.length === 0) console.log('Not used by any symbol');
      else {
        const groupedDependents = new Map<
          string,
          { dependent: (typeof payload.dependents)[number]; relationships: string[] }
        >();
        for (const item of payload.dependents) {
          const existing = groupedDependents.get(item.id);
          if (existing) {
            if (!existing.relationships.includes(item.relationship)) {
              existing.relationships.push(item.relationship);
            }
          } else {
            groupedDependents.set(item.id, {
              dependent: item,
              relationships: [item.relationship],
            });
          }
        }
        console.log(
          groupedDependents.size === payload.dependents.length
            ? `Referenced by ${groupedDependents.size} symbol(s):`
            : `Referenced by ${groupedDependents.size} symbol(s) (${payload.dependents.length} edges):`
        );
        for (const { dependent, relationships } of groupedDependents.values()) {
          console.log(
            `  ← ${dependent.name} (${dependent.kind}) [${relationships.join(', ')}] ${dependent.file ?? ''}:${dependent.evidence?.startLine ?? '?'}`
          );
        }
      }
    }
    return this.success();
  }
  private normalizeFileQuery(query: string): string {
    const relative = path.isAbsolute(query) ? path.relative(process.cwd(), query) : query;
    return relative.split(path.sep).join('/').replace(/^\.\//, '');
  }
  private resolveSymbolNode(
    nodes: readonly CanonicalGraphNode[],
    query: string,
    aliases: readonly { legacyId: string; canonicalId: string }[] = []
  ): CanonicalGraphNode | undefined {
    const canonicalId = aliases.find((alias) => alias.legacyId === query)?.canonicalId;
    return (
      nodes.find((node) => node.id === canonicalId) ??
      nodes.find((node) => node.id === query) ??
      nodes.find((node) => node.qualifiedName === query) ??
      nodes.find((node) => node.name === query)
    );
  }
  private isExternal(node: Pick<CanonicalGraphNode, 'external' | 'file'>): boolean {
    return (
      node.external === true ||
      /(?:bundled:|(?:^|[\\/])libs[\\/]|(?:^|[\\/])node_modules[\\/])/.test(node.file ?? '')
    );
  }
  private openCanonical(): {
    repository: GraphRepository;
    revision: NonNullable<ReturnType<GraphRepository['readActiveRevision']>>;
  } | null {
    const configPath = path.join(process.cwd(), '.tsdoc.config.json');
    let configured: string | undefined;
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const config = parsed as { canonicalGraph?: { databasePath?: string } };
      configured = config.canonicalGraph?.databasePath;
    } catch {
      /* defaults */
    }
    const candidate =
      process.env.TSDOC_EDGE_CANONICAL_GRAPH_DB ?? configured ?? '.tsdoc/canonical-graph.db';
    const databasePath = path.resolve(process.cwd(), candidate);
    if (!fs.existsSync(databasePath)) return null;
    let repository: GraphRepository | undefined;
    try {
      repository = new GraphRepository(databasePath, { readOnly: true });
      const revision = repository.readActiveRevision();
      if (!revision) {
        repository.close();
        return null;
      }
      return { repository, revision };
    } catch {
      repository?.close();
      return null;
    }
  }
}
