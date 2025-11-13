/**
 * Commands module exports
 * @packageDocumentation
 */

export { BaseCommand, colors, type CommandResult } from './BaseCommand';
export { BuildCommand } from './BuildCommand';
export { UsageCommand } from './UsageCommand';
export { HelpCommand } from './HelpCommand';
export { AnalyzeCommand } from './AnalyzeCommand';
export { ValidateCommand } from './ValidateCommand';
export { HealthCommand } from './HealthCommand';
export { IndexDocsCommand } from './IndexDocsCommand';
export { ParseCommand } from './ParseCommand';
export { ValidateDocsCommand } from './ValidateDocsCommand';
export { UpdateBacklinksCommand } from './UpdateBacklinksCommand';
export { UpdateSymbolRefsCommand } from './UpdateSymbolRefsCommand';
export { CheckLinksCommand } from './CheckLinksCommand';
export {
  SuggestCommand,
  InitCommand,
  IdNewCommand,
  ValidateSpecCommand,
  GenerateDocsCommand,
} from './Phase4Commands';
export {
  DepsCommand,
  UsedByCommand,
  WhoUsesCommand,
  OrphansCommand,
  UndocumentedCommand,
  TreeCommand,
} from './Phase5Commands';
export { CheckDuplicatesCommand } from './CheckDuplicatesCommand';
export { SpecStatusCommand } from './SpecStatusCommand';
export { FindUnusedDocsCommand } from './FindUnusedDocsCommand';
export { SpecHistoryCommand } from './SpecHistoryCommand';
export { SpecDiffCommand } from './SpecDiffCommand';
export { SpecBumpCommand } from './SpecBumpCommand';
export { FindDocCommand } from './FindDocCommand';
export { PlansCommand } from './PlansCommand';
export {
  FindMethodCommand,
  TodosCommand,
  StatsCommand,
  CoreApiCommand,
  ScanCommand,
  SyncCoverageCommand,
} from './Phase7Commands';
export {
  UntestedCommand,
  WithoutResponsibilityCommand,
  WithoutContractCommand,
  FixCommand,
} from './Phase8Commands';
export {
  IdCommand,
  ImproveCommand,
  InstallHookCommand,
  UninstallHookCommand,
} from './Phase10Commands';
export { CommandRegistry } from './CommandRegistry';
export { AnalyzeIOCommand } from './AnalyzeIOCommand';
export { VisualizeDepsCommand } from './VisualizeDepsCommand';
export { CoverageReportCommand } from './CoverageReportCommand';
export { DetectDeadCodeCommand } from './DetectDeadCodeCommand';
export { SymbolQueryCommand } from './SymbolQueryCommand';
export { SymbolFixCommand } from './SymbolFixCommand';
export { AnalyzeConstraintsCommand } from './AnalyzeConstraintsCommand';
export { AnalyzeAlternativesCommand } from './AnalyzeAlternativesCommand';
export { AnalyzeBehavioralCommand } from './AnalyzeBehavioralCommand';
export { AnalyzeStructuralCommand } from './AnalyzeStructuralCommand';
export { AnalyzeFinalCommand } from './AnalyzeFinalCommand';
export { AnalyzeAllCommand } from './AnalyzeAllCommand';
export { RelationshipQueryCommand } from './RelationshipQueryCommand';
export { RelationshipImpactCommand } from './RelationshipImpactCommand';
export { RelationshipPathCommand } from './RelationshipPathCommand';
export { RelationshipValidateCommand } from './RelationshipValidateCommand';
export { RelationshipExportCommand } from './RelationshipExportCommand';
export { RelationshipVisualizeCommand } from './RelationshipVisualizeCommand';
export { RelationshipClustersCommand } from './RelationshipClustersCommand';
export { RelationshipMetricsCommand } from './RelationshipMetricsCommand';
export { RelationshipCheckCommand } from './RelationshipCheckCommand';
export { RelationshipHelpCommand } from './RelationshipHelpCommand';
export { RenameCommand } from './RenameCommand';
export { MoveCommand } from './MoveCommand';
export { SymbolRenameCommand } from './SymbolRenameCommand';
