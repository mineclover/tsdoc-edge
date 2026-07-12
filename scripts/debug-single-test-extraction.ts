/**
 * Debug a single test file extraction in detail
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { ConfigManager } from '../src/config/ConfigManager';
import { DatabaseManager } from '../src/storage/DatabaseManager';

// Reproduce the exact logic from TestExampleExtractor
const toKebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
};

async function main() {
  const config = ConfigManager.getInstance().get();
  const db = new DatabaseManager(config.paths.databasePath, config.paths.jsonlDir);

  const testFilePath = 'src/__tests__/storage/DatabaseManager.test.ts';
  const moduleName = 'DatabaseManager';
  const moduleKebab = toKebabCase(moduleName);

  console.log('🔍 Debugging Symbol Identification\n');
  console.log(`Test file: ${testFilePath}`);
  console.log(`Module name: ${moduleName}`);
  console.log(`Module kebab: ${moduleKebab}`);
  console.log();

  // Get all symbols
  const allSymbols = db.getAllSymbols();
  console.log(`Total symbols in DB: ${allSymbols.length}\n`);

  // Filter module symbols
  const moduleSymbols = allSymbols.filter((s) => {
    const fileName = path.basename(s.filePath, path.extname(s.filePath));
    const fileKebab = toKebabCase(fileName);
    const match = fileKebab === moduleKebab;

    if (match) {
      console.log(`  Matched: ${s.id} from ${s.filePath}`);
    }

    return match;
  });

  console.log(`\nModule symbols found: ${moduleSymbols.length}`);
  console.log();

  // Look for main class
  const mainClass = moduleSymbols.find(
    (s) => s.type === 'class' && s.id === `class-${moduleKebab}`
  );

  console.log(`Looking for main class: class-${moduleKebab}`);
  console.log(`Main class found: ${mainClass ? mainClass.id : 'NOT FOUND'}`);
  console.log();

  // Show all module symbols
  console.log('All symbols from module:');
  for (const sym of moduleSymbols) {
    console.log(`  ${sym.id.padEnd(60)} (${sym.type})`);
  }
  console.log();

  // Read test file and parse
  const sourceCode = fs.readFileSync(testFilePath, 'utf-8');
  const sourceFile = ts.createSourceFile(testFilePath, sourceCode, ts.ScriptTarget.Latest, true);

  // Find first test case
  let firstTest: any = null;
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === 'it' || node.expression.text === 'test')
    ) {
      if (!firstTest) {
        firstTest = node;
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  if (firstTest) {
    const args = firstTest.arguments;
    const descriptionArg = args[0];
    const description = (descriptionArg as ts.StringLiteral).text;

    console.log(`\nFirst test: "${description}"`);
    console.log();

    // Test description parsing
    const descWords = description.toLowerCase().split(/\s+/);
    console.log('Description words:', descWords);
    console.log();

    console.log('Checking description words against methods:');
    for (const word of descWords) {
      if (word.length < 3) continue;

      const methodKebab = toKebabCase(word);
      const methodSymbol = moduleSymbols.find(
        (s) => s.type === 'method' && s.id.includes(`-${methodKebab}`)
      );

      console.log(
        `  "${word}" → "${methodKebab}" → ${methodSymbol ? methodSymbol.id : 'not found'}`
      );
    }
  }

  db.close();
}

main().catch(console.error);
