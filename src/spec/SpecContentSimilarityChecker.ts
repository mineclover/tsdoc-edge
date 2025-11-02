/**
 * Specification Content Similarity Checker
 * @packageDocumentation
 * @responsibility Detect duplicate and similar content across specifications
 */

import * as fs from 'node:fs';
import type { ContentSimilarity } from '../types/spec';

interface DocumentSection {
  name: string;
  content: string;
}

interface DocumentContent {
  filePath: string;
  sections: DocumentSection[];
}

/**
 * Detects duplicate and similar content across specification documents
 *
 * @public
 * @responsibility Identify content duplication and suggest actions
 */
export class SpecContentSimilarityChecker {
  private similarityThreshold: number;
  private highSimilarityThreshold: number;

  constructor(options?: {
    similarityThreshold?: number;
    highSimilarityThreshold?: number;
  }) {
    this.similarityThreshold = options?.similarityThreshold ?? 0.3;
    this.highSimilarityThreshold = options?.highSimilarityThreshold ?? 0.7;
  }

  /**
   * Check similarity between two documents
   *
   * @param file1 - First file path
   * @param file2 - Second file path
   * @returns Similarity result
   */
  checkPair(file1: string, file2: string): ContentSimilarity {
    const doc1 = this.parseDocument(file1);
    const doc2 = this.parseDocument(file2);

    const overlappingSections: Array<{ section: string; similarity: number }> = [];
    let totalSimilarity = 0;
    let sectionCount = 0;

    // Compare all section pairs
    for (const section1 of doc1.sections) {
      for (const section2 of doc2.sections) {
        // Check if section names are similar
        const nameSimilarity = this.calculateTextSimilarity(
          section1.name.toLowerCase(),
          section2.name.toLowerCase()
        );

        // If section names are similar, check content
        if (nameSimilarity > 0.5) {
          const contentSimilarity = this.calculateTextSimilarity(
            section1.content,
            section2.content
          );

          if (contentSimilarity > this.similarityThreshold) {
            overlappingSections.push({
              section: section1.name,
              similarity: Math.round(contentSimilarity * 100) / 100,
            });
            totalSimilarity += contentSimilarity;
            sectionCount++;
          }
        }
      }
    }

    // Calculate overall similarity
    const similarity = sectionCount > 0 ? totalSimilarity / sectionCount : 0;

    // Determine suggestion
    const { suggestion, reason } = this.determineSuggestion(
      similarity,
      overlappingSections.length,
      doc1,
      doc2
    );

    return {
      file1,
      file2,
      similarity: Math.round(similarity * 100) / 100,
      overlappingSections,
      suggestion,
      reason,
    };
  }

  /**
   * Check similarity across multiple documents
   *
   * @param filePaths - Array of file paths
   * @returns Array of similarity results
   */
  checkMultiple(filePaths: string[]): ContentSimilarity[] {
    const results: ContentSimilarity[] = [];

    // Compare all pairs
    for (let i = 0; i < filePaths.length; i++) {
      for (let j = i + 1; j < filePaths.length; j++) {
        const result = this.checkPair(filePaths[i], filePaths[j]);

        // Only include if there's meaningful similarity
        if (result.similarity > this.similarityThreshold) {
          results.push(result);
        }
      }
    }

    // Sort by similarity (highest first)
    return results.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Parse document into sections
   */
  private parseDocument(filePath: string): DocumentContent {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const sections: DocumentSection[] = [];

    const lines = content.split('\n');
    let currentSection: DocumentSection | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      // Match markdown headings (## Section Name or ### Section Name)
      const match = line.match(/^##\s+(.+)$/);

      if (match) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          name: match[1].trim(),
          content: '',
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      sections.push(currentSection);
    }

    return { filePath, sections };
  }

  /**
   * Calculate text similarity using Jaccard similarity
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    // Normalize and tokenize
    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);

    // Handle empty texts
    if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
    if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

    // Calculate Jaccard similarity: |A ∩ B| / |A ∪ B|
    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  /**
   * Tokenize text into meaningful words
   */
  private tokenize(text: string): Set<string> {
    // Remove markdown syntax, code blocks, and special characters
    const cleaned = text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '') // Remove inline code
      .replace(/\[\[.*?\]\]/g, '') // Remove [[symbols]]
      .replace(/\[.*?\]\(.*?\)/g, '') // Remove links
      .replace(/[#*_~`]/g, '') // Remove markdown symbols
      .toLowerCase();

    // Split into words (including Korean)
    const words = cleaned.match(/[\w가-힣]+/g) || [];

    // Filter out very short words and common words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
      '을', '를', '이', '가', '은', '는', '의', '에', '에서', '로', '으로',
      '와', '과', '도', '만', '까지', '부터', '하다', '되다', '있다', '없다',
    ]);

    return new Set(
      words.filter((word) => word.length > 2 && !stopWords.has(word))
    );
  }

  /**
   * Determine suggestion based on similarity
   */
  private determineSuggestion(
    similarity: number,
    overlappingCount: number,
    doc1: DocumentContent,
    doc2: DocumentContent
  ): { suggestion: 'merge' | 'cross-reference' | 'keep-separate'; reason: string } {
    // Very high similarity with multiple overlapping sections -> merge
    if (similarity > this.highSimilarityThreshold && overlappingCount >= 3) {
      return {
        suggestion: 'merge',
        reason: `High content similarity (${Math.round(similarity * 100)}%) with ${overlappingCount} overlapping sections. Consider merging into a single specification.`,
      };
    }

    // Moderate similarity -> cross-reference
    if (similarity > this.similarityThreshold && overlappingCount >= 2) {
      return {
        suggestion: 'cross-reference',
        reason: `Moderate similarity (${Math.round(similarity * 100)}%) with ${overlappingCount} overlapping sections. Use [[symbol]] references to avoid duplication.`,
      };
    }

    // Low similarity -> keep separate
    return {
      suggestion: 'keep-separate',
      reason: `Low similarity (${Math.round(similarity * 100)}%). Documents have distinct content and should remain separate.`,
    };
  }

  /**
   * Get summary statistics
   */
  getSummary(results: ContentSimilarity[]): {
    totalPairs: number;
    mergeSuggestions: number;
    crossRefSuggestions: number;
    keepSeparate: number;
    averageSimilarity: number;
  } {
    const mergeSuggestions = results.filter((r) => r.suggestion === 'merge').length;
    const crossRefSuggestions = results.filter((r) => r.suggestion === 'cross-reference').length;
    const keepSeparate = results.filter((r) => r.suggestion === 'keep-separate').length;

    const averageSimilarity = results.length > 0
      ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length
      : 0;

    return {
      totalPairs: results.length,
      mergeSuggestions,
      crossRefSuggestions,
      keepSeparate,
      averageSimilarity: Math.round(averageSimilarity * 100) / 100,
    };
  }
}
