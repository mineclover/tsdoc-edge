/**
 * Drizzle ORM Schema for TSDoc Edge
 * @packageDocumentation
 */

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

/**
 * Symbols table: Core symbol information
 */
export const symbols = sqliteTable('symbols', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // function, class, interface, constant, variable, etc.
  filePath: text('file_path').notNull(),
  line: integer('line').notNull(),
  column: integer('column').notNull(),
  isExported: integer('is_exported', { mode: 'boolean' }).notNull(),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull(),
  summary: text('summary'),
  // Type information
  declaredType: text('declared_type'),
  inferredType: text('inferred_type'),
  genericParams: text('generic_params'), // JSON array
  parameterTypes: text('parameter_types'), // JSON array
  // Constant/Value information
  isConstant: integer('is_constant', { mode: 'boolean' }).default(false),
  literalValue: text('literal_value'),
  valueType: text('value_type'),
  // Metadata
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: text('version').notNull(),
  jsonlLine: integer('jsonl_line').notNull(),
}, (table) => [
  index('idx_symbols_name').on(table.name),
  index('idx_symbols_type').on(table.type),
  index('idx_symbols_file').on(table.filePath),
  index('idx_symbols_public').on(table.isPublic),
]);

/**
 * Enhanced documentation table (Strict Mode)
 */
export const enhancedDocs = sqliteTable('enhanced_docs', {
  symbolId: text('symbol_id').primaryKey().references(() => symbols.id, { onDelete: 'cascade' }),
  problemSolving: text('problem_solving').notNull(), // JSON
  functionality: text('functionality').notNull(), // JSON
  errorExperiences: text('error_experiences').notNull(), // JSON array
  decisions: text('decisions').notNull(), // JSON array
  dependencies: text('dependencies').notNull(), // JSON array
  futurePlans: text('future_plans').notNull(), // JSON array
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: text('version').notNull(),
  jsonlLine: integer('jsonl_line').notNull(),
});

/**
 * Error experiences table
 */
export const errorExperiences = sqliteTable('error_experiences', {
  id: text('id').primaryKey(),
  symbolId: text('symbol_id').notNull().references(() => symbols.id, { onDelete: 'cascade' }),
  errorType: text('error_type').notNull(),
  message: text('message').notNull(),
  context: text('context').notNull(),
  solution: text('solution').notNull(),
  occurredAt: text('occurred_at'),
  prevention: text('prevention'),
}, (table) => [
  index('idx_errors_symbol').on(table.symbolId),
  index('idx_errors_type').on(table.errorType),
]);

/**
 * Decision records table
 */
export const decisionRecords = sqliteTable('decision_records', {
  id: text('id').primaryKey(),
  symbolId: text('symbol_id').references(() => symbols.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  decision: text('decision').notNull(),
  rationale: text('rationale').notNull(),
  status: text('status').notNull(),
  date: text('date').notNull(),
  supersededBy: text('superseded_by'),
}, (table) => [
  index('idx_decisions_symbol').on(table.symbolId),
  index('idx_decisions_status').on(table.status),
]);

/**
 * Future plans table
 */
export const futurePlans = sqliteTable('future_plans', {
  id: text('id').primaryKey(),
  symbolId: text('symbol_id').references(() => symbols.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  priority: text('priority').notNull(),
  status: text('status').notNull(),
  targetMilestone: text('target_milestone'),
  estimatedEffort: text('estimated_effort'),
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
}, (table) => [
  index('idx_plans_symbol').on(table.symbolId),
  index('idx_plans_status').on(table.status),
  index('idx_plans_priority').on(table.priority),
]);

/**
 * Dependencies table (Legacy)
 */
export const dependencies = sqliteTable('dependencies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  symbolId: text('symbol_id').notNull().references(() => symbols.id, { onDelete: 'cascade' }),
  target: text('target').notNull(),
  type: text('type').notNull(),
  reason: text('reason').notNull(),
  version: text('version'),
  isOptional: integer('is_optional', { mode: 'boolean' }).default(false),
  importPath: text('import_path'),
}, (table) => [
  index('idx_dependencies_symbol').on(table.symbolId),
  index('idx_dependencies_target').on(table.target),
]);

/**
 * Unified relationships table
 */
export const unifiedRelationships = sqliteTable('unified_relationships', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 17+ types
  category: text('category').notNull(), // 7 categories
  fromSymbols: text('from_symbols').notNull(), // JSON array
  toSymbols: text('to_symbols').notNull(), // JSON array
  direction: text('direction').notNull(), // unidirectional, bidirectional, undirected
  strength: text('strength').notNull(), // strong, medium, weak
  evidence: text('evidence').notNull(), // JSON array
  discoveredBy: text('discovered_by').notNull(),
  confidence: real('confidence').notNull(),
  filePath: text('file_path'),
  line: integer('line'),
  properties: text('properties'), // JSON
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  description: text('description'),
}, (table) => [
  index('idx_ur_type').on(table.type),
  index('idx_ur_category').on(table.category),
  index('idx_ur_strength').on(table.strength),
  index('idx_ur_confidence').on(table.confidence),
]);

