/**
 * Tests for MissingLinkDetector
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { MissingLinkDetector } from '../analyzer/MissingLinkDetector';

describe('MissingLinkDetector', () => {
  let tempDir: string;
  let detector: MissingLinkDetector;

  beforeEach(() => {
    tempDir = path.join(__dirname, '__temp_missing_link__');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    detector = new MissingLinkDetector();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('Valid References', () => {
    test('should report no broken links when all references are valid', () => {
      // Create file with valid dependency reference
      const file1 = path.join(tempDir, 'utils.ts');
      const file2 = path.join(tempDir, 'processor.ts');

      fs.writeFileSync(
        file1,
        `
/**
 * Utility function
 */
export function parseData() {}
      `.trim()
      );

      fs.writeFileSync(
        file2,
        `
/**
 * Data processor
 * @depends parseData
 * @depType symbol
 * @depReason Need to parse data
 */
export class DataProcessor {}
      `.trim()
      );

      const report = detector.analyze(tempDir);

      expect(report.brokenLinks).toBe(0);
      expect(report.links).toHaveLength(0);
    });
  });

  describe('Broken Dependency Links', () => {
    test('should detect missing symbol dependency', () => {
      const file1 = path.join(tempDir, 'processor.ts');

      fs.writeFileSync(
        file1,
        `
/**
 * Data processor
 * @depends NonExistentFunction
 * @depType symbol
 */
export class DataProcessor {}
      `.trim()
      );

      const report = detector.analyze(tempDir);

      expect(report.brokenLinks).toBe(1);
      expect(report.links[0]).toMatchObject({
        sourceSymbol: 'DataProcessor',
        linkType: 'dependency',
        target: 'NonExistentFunction',
      });
      expect(report.links[0].reason).toContain('not found');
    });

    test('should suggest similar symbols for typos', () => {
      const file1 = path.join(tempDir, 'utils.ts');
      const file2 = path.join(tempDir, 'processor.ts');

      fs.writeFileSync(
        file1,
        `
/**
 * Parse CSV data
 */
export function parseCSVData() {}
      `.trim()
      );

      fs.writeFileSync(
        file2,
        `
/**
 * Data processor
 * @depends parseCsvData
 * @depType symbol
 */
export class DataProcessor {}
      `.trim()
      );

      const report = detector.analyze(tempDir);

      expect(report.brokenLinks).toBe(1);
      expect(report.links[0].suggestedFix).toBeDefined();
      expect(report.links[0].suggestedFix).toContain('parseCSVData');
    });
  });

  describe('Broken File Links', () => {
    test('should detect missing file dependency', () => {
      const file1 = path.join(tempDir, 'processor.ts');

      fs.writeFileSync(
        file1,
        `
/**
 * Data processor
 * @depends ./nonexistent.ts
 * @depType file
 */
export class DataProcessor {}
      `.trim()
      );

      const report = detector.analyze(tempDir);

      expect(report.brokenLinks).toBe(1);
      expect(report.links[0].linkType).toBe('file');
      expect(report.links[0].target).toBe('./nonexistent.ts');
    });
  });

  describe('Broken Related Problem Links', () => {
    test('should detect missing related problem reference', () => {
      const file1 = path.join(tempDir, 'processor.ts');

      fs.writeFileSync(
        file1,
        `
/**
 * Data processor
 * @problem Handle large files
 * @relatedProblem NonExistentProblem
 */
export class DataProcessor {}
      `.trim()
      );

      const report = detector.analyze(tempDir);

      expect(report.brokenLinks).toBe(1);
      expect(report.links[0].linkType).toBe('relatedProblem');
    });
  });

  describe('Grouping', () => {
    test('should group broken links by type', () => {
      const file1 = path.join(tempDir, 'processor.ts');

      fs.writeFileSync(
        file1,
        `
/**
 * Data processor
 * @problem Test problem
 * @relatedProblem MissingProblem
 */
export class DataProcessor {}
      `.trim()
      );

      const report = detector.analyze(tempDir);

      // relatedProblem counts as 1 link
      expect(report.brokenLinks).toBeGreaterThanOrEqual(1);
      expect(report.byType.size).toBeGreaterThan(0);
      expect(report.byType.has('relatedProblem')).toBe(true);
    });

    test('should group broken links by file', () => {
      const file1 = path.join(tempDir, 'processor1.ts');
      const file2 = path.join(tempDir, 'processor2.ts');

      fs.writeFileSync(
        file1,
        `
/**
 * Processor 1
 * @problem Test
 * @relatedProblem Missing1
 */
export class Processor1 {}
      `.trim()
      );

      fs.writeFileSync(
        file2,
        `
/**
 * Processor 2
 * @problem Test
 * @relatedProblem Missing2
 */
export class Processor2 {}
      `.trim()
      );

      const report = detector.analyze(tempDir);

      expect(report.brokenLinks).toBe(2);
      expect(report.byFile.size).toBe(2);
    });
  });

  describe('Multiple Dependencies', () => {
    test('should check all dependencies in a list', () => {
      const file1 = path.join(tempDir, 'existing.ts');
      const file2 = path.join(tempDir, 'processor.ts');

      fs.writeFileSync(
        file1,
        `
/**
 * Existing function
 */
export function existingFunction() {}
      `.trim()
      );

      fs.writeFileSync(
        file2,
        `
/**
 * Data processor
 * @depends existingFunction, missingFunction1, missingFunction2
 * @depType symbol
 */
export class DataProcessor {}
      `.trim()
      );

      const report = detector.analyze(tempDir);

      // Should find 2 broken links (missingFunction1, missingFunction2)
      // Note: parseList splits by comma
      expect(report.brokenLinks).toBe(2);
      expect(report.totalLinks).toBe(3);

      // Verify the broken ones
      const brokenTargets = report.links.map(l => l.target);
      expect(brokenTargets).toContain('missingFunction1');
      expect(brokenTargets).toContain('missingFunction2');
    });
  });

  describe('Real Project Analysis', () => {
    test('should analyze actual source files without errors', () => {
      const report = detector.analyze('src');

      // Should complete without throwing
      expect(report).toBeDefined();
      expect(report.totalLinks).toBeGreaterThanOrEqual(0);
      expect(report.brokenLinks).toBeGreaterThanOrEqual(0);

      // Log results for visibility
      if (report.brokenLinks > 0) {
        console.log(`\nFound ${report.brokenLinks} broken links in actual source:`);
        for (const link of report.links.slice(0, 5)) {
          console.log(`  ${link.linkType}: ${link.target} in ${link.sourceSymbol}`);
        }
      }
    });
  });
});
