#!/usr/bin/env ts-node
/**
 * Demo script for fold/unfold system
 * This demonstrates the complete workflow of comment management
 */

import { CommentStateManager } from '../src/fold/CommentStateManager';
import * as fs from 'fs';
import * as path from 'path';

console.log('='.repeat(80));
console.log('TSDoc Edge - Fold/Unfold System Demo');
console.log('='.repeat(80));
console.log();

const manager = new CommentStateManager('.tsdoc-comments-demo');

// ========================================
// STEP 1: Export comments from a file
// ========================================
console.log('📤 STEP 1: Export Comments to Markdown');
console.log('-'.repeat(80));

const testFile = path.join(__dirname, '../src/index.ts');
console.log(`Source file: ${testFile}`);

try {
  const markdownPath = manager.exportFile(testFile);
  console.log(`✅ Exported to: ${markdownPath}`);

  const stats = fs.statSync(markdownPath);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);

  // Show status
  const status = manager.getStatus(testFile);
  console.log(`   Total comments: ${status.totalComments}`);
  console.log(`   Expanded: ${status.expandedComments}`);
  console.log(`   Collapsed: ${status.collapsedComments}`);
} catch (error) {
  console.error(`❌ Error:`, error);
}

console.log();

// ========================================
// STEP 2: Collapse specific comments
// ========================================
console.log('📁 STEP 2: Collapse Comments');
console.log('-'.repeat(80));

try {
  // Collapse all private methods (if any start with _)
  console.log('Collapsing private methods (pattern: "^_")...');
  manager.collapse(testFile, {
    pattern: '^_',
  });

  // Collapse short methods (less than 5 lines)
  console.log('Collapsing getter methods (pattern: "^get")...');
  manager.collapse(testFile, {
    pattern: '^get',
  });

  const status = manager.getStatus(testFile);
  console.log(`✅ Status after collapse:`);
  console.log(`   Total: ${status.totalComments}`);
  console.log(`   Expanded: ${status.expandedComments}`);
  console.log(`   Collapsed: ${status.collapsedComments}`);
} catch (error) {
  console.error(`❌ Error:`, error);
}

console.log();

// ========================================
// STEP 3: Apply collapsed comments to file
// ========================================
console.log('💾 STEP 3: Apply Comments to File (Preview)');
console.log('-'.repeat(80));

try {
  // Import to a preview file (not overwriting original)
  const previewFile = manager.importFile(testFile, false);
  console.log(`✅ Preview file created: ${previewFile}`);

  // Show snippet
  const content = fs.readFileSync(previewFile, 'utf-8');
  const lines = content.split('\n').slice(45, 65); // Show sample
  console.log('\nPreview (lines 46-65):');
  console.log('-'.repeat(40));
  lines.forEach((line, i) => {
    console.log(`${46 + i}: ${line}`);
  });
} catch (error) {
  console.error(`❌ Error:`, error);
}

console.log();

// ========================================
// STEP 4: Expand comments back
// ========================================
console.log('📂 STEP 4: Expand Comments');
console.log('-'.repeat(80));

try {
  console.log('Expanding all comments...');
  manager.expand(testFile, { all: true });

  const status = manager.getStatus(testFile);
  console.log(`✅ Status after expand:`);
  console.log(`   Total: ${status.totalComments}`);
  console.log(`   Expanded: ${status.expandedComments}`);
  console.log(`   Collapsed: ${status.collapsedComments}`);
} catch (error) {
  console.error(`❌ Error:`, error);
}

console.log();

// ========================================
// STEP 5: Export all files
// ========================================
console.log('📦 STEP 5: Export All Files');
console.log('-'.repeat(80));

try {
  const srcDir = path.join(__dirname, '../src');
  console.log(`Scanning directory: ${srcDir}`);

  const result = manager.exportAll(srcDir);
  console.log(`✅ Export complete:`);
  console.log(`   Files exported: ${result.filesExported}`);
  console.log(`   Comments exported: ${result.commentsExported}`);
  console.log(`   Output directory: ${result.outputDir}`);

  console.log('\n   Exported files:');
  result.exportedFiles.slice(0, 5).forEach((file) => {
    console.log(`     - ${file}`);
  });
  if (result.exportedFiles.length > 5) {
    console.log(`     ... and ${result.exportedFiles.length - 5} more`);
  }
} catch (error) {
  console.error(`❌ Error:`, error);
}

console.log();

// ========================================
// STEP 6: Status Summary
// ========================================
console.log('📊 STEP 6: Status Summary');
console.log('-'.repeat(80));

try {
  const allStatus = manager.getAllStatus();
  console.log(`Total files tracked: ${allStatus.length}\n`);

  // Show top 10 files
  allStatus.slice(0, 10).forEach((status) => {
    const collapsed = status.collapsedComments;
    const expanded = status.expandedComments;
    const total = status.totalComments;

    const collapsedBar = '█'.repeat(Math.floor((collapsed / total) * 20));
    const expandedBar = '░'.repeat(Math.floor((expanded / total) * 20));

    console.log(`${status.filePath}`);
    console.log(`  [${collapsedBar}${expandedBar}] ${collapsed}/${total} collapsed`);
  });

  if (allStatus.length > 10) {
    console.log(`\n  ... and ${allStatus.length - 10} more files`);
  }
} catch (error) {
  console.error(`❌ Error:`, error);
}

console.log();
console.log('='.repeat(80));
console.log('✅ Demo Complete!');
console.log('='.repeat(80));
console.log();
console.log('Next steps:');
console.log('  1. Check generated markdown files:');
console.log('     ls -la .tsdoc-comments-demo/');
console.log('  2. Review collapsed comments:');
console.log('     cat src/index.ts.backup');
console.log('  3. Clean up demo files:');
console.log('     rm -rf .tsdoc-comments-demo/');
console.log('     rm src/index.ts.backup');
console.log();
