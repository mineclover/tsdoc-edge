/**
 * Relationship Help Command
 * @packageDocumentation
 */

import { BaseCommand, type CommandResult } from './BaseCommand';

/**
 * Command providing guided help for the relationship system
 * @doc [[RelationshipHelpCommand]]
 * @public
 */
export class RelationshipHelpCommand extends BaseCommand {
  getName(): string {
    return 'relationship-help';
  }

  getDescription(): string {
    return 'Interactive guide to the relationship analysis system';
  }

  protected getUsage(): string {
    return `tsdoc-edge relationship-help [topic]

Provides guided help and workflow recommendations for the relationship system.

Topics:
  workflows    - Common workflows and use cases
  commands     - Overview of all commands
  metrics      - Understanding graph metrics
  formats      - Export format guide
  quick-start  - Getting started guide

Examples:
  tsdoc-edge relationship-help
  tsdoc-edge relationship-help workflows
  tsdoc-edge relationship-help metrics`;
  }

  async execute(args: string[]): Promise<CommandResult> {
    return this.executeWithErrorHandling(async () => {
      if (this.hasHelpFlag(args)) {
        return this.displayHelp();
      }

      const topic = args[0] || 'main';

      switch (topic) {
        case 'workflows':
          return this.showWorkflows();
        case 'commands':
          return this.showCommands();
        case 'metrics':
          return this.showMetrics();
        case 'formats':
          return this.showFormats();
        case 'quick-start':
          return this.showQuickStart();
        default:
          return this.showMain();
      }
    });
  }

  private showMain(): CommandResult {
    this.printHeader('Relationship Analysis System');

    console.log();
    console.log(`  ${this.colors.bold}Complete architectural intelligence through graph analysis${this.colors.reset}`);
    console.log();

    this.printSection('What can you do?');
    console.log(`  ${this.colors.cyan}❓ "What will break if I change this?"${this.colors.reset}`);
    console.log(`     → tsdoc-edge relationship-impact <symbol-id>`);
    console.log();
    console.log(`  ${this.colors.cyan}❓ "What are the architectural modules?"${this.colors.reset}`);
    console.log(`     → tsdoc-edge relationship-clusters`);
    console.log();
    console.log(`  ${this.colors.cyan}❓ "Which symbols are most critical?"${this.colors.reset}`);
    console.log(`     → tsdoc-edge relationship-metrics`);
    console.log();
    console.log(`  ${this.colors.cyan}❓ "How are two symbols connected?"${this.colors.reset}`);
    console.log(`     → tsdoc-edge relationship-path <symbol-a> <symbol-b>`);
    console.log();
    console.log(`  ${this.colors.cyan}❓ "What does this symbol connect to?"${this.colors.reset}`);
    console.log(`     → tsdoc-edge relationship-query <symbol-id>`);
    console.log();

    console.log();
    this.printSection('Available Topics');
    console.log(`  ${this.colors.bold}workflows${this.colors.reset}     - Common workflows (before changes, arch review, refactoring)`);
    console.log(`  ${this.colors.bold}commands${this.colors.reset}      - Complete command reference`);
    console.log(`  ${this.colors.bold}metrics${this.colors.reset}       - Understanding graph metrics (degree, betweenness, PageRank)`);
    console.log(`  ${this.colors.bold}formats${this.colors.reset}       - Export formats (JSON, GraphML, DOT, CSV, Cypher)`);
    console.log(`  ${this.colors.bold}quick-start${this.colors.reset}   - 2-minute getting started guide`);
    console.log();

    console.log(`  ${this.colors.dim}Usage: tsdoc-edge relationship-help <topic>${this.colors.reset}`);
    console.log();

    this.printSection('Documentation');
    console.log(`  Full guide: ${this.colors.cyan}docs/relationship-system-guide.md${this.colors.reset}`);
    console.log(`  Current status: ${this.colors.cyan}tsdoc-edge relationship-stats${this.colors.reset}`);
    console.log();

    return this.success('Help displayed');
  }

