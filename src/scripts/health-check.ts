#!/usr/bin/env ts-node
/**
 * System Health Check
 * Comprehensive check of all TSDoc Edge systems
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { DatabaseManager } from '../storage/DatabaseManager';

const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
const dbManager = new DatabaseManager(dbPath);

interface HealthReport {
  database: {
    exists: boolean;
    size: string;
    symbols: number;
    relationships: number;
    tables: number;
  };
  relationships: {
    activeTypes: number;
    totalTypes: number;
    coverage: string;
    qualityScore: number;
  };
  tests: {
    mappings: number;
    coveredSymbols: number;
    testFiles: number;
  };
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
  };
  issues: Array<{ severity: string; category: string; description: string; count?: number }>;
}

const report: HealthReport = {
  database: { exists: false, size: '0', symbols: 0, relationships: 0, tables: 0 },
  relationships: { activeTypes: 0, totalTypes: 19, coverage: '0%', qualityScore: 0 },
  tests: { mappings: 0, coveredSymbols: 0, testFiles: 0 },
  tasks: { total: 0, todo: 0, inProgress: 0, done: 0 },
  issues: []
};

console.log('\n=== TSDoc Edge System Health Check ===\n');

// 1. Database Check
console.log('📊 Database Health:');
if (fs.existsSync(dbPath)) {
  report.database.exists = true;
  const stats = fs.statSync(dbPath);
  report.database.size = (stats.size / 1024 / 1024).toFixed(2) + ' MB';

  const symbolCount = dbManager.db.prepare('SELECT COUNT(*) as count FROM symbols').get() as { count: number };
  report.database.symbols = symbolCount.count;

  const relCount = dbManager.db.prepare('SELECT COUNT(*) as count FROM unified_relationships').get() as { count: number };
  report.database.relationships = relCount.count;

  const tables = dbManager.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get() as { count: number };
  report.database.tables = tables.count;

  console.log(`  ✅ Database exists: ${dbPath}`);
  console.log(`  📦 Size: ${report.database.size}`);
  console.log(`  🔢 Symbols: ${report.database.symbols.toLocaleString()}`);
  console.log(`  🔗 Relationships: ${report.database.relationships.toLocaleString()}`);
  console.log(`  📋 Tables: ${report.database.tables}`);
} else {
  console.log(`  ❌ Database not found: ${dbPath}`);
  report.issues.push({
    severity: 'ERROR',
    category: 'database',
    description: 'Database file not found - run tsdoc-edge build'
  });
}

// 2. Relationship System Check
console.log('\n🔗 Relationship System:');
const typeCount = dbManager.db.prepare('SELECT COUNT(DISTINCT type) as count FROM unified_relationships').get() as { count: number };
report.relationships.activeTypes = typeCount.count;
report.relationships.coverage = ((report.relationships.activeTypes / report.relationships.totalTypes) * 100).toFixed(0) + '%';

console.log(`  Active types: ${report.relationships.activeTypes}/${report.relationships.totalTypes} (${report.relationships.coverage})`);

// Check for orphaned relationships
const orphanCheck = dbManager.db.prepare(`
  SELECT COUNT(*) as count
  FROM unified_relationships r
  WHERE NOT EXISTS (
    SELECT 1 FROM symbols s WHERE s.id = json_extract(r.from_symbols, '$[0]')
  )
`).get() as { count: number };

if (orphanCheck.count === 0) {
  console.log(`  ✅ No orphaned relationships`);
  report.relationships.qualityScore = 100;
} else {
  console.log(`  ⚠️  ${orphanCheck.count} orphaned relationships found`);
  report.relationships.qualityScore = 100 - (orphanCheck.count / report.database.relationships * 100);
  report.issues.push({
    severity: 'WARNING',
    category: 'relationships',
    description: 'Orphaned relationships exist',
    count: orphanCheck.count
  });
}

// 3. Test Coverage Check
console.log('\n🧪 Test Coverage:');
const testMappings = dbManager.db.prepare('SELECT COUNT(*) as count FROM test_mappings').get() as { count: number };
report.tests.mappings = testMappings.count;

const uniqueSymbols = dbManager.db.prepare('SELECT COUNT(DISTINCT symbol_id) as count FROM test_mappings').get() as { count: number };
report.tests.coveredSymbols = uniqueSymbols.count;

const testRelCount = dbManager.db.prepare("SELECT COUNT(*) as count FROM unified_relationships WHERE type = 'test-coverage'").get() as { count: number };

console.log(`  Test mappings: ${report.tests.mappings}`);
console.log(`  Covered symbols: ${report.tests.coveredSymbols}`);
console.log(`  Test-coverage relationships: ${testRelCount.count}`);

if (report.tests.mappings === 0) {
  console.log(`  ⚠️  No test mappings - run populate-test-mappings script`);
  report.issues.push({
    severity: 'WARNING',
    category: 'tests',
    description: 'Test mappings table is empty'
  });
} else {
  console.log(`  ✅ Test coverage tracking active`);
}

// 4. Task System Check
console.log('\n📋 Task Management:');
const taskStats = dbManager.db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
    SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done
  FROM tasks
`).get() as any;

report.tasks = {
  total: taskStats.total,
  todo: taskStats.todo,
  inProgress: taskStats.in_progress,
  done: taskStats.done
};

console.log(`  Total tasks: ${report.tasks.total}`);
console.log(`  📝 Todo: ${report.tasks.todo}`);
console.log(`  🔄 In Progress: ${report.tasks.inProgress}`);
console.log(`  ✅ Done: ${report.tasks.done}`);

if (report.tasks.total === 0) {
  console.log(`  ℹ️  No tasks created yet`);
} else {
  const completion = ((report.tasks.done / report.tasks.total) * 100).toFixed(1);
  console.log(`  📊 Completion: ${completion}%`);
}

// 5. Performance Checks
console.log('\n⚡ Performance:');

// Index check
const indexes = dbManager.db.prepare(`
  SELECT COUNT(*) as count
  FROM sqlite_master
  WHERE type='index' AND name LIKE 'idx_%'
`).get() as { count: number };

console.log(`  Indexes: ${indexes.count}`);

// Query a sample relationship
const start = Date.now();
dbManager.db.prepare(`
  SELECT * FROM unified_relationships
  WHERE from_symbols LIKE '%class-databasemanager%'
  LIMIT 10
`).all();
const queryTime = Date.now() - start;

console.log(`  Sample query time: ${queryTime}ms`);

if (queryTime > 100) {
  report.issues.push({
    severity: 'WARNING',
    category: 'performance',
    description: `Slow query performance (${queryTime}ms)`
  });
}

// 6. Missing Features Check
console.log('\n🔍 Feature Completeness:');

const missingTypes = [
  'implementation',
  'event-flow',
  'temporal-order'
];

console.log(`  Missing analyzer types: ${missingTypes.length}/19`);
for (const type of missingTypes) {
  console.log(`    ⚪ ${type}`);
}

// 7. Summary
console.log('\n\n=== Health Summary ===\n');

const totalIssues = report.issues.length;
const errors = report.issues.filter(i => i.severity === 'ERROR').length;
const warnings = report.issues.filter(i => i.severity === 'WARNING').length;

console.log(`Database: ${report.database.exists ? '✅' : '❌'} (${report.database.size})`);
console.log(`Relationships: ✅ (${report.database.relationships.toLocaleString()} total, ${report.relationships.qualityScore.toFixed(0)}% quality)`);
console.log(`Test Coverage: ${report.tests.mappings > 0 ? '✅' : '⚠️ '} (${report.tests.coveredSymbols} symbols)`);
console.log(`Task System: ✅ (${report.tasks.total} tasks)`);
console.log(`Performance: ${queryTime < 50 ? '✅' : queryTime < 100 ? '⚠️ ' : '❌'} (${queryTime}ms queries)`);

if (totalIssues === 0) {
  console.log(`\n🎉 All systems healthy!`);
} else {
  console.log(`\n⚠️  ${totalIssues} issue(s) found (${errors} errors, ${warnings} warnings)`);
  console.log('\nIssues:');
  for (const issue of report.issues) {
    const icon = issue.severity === 'ERROR' ? '❌' : '⚠️ ';
    const countStr = issue.count ? ` (${issue.count})` : '';
    console.log(`  ${icon} [${issue.category}] ${issue.description}${countStr}`);
  }
}

dbManager.close();
