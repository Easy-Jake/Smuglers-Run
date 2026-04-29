import { QuadTree } from '../utils/QuadTree.js';
import { PerformanceLogger } from '../utils/PerformanceLogger.js';
import { SpatialPartitioning } from './components/SpatialPartitioning.js';
import { CollisionDetector } from './components/CollisionDetector.js';
import { CollisionPerformance } from './components/CollisionPerformance.js';

export class CollisionManager {
  constructor(worldSize) {
    this.worldSize = worldSize;
    
    // Initialize components
    this.spatialPartitioning = new SpatialPartitioning(worldSize);
    this.collisionDetector = new CollisionDetector();
    this.collisionPerformance = new CollisionPerformance();
  }

  /**
   * Update the collision detection system
   * @param {Object} gameState - The current game state
   */
  update(gameState) {
    // Update timing metrics
    const startTime = performance.now();
    
    // Update spatial partitioning
    this.spatialPartitioning.clear();
    this.spatialPartitioning.insertObjects(gameState);
    
    // Update performance metrics
    this.collisionPerformance.updateMetrics();
    
    return performance.now() - startTime;
  }

  /**
   * Check for collisions between an object and other objects in the game
   * @param {Object} object - The object to check for collisions
   * @returns {Object[]} Array of objects that collide with the given object
   */
  checkCollisions(object) {
    // Get potential collisions from spatial partitioning
    const potentialCollisions = this.spatialPartitioning.retrievePotentialCollisions(object);
    
    // Detect actual collisions
    const collisions = this.collisionDetector.detectCollisions(
      object, 
      potentialCollisions,
      this.collisionPerformance
    );
    
    return collisions;
  }

  /**
   * Check collision between two specific entities
   * @param {Object} a - First entity
   * @param {Object} b - Second entity
   * @returns {boolean} Whether the two entities collide
   */
  checkCollision(a, b) {
    return this.collisionDetector.detectCollision(a, b);
  }

  /**
   * Start performance logging
   */
  startLogging() {
    this.collisionPerformance.startLogging();
  }

  /**
   * Stop performance logging
   */
  stopLogging() {
    this.collisionPerformance.stopLogging();
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    return this.collisionPerformance.getMetrics();
  }

  /**
   * Draw the spatial partitioning structure for debugging
   * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on
   * @param {number} scale - The scale factor for the visualization
   */
  draw(ctx, scale = 1) {
    this.spatialPartitioning.draw(ctx, scale);
  }

  /**
   * Get debug information about the collision system
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      ...this.spatialPartitioning.getDebugInfo(),
      performance: this.collisionPerformance.getDebugInfo()
    };
  }
}
