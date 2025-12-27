/**
 * Tests for LSP CacheManager
 */

import { CacheManager } from '../../lsp/cache-manager';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager({ ttl: 1000, maxSize: 10, cleanupInterval: 60000 });
  });

  afterEach(() => {
    cacheManager.dispose();
  });

  describe('basic operations', () => {
    it('should set and get values', () => {
      cacheManager.set('hover', 'key1', 'value1');
      expect(cacheManager.get('hover', 'key1')).toBe('value1');
    });

    it('should return undefined for missing keys', () => {
      expect(cacheManager.get('hover', 'nonexistent')).toBeUndefined();
    });

    it('should delete values', () => {
      cacheManager.set('hover', 'key1', 'value1');
      cacheManager.delete('hover', 'key1');
      expect(cacheManager.get('hover', 'key1')).toBeUndefined();
    });

    it('should clear all caches', () => {
      cacheManager.set('hover', 'key1', 'value1');
      cacheManager.set('lens', 'key2', 'value2');
      cacheManager.clearAll();
      expect(cacheManager.get('hover', 'key1')).toBeUndefined();
      expect(cacheManager.get('lens', 'key2')).toBeUndefined();
    });

    it('should clear specific cache', () => {
      cacheManager.set('hover', 'key1', 'value1');
      cacheManager.set('lens', 'key2', 'value2');
      cacheManager.clearCache('hover');
      expect(cacheManager.get('hover', 'key1')).toBeUndefined();
      expect(cacheManager.get('lens', 'key2')).toBe('value2');
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortTTLCache = new CacheManager({ ttl: 50, cleanupInterval: 60000 });
      shortTTLCache.set('hover', 'key1', 'value1');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(shortTTLCache.get('hover', 'key1')).toBeUndefined();
      shortTTLCache.dispose();
    });
  });
});
