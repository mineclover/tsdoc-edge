/**
 * Drizzle ORM Schema for TSDoc Edge
 * @packageDocumentation
 */

import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Symbols table: Core symbol information
 */
export const symbols = sqliteTable(
  'symbols',
  {
    // Legacy ID (kept for backwards compatibility)
    id: text('id').primaryKey(),
    // New stable identifier system (optional for backwards compatibility)
    uuid: text('uuid').unique(),
    localPath: text('local_path'),
    globalPath: text('global_path'),
    scope: text('scope'),
    // Core symbol info
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
    // Exposure and visibility tracking
    exposureScope: text('exposure_scope'), // JSON: {level, boundaries, exportedVia}
    exposureLevel: text('exposure_level'), // public, package, module, file, private
    exportPath: text('export_path'), // Actual import path (@pkg/module/subpath)
    accessibility: text('accessibility'), // public, protected, private, internal
    visibilityBoundaries: text('visibility_boundaries'), // JSON: {canBeImportedBy, restrictedTo, reason}
    // Metadata
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    version: text('version').notNull(),
    jsonlLine: integer('jsonl_line').notNull(),
  },
  (table) => [
    index('idx_symbols_uuid').on(table.uuid),
    index('idx_symbols_local_path').on(table.localPath),
    index('idx_symbols_global_path').on(table.globalPath),
    index('idx_symbols_scope').on(table.scope),
    index('idx_symbols_name').on(table.name),
    index('idx_symbols_type').on(table.type),
    index('idx_symbols_file').on(table.filePath),
    index('idx_symbols_public').on(table.isPublic),
    index('idx_symbols_exposure').on(table.exposureLevel),
    index('idx_symbols_accessibility').on(table.accessibility),
  ]
);

/**
 * Enhanced documentation table (Strict Mode)
 */
