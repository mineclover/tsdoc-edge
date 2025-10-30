/**
 * Utility functions tests
 * @public
 */

import {
  getFileExtension,
  isEmptyOrWhitespace,
  isTypeScriptOrJavaScript,
  normalizeLineEndings,
} from '../utils';

describe('Utility Functions', () => {
  describe('isEmptyOrWhitespace', () => {
    it('should return true for empty string', () => {
      expect(isEmptyOrWhitespace('')).toBe(true);
    });

    it('should return true for whitespace only string', () => {
      expect(isEmptyOrWhitespace('   ')).toBe(true);
      expect(isEmptyOrWhitespace('\t\t')).toBe(true);
      expect(isEmptyOrWhitespace('\n\n')).toBe(true);
      expect(isEmptyOrWhitespace('  \n\t  ')).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(isEmptyOrWhitespace('hello')).toBe(false);
      expect(isEmptyOrWhitespace('  hello  ')).toBe(false);
      expect(isEmptyOrWhitespace('a')).toBe(false);
    });
  });

  describe('normalizeLineEndings', () => {
    it('should convert CRLF to LF', () => {
      expect(normalizeLineEndings('line1\r\nline2\r\nline3')).toBe('line1\nline2\nline3');
    });

    it('should convert CR to LF', () => {
      expect(normalizeLineEndings('line1\rline2\rline3')).toBe('line1\nline2\nline3');
    });

    it('should leave LF unchanged', () => {
      expect(normalizeLineEndings('line1\nline2\nline3')).toBe('line1\nline2\nline3');
    });

    it('should handle mixed line endings', () => {
      expect(normalizeLineEndings('line1\r\nline2\rline3\nline4')).toBe(
        'line1\nline2\nline3\nline4'
      );
    });

    it('should handle empty string', () => {
      expect(normalizeLineEndings('')).toBe('');
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extension', () => {
      expect(getFileExtension('file.ts')).toBe('ts');
      expect(getFileExtension('file.tsx')).toBe('tsx');
      expect(getFileExtension('file.js')).toBe('js');
      expect(getFileExtension('file.jsx')).toBe('jsx');
      expect(getFileExtension('file.txt')).toBe('txt');
    });

    it('should handle multiple dots in filename', () => {
      expect(getFileExtension('my.test.file.ts')).toBe('ts');
      expect(getFileExtension('archive.tar.gz')).toBe('gz');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('README')).toBe('');
      expect(getFileExtension('Makefile')).toBe('');
    });

    it('should handle paths with directories', () => {
      expect(getFileExtension('/path/to/file.ts')).toBe('ts');
      expect(getFileExtension('./relative/path/file.js')).toBe('js');
      expect(getFileExtension('C:\\Windows\\file.txt')).toBe('txt');
    });

    it('should handle hidden files', () => {
      expect(getFileExtension('.gitignore')).toBe('gitignore');
      expect(getFileExtension('.env.local')).toBe('local');
    });
  });

  describe('isTypeScriptOrJavaScript', () => {
    it('should return true for TypeScript files', () => {
      expect(isTypeScriptOrJavaScript('file.ts')).toBe(true);
      expect(isTypeScriptOrJavaScript('file.tsx')).toBe(true);
      expect(isTypeScriptOrJavaScript('/path/to/file.ts')).toBe(true);
    });

    it('should return true for JavaScript files', () => {
      expect(isTypeScriptOrJavaScript('file.js')).toBe(true);
      expect(isTypeScriptOrJavaScript('file.jsx')).toBe(true);
      expect(isTypeScriptOrJavaScript('/path/to/file.js')).toBe(true);
    });

    it('should return false for other file types', () => {
      expect(isTypeScriptOrJavaScript('file.txt')).toBe(false);
      expect(isTypeScriptOrJavaScript('file.md')).toBe(false);
      expect(isTypeScriptOrJavaScript('file.json')).toBe(false);
      expect(isTypeScriptOrJavaScript('file.css')).toBe(false);
      expect(isTypeScriptOrJavaScript('README')).toBe(false);
    });
  });
});
