import { QuadTree } from '../../utils/QuadTree.js';

/**
 * Responsible for spatial partitioning of game objects for efficient collision detection
 */
export class SpatialPartitioning {
  /**
   * Create a new spatial partitioning system
   * @param {number} worldSize - The size of the game world
   */
  constructor(worldSize) {
    this.worldSize = worldSize;
    
    // Initialize quadtree
    this.quadTree = new QuadTree({
      x: 0,
      y: 0,
      width: worldSize,
      height: worldSize,
    });
  }

  /**
   * Clear the spatial partitioning structure
   */
  clear() {
    this.quadTree.clear();
  }

  /**
   * Insert objects from the game state into the spatial partitioning structure
   * @param {Object} gameState - The current game state
   */
  insertObjects(gameState) {
    if (!gameState) {
      console.warn('SpatialPartitioning: No gameState provided');
      return;
    }

    try {
      // Insert player if it exists
      if (gameState.player && this.isValidGameObject(gameState.player)) {
        this.quadTree.insert(gameState.player);
      }

      // Insert asteroids if they exist
      if (gameState.asteroids && Array.isArray(gameState.asteroids)) {
        gameState.asteroids.forEach(asteroid => {
          if (this.isValidGameObject(asteroid)) {
            this.quadTree.insert(asteroid);
          }
        });
      }

      // Insert enemies if they exist
      if (gameState.enemies && Array.isArray(gameState.enemies)) {
        gameState.enemies.forEach(enemy => {
          if (this.isValidGameObject(enemy)) {
            this.quadTree.insert(enemy);
          }
        });
      }

      // Insert cargo if it exists
      if (gameState.cargo && Array.isArray(gameState.cargo)) {
        gameState.cargo.forEach(cargo => {
          if (this.isValidGameObject(cargo)) {
            this.quadTree.insert(cargo);
          }
        });
      }

      // Insert projectiles if they exist
      if (gameState.projectiles && Array.isArray(gameState.projectiles)) {
        gameState.projectiles.forEach(projectile => {
          if (this.isValidGameObject(projectile)) {
            this.quadTree.insert(projectile);
          }
        });
      }

      // Insert stations if they exist
      if (gameState.stations && Array.isArray(gameState.stations)) {
        gameState.stations.forEach(station => {
          if (this.isValidGameObject(station)) {
            this.quadTree.insert(station);
          }
        });
      }
    } catch (error) {
      console.error('SpatialPartitioning: Error inserting objects', error);
    }
  }

  /**
   * Check if an object has valid position and size for insertion into the quadtree
   * @private
   * @param {Object} obj - The object to check
   * @returns {boolean} Whether the object is valid
   */
  isValidGameObject(obj) {
    return obj && 
           typeof obj === 'object' && 
           typeof obj.x === 'number' && 
           typeof obj.y === 'number' && 
           (typeof obj.width === 'number' || typeof obj.radius === 'number') &&
           (typeof obj.height === 'number' || typeof obj.radius === 'number');
  }

  /**
   * Retrieve potential collision candidates for an object
   * @param {Object} object - The object to check collisions for
   * @returns {Array} Array of potential collision candidates
   */
  retrievePotentialCollisions(object) {
    return this.quadTree.retrieve(object);
  }

  /**
   * Draw the quadtree structure for debugging
   * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on
   * @param {number} scale - The scale factor for the visualization
   */
  draw(ctx, scale = 1) {
    this.quadTree.draw(ctx, scale);
  }

  /**
   * Get debug information about the quadtree
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      totalObjects: this.quadTree.getTotalObjects(),
      totalNodes: this.quadTree.getTotalNodes(),
      objectsPerNode: this.quadTree.getObjectsPerNode(),
      maxDepth: this.quadTree.getMaxDepth(),
    };
  }
} 