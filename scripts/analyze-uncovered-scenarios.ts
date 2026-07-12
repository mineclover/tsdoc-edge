#!/usr/bin/env ts-node
/**
 * Analyze uncovered test scenarios
 * Find scenarios without covers-scenario relationships
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';

const dbPath = '.tsdoc/symbols.db';
const jsonlPath = '.tsdoc';

const db = new DatabaseManager(dbPath, jsonlPath);

console.log('🔍 Uncovered Scenario Analysis\n');

// Get all test scenarios
const scenariosQuery = `
  SELECT
    id,
    name,
    file_path
  FROM symbols
  WHERE type = 'test-scenario'
  ORDER BY file_path, name
`;

const scenarios = db.db.prepare(scenariosQuery).all() as Array<{
  id: string;
  name: string;
  file_path: string;
}>;

console.log(`📊 Total scenarios: ${scenarios.length}\n`);

// For each scenario, check if it has covers-scenario relationships
const uncoveredScenarios: typeof scenarios = [];
const coveredScenarios: Array<(typeof scenarios)[0] & { testCount: number }> = [];

for (const scenario of scenarios) {
  // to_symbols is stored as JSON array: ["scenario-id"]
  const relationQuery = `
    SELECT COUNT(*) as count
    FROM unified_relationships
    WHERE type = 'covers-scenario'
    AND to_symbols LIKE ?
  `;

  const result = db.db.prepare(relationQuery).get(`%${scenario.id}%`) as { count: number };

  if (result.count === 0) {
    uncoveredScenarios.push(scenario);
  } else {
    coveredScenarios.push({ ...scenario, testCount: result.count });
  }
}

console.log(
  `✅ Covered scenarios: ${coveredScenarios.length} (${((coveredScenarios.length / scenarios.length) * 100).toFixed(1)}%)`
);
console.log(
  `❌ Uncovered scenarios: ${uncoveredScenarios.length} (${((uncoveredScenarios.length / scenarios.length) * 100).toFixed(1)}%)\n`
);

// Show covered scenarios
if (coveredScenarios.length > 0) {
  console.log('✅ Covered Scenarios:\n');
  for (const scenario of coveredScenarios) {
    const shortPath = scenario.file_path.replace('src/__tests__/', '');
    console.log(`   ${scenario.name}`);
    console.log(`   → ${shortPath} (${scenario.testCount} test cases)`);
    console.log();
  }
}

// Show uncovered scenarios with analysis
if (uncoveredScenarios.length > 0) {
  console.log('❌ Uncovered Scenarios:\n');

  for (const scenario of uncoveredScenarios) {
    const shortPath = scenario.file_path.replace('src/__tests__/', '');
    console.log(`   ${scenario.name}`);
    console.log(`   → ${shortPath}`);

    // Get test cases in the same file
    const testCasesQuery = `
      SELECT name
      FROM symbols
      WHERE type = 'test-case'
      AND file_path = ?
      LIMIT 5
    `;

    const testCases = db.db.prepare(testCasesQuery).all(scenario.file_path) as Array<{
      name: string;
    }>;

    if (testCases.length > 0) {
      console.log(`   Test cases in file:`);
      testCases.forEach((tc) => {
        console.log(`     - ${tc.name}`);
      });

      // Analyze why it didn't match
      const scenarioWords = scenario.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .split(' ')
        .filter((w) => w.length > 3);

      console.log(`   Key words: ${scenarioWords.join(', ')}`);
    } else {
      console.log(`   ⚠️  No test cases found in this file!`);
    }

    console.log();
  }
}

// Analyze matching patterns
console.log('📈 Pattern Analysis:\n');

// Group scenarios by file
const fileGroups = new Map<string, typeof scenarios>();
for (const scenario of scenarios) {
  if (!fileGroups.has(scenario.file_path)) {
    fileGroups.set(scenario.file_path, []);
  }
  fileGroups.get(scenario.file_path)?.push(scenario);
}

console.log(`   Files with scenarios: ${fileGroups.size}`);

for (const [filePath, fileScenarios] of fileGroups.entries()) {
  const shortPath = filePath.replace('src/__tests__/', '');
  const covered = fileScenarios.filter((s) => coveredScenarios.some((cs) => cs.id === s.id)).length;
  const total = fileScenarios.length;
  const percentage = ((covered / total) * 100).toFixed(0);

  console.log(`   ${shortPath}: ${covered}/${total} (${percentage}%)`);
}

console.log();

db.close();
