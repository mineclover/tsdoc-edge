#!/usr/bin/env ts-node
/**
 * Debug TSDoc Parser Output
 */

import { TSDocParser } from '../src/parser/TSDocParser';

const sampleCode = `/**
 * Data processor
 * @id 123
 * @public
 */
export class DataProcessor {}
`;

const parser = new TSDocParser();
const result = parser.parseFile('test.ts', sampleCode);

console.log('Parsed comments:', result.comments.length);

for (const comment of result.comments) {
  console.log('\n=== Comment:', comment.symbolName);
  console.log('customBlocks:', comment.docComment.customBlocks.length);

  for (const block of comment.docComment.customBlocks) {
    console.log('\nBlock tag:', block.blockTag.tagName);
    console.log('Block content nodes:', block.content.nodes.length);

    for (const node of block.content.nodes) {
      console.log('  Node kind:', (node as any).kind);
      console.log('  Node excerpt text:', (node as any).excerpt?.text);

      if ((node as any).nodes) {
        for (const child of (node as any).nodes) {
          console.log('    Child kind:', child.kind);
          console.log('    Child text:', child.text);
          console.log('    Child:', Object.keys(child));
        }
      }
    }
  }

  // Skip modifierTagSet for now
}
