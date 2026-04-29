export class ResourceCache {
  constructor(maxCacheSize = 100) {
    this.caches = new Map();
    this.maxCacheSize = maxCacheSize;
    this.stats = new Map();
  }

  cacheResource(type, key, resource) {
    if (!this.caches.has(type)) {
      this.caches.set(type, new Map());
    }

    const cache = this.caches.get(type);
    if (cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    cache.set(key, resource);
    this.updateStats(type, 'cache');
  }

  getCachedResource(type, key) {
    const cache = this.caches.get(type);
    if (cache && cache.has(key)) {
      this.updateStats(type, 'hit');
      return cache.get(key);
    }
    this.updateStats(type, 'miss');
    return null;
  }

  updateStats(type, action) {
    if (!this.stats.has(type)) {
      this.stats.set(type, {
        hits: 0,
        misses: 0,
        cacheSize: 0,
      });
    }

    const stats = this.stats.get(type);
    switch (action) {
      case 'hit':
        stats.hits++;
        break;
      case 'miss':
        stats.misses++;
        break;
      case 'cache':
        stats.cacheSize = this.caches.get(type)?.size ?? 0;
        break;
    }
  }

  getStats() {
    return Object.fromEntries(this.stats);
  }

  clearOldCaches() {
    for (const [type, cache] of this.caches.entries()) {
      if (cache.size > this.maxCacheSize / 2) {
        const entriesToKeep = Array.from(cache.entries()).slice(-this.maxCacheSize / 2);
        cache.clear();
        entriesToKeep.forEach(([key, value]) => cache.set(key, value));
      }
    }
  }

  dispose() {
    this.caches.clear();
    this.stats.clear();
  }
} 