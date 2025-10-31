/**
 * Link validation and auto-fix
 * @packageDocumentation
 * @responsibility Validate doc-code links and suggest fixes
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ASTSymbolExtractor } from '../analyzer/ASTSymbolExtractor';
import type {
  CodeLink,
  DocLink,
  FixResult,
  ValidationReport,
  ValidationResult,
} from '../types/linking';
import type { DocCodeLinker } from './DocCodeLinker';

/**
 * Validates and fixes broken doc-code links
 *
 * @public
 * @responsibility Validate links and auto-fix when possible
 */
export class LinkValidator {
  private linker: DocCodeLinker;
  private symbolExtractor: ASTSymbolExtractor;
  private projectRoot: string;

  constructor(
    linker: DocCodeLinker,
    symbolExtractor: ASTSymbolExtractor,
    projectRoot: string
  ) {
    this.linker = linker;
    this.symbolExtractor = symbolExtractor;
    this.projectRoot = projectRoot;
  }

  /**
   * Validate all links in the codebase
   *
   * @param codeFiles - Code file paths
   * @param docFiles - Documentation file paths
   * @returns Validation report
   */
  validateAll(codeFiles: string[], docFiles: string[]): ValidationReport {
    const results: ValidationResult[] = [];

    // Validate doc → code links
    for (const docFile of docFiles) {
      const links = this.linker.findCodeLinks(docFile);
      for (const link of links) {
        results.push(this.validateCodeLink(link));
      }
    }

    // Validate code → doc links
    for (const codeFile of codeFiles) {
      const links = this.linker.findDocLinks(codeFile);
      for (const link of links) {
        results.push(this.validateDocLink(link));
      }
    }

    const brokenLinks = results.filter((r) => r.type === 'broken');
    const validLinks = results.filter((r) => r.type === 'valid').length;
    const fixableLinks = brokenLinks.filter((r) => !!r.suggestion).length;

    return {
      totalLinks: results.length,
      brokenLinks,
      validLinks,
      fixableLinks,
    };
  }

  /**
   * Validate links in a specific document
   *
   * @param docPath - Document path
   * @returns Validation results
   */
  validateDocument(docPath: string): ValidationResult[] {
    const links = this.linker.findCodeLinks(docPath);
    return links.map((link) => this.validateCodeLink(link));
  }

  /**
   * Validate links from a specific symbol
   *
   * @param codePath - Code file path
   * @returns Validation results
   */
  validateCodeFile(codePath: string): ValidationResult[] {
    const links = this.linker.findDocLinks(codePath);
    return links.map((link) => this.validateDocLink(link));
  }

  /**
   * Validate a code link (doc → code)
   *
   * @param link - Code link
   * @returns Validation result
   */
  private validateCodeLink(link: CodeLink): ValidationResult {
    const fullPath = path.resolve(this.projectRoot, link.targetFile);

    // 1. Check file exists
    if (!fs.existsSync(fullPath)) {
      const suggestion = this.findSimilarFile(link.targetFile);
      return {
        type: 'broken',
        link,
        issue: `File not found: ${link.targetFile}`,
        suggestion: suggestion
          ? `Did you mean: ${suggestion}?`
          : 'File does not exist',
      };
    }

    // 2. Check symbol exists
    if (link.targetSymbol) {
      const sourceCode = fs.readFileSync(fullPath, 'utf-8');
      const result = this.symbolExtractor.extract(fullPath, sourceCode);
      const symbols = result.symbols;

      const found = symbols.find((s) => s.name === link.targetSymbol);

      if (!found) {
        const similar = this.findSimilarSymbol(
          link.targetSymbol,
          symbols.map((s) => s.name)
        );
        return {
          type: 'broken',
          link,
          issue: `Symbol not found: ${link.targetSymbol}`,
          suggestion: similar ? `Did you mean: ${similar}?` : undefined,
        };
      }

      // 3. Check member exists (if specified)
      if (link.targetMember) {
        // Check if the symbol has this member
        const parent = symbols.find((s) => s.name === link.targetSymbol);
        if (parent && parent.parentSymbol === link.targetSymbol) {
          // This is a class member
          const member = symbols.find(
            (s) => s.parentSymbol === link.targetSymbol && s.name === link.targetMember
          );

          if (!member) {
            return {
              type: 'broken',
              link,
              issue: `Member not found: ${link.targetSymbol}.${link.targetMember}`,
            };
          }
        }
      }
    }

    return { type: 'valid', link };
  }

