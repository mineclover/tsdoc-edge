#!/usr/bin/env ts-node

/**
 * Dependency Graph Demo
 * Demonstrates TSDoc-based dependency tracking
 */

import * as path from 'node:path';
import { SymbolRegistryManager } from '../src/storage/SymbolRegistryManager';

console.log('='.repeat(80));
console.log('TSDoc Edge - Dependency Graph Demo');
console.log('='.repeat(80));
console.log();

// ========================================
// STEP 1: Setup Registry
// ========================================
console.log('📋 STEP 1: Create Symbol Registry');
console.log('-'.repeat(80));

const registryPath = path.join(__dirname, 'output', 'deps-registry.jsonl');
const manager = new SymbolRegistryManager(registryPath);

// Register symbols
const parser = manager.register({
  filePath: 'src/parser/TSDocParser.ts',
  symbolName: 'TSDocParser',
  type: 'class',
});

const validator = manager.register({
  filePath: 'src/validator/ConventionValidator.ts',
  symbolName: 'ConventionValidator',
  type: 'class',
});

const generator = manager.register({
  filePath: 'src/generator/MarkdownGenerator.ts',
  symbolName: 'MarkdownGenerator',
  type: 'class',
});

const db = manager.register({
  filePath: 'src/storage/DatabaseManager.ts',
  symbolName: 'DatabaseManager',
  type: 'class',
});

const orphan = manager.register({
  filePath: 'src/utils/Helper.ts',
  symbolName: 'Helper',
  type: 'class',
});

console.log('✅ Registered 5 symbols:');
console.log(`   ${parser} - TSDocParser`);
console.log(`   ${validator} - ConventionValidator`);
console.log(`   ${generator} - MarkdownGenerator`);
console.log(`   ${db} - DatabaseManager`);
console.log(`   ${orphan} - Helper (orphan)`);
console.log();

// ========================================
// STEP 2: Add Dependencies
// ========================================
console.log('🔗 STEP 2: Add Dependency Relationships');
console.log('-'.repeat(80));

// Validator depends on Parser
manager.addDependency(validator, parser, 'Parse TSDoc comments before validation', 'runtime');

// Validator depends on DB
manager.addDependency(validator, db, 'Store validation results', 'runtime');

// Generator depends on Validator
manager.addDependency(generator, validator, 'Get validated comments for generation', 'runtime');

// Generator depends on Parser
manager.addDependency(generator, parser, 'Access parsed doc comments', 'type-only');

manager.save();

console.log('✅ Added 4 dependency relationships:');
console.log(`   ${validator} → ${parser} [runtime]`);
console.log(`   ${validator} → ${db} [runtime]`);
console.log(`   ${generator} → ${validator} [runtime]`);
console.log(`   ${generator} → ${parser} [type-only]`);
console.log();

// ========================================
// STEP 3: Query Dependencies
// ========================================
console.log('🔍 STEP 3: Query Dependencies');
console.log('-'.repeat(80));

console.log(`\nDependencies of Validator (${validator}):`);
const validatorDeps = manager.getDependencies(validator);
for (const dep of validatorDeps) {
  const target = manager.findById(dep.targetId);
  console.log(`  → ${dep.targetId} (${target?.sourceRef.symbolName}) [${dep.type}]`);
  console.log(`    Reason: ${dep.reason}`);
}

console.log(`\nUsed by Parser (${parser}):`);
const parserUsers = manager.getUsedBy(parser);
for (const user of parserUsers) {
  const from = manager.findById(user.fromId);
  console.log(`  ← ${user.fromId} (${from?.sourceRef.symbolName}) [${user.type}]`);
  console.log(`    Reason: ${user.reason}`);
}

console.log();

// ========================================
// STEP 4: Find Orphans
// ========================================
console.log('👻 STEP 4: Find Orphaned Symbols');
console.log('-'.repeat(80));

const orphans = manager.findOrphans();
console.log(`Found ${orphans.length} orphaned symbols:`);
for (const id of orphans) {
  const entry = manager.findById(id);
  console.log(`  ${id} - ${entry?.sourceRef.symbolName}`);
  console.log(`    Location: ${entry?.sourceRef.filePath}`);
}
console.log();

// ========================================
// STEP 5: Dependency Graph
// ========================================
console.log('📊 STEP 5: Dependency Graph');
console.log('-'.repeat(80));

const graph = manager.getDependencyGraph();
console.log('Adjacency List:');
for (const [id, deps] of graph.entries()) {
  const entry = manager.findById(id);
  if (deps.length > 0) {
    console.log(`  ${id} (${entry?.sourceRef.symbolName}):`);
    for (const depId of deps) {
      const depEntry = manager.findById(depId);
      console.log(`    → ${depId} (${depEntry?.sourceRef.symbolName})`);
    }
  }
}
console.log();

// ========================================
// STEP 6: Statistics
// ========================================
console.log('📈 STEP 6: Statistics');
console.log('-'.repeat(80));

const stats = manager.getStats();
console.log(`Total Symbols: ${stats.totalEntries}`);
console.log(`Total Dependencies: ${stats.totalDependencies}`);
console.log(`Orphaned Symbols: ${stats.orphanCount}`);
console.log(`Files: ${stats.fileCount}`);
console.log();

// ========================================
// Summary
// ========================================
console.log('='.repeat(80));
console.log('✅ Dependency Graph Demo Complete!');
console.log('='.repeat(80));
console.log();
console.log('Generated:');
console.log(`   📋 Registry: ${registryPath}`);
console.log();
console.log('Try CLI commands:');
console.log(`   tsdoc-edge deps ${validator}`);
console.log(`   tsdoc-edge used-by ${parser}`);
console.log(`   tsdoc-edge orphans`);
console.log();
