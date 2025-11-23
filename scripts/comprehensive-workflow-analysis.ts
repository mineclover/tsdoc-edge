/**
 * Comprehensive Workflow Analysis
 * Tests all documentation query and generation workflows
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';
import { ConfigManager } from '../src/config/ConfigManager';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface WorkflowTest {
  name: string;
  test: () => Promise<{ success: boolean; message: string; details?: any }>;
}

async function main() {
  const config = ConfigManager.getInstance().get();
  const db = new DatabaseManager(config.paths.databasePath, config.paths.jsonlDir);

  console.log('🔍 Comprehensive Workflow Analysis\n');
  console.log('Testing all documentation query and generation workflows\n');
  console.log('='.repeat(80));
  console.log();

  const tests: WorkflowTest[] = [
    // 1. Database Statistics
    {
      name: '1. Database Statistics Query',
      test: async () => {
        const symbols = db.getAllSymbols();
        const relationships = db.getAllUnifiedRelationships();

        if (symbols.length === 0) {
          return { success: false, message: 'No symbols found in database' };
        }

        return {
          success: true,
          message: `Found ${symbols.length} symbols, ${relationships.length} relationships`,
          details: {
            symbols: symbols.length,
            relationships: relationships.length,
            density: (relationships.length / symbols.length).toFixed(2)
          }
        };
      }
    },

    // 2. Symbol Retrieval by ID
    {
      name: '2. Symbol Retrieval by ID',
      test: async () => {
        const symbol = db.getSymbol('class-databasemanager');

        if (!symbol) {
          return { success: false, message: 'Failed to retrieve symbol' };
        }

        return {
          success: true,
          message: `Retrieved symbol: ${symbol.name}`,
          details: {
            id: symbol.id,
            type: symbol.type,
            location: `${symbol.filePath}:${symbol.line}`,
            hasSummary: !!symbol.summary,
            hasContract: !!symbol.contract,
            hasResponsibility: !!symbol.responsibility
          }
        };
      }
    },

    // 3. Relationship Query
    {
      name: '3. Relationship Query for Symbol',
      test: async () => {
        const allRels = db.getAllUnifiedRelationships();
        const symbolRels = allRels.filter(r => {
          const from = Array.isArray(r.from) ? r.from : [r.from];
          const to = Array.isArray(r.to) ? r.to : [r.to];
          return from.includes('class-databasemanager') || to.includes('class-databasemanager');
        });

        if (symbolRels.length === 0) {
          return { success: false, message: 'No relationships found' };
        }

        // Group by type
        const byType: Record<string, number> = {};
        for (const rel of symbolRels) {
          byType[rel.type] = (byType[rel.type] || 0) + 1;
        }

        return {
          success: true,
          message: `Found ${symbolRels.length} relationships`,
          details: {
            total: symbolRels.length,
            byType,
            topTypes: Object.entries(byType)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([type, count]) => `${type}:${count}`)
          }
        };
      }
    },

    // 4. Test-as-Example Relationships
    {
      name: '4. Test-as-Example Relationship Query',
      test: async () => {
        const allRels = db.getAllUnifiedRelationships();
        const testExampleRels = allRels.filter(r => r.type === 'test-as-example');

        if (testExampleRels.length === 0) {
          return { success: false, message: 'No test-as-example relationships found' };
        }

        // Find examples for DatabaseManager
        const dmExamples = testExampleRels.filter(r => {
          const to = Array.isArray(r.to) ? r.to : [r.to];
          return to.includes('class-databasemanager');
        });

        return {
          success: true,
          message: `Found ${testExampleRels.length} test-as-example relationships`,
          details: {
            total: testExampleRels.length,
            forDatabaseManager: dmExamples.length,
            sampleExamples: dmExamples.slice(0, 3).map(r => ({
              from: r.from,
              quality: r.confidence,
              category: r.properties?.exampleCategory
            }))
          }
        };
      }
    },

    // 5. Symbol Search
    {
      name: '5. Symbol Search by Name',
      test: async () => {
        const results = db.searchSymbols('Database');

        if (results.length === 0) {
          return { success: false, message: 'Search returned no results' };
        }

        return {
          success: true,
          message: `Found ${results.length} symbols matching 'Database'`,
          details: {
            count: results.length,
            topResults: results.slice(0, 5)
          }
        };
      }
    },

    // 6. Document Symbols
    {
      name: '6. Document Symbol Query',
      test: async () => {
        // Check if managed docs are indexed
        const managedPath = 'managed';

        if (!fs.existsSync(managedPath)) {
          return { success: false, message: 'managed/ directory not found' };
        }

        // Count markdown files
        const countMdFiles = (dir: string): number => {
          let count = 0;
          const items = fs.readdirSync(dir);

          for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
              count += countMdFiles(fullPath);
            } else if (item.endsWith('.md')) {
              count++;
            }
          }

          return count;
        };

        const mdCount = countMdFiles(managedPath);

        return {
          success: true,
          message: `Found ${mdCount} markdown files in managed/`,
          details: {
            markdownFiles: mdCount,
            path: managedPath
          }
        };
      }
    },

    // 7. Relationship Type Coverage
    {
      name: '7. Relationship Type Coverage',
      test: async () => {
        const allRels = db.getAllUnifiedRelationships();

        // Count by type
        const typeCount: Record<string, number> = {};
        for (const rel of allRels) {
          typeCount[rel.type] = (typeCount[rel.type] || 0) + 1;
        }

        const types = Object.keys(typeCount).sort();

        // Expected types from ontology
        const expectedTypes = [
          'test-coverage',
          'code-dependency',
          'contains',
          'test-as-example',
          'naming-pattern-relation',
          'doc-reference',
          'covers-scenario',
          'inheritance',
          'feature-grouping',
          'explicit-semantic-relation'
        ];

        const missingTypes = expectedTypes.filter(t => !types.includes(t));
        const unexpectedTypes = types.filter(t => !expectedTypes.includes(t));

        return {
          success: missingTypes.length === 0,
          message: `Found ${types.length} relationship types`,
          details: {
            foundTypes: types,
            typeCount,
            missingTypes,
            unexpectedTypes: unexpectedTypes.length > 0 ? unexpectedTypes : undefined
          }
        };
      }
    },

    // 8. SSOT Compliance (doc-reference)
    {
      name: '8. SSOT Compliance (doc-reference bidirectional)',
      test: async () => {
        const allRels = db.getAllUnifiedRelationships();
        const docRefs = allRels.filter(r => r.type === 'doc-reference');

        if (docRefs.length === 0) {
          return { success: false, message: 'No doc-reference relationships found' };
        }

        // Check bidirectionality
        const codeToDoc = docRefs.filter(r => {
          const from = Array.isArray(r.from) ? r.from[0] : r.from;
          return !from.startsWith('doc:');
        });
        const docToCode = docRefs.filter(r => {
          const from = Array.isArray(r.from) ? r.from[0] : r.from;
          return from.startsWith('doc:');
        });

        return {
          success: true,
          message: `Found ${docRefs.length} doc-reference relationships`,
          details: {
            total: docRefs.length,
            codeToDoc: codeToDoc.length,
            docToCode: docToCode.length,
            bidirectional: codeToDoc.length > 0 && docToCode.length > 0
          }
        };
      }
    },

    // 9. Relationship Density by Category
    {
      name: '9. Relationship Density by Category',
      test: async () => {
        const allRels = db.getAllUnifiedRelationships();

        const categoryCount: Record<string, number> = {};
        for (const rel of allRels) {
          const cat = rel.category || 'uncategorized';
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        }

        const categories = Object.entries(categoryCount)
          .sort((a, b) => b[1] - a[1]);

        return {
          success: true,
          message: `Found ${categories.length} relationship categories`,
          details: {
            categories: Object.fromEntries(categories),
            top3: categories.slice(0, 3).map(([cat, count]) => `${cat}:${count}`)
          }
        };
      }
    },

    // 10. Inference Engine Results
    {
      name: '10. Inferred Relationships Detection',
      test: async () => {
        const allRels = db.getAllUnifiedRelationships();

        // Inferred relationships have specific properties
        const inferred = allRels.filter(r =>
          r.properties?.inferred === true ||
          r.description?.includes('inferred') ||
          r.description?.includes('Inferred')
        );

        return {
          success: true,
          message: `Found ${inferred.length} potentially inferred relationships`,
          details: {
            inferredCount: inferred.length,
            percentage: ((inferred.length / allRels.length) * 100).toFixed(1) + '%',
            byType: inferred.reduce((acc, r) => {
              acc[r.type] = (acc[r.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          }
        };
      }
    }
  ];

  // Run all tests
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n${test.name}`);
    console.log('-'.repeat(80));

    try {
      const result = await test.test();

      if (result.success) {
        console.log(`✅ ${result.message}`);
        passed++;
      } else {
        console.log(`❌ ${result.message}`);
        failed++;
      }

      if (result.details) {
        console.log('\nDetails:');
        console.log(JSON.stringify(result.details, null, 2));
      }
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Test Summary');
  console.log('-'.repeat(80));
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log();

  // Recommendations
  console.log('💡 Recommendations:');
  console.log('-'.repeat(80));

  if (failed === 0) {
    console.log('✅ All workflows are functioning correctly!');
    console.log('Consider:');
    console.log('  - Updating ontology documentation with latest statistics');
    console.log('  - Creating comprehensive usage examples');
    console.log('  - Adding more relationship inference rules');
  } else {
    console.log(`⚠️  ${failed} workflow(s) need attention`);
    console.log('Review failed tests above for details');
  }

  console.log();

  db.close();
}

main().catch(console.error);
