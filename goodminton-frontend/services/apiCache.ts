/**
 * Simple cache entry interface
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * API Cache utility to prevent redundant API calls
 * Stores responses with timestamps and invalidates after TTL expires
 */
class APICache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 30000; // 30 seconds default

  /**
   * Get cached data if it exists and hasn't expired
   * @param key - Cache key
   * @param ttl - Time to live in milliseconds (optional, uses default if not provided)
   * @returns Cached data or null if expired/missing
   */
  get<T>(key: string, ttl?: number): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const timeToLive = ttl ?? this.defaultTTL;
    const isExpired = Date.now() - entry.timestamp > timeToLive;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store data in cache with current timestamp
   * @param key - Cache key
   * @param data - Data to cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Manually invalidate a cache entry
   * @param key - Cache key to invalidate
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }
}

export const apiCache = new APICache();

