#!/usr/bin/env ts-node

/**
 * Configuration System Demo
 *
 * Demonstrates the new configuration system in TSDoc Edge v0.4.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CommentStateManager, ConfigManager, DatabaseManager } from '../src/index';

console.log('='.repeat(80));
console.log('TSDoc Edge - Configuration System Demo');
console.log('='.repeat(80));
console.log();

// Demo directory
const demoDir = path.join(process.cwd(), 'demo', 'config-test');

// Clean up if exists
if (fs.existsSync(demoDir)) {
  fs.rmSync(demoDir, { recursive: true });
}

fs.mkdirSync(demoDir, { recursive: true });

// DEMO 1: Initialize Configuration
console.log('DEMO 1: Initialize Configuration');
console.log('-'.repeat(80));

// Reset singleton for demo
ConfigManager.reset();

const configManager = ConfigManager.getInstance(demoDir);

configManager.init({
  project: {
    name: 'config-demo-project',
    version: '0.4.0',
  },
  paths: {
    commentsDir: 'custom-comments',
    databasePath: 'custom.db',
    jsonlDir: 'custom/data',
    outputDir: 'custom/output',
  },
});

console.log('✅ Configuration initialized');
console.log(`   Config file: ${configManager.getConfigPath()}`);
console.log();

// DEMO 2: Read Configuration
console.log('DEMO 2: Read Configuration');
console.log('-'.repeat(80));

const config = configManager.get();
console.log('Project:', config.project);
console.log('Paths:', config.paths);
console.log();

// DEMO 3: Resolve Paths
console.log('DEMO 3: Resolve Paths');
console.log('-'.repeat(80));

const commentsPath = configManager.resolvePath(config.paths.commentsDir);
const dbPath = configManager.resolvePath(config.paths.databasePath);

console.log('Comments directory:', commentsPath);
console.log('Database path:', dbPath);
console.log();

// DEMO 4: Ensure Directories
console.log('DEMO 4: Ensure Directories');
console.log('-'.repeat(80));

configManager.ensureDirectories();

console.log('✅ Directories created:');
console.log(`   ${fs.existsSync(commentsPath) ? '✓' : '✗'} ${config.paths.commentsDir}`);
console.log(
  `   ${fs.existsSync(path.join(demoDir, config.paths.jsonlDir)) ? '✓' : '✗'} ${config.paths.jsonlDir}`
);
console.log(
  `   ${fs.existsSync(path.join(demoDir, config.paths.outputDir || '')) ? '✓' : '✗'} ${config.paths.outputDir}`
);
console.log();

// DEMO 5: Validate Configuration
console.log('DEMO 5: Validate Configuration');
console.log('-'.repeat(80));

const validation = configManager.validate();
console.log('Valid:', validation.valid);
console.log('Errors:', validation.errors.length);
if (validation.errors.length > 0) {
  validation.errors.forEach((err) => console.log(`  - ${err}`));
}
console.log();

// DEMO 6: Update Configuration
console.log('DEMO 6: Update Configuration');
console.log('-'.repeat(80));

console.log('Before update:');
console.log('  minConnectivityScore:', config.validation?.minConnectivityScore);

configManager.update('validation', {
  strictMode: true,
  minConnectivityScore: 85,
});

const updatedConfig = configManager.get();
console.log('After update:');
console.log('  strictMode:', updatedConfig.validation?.strictMode);
console.log('  minConnectivityScore:', updatedConfig.validation?.minConnectivityScore);
console.log();

// DEMO 7: Use Config with CommentStateManager
console.log('DEMO 7: Use Config with CommentStateManager');
console.log('-'.repeat(80));

// Reset singleton to use new config
ConfigManager.reset();
const _newConfigManager = ConfigManager.getInstance(demoDir);

const _stateManager = new CommentStateManager();
// Automatically uses config.paths.commentsDir

console.log('✅ CommentStateManager initialized');
console.log('   Using comments directory from config');
console.log();

// DEMO 8: Use Config with DatabaseManager
console.log('DEMO 8: Use Config with DatabaseManager');
console.log('-'.repeat(80));

const dbManager = new DatabaseManager();
// Automatically uses config.paths.databasePath and config.paths.jsonlDir

console.log('✅ DatabaseManager initialized');
console.log('   Using database path from config');
console.log('   Using JSONL directory from config');

const stats = dbManager.getStatistics();
console.log('   Database stats:');
console.log(`     Total symbols: ${stats.totalSymbols}`);
console.log(`     DB size: ${stats.dbSize} bytes`);

dbManager.close();
console.log();

// DEMO 9: Custom Path Override
console.log('DEMO 9: Custom Path Override');
console.log('-'.repeat(80));

const customComments = path.join(demoDir, 'override-comments');
const _customStateManager = new CommentStateManager(customComments);

console.log('✅ CommentStateManager with custom path');
console.log('   Custom path:', customComments);
console.log('   (Overrides config setting)');
console.log();

// DEMO 10: Config File Content
console.log('DEMO 10: Config File Content');
console.log('-'.repeat(80));

const configContent = fs.readFileSync(configManager.getConfigPath(), 'utf-8');
console.log('Config file content:');
console.log(configContent);
console.log();

// Summary
console.log('='.repeat(80));
console.log('Summary: Configuration System Features');
console.log('='.repeat(80));
console.log();

console.log('✅ Configuration Management:');
console.log('   - Initialize with tsdoc-edge init');
console.log('   - Centralized .tsdoc.config.json');
console.log('   - Customize all storage paths');
console.log('   - Validation and error checking');
console.log();

console.log('✅ Integration:');
console.log('   - CommentStateManager uses config automatically');
console.log('   - DatabaseManager uses config automatically');
console.log('   - Override with custom paths when needed');
console.log();

console.log('✅ Features:');
console.log('   - Project metadata (name, version)');
console.log('   - Custom storage paths (comments, DB, JSONL)');
console.log('   - Fold/unfold settings');
console.log('   - Validation rules');
console.log('   - Generator options');
console.log();

console.log('📖 For more details:');
console.log('   See docs/CONFIG_GUIDE.md');
console.log();

// Cleanup
console.log('Cleaning up demo directory...');
fs.rmSync(demoDir, { recursive: true });
console.log('✅ Done');
console.log();