/**
 * Test mappings table
 */
export const testMappings = sqliteTable('test_mappings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  symbolId: text('symbol_id').notNull().references(() => symbols.id, { onDelete: 'cascade' }),
  testFilePath: text('test_file_path').notNull(),
  testName: text('test_name').notNull(),
  scenarios: text('scenarios').notNull(), // JSON array
  coverage: text('coverage'), // JSON
}, (table) => [
  index('idx_tests_symbol').on(table.symbolId),
  index('idx_tests_file').on(table.testFilePath),
]);

/**
 * Contracts table
 */
export const contracts = sqliteTable('contracts', {
  symbolId: text('symbol_id').primaryKey().references(() => symbols.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  preconditions: text('preconditions').notNull(), // JSON array
  postconditions: text('postconditions').notNull(), // JSON array
  invariants: text('invariants').notNull(), // JSON array
  filePath: text('file_path').notNull(),
});

/**
 * Responsibilities table
 */
export const responsibilities = sqliteTable('responsibilities', {
  symbolId: text('symbol_id').primaryKey().references(() => symbols.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  shouldDo: text('should_do').notNull(), // JSON array
  shouldNotDo: text('should_not_do').notNull(), // JSON array
  pattern: text('pattern'),
  architecture: text('architecture'),
});

/**
 * Indexing rules table
 */
export const indexingRules = sqliteTable('indexing_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ruleName: text('rule_name').notNull().unique(),
  ruleType: text('rule_type').notNull(), // fts, btree, hash
  targetTable: text('target_table').notNull(),
  targetColumns: text('target_columns').notNull(), // JSON array
  priority: integer('priority').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  description: text('description'),
});

/**
 * Sync metadata table
 */
export const syncMetadata = sqliteTable('sync_metadata', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filePath: text('file_path').notNull().unique(),
  lastSync: text('last_sync').notNull(),
  totalRecords: integer('total_records').notNull(),
  hash: text('hash').notNull(),
  status: text('status').notNull(), // synced, modified, error
});

// Type exports for use in application code
export type Symbol = typeof symbols.$inferSelect;
export type NewSymbol = typeof symbols.$inferInsert;

export type EnhancedDoc = typeof enhancedDocs.$inferSelect;
export type NewEnhancedDoc = typeof enhancedDocs.$inferInsert;

export type ErrorExperience = typeof errorExperiences.$inferSelect;
export type NewErrorExperience = typeof errorExperiences.$inferInsert;

export type DecisionRecord = typeof decisionRecords.$inferSelect;
export type NewDecisionRecord = typeof decisionRecords.$inferInsert;

export type FuturePlan = typeof futurePlans.$inferSelect;
export type NewFuturePlan = typeof futurePlans.$inferInsert;

export type Dependency = typeof dependencies.$inferSelect;
export type NewDependency = typeof dependencies.$inferInsert;

export type UnifiedRelationship = typeof unifiedRelationships.$inferSelect;
export type NewUnifiedRelationship = typeof unifiedRelationships.$inferInsert;

export type TestMapping = typeof testMappings.$inferSelect;
export type NewTestMapping = typeof testMappings.$inferInsert;

export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;

export type Responsibility = typeof responsibilities.$inferSelect;
export type NewResponsibility = typeof responsibilities.$inferInsert;

export type IndexingRule = typeof indexingRules.$inferSelect;
export type NewIndexingRule = typeof indexingRules.$inferInsert;

export type SyncMetadataRow = typeof syncMetadata.$inferSelect;
export type NewSyncMetadata = typeof syncMetadata.$inferInsert;
