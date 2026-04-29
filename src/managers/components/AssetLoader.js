/**
 * Handles asset loading operations and manages load queue.
 */
export class AssetLoader {
  #loadingPromises = new Map();
  #loadingQueue = [];
  #isProcessing = false;
  #maxConcurrentLoads;
  #typeRegistry;
  #assetCache;
  #eventSystem;

  constructor(typeRegistry, assetCache, maxConcurrentLoads = 4) {
    this.#typeRegistry = typeRegistry;
    this.#assetCache = assetCache;
    this.#maxConcurrentLoads = maxConcurrentLoads;
  }

  /**
   * Set the event system for asset loading events
   * @param {EventSystem} eventSystem - The event system to use
   * @returns {AssetLoader} This loader for chaining
   */
  setEventSystem(eventSystem) {
    if (!eventSystem || typeof eventSystem.emit !== 'function') {
      console.warn('AssetLoader: Invalid event system provided');
      return this;
    }
    this.#eventSystem = eventSystem;
    return this;
  }

  /**
   * Load a single asset
   * @param {string} url - Asset URL
   * @param {Object} options - Loading options
   * @returns {Promise<*>} Loaded asset
   */
  async loadAsset(url, options = {}) {
    // Default type from URL extension if not provided
    const type = options.type || this.#typeRegistry.getTypeFromUrl(url);
    const priority = options.priority || 'normal';
    const cache = options.cache !== false; // Default to true

    // Check if asset is already loaded
    if (this.#assetCache.hasAsset(url)) {
      return this.#assetCache.getAsset(url);
    }

    // Check if asset is currently loading
    if (this.#loadingPromises.has(url)) {
      return this.#loadingPromises.get(url);
    }

    // Create loading promise
    const loadPromise = this.#loadAssetWithType(url, type, cache);
    this.#loadingPromises.set(url, loadPromise);

    // Add to loading queue if priority is not immediate
    if (priority !== 'immediate') {
      this.#loadingQueue.push({ url, promise: loadPromise, priority });
      this.#processLoadingQueue();
    }

    return loadPromise;
  }

  /**
   * Load multiple assets in parallel
   * @param {Array<string>} urls - Asset URLs
   * @param {Object} options - Loading options
   * @returns {Promise<Map<string, *>>} Loaded assets
   */
  async loadAssets(urls, options = {}) {
    const results = new Map();
    const promises = urls.map(url =>
      this.loadAsset(url, options)
        .then(asset => results.set(url, asset))
        .catch(error => {
          console.error(`Failed to load asset: ${url}`, error);
          results.set(url, null);
        })
    );

    await Promise.all(promises);
    return results;
  }

  /**
   * Load assets defined in a manifest file
   * @param {string} manifestUrl - URL of manifest file (JSON)
   * @returns {Promise<Map<string, *>>} Loaded assets
   */
  async loadManifest(manifestUrl) {
    const manifest = await this.loadAsset(manifestUrl, { type: 'json' });
    return this.loadAssets(Object.keys(manifest));
  }

  /**
   * Load asset with specific type
   * @private
   * @param {string} url - Asset URL
   * @param {string} type - Asset type
   * @param {boolean} cache - Whether to cache the asset
   * @returns {Promise<*>} Loaded asset
   */
  async #loadAssetWithType(url, type, cache) {
    try {
      const assetType = this.#typeRegistry.getTypeHandler(type);
      const asset = await assetType.load(url);

      if (cache) {
        this.#assetCache.cacheAsset(url, asset);
      }

      // Clean up after successful load
      this.#loadingPromises.delete(url);

      // Emit loading complete event if event system exists
      if (this.#eventSystem) {
        this.#eventSystem.emit('asset:loadComplete', { 
          url, 
          type, 
          progress: this.getLoadingProgress() 
        });
      }

      return asset;
    } catch (error) {
      this.#loadingPromises.delete(url);

      // Emit loading error event if event system exists
      if (this.#eventSystem) {
        this.#eventSystem.emit('asset:loadError', { 
          url, 
          error, 
          progress: this.getLoadingProgress() 
        });
      }

      throw error;
    }
  }

  /**
   * Process loading queue
   * @private
   */
  async #processLoadingQueue() {
    if (this.#isProcessing || this.#loadingQueue.length === 0) return;

    this.#isProcessing = true;

    // Sort queue by priority
    this.#loadingQueue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Process up to maxConcurrentLoads items
    const batch = this.#loadingQueue.splice(0, this.#maxConcurrentLoads);
    await Promise.all(batch.map(item => item.promise));

    this.#isProcessing = false;

    // Process next batch if queue is not empty
    if (this.#loadingQueue.length > 0) {
      this.#processLoadingQueue();
    }
  }

  /**
   * Check if asset is currently loading
   * @param {string} url - Asset URL
   * @returns {boolean} Whether asset is loading
   */
  isLoading(url) {
    return this.#loadingPromises.has(url);
  }

  /**
   * Get loading progress information
   * @returns {Object} Loading progress information
   */
  getLoadingProgress() {
    const total = this.#loadingQueue.length + this.#loadingPromises.size;
    const loaded = this.#assetCache.getSize();
    const loading = this.#loadingPromises.size;
    const queued = this.#loadingQueue.length;

    return {
      total,
      loaded,
      loading,
      queued,
      progress: total > 0 ? (loaded / total) * 100 : 100,
    };
  }

  /**
   * Set maximum concurrent loads
   * @param {number} maxLoads - Maximum concurrent loads
   */
  setMaxConcurrentLoads(maxLoads) {
    this.#maxConcurrentLoads = maxLoads;
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.#loadingPromises.clear();
    this.#loadingQueue = [];
    this.#isProcessing = false;
  }
} 