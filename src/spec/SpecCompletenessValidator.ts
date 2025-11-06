/**
 * Specification Completeness Validator
 * @packageDocumentation
 * @responsibility Validate specification document completeness
 */

import * as fs from 'node:fs';
import type {
  SpecRequirements,
  SpecCompletenessResult,
} from '../types/spec';
import { DocumentSymbolParser } from '../doc-symbol/DocumentSymbolParser';
import type { ParsedDocSymbols } from '../types/feature';

/**
 * Default specification requirements
 */
const DEFAULT_REQUIREMENTS: SpecRequirements = {
  requiredSections: ['개요', '핵심 개념', '핵심 산출물', '사용 시나리오'],
  recommendedSections: ['CLI 명령어', '관련 기능', '가이드'],
  minScenarios: 3,
  minCodeReferences: 5,
  minExamples: 2,
};

/**
 * Validates specification document completeness
 *
 * @public
 * @responsibility Measure specification quality and completeness
 */
export class SpecCompletenessValidator {
  private requirements: SpecRequirements;
  private parser: DocumentSymbolParser;

  constructor(requirements?: Partial<SpecRequirements>) {
    this.requirements = { ...DEFAULT_REQUIREMENTS, ...requirements };
    this.parser = new DocumentSymbolParser();
  }

  /**
   * Validate a specification document
   *
   * @param filePath - Path to specification document
   * @returns Completeness result
   */
  validate(filePath: string): SpecCompletenessResult {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = this.parser.parse(filePath);

    // Extract sections from content
    const sections = this.extractSections(content);

    // Check required sections
    const requiredSectionsResult = this.checkRequiredSections(sections);

    // Check recommended sections
    const recommendedSectionsResult = this.checkRecommendedSections(sections);

    // Count scenarios
    const scenariosResult = this.countScenarios(content);

    // Count code references
    const codeReferencesResult = this.countCodeReferences(parsed);

    // Count examples
    const examplesResult = this.countExamples(content);

    // Calculate overall score
    const score = this.calculateScore({
      requiredSections: requiredSectionsResult.score,
      recommendedSections: recommendedSectionsResult.score,
      scenarios: scenariosResult.score,
      codeReferences: codeReferencesResult.score,
      examples: examplesResult.score,
    });

    // Collect issues
    const issues = [
      ...requiredSectionsResult.issues,
      ...scenariosResult.issues,
      ...codeReferencesResult.issues,
      ...examplesResult.issues,
    ];

    return {
      filePath,
      score,
      isComplete: score >= 80 && requiredSectionsResult.score === 100,
      breakdown: {
        requiredSections: {
          score: requiredSectionsResult.score,
          found: requiredSectionsResult.found,
          missing: requiredSectionsResult.missing,
        },
        recommendedSections: {
          score: recommendedSectionsResult.score,
          found: recommendedSectionsResult.found,
          missing: recommendedSectionsResult.missing,
        },
        scenarios: {
          score: scenariosResult.score,
          count: scenariosResult.count,
          required: this.requirements.minScenarios,
        },
        codeReferences: {
          score: codeReferencesResult.score,
          count: codeReferencesResult.count,
          required: this.requirements.minCodeReferences,
        },
        examples: {
          score: examplesResult.score,
          count: examplesResult.count,
          required: this.requirements.minExamples,
        },
      },
      issues,
    };
  }

  /**
   * Validate multiple specification documents
   *
   * @param filePaths - Array of file paths
   * @returns Array of completeness results
   */
  validateMultiple(filePaths: string[]): SpecCompletenessResult[] {
    return filePaths.map((filePath) => this.validate(filePath));
  }

  /**
   * Extract section headings from content
   */
  private extractSections(content: string): string[] {
    const sections: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      // Match markdown headings (## Section Name)
      const match = line.match(/^##\s+(.+)$/);
      if (match) {
        sections.push(match[1].trim());
      }
    }

    return sections;
  }

  /**
   * Check required sections
   */
  private checkRequiredSections(sections: string[]): {
    score: number;
    found: string[];
    missing: string[];
    issues: Array<{ type: 'missing_section'; message: string; severity: 'error' }>;
  } {
    const found: string[] = [];
    const missing: string[] = [];

    for (const required of this.requirements.requiredSections) {
      if (sections.includes(required)) {
        found.push(required);
      } else {
        missing.push(required);
      }
    }

    const score = (found.length / this.requirements.requiredSections.length) * 100;

    const issues = missing.map((section) => ({
      type: 'missing_section' as const,
      message: `Required section missing: "${section}"`,
      severity: 'error' as const,
    }));

    return { score, found, missing, issues };
  }

