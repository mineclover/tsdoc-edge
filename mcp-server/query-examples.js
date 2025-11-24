#!/usr/bin/env node
/**
 * Query database to show available symbols and relationships
 * Helps create realistic test cases
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', '.tsdoc', 'symbols.db');

if (!existsSync(dbPath)) {
  console.error('Database not found at:', dbPath);
  console.error('Run: tsdoc-edge build src');
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

console.log('📊 TSDoc Edge Database Contents\n');
console.log('='.repeat(60));

// 1. Symbol Types Distribution
console.log('\n## Symbol Types Distribution\n');
const typeStats = db
  .prepare(
    `SELECT type, COUNT(*) as count
     FROM symbols
     GROUP BY type
     ORDER BY count DESC`
  )
  .all();

typeStats.forEach((row) => {
  console.log(`  ${row.type.padEnd(20)} ${row.count.toString().padStart(6)}`);
});

// 2. Sample Commands
console.log('\n## Sample Command Classes\n');
const commands = db
  .prepare(
    `SELECT id, name, file_path
     FROM symbols
     WHERE type='class' AND name LIKE '%Command%'
     LIMIT 10`
  )
  .all();

commands.forEach((row) => {
  console.log(`  ID: ${row.id}`);
  console.log(`  Name: ${row.name}`);
  console.log(`  File: ${row.file_path}`);
  console.log('');
});

// 3. Relationship Types
console.log('## Relationship Types\n');
const relTypes = db
  .prepare(
    `SELECT type, category, COUNT(*) as count
     FROM unified_relationships
     GROUP BY type, category
     ORDER BY count DESC
     LIMIT 15`
  )
  .all();

relTypes.forEach((row) => {
  console.log(
    `  ${row.type.padEnd(25)} [${row.category.padEnd(15)}] ${row.count
      .toString()
      .padStart(6)}`
  );
});

// 4. Top Connected Symbols
console.log('\n## Top 10 Most Connected Symbols\n');
const topSymbols = db
  .prepare(
    `SELECT
       s.id,
       s.name,
       s.type,
       COUNT(DISTINCT r.id) as rel_count
     FROM symbols s
     LEFT JOIN unified_relationships r
       ON (r.from_symbols LIKE '%"' || s.id || '"%' OR r.to_symbols LIKE '%"' || s.id || '"%')
     GROUP BY s.id
     ORDER BY rel_count DESC
     LIMIT 10`
  )
  .all();

topSymbols.forEach((row, idx) => {
  console.log(
    `  ${(idx + 1).toString().padStart(2)}. ${row.id.padEnd(40)} (${row.type}) - ${row.rel_count} rels`
  );
});

// 5. Sample Files with Multiple Symbols
console.log('\n## Files with Most Symbols\n');
const topFiles = db
  .prepare(
    `SELECT file_path, COUNT(*) as symbol_count
     FROM symbols
     GROUP BY file_path
     ORDER BY symbol_count DESC
     LIMIT 10`
  )
  .all();

topFiles.forEach((row) => {
  console.log(`  ${row.symbol_count.toString().padStart(3)} symbols: ${row.file_path}`);
});

// 6. Example Tool Inputs
console.log('\n## 🎯 Example Tool Inputs for Testing\n');

if (commands.length > 0) {
  console.log('### tsdoc_search_symbols');
  console.log('```json');
  console.log(
    JSON.stringify(
      {
        query: commands[0].name,
        type: 'class',
        limit: 5,
      },
      null,
      2
    )
  );
  console.log('```\n');

  console.log('### tsdoc_get_symbol_details');
  console.log('```json');
  console.log(
    JSON.stringify(
      {
        symbolId: commands[0].id,
        includeRelationships: true,
      },
      null,
      2
    )
  );
  console.log('```\n');

  console.log('### tsdoc_get_work_context');
  console.log('```json');
  console.log(
    JSON.stringify(
      {
        filePath: commands[0].file_path,
        depth: 2,
      },
      null,
      2
    )
  );
  console.log('```\n');

  console.log('### tsdoc_query_relationships');
  console.log('```json');
  console.log(
    JSON.stringify(
      {
        symbolId: commands[0].id,
        direction: 'both',
        maxDepth: 2,
      },
      null,
      2
    )
  );
  console.log('```\n');
}

if (relTypes.length > 0) {
  console.log('### tsdoc_list_relationships');
  console.log('```json');
  console.log(
    JSON.stringify(
      {
        type: relTypes[0].type,
        category: relTypes[0].category,
        limit: 10,
      },
      null,
      2
    )
  );
  console.log('```\n');
}

console.log('='.repeat(60));
console.log('\n✨ Use these examples with the MCP server or test-client.js\n');

db.close();
