#!/usr/bin/env ts-node

/**
 * CLI Method Test - Register methods and test CLI commands
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SymbolRegistryManager } from '../src/storage/SymbolRegistryManager';

console.log('='.repeat(80));
console.log('CLI Method Registration Test');
console.log('='.repeat(80));
console.log();

// Setup separate registry for this test
const registryPath = path.join(process.cwd(), '.tsdoc', 'test-registry.jsonl');

// Clean up if exists
if (fs.existsSync(registryPath)) {
  fs.unlinkSync(registryPath);
}

const manager = new SymbolRegistryManager(registryPath);

console.log('Step 1: Register class and methods');
console.log('-'.repeat(80));

// Register class
const classId = manager.register({
  filePath: 'src/services/UserService.ts',
  symbolName: 'UserService',
  type: 'class',
  line: 15,
});

console.log(`✅ Class registered: ${classId} → UserService`);

// Register instance methods
const createUserId = manager.register({
  filePath: 'src/services/UserService.ts',
  symbolName: 'createUser',
  type: 'method',
  memberOf: classId,
  memberType: 'instance',
  line: 20,
});

console.log(`✅ Method registered: ${createUserId} → UserService#createUser`);

const getUserId = manager.register({
  filePath: 'src/services/UserService.ts',
  symbolName: 'getUser',
  type: 'method',
  memberOf: classId,
  memberType: 'instance',
  line: 30,
});

console.log(`✅ Method registered: ${getUserId} → UserService#getUser`);

// Register static method
const validateId = manager.register({
  filePath: 'src/services/UserService.ts',
  symbolName: 'validateEmail',
  type: 'method',
  memberOf: classId,
  memberType: 'static',
  line: 40,
});

console.log(`✅ Static method registered: ${validateId} → UserService.validateEmail`);

// Register nested helper
const helperId = manager.register({
  filePath: 'src/services/UserService.ts',
  symbolName: 'sanitizeInput',
  type: 'function',
  memberOf: createUserId,
  memberType: 'inner',
  line: 25,
});

console.log(`✅ Helper registered: ${helperId} → UserService#createUser~sanitizeInput`);

// Save
manager.save();
console.log();
console.log(`✅ Registry saved to: ${registryPath}`);
console.log();

console.log('Step 2: Verify entries');
console.log('-'.repeat(80));

const allEntries = manager.getAll();
console.log(`Total entries: ${allEntries.length}`);
console.log();

for (const entry of allEntries) {
  const indent = '  '.repeat(entry.sourceRef.depth || 0);
  console.log(`${indent}${entry.id} → ${entry.sourceRef.qualifiedName}`);
  console.log(`${indent}  File: ${entry.sourceRef.filePath}:${entry.sourceRef.line}`);
  console.log(`${indent}  Type: ${entry.sourceRef.type}`);
  console.log(`${indent}  Depth: ${entry.sourceRef.depth}`);
  if (entry.sourceRef.memberOf) {
    console.log(`${indent}  Parent: ${entry.sourceRef.memberOf}`);
  }
  console.log();
}

console.log('='.repeat(80));
console.log('✅ Test complete!');
console.log();
console.log('To test with CLI:');
console.log(`  export TSDOC_REGISTRY=${registryPath}`);
console.log(`  node dist/cli.js id list`);
console.log('='.repeat(80));
