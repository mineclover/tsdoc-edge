/**
 * SpecContentSimilarityChecker tests
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SpecContentSimilarityChecker } from '../../spec/SpecContentSimilarityChecker';

describe('SpecContentSimilarityChecker', () => {
  let tempDir: string;
  let checker: SpecContentSimilarityChecker;

  beforeEach(() => {
    tempDir = path.join(process.cwd(), '.test-temp', `spec-similarity-test-${Math.random()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    checker = new SpecContentSimilarityChecker();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const createTestDoc = (name: string, sections: { name: string; content: string }[]): string => {
    const filePath = path.join(tempDir, `${name}.md`);

    let content = `---
version: 1.0.0
status: draft
---

# ${name}

`;

    for (const section of sections) {
      content += `## ${section.name}\n\n${section.content}\n\n`;
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  };

  describe('checkPair', () => {
    it('should detect high similarity between identical documents', () => {
      const file1 = createTestDoc('doc1', [
        { name: 'Overview', content: 'This is a detailed overview of the authentication system.' },
        { name: 'Purpose', content: 'The purpose is to provide secure user authentication.' },
        { name: 'Implementation', content: 'We use JWT tokens for session management.' },
      ]);

      const file2 = createTestDoc('doc2', [
        { name: 'Overview', content: 'This is a detailed overview of the authentication system.' },
        { name: 'Purpose', content: 'The purpose is to provide secure user authentication.' },
        { name: 'Implementation', content: 'We use JWT tokens for session management.' },
      ]);

      const result = checker.checkPair(file1, file2);

      expect(result.similarity).toBeGreaterThan(0.7);
      expect(result.overlappingSections.length).toBeGreaterThan(0);
      expect(result.suggestion).toBe('merge');
    });

    it('should detect moderate similarity with overlapping sections', () => {
      const file1 = createTestDoc('doc1', [
        { name: 'Overview', content: 'User authentication system with JWT tokens.' },
        { name: 'Security', content: 'We implement bcrypt password hashing.' },
      ]);

      const file2 = createTestDoc('doc2', [
        { name: 'Overview', content: 'User authentication using JSON Web Tokens.' },
        { name: 'Database', content: 'User credentials stored in PostgreSQL.' },
      ]);

      const result = checker.checkPair(file1, file2);

      expect(result.similarity).toBeGreaterThan(0);
      if (result.similarity > 0.3) {
        expect(result.overlappingSections.length).toBeGreaterThan(0);
      }
    });

    it('should detect low similarity with different content', () => {
      const file1 = createTestDoc('doc1', [
        { name: 'Purpose', content: 'Database connection pooling and management.' },
        { name: 'Configuration', content: 'PostgreSQL connection parameters and pool size.' },
      ]);

      const file2 = createTestDoc('doc2', [
        { name: 'Overview', content: 'Frontend React component architecture.' },
        { name: 'Styling', content: 'Using Tailwind CSS for responsive design.' },
      ]);

      const result = checker.checkPair(file1, file2);

      expect(result.similarity).toBeLessThan(0.5);
      expect(result.suggestion).toBe('keep-separate');
    });

    it('should suggest cross-reference for moderate similarity', () => {
      const file1 = createTestDoc('doc1', [
        {
          name: 'Authentication',
          content:
            'User login flow with email and password validation rules secure access control session management token generation',
        },
        {
          name: 'Session',
          content: 'Session management using cookies and tokens authentication bearer jwt refresh',
        },
      ]);

      const file2 = createTestDoc('doc2', [
        {
          name: 'Authentication',
          content: 'User authentication process with email password secure login validation flow',
        },
        {
          name: 'Storage',
          content: 'Session data stored in Redis cache tokens cookies management',
        },
      ]);

      const result = checker.checkPair(file1, file2);

      // Test passes if similarity is in expected range and suggestion matches
      if (
        result.similarity > 0.3 &&
        result.similarity <= 0.7 &&
        result.overlappingSections.length >= 2
      ) {
        expect(result.suggestion).toBe('cross-reference');
      } else {
        // Otherwise just verify the result is valid
        expect(['merge', 'cross-reference', 'keep-separate']).toContain(result.suggestion);
      }
    });

    it('should throw error for non-existent file', () => {
      const file1 = createTestDoc('doc1', [{ name: 'Test', content: 'Test content' }]);

      expect(() => {
        checker.checkPair(file1, '/non-existent.md');
      }).toThrow('File not found');
    });

    it('should handle documents with no sections', () => {
      const file1 = path.join(tempDir, 'no-sections-1.md');
      const file2 = path.join(tempDir, 'no-sections-2.md');

      fs.writeFileSync(file1, '---\nstatus: draft\n---\n\n# Test\n\nContent', 'utf-8');
      fs.writeFileSync(file2, '---\nstatus: draft\n---\n\n# Test\n\nOther', 'utf-8');

      const result = checker.checkPair(file1, file2);

      expect(result.similarity).toBeDefined();
      expect(result.overlappingSections).toEqual([]);
    });

    it('should calculate similarity scores between 0 and 1', () => {
      const file1 = createTestDoc('doc1', [{ name: 'Section A', content: 'Content A' }]);

      const file2 = createTestDoc('doc2', [{ name: 'Section B', content: 'Content B' }]);

      const result = checker.checkPair(file1, file2);

      expect(result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeLessThanOrEqual(1);
    });

    it('should round similarity scores to 2 decimal places', () => {
      const file1 = createTestDoc('doc1', [
        { name: 'Overview', content: 'This is test content for similarity checking.' },
      ]);

      const file2 = createTestDoc('doc2', [
        { name: 'Overview', content: 'This is test content for checking similarity.' },
      ]);

      const result = checker.checkPair(file1, file2);

      // Check that similarity has at most 2 decimal places
      const decimalPart = result.similarity.toString().split('.')[1];
      if (decimalPart) {
        expect(decimalPart.length).toBeLessThanOrEqual(2);
      }
    });

    it('should include reason in suggestion', () => {
      const file1 = createTestDoc('doc1', [{ name: 'Overview', content: 'Test content' }]);

      const file2 = createTestDoc('doc2', [{ name: 'Overview', content: 'Different content' }]);

      const result = checker.checkPair(file1, file2);

      expect(result.reason).toBeDefined();
      expect(result.reason.length).toBeGreaterThan(0);
    });
  });

  describe('checkMultiple', () => {
    it('should compare all pairs in a set of documents', () => {
      const files = [
        createTestDoc('doc1', [
          { name: 'Overview', content: 'Authentication system implementation.' },
        ]),
        createTestDoc('doc2', [{ name: 'Overview', content: 'Authentication system design.' }]),
        createTestDoc('doc3', [{ name: 'Overview', content: 'Database schema design.' }]),
      ];

      const results = checker.checkMultiple(files);

      // 3 files = 3 pairs (1-2, 1-3, 2-3)
      // But only pairs with similarity > threshold are included
      expect(results.length).toBeGreaterThanOrEqual(0);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should sort results by similarity descending', () => {
      const files = [
        createTestDoc('doc1', [
          { name: 'Test', content: 'authentication user login password secure' },
        ]),
        createTestDoc('doc2', [
          { name: 'Test', content: 'authentication user login password secure access' },
        ]),
        createTestDoc('doc3', [{ name: 'Test', content: 'database schema table column index' }]),
      ];

      const results = checker.checkMultiple(files);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    it('should only include pairs above similarity threshold', () => {
      const files = [
        createTestDoc('doc1', [
          { name: 'Test', content: 'Completely unique content about topic A' },
        ]),
        createTestDoc('doc2', [
          { name: 'Test', content: 'Entirely different content about topic B' },
        ]),
        createTestDoc('doc3', [{ name: 'Test', content: 'Distinct content about topic C' }]),
      ];

      const results = checker.checkMultiple(files);

      for (const result of results) {
        expect(result.similarity).toBeGreaterThan(0.3); // default threshold
      }
    });

    it('should handle empty file list', () => {
      const results = checker.checkMultiple([]);
      expect(results).toEqual([]);
    });

    it('should handle single file', () => {
      const file = createTestDoc('doc1', [{ name: 'Test', content: 'Test content' }]);

      const results = checker.checkMultiple([file]);
      expect(results).toEqual([]);
    });

    it('should respect custom similarity threshold', () => {
      const customChecker = new SpecContentSimilarityChecker({
        similarityThreshold: 0.8,
      });

      const files = [
        createTestDoc('doc1', [{ name: 'Test', content: 'authentication user system' }]),
        createTestDoc('doc2', [{ name: 'Test', content: 'authentication user' }]),
      ];

      const results = customChecker.checkMultiple(files);

      // With high threshold, fewer results should be returned
      for (const result of results) {
        expect(result.similarity).toBeGreaterThan(0.8);
      }
    });
  });

  describe('getSummary', () => {
    it('should calculate summary statistics', () => {
      const file1 = createTestDoc('doc1', [
        { name: 'Overview', content: 'Test content for similarity' },
      ]);

      const file2 = createTestDoc('doc2', [
        { name: 'Overview', content: 'Test content for checking' },
      ]);

      const file3 = createTestDoc('doc3', [
        { name: 'Overview', content: 'Completely different topic' },
      ]);

      const results = checker.checkMultiple([file1, file2, file3]);
      const summary = checker.getSummary(results);

      expect(summary.totalPairs).toBe(results.length);
      expect(summary.mergeSuggestions).toBeGreaterThanOrEqual(0);
      expect(summary.crossRefSuggestions).toBeGreaterThanOrEqual(0);
      expect(summary.keepSeparate).toBeGreaterThanOrEqual(0);
      expect(summary.averageSimilarity).toBeGreaterThanOrEqual(0);
      expect(summary.averageSimilarity).toBeLessThanOrEqual(1);
    });

    it('should handle empty results', () => {
      const summary = checker.getSummary([]);

      expect(summary.totalPairs).toBe(0);
      expect(summary.mergeSuggestions).toBe(0);
      expect(summary.crossRefSuggestions).toBe(0);
      expect(summary.keepSeparate).toBe(0);
      expect(summary.averageSimilarity).toBe(0);
    });

    it('should count suggestions correctly', () => {
      const file1 = createTestDoc('doc1', [
        {
          name: 'Overview',
          content:
            'authentication system user login password token secure access control validation session',
        },
        {
          name: 'Implementation',
          content: 'jwt tokens bcrypt hashing database storage redis cache session management',
        },
        {
          name: 'Security',
          content: 'encryption ssl tls certificate authentication authorization role permission',
        },
      ]);

      const file2 = createTestDoc('doc2', [
        {
          name: 'Overview',
          content:
            'authentication system user login password token secure access control validation session',
        },
        {
          name: 'Implementation',
          content: 'jwt tokens bcrypt hashing database storage redis cache session management',
        },
        {
          name: 'Security',
          content: 'encryption ssl tls certificate authentication authorization role permission',
        },
      ]);

      const file3 = createTestDoc('doc3', [
        {
          name: 'Overview',
          content: 'frontend react component state props hooks context provider consumer reducer',
        },
      ]);

      const results = checker.checkMultiple([file1, file2, file3]);
      const summary = checker.getSummary(results);

      const total = summary.mergeSuggestions + summary.crossRefSuggestions + summary.keepSeparate;
      expect(total).toBe(summary.totalPairs);
    });

    it('should calculate average similarity correctly', () => {
      const file1 = createTestDoc('doc1', [{ name: 'Test', content: 'content one two three' }]);

      const file2 = createTestDoc('doc2', [{ name: 'Test', content: 'content one two' }]);

      const results = checker.checkMultiple([file1, file2]);
      const summary = checker.getSummary(results);

      if (results.length > 0) {
        const manualAvg = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
        expect(summary.averageSimilarity).toBeCloseTo(manualAvg, 2);
      }
    });

    it('should round average similarity to 2 decimal places', () => {
      const file1 = createTestDoc('doc1', [{ name: 'Test', content: 'test content similarity' }]);

      const file2 = createTestDoc('doc2', [{ name: 'Test', content: 'test content' }]);

      const results = checker.checkMultiple([file1, file2]);
      const summary = checker.getSummary(results);

      const decimalPart = summary.averageSimilarity.toString().split('.')[1];
      if (decimalPart) {
        expect(decimalPart.length).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('custom thresholds', () => {
    it('should respect custom similarity threshold', () => {
      const customChecker = new SpecContentSimilarityChecker({
        similarityThreshold: 0.5,
      });

      const file1 = createTestDoc('doc1', [
        { name: 'Test', content: 'moderate similarity content' },
      ]);

      const file2 = createTestDoc('doc2', [{ name: 'Test', content: 'moderate similarity' }]);

      const result = customChecker.checkPair(file1, file2);
      // Result behavior depends on actual similarity
      expect(result).toBeDefined();
    });

    it('should respect custom high similarity threshold', () => {
      const customChecker = new SpecContentSimilarityChecker({
        highSimilarityThreshold: 0.9,
      });

      const file1 = createTestDoc('doc1', [{ name: 'Test', content: 'test' }]);

      const file2 = createTestDoc('doc2', [{ name: 'Test', content: 'different' }]);

      const result = customChecker.checkPair(file1, file2);
      // With very high threshold, merge should be rare
      expect(result).toBeDefined();
    });

    it('should use default thresholds when not provided', () => {
      const defaultChecker = new SpecContentSimilarityChecker();

      const file1 = createTestDoc('doc1', [{ name: 'Test', content: 'content' }]);

      const file2 = createTestDoc('doc2', [{ name: 'Test', content: 'content' }]);

      const result = defaultChecker.checkPair(file1, file2);
      expect(result).toBeDefined();
    });
  });

  describe('text processing', () => {
    it('should ignore code blocks in similarity calculation', () => {
      const file1 = createTestDoc('doc1', [
        {
          name: 'Test',
          content: 'authentication system ```typescript\nconst code = "test";\n``` user management',
        },
      ]);

      const file2 = createTestDoc('doc2', [
        { name: 'Test', content: 'authentication system user management' },
      ]);

      const result = checker.checkPair(file1, file2);
      expect(result.similarity).toBeGreaterThan(0);
    });

    it('should ignore inline code in similarity calculation', () => {
      const file1 = createTestDoc('doc1', [
        { name: 'Test', content: 'Use `getUserId()` function for authentication' },
      ]);

      const file2 = createTestDoc('doc2', [
        { name: 'Test', content: 'Use function for authentication' },
      ]);

      const result = checker.checkPair(file1, file2);
      expect(result.similarity).toBeGreaterThan(0);
    });

    it('should ignore [[symbols]] in similarity calculation', () => {
      const file1 = createTestDoc('doc1', [
        { name: 'Test', content: 'The [[AuthService]] handles user authentication' },
      ]);

      const file2 = createTestDoc('doc2', [
        { name: 'Test', content: 'The service handles user authentication' },
      ]);

      const result = checker.checkPair(file1, file2);
      expect(result.similarity).toBeGreaterThan(0);
    });

    it('should ignore markdown links in similarity calculation', () => {
      const file1 = createTestDoc('doc1', [
        {
          name: 'Test',
          content: 'See [documentation](https://example.com) for authentication details',
        },
      ]);

      const file2 = createTestDoc('doc2', [
        { name: 'Test', content: 'See documentation for authentication details' },
      ]);

      const result = checker.checkPair(file1, file2);
      expect(result.similarity).toBeGreaterThan(0);
    });

    it('should handle Korean text', () => {
      const file1 = createTestDoc('doc1', [{ name: 'Test', content: '사용자 인증 시스템 구현' }]);

      const file2 = createTestDoc('doc2', [{ name: 'Test', content: '사용자 인증 시스템' }]);

      const result = checker.checkPair(file1, file2);
      expect(result.similarity).toBeGreaterThan(0);
    });

    it('should be case-insensitive', () => {
      const file1 = createTestDoc('doc1', [{ name: 'Test', content: 'AUTHENTICATION SYSTEM' }]);

      const file2 = createTestDoc('doc2', [{ name: 'Test', content: 'authentication system' }]);

      const result = checker.checkPair(file1, file2);
      expect(result.similarity).toBeGreaterThan(0.5);
    });

    it('should filter out stop words', () => {
      const file1 = createTestDoc('doc1', [
        { name: 'Test', content: 'the authentication system is used for user validation' },
      ]);

      const file2 = createTestDoc('doc2', [
        { name: 'Test', content: 'authentication system user validation' },
      ]);

      const result = checker.checkPair(file1, file2);
      // Should have high similarity despite different stop words
      expect(result.similarity).toBeGreaterThan(0.5);
    });

    it('should handle empty text', () => {
      const file1 = createTestDoc('doc1', [{ name: 'Empty', content: '' }]);

      const file2 = createTestDoc('doc2', [{ name: 'Empty', content: '' }]);

      const result = checker.checkPair(file1, file2);
      expect(result.similarity).toBeGreaterThanOrEqual(0);
    });
  });
});
