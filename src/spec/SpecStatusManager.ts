/**
 * Specification Status Manager
 * @packageDocumentation
 * @responsibility Manage specification document status workflow
 */

import * as fs from 'node:fs';
import type { SpecStatus, SpecStatusTransition } from '../types/spec';
import { SpecCompletenessValidator } from './SpecCompletenessValidator';

/**
 * Status transition rules
 */
const ALLOWED_TRANSITIONS: Record<SpecStatus, SpecStatus[]> = {
  draft: ['review', 'archived'],
  review: ['draft', 'approved', 'archived'],
  approved: ['review', 'active'],
  active: ['deprecated'],
  deprecated: ['archived', 'active'],
  archived: [],
};

/**
 * Minimum completeness scores required for each status
 */
const COMPLETENESS_REQUIREMENTS: Record<SpecStatus, number> = {
  draft: 0, // No requirements for draft
  review: 50, // At least 50% complete
  approved: 80, // At least 80% complete
  active: 80, // At least 80% complete
  deprecated: 0, // No requirements
  archived: 0, // No requirements
};

/**
 * Manages specification document status workflow
 *
 * @doc [[SpecStatusManager]]
 * @public
 * @responsibility Enforce status transitions and validation rules
 */
export class SpecStatusManager {
  private validator: SpecCompletenessValidator;

  constructor() {
    this.validator = new SpecCompletenessValidator();
  }

  /**
   * Validate a status transition
   *
   * @param filePath - Path to specification document
   * @param targetStatus - Target status to transition to
   * @returns Transition validation result
   */
  validateTransition(filePath: string, targetStatus: SpecStatus): SpecStatusTransition {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const currentStatus = this.getCurrentStatus(filePath);
    const isAllowed = ALLOWED_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;

    const checks: Array<{ name: string; passed: boolean; message: string }> = [];

    // Check 1: Is transition allowed?
    checks.push({
      name: 'Transition Allowed',
      passed: isAllowed,
      message: isAllowed
        ? `Transition from "${currentStatus}" to "${targetStatus}" is allowed`
        : `Transition from "${currentStatus}" to "${targetStatus}" is not allowed. Valid targets: ${ALLOWED_TRANSITIONS[currentStatus]?.join(', ') || 'none'}`,
    });

    if (!isAllowed) {
      return {
        from: currentStatus,
        to: targetStatus,
        valid: false,
        checks,
      };
    }

    // Check 2: Completeness requirements
    const requiredScore = COMPLETENESS_REQUIREMENTS[targetStatus];
    if (requiredScore > 0) {
      const completeness = this.validator.validate(filePath);
      const meetsRequirement = completeness.score >= requiredScore;

      checks.push({
        name: 'Completeness Score',
        passed: meetsRequirement,
        message: meetsRequirement
          ? `Score ${completeness.score}% meets requirement (>= ${requiredScore}%)`
          : `Score ${completeness.score}% does not meet requirement (>= ${requiredScore}%). Missing: ${completeness.issues.map((i) => i.message).join(', ')}`,
      });

      if (!meetsRequirement) {
        return {
          from: currentStatus,
          to: targetStatus,
          valid: false,
          checks,
        };
      }
    } else {
      checks.push({
        name: 'Completeness Score',
        passed: true,
        message: `No completeness requirements for "${targetStatus}" status`,
      });
    }

    // Check 3: Required sections for approved/active status
    if (targetStatus === 'approved' || targetStatus === 'active') {
      const completeness = this.validator.validate(filePath);
      const hasAllRequired =
        completeness.breakdown.design.structure.requiredSections.missing.length === 0;

      checks.push({
        name: 'Required Sections',
        passed: hasAllRequired,
        message: hasAllRequired
          ? 'All required sections present'
          : `Missing required sections: ${completeness.breakdown.design.structure.requiredSections.missing.join(', ')}`,
      });

      if (!hasAllRequired) {
        return {
          from: currentStatus,
          to: targetStatus,
          valid: false,
          checks,
        };
      }
    }

    // Check 4: Replacement document for deprecated status
    if (targetStatus === 'deprecated') {
      const hasReplacement = this.hasReplacementDocument(filePath);

      checks.push({
        name: 'Replacement Document',
        passed: hasReplacement,
        message: hasReplacement
          ? 'Replacement document specified in frontmatter'
          : 'Deprecated documents must specify "replacement" field in frontmatter',
      });

      if (!hasReplacement) {
        return {
          from: currentStatus,
          to: targetStatus,
          valid: false,
          checks,
        };
      }
    }

    return {
      from: currentStatus,
      to: targetStatus,
      valid: checks.every((c) => c.passed),
      checks,
    };
  }

