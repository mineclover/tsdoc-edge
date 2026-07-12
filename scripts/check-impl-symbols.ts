#!/usr/bin/env ts-node
import { DatabaseManager } from '../src/storage/DatabaseManager';

const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');

console.log('🔍 Checking implementation symbols\n');

const names = ['FileScanner', 'DatabaseManager', 'SymbolRegistryManager'];

interface ImplementationSymbolRow {
  id: string;
  name: string;
  type: string;
  file_path: string;
}

for (const name of names) {
  const result = db.db
    .prepare(
      "SELECT id, name, type, file_path FROM symbols WHERE name = ? AND type IN ('class', 'interface', 'function') LIMIT 1"
    )
    .get(name) as ImplementationSymbolRow | undefined;

  if (result) {
    console.log(`✓ ${name}`);
    console.log(`  ID: ${result.id}`);
    console.log(`  Type: ${result.type}`);
    console.log(`  File: ${result.file_path}`);
  } else {
    console.log(`✗ ${name} → NOT FOUND`);
  }
  console.log();
}

db.close();
