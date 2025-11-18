/**
 * Analyze Test Example Quality
 * Identifies improvement opportunities in test-example extraction
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';
import { ConfigManager } from '../src/config/ConfigManager';
import { TestExampleExtractor } from '../src/analyzer/TestExampleExtractor';

async function main() {
  const config = ConfigManager.getInstance().get();
  const dbManager = new DatabaseManager(config.paths.databasePath, config.paths.jsonlDir);
  const extractor = new TestExampleExtractor(dbManager);

  console.log('📊 Test Example Quality Analysis\n');

  // Extract all examples
  const allExamples = extractor.extractAllExamples();

  console.log(`Total examples extracted: ${allExamples.length}\n`);

  // 1. Analyze symbol identification accuracy
  console.log('🎯 Symbol Identification Analysis:');
  console.log('─'.repeat(80));

  let examplesWithSymbols = 0;
  let examplesWithoutSymbols = 0;
  let totalSymbolsIdentified = 0;
  const symbolCounts = new Map<number, number>();

  for (const example of allExamples) {
    const count = example.testedSymbols.length;
    totalSymbolsIdentified += count;

    if (count > 0) {
      examplesWithSymbols++;
      symbolCounts.set(count, (symbolCounts.get(count) || 0) + 1);
    } else {
      examplesWithoutSymbols++;
    }
  }

  console.log(`Examples with identified symbols: ${examplesWithSymbols} (${(examplesWithSymbols / allExamples.length * 100).toFixed(1)}%)`);
  console.log(`Examples without symbols: ${examplesWithoutSymbols} (${(examplesWithoutSymbols / allExamples.length * 100).toFixed(1)}%)`);
  console.log(`Average symbols per example: ${(totalSymbolsIdentified / allExamples.length).toFixed(2)}`);
  console.log();

  // Show distribution
  console.log('Symbol count distribution:');
  const sortedCounts = Array.from(symbolCounts.entries()).sort((a, b) => a[0] - b[0]);
  for (const [count, frequency] of sortedCounts.slice(0, 10)) {
    const bar = '█'.repeat(Math.floor(frequency / 20));
    console.log(`  ${count} symbols: ${frequency.toString().padStart(4)} examples ${bar}`);
  }
  console.log();

  // 2. Examples without symbols - need improvement
  console.log('⚠️  Examples Without Symbol Identification (sample):');
  console.log('─'.repeat(80));

  const noSymbols = allExamples.filter(ex => ex.testedSymbols.length === 0).slice(0, 10);
  for (const example of noSymbols) {
    console.log(`  "${example.description}"`);
    console.log(`  File: ${example.filePath}:${example.line}`);
    console.log(`  Code snippet: ${example.code.slice(0, 100)}...`);
    console.log();
  }

  // 3. Quality distribution analysis
  console.log('📈 Quality Distribution:');
  console.log('─'.repeat(80));

  const qualityBuckets = new Map<number, number>();
  for (const example of allExamples) {
    const bucket = Math.floor(example.quality);
    qualityBuckets.set(bucket, (qualityBuckets.get(bucket) || 0) + 1);
  }

  for (let i = 10; i >= 0; i--) {
    const count = qualityBuckets.get(i) || 0;
    const bar = '█'.repeat(Math.floor(count / 20));
    const pct = (count / allExamples.length * 100).toFixed(1);
    console.log(`  Quality ${i}: ${count.toString().padStart(4)} (${pct.padStart(5)}%) ${bar}`);
  }
  console.log();

  // 4. Low quality examples - need improvement
  console.log('🔍 Low Quality Examples (quality < 5) - Sample:');
  console.log('─'.repeat(80));

  const lowQuality = allExamples.filter(ex => ex.quality < 5).slice(0, 5);
  if (lowQuality.length === 0) {
    console.log('  ✅ No low quality examples found!\n');
  } else {
    for (const example of lowQuality) {
      console.log(`  Quality ${example.quality}: "${example.description}"`);
      console.log(`  File: ${example.filePath}:${example.line}`);
      console.log();
    }
  }

  // 5. Category distribution insights
  console.log('📊 Category Distribution:');
  console.log('─'.repeat(80));

  const categoryStats = {
    'basic-usage': allExamples.filter(ex => ex.category === 'basic-usage'),
    'advanced-usage': allExamples.filter(ex => ex.category === 'advanced-usage'),
    'integration': allExamples.filter(ex => ex.category === 'integration'),
    'edge-case': allExamples.filter(ex => ex.category === 'edge-case'),
  };

  for (const [category, examples] of Object.entries(categoryStats)) {
    const avgQuality = examples.reduce((sum, ex) => sum + ex.quality, 0) / examples.length;
    const highQuality = examples.filter(ex => ex.quality >= 8).length;

    console.log(`  ${category.padEnd(15)}: ${examples.length.toString().padStart(4)} examples`);
    console.log(`    Average quality: ${avgQuality.toFixed(2)}`);
    console.log(`    High quality: ${highQuality} (${(highQuality / examples.length * 100).toFixed(1)}%)`);
    console.log();
  }

  // 6. Relationship creation analysis
  console.log('🔗 Relationship Creation Analysis:');
  console.log('─'.repeat(80));

  const relationships = extractor.createRelationships(allExamples);
  console.log(`Total relationships created: ${relationships.length}`);

  const strengthDist = {
    strong: relationships.filter(r => r.strength === 'strong').length,
    medium: relationships.filter(r => r.strength === 'medium').length,
    weak: relationships.filter(r => r.strength === 'weak').length,
  };

  console.log(`  Strong (quality 8-10): ${strengthDist.strong} (${(strengthDist.strong / relationships.length * 100).toFixed(1)}%)`);
  console.log(`  Medium (quality 5-7): ${strengthDist.medium} (${(strengthDist.medium / relationships.length * 100).toFixed(1)}%)`);
  console.log(`  Weak (quality 0-4): ${strengthDist.weak} (${(strengthDist.weak / relationships.length * 100).toFixed(1)}%)`);
  console.log();

  // 7. Identify improvement opportunities
  console.log('💡 Improvement Opportunities:');
  console.log('─'.repeat(80));

  const improvements: string[] = [];

  if (examplesWithoutSymbols > allExamples.length * 0.1) {
    improvements.push(`❌ ${examplesWithoutSymbols} examples (${(examplesWithoutSymbols / allExamples.length * 100).toFixed(1)}%) have no identified symbols`);
    improvements.push('   → Improve symbol identification algorithm');
  }

  const lowQualityCount = allExamples.filter(ex => ex.quality < 5).length;
  if (lowQualityCount > 0) {
    improvements.push(`⚠️  ${lowQualityCount} examples have quality < 5`);
    improvements.push('   → Review quality scoring algorithm');
  }

  const avgSymbolsPerExample = totalSymbolsIdentified / examplesWithSymbols;
  if (avgSymbolsPerExample < 2) {
    improvements.push(`📉 Average ${avgSymbolsPerExample.toFixed(2)} symbols per example is low`);
    improvements.push('   → Enhance symbol detection (methods, properties, etc.)');
  }

  const basicUsagePct = categoryStats['basic-usage'].length / allExamples.length;
  if (basicUsagePct > 0.8) {
    improvements.push(`📚 ${(basicUsagePct * 100).toFixed(1)}% examples are basic-usage`);
    improvements.push('   → Categorization might be too broad');
  }

  if (improvements.length === 0) {
    console.log('  ✅ No major improvement opportunities identified!');
    console.log('  System is performing well.');
  } else {
    for (const improvement of improvements) {
      console.log(`  ${improvement}`);
    }
  }
  console.log();

  // 8. Specific recommendations
  console.log('🎯 Specific Recommendations:');
  console.log('─'.repeat(80));

  console.log('1. Symbol Identification:');
  console.log('   - Add property access detection (obj.property)');
  console.log('   - Add method call chaining detection (obj.method1().method2())');
  console.log('   - Add static method detection (ClassName.staticMethod)');
  console.log('   - Parse import statements to identify tested modules');
  console.log();

  console.log('2. Quality Scoring:');
  console.log('   - Reward descriptive variable names');
  console.log('   - Reward use of beforeEach/afterEach for clean setup');
  console.log('   - Penalize very long tests (>50 lines)');
  console.log('   - Reward multiple related assertions');
  console.log();

  console.log('3. Category Classification:');
  console.log('   - Add keyword-based analysis (setup, teardown, mock, stub)');
  console.log('   - Consider test file structure (describe blocks)');
  console.log('   - Detect data-driven tests (test.each)');
  console.log();

  dbManager.close();
}

main().catch(console.error);
