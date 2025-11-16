#!/usr/bin/env node
/**
 * Identify core symbols that need documentation links
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), '.tsdoc', 'symbols.db');
const db = new Database(dbPath, { readonly: true });

console.log('Core Symbols Needing @doc Tags');
console.log('='.repeat(80));
console.log();

// Get symbols with high connectivity
const coreSymbols = db.prepare(`
  SELECT
    s.name,
    s.type,
    s.file_path,
    s.line,
    COUNT(DISTINCT ur.id) as relationship_count
  FROM symbols s
  LEFT JOIN unified_relationships ur
    ON INSTR(ur.from_symbols, s.id) > 0
  WHERE s.is_exported = 1
    AND s.type IN ('class', 'interface', 'function')
  GROUP BY s.id
  HAVING relationship_count > 10
  ORDER BY relationship_count DESC
  LIMIT 30
`).all();

console.log('Top 30 Most Connected Exported Symbols:');
console.log('-'.repeat(80));
console.log();

for (let i = 0; i < coreSymbols.length; i++) {
  const symbol = coreSymbols[i];
  const relPath = symbol.file_path.replace(process.cwd(), '');

  console.log(`${(i + 1).toString().padStart(2)}. ${symbol.name} (${symbol.type})`);
  console.log(`    File: ${relPath}:${symbol.line}`);
  console.log(`    Relationships: ${symbol.relationship_count}`);
  console.log(`    Suggested @doc tag: @doc [[${symbol.name}]]`);
  console.log();
}

console.log('='.repeat(80));
console.log('Next Steps:');
console.log('1. Add @doc tags to these symbols linking to managed documentation');
console.log('2. Create corresponding documentation in managed/ if missing');
console.log('3. Run: tsdoc-edge analyze-doc-reference src');
console.log('='.repeat(80));

db.close();
