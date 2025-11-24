#!/usr/bin/env node
/**
 * Performance Benchmark for TSDoc MCP Service
 * Measures query performance against <10ms target
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

function benchmark(name, fn, iterations = 100) {
  const times = [];

  // Warmup
  for (let i = 0; i < 10; i++) {
    fn();
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const p50 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.5)];
  const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
  const p99 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.99)];

  const status = avg < 10 ? '✓' : avg < 50 ? '⚠' : '✗';
  const color = avg < 10 ? colors.green : avg < 50 ? colors.yellow : colors.red;

  console.log(`${color}${status}${colors.reset} ${name.padEnd(40)} | Avg: ${avg.toFixed(2)}ms | P50: ${p50.toFixed(2)}ms | P95: ${p95.toFixed(2)}ms | P99: ${p99.toFixed(2)}ms | Min: ${min.toFixed(2)}ms | Max: ${max.toFixed(2)}ms`);

  return { name, avg, min, max, p50, p95, p99 };
}

async function runBenchmarks() {
  console.log(`${colors.cyan}${'='.repeat(120)}${colors.reset}`);
  console.log(`${colors.bright}TSDoc Edge MCP Server - Performance Benchmark${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(120)}${colors.reset}\n`);

  const dbPath = join(__dirname, '..', '.tsdoc', 'symbols.db');
  const db = new Database(dbPath, { readonly: true });

  console.log(`${colors.bright}Database Operations (100 iterations each)${colors.reset}\n`);

  const results = [];

  // 1. Connection overhead
  results.push(benchmark('Database Connection (open + close)', () => {
    const testDb = new Database(dbPath, { readonly: true });
    testDb.close();
  }));

  // 2. Simple symbol query
  results.push(benchmark('SELECT symbol by ID (indexed)', () => {
    db.prepare('SELECT * FROM symbols WHERE id = ?').get('class-databasemanager');
  }));

  // 3. Symbol search by type
  results.push(benchmark('SELECT symbols by type', () => {
    db.prepare('SELECT * FROM symbols WHERE type = ?').all('class');
  }));

  // 4. All symbols query
  results.push(benchmark('SELECT all symbols (5K rows)', () => {
    db.prepare('SELECT * FROM symbols').all();
  }));

  // 5. All relationships query
  results.push(benchmark('SELECT all relationships (20K rows)', () => {
    db.prepare('SELECT * FROM unified_relationships').all();
  }));

  // 6. JSON parsing overhead
  results.push(benchmark('JSON parse (relationship from_symbols)', () => {
    const row = db.prepare('SELECT from_symbols FROM unified_relationships LIMIT 1').get();
    JSON.parse(row.from_symbols);
  }));

  // 7. Complex aggregation
  results.push(benchmark('COUNT aggregation by type', () => {
    db.prepare('SELECT type, COUNT(*) as count FROM symbols GROUP BY type').all();
  }));

  console.log(`\n${colors.bright}Service Method Simulations${colors.reset}\n`);

  // 8. Search symbols (with filtering)
  results.push(benchmark('searchSymbols (query + filter)', () => {
    const symbols = db.prepare('SELECT * FROM symbols WHERE type = ?').all('class');
    const filtered = symbols.filter(s => s.name.toLowerCase().includes('command'));
  }));

  // 9. Get ontology stats (full calculation)
  results.push(benchmark('getOntologyStats (full)', () => {
    const symbols = db.prepare('SELECT * FROM symbols').all();
    const relationships = db.prepare('SELECT * FROM unified_relationships').all();

    const nodesByType = {};
    for (const symbol of symbols) {
      nodesByType[symbol.type] = (nodesByType[symbol.type] || 0) + 1;
    }

    const relsByType = {};
    for (const rel of relationships) {
      relsByType[rel.type] = (relsByType[rel.type] || 0) + 1;
    }
  }));

  // 10. List relationships (with filtering)
  results.push(benchmark('listRelationships (filter + paginate)', () => {
    const relationships = db.prepare('SELECT * FROM unified_relationships').all();
    const filtered = relationships
      .filter(r => r.category === 'testing')
      .slice(0, 20);
  }));

  db.close();

  // Summary
  console.log(`\n${colors.cyan}${'='.repeat(120)}${colors.reset}`);
  console.log(`${colors.bright}Performance Summary${colors.reset}\n`);

  const fastOps = results.filter(r => r.avg < 10);
  const acceptableOps = results.filter(r => r.avg >= 10 && r.avg < 50);
  const slowOps = results.filter(r => r.avg >= 50);

  console.log(`${colors.green}✓ Fast (<10ms):${colors.reset}       ${fastOps.length} operations`);
  console.log(`${colors.yellow}⚠ Acceptable (10-50ms):${colors.reset} ${acceptableOps.length} operations`);
  console.log(`${colors.red}✗ Slow (>50ms):${colors.reset}      ${slowOps.length} operations`);

  const overallAvg = results.reduce((sum, r) => sum + r.avg, 0) / results.length;
  console.log(`\n${colors.bright}Overall Average:${colors.reset} ${overallAvg.toFixed(2)}ms`);

  if (slowOps.length > 0) {
    console.log(`\n${colors.red}${colors.bright}Slow Operations:${colors.reset}`);
    slowOps.forEach(op => {
      console.log(`  - ${op.name}: ${op.avg.toFixed(2)}ms`);
    });
  }

  console.log(`\n${colors.cyan}${'='.repeat(120)}${colors.reset}`);

  // Memory usage
  const memUsage = process.memoryUsage();
  console.log(`\n${colors.bright}Memory Usage:${colors.reset}`);
  console.log(`  RSS:      ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  External:  ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);

  console.log(`\n${colors.bright}Target Achievement:${colors.reset}`);
  const targetMet = overallAvg < 10;
  if (targetMet) {
    console.log(`  ${colors.green}✓ Target <10ms average ACHIEVED${colors.reset} (${overallAvg.toFixed(2)}ms)`);
  } else if (overallAvg < 50) {
    console.log(`  ${colors.yellow}⚠ Target <10ms not met, but acceptable${colors.reset} (${overallAvg.toFixed(2)}ms)`);
  } else {
    console.log(`  ${colors.red}✗ Performance needs optimization${colors.reset} (${overallAvg.toFixed(2)}ms)`);
  }

  console.log('');
  process.exit(slowOps.length === 0 ? 0 : 1);
}

runBenchmarks().catch(console.error);
