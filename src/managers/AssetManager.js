import { AssetTypeRegistry } from './components/AssetTypeRegistry.js';
import { AssetCache } from './components/AssetCache.js';
import { AssetLoader } from './components/AssetLoader.js';

/**
 * Manages game asset loading, caching, and management.
 * Coordinates between AssetTypeRegistry, AssetLoader, and AssetCache components.
 */
export class AssetManager {
  #typeRegistry;
  #assetCache;
  #assetLoader;
  #stateManager;
  #eventSystem;
  #configManager;

  constructor(stateManager) {
    this.#stateManager = stateManager;
    this.#typeRegistry = new AssetTypeRegistry();
    this.#assetCache = new AssetCache(100); // Default cache size of 100
    this.#assetLoader = new AssetLoader(this.#typeRegistry, this.#assetCache, 4); // 4 concurrent loads
    this.#eventSystem = null;
    this.#configManager = null;
  }

  /**
   * Set the event system for asset loading events
   * @param {EventSystem} eventSystem - The event system to use
   * @returns {AssetManager} This manager for chaining
   */
  setEventSystem(eventSystem) {
    if (!eventSystem || typeof eventSystem.emit !== 'function') {
      console.warn('AssetManager: Invalid event system provided');
      return this;
    }
    this.#eventSystem = eventSystem;
    
    // Pass event system to components
    this.#assetLoader.setEventSystem(eventSystem);
    
    return this;
  }

  /**
   * Set the config manager for asset configuration
   * @param {ConfigManager} configManager - The config manager to use
   * @returns {AssetManager} This manager for chaining
   */
  setConfigManager(configManager) {
    if (!configManager) {
      console.warn('AssetManager: Invalid config manager provided');
      return this;
    }
    this.#configManager = configManager;
    
    // Update cache size if specified in config
    const cacheSize = configManager.get('assets.cacheSize', 100);
    this.setMaxCacheSize(cacheSize);
    
    // Update concurrent loads if specified in config
    const concurrentLoads = configManager.get('assets.concurrentLoads', 4);
    this.setMaxConcurrentLoads(concurrentLoads);
    
    return this;
  }

  /**
   * Load a single asset
   * @param {string} url - Asset URL
   * @param {Object} options - Loading options
   * @returns {Promise<*>} Loaded asset
   */
  async loadAsset(url, options = {}) {
    try {
      const asset = await this.#assetLoader.loadAsset(url, options);
      
      // Emit asset loaded event if event system is available
      if (this.#eventSystem) {
        this.#eventSystem.emit('asset:loaded', { url, type: options.type });
      }
      
      return asset;
    } catch (error) {
      // Emit asset error event if event system is available
      if (this.#eventSystem) {
        this.#eventSystem.emit('asset:error', { url, error });
      }
      
      throw error;
    }
  }

  /**
   * Load multiple assets
   * @param {Array<string>} urls - Asset URLs
   * @param {Object} options - Loading options
   * @returns {Promise<Map<string, *>>} Loaded assets
   */
  async loadAssets(urls, options = {}) {
    return this.#assetLoader.loadAssets(urls, options);
  }

  /**
   * Load assets from a manifest file
   * @param {string} manifestUrl - Manifest file URL
   * @returns {Promise<Map<string, *>>} Loaded assets
   */
  async loadManifest(manifestUrl) {
    return this.#assetLoader.loadManifest(manifestUrl);
  }

  /**
   * Get cached asset
   * @param {string} url - Asset URL
   * @returns {*} Cached asset
   */
  getAsset(url) {
    return this.#assetCache.getAsset(url);
  }

  /**
   * Check if asset is loaded
   * @param {string} url - Asset URL
   * @returns {boolean} Whether asset is loaded
   */
  isAssetLoaded(url) {
    return this.#assetCache.hasAsset(url);
  }

  /**
   * Check if asset is loading
   * @param {string} url - Asset URL
   * @returns {boolean} Whether asset is loading
   */
  isAssetLoading(url) {
    return this.#assetLoader.isLoading(url);
  }

  /**
   * Unload asset from cache
   * @param {string} url - Asset URL
   */
  unloadAsset(url) {
    this.#assetCache.removeAsset(url);
  }

  /**
   * Clear asset cache
   */
  clearCache() {
    this.#assetCache.clear();
  }

  /**
   * Get loading progress
   * @returns {Object} Loading progress information
   */
  getLoadingProgress() {
    return this.#assetLoader.getLoadingProgress();
  }

  /**
   * Register a new asset type
   * @param {string} type - Asset type
   * @param {Object} info - Asset type information
   */
  registerAssetType(type, info) {
    this.#typeRegistry.registerType(type, info);
  }

  /**
   * Set maximum cache size
   * @param {number} size - Maximum cache size
   */
  setMaxCacheSize(size) {
    this.#assetCache.setMaxSize(size);
  }

  /**
   * Set maximum concurrent loads
   * @param {number} count - Maximum concurrent loads
   */
  setMaxConcurrentLoads(count) {
    this.#assetLoader.setMaxConcurrentLoads(count);
  }

  /**
   * Get all loaded asset URLs
   * @returns {Array<string>} Array of loaded asset URLs
   */
  getLoadedAssets() {
    return this.#assetCache.getCachedUrls();
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.#assetLoader.dispose();
    this.#assetCache.clear();
  }
}
