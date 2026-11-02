/**
 * Commands module exports
 *
 * @packageDocumentation
 * @doc [[CliCommandSurfaceSpecification]]
 * @doc [[CLI Commands]]
 * @context Public command barrel for the TSDoc Edge CLI command surface
 * @functionality Re-exports top-level CLI commands, unified command routers, subcommands, and base command utilities
 */

export { AnalyzeRelationshipsCommand } from './AnalyzeRelationshipsCommand';
export { BaseCommand, type CommandResult, colors } from './BaseCommand';
export { BuildCommand } from './BuildCommand';
export { CanonicalGraphCommand } from './CanonicalGraphCommand';
export { CheckDuplicatesCommand } from './CheckDuplicatesCommand';
export { CheckLinksCommand } from './CheckLinksCommand';
export { CommandRegistry } from './CommandRegistry';
export { ConventionCheckCommand } from './ConventionCheckCommand';
export { ConventionCommand } from './ConventionCommand';
export { ConventionInputsCommand } from './ConventionInputsCommand';
export { ConventionRetentionCommand } from './ConventionRetentionCommand';
export { CoreApiCommand } from './CoreApiCommand';
export { CoverageBaselineCommand } from './CoverageBaselineCommand';
export { CoverageReportCommand } from './CoverageReportCommand';
export { DataTraceCommand, formatDataTraceLlmMarkdown } from './DataTraceCommand';
export { DepsCommand } from './DepsCommand';
export { DesignContextCommand } from './DesignContextCommand';
export { DocSymbolsCommand } from './DocSymbolsCommand';
export { DocsCommand } from './DocsCommand';
export { FindMethodCommand } from './FindMethodCommand';
export { FindUnusedDocsCommand } from './FindUnusedDocsCommand';
export { FixCommand } from './FixCommand';
export { HealthCommand } from './HealthCommand';
export { HelpCommand } from './HelpCommand';
export { IndexDocsCommand } from './IndexDocsCommand';
export { InitCommand } from './InitCommand';
export { LintCommand } from './LintCommand';
export { MoveCommand } from './MoveCommand';
export { OntologyCommand } from './OntologyCommand';
export { OrphansCommand } from './OrphansCommand';
export { ParseCommand } from './ParseCommand';
export { PlansCommand } from './PlansCommand';
export { PromoteSymbolCommand } from './PromoteSymbolCommand';
export { RelationshipCheckCommand } from './RelationshipCheckCommand';
export { RelationshipClustersCommand } from './RelationshipClustersCommand';
export { RelationshipCommand } from './RelationshipCommand';
export { RelationshipExportCommand } from './RelationshipExportCommand';
export { RelationshipHelpCommand } from './RelationshipHelpCommand';
export { RelationshipImpactCommand } from './RelationshipImpactCommand';
export { RelationshipMetricsCommand } from './RelationshipMetricsCommand';
export { RelationshipPathCommand } from './RelationshipPathCommand';
export { RelationshipQueryCommand } from './RelationshipQueryCommand';
export { RelationshipStatsCommand } from './RelationshipStatsCommand';
export { RelationshipValidateCommand } from './RelationshipValidateCommand';
export { RelationshipVisualizeCommand } from './RelationshipVisualizeCommand';
export { registerCliCommands } from './registerCliCommands';
export { SpecBumpCommand } from './SpecBumpCommand';
export { SpecCommand } from './SpecCommand';
export { SpecDiffCommand } from './SpecDiffCommand';
export { SpecExtractCommand } from './SpecExtractCommand';
export { SpecGraphCommand } from './SpecGraphCommand';
export { SpecHistoryCommand } from './SpecHistoryCommand';
export { SpecMetricsCommand } from './SpecMetricsCommand';
export { SpecStatusCommand } from './SpecStatusCommand';
export { StatsCommand } from './StatsCommand';
export { SuggestCommand } from './SuggestCommand';
export { SymbolUnifiedCommand } from './SymbolUnifiedCommand';
export { SyncCommand } from './SyncCommand';
export { SystemStatusCommand } from './SystemStatusCommand';
export { TodosCommand } from './TodosCommand';
export { TreeCommand } from './TreeCommand';
export { UndocumentedCommand } from './UndocumentedCommand';
export { UntestedCommand } from './UntestedCommand';
export { UpdateBacklinksCommand } from './UpdateBacklinksCommand';
export { UpdateSymbolRefsCommand } from './UpdateSymbolRefsCommand';
export { ValidateDocsCommand } from './ValidateDocsCommand';
export { ValidateSymbolRefsCommand } from './ValidateSymbolRefsCommand';
export { ValidateTsdocCommand } from './ValidateTsdocCommand';
export { ValidateUnifiedCommand } from './ValidateUnifiedCommand';
export { WhoUsesCommand } from './WhoUsesCommand';
export { WorkContextCommand } from './WorkContextCommand';
