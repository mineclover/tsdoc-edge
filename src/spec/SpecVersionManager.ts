/**
 * Specification Version Manager
 * @packageDocumentation
 * @responsibility Manage specification document version tracking and comparison
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Version bump type
 */
export type VersionBumpType = 'major' | 'minor' | 'patch';

/**
 * Version history entry
 */
export interface VersionHistoryEntry {
  version: string;
  date: string;
  commit: string;
  message: string;
  author: string;
}

/**
 * Version comparison result
 */
export interface VersionDiff {
  from: string;
  to: string;
  changes: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  summary: string;
}

/**
 * Manages specification document version tracking
 *
 * @public
 * @responsibility Track versions, compare changes, and manage version bumps
 */
export class SpecVersionManager {
  /**
   * Get version history for a specification document
   *
   * @param filePath - Path to specification document
   * @returns Array of version history entries
   */
  getHistory(filePath: string): VersionHistoryEntry[] {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const history: VersionHistoryEntry[] = [];

    try {
      // Get git log for this file
      const gitLog = execSync(
        `git log --follow --format="%H|%ai|%an|%s" -- "${filePath}"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      ).trim();

      if (!gitLog) {
        return [];
      }

      const commits = gitLog.split('\n');

      for (const commit of commits) {
        const [hash, date, author, message] = commit.split('|');

        // Get the version from frontmatter at this commit
        const version = this.getVersionAtCommit(filePath, hash);

        if (version) {
          history.push({
            version,
            date: new Date(date).toISOString().split('T')[0],
            commit: hash.substring(0, 8),
            message,
            author,
          });
        }
      }
    } catch (error) {
      // Not a git repository or git not available
      console.warn('Git is not available or file is not tracked');

      // Fallback: just get current version
      const currentVersion = this.getCurrentVersion(filePath);
      if (currentVersion) {
        history.push({
          version: currentVersion,
          date: new Date().toISOString().split('T')[0],
          commit: 'current',
          message: 'Current version',
          author: 'unknown',
        });
      }
    }

    return history;
  }

  /**
   * Get version from frontmatter at a specific git commit
   */
  private getVersionAtCommit(filePath: string, commit: string): string | null {
    try {
      const content = execSync(`git show ${commit}:"${filePath}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      return this.extractVersion(content);
    } catch {
      return null;
    }
  }

  /**
   * Get current version from frontmatter
   * @param filePath - filePath parameter
   * @returns Returns string | null
   */
  getCurrentVersion(filePath: string): string | null {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return this.extractVersion(content);
  }

  /**
   * Extract version from frontmatter
   */
  private extractVersion(content: string): string | null {
    const versionMatch = /^version:\s*(.+)$/m.exec(content);
    return versionMatch ? versionMatch[1].trim() : null;
  }

  /**
   * Compare two versions of a specification
   *
   * @param filePath - Path to specification document
   * @param fromVersion - Starting version
   * @param toVersion - Ending version
   * @returns Version comparison result
   */
  diff(filePath: string, fromVersion: string, toVersion: string): VersionDiff {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const history = this.getHistory(filePath);
    const fromEntry = history.find((e) => e.version === fromVersion);
    const toEntry = history.find((e) => e.version === toVersion);

    if (!fromEntry) {
      throw new Error(`Version ${fromVersion} not found in history`);
    }

    if (!toEntry) {
      throw new Error(`Version ${toVersion} not found in history`);
    }

    try {
      // Get content at both commits
      const fromContent = execSync(`git show ${fromEntry.commit}:"${filePath}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      const toContent = execSync(`git show ${toEntry.commit}:"${filePath}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      // Analyze changes
      const changes = this.analyzeChanges(fromContent, toContent);
      const summary = this.generateSummary(changes);

      return {
        from: fromVersion,
        to: toVersion,
        changes,
        summary,
      };
    } catch (error) {
      throw new Error(`Failed to compare versions: ${error}`);
    }
  }

  /**
   * Analyze changes between two versions
   */
  private analyzeChanges(fromContent: string, toContent: string): {
    added: string[];
    removed: string[];
    modified: string[];
  } {
    const fromSections = this.extractSections(fromContent);
    const toSections = this.extractSections(toContent);

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    // Find added sections
    for (const section of toSections) {
      if (!fromSections.includes(section)) {
        added.push(section);
      }
    }

    // Find removed sections
    for (const section of fromSections) {
      if (!toSections.includes(section)) {
        removed.push(section);
      }
    }

    // Find modified sections (simple check based on content length)
    const fromLines = fromContent.split('\n');
    const toLines = toContent.split('\n');

    if (fromLines.length !== toLines.length && added.length === 0 && removed.length === 0) {
      modified.push('Content structure modified');
    }

    return { added, removed, modified };
  }

  /**
   * Extract section headers from markdown
   */
  private extractSections(content: string): string[] {
    const sections: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = /^#{2,3}\s+(.+)$/.exec(line);
      if (match) {
        sections.push(match[1].trim());
      }
    }

    return sections;
  }

  /**
   * Generate summary of changes
   */
  private generateSummary(changes: {
    added: string[];
    removed: string[];
    modified: string[];
  }): string {
    const parts: string[] = [];

    if (changes.added.length > 0) {
      parts.push(`Added: ${changes.added.join(', ')}`);
    }

    if (changes.removed.length > 0) {
      parts.push(`Removed: ${changes.removed.join(', ')}`);
    }

    if (changes.modified.length > 0) {
      parts.push(`Modified: ${changes.modified.join(', ')}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'No significant changes detected';
  }

  /**
   * Bump version number
   *
   * @param filePath - Path to specification document
   * @param bumpType - Type of version bump (major, minor, patch)
   * @returns New version number
   */
  bump(filePath: string, bumpType: VersionBumpType): string {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const currentVersion = this.getCurrentVersion(filePath);
    if (!currentVersion) {
      throw new Error('No version found in frontmatter');
    }

    const newVersion = this.calculateNewVersion(currentVersion, bumpType);

    // Update frontmatter
    let content = fs.readFileSync(filePath, 'utf-8');
    content = content.replace(
      /^version:\s*.+$/m,
      `version: ${newVersion}`
    );

    // Update lastUpdated
    const today = new Date().toISOString().split('T')[0];
    content = content.replace(
      /^lastUpdated:\s*.+$/m,
      `lastUpdated: ${today}`
    );

    fs.writeFileSync(filePath, content, 'utf-8');

    return newVersion;
  }

  /**
   * Calculate new version based on bump type
   */
  private calculateNewVersion(current: string, bumpType: VersionBumpType): string {
    const parts = current.split('.').map(Number);

    if (parts.length !== 3 || parts.some(isNaN)) {
      throw new Error(`Invalid version format: ${current}. Expected format: X.Y.Z`);
    }

    let [major, minor, patch] = parts;

    switch (bumpType) {
      case 'major':
        major += 1;
        minor = 0;
        patch = 0;
        break;
      case 'minor':
        minor += 1;
        patch = 0;
        break;
      case 'patch':
        patch += 1;
        break;
    }

    return `${major}.${minor}.${patch}`;
  }

  /**
   * Generate changelog from version history
   *
   * @param filePath - Path to specification document
   * @returns Markdown formatted changelog
   */
  generateChangelog(filePath: string): string {
    const history = this.getHistory(filePath);

    if (history.length === 0) {
      return '## Change Log\n\nNo version history available.';
    }

    let changelog = '## Change Log\n\n';

    for (const entry of history) {
      changelog += `### v${entry.version} (${entry.date})\n`;
      changelog += `- ${entry.message}\n`;
      changelog += `- Author: ${entry.author}\n`;
      changelog += `- Commit: ${entry.commit}\n\n`;
    }

    return changelog;
  }
}
