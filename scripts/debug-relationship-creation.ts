/**
 * Debug why relationship creation rate is low
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';
import { ConfigManager } from '../src/config/ConfigManager';
import { TestExampleExtractor } from '../src/analyzer/TestExampleExtractor';

async function main() {
  const config = ConfigManager.getInstance().get();
  const dbManager = new DatabaseManager(config.paths.databasePath, config.paths.jsonlDir);
  const extractor = new TestExampleExtractor(dbManager);

  console.log('🔍 Debugging Relationship Creation\n');

  // Extract examples
  const allExamples = extractor.extractAllExamples();
  console.log(`Total examples: ${allExamples.length}`);

  // Get all symbols from database
  const allSymbols = dbManager.getAllSymbols();
  console.log(`Total symbols in DB: ${allSymbols.length}\n`);

  // Create symbol ID set for quick lookup
  const symbolIds = new Set(allSymbols.map(s => s.id));

  // Analyze matching
  let examplesWithMatches = 0;
  let examplesWithoutMatches = 0;
  let totalMatches = 0;
  let totalIdentified = 0;

  const unmatchedSymbols = new Map<string, number>();

  for (const example of allExamples) {
    totalIdentified += example.testedSymbols.length;

    let hasMatch = false;
    for (const testedSymbol of example.testedSymbols) {
      if (symbolIds.has(testedSymbol)) {
        totalMatches++;
        hasMatch = true;
      } else {
        unmatchedSymbols.set(testedSymbol, (unmatchedSymbols.get(testedSymbol) || 0) + 1);
      }
    }

    if (hasMatch) {
      examplesWithMatches++;
    } else if (example.testedSymbols.length > 0) {
      examplesWithoutMatches++;
    }
  }

  console.log('📊 Matching Statistics:');
  console.log('─'.repeat(80));
  console.log(`Examples with at least one match: ${examplesWithMatches}`);
  console.log(`Examples without any matches: ${examplesWithoutMatches}`);
  console.log(`Total identified symbols: ${totalIdentified}`);
  console.log(`Total matched symbols: ${totalMatches}`);
  console.log(`Match rate: ${(totalMatches / totalIdentified * 100).toFixed(1)}%\n`);

  // Show top unmatched symbols
  console.log('🔴 Top 30 Unmatched Symbol Patterns:');
  console.log('─'.repeat(80));

  const sortedUnmatched = Array.from(unmatchedSymbols.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  for (const [symbol, count] of sortedUnmatched) {
    console.log(`  ${symbol.padEnd(60)} (${count} occurrences)`);
  }
  console.log();

  // Analyze patterns
  console.log('🔍 Pattern Analysis:');
  console.log('─'.repeat(80));

  const patterns = {
    'method-*': sortedUnmatched.filter(([s]) => s.startsWith('method-')),
    'class-*': sortedUnmatched.filter(([s]) => s.startsWith('class-')),
    'function-*': sortedUnmatched.filter(([s]) => s.startsWith('function-')),
  };

  for (const [pattern, matches] of Object.entries(patterns)) {
    const total = matches.reduce((sum, [, count]) => sum + count, 0);
    console.log(`  ${pattern}: ${matches.length} unique symbols, ${total} occurrences`);
  }
  console.log();

  // Sample actual symbol IDs from database
  console.log('✅ Sample Actual Symbol IDs from Database:');
  console.log('─'.repeat(80));

  const sampleSymbols = allSymbols
    .filter(s => s.type === 'class' || s.type === 'method')
    .slice(0, 20);

  for (const symbol of sampleSymbols) {
    console.log(`  ${symbol.id.padEnd(50)} (${symbol.type})`);
  }
  console.log();

  // Recommendations
  console.log('💡 Recommendations:');
  console.log('─'.repeat(80));
  console.log('1. Symbol ID generation mismatch:');
  console.log('   - Test extraction generates: method-modulename-methodname');
  console.log('   - Database might use different format');
  console.log('   - Need to align symbol ID generation logic');
  console.log();
  console.log('2. Missing symbol types:');
  console.log('   - Many method-* and class-* identifiers not found');
  console.log('   - Check if these symbols exist in database');
  console.log('   - May need to extract from test file being tested');
  console.log();
  console.log('3. Improved matching strategy:');
  console.log('   - Parse import statements to find tested module');
  console.log('   - Use file name to infer tested module');
  console.log('   - Match by symbol name (fuzzy matching)');
  console.log();

  dbManager.close();
}

main().catch(console.error);
