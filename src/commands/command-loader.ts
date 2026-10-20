/**
 * Command Loader - Declarative, lazily loaded CLI command table
 *
 * Every command is declared by name and aliases so the CLI can resolve a command without
 * loading any other command module. A command module (and everything it imports, such as
 * the TypeScript compiler or SQLite) is only required the first time that command is used.
 *
 * Registration order matters: when two commands declare the same name or alias the later
 * entry wins, exactly like {@link CommandRegistry.register}. `http-endpoints` declares
 * `endpoints` and `routes` as aliases, so `endpoints` resolves to `http-endpoints` (the
 * `endpoints` command stays reachable as `ep`) while the later `routes` command keeps `routes`.
 *
 * @packageDocumentation
 */

import type { BaseCommand } from './BaseCommand';
import type { CommandFactory, CommandRegistry } from './CommandRegistry';
import { HelpCommand } from './HelpCommand';

/** Declaration of one lazily loaded command. */
export interface CommandSpec {
  /** Primary command name; must equal the command's `getName()`. */
  readonly name: string;
  /** Alternative names; must equal the command's `getAlias()`. */
  readonly aliases: readonly string[];
  /** Requires the command module and builds the command. */
  readonly create: CommandFactory;
}

function command(name: string, aliases: readonly string[], create: () => BaseCommand): CommandSpec {
  return { name, aliases, create };
}

