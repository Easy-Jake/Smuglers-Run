import { EventTypes } from '../../ecs/events/EventTypes.js';

/**
 * Responsible for monitoring resource usage and performance
 */
export class ResourceMonitor {
  /**
   * Create a new resource monitor
   */
  constructor() {
    // Memory usage tracking
    this.memoryUsage = {
      current: 0,
      peak: 0,
      threshold: 500, // 500MB default
    };
    
    // Resource allocation stats
    this.allocationStats = new Map();
    
    // Cache usage stats
    this.cacheStats = new Map();
    
    // Debug settings
    this.debug = false;
    
    // Cleanup control
    this.lastCleanupTime = 0;
    this.cleanupInterval = 60000; // 1 minute
    
    // Event system reference
    this.eventSystem = null;
  }

  /**
   * Set the event system for notifications
   * @param {EventSystem} eventSystem - The event system to use
   */
  setEventSystem(eventSystem) {
    this.eventSystem = eventSystem;
  }

  /**
   * Track object allocation
   * @param {string} type - The type of object allocated
   */
  trackAllocation(type) {
    if (!this.allocationStats.has(type)) {
      this.allocationStats.set(type, {
        allocations: 0,
        deallocations: 0,
        active: 0
      });
    }
    
    const stats = this.allocationStats.get(type);
    stats.allocations++;
    stats.active++;
    
    if (this.debug) {
      console.log(`Allocated object of type: ${type}, active: ${stats.active}`);
    }
  }

  /**
   * Track object deallocation
   * @param {string} type - The type of object deallocated
   */
  trackDeallocation(type) {
    if (!this.allocationStats.has(type)) {
      this.allocationStats.set(type, {
        allocations: 0,
        deallocations: 0,
        active: 0
      });
    }
    
    const stats = this.allocationStats.get(type);
    stats.deallocations++;
    stats.active = Math.max(0, stats.active - 1);
    
    if (this.debug) {
      console.log(`Deallocated object of type: ${type}, active: ${stats.active}`);
    }
  }

  /**
   * Track cache update
   * @param {string} type - The type of cache updated
   */
  trackCacheUpdate(type) {
    if (!this.cacheStats.has(type)) {
      this.cacheStats.set(type, {
        hits: 0,
        misses: 0,
        updates: 0
      });
    }
    
    this.cacheStats.get(type).updates++;
  }

  /**
   * Track cache miss
   * @param {string} type - The cache type
   * @param {string} key - The cache key that was missed
   */
  trackCacheMiss(type, key) {
    if (!this.cacheStats.has(type)) {
      this.cacheStats.set(type, {
        hits: 0,
        misses: 0,
        updates: 0
      });
    }
    
    this.cacheStats.get(type).misses++;
    
    // Emit event for cache miss to potentially trigger preloading
    if (this.eventSystem) {
      this.eventSystem.emit(EventTypes.RESOURCE_CACHE_MISS, {
        type,
        key,
        timestamp: performance.now()
      });
    }
  }

  /**
   * Update memory usage data
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Update memory usage if available
    this.updateMemoryUsage();
    
    // Emit periodic stats if debug is enabled
    if (this.debug && this.eventSystem && deltaTime % 5000 < 16) {
      this.eventSystem.emit(EventTypes.RESOURCE_STATS_UPDATED, {
        memoryStats: this.getMemoryStats(),
        allocationStats: this.getAllocationStats(),
        cacheStats: this.getCacheStats(),
        timestamp: performance.now()
      });
    }
  }

  /**
   * Update memory usage statistics
   * @private
   */
  updateMemoryUsage() {
    // Check if performance.memory is available (Chrome only)
    if (typeof performance !== 'undefined' && performance.memory) {
      this.memoryUsage.current = performance.memory.usedJSHeapSize / (1024 * 1024);
      this.memoryUsage.peak = Math.max(this.memoryUsage.peak, this.memoryUsage.current);
    }
  }

  /**
   * Check if cleanup should be performed
   * @returns {boolean} Whether cleanup should be performed
   */
  shouldPerformCleanup() {
    const currentTime = performance.now();
    
    // Check time-based cleanup
    if (currentTime - this.lastCleanupTime > this.cleanupInterval) {
      this.lastCleanupTime = currentTime;
      return true;
    }
    
    // Check memory-based cleanup
    if (this.memoryUsage.current > this.memoryUsage.threshold) {
      this.lastCleanupTime = currentTime;
      return true;
    }
    
    return false;
  }

  /**
   * Set debug mode
   * @param {boolean} enabled - Whether debug mode is enabled
   */
  setDebugEnabled(enabled) {
    this.debug = enabled;
  }

  /**
   * Check if debug mode is enabled
   * @returns {boolean} Whether debug mode is enabled
   */
  isDebugEnabled() {
    return this.debug;
  }

  /**
   * Get memory usage statistics
   * @returns {Object} Memory usage stats
   */
  getMemoryStats() {
    return {
      current: this.memoryUsage.current.toFixed(2),
      peak: this.memoryUsage.peak.toFixed(2),
      threshold: this.memoryUsage.threshold,
      percentUsed: (this.memoryUsage.current / this.memoryUsage.threshold * 100).toFixed(2)
    };
  }

  /**
   * Get allocation statistics
   * @returns {Object} Allocation stats
   */
  getAllocationStats() {
    const result = {};
    for (const [type, stats] of this.allocationStats.entries()) {
      result[type] = { ...stats };
    }
    return result;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    const result = {};
    for (const [type, stats] of this.cacheStats.entries()) {
      result[type] = { ...stats };
    }
    return result;
  }

  /**
   * Reset all statistics
   */
  reset() {
    this.allocationStats.clear();
    this.cacheStats.clear();
    this.memoryUsage.current = 0;
    this.memoryUsage.peak = 0;
    this.lastCleanupTime = 0;
  }
} 