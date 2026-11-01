/**
 * Canonical CLI command registration for TSDoc Edge.
 *
 * Registers the 20 top-level commands (10 core workflow/status commands,
 * 7 unified command groups, and 3 revision/coverage contract commands).
 *
 * @packageDocumentation
 * @doc [[CliCommandSurfaceSpecification]]
 * @doc [[CLI Commands]]
 * @context Canonical 20-command top-level CLI surface assembly
 * @functionality Instantiates and registers core workflow commands, unified command groups, and revision/coverage contract commands into a `CommandRegistry`
 */

import { BuildCommand } from './BuildCommand';
import { CanonicalGraphCommand } from './CanonicalGraphCommand';
import { CommandRegistry } from './CommandRegistry';
import { ConventionCommand } from './ConventionCommand';
import { CoverageBaselineCommand } from './CoverageBaselineCommand';
import { CoverageReportCommand } from './CoverageReportCommand';
import { DesignContextCommand } from './DesignContextCommand';
import { DocsCommand } from './DocsCommand';
import { HealthCommand } from './HealthCommand';
import { HelpCommand } from './HelpCommand';
import { InitCommand } from './InitCommand';
import { LintCommand } from './LintCommand';
import { OntologyCommand } from './OntologyCommand';
import { RelationshipCommand } from './RelationshipCommand';
import { SpecCommand } from './SpecCommand';
import { StatsCommand } from './StatsCommand';
import { SymbolUnifiedCommand } from './SymbolUnifiedCommand';
import { SyncCommand } from './SyncCommand';
import { SystemStatusCommand } from './SystemStatusCommand';
import { ValidateUnifiedCommand } from './ValidateUnifiedCommand';
import { WorkContextCommand } from './WorkContextCommand';

/**
 * Populate a `CommandRegistry` with the canonical 20 top-level TSDoc Edge CLI commands.
 *
 * @doc [[CliCommandSurfaceSpecification]]
 * @doc [[CLI Commands]]
 * @param registry - Optional registry instance (creates a new `CommandRegistry` when omitted)
 * @returns Populated `CommandRegistry`
 * @public
 */
export function registerCliCommands(
  registry: CommandRegistry = new CommandRegistry()
): CommandRegistry {
  // 1. Core workflow & diagnostics (9 + HelpCommand = 10)
  registry.register(new InitCommand());
  registry.register(new SyncCommand());
  registry.register(new BuildCommand());
  registry.register(new WorkContextCommand());
  registry.register(new DesignContextCommand());
  registry.register(new SystemStatusCommand());
  registry.register(new StatsCommand());
  registry.register(new HealthCommand());
  registry.register(new LintCommand());

  // 2. Unified command groups (7)
  registry.register(new SymbolUnifiedCommand());
  registry.register(new RelationshipCommand());
  registry.register(new DocsCommand());
  registry.register(new ValidateUnifiedCommand());
  registry.register(new SpecCommand());
  registry.register(new ConventionCommand());
  registry.register(new OntologyCommand());

  // 3. Revision & coverage contract commands (3)
  registry.register(new CanonicalGraphCommand());
  registry.register(new CoverageReportCommand());
  registry.register(new CoverageBaselineCommand());

  // Help (1)
  registry.register(new HelpCommand(registry));
  return registry;
}
