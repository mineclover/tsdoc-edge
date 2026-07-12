#!/usr/bin/env ts-node
/**
 * Validate all [[Symbol]] references in documentation
 *
 * Ensures that every symbol reference can be resolved in the database
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseManager } from '../src/storage/DatabaseManager';

interface ValidationResult {
  file: string;
  totalRefs: number;
  foundRefs: number;
  missingRefs: Array<{ symbol: string; line: number }>;
}

function extractSymbolReferences(content: string): Array<{ symbol: string; line: number }> {
  const refs: Array<{ symbol: string; line: number }> = [];
  const lines = content.split('\n');
  const pattern = /\[\[([^\]]+)\]\]/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    while ((match = pattern.exec(line)) !== null) {
      refs.push({ symbol: match[1], line: i + 1 });
    }
  }

  return refs;
}

function validateFile(filePath: string, db: DatabaseManager): ValidationResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const refs = extractSymbolReferences(content);
  const allSymbols = db.getAllSymbols();
  const symbolNames = new Set(allSymbols.map((s) => s.name));

  const result: ValidationResult = {
    file: filePath,
    totalRefs: refs.length,
    foundRefs: 0,
    missingRefs: [],
  };

  for (const ref of refs) {
    if (symbolNames.has(ref.symbol)) {
      result.foundRefs++;
    } else {
      result.missingRefs.push(ref);
    }
  }

  return result;
}

function getAllDocFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

// Main validation
const db = new DatabaseManager();
const managedDir = path.join(process.cwd(), 'managed');
const docFiles = getAllDocFiles(managedDir);

console.log('\n=== Symbol Reference Validation ===\n');
console.log(`Scanning ${docFiles.length} documentation files...\n`);

let totalFiles = 0;
let filesWithIssues = 0;
let totalRefs = 0;
let foundRefs = 0;
let missingRefs = 0;

const issueFiles: ValidationResult[] = [];

for (const file of docFiles) {
  const result = validateFile(file, db);
  totalFiles++;
  totalRefs += result.totalRefs;
  foundRefs += result.foundRefs;
  missingRefs += result.missingRefs.length;

  if (result.missingRefs.length > 0) {
    filesWithIssues++;
    issueFiles.push(result);
  }
}

console.log(`Files scanned: ${totalFiles}`);
console.log(`Total symbol references: ${totalRefs}`);
console.log(`Found in database: ${foundRefs}`);
console.log(`Missing from database: ${missingRefs}`);
console.log(`Files with issues: ${filesWithIssues}\n`);

if (issueFiles.length > 0) {
  console.log('Files with missing references:\n');
  for (const issue of issueFiles.slice(0, 10)) {
    const relPath = path.relative(process.cwd(), issue.file);
    console.log(`  ${relPath}:`);
    console.log(
      `    Total refs: ${issue.totalRefs}, Found: ${issue.foundRefs}, Missing: ${issue.missingRefs.length}`
    );
    issue.missingRefs.slice(0, 3).forEach((ref) => {
      console.log(`      - [[${ref.symbol}]] at line ${ref.line}`);
    });
    if (issue.missingRefs.length > 3) {
      console.log(`      ... and ${issue.missingRefs.length - 3} more`);
    }
  }
  if (issueFiles.length > 10) {
    console.log(`\n  ... and ${issueFiles.length - 10} more files with issues`);
  }
} else {
  console.log('✓ All symbol references are valid!\n');
}

db.close();
