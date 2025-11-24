#!/usr/bin/env node
/**
 * Basic functionality test - Test core MCP tools directly
 */
import { TsDocService } from './dist/services/tsdocService.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}`);
console.log(`${colors.bright}TSDoc Edge MCP Server - Basic Functionality Test${colors.reset}`);
console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);

// Use parent directory as workspace root
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '..');

const service = new TsDocService(workspaceRoot);
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    console.log(`${colors.bright}[TEST]${colors.reset} ${name}`);
    await fn();
    console.log(`${colors.green}[PASS]${colors.reset} ✓ ${name}\n`);
    passed++;
  } catch (error) {
    console.log(`${colors.red}[FAIL]${colors.reset} ✗ ${name}`);
    console.log(`${colors.red}Error: ${error.message}${colors.reset}\n`);
    failed++;
  }
}

async function runTests() {
  // Test 1: Search for symbols
  await test('Search for "DatabaseManager" symbols', async () => {
    const results = await service.searchSymbols({ query: 'DatabaseManager', limit: 5 });
    const count = results.nodes ? results.nodes.length : 0;
    if (count === 0) {
      throw new Error('No results found');
    }
    console.log(`  Found ${count} symbols`);
  });

  // Test 2: Get ontology statistics
  await test('Get ontology statistics', async () => {
    const stats = await service.getOntologyStats(false);
    if (!stats || !stats.nodes || stats.nodes.total === 0) {
      throw new Error('Invalid stats');
    }
    console.log(`  Total nodes: ${stats.nodes.total}`);
    console.log(`  Total relationships: ${stats.relationships.total}`);
  });

  // Test 3: List relationships
  await test('List relationships', async () => {
    const result = await service.listRelationships({ type: 'imports', limit: 10 });
    const count = result.relationships ? result.relationships.length : 0;
    console.log(`  Found ${count} relationships`);
  });

  // Test 4: Get work context
  await test('Get work context for a file', async () => {
    const context = await service.getWorkContext('src/commands/AnalyzeAllCommand.ts', 2);
    if (!context || !context.includes('Work Context')) {
      throw new Error('Invalid work context');
    }
    console.log(`  Context length: ${context.length} chars`);
  });

  // Test 5: Query relationships for a symbol
  await test('Query relationships for DatabaseManager', async () => {
    const rels = await service.queryRelationships('database-manager', 'both', 1);
    console.log(`  Found relationships: ${rels.length}`);
  });

  // Test 6: Get symbol details
  await test('Get symbol details', async () => {
    const details = await service.getSymbolDetails('class-databasemanager');
    const found = typeof details === 'string' && details.includes('Symbol');
    console.log(`  Symbol found: ${found ? 'Yes' : 'No'}`);
    if (!details) {
      throw new Error('No details returned');
    }
  });

  // Test 7: Database connection resilience
  await test('Database connection resilience', async () => {
    service.close();
    // Reconnect automatically on next query
    const results = await service.searchSymbols({ query: 'test', limit: 1 });
    console.log(`  Auto-reconnect successful`);
  });

  service.close();

  // Summary
  console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}Test Results${colors.reset}\n`);
  console.log(`  Total: ${passed + failed}`);
  console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);

  if (failed === 0) {
    console.log(`\n${colors.green}${colors.bright}✓ All basic functionality tests passed!${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bright}✗ Some tests failed${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