  private showQuickStart(): CommandResult {
    this.printHeader('Quick Start Guide');

    console.log();
    this.printSection('Step 1: Discover Patterns (30 seconds)');
    console.log(`  ${this.colors.cyan}tsdoc-edge relationship-clusters${this.colors.reset}`);
    console.log(`  ${this.colors.dim}→ See natural architectural modules in your codebase${this.colors.reset}`);
    console.log();

    this.printSection('Step 2: Find Critical Symbols (30 seconds)');
    console.log(`  ${this.colors.cyan}tsdoc-edge relationship-metrics --top 10${this.colors.reset}`);
    console.log(`  ${this.colors.dim}→ Identify bottlenecks and critical dependencies${this.colors.reset}`);
    console.log();

    this.printSection('Step 3: Before Making Changes (1 minute)');
    console.log(`  ${this.colors.cyan}tsdoc-edge relationship-impact <your-symbol>${this.colors.reset}`);
    console.log(`  ${this.colors.dim}→ See who will be affected and assess risk${this.colors.reset}`);
    console.log();

    this.printSection('Next Steps');
    console.log(`  • Export for visualization: ${this.colors.cyan}tsdoc-edge relationship-help formats${this.colors.reset}`);
    console.log(`  • Learn workflows: ${this.colors.cyan}tsdoc-edge relationship-help workflows${this.colors.reset}`);
    console.log(`  • Understand metrics: ${this.colors.cyan}tsdoc-edge relationship-help metrics${this.colors.reset}`);
    console.log();

    return this.success('Quick start guide displayed');
  }

  private showWorkflows(): CommandResult {
    this.printHeader('Common Workflows');

    console.log();
    this.printSection('1. Before Making Changes');
    console.log(`  ${this.colors.bold}Goal:${this.colors.reset} Assess risk and plan testing`);
    console.log();
    console.log(`  ${this.colors.cyan}# Check if critical${this.colors.reset}`);
    console.log(`  tsdoc-edge relationship-metrics --top 20`);
    console.log();
    console.log(`  ${this.colors.cyan}# Analyze impact${this.colors.reset}`);
    console.log(`  tsdoc-edge relationship-impact <symbol-id>`);
    console.log();
    console.log(`  ${this.colors.cyan}# Understand connections${this.colors.reset}`);
    console.log(`  tsdoc-edge relationship-query <symbol-id>`);
    console.log();
    console.log(`  ${this.colors.dim}Risk levels: LOW (<5 affected), MEDIUM (5-19), HIGH (20+)${this.colors.reset}`);
    console.log();

    this.printSection('2. Architecture Review');
    console.log(`  ${this.colors.bold}Goal:${this.colors.reset} Understand system structure`);
    console.log();
    console.log(`  ${this.colors.cyan}# Find modules${this.colors.reset}`);
    console.log(`  tsdoc-edge relationship-clusters`);
    console.log();
    console.log(`  ${this.colors.cyan}# Find bottlenecks${this.colors.reset}`);
    console.log(`  tsdoc-edge relationship-metrics --metric betweenness`);
    console.log();
    console.log(`  ${this.colors.cyan}# Export for team discussion${this.colors.reset}`);
    console.log(`  tsdoc-edge relationship-export --format graphml -o review.graphml`);
    console.log();

    this.printSection('3. Refactoring Planning');
    console.log(`  ${this.colors.bold}Goal:${this.colors.reset} Safely restructure code`);
    console.log();
    console.log(`  ${this.colors.cyan}# What moves together?${this.colors.reset}`);
    console.log(`  tsdoc-edge relationship-clusters --min-size 5`);
    console.log();
    console.log(`  ${this.colors.cyan}# What connects to it?${this.colors.reset}`);
    console.log(`  tsdoc-edge relationship-query <symbol-id>`);
    console.log();
    console.log(`  ${this.colors.cyan}# Impact of moving${this.colors.reset}`);
    console.log(`  tsdoc-edge relationship-impact <symbol-id>`);
    console.log();

    this.printSection('4. Understanding Dependencies');
    console.log(`  ${this.colors.bold}Goal:${this.colors.reset} Debug unexpected coupling`);
    console.log();
    console.log(`  ${this.colors.cyan}# How are they connected?${this.colors.reset}`);
    console.log(`  tsdoc-edge relationship-path <symbol-a> <symbol-b>`);
    console.log();
    console.log(`  ${this.colors.cyan}# Show shortest path only${this.colors.reset}`);
    console.log(`  tsdoc-edge relationship-path <symbol-a> <symbol-b> --shortest-only`);
    console.log();

    console.log();
    return this.success('Workflows displayed');
  }

