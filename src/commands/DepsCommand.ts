/**
 * Dependency query against canonical graph with a legacy fallback.
 *
 * @packageDocumentation
 * @doc [[DepsCommand]]
 * @context Outgoing symbol dependency lookup invoked via `tsdoc-edge symbol deps`
 * @functionality Queries outgoing dependencies from the active canonical `@ttsc/graph` revision with fallback to `.tsdoc.db` and `SymbolRegistryManager`
 * @sideEffect console: Writes dependency trees, `--json`, or `--xml` payloads to stdout
 * @sideEffect database: Reads `GraphRepository` and `DatabaseManager` in read-only mode (read)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CanonicalGraphNode } from '../indexer/contracts';
import { DepsSchema } from '../output/schemas';
import { XmlBuilder } from '../output/XmlBuilder';
import { DatabaseManager } from '../storage/DatabaseManager';
import { GraphRepository } from '../storage/GraphRepository';
import { SymbolRegistryManager } from '../storage/SymbolRegistryManager';
import { BaseCommand, type CommandResult } from './BaseCommand';

/**
 * Query reverse or outgoing symbol relationships.
 * @public
 * @doc [[DepsCommand]]
 * @sideEffect console: Writes outgoing dependency output to stdout; reads canonical graph and symbol SQLite repositories
 */
