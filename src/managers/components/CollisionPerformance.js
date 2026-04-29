import { PerformanceLogger } from '../../utils/PerformanceLogger.js';

/**
 * Responsible for tracking performance metrics of the collision system
 */
export class CollisionPerformance {
  /**
   * Create a new collision performance tracker
   */
  constructor() {
    // Performance metrics
    this.metrics = {
      totalChecks: 0,
      totalCollisions: 0,
      averageChecksPerFrame: 0,
      averageCollisionsPerFrame: 0,
      frameCount: 0,
      lastReset: performance.now(),
      insertTime: 0,
      queryTime: 0,
      collisionTime: 0,
    };
    
    // Initialize performance logger
    this.performanceLogger = new PerformanceLogger({
      logInterval: 300000, // 5 minutes
      maxLogSize: 10 * 1024 * 1024, // 10MB
    });
  }

  /**
   * Update performance metrics
   */
  updateMetrics() {
    // Reset metrics every second
    if (performance.now() - this.metrics.lastReset > 1000) {
      this.metrics.averageChecksPerFrame = this.metrics.totalChecks / this.metrics.frameCount;
      this.metrics.averageCollisionsPerFrame = 
        this.metrics.totalCollisions / this.metrics.frameCount;
      
      // Log performance metrics
      this.performanceLogger.addMetrics({
        ...this.metrics,
        timestamp: performance.now(),
      });
      
      // Reset counters
      this.metrics.totalChecks = 0;
      this.metrics.totalCollisions = 0;
      this.metrics.frameCount = 0;
      this.metrics.lastReset = performance.now();
    }
    
    this.metrics.frameCount++;
  }

  /**
   * Increment the collision check counter
   */
  incrementChecks() {
    this.metrics.totalChecks++;
  }

  /**
   * Increment the collision detection counter
   */
  incrementCollisions() {
    this.metrics.totalCollisions++;
  }

  /**
   * Set the query time for spatial partitioning
   * @param {number} time - Time in milliseconds
   */
  setQueryTime(time) {
    this.metrics.queryTime = time;
  }

  /**
   * Set the collision detection time
   * @param {number} time - Time in milliseconds
   */
  setCollisionTime(time) {
    this.metrics.collisionTime = time;
  }

  /**
   * Set the insertion time for spatial partitioning
   * @param {number} time - Time in milliseconds
   */
  setInsertTime(time) {
    this.metrics.insertTime = time;
  }

  /**
   * Start performance logging
   */
  startLogging() {
    this.performanceLogger.start();
  }

  /**
   * Stop performance logging
   */
  stopLogging() {
    this.performanceLogger.stop();
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      totalTime: this.metrics.insertTime + this.metrics.queryTime + this.metrics.collisionTime,
    };
  }

  /**
   * Get debug information about performance
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    const metrics = this.getMetrics();
    return {
      insertTime: metrics.insertTime.toFixed(2),
      queryTime: metrics.queryTime.toFixed(2),
      collisionTime: metrics.collisionTime.toFixed(2),
      totalTime: metrics.totalTime.toFixed(2),
      averageChecksPerFrame: metrics.averageChecksPerFrame.toFixed(2),
      averageCollisionsPerFrame: metrics.averageCollisionsPerFrame.toFixed(2),
    };
  }
} 