  private showCommands(): CommandResult {
    this.printHeader('Command Reference');

    console.log();
    this.printSection('Query & Exploration');
    console.log();
    console.log(`  ${this.colors.bold}relationship-query${this.colors.reset} <symbol-id>`);
    console.log(`    Explore all relationships for a symbol`);
    console.log(`    ${this.colors.dim}Filters: --category, --type, --direction${this.colors.reset}`);
    console.log();
    console.log(`  ${this.colors.bold}relationship-path${this.colors.reset} <from> <to>`);
    console.log(`    Find connection paths between symbols`);
    console.log(`    ${this.colors.dim}Options: --shortest-only, --max-length${this.colors.reset}`);
    console.log();

    this.printSection('Analysis');
    console.log();
    console.log(`  ${this.colors.bold}relationship-impact${this.colors.reset} <symbol-id>`);
    console.log(`    Analyze change impact (who will be affected)`);
    console.log(`    ${this.colors.dim}Options: --direction (upstream/downstream), --depth${this.colors.reset}`);
    console.log();
    console.log(`  ${this.colors.bold}relationship-metrics${this.colors.reset}`);
    console.log(`    Calculate centrality and importance metrics`);
    console.log(`    ${this.colors.dim}Metrics: degree, betweenness, pagerank, importance${this.colors.reset}`);
    console.log();
    console.log(`  ${this.colors.bold}relationship-clusters${this.colors.reset}`);
    console.log(`    Discover architectural modules`);
    console.log(`    ${this.colors.dim}Options: --min-size, --category, --detailed${this.colors.reset}`);
    console.log();

    this.printSection('Maintenance & Integration');
    console.log();
    console.log(`  ${this.colors.bold}relationship-validate${this.colors.reset}`);
    console.log(`    Check data integrity`);
    console.log(`    ${this.colors.dim}Options: --fix (auto-repair), --verbose${this.colors.reset}`);
    console.log();
    console.log(`  ${this.colors.bold}relationship-export${this.colors.reset}`);
    console.log(`    Export to external formats`);
    console.log(`    ${this.colors.dim}Formats: json, graphml, dot, csv, cypher${this.colors.reset}`);
    console.log();
    console.log(`  ${this.colors.bold}relationship-stats${this.colors.reset}`);
    console.log(`    Show implementation progress`);
    console.log();

    console.log();
    this.printInfo('Use --help with any command for detailed usage');
    console.log();

    return this.success('Commands displayed');
  }

  private showMetrics(): CommandResult {
    this.printHeader('Understanding Graph Metrics');

    console.log();
    this.printSection('Core Metrics');
    console.log();
    console.log(`  ${this.colors.bold}Degree${this.colors.reset} - Total connections (in + out)`);
    console.log(`    ${this.colors.dim}Use case: Finding hubs (highly connected symbols)${this.colors.reset}`);
    console.log(`    ${this.colors.dim}High degree = symbol touches many parts of system${this.colors.reset}`);
    console.log();
    console.log(`  ${this.colors.bold}In-Degree${this.colors.reset} - Number of symbols depending on this`);
    console.log(`    ${this.colors.dim}Use case: Finding core dependencies${this.colors.reset}`);
    console.log(`    ${this.colors.dim}High in-degree = many symbols depend on this (must be stable)${this.colors.reset}`);
    console.log();
    console.log(`  ${this.colors.bold}Out-Degree${this.colors.reset} - Number of symbols this depends on`);
    console.log(`    ${this.colors.dim}Use case: Finding orchestrators${this.colors.reset}`);
    console.log(`    ${this.colors.dim}High out-degree = coordinates many components${this.colors.reset}`);
    console.log();

    this.printSection('Advanced Metrics');
    console.log();
    console.log(`  ${this.colors.bold}Betweenness Centrality${this.colors.reset} - Frequency on shortest paths`);
    console.log(`    ${this.colors.dim}Use case: Finding bottlenecks and bridges${this.colors.reset}`);
    console.log(`    ${this.colors.dim}High betweenness = information must flow through this symbol${this.colors.reset}`);
    console.log(`    ${this.colors.dim}Example: API gateway, central router${this.colors.reset}`);
    console.log();
    console.log(`  ${this.colors.bold}PageRank${this.colors.reset} - Importance based on incoming connection quality`);
    console.log(`    ${this.colors.dim}Use case: Finding influential symbols${this.colors.reset}`);
    console.log(`    ${this.colors.dim}High PageRank = referenced by other important symbols${this.colors.reset}`);
    console.log(`    ${this.colors.dim}Example: Fundamental interfaces, base classes${this.colors.reset}`);
    console.log();

    this.printSection('Architectural Patterns');
    console.log();
    console.log(`  ${this.colors.yellow}Critical Hub${this.colors.reset} - High degree + High betweenness`);
    console.log(`    ${this.colors.dim}→ Architectural bottleneck, changes have wide impact${this.colors.reset}`);
    console.log(`    ${this.colors.dim}→ Action: Feature flags, extensive testing, careful change management${this.colors.reset}`);
    console.log();
    console.log(`  ${this.colors.green}Core Component${this.colors.reset} - High in-degree + Low out-degree`);
    console.log(`    ${this.colors.dim}→ Many symbols depend on this${this.colors.reset}`);
    console.log(`    ${this.colors.dim}→ Action: Ensure stability, semantic versioning, comprehensive tests${this.colors.reset}`);
    console.log();
    console.log(`  ${this.colors.cyan}Orchestrator${this.colors.reset} - High out-degree + Low in-degree`);
    console.log(`    ${this.colors.dim}→ Coordinates many components, integration point${this.colors.reset}`);
    console.log(`    ${this.colors.dim}→ Action: Integration tests, monitor dependencies${this.colors.reset}`);
    console.log();
    console.log(`  ${this.colors.blue}Bridge${this.colors.reset} - High betweenness`);
    console.log(`    ${this.colors.dim}→ Connects different subsystems${this.colors.reset}`);
    console.log(`    ${this.colors.dim}→ Action: API stability, backward compatibility${this.colors.reset}`);
    console.log();

    console.log();
    this.printInfo('Try: tsdoc-edge relationship-metrics --detailed --top 10');
    console.log();

    return this.success('Metrics explained');
  }

