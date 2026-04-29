/**
 * Manages caching of loaded assets with size limits and management functions.
 */
export class AssetCache {
  #assets = new Map();
  #maxCacheSize;

  constructor(maxCacheSize = 100) {
    this.#maxCacheSize = maxCacheSize;
  }

  /**
   * Cache an asset
   * @param {string} url - Asset URL
   * @param {*} asset - Asset to cache
   */
  cacheAsset(url, asset) {
    // Remove oldest asset if cache is full
    if (this.#assets.size >= this.#maxCacheSize) {
      const oldestUrl = this.#assets.keys().next().value;
      this.#assets.delete(oldestUrl);
    }

    this.#assets.set(url, asset);
  }

  /**
   * Get cached asset
   * @param {string} url - Asset URL
   * @returns {*} Cached asset
   */
  getAsset(url) {
    return this.#assets.get(url);
  }

  /**
   * Check if asset is cached
   * @param {string} url - Asset URL
   * @returns {boolean} Whether asset is cached
   */
  hasAsset(url) {
    return this.#assets.has(url);
  }

  /**
   * Unload asset from cache
   * @param {string} url - Asset URL
   */
  removeAsset(url) {
    this.#assets.delete(url);
  }

  /**
   * Clear asset cache
   */
  clear() {
    this.#assets.clear();
  }

  /**
   * Get number of cached assets
   * @returns {number} Number of cached assets
   */
  getSize() {
    return this.#assets.size;
  }

  /**
   * Get maximum cache size
   * @returns {number} Maximum cache size
   */
  getMaxSize() {
    return this.#maxCacheSize;
  }

  /**
   * Set maximum cache size
   * @param {number} size - New maximum cache size
   */
  setMaxSize(size) {
    this.#maxCacheSize = size;
    
    // If current cache is over new size, remove oldest assets
    while (this.#assets.size > this.#maxCacheSize) {
      const oldestUrl = this.#assets.keys().next().value;
      this.#assets.delete(oldestUrl);
    }
  }

  /**
   * Get all cached asset URLs
   * @returns {Array<string>} Array of cached asset URLs
   */
  getCachedUrls() {
    return Array.from(this.#assets.keys());
  }
} 