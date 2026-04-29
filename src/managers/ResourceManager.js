import { EventTypes } from '../ecs/events/EventTypes.js';
import { ObjectPool } from './components/ObjectPool.js';
import { ResourceCache } from './components/ResourceCache.js';
import { ResourceMonitor } from './components/ResourceMonitor.js';

/**
 * Manages game resources and memory optimization.
 *
 * This class coordinates resource management through specialized components:
 * - ObjectPool: Pooling for frequently created/destroyed objects
 * - ResourceCache: Caching resources with size limits
 * - ResourceMonitor: Tracking memory usage and performance
 */
export class ResourceManager {
  constructor() {
    // Initialize components
    this.objectPool = new ObjectPool();
    this.resourceCache = new ResourceCache();
    this.resourceMonitor = new ResourceMonitor();
    
    // Event system reference (to be set via setEventSystem)
    this.eventSystem = null;
  }

  /**
   * Set the event system for resource notifications
   * @param {EventSystem} eventSystem - The event system to use
   */
  setEventSystem(eventSystem) {
    this.eventSystem = eventSystem;
    this.resourceMonitor.setEventSystem(eventSystem);
  }

  /**
   * Get an object from a pool
   * @param {string} type - Object type
   * @param {Object} params - Object parameters
   * @returns {Object} Pooled object
   */
  getFromPool(type, params) {
    const object = this.objectPool.getFromPool(type, params);
    this.resourceMonitor.trackAllocation(type);
    return object;
  }

  /**
   * Return an object to its pool
   * @param {string} type - Object type
   * @param {Object} obj - Object to return
   */
  returnToPool(type, obj) {
    this.objectPool.returnToPool(type, obj);
    this.resourceMonitor.trackDeallocation(type);
  }

  /**
   * Cache a resource
   * @param {string} type - Resource type
   * @param {string} key - Resource key
   * @param {*} resource - Resource to cache
   */
  cacheResource(type, key, resource) {
    this.resourceCache.cacheResource(type, key, resource);
    this.resourceMonitor.trackCacheUpdate(type);
  }

  /**
   * Get a cached resource
   * @param {string} type - Resource type
   * @param {string} key - Resource key
   * @returns {*} Cached resource
   */
  getCachedResource(type, key) {
    const resource = this.resourceCache.getCachedResource(type, key);
    // If resource is missing, notify monitor for potential preloading strategies
    if (!resource) {
      this.resourceMonitor.trackCacheMiss(type, key);
    }
    return resource;
  }

  /**
   * Get resource usage statistics
   * @returns {Object} Resource stats
   */
  getStats() {
    return {
      poolStats: this.objectPool.getStats(),
      cacheStats: this.resourceCache.getStats(),
      memoryStats: this.resourceMonitor.getMemoryStats()
    };
  }

  /**
   * Update the resource manager
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Check if cleanup is needed
    if (this.resourceMonitor.shouldPerformCleanup()) {
      this.clearInactive();
    }
    
    // Update the resource monitor
    this.resourceMonitor.update(deltaTime);
  }

  /**
   * Enable or disable debug mode
   * @param {boolean} enabled - Whether debug mode is enabled
   */
  setDebugEnabled(enabled) {
    this.resourceMonitor.setDebugEnabled(enabled);
  }

  /**
   * Check if debug mode is enabled
   * @returns {boolean} Whether debug mode is enabled
   */
  isDebugEnabled() {
    return this.resourceMonitor.isDebugEnabled();
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    // Clean up all pools
    this.objectPool.dispose();
    
    // Clean up all caches
    this.resourceCache.dispose();
    
    // Reset the resource monitor
    this.resourceMonitor.reset();
    
    // Emit event about resource cleanup
    if (this.eventSystem) {
      this.eventSystem.emit(EventTypes.RESOURCES_DISPOSED, {
        timestamp: performance.now()
      });
    }
  }

  /**
   * Clear inactive objects from pools
   */
  clearInactive() {
    this.objectPool.clearInactive();
    this.resourceCache.clearOldCaches();
    
    // Notify that cleanup occurred
    if (this.eventSystem) {
      this.eventSystem.emit(EventTypes.RESOURCES_CLEANED, {
        stats: this.getStats()
      });
    }
  }
}