  private showFormats(): CommandResult {
    this.printHeader('Export Format Guide');

    console.log();
    this.printSection('JSON - Programmatic Analysis');
    console.log(`  ${this.colors.bold}Best for:${this.colors.reset} Custom tools, data science, automation`);
    console.log(`  ${this.colors.bold}Size:${this.colors.reset} Large (14 MB for full export)`);
    console.log(`  ${this.colors.cyan}tsdoc-edge relationship-export --format json --output data.json${this.colors.reset}`);
    console.log();
    console.log(`  ${this.colors.dim}Use with: Python/Pandas, jq, custom scripts${this.colors.reset}`);
    console.log();

    this.printSection('GraphML - Visual Analysis');
    console.log(`  ${this.colors.bold}Best for:${this.colors.reset} Interactive graph visualization`);
    console.log(`  ${this.colors.bold}Tools:${this.colors.reset} Gephi, yEd, Cytoscape`);
    console.log(`  ${this.colors.cyan}tsdoc-edge relationship-export --format graphml --output graph.graphml${this.colors.reset}`);
    console.log();
    console.log(`  ${this.colors.dim}Gephi workflow:${this.colors.reset}`);
    console.log(`  ${this.colors.dim}1. File → Open → graph.graphml${this.colors.reset}`);
    console.log(`  ${this.colors.dim}2. Layout → ForceAtlas 2${this.colors.reset}`);
    console.log(`  ${this.colors.dim}3. Color nodes by category${this.colors.reset}`);
    console.log(`  ${this.colors.dim}4. Resize by degree${this.colors.reset}`);
    console.log();

    this.printSection('DOT - Documentation Diagrams');
    console.log(`  ${this.colors.bold}Best for:${this.colors.reset} Architecture documentation, reports`);
    console.log(`  ${this.colors.bold}Tool:${this.colors.reset} Graphviz`);
    console.log(`  ${this.colors.cyan}tsdoc-edge relationship-export --format dot --output graph.dot${this.colors.reset}`);
    console.log(`  ${this.colors.cyan}dot -Tpng graph.dot -o diagram.png${this.colors.reset}`);
    console.log();

    this.printSection('CSV - Spreadsheet Analysis');
    console.log(`  ${this.colors.bold}Best for:${this.colors.reset} Excel analysis, simple data exploration`);
    console.log(`  ${this.colors.bold}Tools:${this.colors.reset} Excel, Google Sheets, Python/Pandas`);
    console.log(`  ${this.colors.cyan}tsdoc-edge relationship-export --format csv --output data.csv${this.colors.reset}`);
    console.log();

    this.printSection('Cypher - Graph Database');
    console.log(`  ${this.colors.bold}Best for:${this.colors.reset} Complex graph queries, pattern matching`);
    console.log(`  ${this.colors.bold}Tool:${this.colors.reset} Neo4j`);
    console.log(`  ${this.colors.cyan}tsdoc-edge relationship-export --format cypher --output import.cypher${this.colors.reset}`);
    console.log();
    console.log(`  ${this.colors.dim}Neo4j example queries:${this.colors.reset}`);
    console.log(`  ${this.colors.dim}MATCH (s:Symbol)-[r:RELATES]->(t) RETURN s,r,t LIMIT 100${this.colors.reset}`);
    console.log(`  ${this.colors.dim}MATCH (s:Symbol)-[*]->(s) RETURN s  // Find cycles${this.colors.reset}`);
    console.log();

    this.printSection('Tips');
    console.log(`  • Filter before export: ${this.colors.dim}--category structural --min-confidence 0.8${this.colors.reset}`);
    console.log(`  • Start small: Export one category first to test your workflow`);
    console.log(`  • Structural relationships work best for architecture diagrams`);
    console.log();

    return this.success('Formats explained');
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
