/**
 * Unused Document Detector
 * @packageDocumentation
 * @responsibility Detect unused and stale specification documents
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SpecStatus, UnusedDocument } from '../types/spec';

/**
 * Thresholds for determining stale documents (in days)
 */
const STALE_THRESHOLDS = {
  DRAFT_STALE_DAYS: 90, // 3 months
  DEPRECATED_STALE_DAYS: 90, // 3 months
  REVIEW_STALE_DAYS: 60, // 2 months
};

/**
 * Detects unused and stale specification documents
 *
 * @doc [[UnusedDocumentDetector]]
 * @public
 * @responsibility Identify documents that should be archived or deleted
 */
export class UnusedDocumentDetector {
  /**
   * Detect unused documents in a directory
   *
   * @param dirPath - Directory to scan
   * @returns Array of unused document results
   */
  detect(dirPath: string): UnusedDocument[] {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const markdownFiles = this.findMarkdownFiles(dirPath);
    const results: UnusedDocument[] = [];

    // Build reference map
    const referenceMap = this.buildReferenceMap(markdownFiles);

    for (const filePath of markdownFiles) {
      const doc = this.analyzeDocument(filePath, referenceMap);
      if (doc) {
        results.push(doc);
      }
    }

    // Sort by severity (delete > archive > review > complete)
    return results.sort((a, b) => {
      const order = { delete: 0, archive: 1, review: 2, complete: 3 };
      return order[a.suggestedAction] - order[b.suggestedAction];
    });
  }

  /**
   * Analyze a single document for unused status
   */
  private analyzeDocument(
    filePath: string,
    referenceMap: Map<string, number>
  ): UnusedDocument | null {
    const stats = fs.statSync(filePath);
    const lastModified = stats.mtime.toISOString().split('T')[0];
    const daysSinceModified = this.getDaysSince(stats.mtime);

    const content = fs.readFileSync(filePath, 'utf-8');
    const status = this.extractStatus(content);

    // Count references to this document
    const fileName = path.basename(filePath, path.extname(filePath));
    const referenceCount = referenceMap.get(fileName) || 0;

    // Count code connections (symbol footnote references)
    const codeConnectionCount = this.countCodeConnections(content);

    // Check for various unused conditions
    const result = this.checkUnusedConditions({
      filePath,
      status,
      daysSinceModified,
      lastModified,
      referenceCount,
      codeConnectionCount,
    });

    return result;
  }

  /**
   * Check various conditions for unused documents
   */
  private checkUnusedConditions(params: {
    filePath: string;
    status: SpecStatus;
    daysSinceModified: number;
    lastModified: string;
    referenceCount: number;
    codeConnectionCount: number;
  }): UnusedDocument | null {
    const {
      filePath,
      status,
      daysSinceModified,
      lastModified,
      referenceCount,
      codeConnectionCount,
    } = params;

    // Check 1: Stale draft (3+ months old, no references)
    if (
      status === 'draft' &&
      daysSinceModified > STALE_THRESHOLDS.DRAFT_STALE_DAYS &&
      referenceCount === 0
    ) {
      return {
        filePath,
        reason: 'stale-draft',
        lastModified,
        daysSinceModified,
        referenceCount,
        codeConnectionCount,
        suggestedAction: 'delete',
      };
    }

    // Check 2: Deprecated and stale (3+ months deprecated)
    if (status === 'deprecated' && daysSinceModified > STALE_THRESHOLDS.DEPRECATED_STALE_DAYS) {
      return {
        filePath,
        reason: 'deprecated',
        lastModified,
        daysSinceModified,
        referenceCount,
        codeConnectionCount,
        suggestedAction: 'archive',
      };
    }

    // Check 3: No references and no code connections (orphaned)
    if (
      referenceCount === 0 &&
      codeConnectionCount === 0 &&
      status !== 'active' &&
      status !== 'approved'
    ) {
      return {
        filePath,
        reason: 'no-references',
        lastModified,
        daysSinceModified,
        referenceCount,
        codeConnectionCount,
        suggestedAction: status === 'draft' ? 'delete' : 'review',
      };
    }

    // Check 4: Stale review (2+ months in review)
    if (status === 'review' && daysSinceModified > STALE_THRESHOLDS.REVIEW_STALE_DAYS) {
      return {
        filePath,
        reason: 'no-references',
        lastModified,
        daysSinceModified,
        referenceCount,
        codeConnectionCount,
        suggestedAction: 'review',
      };
    }

    // Check 5: No code connections for technical specs
    if (
      codeConnectionCount === 0 &&
      (status === 'active' || status === 'approved') &&
      this.isTechnicalSpec(filePath)
    ) {
      return {
        filePath,
        reason: 'no-code-connections',
        lastModified,
        daysSinceModified,
        referenceCount,
        codeConnectionCount,
        suggestedAction: 'complete',
      };
    }

    return null;
  }