  /**
   * Validate a doc link (code → doc)
   *
   * @param link - Doc link
   * @returns Validation result
   */
  private validateDocLink(link: DocLink): ValidationResult {
    const fullPath = path.resolve(this.projectRoot, link.targetDoc);

    // 1. Check document exists
    if (!fs.existsSync(fullPath)) {
      const suggestion = this.findSimilarFile(link.targetDoc);
      return {
        type: 'broken',
        link,
        issue: `Document not found: ${link.targetDoc}`,
        suggestion: suggestion ? `Did you mean: ${suggestion}?` : 'Document does not exist',
      };
    }

    // 2. Check section exists (if specified)
    if (link.targetSection) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const sectionExists = this.checkSectionExists(content, link.targetSection);

      if (!sectionExists) {
        return {
          type: 'broken',
          link,
          issue: `Section not found: ${link.targetSection}`,
          suggestion: 'Check the document headings',
        };
      }
    }

    return { type: 'valid', link };
  }

  /**
   * Check if markdown section exists
   */
  private checkSectionExists(content: string, section: string): boolean {
    // Convert section to heading format
    const heading = section.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Check for heading
    const headingRegex = new RegExp(`^#+\\s+.*${section}`, 'mi');
    return headingRegex.test(content);
  }

  /**
   * Find similar file using Levenshtein distance
   */
  private findSimilarFile(targetPath: string): string | undefined {
    const dir = path.dirname(targetPath);
    const basename = path.basename(targetPath);
    const fullDir = path.resolve(this.projectRoot, dir);

    if (!fs.existsSync(fullDir)) {
      return undefined;
    }

    const files = fs.readdirSync(fullDir);
    const similar = this.findMostSimilar(basename, files);

    return similar ? path.join(dir, similar) : undefined;
  }

  /**
   * Find similar symbol name
   */
  private findSimilarSymbol(target: string, candidates: string[]): string | undefined {
    return this.findMostSimilar(target, candidates);
  }

  /**
   * Find most similar string using simple distance
   */
  private findMostSimilar(target: string, candidates: string[]): string | undefined {
    if (candidates.length === 0) return undefined;

    const distances = candidates.map((c) => ({
      name: c,
      distance: this.levenshteinDistance(target.toLowerCase(), c.toLowerCase()),
    }));

    distances.sort((a, b) => a.distance - b.distance);

    // Only suggest if distance is small enough
    const best = distances[0];
    if (best.distance <= 3) {
      return best.name;
    }

    return undefined;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Auto-fix broken links
   *
   * @param brokenLinks - Broken links to fix
   * @returns Fix results
   */
  autoFix(brokenLinks: ValidationResult[]): FixResult[] {
    const results: FixResult[] = [];

    for (const result of brokenLinks) {
      if (!result.suggestion) {
        continue;
      }

      const link = result.link;
      if ('docPath' in link) {
        // CodeLink (doc → code)
        const fixed = this.fixCodeLink(link, result.suggestion);
        if (fixed) {
          results.push(fixed);
        }
      } else {
        // DocLink (code → doc)
        const fixed = this.fixDocLink(link, result.suggestion);
        if (fixed) {
          results.push(fixed);
        }
      }
    }

    return results;
  }

  /**
   * Fix code link
   */
  private fixCodeLink(link: CodeLink, suggestion: string): FixResult | undefined {
    // Extract suggested path from "Did you mean: path?"
    const match = suggestion.match(/Did you mean: (.+)\?/);
    if (!match) {
      return undefined;
    }

    const newPath = match[1];
    const docPath = path.resolve(this.projectRoot, link.docPath);
    const content = fs.readFileSync(docPath, 'utf-8');
    const lines = content.split('\n');

    const lineIndex = link.docLine - 1;
    const line = lines[lineIndex];

    const originalText = line;
    const fixedText = line.replace(link.targetFile, newPath);

    // Apply fix
    lines[lineIndex] = fixedText;
    fs.writeFileSync(docPath, lines.join('\n'), 'utf-8');

    return {
      link,
      originalText,
      fixedText,
      applied: true,
    };
  }

  /**
   * Fix doc link
   */
  private fixDocLink(link: DocLink, suggestion: string): FixResult | undefined {
    // Extract suggested path from "Did you mean: path?"
    const match = suggestion.match(/Did you mean: (.+)\?/);
    if (!match) {
      return undefined;
    }

    const newPath = match[1];
    const codePath = path.resolve(this.projectRoot, link.codePath);
    const content = fs.readFileSync(codePath, 'utf-8');
    const lines = content.split('\n');

    const lineIndex = link.codeLine - 1;
    const line = lines[lineIndex];

    const originalText = line;
    const fixedText = line.replace(link.targetDoc, newPath);

    // Apply fix
    lines[lineIndex] = fixedText;
    fs.writeFileSync(codePath, lines.join('\n'), 'utf-8');

    return {
      link,
      originalText,
      fixedText,
      applied: true,
    };
  }
}
