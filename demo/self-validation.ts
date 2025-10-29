#!/usr/bin/env ts-node

/**
 * Self-validation script for tsdoc-edge project
 * This script analyzes the tsdoc-edge codebase itself
 * to check TSDoc documentation completeness
 */

import * as fs from 'fs';
import * as path from 'path';
import { TSDocParser } from '../src/parser/TSDocParser';
import { ConventionValidator } from '../src/validator/ConventionValidator';

interface FileAnalysis {
  filePath: string;
  hasDocumentation: boolean;
  validationResults: any[];
  symbolCount: number;
  documentedSymbols: number;
}

console.log('='.repeat(80));
console.log('TSDoc Edge - Self Validation Report');
console.log('='.repeat(80));
console.log();

const srcDir = path.join(__dirname, '../src');
const parser = new TSDocParser();
const validator = new ConventionValidator();

const results: FileAnalysis[] = [];

/**
 * Recursively find all TypeScript files
 */
function findTsFiles(dir: string, files: string[] = []): string[] {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (item !== '__tests__' && item !== 'node_modules') {
        findTsFiles(fullPath, files);
      }
    } else if (item.endsWith('.ts') && !item.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

const tsFiles = findTsFiles(srcDir);
console.log(`Found ${tsFiles.length} TypeScript files to analyze\n`);

for (const file of tsFiles) {
  const relativePath = path.relative(process.cwd(), file);
  const sourceCode = fs.readFileSync(file, 'utf-8');

  const parseResult = parser.parseFile(file, sourceCode);

  const validatedComments = parseResult.comments.map((comment) => validator.validate(comment));

  const analysis: FileAnalysis = {
    filePath: relativePath,
    hasDocumentation: parseResult.comments.length > 0,
    validationResults: validatedComments,
    symbolCount: parseResult.comments.length,
    documentedSymbols: validatedComments.filter((c) => c.isValid).length,
  };

  results.push(analysis);
}

// Print summary
console.log('📊 SUMMARY');
console.log('-'.repeat(80));

const totalFiles = results.length;
const filesWithDocs = results.filter((r) => r.hasDocumentation).length;
const totalSymbols = results.reduce((sum, r) => sum + r.symbolCount, 0);
const validSymbols = results.reduce((sum, r) => sum + r.documentedSymbols, 0);

console.log(`Total Files Analyzed: ${totalFiles}`);
console.log(
  `Files with Documentation: ${filesWithDocs} (${((filesWithDocs / totalFiles) * 100).toFixed(1)}%)`
);
console.log(`Total Symbols Found: ${totalSymbols}`);
console.log(
  `Valid Symbols: ${validSymbols} (${totalSymbols > 0 ? ((validSymbols / totalSymbols) * 100).toFixed(1) : 0}%)`
);
console.log();

// Print details
console.log('📄 FILE DETAILS');
console.log('-'.repeat(80));

for (const result of results) {
  const status = result.hasDocumentation ? '✅' : '❌';
  const coverage =
    result.symbolCount > 0 ? `${result.documentedSymbols}/${result.symbolCount}` : '0/0';

  console.log(`${status} ${result.filePath} (${coverage})`);

  // Show validation errors
  const errors = result.validationResults
    .filter((v) => !v.isValid)
    .flatMap((v) => v.validationResults);

  if (errors.length > 0) {
    errors.forEach((err) => {
      console.log(`   ⚠️  ${err.message}`);
    });
  }
}

console.log();
console.log('='.repeat(80));
console.log('✅ Self-validation complete!');
console.log('='.repeat(80));