  /**
   * Apply status transition to a document
   *
   * @param filePath - Path to specification document
   * @param targetStatus - Target status
   * @returns Success status
   */
  applyTransition(filePath: string, targetStatus: SpecStatus): boolean {
    const validation = this.validateTransition(filePath, targetStatus);

    if (!validation.valid) {
      throw new Error(
        `Cannot transition to "${targetStatus}": ${validation.checks
          .filter((c) => !c.passed)
          .map((c) => c.message)
          .join(', ')}`
      );
    }

    // Update frontmatter status
    this.updateStatus(filePath, targetStatus);

    return true;
  }

  /**
   * Get current status from document frontmatter
   */
  private getCurrentStatus(filePath: string): SpecStatus {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!frontmatterMatch) {
      return 'draft'; // Default status
    }

    const frontmatter = frontmatterMatch[1];
    const statusMatch = frontmatter.match(/status:\s*["']?(\w+)["']?/);

    if (!statusMatch) {
      return 'draft';
    }

    const validStatuses: SpecStatus[] = [
      'draft',
      'review',
      'approved',
      'active',
      'deprecated',
      'archived',
    ];
    const status = statusMatch[1];

    if (!validStatuses.includes(status as SpecStatus)) {
      return 'draft'; // Default for invalid status values
    }

    return status as SpecStatus;
  }

  /**
   * Update status in document frontmatter
   */
  private updateStatus(filePath: string, newStatus: SpecStatus): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!frontmatterMatch) {
      // No frontmatter, add it
      const newFrontmatter = `---
status: ${newStatus}
lastUpdated: ${new Date().toISOString().split('T')[0]}
---

${content}`;
      fs.writeFileSync(filePath, newFrontmatter, 'utf-8');
      return;
    }

    const frontmatter = frontmatterMatch[1];
    const statusMatch = frontmatter.match(/status:\s*["']?\w+["']?/);

    let newFrontmatter: string;
    if (statusMatch) {
      // Update existing status
      newFrontmatter = frontmatter.replace(/status:\s*["']?\w+["']?/, `status: ${newStatus}`);
    } else {
      // Add status field
      newFrontmatter = `${frontmatter}\nstatus: ${newStatus}`;
    }

    // Update lastUpdated
    if (newFrontmatter.includes('lastUpdated:')) {
      newFrontmatter = newFrontmatter.replace(
        /lastUpdated:\s*.*/,
        `lastUpdated: ${new Date().toISOString().split('T')[0]}`
      );
    } else {
      newFrontmatter = `${newFrontmatter}\nlastUpdated: ${new Date().toISOString().split('T')[0]}`;
    }

    const newContent = content.replace(/^---\n[\s\S]*?\n---/, `---\n${newFrontmatter}\n---`);

    fs.writeFileSync(filePath, newContent, 'utf-8');
  }

  /**
   * Check if document has replacement specified in frontmatter
   */
  private hasReplacementDocument(filePath: string): boolean {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!frontmatterMatch) {
      return false;
    }

    const frontmatter = frontmatterMatch[1];
    return /replacement:\s*.+/.test(frontmatter);
  }

  /**
   * Get all allowed transitions from current status
   *
   * @param filePath - Path to specification document
   * @returns Array of allowed target statuses
   */
  getAllowedTransitions(filePath: string): SpecStatus[] {
    const currentStatus = this.getCurrentStatus(filePath);
    return ALLOWED_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Get status statistics for multiple documents
   *
   * @param filePaths - Array of file paths
   * @returns Status distribution
   */
  getStatusDistribution(filePaths: string[]): Record<SpecStatus, number> {
    const distribution: Record<SpecStatus, number> = {
      draft: 0,
      review: 0,
      approved: 0,
      active: 0,
      deprecated: 0,
      archived: 0,
    };

    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        const status = this.getCurrentStatus(filePath);
        distribution[status]++;
      }
    }

    return distribution;
  }

  /**
   * Check which documents can be promoted to next status
   *
   * @param filePaths - Array of file paths
   * @returns Documents ready for promotion
   */
  getPromotableDocs(filePaths: string[]): Array<{
    filePath: string;
    currentStatus: SpecStatus;
    targetStatus: SpecStatus;
    canPromote: boolean;
    reason: string;
  }> {
    const results: Array<{
      filePath: string;
      currentStatus: SpecStatus;
      targetStatus: SpecStatus;
      canPromote: boolean;
      reason: string;
    }> = [];

    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) continue;

      const currentStatus = this.getCurrentStatus(filePath);

      // Determine next logical status
      let targetStatus: SpecStatus | null = null;
      if (currentStatus === 'draft') targetStatus = 'review';
      else if (currentStatus === 'review') targetStatus = 'approved';
      else if (currentStatus === 'approved') targetStatus = 'active';

      if (!targetStatus) continue;

      const validation = this.validateTransition(filePath, targetStatus);

      results.push({
        filePath,
        currentStatus,
        targetStatus,
        canPromote: validation.valid,
        reason: validation.valid
          ? 'All checks passed'
          : validation.checks
              .filter((c) => !c.passed)
              .map((c) => c.message)
              .join('; '),
      });
    }

    return results;
  }
}
