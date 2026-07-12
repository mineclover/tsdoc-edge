/**
 * Test improved extraction with detailed analysis
 */

import { TestExampleExtractor } from '../src/analyzer/TestExampleExtractor';
import { ConfigManager } from '../src/config/ConfigManager';
import { DatabaseManager } from '../src/storage/DatabaseManager';

async function main() {
  const config = ConfigManager.getInstance().get();
  const dbManager = new DatabaseManager(config.paths.databasePath, config.paths.jsonlDir);
  const extractor = new TestExampleExtractor(dbManager);

  console.log('🧪 Testing Improved Extraction\n');

  // Extract from a single test file for detailed analysis
  const testFile = 'src/__tests__/storage/DatabaseManager.test.ts';
  const examples = extractor.extractExamples(testFile);

  console.log(`Test file: ${testFile}`);
  console.log(`Examples extracted: ${examples.length}\n`);

  // Show first 5 examples with their symbols
  console.log('📋 Sample Examples with Identified Symbols:');
  console.log('─'.repeat(80));

  for (let i = 0; i < Math.min(5, examples.length); i++) {
    const ex = examples[i];
    console.log(`\n${i + 1}. "${ex.description}"`);
    console.log(
      `   Quality: ${ex.quality}/10 | Complexity: ${ex.complexity} | Category: ${ex.category}`
    );
    console.log(`   Identified symbols (${ex.testedSymbols.length}):`);

    // Show first 10 symbols
    for (let j = 0; j < Math.min(10, ex.testedSymbols.length); j++) {
      console.log(`     - ${ex.testedSymbols[j]}`);
    }

    if (ex.testedSymbols.length > 10) {
      console.log(`     ... and ${ex.testedSymbols.length - 10} more`);
    }
  }

  console.log('\n\n📊 Statistics:');
  console.log('─'.repeat(80));

  const totalSymbols = examples.reduce((sum, ex) => sum + ex.testedSymbols.length, 0);
  const avgSymbols = totalSymbols / examples.length;

  console.log(`Total examples: ${examples.length}`);
  console.log(`Total symbols identified: ${totalSymbols}`);
  console.log(`Average symbols per example: ${avgSymbols.toFixed(2)}`);
  console.log();

  // Analyze symbol distribution
  const symbolCounts = new Map<number, number>();
  for (const ex of examples) {
    const count = ex.testedSymbols.length;
    symbolCounts.set(count, (symbolCounts.get(count) || 0) + 1);
  }

  console.log('Symbol count distribution:');
  const sortedCounts = Array.from(symbolCounts.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(0, 20);

  for (const [count, frequency] of sortedCounts) {
    const bar = '█'.repeat(Math.floor(frequency / 5));
    console.log(
      `  ${count.toString().padStart(3)} symbols: ${frequency.toString().padStart(3)} examples ${bar}`
    );
  }

  // Create relationships
  console.log('\n\n🔗 Relationship Creation:');
  console.log('─'.repeat(80));

  const relationships = extractor.createRelationships(examples);
  console.log(`Relationships created: ${relationships.length}`);
  console.log(`Unique symbols linked: ${new Set(relationships.map((r) => r.to)).size}`);
  console.log();

  // Show sample relationships
  console.log('Sample relationships:');
  for (let i = 0; i < Math.min(10, relationships.length); i++) {
    const rel = relationships[i];
    console.log(
      `  ${rel.from} → ${rel.to} (${rel.strength}, quality: ${rel.confidence.toFixed(2)})`
    );
  }

  dbManager.close();
}

main().catch(console.error);
