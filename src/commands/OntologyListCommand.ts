/**
 * Ontology List Command
 * @packageDocumentation
 * @doc [[OntologyListCommand]]
 * @doc [[Relationship Ontology]]
 *
 * @responsibility List instances of specific ontology elements from Canonical `@ttsc/graph` and Enrichment DB
 * @problem Need to explore specific relationship types or node types
 * @solves Provides detailed listing of instances with filtering, pagination, and format options
 * @context Ontology node and relationship instance listing via `tsdoc-edge ontology list`
 * @functionality Filters, paginates, and formats ontology nodes and projected edges across canonical `@ttsc/graph` and `.tsdoc.db` in table, JSON, or CSV format
 * @sideEffect console: Writes formatted ontology element tables, JSON, or CSV output to stdout
 * @sideEffect database: Reads canonical `@ttsc/graph` and `DatabaseManager` SQLite repositories (read)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseManager } from '../storage/DatabaseManager';
import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import {
  type CanonicalGraphPlaneSnapshot,
  projectCanonicalEdgeToOntology,
  readCanonicalGraphSnapshot,
} from './canonicalReadHelper';

/** Options for filtering ontology element listings */
interface ListOptions {
  type?: 'node' | 'relationship';
  name?: string;
  category?: string;
  strength?: string;
  limit: number;
  offset: number;
  format: 'table' | 'json' | 'csv';
  includeExternal: boolean;
}

interface ListedOntologyNode {
  id: string;
  name: string;
  type: string;
  kind: string;
  filePath?: string;
  line?: number;
}

interface ListedOntologyRelationship {
  id: string;
  type: string;
  projectedType?: string;
  category: string;
  direction: string;
  strength: string;
  from: string | string[];
  to: string | string[];
  confidence: number;
  description?: string;
  properties?: Record<string, unknown>;
}

/**
 * Command for listing ontology element instances across Canonical `@ttsc/graph` and Enrichment DB.
 *
 * @doc [[OntologyListCommand]]
 * @sideEffect console: Writes ontology element listings to stdout; reads SQLite repositories
 * @public
 */
export class OntologyListCommand extends BaseCommand {
  /**
   * getName method
   * @returns Returns string
   * @public
   */
  getName(): string {
    return 'ontology-list';
  }

  /**
   * getAlias method
   * @returns Returns string[]
   * @public
   */
  getAlias(): string[] {
    return ['onto-list', 'ol'];
  }

  /**
   * getDescription method
   * @returns Returns string
   * @public
   */
  getDescription(): string {
    return 'List instances of specific ontology elements (nodes or relationships)';
  }

  /**
   * getUsage method
   * @returns Returns string
   * @public
   */
  protected getUsage(): string {
    return `tsdoc-edge ontology-list [options]

Options:
  --nodes <type>        List all nodes of specific type (e.g., class, function, method)
  --rels <type>         List all relationships of specific type (e.g., calls, type_ref, test-coverage)
  --category <name>     Filter relationships by category (e.g., structural, behavioral, type-system, testing)
  --strength <level>    Filter relationships by strength (strong, medium, weak)
  --limit <n>           Limit number of results (default: 50)
  --offset <n>          Skip first n results (default: 0)
  --format <fmt>        Output format: table, json, csv (default: table)
  --json                Shorthand for --format json
  --include-external    Include external/stdlib nodes from canonical graph

Examples:
  tsdoc-edge ontology-list --nodes class
  tsdoc-edge ontology-list --rels calls --limit 10
  tsdoc-edge ontology-list --rels test-coverage
  tsdoc-edge ontology-list --category structural
  tsdoc-edge ontology-list --rels type_ref --format csv`;
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
        ['--json', '--include-external'],
        ['--nodes', '--rels', '--category', '--strength', '--limit', '--offset', '--format']
      );
      if (flagError) return flagError;

      const options = this.parseOptions(args);
      if (!['table', 'json', 'csv'].includes(options.format)) {
        this.printError(`Invalid format '${options.format}'. Expected table, json, or csv.`);
        return this.failure('Invalid format');
      }

