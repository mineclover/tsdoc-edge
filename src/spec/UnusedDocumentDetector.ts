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
    const codeImplementationNotApplicable = this.isCodeImplementationNotApplicable(
      filePath,
      content
    );

    // Count references to this document (by filename OR defined [[Checkpoint]] symbols)
    const fileName = path.basename(filePath, path.extname(filePath));
    const definedSymbols = this.extractDefinedCheckpoints(content);
    const lookupKeys = new Set<string>([fileName, ...definedSymbols]);
    let referenceCount = 0;
    for (const key of lookupKeys) {
      referenceCount += referenceMap.get(key) || 0;
    }

    // Count code connections (symbol footnotes, source metadata, backlinks, inline symbols)
    const codeConnectionCount = this.countCodeConnections(content);

    // Check for various unused conditions
    const result = this.checkUnusedConditions({
      filePath,
      status,
      daysSinceModified,
      lastModified,
      referenceCount,
      codeConnectionCount,
      codeImplementationNotApplicable,
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
    codeImplementationNotApplicable: boolean;
  }): UnusedDocument | null {
    const {
      filePath,
      status,
      daysSinceModified,
      lastModified,
      referenceCount,
      codeConnectionCount,
      codeImplementationNotApplicable,
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
      !codeImplementationNotApplicable &&
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
   * Build a map of incoming document references (excluding self-definitions in headings)
   */
  private buildReferenceMap(filePaths: string[]): Map<string, number> {
    const referenceMap = new Map<string, number>();

    for (const filePath of filePaths) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const selfSymbols = new Set<string>([
        path.basename(filePath, path.extname(filePath)),
        ...this.extractDefinedCheckpoints(content),
      ]);

      // Find [[Document Symbol]] references from other documents
      const symbolRefs = content.match(/\[\[([^\]]+)\]\]/g) || [];

      for (const ref of symbolRefs) {
        const raw = ref.slice(2, -2).trim();
        const symbol = raw.split('#')[0].trim();
        if (!symbol || selfSymbols.has(symbol)) {
          continue;
        }
        referenceMap.set(symbol, (referenceMap.get(symbol) || 0) + 1);
      }

      // Find markdown link references
      const linkRefs = content.match(/\[([^\]]+)\]\(([^)]+\.md[^)]*)\)/g) || [];

      for (const ref of linkRefs) {
        const match = ref.match(/\(([^)]+\.md)/);
        if (match) {
          const linkedFile = path.basename(match[1], '.md');
          if (!selfSymbols.has(linkedFile)) {
            referenceMap.set(linkedFile, (referenceMap.get(linkedFile) || 0) + 1);
          }
        }
      }
    }

    return referenceMap;
  }

  /**
   * Extract H1/H2+ checkpoint definitions declared by a Markdown document
   */
  private extractDefinedCheckpoints(content: string): string[] {
    const body = content.replace(/```[\s\S]*?```/g, '');
    const symbols: string[] = [];
    const headingRegex = /^#{1,6}\s+\[\[([^\]]+)\]\]/gm;
    let match = headingRegex.exec(body);
    while (match !== null) {
      const symbol = match[1].trim();
      if (symbol) {
        symbols.push(symbol);
      }
      match = headingRegex.exec(body);
    }
    return symbols;
  }

  /**
   * Check whether code implementation connections are explicitly non-applicable
   */
  private isCodeImplementationNotApplicable(filePath: string, content: string): boolean {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (
      frontmatterMatch &&
      /codeImplementation:\s*["']?not-applicable["']?/i.test(frontmatterMatch[1])
    ) {
      return true;
    }
    const normalized = filePath.split(path.sep).join('/');
    return /\/(concepts|guides|workflows|relationships)\//.test(normalized);
  }

  /**
   * Count code connections (symbol footnotes, source metadata, backlinks, tsdoc-spec bindings)
   */
  private countCodeConnections(content: string): number {
    // 1. [^sym-XXX] or [^PascalSymbol] / [^camelSymbol] code footnotes
    const symbolFootnotes = content.match(/\[\^[A-Za-z][A-Za-z0-9_-]*\]/g) || [];
    // 2. [[sym-...]] explicit code symbol references
    const symBracketRefs = content.match(/\[\[sym-[^\]]+\]\]/g) || [];
    // 3. Inline PascalCase code identifiers or explicit src/mcp-server file paths
    const codeRefs = content.match(/`[A-Z][a-zA-Z0-9]+`/g) || [];
    const sourcePathRefs =
      content.match(/`(?:src|mcp-server|tools)\/[A-Za-z0-9_./-]+\.(?:ts|js|go)`/g) || [];
    // 4. Frontmatter `source: src/...` or Backlinks `### Implemented By` entries
    const frontmatterSource = /^source:\s*(?:src|mcp-server|tools)\/\S+/m.test(content) ? 1 : 0;
    const implementedByLines =
      content.match(/^-\s+\S+\s+→\s+(?:src|mcp-server|tools)\/\S+/gm) || [];
    // 5. Explicit `canonicalNodeId` bindings in `tsdoc-spec` JSON blocks
    const specBindings = content.match(/"canonicalNodeId"\s*:\s*"[^"]+"/g) || [];

    return (
      symbolFootnotes.length +
      symBracketRefs.length +
      codeRefs.length +
      sourcePathRefs.length +
      frontmatterSource +
      implementedByLines.length +
      specBindings.length
    );
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

    return statusMatch ? (statusMatch[1] as SpecStatus) : 'draft';
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
   * @returns Summary with total, byReason, byAction, averageDaysSinceModified
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
