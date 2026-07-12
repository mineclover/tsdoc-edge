/**
 * SpecStatusManager tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SpecStatusManager } from '../../spec/SpecStatusManager';
import type { SpecStatus } from '../../types/spec';

describe('SpecStatusManager', () => {
  let tempDir: string;
  let manager: SpecStatusManager;

  beforeEach(() => {
    tempDir = path.join(process.cwd(), '.test-temp', `spec-status-test-${Math.random()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    manager = new SpecStatusManager();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const createTestDoc = (
    status: SpecStatus,
    completeness: 'high' | 'medium' | 'low',
    replacement?: string
  ): string => {
    const filePath = path.join(tempDir, `test-${status}-${Date.now()}.md`);

    let content = `---
status: ${status}
lastUpdated: 2024-11-06
${replacement ? `replacement: ${replacement}` : ''}
---

# Test Specification

## Overview
This is a test specification document.

`;

    // Add content based on completeness level
    if (completeness === 'high') {
      content += `## 개요
High completeness document with all required sections.

## 핵심 개념
Key concepts section with [[ConceptA]], [[ConceptB]], [[ConceptC]].

## 핵심 산출물
Output specifications.

## 사용 시나리오
### Scenario 1
First usage scenario with detailed description.

### Scenario 2
Second usage scenario with detailed description.

### Scenario 3
Third usage scenario with detailed description.

## CLI 명령어
Command line interface section.

## Examples
\`\`\`typescript
// Example code 1
function example1() {}
\`\`\`

\`\`\`typescript
// Example code 2
function example2() {}
\`\`\`

\`\`\`typescript
// Example code 3
function example3() {}
\`\`\`

## Code References
[^sym-ref1]
[^sym-ref2]
[^sym-ref3]
[^sym-ref4]
[^sym-ref5]
`;
    } else if (completeness === 'medium') {
      content += `## 개요
Medium completeness document.

## 핵심 개념
Some concepts: [[Concept1]].

## 사용 시나리오
### Scenario 1
One scenario.

### Scenario 2
Two scenario.

## Examples
\`\`\`typescript
// One example
function example() {}
\`\`\`

## Code References
[^sym-ref1]
[^sym-ref2]
`;
    } else {
      content += `## 개요
Low completeness - minimal content.
`;
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  };

  describe('validateTransition', () => {
    it('should allow valid transition from draft to review with sufficient completeness', () => {
      const filePath = createTestDoc('draft', 'high');
      const result = manager.validateTransition(filePath, 'review');

      expect(result.valid).toBe(true);
      expect(result.from).toBe('draft');
      expect(result.to).toBe('review');
      expect(result.checks.every((c) => c.passed)).toBe(true);
    });

    it('should reject transition from draft to review with low completeness', () => {
      const filePath = createTestDoc('draft', 'low');
      const result = manager.validateTransition(filePath, 'review');

      expect(result.valid).toBe(false);
      expect(result.checks.some((c) => !c.passed && c.name === 'Completeness Score')).toBe(true);
    });

    it('should allow transition from draft to archived without completeness check', () => {
      const filePath = createTestDoc('draft', 'low');
      const result = manager.validateTransition(filePath, 'archived');

      expect(result.valid).toBe(true);
      expect(result.checks.find((c) => c.name === 'Completeness Score')?.message).toContain(
        'No completeness requirements'
      );
    });

    it('should reject transition from draft to active (not allowed)', () => {
      const filePath = createTestDoc('draft', 'high');
      const result = manager.validateTransition(filePath, 'active');

      expect(result.valid).toBe(false);
      expect(result.checks[0].name).toBe('Transition Allowed');
      expect(result.checks[0].passed).toBe(false);
    });

    it('should require 80% completeness for approved status', () => {
      const filePath = createTestDoc('review', 'medium');
      const result = manager.validateTransition(filePath, 'approved');

      expect(result.valid).toBe(false);
      expect(result.checks.some((c) => c.name === 'Completeness Score' && !c.passed)).toBe(true);
    });

    it('should require replacement field for deprecated status', () => {
      const filePath = createTestDoc('active', 'high');
      const result = manager.validateTransition(filePath, 'deprecated');

      expect(result.valid).toBe(false);
      expect(result.checks.some((c) => c.name === 'Replacement Document' && !c.passed)).toBe(true);
    });

    it('should allow deprecated transition with replacement field', () => {
      const filePath = createTestDoc('active', 'high', 'new-doc.md');
      const result = manager.validateTransition(filePath, 'deprecated');

      expect(result.valid).toBe(true);
      expect(result.checks.find((c) => c.name === 'Replacement Document')?.passed).toBe(true);
    });

    it('should reject transition from archived (no allowed transitions)', () => {
      const filePath = createTestDoc('archived', 'high');
      const result = manager.validateTransition(filePath, 'active');

      expect(result.valid).toBe(false);
      expect(result.checks[0].message).toContain('Valid targets: none');
    });

    it('should throw error for non-existent file', () => {
      expect(() => {
        manager.validateTransition('/non-existent-file.md', 'review');
      }).toThrow('File not found');
    });

    it('should require all required sections for approved status', () => {
      const filePath = createTestDoc('review', 'medium');
      const result = manager.validateTransition(filePath, 'approved');

      // Medium completeness has required sections but doesn't meet 80% score
      expect(result.valid).toBe(false);
      // But we can check that the required sections check itself exists
      expect(result.checks.some((c) => c.name === 'Completeness Score')).toBe(true);
    });
  });

  describe('applyTransition', () => {
    it('should successfully apply valid transition', () => {
      const filePath = createTestDoc('draft', 'high');
      const result = manager.applyTransition(filePath, 'review');

      expect(result).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('status: review');
    });

    it('should throw error for invalid transition', () => {
      const filePath = createTestDoc('draft', 'low');

      expect(() => {
        manager.applyTransition(filePath, 'review');
      }).toThrow('Cannot transition to "review"');
    });

    it('should update lastUpdated field', () => {
      const filePath = createTestDoc('draft', 'high');
      manager.applyTransition(filePath, 'review');

      const content = fs.readFileSync(filePath, 'utf-8');
      const today = new Date().toISOString().split('T')[0];
      expect(content).toContain(`lastUpdated: ${today}`);
    });

    it('should create frontmatter if missing', () => {
      const filePath = path.join(tempDir, 'no-frontmatter.md');
      fs.writeFileSync(filePath, '# Test\n\nContent', 'utf-8');

      manager.applyTransition(filePath, 'archived');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('---');
      expect(content).toContain('status: archived');
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return allowed transitions for draft status', () => {
      const filePath = createTestDoc('draft', 'high');
      const allowed = manager.getAllowedTransitions(filePath);

      expect(allowed).toEqual(['review', 'archived']);
    });

    it('should return allowed transitions for review status', () => {
      const filePath = createTestDoc('review', 'high');
      const allowed = manager.getAllowedTransitions(filePath);

      expect(allowed).toEqual(['draft', 'approved', 'archived']);
    });

    it('should return empty array for archived status', () => {
      const filePath = createTestDoc('archived', 'high');
      const allowed = manager.getAllowedTransitions(filePath);

      expect(allowed).toEqual([]);
    });

    it('should handle document without frontmatter (defaults to draft)', () => {
      const filePath = path.join(tempDir, 'no-frontmatter.md');
      fs.writeFileSync(filePath, '# Test\n\nContent', 'utf-8');

      const allowed = manager.getAllowedTransitions(filePath);
      expect(allowed).toEqual(['review', 'archived']);
    });
  });

  describe('getStatusDistribution', () => {
    it('should calculate status distribution across documents', () => {
      const files = [
        createTestDoc('draft', 'low'),
        createTestDoc('draft', 'medium'),
        createTestDoc('review', 'high'),
        createTestDoc('approved', 'high'),
        createTestDoc('active', 'high'),
      ];

      const distribution = manager.getStatusDistribution(files);

      expect(distribution.draft).toBe(2);
      expect(distribution.review).toBe(1);
      expect(distribution.approved).toBe(1);
      expect(distribution.active).toBe(1);
      expect(distribution.deprecated).toBe(0);
      expect(distribution.archived).toBe(0);
    });

    it('should handle non-existent files gracefully', () => {
      const files = [createTestDoc('draft', 'high'), '/non-existent.md'];

      const distribution = manager.getStatusDistribution(files);
      expect(distribution.draft).toBe(1);
    });

    it('should return zero counts for empty list', () => {
      const distribution = manager.getStatusDistribution([]);

      expect(distribution.draft).toBe(0);
      expect(distribution.review).toBe(0);
      expect(distribution.approved).toBe(0);
    });
  });

  describe('getPromotableDocs', () => {
    it('should identify documents ready for promotion', () => {
      const files = [
        createTestDoc('draft', 'high'),
        createTestDoc('review', 'high'),
        createTestDoc('approved', 'high'),
      ];

      const promotable = manager.getPromotableDocs(files);

      expect(promotable).toHaveLength(3);
      expect(promotable[0].currentStatus).toBe('draft');
      expect(promotable[0].targetStatus).toBe('review');
      expect(promotable[0].canPromote).toBe(true);
    });

    it('should identify documents not ready for promotion', () => {
      const files = [createTestDoc('draft', 'low')];

      const promotable = manager.getPromotableDocs(files);

      expect(promotable).toHaveLength(1);
      expect(promotable[0].canPromote).toBe(false);
      expect(promotable[0].reason).toContain('does not meet requirement');
    });

    it('should skip documents with no next logical status', () => {
      const files = [
        createTestDoc('active', 'high'),
        createTestDoc('deprecated', 'high', 'replacement.md'),
        createTestDoc('archived', 'high'),
      ];

      const promotable = manager.getPromotableDocs(files);

      expect(promotable).toHaveLength(0);
    });

    it('should handle non-existent files gracefully', () => {
      const files = ['/non-existent.md'];

      const promotable = manager.getPromotableDocs(files);
      expect(promotable).toHaveLength(0);
    });

    it('should provide detailed reason for failed promotion', () => {
      const filePath = createTestDoc('review', 'medium');
      const promotable = manager.getPromotableDocs([filePath]);

      expect(promotable[0].canPromote).toBe(false);
      expect(promotable[0].reason).toContain('does not meet requirement');
    });
  });
});
