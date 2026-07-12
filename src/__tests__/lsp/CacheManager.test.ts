/**
 * CacheManager tests
 * @testScenario Create and manage named caches
 * @testScenario TTL-based expiration
 * @testScenario Maximum size enforcement
 * @testScenario Automatic cleanup
 * @testScenario Cache statistics
 */

import { CacheManager } from '../../lsp/cache-manager';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  afterEach(() => {
    if (cacheManager) {
      cacheManager.dispose();
    }
  });

  describe('constructor', () => {
    it('should create cache manager with default options', () => {
      cacheManager = new CacheManager();
      expect(cacheManager).toBeDefined();
    });

    it('should create cache manager with custom options', () => {
      cacheManager = new CacheManager({
        ttl: 10000,
        maxSize: 100,
        cleanupInterval: 60000,
      });
      expect(cacheManager).toBeDefined();
    });
  });

  describe('createCache', () => {
    beforeEach(() => {
      cacheManager = new CacheManager();
    });

    it('should create a new named cache', () => {
      cacheManager.createCache<string>('test');
      const stats = cacheManager.getStats();
      expect(stats.test).toBe(0);
    });

    it('should not overwrite existing cache', () => {
      cacheManager.createCache<string>('test');
      cacheManager.set('test', 'key1', 'value1');
      cacheManager.createCache<string>('test');
      expect(cacheManager.get<string>('test', 'key1')).toBe('value1');
    });
  });

  describe('get/set', () => {
    beforeEach(() => {
      cacheManager = new CacheManager({ ttl: 1000 });
      cacheManager.createCache<string>('test');
    });

    it('should store and retrieve values', () => {
      cacheManager.set('test', 'key1', 'value1');
      expect(cacheManager.get<string>('test', 'key1')).toBe('value1');
    });

    it('should return undefined for non-existent cache', () => {
      expect(cacheManager.get<string>('nonexistent', 'key1')).toBeUndefined();
    });

    it('should return undefined for non-existent key', () => {
      expect(cacheManager.get<string>('test', 'nonexistent')).toBeUndefined();
    });

    it('should auto-create cache on set', () => {
      cacheManager.set('newcache', 'key1', 'value1');
      expect(cacheManager.get<string>('newcache', 'key1')).toBe('value1');
    });

    it('should overwrite existing value', () => {
      cacheManager.set('test', 'key1', 'value1');
      cacheManager.set('test', 'key1', 'value2');
      expect(cacheManager.get<string>('test', 'key1')).toBe('value2');
    });

    it('should store different types', () => {
      cacheManager.set('test', 'string', 'value');
      cacheManager.set('test', 'number', 42);
      cacheManager.set('test', 'object', { foo: 'bar' });
      cacheManager.set('test', 'array', [1, 2, 3]);

      expect(cacheManager.get<string>('test', 'string')).toBe('value');
      expect(cacheManager.get<number>('test', 'number')).toBe(42);
      expect(cacheManager.get<object>('test', 'object')).toEqual({ foo: 'bar' });
      expect(cacheManager.get<number[]>('test', 'array')).toEqual([1, 2, 3]);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      cacheManager = new CacheManager({ ttl: 50, cleanupInterval: 100000 });
      cacheManager.set('test', 'key1', 'value1');

      expect(cacheManager.get<string>('test', 'key1')).toBe('value1');

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(cacheManager.get<string>('test', 'key1')).toBeUndefined();
    });

    it('should not expire entries before TTL', async () => {
      cacheManager = new CacheManager({ ttl: 1000, cleanupInterval: 100000 });
      cacheManager.set('test', 'key1', 'value1');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(cacheManager.get<string>('test', 'key1')).toBe('value1');
    });
  });

  describe('has', () => {
    beforeEach(() => {
      cacheManager = new CacheManager({ ttl: 1000 });
      cacheManager.createCache<string>('test');
    });

    it('should return true for existing valid entry', () => {
      cacheManager.set('test', 'key1', 'value1');
      expect(cacheManager.has('test', 'key1')).toBe(true);
    });

    it('should return false for non-existent entry', () => {
      expect(cacheManager.has('test', 'nonexistent')).toBe(false);
    });

    it('should return false for non-existent cache', () => {
      expect(cacheManager.has('nonexistent', 'key1')).toBe(false);
    });

    it('should return false for expired entry', async () => {
      cacheManager = new CacheManager({ ttl: 50, cleanupInterval: 100000 });
      cacheManager.set('test', 'key1', 'value1');

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(cacheManager.has('test', 'key1')).toBe(false);
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      cacheManager = new CacheManager();
      cacheManager.createCache<string>('test');
    });

    it('should delete specific entry', () => {
      cacheManager.set('test', 'key1', 'value1');
      cacheManager.set('test', 'key2', 'value2');

      cacheManager.delete('test', 'key1');

      expect(cacheManager.get<string>('test', 'key1')).toBeUndefined();
      expect(cacheManager.get<string>('test', 'key2')).toBe('value2');
    });

    it('should handle deleting non-existent key', () => {
      expect(() => cacheManager.delete('test', 'nonexistent')).not.toThrow();
    });

    it('should handle deleting from non-existent cache', () => {
      expect(() => cacheManager.delete('nonexistent', 'key1')).not.toThrow();
    });
  });

  describe('deleteMatching', () => {
    beforeEach(() => {
      cacheManager = new CacheManager();
      cacheManager.createCache<string>('test');
    });

    it('should delete entries matching predicate', () => {
      cacheManager.set('test', 'file:/path/a.ts', 'valueA');
      cacheManager.set('test', 'file:/path/b.ts', 'valueB');
      cacheManager.set('test', 'symbol:xyz', 'valueC');

      cacheManager.deleteMatching('test', (key) => key.startsWith('file:'));

      expect(cacheManager.get<string>('test', 'file:/path/a.ts')).toBeUndefined();
      expect(cacheManager.get<string>('test', 'file:/path/b.ts')).toBeUndefined();
      expect(cacheManager.get<string>('test', 'symbol:xyz')).toBe('valueC');
    });

    it('should handle non-existent cache', () => {
      expect(() => cacheManager.deleteMatching('nonexistent', () => true)).not.toThrow();
    });
  });

  describe('clearCache', () => {
    beforeEach(() => {
      cacheManager = new CacheManager();
    });

    it('should clear specific cache', () => {
      cacheManager.set('cache1', 'key1', 'value1');
      cacheManager.set('cache2', 'key2', 'value2');

      cacheManager.clearCache('cache1');

      expect(cacheManager.get<string>('cache1', 'key1')).toBeUndefined();
      expect(cacheManager.get<string>('cache2', 'key2')).toBe('value2');
    });

    it('should handle clearing non-existent cache', () => {
      expect(() => cacheManager.clearCache('nonexistent')).not.toThrow();
    });
  });

  describe('clearAll', () => {
    beforeEach(() => {
      cacheManager = new CacheManager();
    });

    it('should clear all caches', () => {
      cacheManager.set('cache1', 'key1', 'value1');
      cacheManager.set('cache2', 'key2', 'value2');

      cacheManager.clearAll();

      expect(cacheManager.get<string>('cache1', 'key1')).toBeUndefined();
      expect(cacheManager.get<string>('cache2', 'key2')).toBeUndefined();
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      cacheManager = new CacheManager();
    });

    it('should return cache sizes', () => {
      cacheManager.createCache<string>('empty');
      cacheManager.set('filled', 'key1', 'value1');
      cacheManager.set('filled', 'key2', 'value2');

      const stats = cacheManager.getStats();

      expect(stats.empty).toBe(0);
      expect(stats.filled).toBe(2);
    });

    it('should return empty object for no caches', () => {
      const stats = cacheManager.getStats();
      expect(stats).toEqual({});
    });
  });

  describe('maxSize enforcement', () => {
    it('should evict oldest entries when maxSize exceeded', () => {
      cacheManager = new CacheManager({ maxSize: 3, cleanupInterval: 100000 });

      cacheManager.set('test', 'key1', 'value1');
      cacheManager.set('test', 'key2', 'value2');
      cacheManager.set('test', 'key3', 'value3');
      cacheManager.set('test', 'key4', 'value4');

      const stats = cacheManager.getStats();
      expect(stats.test).toBe(3);

      // Oldest entry should be evicted
      expect(cacheManager.get<string>('test', 'key1')).toBeUndefined();
      expect(cacheManager.get<string>('test', 'key4')).toBe('value4');
    });

    it('should not evict when updating existing key', () => {
      cacheManager = new CacheManager({ maxSize: 2, cleanupInterval: 100000 });

      cacheManager.set('test', 'key1', 'value1');
      cacheManager.set('test', 'key2', 'value2');
      cacheManager.set('test', 'key1', 'updated'); // Update existing

      const stats = cacheManager.getStats();
      expect(stats.test).toBe(2);
      expect(cacheManager.get<string>('test', 'key1')).toBe('updated');
      expect(cacheManager.get<string>('test', 'key2')).toBe('value2');
    });
  });

  describe('dispose', () => {
    it('should clear all caches on dispose', () => {
      cacheManager = new CacheManager();
      cacheManager.set('test', 'key1', 'value1');

      cacheManager.dispose();

      const stats = cacheManager.getStats();
      expect(Object.keys(stats).length).toBe(0);
    });

    it('should be safe to call dispose multiple times', () => {
      cacheManager = new CacheManager();
      cacheManager.dispose();
      expect(() => cacheManager.dispose()).not.toThrow();
    });

    it('should stop cleanup timer on dispose', () => {
      cacheManager = new CacheManager({ cleanupInterval: 10 });
      cacheManager.dispose();

      // Should not throw or cause issues
      expect(cacheManager.getStats()).toEqual({});
    });
  });
});
