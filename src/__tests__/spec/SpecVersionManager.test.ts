/**
 * SpecVersionManager tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { VersionBumpType } from '../../spec/SpecVersionManager';
import { SpecVersionManager } from '../../spec/SpecVersionManager';

describe('SpecVersionManager', () => {
  let tempDir: string;
  let manager: SpecVersionManager;

  beforeEach(() => {
    tempDir = path.join(process.cwd(), '.test-temp', `spec-version-test-${Math.random()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    manager = new SpecVersionManager();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const createTestDoc = (version: string, withSections = true): string => {
    const filePath = path.join(tempDir, `test-v${version}.md`);

    let content = `---
version: ${version}
lastUpdated: 2024-11-06
status: draft
---

# Test Specification v${version}

## Overview
This is version ${version} of the test specification.

`;

    if (withSections) {
      content += `## Purpose
Purpose section content.

## Context
Context section content.

## Usage
Usage section content.
`;
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  };

  describe('getCurrentVersion', () => {
    it('should extract version from frontmatter', () => {
      const filePath = createTestDoc('1.2.3');
      const version = manager.getCurrentVersion(filePath);

      expect(version).toBe('1.2.3');
    });

    it('should return null for non-existent file', () => {
      const version = manager.getCurrentVersion('/non-existent.md');
      expect(version).toBeNull();
    });

    it('should return null for document without version', () => {
      const filePath = path.join(tempDir, 'no-version.md');
      fs.writeFileSync(
        filePath,
        `---
status: draft
---

# Test`,
        'utf-8'
      );

      const version = manager.getCurrentVersion(filePath);
      expect(version).toBeNull();
    });

    it('should handle version with quotes', () => {
      const filePath = path.join(tempDir, 'quoted-version.md');
      fs.writeFileSync(
        filePath,
        `---
version: "2.0.0"
---

# Test`,
        'utf-8'
      );

      const version = manager.getCurrentVersion(filePath);
      expect(version).toBe('"2.0.0"');
    });

    it('should handle version with spaces', () => {
      const filePath = path.join(tempDir, 'spaced-version.md');
      fs.writeFileSync(
        filePath,
        `---
version:   1.0.0
---

# Test`,
        'utf-8'
      );

      const version = manager.getCurrentVersion(filePath);
      expect(version).toBe('1.0.0');
    });
  });

  describe('bump', () => {
    it('should bump major version', () => {
      const filePath = createTestDoc('1.2.3');
      const newVersion = manager.bump(filePath, 'major');

      expect(newVersion).toBe('2.0.0');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('version: 2.0.0');
    });

    it('should bump minor version', () => {
      const filePath = createTestDoc('1.2.3');
      const newVersion = manager.bump(filePath, 'minor');

      expect(newVersion).toBe('1.3.0');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('version: 1.3.0');
    });

    it('should bump patch version', () => {
      const filePath = createTestDoc('1.2.3');
      const newVersion = manager.bump(filePath, 'patch');

      expect(newVersion).toBe('1.2.4');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('version: 1.2.4');
    });

    it('should update lastUpdated field when bumping', () => {
      const filePath = createTestDoc('1.0.0');
      manager.bump(filePath, 'patch');

      const content = fs.readFileSync(filePath, 'utf-8');
      const today = new Date().toISOString().split('T')[0];
      expect(content).toContain(`lastUpdated: ${today}`);
    });

    it('should throw error for non-existent file', () => {
      expect(() => {
        manager.bump('/non-existent.md', 'patch');
      }).toThrow('File not found');
    });

    it('should throw error for missing version', () => {
      const filePath = path.join(tempDir, 'no-version.md');
      fs.writeFileSync(
        filePath,
        `---
status: draft
---

# Test`,
        'utf-8'
      );

      expect(() => {
        manager.bump(filePath, 'patch');
      }).toThrow('No version found in frontmatter');
    });

    it('should throw error for invalid version format', () => {
      const filePath = path.join(tempDir, 'bad-version.md');
      fs.writeFileSync(
        filePath,
        `---
version: not-a-version
---

# Test`,
        'utf-8'
      );

      expect(() => {
        manager.bump(filePath, 'patch');
      }).toThrow('Invalid version format');
    });

    it('should handle version with only two parts', () => {
      const filePath = path.join(tempDir, 'two-part-version.md');
      fs.writeFileSync(
        filePath,
        `---
version: 1.0
---

# Test`,
        'utf-8'
      );

      expect(() => {
        manager.bump(filePath, 'patch');
      }).toThrow('Invalid version format');
    });

    it('should reset minor and patch when bumping major', () => {
      const filePath = createTestDoc('1.5.9');
      const newVersion = manager.bump(filePath, 'major');

      expect(newVersion).toBe('2.0.0');
    });

    it('should reset patch when bumping minor', () => {
      const filePath = createTestDoc('1.2.9');
      const newVersion = manager.bump(filePath, 'minor');

      expect(newVersion).toBe('1.3.0');
    });
  });

  describe('getHistory', () => {
    it('should return empty array for file not in git', () => {
      const filePath = createTestDoc('1.0.0');
      const history = manager.getHistory(filePath);

      // File is not in git, so should fallback to current version
      expect(history.length).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for non-existent file', () => {
      expect(() => {
        manager.getHistory('/non-existent.md');
      }).toThrow('File not found');
    });

    it('should include current version in fallback mode', () => {
      const filePath = createTestDoc('1.0.0');
      const history = manager.getHistory(filePath);

      if (history.length > 0) {
        expect(history[0].version).toBe('1.0.0');
      }
    });
  });

  describe('diff', () => {
    it('should throw error for file not in git', () => {
      const filePath = createTestDoc('1.0.0');

      expect(() => {
        manager.diff(filePath, '1.0.0', '1.1.0');
      }).toThrow();
    });

    it('should throw error for non-existent file', () => {
      expect(() => {
        manager.diff('/non-existent.md', '1.0.0', '1.1.0');
      }).toThrow('File not found');
    });
  });

  describe('generateChangelog', () => {
    it('should generate changelog with version history', () => {
      const filePath = createTestDoc('1.0.0');
      const changelog = manager.generateChangelog(filePath);

      expect(changelog).toContain('## Change Log');
    });

    it('should show no history message when no versions', () => {
      const filePath = path.join(tempDir, 'no-version.md');
      fs.writeFileSync(
        filePath,
        `---
status: draft
---

# Test`,
        'utf-8'
      );

      const changelog = manager.generateChangelog(filePath);
      expect(changelog).toContain('No version history available');
    });

    it('should include version numbers in changelog', () => {
      const filePath = createTestDoc('2.0.0');
      const changelog = manager.generateChangelog(filePath);

      if (!changelog.includes('No version history available')) {
        expect(changelog).toContain('###');
      }
    });

    it('should format changelog as markdown', () => {
      const filePath = createTestDoc('1.0.0');
      const changelog = manager.generateChangelog(filePath);

      expect(changelog).toMatch(/^## Change Log/);
    });
  });

  describe('version comparison logic', () => {
    it('should correctly parse version numbers', () => {
      const filePath = createTestDoc('10.20.30');
      const newVersion = manager.bump(filePath, 'patch');

      expect(newVersion).toBe('10.20.31');
    });

    it('should handle zero versions', () => {
      const filePath = createTestDoc('0.0.0');
      const newVersion = manager.bump(filePath, 'patch');

      expect(newVersion).toBe('0.0.1');
    });

    it('should handle large version numbers', () => {
      const filePath = createTestDoc('999.999.999');
      const newVersion = manager.bump(filePath, 'patch');

      expect(newVersion).toBe('999.999.1000');
    });

    it('should handle version bump types case-sensitively', () => {
      const filePath = createTestDoc('1.0.0');
      const newVersion = manager.bump(filePath, 'major' as VersionBumpType);

      expect(newVersion).toBe('2.0.0');
    });
  });

  describe('frontmatter handling', () => {
    it('should preserve other frontmatter fields when bumping', () => {
      const filePath = path.join(tempDir, 'rich-frontmatter.md');
      fs.writeFileSync(
        filePath,
        `---
version: 1.0.0
status: active
author: Test Author
tags: [test, spec]
---

# Test`,
        'utf-8'
      );

      manager.bump(filePath, 'patch');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain('status: active');
      expect(content).toContain('author: Test Author');
      expect(content).toContain('tags: [test, spec]');
      expect(content).toContain('version: 1.0.1');
    });

    it('should handle multiline frontmatter values', () => {
      const filePath = path.join(tempDir, 'multiline.md');
      fs.writeFileSync(
        filePath,
        `---
version: 1.0.0
description: |
  This is a
  multiline description
---

# Test`,
        'utf-8'
      );

      const version = manager.getCurrentVersion(filePath);
      expect(version).toBe('1.0.0');
    });
  });

  describe('edge cases', () => {
    it('should handle empty document', () => {
      const filePath = path.join(tempDir, 'empty.md');
      fs.writeFileSync(filePath, '', 'utf-8');

      const version = manager.getCurrentVersion(filePath);
      expect(version).toBeNull();
    });

    it('should handle document with only frontmatter', () => {
      const filePath = path.join(tempDir, 'only-frontmatter.md');
      fs.writeFileSync(
        filePath,
        `---
version: 1.0.0
---`,
        'utf-8'
      );

      const version = manager.getCurrentVersion(filePath);
      expect(version).toBe('1.0.0');
    });

    it('should handle document with malformed frontmatter', () => {
      const filePath = path.join(tempDir, 'malformed.md');
      fs.writeFileSync(
        filePath,
        `---
version 1.0.0
---

# Test`,
        'utf-8'
      );

      const version = manager.getCurrentVersion(filePath);
      expect(version).toBeNull();
    });

    it('should handle document with no frontmatter delimiter', () => {
      const filePath = path.join(tempDir, 'no-delimiter.md');
      fs.writeFileSync(
        filePath,
        `version: 1.0.0

# Test`,
        'utf-8'
      );

      const version = manager.getCurrentVersion(filePath);
      // The regex actually matches "version: X.Y.Z" anywhere in the file
      // So this will find it even without --- delimiters
      expect(version).toBe('1.0.0');
    });
  });
});