      if (!options.name && !options.category && !options.strength) {
        this.printError('Please specify what to list: --nodes, --rels, --category, or --strength');
        console.log();
        console.log('Examples:');
        console.log('  tsdoc-edge ontology-list --nodes class');
        console.log('  tsdoc-edge ontology-list --rels calls');
        console.log('  tsdoc-edge ontology-list --rels test-coverage');
        console.log('  tsdoc-edge ontology-list --category structural');
        return this.failure('Missing required option');
      }

      const canonicalSnapshot = readCanonicalGraphSnapshot({
        includeExternal: options.includeExternal,
      });
      const dbPath = this.getDatabasePath();
      const hasLegacyDb = fs.existsSync(dbPath);

      if (!canonicalSnapshot && !hasLegacyDb) {
        const dbCheck = this.checkDatabaseExists();
        if (dbCheck) return dbCheck;
      }

      const dbManager = hasLegacyDb ? new DatabaseManager(dbPath) : null;
      try {
        if (options.type === 'node') {
          this.listNodes(canonicalSnapshot, dbManager, options);
        } else {
          this.listRelationships(canonicalSnapshot, dbManager, options);
        }
        return this.success();
      } finally {
        dbManager?.close();
      }
    });
  }

  private parseOptions(args: string[]): ListOptions {
    const nodesOpt = this.getOption(args, '--nodes');
    const relsOpt = this.getOption(args, '--rels');
    const categoryOpt = this.getOption(args, '--category');
    const strengthOpt = this.getOption(args, '--strength');
    const limitRaw = Number.parseInt(this.getOption(args, '--limit') || '50', 10);
    const offsetRaw = Number.parseInt(this.getOption(args, '--offset') || '0', 10);
    const formatOpt = this.hasFlag(args, '--json')
      ? 'json'
      : ((this.getOption(args, '--format') || 'table') as 'table' | 'json' | 'csv');

    return {
      type: nodesOpt ? 'node' : 'relationship',
      name: nodesOpt ?? relsOpt,
      category: categoryOpt,
      strength: strengthOpt,
      limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 50,
      offset: Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0,
      format: formatOpt,
      includeExternal: this.hasFlag(args, '--include-external'),
    };
  }

  private listNodes(
    canonicalSnapshot: CanonicalGraphPlaneSnapshot | null,
    dbManager: DatabaseManager | null,
    options: ListOptions
  ): void {
    const isTestNodeQuery = options.name === 'test-case' || options.name === 'test-suite';
    let nodes: ListedOntologyNode[] = [];
    let total = 0;

    if (canonicalSnapshot && !isTestNodeQuery) {
      const matched = canonicalSnapshot.filteredNodes
        .filter((node) => !options.name || node.kind === options.name)
        .map((node) => {
          const rawFile = node.file ?? node.evidence?.file;
          const filePath = rawFile
            ? path.isAbsolute(rawFile)
              ? path.relative(canonicalSnapshot.rootDir, rawFile)
              : rawFile
            : undefined;
          return {
            id: node.id,
            name: node.qualifiedName ?? node.name ?? node.id,
            type: node.kind,
            kind: node.kind,
            filePath,
            line: node.evidence?.startLine,
          };
        })
        .sort((left, right) => left.name.localeCompare(right.name));

      total = matched.length;
      nodes = matched.slice(options.offset, options.offset + options.limit);
    } else if (dbManager) {
      const queryOptions: {
        type?: string;
        limit?: number;
        offset?: number;
        orderBy?: 'name' | 'type' | 'filePath';
        orderDir?: 'asc' | 'desc';
      } = {
        orderBy: 'name',
        orderDir: 'asc',
        limit: options.limit,
        offset: options.offset,
      };
      if (options.name) {
        queryOptions.type = options.name;
      }

      const symbolRows = dbManager.querySymbols(queryOptions);
      nodes = symbolRows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        kind: row.type,
        filePath: row.file_path,
        line: row.line,
      }));
      total = dbManager.countSymbols(options.name ? { type: options.name } : {});
    }

    if (options.format === 'json') {
      console.log(
        JSON.stringify(
          {
            source: canonicalSnapshot && !isTestNodeQuery ? 'canonical-graph' : 'enrichment-db',
            total,
            limit: options.limit,
            offset: options.offset,
            nodes,
          },
          null,
          2
        )
      );
      return;
    }

    if (options.format === 'csv') {
      console.log('id,name,type,kind,filePath,line');
      for (const node of nodes) {
        console.log(
          `"${node.id}","${node.name}","${node.type}","${node.kind || ''}","${node.filePath || ''}","${node.line || ''}"`
        );
      }
      return;
    }

    const title = options.name ? `Nodes of type: ${options.name}` : 'All Nodes';
    this.printHeader(title);

    console.log(
      `${colors.dim}Total: ${total.toLocaleString()} | Showing: ${nodes.length} (offset: ${options.offset})${colors.reset}`
    );
    console.log();

    if (nodes.length === 0) {
      console.log(`${colors.yellow}No nodes found matching criteria${colors.reset}`);
      return;
    }

    for (const node of nodes) {
      console.log(
        `${colors.cyan}${node.name}${colors.reset} ${colors.dim}(${node.id})${colors.reset}`
      );
      console.log(
        `  Type: ${colors.yellow}${node.type}${colors.reset}${node.kind ? ` | Kind: ${colors.yellow}${node.kind}${colors.reset}` : ''}`
      );
      if (node.filePath) {
        console.log(
          `  Location: ${colors.blue}${node.filePath}${node.line ? `:${node.line}` : ''}${colors.reset}`
        );
      }
      console.log();
    }

    if (total > options.offset + nodes.length) {
      const nextOffset = options.offset + options.limit;
      console.log(
        `${colors.dim}More results available. Use --offset ${nextOffset} to see next page${colors.reset}`
      );
    }
  }

  private listRelationships(
    canonicalSnapshot: CanonicalGraphPlaneSnapshot | null,
    dbManager: DatabaseManager | null,
    options: ListOptions
  ): void {
    let relationships: ListedOntologyRelationship[] = [];

    if (canonicalSnapshot) {
      canonicalSnapshot.filteredEdges.forEach((edge, idx) => {
        const projected = projectCanonicalEdgeToOntology(edge);
        const loc =
          edge.evidence?.file && edge.evidence?.startLine
            ? `${path.relative(canonicalSnapshot.rootDir, path.resolve(canonicalSnapshot.rootDir, edge.evidence.file))}:${edge.evidence.startLine}`
            : undefined;
        relationships.push({
          id: `canonical:${edge.kind}:${idx + 1}`,
          type: projected.rawKind,
          projectedType: projected.relationshipType,
          category: projected.category,
          direction: projected.direction,
          strength: projected.strength,
          from: [edge.from],
          to: [edge.to],
          confidence: 1.0,
          description: loc ? `Canonical @ttsc/graph edge at ${loc}` : 'Canonical @ttsc/graph edge',
          properties: { inferred: false, source: 'canonical-graph' },
        });
      });
    }

    if (dbManager) {
      const legacyRels = dbManager.getAllUnifiedRelationships();
      for (const rel of legacyRels) {
        if (canonicalSnapshot && rel.category === 'structural') {
          continue;
        }
        relationships.push({
          id: rel.id,
          type: rel.type,
          category: rel.category,
          direction: rel.direction,
          strength: rel.strength,
          from: rel.from,
          to: rel.to,
          confidence: rel.confidence,
          description: rel.description,
          properties: rel.properties,
        });
      }
    }

    if (options.name) {
      relationships = relationships.filter(
        (rel) => rel.type === options.name || rel.projectedType === options.name
      );
    }
    if (options.category) {
      relationships = relationships.filter((rel) => rel.category === options.category);
    }
    if (options.strength) {
      relationships = relationships.filter((rel) => rel.strength === options.strength);
    }

    const total = relationships.length;
    const { offset, limit } = options;
    relationships = relationships.slice(offset, offset + limit);

    if (options.format === 'json') {
      console.log(
        JSON.stringify(
          {
            total,
            limit,
            offset,
            relationships,
          },
          null,
          2
        )
      );
      return;
    }

    if (options.format === 'csv') {
      console.log('id,type,category,direction,strength,from,to,confidence,inferred');
      for (const rel of relationships) {
        const froms = Array.isArray(rel.from) ? rel.from : [rel.from];
        const tos = Array.isArray(rel.to) ? rel.to : [rel.to];
        const from = froms.join(';');
        const to = tos.join(';');
        const inferred = rel.properties?.inferred === true ? 'true' : 'false';
        console.log(
          `"${rel.id}","${rel.type}","${rel.category}","${rel.direction}","${rel.strength}","${from}","${to}",${rel.confidence},${inferred}`
        );
      }
      return;
    }

    let title = 'Relationships';
    if (options.name) title = `Relationships of type: ${options.name}`;
    else if (options.category) title = `Relationships in category: ${options.category}`;
    else if (options.strength) title = `${options.strength} relationships`;

    this.printHeader(title);

    console.log(
      `${colors.dim}Total: ${total.toLocaleString()} | Showing: ${relationships.length} (offset: ${offset})${colors.reset}`
    );
    console.log();

    if (relationships.length === 0) {
      console.log(`${colors.yellow}No relationships found matching criteria${colors.reset}`);
      return;
    }

    for (const rel of relationships) {
      const froms = Array.isArray(rel.from) ? rel.from : [rel.from];
      const tos = Array.isArray(rel.to) ? rel.to : [rel.to];

      const icon = this.getCategoryIcon(rel.category);
      const strengthIcon =
        rel.strength === 'strong' ? '💪' : rel.strength === 'medium' ? '👍' : '👌';
      const directionIcon =
        rel.direction === 'unidirectional' ? '→' : rel.direction === 'bidirectional' ? '↔' : '—';
      const inferredBadge =
        rel.properties?.inferred === true ? `${colors.yellow}[INFERRED]${colors.reset}` : '';

      console.log(`${icon} ${colors.cyan}${rel.type}${colors.reset} ${inferredBadge}`);
      console.log(`  ${colors.dim}${rel.id}${colors.reset}`);
      console.log(
        `  Category: ${colors.yellow}${rel.category}${colors.reset} | Strength: ${strengthIcon} ${rel.strength} | Direction: ${directionIcon} ${rel.direction}`
      );
      console.log(`  From: ${colors.blue}${froms.join(', ')}${colors.reset}`);
      console.log(`  To:   ${colors.green}${tos.join(', ')}${colors.reset}`);
      console.log(`  Confidence: ${this.formatConfidence(rel.confidence)}`);

      if (rel.description) {
        console.log(`  ${colors.dim}${rel.description}${colors.reset}`);
      }

      console.log();
    }

    if (total > offset + relationships.length) {
      const nextOffset = offset + limit;
      console.log(
        `${colors.dim}More results available. Use --offset ${nextOffset} to see next page${colors.reset}`
      );
    }
  }

  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      structural: '🏗️',
      'type-system': '🧬',
      'data-flow': '📊',
      behavioral: '⚙️',
      temporal: '⏱️',
      semantic: '💡',
      quality: '✨',
      verification: '✅',
      organizational: '📁',
      testing: '🧪',
      alternative: '🔀',
      constraint: '🔒',
    };
    return icons[category] || '🔗';
  }

  private formatConfidence(confidence: number): string {
    const percentage = (confidence * 100).toFixed(0);
    if (confidence >= 0.9) return `${colors.green}${percentage}%${colors.reset}`;
    if (confidence >= 0.7) return `${colors.yellow}${percentage}%${colors.reset}`;
    return `${colors.dim}${percentage}%${colors.reset}`;
  }
}