/** All commands except `help`, in registration order. */
export const COMMAND_SPECS: readonly CommandSpec[] = [
  // Core workflow
  command('build', ['b'], () => {
    const { BuildCommand } = require('./BuildCommand') as typeof import('./BuildCommand');
    return new BuildCommand();
  }),
  command('work-context', ['wc'], () => {
    const { WorkContextCommand } =
      require('./WorkContextCommand') as typeof import('./WorkContextCommand');
    return new WorkContextCommand();
  }),
  command('design-context', ['dc'], () => {
    const { DesignContextCommand } =
      require('./DesignContextCommand') as typeof import('./DesignContextCommand');
    return new DesignContextCommand();
  }),
  command('health', ['h'], () => {
    const { HealthCommand } = require('./HealthCommand') as typeof import('./HealthCommand');
    return new HealthCommand();
  }),
  command('stats', ['s'], () => {
    const { StatsCommand } = require('./StatsCommand') as typeof import('./StatsCommand');
    return new StatsCommand();
  }),
  command('init', [], () => {
    const { InitCommand } = require('./InitCommand') as typeof import('./InitCommand');
    return new InitCommand();
  }),

  // Unified commands
  command('val', ['v', 'validate'], () => {
    const { ValidateUnifiedCommand } =
      require('./ValidateUnifiedCommand') as typeof import('./ValidateUnifiedCommand');
    return new ValidateUnifiedCommand();
  }),
  command('symbol', ['sym'], () => {
    const { SymbolUnifiedCommand } =
      require('./SymbolUnifiedCommand') as typeof import('./SymbolUnifiedCommand');
    return new SymbolUnifiedCommand();
  }),
  command('relationship', ['rel', 'r'], () => {
    const { RelationshipCommand } =
      require('./RelationshipCommand') as typeof import('./RelationshipCommand');
    return new RelationshipCommand();
  }),
  command('spec', [], () => {
    const { SpecCommand } = require('./SpecCommand') as typeof import('./SpecCommand');
    return new SpecCommand();
  }),
  command('task', [], () => {
    const { TaskCommand } = require('./TaskCommand') as typeof import('./TaskCommand');
    return new TaskCommand();
  }),
  command('ontology', [], () => {
    const { OntologyCommand } = require('./OntologyCommand') as typeof import('./OntologyCommand');
    return new OntologyCommand();
  }),
  command('docs', ['d'], () => {
    const { DocsCommand } = require('./DocsCommand') as typeof import('./DocsCommand');
    return new DocsCommand();
  }),
  command('convention', ['conv'], () => {
    const { ConventionCommand } =
      require('./ConventionCommand') as typeof import('./ConventionCommand');
    return new ConventionCommand();
  }),

  // Preserve published flat command paths while docs/validate groups are the preferred surface
  command('index-docs', [], () => {
    const { IndexDocsCommand } =
      require('./IndexDocsCommand') as typeof import('./IndexDocsCommand');
    return new IndexDocsCommand(undefined, undefined, undefined, true);
  }),
  command('update-backlinks', [], () => {
    const { UpdateBacklinksCommand } =
      require('./UpdateBacklinksCommand') as typeof import('./UpdateBacklinksCommand');
    return new UpdateBacklinksCommand(undefined, undefined, undefined, undefined, true);
  }),
  command('validate-docs', [], () => {
    const { ValidateDocsCommand } =
      require('./ValidateDocsCommand') as typeof import('./ValidateDocsCommand');
    return new ValidateDocsCommand(undefined, undefined, true);
  }),
  command('validate-symbol-refs', [], () => {
    const { ValidateSymbolRefsCommand } =
      require('./ValidateSymbolRefsCommand') as typeof import('./ValidateSymbolRefsCommand');
    return new ValidateSymbolRefsCommand();
  }),

  // Analysis & tools
  command('analyze', [], () => {
    const { AnalyzeCommand } = require('./AnalyzeCommand') as typeof import('./AnalyzeCommand');
    return new AnalyzeCommand();
  }),
  command('suggest', [], () => {
    const { SuggestCommand } = require('./SuggestCommand') as typeof import('./SuggestCommand');
    return new SuggestCommand();
  }),
  command('fix', [], () => {
    const { FixCommand } = require('./FixCommand') as typeof import('./FixCommand');
    return new FixCommand();
  }),
  command('improve', [], () => {
    const { ImproveCommand } = require('./ImproveCommand') as typeof import('./ImproveCommand');
    return new ImproveCommand();
  }),
  command('lint', [], () => {
    const { LintCommand } = require('./LintCommand') as typeof import('./LintCommand');
    return new LintCommand();
  }),

  // Code exploration
  command('parse', [], () => {
    const { ParseCommand } = require('./ParseCommand') as typeof import('./ParseCommand');
    return new ParseCommand();
  }),
  command('tree', [], () => {
    const { TreeCommand } = require('./TreeCommand') as typeof import('./TreeCommand');
    return new TreeCommand();
  }),
  command('undocumented', [], () => {
    const { UndocumentedCommand } =
      require('./UndocumentedCommand') as typeof import('./UndocumentedCommand');
    return new UndocumentedCommand();
  }),
  command('untested', [], () => {
    const { UntestedCommand } = require('./UntestedCommand') as typeof import('./UntestedCommand');
    return new UntestedCommand();
  }),
  command('core-api', [], () => {
    const { CoreApiCommand } = require('./CoreApiCommand') as typeof import('./CoreApiCommand');
    return new CoreApiCommand();
  }),
  command('doc-symbols', ['glossary'], () => {
    const { DocSymbolsCommand } =
      require('./DocSymbolsCommand') as typeof import('./DocSymbolsCommand');
    return new DocSymbolsCommand();
  }),
  command('plans', [], () => {
    const { PlansCommand } = require('./PlansCommand') as typeof import('./PlansCommand');
    return new PlansCommand();
  }),
  command('todos', [], () => {
    const { TodosCommand } = require('./TodosCommand') as typeof import('./TodosCommand');
    return new TodosCommand();
  }),

  // Specialized
  command('visualize', [], () => {
    const { VisualizeDepsCommand } =
      require('./VisualizeDepsCommand') as typeof import('./VisualizeDepsCommand');
    return new VisualizeDepsCommand();
  }),
  command('check-duplicates', [], () => {
    const { CheckDuplicatesCommand } =
      require('./CheckDuplicatesCommand') as typeof import('./CheckDuplicatesCommand');
    return new CheckDuplicatesCommand();
  }),
  command('parallel-work', [], () => {
    const { ParallelWorkCommand } =
      require('./ParallelWorkCommand') as typeof import('./ParallelWorkCommand');
    return new ParallelWorkCommand();
  }),
  command('test-relationships', [], () => {
    const { TestRelationshipsCommand } =
      require('./TestRelationshipsCommand') as typeof import('./TestRelationshipsCommand');
    return new TestRelationshipsCommand();
  }),
  command('system-status', ['status', 'ss'], () => {
    const { SystemStatusCommand } =
      require('./SystemStatusCommand') as typeof import('./SystemStatusCommand');
    return new SystemStatusCommand();
  }),
  command('test-examples', ['examples', 'tex'], () => {
    const { TestExamplesCommand } =
      require('./TestExamplesCommand') as typeof import('./TestExamplesCommand');
    return new TestExamplesCommand();
  }),
  command('explore-entrypoint', [], () => {
    const { ExploreEntrypointCommand } =
      require('./ExploreEntrypointCommand') as typeof import('./ExploreEntrypointCommand');
    return new ExploreEntrypointCommand();
  }),
  command('parse-mermaid', [], () => {
    const { ParseMermaidCommand } =
      require('./ParseMermaidCommand') as typeof import('./ParseMermaidCommand');
    return new ParseMermaidCommand();
  }),
  command('promote-symbol', [], () => {
    const { PromoteSymbolCommand } =
      require('./PromoteSymbolCommand') as typeof import('./PromoteSymbolCommand');
    return new PromoteSymbolCommand();
  }),
  command('coverage-report', [], () => {
    const { CoverageReportCommand } =
      require('./CoverageReportCommand') as typeof import('./CoverageReportCommand');
    return new CoverageReportCommand();
  }),
  command('detect-dead-code', [], () => {
    const { DetectDeadCodeCommand } =
      require('./DetectDeadCodeCommand') as typeof import('./DetectDeadCodeCommand');
    return new DetectDeadCodeCommand();
  }),
  command('query-inferred', [], () => {
    const { QueryInferredCommand } =
      require('./QueryInferredCommand') as typeof import('./QueryInferredCommand');
    return new QueryInferredCommand();
  }),
  command('move', [], () => {
    const { MoveCommand } = require('./MoveCommand') as typeof import('./MoveCommand');
    return new MoveCommand();
  }),
  command('sync-coverage', [], () => {
    const { SyncCoverageCommand } =
      require('./SyncCoverageCommand') as typeof import('./SyncCoverageCommand');
    return new SyncCoverageCommand();
  }),
  command('rebuild-index', [], () => {
    const { RebuildIndexCommand } =
      require('./RebuildIndexCommand') as typeof import('./RebuildIndexCommand');
    return new RebuildIndexCommand();
  }),
  command('id', [], () => {
    const { IdCommand } = require('./IdCommand') as typeof import('./IdCommand');
    return new IdCommand();
  }),

  // Utility
  command('usage', [], () => {
    const { UsageCommand } = require('./UsageCommand') as typeof import('./UsageCommand');
    return new UsageCommand();
  }),
  command('install-hook', [], () => {
    const { InstallHookCommand } =
      require('./InstallHookCommand') as typeof import('./InstallHookCommand');
    return new InstallHookCommand();
  }),
  command('uninstall-hook', [], () => {
    const { UninstallHookCommand } =
      require('./UninstallHookCommand') as typeof import('./UninstallHookCommand');
    return new UninstallHookCommand();
  }),

  // Standalone utility commands
  command('check-links', [], () => {
    const { CheckLinksCommand } =
      require('./CheckLinksCommand') as typeof import('./CheckLinksCommand');
    return new CheckLinksCommand();
  }),
  command('deps', [], () => {
    const { DepsCommand } = require('./DepsCommand') as typeof import('./DepsCommand');
    return new DepsCommand();
  }),
  command('who-uses', [], () => {
    const { WhoUsesCommand } = require('./WhoUsesCommand') as typeof import('./WhoUsesCommand');
    return new WhoUsesCommand();
  }),
  command('orphans', [], () => {
    const { OrphansCommand } = require('./OrphansCommand') as typeof import('./OrphansCommand');
    return new OrphansCommand();
  }),
  command('pre-commit-run', [], () => {
    const { PreCommitRunCommand } =
      require('./PreCommitRunCommand') as typeof import('./PreCommitRunCommand');
    return new PreCommitRunCommand();
  }),

  // Analysis commands
  command('endpoints', ['ep'], () => {
    const { EndpointsCommand } =
      require('./EndpointsCommand') as typeof import('./EndpointsCommand');
    return new EndpointsCommand();
  }),
  command('http-endpoints', ['endpoints', 'routes'], () => {
    const { HttpEndpointsCommand } =
      require('./HttpEndpointsCommand') as typeof import('./HttpEndpointsCommand');
    return new HttpEndpointsCommand();
  }),
  command('blocks', ['bl'], () => {
    const { BlocksCommand } = require('./BlocksCommand') as typeof import('./BlocksCommand');
    return new BlocksCommand();
  }),
  command('hubs', [], () => {
    const { HubsCommand } = require('./HubsCommand') as typeof import('./HubsCommand');
    return new HubsCommand();
  }),
  command('layers', [], () => {
    const { LayersCommand } = require('./LayersCommand') as typeof import('./LayersCommand');
    return new LayersCommand();
  }),
  command('common', [], () => {
    const { CommonCommand } = require('./CommonCommand') as typeof import('./CommonCommand');
    return new CommonCommand();
  }),
  command('routes', [], () => {
    const { RoutesCommand } = require('./RoutesCommand') as typeof import('./RoutesCommand');
    return new RoutesCommand();
  }),
];

/**
 * Register every CLI command with the registry without loading any command module.
 *
 * `help` is registered eagerly because it needs the registry to list the other commands.
 *
 * @param registry - Registry to populate
 */
export function registerAllCommands(registry: CommandRegistry): void {
  for (const spec of COMMAND_SPECS) {
    registry.registerLazy(spec.name, spec.aliases, spec.create);
  }

  registry.register(new HelpCommand(registry));
}