  /**
   * Check recommended sections
   */
  private checkRecommendedSections(sections: string[]): {
    score: number;
    found: string[];
    missing: string[];
  } {
    const found: string[] = [];
    const missing: string[] = [];

    for (const recommended of this.requirements.recommendedSections) {
      if (sections.includes(recommended)) {
        found.push(recommended);
      } else {
        missing.push(recommended);
      }
    }

    const score = this.requirements.recommendedSections.length > 0
      ? (found.length / this.requirements.recommendedSections.length) * 100
      : 100;

    return { score, found, missing };
  }

  /**
   * Count scenarios in document
   */
  private countScenarios(content: string): {
    score: number;
    count: number;
    issues: Array<{ type: 'insufficient_scenarios'; message: string; severity: 'warning' }>;
  } {
    // Match "### 시나리오 N:" or "### Scenario N:"
    const scenarioMatches = content.match(/^###\s+(시나리오|Scenario)\s+\d+/gm);
    const count = scenarioMatches ? scenarioMatches.length : 0;

    const score = Math.min((count / this.requirements.minScenarios) * 100, 100);

    const issues: Array<{ type: 'insufficient_scenarios'; message: string; severity: 'warning' }> = [];
    if (count < this.requirements.minScenarios) {
      issues.push({
        type: 'insufficient_scenarios',
        message: `Insufficient scenarios: ${count}/${this.requirements.minScenarios} (need ${this.requirements.minScenarios - count} more)`,
        severity: 'warning',
      });
    }

    return { score, count, issues };
  }

  /**
   * Count code references in document
   */
  private countCodeReferences(parsed: ParsedDocSymbols | null): {
    score: number;
    count: number;
    issues: Array<{ type: 'insufficient_refs'; message: string; severity: 'warning' }>;
  } {
    const count = parsed
      ? parsed.codeReferences.length + parsed.symbolFootnoteRefs.length
      : 0;

    const score = Math.min((count / this.requirements.minCodeReferences) * 100, 100);

    const issues: Array<{ type: 'insufficient_refs'; message: string; severity: 'warning' }> = [];
    if (count < this.requirements.minCodeReferences) {
      issues.push({
        type: 'insufficient_refs',
        message: `Insufficient code references: ${count}/${this.requirements.minCodeReferences} (need ${this.requirements.minCodeReferences - count} more)`,
        severity: 'warning',
      });
    }

    return { score, count, issues };
  }

  /**
   * Count examples in document
   */
  private countExamples(content: string): {
    score: number;
    count: number;
    issues: Array<{ type: 'insufficient_examples'; message: string; severity: 'warning' }>;
  } {
    // Match code blocks (``` ... ```)
    const codeBlockMatches = content.match(/```[\s\S]*?```/g);
    const count = codeBlockMatches ? codeBlockMatches.length : 0;

    const score = Math.min((count / this.requirements.minExamples) * 100, 100);

    const issues: Array<{ type: 'insufficient_examples'; message: string; severity: 'warning' }> = [];
    if (count < this.requirements.minExamples) {
      issues.push({
        type: 'insufficient_examples',
        message: `Insufficient examples: ${count}/${this.requirements.minExamples} (need ${this.requirements.minExamples - count} more)`,
        severity: 'warning',
      });
    }

    return { score, count, issues };
  }

  /**
   * Calculate overall completeness score
   */
  private calculateScore(breakdown: {
    requiredSections: number;
    recommendedSections: number;
    scenarios: number;
    codeReferences: number;
    examples: number;
  }): number {
    // Weighted average
    const score =
      breakdown.requiredSections * 0.4 +
      breakdown.recommendedSections * 0.1 +
      breakdown.scenarios * 0.2 +
      breakdown.codeReferences * 0.2 +
      breakdown.examples * 0.1;

    return Math.round(score);
  }

  /**
   * Get summary statistics for multiple documents
   * @param results - results parameter
   * @returns Returns {
    total: number;
    complete: number;
    incomplete: number;
    averageScore: number;
    totalIssues: number;
  }
   */
  getSummary(results: SpecCompletenessResult[]): {
    total: number;
    complete: number;
    incomplete: number;
    averageScore: number;
    totalIssues: number;
  } {
    const total = results.length;
    const complete = results.filter((r) => r.isComplete).length;
    const incomplete = total - complete;
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / total;
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);

    return {
      total,
      complete,
      incomplete,
      averageScore: Math.round(averageScore),
      totalIssues,
    };
  }
}