  /**
   * Build a map of document references
   */
  private buildReferenceMap(filePaths: string[]): Map<string, number> {
    const referenceMap = new Map<string, number>();

    for (const filePath of filePaths) {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Find [[Document Symbol]] references
      const symbolRefs = content.match(/\[\[([^\]]+)\]\]/g) || [];

      for (const ref of symbolRefs) {
        const symbol = ref.slice(2, -2).trim();
        // Increment reference count
        referenceMap.set(symbol, (referenceMap.get(symbol) || 0) + 1);
      }

      // Find markdown link references
      const linkRefs = content.match(/\[([^\]]+)\]\(([^)]+\.md[^)]*)\)/g) || [];

      for (const ref of linkRefs) {
        const match = ref.match(/\(([^)]+\.md)/);
        if (match) {
          const linkedFile = path.basename(match[1], '.md');
          referenceMap.set(linkedFile, (referenceMap.get(linkedFile) || 0) + 1);
        }
      }
    }

    return referenceMap;
  }

  /**
   * Count code connections (symbol footnote references)
   */
  private countCodeConnections(content: string): number {
    // Count [^sym-XXX] references
    const symbolFootnotes = content.match(/\[\^sym-[^\]]+\]/g) || [];

    // Count inline code symbol references
    const codeRefs = content.match(/`[A-Z][a-zA-Z]+`/g) || [];

    return symbolFootnotes.length + codeRefs.length;
  }

  /**
   * Extract status from frontmatter
   */
  private extractStatus(content: string): SpecStatus {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!frontmatterMatch) {
      return 'draft';
    }

    const frontmatter = frontmatterMatch[1];
    const statusMatch = frontmatter.match(/status:\s*["']?(\w+)["']?/);

    return (statusMatch?.[1] as SpecStatus) || 'draft';
  }

  /**
   * Calculate days since a date
   */
  private getDaysSince(date: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if document is a technical specification (should have code connections)
   */
  private isTechnicalSpec(filePath: string): boolean {
    const fileName = path.basename(filePath).toLowerCase();

    // Technical specs usually contain these keywords
    const technicalKeywords = [
      'api',
      'implementation',
      'architecture',
      'design',
      'technical',
      'system',
      'component',
      'module',
      'class',
      'function',
    ];

    return technicalKeywords.some((keyword) => fileName.includes(keyword));
  }

  /**
   * Find all markdown files recursively
   */
  private findMarkdownFiles(dir: string): string[] {
    const files: string[] = [];
    const stat = fs.statSync(dir);

    if (stat.isFile()) {
      return [dir];
    }

    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const entryStat = fs.statSync(fullPath);

      if (entryStat.isDirectory()) {
        files.push(...this.findMarkdownFiles(fullPath));
      } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Get summary statistics
   * @param results - results parameter
   * @returns Returns {
    total: number;
    byReason: Record<string, number>;
    byAction: Record<string, number>;
    averageDaysSinceModified: number;
  }
   */
  getSummary(results: UnusedDocument[]): {
    total: number;
    byReason: Record<string, number>;
    byAction: Record<string, number>;
    averageDaysSinceModified: number;
  } {
    const byReason: Record<string, number> = {};
    const byAction: Record<string, number> = {};

    for (const result of results) {
      byReason[result.reason] = (byReason[result.reason] || 0) + 1;
      byAction[result.suggestedAction] = (byAction[result.suggestedAction] || 0) + 1;
    }

    const averageDaysSinceModified =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.daysSinceModified, 0) / results.length
        : 0;

    return {
      total: results.length,
      byReason,
      byAction,
      averageDaysSinceModified: Math.round(averageDaysSinceModified),
    };
  }
}
