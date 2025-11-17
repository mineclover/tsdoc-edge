/**
 * Debug file path in database
 */

import { DatabaseManager } from '../src/storage/DatabaseManager';
import * as path from 'node:path';

const db = new DatabaseManager('.tsdoc/symbols.db', '.tsdoc');
const allSymbols = db.getAllSymbols();

console.log('Total symbols:', allSymbols.length);
console.log('\nSample file paths:');

// Get unique file paths
const filePaths = new Set(allSymbols.map(s => s.filePath));
console.log('Unique files:', filePaths.size);

// Show some DatabaseManager file paths
const dbManagerSymbols = allSymbols.filter(s => s.filePath.includes('DatabaseManager'));
console.log('\nDatabaseManager symbols:', dbManagerSymbols.length);
dbManagerSymbols.slice(0, 5).forEach(s => {
  console.log(`  ${s.name} -> ${s.filePath}`);
});

// Show absolute vs relative
console.log('\nPath check:');
const testPath1 = 'src/storage/DatabaseManager.ts';
const testPath2 = path.resolve(process.cwd(), testPath1);

console.log(`Relative: ${testPath1}`);
console.log(`Absolute: ${testPath2}`);

const matchRelative = allSymbols.filter(s => s.filePath === testPath1);
const matchAbsolute = allSymbols.filter(s => s.filePath === testPath2);
const matchEndsWith = allSymbols.filter(s => s.filePath.endsWith('DatabaseManager.ts'));

console.log(`\nMatches with relative: ${matchRelative.length}`);
console.log(`Matches with absolute: ${matchAbsolute.length}`);
console.log(`Matches endsWith: ${matchEndsWith.length}`);

if (matchEndsWith.length > 0) {
  console.log(`\nActual path in DB: ${matchEndsWith[0].filePath}`);
}

db.close();
