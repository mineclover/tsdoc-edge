#!/usr/bin/env ts-node

/**
 * Test Method Registration with Hierarchy
 *
 * Tests that methods can be registered with:
 * - memberOf (parent class ID)
 * - qualifiedName (auto-generated)
 * - depth (auto-calculated)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SymbolRegistryManager } from '../src/storage/SymbolRegistryManager';

console.log('='.repeat(80));
console.log('TSDoc Edge - Method Registration Test');
console.log('='.repeat(80));
console.log();

// Setup
const testDir = path.join(__dirname, 'output', 'test-method-registry');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

const registryPath = path.join(testDir, 'registry.jsonl');

// Clean up if exists
if (fs.existsSync(registryPath)) {
  fs.unlinkSync(registryPath);
}

const manager = new SymbolRegistryManager(registryPath);

console.log('📋 Step 1: Register a class');
console.log('-'.repeat(80));

// Register class
const classId = manager.register({
  filePath: 'src/DataProcessor.ts',
  symbolName: 'DataProcessor',
  type: 'class',
  line: 10,
});

console.log(`✅ Registered class: ${classId}`);
console.log();

const classEntry = manager.findById(classId);
if (classEntry) {
  console.log('Class details:');
  console.log(`   ID: ${classEntry.id}`);
  console.log(`   Name: ${classEntry.sourceRef.symbolName}`);
  console.log(`   Qualified Name: ${classEntry.sourceRef.qualifiedName}`);
  console.log(`   Depth: ${classEntry.sourceRef.depth}`);
  console.log(`   Member Of: ${classEntry.sourceRef.memberOf || 'N/A'}`);
}
console.log();

// Save and reload to test persistence
manager.save();

console.log('📋 Step 2: Register instance methods');
console.log('-'.repeat(80));

// Register instance method
const method1Id = manager.register({
  filePath: 'src/DataProcessor.ts',
  symbolName: 'loadCSV',
  type: 'method',
  memberOf: classId,
  memberType: 'instance',
  line: 20,
});

console.log(`✅ Registered instance method: ${method1Id}`);
console.log();

const method1Entry = manager.findById(method1Id);
if (method1Entry) {
  console.log('Instance method details:');
  console.log(`   ID: ${method1Entry.id}`);
  console.log(`   Name: ${method1Entry.sourceRef.symbolName}`);
  console.log(`   Qualified Name: ${method1Entry.sourceRef.qualifiedName}`);
  console.log(`   Depth: ${method1Entry.sourceRef.depth}`);
  console.log(`   Member Of: ${method1Entry.sourceRef.memberOf}`);
  console.log(`   Member Type: ${method1Entry.sourceRef.memberType}`);
}
console.log();

console.log('📋 Step 3: Register static method');
console.log('-'.repeat(80));

// Register static method
const method2Id = manager.register({
  filePath: 'src/DataProcessor.ts',
  symbolName: 'createDefault',
  type: 'method',
  memberOf: classId,
  memberType: 'static',
  line: 30,
});

console.log(`✅ Registered static method: ${method2Id}`);
console.log();

const method2Entry = manager.findById(method2Id);
if (method2Entry) {
  console.log('Static method details:');
  console.log(`   ID: ${method2Entry.id}`);
  console.log(`   Name: ${method2Entry.sourceRef.symbolName}`);
  console.log(`   Qualified Name: ${method2Entry.sourceRef.qualifiedName}`);
  console.log(`   Depth: ${method2Entry.sourceRef.depth}`);
  console.log(`   Member Of: ${method2Entry.sourceRef.memberOf}`);
  console.log(`   Member Type: ${method2Entry.sourceRef.memberType}`);
}
console.log();

console.log('📋 Step 4: Register nested function (depth 2)');
console.log('-'.repeat(80));

// Register nested function inside method
const nestedId = manager.register({
  filePath: 'src/DataProcessor.ts',
  symbolName: 'sanitizeData',
  type: 'function',
  memberOf: method1Id,
  memberType: 'inner',
  line: 25,
});

console.log(`✅ Registered nested function: ${nestedId}`);
console.log();

const nestedEntry = manager.findById(nestedId);
if (nestedEntry) {
  console.log('Nested function details:');
  console.log(`   ID: ${nestedEntry.id}`);
  console.log(`   Name: ${nestedEntry.sourceRef.symbolName}`);
  console.log(`   Qualified Name: ${nestedEntry.sourceRef.qualifiedName}`);
  console.log(`   Depth: ${nestedEntry.sourceRef.depth}`);
  console.log(`   Member Of: ${nestedEntry.sourceRef.memberOf}`);
  console.log(`   Member Type: ${nestedEntry.sourceRef.memberType}`);
}
console.log();

// Save
manager.save();

console.log('📋 Step 5: Test persistence - reload and verify');
console.log('-'.repeat(80));

const manager2 = new SymbolRegistryManager(registryPath);
const allEntries = manager2.getAll();

console.log(`✅ Loaded ${allEntries.length} entries from registry`);
console.log();

console.log('All registered symbols:');
for (const entry of allEntries) {
  const depthIndent = '  '.repeat(entry.sourceRef.depth || 0);
  console.log(
    `${depthIndent}${entry.id} → ${entry.sourceRef.qualifiedName} (depth: ${entry.sourceRef.depth})`
  );
}
console.log();

console.log('📋 Step 6: Verify JSDoc conventions');
console.log('-'.repeat(80));

const conventions = [
  { id: classId, expected: 'DataProcessor', type: 'top-level' },
  { id: method1Id, expected: 'DataProcessor#loadCSV', type: 'instance method' },
  { id: method2Id, expected: 'DataProcessor.createDefault', type: 'static method' },
  { id: nestedId, expected: 'DataProcessor#loadCSV~sanitizeData', type: 'nested function' },
];

let allCorrect = true;
for (const conv of conventions) {
  const entry = manager2.findById(conv.id);
  if (!entry) {
    console.log(`❌ Entry not found: ${conv.id}`);
    allCorrect = false;
    continue;
  }

  const actual = entry.sourceRef.qualifiedName;
  const isCorrect = actual === conv.expected;
  const icon = isCorrect ? '✅' : '❌';

  console.log(`${icon} ${conv.type}`);
  console.log(`   Expected: ${conv.expected}`);
  console.log(`   Actual:   ${actual}`);

  if (!isCorrect) {
    allCorrect = false;
  }
}
console.log();

console.log('📋 Step 7: Test depth calculation');
console.log('-'.repeat(80));

const depthTests = [
  { id: classId, expectedDepth: 0, name: 'DataProcessor' },
  { id: method1Id, expectedDepth: 1, name: 'loadCSV' },
  { id: method2Id, expectedDepth: 1, name: 'createDefault' },
  { id: nestedId, expectedDepth: 2, name: 'sanitizeData' },
];

let allDepthsCorrect = true;
for (const test of depthTests) {
  const entry = manager2.findById(test.id);
  if (!entry) {
    console.log(`❌ Entry not found: ${test.id}`);
    allDepthsCorrect = false;
    continue;
  }

  const actual = entry.sourceRef.depth;
  const isCorrect = actual === test.expectedDepth;
  const icon = isCorrect ? '✅' : '❌';

  console.log(`${icon} ${test.name}`);
  console.log(`   Expected depth: ${test.expectedDepth}`);
  console.log(`   Actual depth:   ${actual}`);

  if (!isCorrect) {
    allDepthsCorrect = false;
  }
}
console.log();

console.log('📋 Step 8: Show JSONL content');
console.log('-'.repeat(80));

const jsonlContent = fs.readFileSync(registryPath, 'utf-8');
const lines = jsonlContent.split('\n').filter((l) => l.trim());

console.log('JSONL file contents:');
console.log();
lines.forEach((line, index) => {
  if (index === 0) {
    console.log('Metadata:');
  } else {
    console.log(`Entry ${index}:`);
  }
  const obj = JSON.parse(line);
  console.log(JSON.stringify(obj, null, 2));
  console.log();
});

console.log('='.repeat(80));
if (allCorrect && allDepthsCorrect) {
  console.log('✅ All tests passed!');
} else {
  console.log('❌ Some tests failed!');
}
console.log('='.repeat(80));