export const enhancedDocs = sqliteTable('enhanced_docs', {
  symbolId: text('symbol_id')
    .primaryKey()
    .references(() => symbols.id, { onDelete: 'cascade' }),
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
export const errorExperiences = sqliteTable(
  'error_experiences',
  {
    id: text('id').primaryKey(),
    symbolId: text('symbol_id')
      .notNull()
      .references(() => symbols.id, { onDelete: 'cascade' }),
    errorType: text('error_type').notNull(),
    message: text('message').notNull(),
    context: text('context').notNull(),
    solution: text('solution').notNull(),
    occurredAt: text('occurred_at'),
    prevention: text('prevention'),
  },
  (table) => [
    index('idx_errors_symbol').on(table.symbolId),
    index('idx_errors_type').on(table.errorType),
  ]
);

/**
 * Decision records table
 */
export const decisionRecords = sqliteTable(
  'decision_records',
  {
    id: text('id').primaryKey(),
    symbolId: text('symbol_id').references(() => symbols.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    decision: text('decision').notNull(),
    rationale: text('rationale').notNull(),
    status: text('status').notNull(),
    date: text('date').notNull(),
    supersededBy: text('superseded_by'),
  },
  (table) => [
    index('idx_decisions_symbol').on(table.symbolId),
    index('idx_decisions_status').on(table.status),
  ]
);

/**
 * Future plans table
 */
export const futurePlans = sqliteTable(
  'future_plans',
  {
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
  },
  (table) => [
    index('idx_plans_symbol').on(table.symbolId),
    index('idx_plans_status').on(table.status),
    index('idx_plans_priority').on(table.priority),
  ]
);

/**
 * Dependencies table (Legacy)
 */
export const dependencies = sqliteTable(
  'dependencies',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    symbolId: text('symbol_id')
      .notNull()
      .references(() => symbols.id, { onDelete: 'cascade' }),
    target: text('target').notNull(),
    type: text('type').notNull(),
    reason: text('reason').notNull(),
    version: text('version'),
    isOptional: integer('is_optional', { mode: 'boolean' }).default(false),
    importPath: text('import_path'),
  },
  (table) => [
    index('idx_dependencies_symbol').on(table.symbolId),
    index('idx_dependencies_target').on(table.target),
  ]
);

/**
 * Unified relationships table
 */
export const unifiedRelationships = sqliteTable(
  'unified_relationships',
  {
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
    // Inheritance-specific fields
    abstractionFrom: text('abstraction_from'), // concrete, abstract, interface, mixin
    abstractionTo: text('abstraction_to'),
    hierarchyDepth: integer('hierarchy_depth'), // 0 = direct, 1+ = transitive
    inheritanceChain: text('inheritance_chain'), // JSON array: ["Child", "Parent", "GrandParent"]
    overriddenMembers: text('overridden_members'), // JSON array: ["method1", "method2"]
    // Metadata
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    description: text('description'),
  },
  (table) => [
    index('idx_ur_type').on(table.type),
    index('idx_ur_category').on(table.category),
    index('idx_ur_strength').on(table.strength),
    index('idx_ur_confidence').on(table.confidence),
  ]
);

/**
 * Relationship symbols join table for fast O(1) lookups
 * Replaces expensive LIKE '%symbolId%' queries with indexed JOIN
 */
export const relationshipSymbols = sqliteTable(
  'relationship_symbols',
  {
    relationshipId: text('relationship_id')
      .notNull()
      .references(() => unifiedRelationships.id, { onDelete: 'cascade' }),
    symbolId: text('symbol_id').notNull(),
    role: text('role').notNull(), // 'from' or 'to'
  },
  (table) => [
    index('idx_rs_symbol').on(table.symbolId),
    index('idx_rs_symbol_role').on(table.symbolId, table.role),
  ]
);

/**
 * Test mappings table
 */
export const testMappings = sqliteTable(
  'test_mappings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    symbolId: text('symbol_id')
      .notNull()
      .references(() => symbols.id, { onDelete: 'cascade' }),
    testFilePath: text('test_file_path').notNull(),
    testName: text('test_name').notNull(),
    scenarios: text('scenarios').notNull(), // JSON array
    coverage: text('coverage'), // JSON
  },
  (table) => [
    index('idx_tests_symbol').on(table.symbolId),
    index('idx_tests_file').on(table.testFilePath),
  ]
);

/**
 * Contracts table
 */
export const contracts = sqliteTable('contracts', {
  symbolId: text('symbol_id')
    .primaryKey()
    .references(() => symbols.id, { onDelete: 'cascade' }),
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
  symbolId: text('symbol_id')
    .primaryKey()
    .references(() => symbols.id, { onDelete: 'cascade' }),
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

/**
 * Tasks table for project management
 */
export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull(),
    priority: text('priority').notNull(),
    type: text('type').notNull(),
    assignedTo: text('assigned_to'),
    symbolId: text('symbol_id'),
    filePath: text('file_path'),
    line: integer('line'),
    estimatedHours: real('estimated_hours'),
    actualHours: real('actual_hours'),
    dueDate: text('due_date'),
    parentId: text('parent_id'),
    dependencies: text('dependencies'), // JSON array
    tags: text('tags'), // JSON array
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    completedAt: text('completed_at'),
    notes: text('notes'),
  },
  (table) => [
    index('idx_tasks_status').on(table.status),
    index('idx_tasks_priority').on(table.priority),
    index('idx_tasks_symbol').on(table.symbolId),
    index('idx_tasks_file').on(table.filePath),
    index('idx_tasks_due').on(table.dueDate),
  ]
);

/**
 * HTTP Endpoints table (for API route tracking)
 */
export const endpoints = sqliteTable(
  'endpoints',
  {
    id: text('id').primaryKey(),
    method: text('method').notNull(), // GET, POST, PUT, DELETE, PATCH
    path: text('path').notNull(), // /api/users/:id
    pathParams: text('path_params'), // JSON array: ["id"]
    queryParams: text('query_params'), // JSON array: ["limit", "offset"]
    handlerSymbolId: text('handler_symbol_id').references(() => symbols.id, {
      onDelete: 'cascade',
    }),
    controllerSymbolId: text('controller_symbol_id'), // Controller class symbol ID (if applicable)
    requestType: text('request_type'), // DTO type for request body
    responseType: text('response_type'), // DTO type for response
    scope: text('scope').notNull(), // public, internal, private, admin
    middlewares: text('middlewares'), // JSON array of middleware symbol IDs
    filePath: text('file_path').notNull(),
    line: integer('line'),
    description: text('description'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_endpoints_path').on(table.path),
    index('idx_endpoints_method').on(table.method),
    index('idx_endpoints_scope').on(table.scope),
    index('idx_endpoints_handler').on(table.handlerSymbolId),
  ]
);

/**
 * Code Blocks table (for block-level chunking)
 */
export const codeBlocks = sqliteTable(
  'code_blocks',
  {
    id: text('id').primaryKey(),
    symbolId: text('symbol_id')
      .notNull()
      .references(() => symbols.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // validation, transformation, query, mutation, etc.
    startLine: integer('start_line').notNull(),
    endLine: integer('end_line').notNull(),
    purpose: text('purpose'), // Description of what this block does
    dependencies: text('dependencies'), // JSON array of symbol IDs used in this block
    sideEffects: text('side_effects'), // JSON array: [{type, target, description}]
    scope: text('scope'), // local, closure, module
    complexity: integer('complexity'), // Cyclomatic complexity (optional)
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_blocks_symbol').on(table.symbolId),
    index('idx_blocks_type').on(table.type),
    index('idx_blocks_lines').on(table.startLine, table.endLine),
  ]
);

export const entryPoints = sqliteTable(
  'entry_points',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(), // cli, main-function, application, server, worker, test-runner, script
    filePath: text('file_path').notNull(),
    symbolId: text('symbol_id').references(() => symbols.id, { onDelete: 'set null' }),
    functionName: text('function_name'),
    line: integer('line').notNull(),
    description: text('description'),
    isAsync: integer('is_async', { mode: 'boolean' }).notNull().default(false),
    bootstrapOrder: integer('bootstrap_order'),
    dependencies: text('dependencies'), // JSON array of dependency module names or symbol IDs
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_entry_points_type').on(table.type),
    index('idx_entry_points_file').on(table.filePath),
    index('idx_entry_points_symbol').on(table.symbolId),
  ]
);

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

export type RelationshipSymbol = typeof relationshipSymbols.$inferSelect;
export type NewRelationshipSymbol = typeof relationshipSymbols.$inferInsert;

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

export type TaskRow = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type Endpoint = typeof endpoints.$inferSelect;
export type NewEndpoint = typeof endpoints.$inferInsert;

export type CodeBlock = typeof codeBlocks.$inferSelect;
export type NewCodeBlock = typeof codeBlocks.$inferInsert;

export type EntryPoint = typeof entryPoints.$inferSelect;
export type NewEntryPoint = typeof entryPoints.$inferInsert;
