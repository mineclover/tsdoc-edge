/**
 * LSP Cache Manager
 *
 * Provides TTL-based caching with automatic cleanup and size limits
 * to prevent memory leaks in long-running LSP server processes.
 *
 * @packageDocumentation
 * @module lsp/cache-manager
 * @internal

 * @doc [[cache-manager]] */

/**
 * Cache entry with TTL tracking
 * @internal
 */
export interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Unix timestamp when the entry was created */
  timestamp: number;
}

/**
 * Configuration options for CacheManager
 * @internal
 */
export interface CacheManagerOptions {
  /** Time-to-live in milliseconds (default: 5000) */
  ttl?: number;
  /** Maximum entries per cache (default: 500) */
  maxSize?: number;
  /** Cleanup interval in milliseconds (default: 30000) */
  cleanupInterval?: number;
}

/**
 * Generic TTL-based cache manager with automatic cleanup
 *
 * Features:
 * - TTL-based expiration
 * - Maximum size enforcement (LRU eviction)
 * - Periodic automatic cleanup
 * - Multiple named caches
 *
 * @example
 * ```typescript
 * const cacheManager = new CacheManager({ ttl: 5000, maxSize: 100 });
 * cacheManager.createCache<string>('symbols');
 * cacheManager.set('symbols', 'key1', 'value1');
 * const value = cacheManager.get('symbols', 'key1');
 * cacheManager.dispose();
 * ```
 *
 * @internal
 */
export class CacheManager {
  /** Time-to-live in milliseconds */
  private readonly ttl: number;

  /** Maximum entries per cache */
  private readonly maxSize: number;

  /** Cleanup interval in milliseconds */
  private readonly cleanupInterval: number;

  /** Named caches */
  private readonly caches = new Map<string, Map<string, CacheEntry<unknown>>>();

  /** Cleanup timer reference */
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  /** Track if manager is disposed */
  private disposed = false;

  /** Last activity timestamp for idle detection */
  private lastActivityTime: number = Date.now();

  /** Track if cleanup already ran since last activity */
  private cleanedSinceLastActivity = false;

  /**
   * Creates a new CacheManager instance
   *
   * @param options - Configuration options
   */
  constructor(options: CacheManagerOptions = {}) {
    this.ttl = options.ttl ?? 5000;
    this.maxSize = options.maxSize ?? 500;
    this.cleanupInterval = options.cleanupInterval ?? 30000;

    this.startCleanupTimer();
  }

  /**
   * Create a new named cache
   *
   * @param name - Unique cache name
   * @returns void - No return value
   */
  createCache<T>(name: string): void {
    if (!this.caches.has(name)) {
      this.caches.set(name, new Map<string, CacheEntry<T>>());
    }
  }

  /**
   * Get a value from cache
   *
   * @param cacheName - Name of the cache
   * @param key - Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get<T>(cacheName: string, key: string): T | undefined {
    const cache = this.caches.get(cacheName);
    if (!cache) return undefined;

    const entry = cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;

    // Check TTL
    const now = Date.now();
    if (now - entry.timestamp >= this.ttl) {
      cache.delete(key);
      return undefined;
    }

    // Track activity
    this.lastActivityTime = now;
    this.cleanedSinceLastActivity = false;

    return entry.value;
  }

  /**
   * Set a value in cache
   *
   * @param cacheName - Name of the cache
   * @param key - Cache key
   * @param value - Value to cache
   * @returns void - No return value
   */
  set<T>(cacheName: string, key: string, value: T): void {
    let cache = this.caches.get(cacheName);
    if (!cache) {
      cache = new Map<string, CacheEntry<unknown>>();
      this.caches.set(cacheName, cache);
    }

    // Enforce size limit before adding
    if (cache.size >= this.maxSize && !cache.has(key)) {
      this.evictOldest(cache);
    }

    const now = Date.now();
    cache.set(key, {
      value,
      timestamp: now,
    });

    // Track activity
    this.lastActivityTime = now;
    this.cleanedSinceLastActivity = false;
  }

  /**
   * Check if a key exists and is valid in cache
   *
   * @param cacheName - Name of the cache
   * @param key - Cache key
   * @returns True if entry exists and is within TTL
   */
  has(cacheName: string, key: string): boolean {
    return this.get(cacheName, key) !== undefined;
  }

  /**
   * Delete a specific entry from cache
   *
   * @param cacheName - Name of the cache
   * @param key - Cache key
   * @returns void - No return value
   */
  delete(cacheName: string, key: string): void {
    const cache = this.caches.get(cacheName);
    if (cache) {
      cache.delete(key);
    }
  }

  /**
   * Delete entries matching a predicate
   *
   * @param cacheName - Name of the cache
   * @param predicate - Function that returns true for keys to delete
   * @returns void - No return value
   */
  deleteMatching(cacheName: string, predicate: (key: string) => boolean): void {
    const cache = this.caches.get(cacheName);
    if (!cache) return;

    for (const key of cache.keys()) {
      if (predicate(key)) {
        cache.delete(key);
      }
    }
  }

  /**
   * Clear a specific cache
   *
   * @param cacheName - Name of the cache to clear
   * @returns void - No return value
   */
  clearCache(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    if (cache) {
      cache.clear();
    }
  }

  /**
   * Clear all caches
   * @returns void - No return value
   */
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Object with cache sizes
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.size;
    }
    return stats;
  }

  /**
   * Dispose the cache manager and release all resources
   * @returns void - No return value
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Clear all caches
    this.clearAll();
    this.caches.clear();
  }

  /**
   * Start the periodic cleanup timer
   * @internal
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.cleanupInterval);

    // Prevent timer from keeping process alive
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Clean up expired entries from all caches
   * @internal
   */
  private cleanupExpired(): void {
    if (this.disposed) return;

    // Skip cleanup if already cleaned since last activity (idle detection)
    if (this.cleanedSinceLastActivity) {
      return;
    }

    const now = Date.now();

    for (const cache of this.caches.values()) {
      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp >= this.ttl) {
          cache.delete(key);
        }
      }

      // Enforce size limit after cleanup
      if (cache.size > this.maxSize) {
        this.evictOldest(cache, cache.size - this.maxSize);
      }
    }

    // Mark as cleaned until next activity
    this.cleanedSinceLastActivity = true;
  }

  /**
   * Evict oldest entries from a cache using O(n) linear scan
   * (avoids O(n log n) sort overhead)
   * @internal
   */
  private evictOldest(cache: Map<string, CacheEntry<unknown>>, count: number = 1): void {
    if (cache.size === 0 || count <= 0) return;

    // For single eviction, use simple linear scan to find minimum
    if (count === 1) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [key, entry] of cache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        cache.delete(oldestKey);
      }
      return;
    }

    // For multiple evictions, collect timestamps and use partial selection
    // Still O(n) - single pass to collect, then k deletions
    const entries: Array<[string, number]> = [];
    for (const [key, entry] of cache.entries()) {
      entries.push([key, entry.timestamp]);
    }

    // Sort only if we need multiple evictions (rare case during cleanup)
    entries.sort((a, b) => a[1] - b[1]);

    const deleteCount = Math.min(count, entries.length);
    for (let i = 0; i < deleteCount; i++) {
      cache.delete(entries[i][0]);
    }
  }
}
