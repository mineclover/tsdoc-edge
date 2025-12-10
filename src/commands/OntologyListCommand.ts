/**
 * Ontology List Command
 * @packageDocumentation
 *
 * @responsibility List instances of specific ontology elements
 * @problem Need to explore specific relationship types or node types
 * @solves Provides detailed listing of instances with filtering options
 */

import { BaseCommand, type CommandResult, colors } from './BaseCommand';
import { DatabaseManager } from '../storage/DatabaseManager';
import type { UnifiedRelationship } from '../types/relationships';

interface ListOptions {
  type?: 'node' | 'relationship';
  name?: string;
  category?: string;
  strength?: string;
  limit?: number;
  offset?: number;
  format?: 'table' | 'json' | 'csv';
}

/**
 * Command for listing ontology element instances
 *
 * Lists all instances of:
 * - Specific node (symbol) types
 * - Specific relationship types
 * - Relationships by category or strength
 *
 * Supports filtering and pagination.
 *
 * @public
 */
export class OntologyListCommand extends BaseCommand {
  getName(): string {
    return 'ontology-list';
  }

  getAlias(): string[] {
    return ['onto-list', 'ol'];
  }

  getDescription(): string {
    return 'List instances of specific ontology elements (nodes or relationships)';
  }

  protected getUsage(): string {
    return `tsdoc-edge ontology-list [options]

Options:
  --nodes <type>        List all nodes of specific type (e.g., class, function)
  --rels <type>         List all relationships of specific type
  --category <name>     Filter relationships by category
  --strength <level>    Filter relationships by strength (strong, medium, weak)
  --limit <n>           Limit number of results (default: 50)
  --offset <n>          Skip first n results (default: 0)
  --format <fmt>        Output format: table, json, csv (default: table)

Examples:
  # List all class nodes
  tsdoc-edge ontology-list --nodes class

  # List all test-coverage relationships
  tsdoc-edge ontology-list --rels test-coverage

  # List structural relationships
  tsdoc-edge ontology-list --category structural

  # List strong relationships with pagination
  tsdoc-edge ontology-list --strength strong --limit 20 --offset 0

  # Export to CSV
  tsdoc-edge ontology-list --rels code-dependency --format csv`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const options = this.parseOptions(args);

      if (!options.name && !options.category && !options.strength) {
        this.printError('Please specify what to list: --nodes, --rels, --category, or --strength');
        console.log();
        console.log('Examples:');
        console.log('  tsdoc-edge ontology-list --nodes class');
        console.log('  tsdoc-edge ontology-list --rels test-coverage');
        console.log('  tsdoc-edge ontology-list --category structural');
        return this.failure('Missing required option');
      }

      const dbCheck = this.checkDatabaseExists();
      if (dbCheck) return dbCheck;

      const dbPath = this.getDatabasePath();
      const dbManager = new DatabaseManager(dbPath);

      if (options.type === 'node') {
        await this.listNodes(dbManager, options);
      } else {
        await this.listRelationships(dbManager, options);
      }

      dbManager.close();

      return this.success();
    });
  }

  private parseOptions(args: string[]): ListOptions {
    const options: ListOptions = {
      limit: 50,
      offset: 0,
      format: 'table',
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--nodes' && args[i + 1]) {
        options.type = 'node';
        options.name = args[i + 1];
        i++;
      } else if (arg === '--rels' && args[i + 1]) {
        options.type = 'relationship';
        options.name = args[i + 1];
        i++;
      } else if (arg === '--category' && args[i + 1]) {
        options.type = 'relationship';
        options.category = args[i + 1];
        i++;
      } else if (arg === '--strength' && args[i + 1]) {
        options.type = 'relationship';
        options.strength = args[i + 1];
        i++;
      } else if (arg === '--limit' && args[i + 1]) {
        options.limit = parseInt(args[i + 1], 10);
        i++;
      } else if (arg === '--offset' && args[i + 1]) {
        options.offset = parseInt(args[i + 1], 10);
        i++;
      } else if (arg === '--format' && args[i + 1]) {
        options.format = args[i + 1] as 'table' | 'json' | 'csv';
        i++;
      }
    }

    return options;
  }

  private async listNodes(dbManager: DatabaseManager, options: ListOptions): Promise<void> {
    let query = 'SELECT * FROM symbols';
    const params: any[] = [];

    if (options.name) {
      query += ' WHERE type = ?';
      params.push(options.name);
    }

    query += ' ORDER BY name';

    if (options.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(options.limit, options.offset || 0);
    }

    const nodes = dbManager.db.prepare(query).all(...params) as Array<{
      id: string;
      name: string;
      type: string;
      kind?: string;
      filePath?: string;
      line?: number;
    }>;

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM symbols';
    const countParams: any[] = [];
    if (options.name) {
      countQuery += ' WHERE type = ?';
      countParams.push(options.name);
    }
    const total = (dbManager.db.prepare(countQuery).get(...countParams) as { count: number }).count;

    if (options.format === 'json') {
      console.log(JSON.stringify({
        total,
        limit: options.limit,
        offset: options.offset,
        nodes,
      }, null, 2));
      return;
    }

    if (options.format === 'csv') {
      console.log('id,name,type,kind,filePath,line');
      for (const node of nodes) {
        console.log(`"${node.id}","${node.name}","${node.type}","${node.kind || ''}","${node.filePath || ''}","${node.line || ''}"`);
      }
      return;
    }

    // Table format
    const title = options.name ? `Nodes of type: ${options.name}` : 'All Nodes';
    this.printHeader(title);

    console.log(`${colors.dim}Total: ${total.toLocaleString()} | Showing: ${nodes.length} (offset: ${options.offset})${colors.reset}`);
    console.log();

    if (nodes.length === 0) {
      console.log(`${colors.yellow}No nodes found matching criteria${colors.reset}`);
      return;
    }

    for (const node of nodes) {
      console.log(`${colors.cyan}${node.name}${colors.reset} ${colors.dim}(${node.id})${colors.reset}`);
      console.log(`  Type: ${colors.yellow}${node.type}${colors.reset}${node.kind ? ` | Kind: ${colors.yellow}${node.kind}${colors.reset}` : ''}`);
      if (node.filePath) {
        console.log(`  Location: ${colors.blue}${node.filePath}${node.line ? `:${node.line}` : ''}${colors.reset}`);
      }
      console.log();
    }

    // Pagination info
    if (total > (options.offset || 0) + nodes.length) {
      const nextOffset = (options.offset || 0) + (options.limit || 50);
      console.log(`${colors.dim}More results available. Use --offset ${nextOffset} to see next page${colors.reset}`);
    }
  }

  private async listRelationships(dbManager: DatabaseManager, options: ListOptions): Promise<void> {
    let relationships = dbManager.getAllUnifiedRelationships();

    // Apply filters
    if (options.name) {
      relationships = relationships.filter(r => r.type === options.name);
    }
    if (options.category) {
      relationships = relationships.filter(r => r.category === options.category);
    }
    if (options.strength) {
      relationships = relationships.filter(r => r.strength === options.strength);
    }

    const total = relationships.length;

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    relationships = relationships.slice(offset, offset + limit);

    if (options.format === 'json') {
      console.log(JSON.stringify({
        total,
        limit: options.limit,
        offset: options.offset,
        relationships,
      }, null, 2));
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
        console.log(`"${rel.id}","${rel.type}","${rel.category}","${rel.direction}","${rel.strength}","${from}","${to}",${rel.confidence},${inferred}`);
      }
      return;
    }

    // Table format
    let title = 'Relationships';
    if (options.name) title = `Relationships of type: ${options.name}`;
    else if (options.category) title = `Relationships in category: ${options.category}`;
    else if (options.strength) title = `${options.strength} relationships`;

    this.printHeader(title);

    console.log(`${colors.dim}Total: ${total.toLocaleString()} | Showing: ${relationships.length} (offset: ${offset})${colors.reset}`);
    console.log();

    if (relationships.length === 0) {
      console.log(`${colors.yellow}No relationships found matching criteria${colors.reset}`);
      return;
    }

    for (const rel of relationships) {
      const froms = Array.isArray(rel.from) ? rel.from : [rel.from];
      const tos = Array.isArray(rel.to) ? rel.to : [rel.to];

      const icon = this.getCategoryIcon(rel.category);
      const strengthIcon = rel.strength === 'strong' ? '💪' : rel.strength === 'medium' ? '👍' : '👌';
      const directionIcon = rel.direction === 'unidirectional' ? '→' : rel.direction === 'bidirectional' ? '↔' : '—';
      const inferredBadge = rel.properties?.inferred === true ? `${colors.yellow}[INFERRED]${colors.reset}` : '';

      console.log(`${icon} ${colors.cyan}${rel.type}${colors.reset} ${inferredBadge}`);
      console.log(`  ${colors.dim}${rel.id}${colors.reset}`);
      console.log(`  Category: ${colors.yellow}${rel.category}${colors.reset} | Strength: ${strengthIcon} ${rel.strength} | Direction: ${directionIcon} ${rel.direction}`);
      console.log(`  From: ${colors.blue}${froms.join(', ')}${colors.reset}`);
      console.log(`  To:   ${colors.green}${tos.join(', ')}${colors.reset}`);
      console.log(`  Confidence: ${this.formatConfidence(rel.confidence)}`);

      if (rel.description) {
        console.log(`  ${colors.dim}${rel.description}${colors.reset}`);
      }

      console.log();
    }

    // Pagination info
    if (total > offset + relationships.length) {
      const nextOffset = offset + limit;
      console.log(`${colors.dim}More results available. Use --offset ${nextOffset} to see next page${colors.reset}`);
    }
  }

  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'structural': '🏗️',
      'data-flow': '📊',
      'behavioral': '⚙️',
      'temporal': '⏱️',
      'semantic': '💡',
      'quality': '✨',
      'verification': '✅',
      'organizational': '📁',
      'testing': '🧪',
      'alternative': '🔀',
      'constraint': '🔒',
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
