#!/usr/bin/env ts-node
/**
 * Debug validation script to understand TSDoc parsing issues
 */

import { TSDocParser } from '../src/parser/TSDocParser';
import * as fs from 'fs';
import * as path from 'path';

const testFile = path.join(__dirname, '../src/index.ts');
const sourceCode = fs.readFileSync(testFile, 'utf-8');

console.log('Testing TSDoc Parser...\n');

const parser = new TSDocParser();
const result = parser.parseFile(testFile, sourceCode);

console.log(`Found ${result.comments.length} comments\n`);

for (let i = 0; i < Math.min(result.comments.length, 3); i++) {
  const comment = result.comments[i];
  console.log(`=== Comment ${i + 1}: ${comment.symbolName} ===`);
  console.log(`Summary nodes: ${comment.docComment.summarySection.nodes.length}`);
  console.log(`Summary text: ${comment.docComment.summarySection.nodes.map(n => (n as any).text || '').join('')}`);
  console.log(`Modifier tags: ${comment.docComment.modifierTagSet.nodes.map(n => n.tagName).join(', ')}`);
  console.log(`Has @returns: ${!!comment.docComment.returnsBlock}`);
  console.log(`Params: ${comment.docComment.params.blocks.length}`);
  console.log('');
}

if (result.errors.length > 0) {
  console.log('Errors:');
  result.errors.forEach(err => console.log('  ', err.message));
}
