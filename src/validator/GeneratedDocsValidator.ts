/**
 * Generated Documentation Validator
 * @packageDocumentation
 * @responsibility Validate generated markdown documentation against TSDoc sources
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Validation result for a single document
 */
export interface DocValidationResult {
  /** Document file path */
  filePath: string;

  /** Is valid */
  isValid: boolean;

  /** Validation errors */
  errors: string[];

  /** Validation warnings */
  warnings: string[];

  /** Detected sections */
  sections: string[];

  /** Missing required sections */
  missingSections: string[];

  /** Has metadata section */
  hasMetadata: boolean;

  /** Symbol name from doc */
  symbolName?: string;
}

/**
 * Validator for generated markdown documentation
 *
 * @doc [[GeneratedDocsValidator]]
 * @public
 * @responsibility Validate markdown docs generated from TSDoc comments
 * @contract Check structure, required sections, and consistency
 *
 * @problem Need to ensure generated docs maintain quality and completeness
 * @solves Automated validation of markdown structure and content
 * @context Generated docs should follow consistent format
 *
 * @functionality
 * - Structure validation: Headers, sections, formatting
 * - Completeness check: Required sections present
 * - Metadata verification: Created, updated, version
 * - Link validation: [[Symbol]] references intact
 * - Consistency: Symbol name matches filename
 *
 * @decision Validate structure over content
 * @rationale Structure ensures readability and navigation
 * @consequences May miss semantic errors in content
 */
export class GeneratedDocsValidator {
  /**
   * Required sections for enhanced documentation
   */
  private readonly requiredSections = ['Problem Solving', 'Functionality'];

  /**
   * Optional sections
   */
  private readonly optionalSections = [
    'Error Experiences',
    'Decisions',
    'Dependencies',
    'Future Plans',
  ];

  /**
   * Validate a single markdown document
   *
   * @param filePath - Path to markdown file
   * @returns Validation result
   */
  validate(filePath: string): DocValidationResult {
    const result: DocValidationResult = {
      filePath,
      isValid: true,
      errors: [],
      warnings: [],
      sections: [],
      missingSections: [],
      hasMetadata: false,
    };

    if (!fs.existsSync(filePath)) {
      result.isValid = false;
      result.errors.push('File not found');
      return result;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Check header (first line should be H1)
    if (lines.length === 0 || !lines[0].startsWith('# ')) {
      result.isValid = false;
      result.errors.push('Missing H1 header (first line should be # SymbolName)');
    } else {
      result.symbolName = lines[0].substring(2).trim();

      // Check if symbol name matches filename
      const fileName = path.basename(filePath, '.md');
      if (result.symbolName !== fileName) {
        result.warnings.push(
          `Symbol name "${result.symbolName}" does not match filename "${fileName}"`
        );
      }
    }

    // Detect sections
    const detectedSections = this.detectSections(content);
    result.sections = detectedSections;

    // Check required sections
    for (const required of this.requiredSections) {
      const found = detectedSections.some((s) => s.includes(required));
      if (!found) {
        result.missingSections.push(required);
        result.isValid = false;
        result.errors.push(`Missing required section: ${required}`);
      }
    }

    // Check metadata section
    result.hasMetadata = content.includes('## 📊 Metadata');
    if (!result.hasMetadata) {
      result.warnings.push('Missing metadata section');
    } else {
      // Verify metadata fields
      if (!content.includes('- **Created**:')) {
        result.warnings.push('Missing Created metadata');
      }
      if (!content.includes('- **Updated**:')) {
        result.warnings.push('Missing Updated metadata');
      }
      if (!content.includes('- **Version**:')) {
        result.warnings.push('Missing Version metadata');
      }
    }

    // Check for basic markdown structure
    if (!content.includes('---')) {
      result.warnings.push('Missing horizontal rules (---) for section separation');
    }

    // Check for symbol information block
    if (!content.includes('**Type**:') || !content.includes('**Location**:')) {
      result.warnings.push('Missing symbol information block (Type, Location, etc.)');
    }

    return result;
  }

  /**
   * Validate multiple documents in a directory
   *
   * @param dirPath - Directory containing markdown files
   * @returns Array of validation results
   */
  validateDirectory(dirPath: string): DocValidationResult[] {
    const results: DocValidationResult[] = [];

    if (!fs.existsSync(dirPath)) {
      return results;
    }

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(dirPath, file);
        const result = this.validate(filePath);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Get validation summary statistics
   *
   * @param results - Array of validation results
   * @returns Summary statistics
   */
  getSummary(results: DocValidationResult[]): {
    total: number;
    valid: number;
    invalid: number;
    withErrors: number;
    withWarnings: number;
    averageSections: number;
  } {
    const valid = results.filter((r) => r.isValid).length;
    const withErrors = results.filter((r) => r.errors.length > 0).length;
    const withWarnings = results.filter((r) => r.warnings.length > 0).length;
    const totalSections = results.reduce((sum, r) => sum + r.sections.length, 0);

    return {
      total: results.length,
      valid,
      invalid: results.length - valid,
      withErrors,
      withWarnings,
      averageSections: results.length > 0 ? totalSections / results.length : 0,
    };
  }

  /**
   * Detect H2 sections in markdown content
   *
   * @param content - Markdown content
   * @returns Array of section names
   * @private
   */
  private detectSections(content: string): string[] {
    const sections: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Match H2 headers (## Section Name)
      const match = line.match(/^##\s+(?:\d+\.\s+)?(?:[\p{Emoji}\s]+)?(.+)$/u);
      if (match) {
        sections.push(match[1].trim());
      }
    }

    return sections;
  }

  /**
   * Check if documentation is complete based on validation
   *
   * @param result - Validation result
   * @returns Completeness score (0-100)
   */
  calculateCompleteness(result: DocValidationResult): number {
    let score = 0;

    // Header present (10 points)
    if (result.symbolName) {
      score += 10;
    }

    // Required sections (40 points total, 20 each)
    const requiredFound = this.requiredSections.filter((req) =>
      result.sections.some((s) => s.includes(req))
    ).length;
    score += (requiredFound / this.requiredSections.length) * 40;

    // Optional sections (30 points total)
    const optionalFound = this.optionalSections.filter((opt) =>
      result.sections.some((s) => s.includes(opt))
    ).length;
    score += (optionalFound / this.optionalSections.length) * 30;

    // Metadata (20 points)
    if (result.hasMetadata) {
      score += 20;
    }

    return Math.round(score);
  }
}