export class DepsCommand extends BaseCommand {
  private manager?: SymbolRegistryManager;
  constructor(manager?: SymbolRegistryManager) {
    super();
    this.manager = manager;
  }
  /** @returns Command name */
  getName(): string {
    return 'deps';
  }
  /** @returns Command description */
  getDescription(): string {
    return 'Show what a symbol depends on (A → B)';
  }
  protected getUsage(): string {
    return 'tsdoc-edge symbol deps <symbol-id> [--all] [--type <kind>] [--json|--xml] [--include-external]';
  }
  /**
   * @param args - Command arguments
   * @returns Command result
   */
  execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(() => {
      if (this.hasHelpFlag(args)) return this.displayHelp();
      const invalid = this.validateAllowedFlags(
        args,
        ['--all', '--json', '--xml', '--include-external'],
        ['--type']
      );
      if (invalid) return invalid;
      const query = this.extractPositionalQuery(args, ['--type']);
      if (!query) return this.failure('Symbol name required');
      const options = {
        all: this.hasFlag(args, '--all'),
        type: this.getOption(args, '--type'),
        json: this.hasFlag(args, '--json'),
        xml: this.hasFlag(args, '--xml'),
        includeExternal: this.hasFlag(args, '--include-external'),
      };
      const canonical = this.openCanonical();
      if (canonical) {
        try {
          const nodes = new Map(canonical.revision.graph.nodes.map((item) => [item.id, item]));
          const symbolNode = this.resolveSymbolNode(
            canonical.revision.graph.nodes,
            query,
            canonical.revision.aliases
          );
          if (symbolNode) {
            let deps = canonical.revision.graph.edges
              .filter((edge) => edge.from === symbolNode.id)
              .map((edge) => ({ edge, node: nodes.get(edge.to) }))
              .filter(
                (
                  item
                ): item is {
                  edge: (typeof canonical.revision.graph.edges)[number];
                  node: CanonicalGraphNode;
                } => Boolean(item.node)
              )
              .filter((item) => options.includeExternal || !this.isExternal(item.node));
            if (options.type) deps = deps.filter((item) => item.edge.kind === options.type);
            return this.printResult(symbolNode, deps, options);
          }

          const normalizedFile = this.normalizeFileQuery(query);
          const fileNodes = canonical.revision.graph.nodes.filter(
            (item) => item.file === normalizedFile
          );
          if (fileNodes.length > 0) {
            const fileNodeIds = new Set(fileNodes.map((item) => item.id));
            const seen = new Set<string>();
            let deps = canonical.revision.graph.edges
              .filter((edge) => fileNodeIds.has(edge.from) && !fileNodeIds.has(edge.to))
              .map((edge) => ({ edge, node: nodes.get(edge.to) }))
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
            if (options.type) deps = deps.filter((item) => item.edge.kind === options.type);
            const moduleNode: CanonicalGraphNode = {
              id: normalizedFile,
              sourceId: normalizedFile,
              name: normalizedFile,
              kind: 'module',
              file: normalizedFile,
              evidence: { startLine: 1 },
              exported: true,
            };
            return this.printResult(moduleNode, deps, options);
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
    options: { all: boolean; type?: string; json: boolean; xml: boolean; includeExternal: boolean }
  ): CommandResult {
    const registryPath = path.join(process.cwd(), '.tsdoc', 'registry.jsonl');
    const manager =
      this.manager ||
      (fs.existsSync(registryPath) ? new SymbolRegistryManager(registryPath) : undefined);
    const entry = manager?.findById(query) ?? manager?.findByNamePattern(query)[0];
    return this.findDepsFromDatabase(entry?.id ?? query, options);
  }
  private findDepsFromDatabase(
    idOrName: string,
    options: { all: boolean; type?: string; json: boolean; xml: boolean; includeExternal: boolean }
  ): CommandResult {
    const check = this.checkDatabaseExists();
    if (check) return check;
    const db = new DatabaseManager(this.getDatabasePath(), this.getJsonlPath());
    try {
      const matches = db.findSymbolsByNamePattern(idOrName);
      const symbol = db.getSymbol(idOrName) ?? matches.at(0);
      if (!symbol) return this.failure(`Symbol not found: ${idOrName}`);
      let rels = db
        .queryRelationships({
          symbolId: symbol.id,
          limit: 500,
          ...(options.type ? { type: options.type } : {}),
        })
        .filter((rel) => (Array.isArray(rel.from) ? rel.from : [rel.from]).includes(symbol.id));
      if (!options.all && !options.type)
        rels = rels.filter((rel) => rel.type === 'code-dependency');
      const deps: Array<{
        edge: { kind: string; from: string; to: string };
        node: CanonicalGraphNode;
      }> = [];
      for (const rel of rels)
        for (const targetId of Array.isArray(rel.to) ? rel.to : [rel.to]) {
          const target = db.getSymbol(targetId);
          if (
            target &&
            (options.includeExternal ||
              !this.isExternal({ file: target.filePath, external: false }))
          )
            deps.push({
              edge: { kind: rel.type, from: symbol.id, to: targetId },
              node: {
                id: target.id,
                name: target.name,
                kind: target.type,
                file: target.filePath,
                evidence: { startLine: target.line },
                external: false,
                sourceId: target.id,
              },
            });
        }
      return this.printResult(
        {
          id: symbol.id,
          name: symbol.name,
          kind: symbol.type,
          file:
            (symbol as { filePath?: string; file_path?: string }).filePath ??
            (symbol as { file_path?: string }).file_path ??
            '',
          evidence: { startLine: symbol.line },
          exported: Boolean(
            (symbol as { isExported?: boolean; is_exported?: number }).isExported ??
              (symbol as { is_exported?: number }).is_exported
          ),
          sourceId: symbol.id,
        },
        deps,
        options
      );
    } finally {
      db.close();
    }
  }
  private printResult(
    source: CanonicalGraphNode,
    deps: Array<{ edge: { kind: string; from: string; to: string }; node: CanonicalGraphNode }>,
    options: { json: boolean; xml: boolean }
  ): CommandResult {
    const targets = deps.map((item) => ({ ...item.node, relation: item.edge.kind }));
    if (options.json) console.log(JSON.stringify({ source, targets }, null, 2));
    else if (options.xml)
      new XmlBuilder(DepsSchema)
        .section('source', {
          name: source.name,
          type: source.kind,
          file: source.file ?? '',
          line: source.evidence?.startLine ?? 0,
          exported: source.exported ?? false,
        })
        .section(
          'targets',
          targets.map((item) => ({
            name: item.name,
            type: item.kind,
            relation: item.relation,
            file: item.file ?? '',
            line: item.evidence?.startLine ?? 0,
          }))
        )
        .print();
    else {
      this.printHeader(`Dependencies of ${source.name}`);
      console.log(`Type: ${source.kind}`);
      console.log(`File: ${source.file ?? 'unknown'}:${source.evidence?.startLine ?? '?'}`);
      console.log();
      if (targets.length === 0) console.log('No dependencies found');
      else {
        const groupedTargets = new Map<
          string,
          { target: (typeof targets)[number]; relations: string[] }
        >();
        for (const target of targets) {
          const existing = groupedTargets.get(target.id);
          if (existing) {
            if (!existing.relations.includes(target.relation)) {
              existing.relations.push(target.relation);
            }
          } else {
            groupedTargets.set(target.id, { target, relations: [target.relation] });
          }
        }
        for (const { target, relations } of groupedTargets.values()) {
          console.log(
            `  → ${target.name} (${target.kind}) [${relations.join(', ')}] ${target.file ?? ''}:${target.evidence?.startLine ?? '?'}`
          );
        }
        console.log(
          groupedTargets.size === targets.length
            ? `\nTotal: ${groupedTargets.size} dependencies`
            : `\nTotal: ${groupedTargets.size} dependencies (${targets.length} edges)`
        );
      }
    }
    return this.success();
  }
  private extractPositionalQuery(args: string[], valueFlags: string[]): string | undefined {
    const valueFlagSet = new Set(valueFlags);
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (!arg) continue;
      if (valueFlagSet.has(arg)) {
        i++;
        continue;
      }
      if (!arg.startsWith('-')) {
        return arg;
      }
    }
    return undefined;
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
