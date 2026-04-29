import { System } from '../System.js';
import { getQuadrantIndex, markQuadrantAsExplored, getGameWorld } from '../../../js/config/gameConfig.js';

/**
 * System responsible for tracking player exploration of map quadrants 
 * and updating their exploration status
 */
export class QuadrantExplorationSystem extends System {
  /**
   * Create a new QuadrantExplorationSystem
   * @param {number} priority - System priority (lower runs first)
   * @param {Object} options - System options
   */
  constructor(priority = 50, options = {}) {
    super(priority);
    
    // Required components for entities to be processed by this system
    this.requireComponents(['TransformComponent']);
    
    // Exploration range (how far from the player position is considered "explored")
    this.explorationRange = options.explorationRange || 0;
    
    // Visible range modifier (multiplier for ship's sensor range)
    this.visibleRangeModifier = options.visibleRangeModifier || 1.0;
    
    // Track which quadrants have been processed to avoid duplicates
    this.processedQuadrants = new Set();
    
    // Clear processed quadrants periodically to prevent memory buildup in long game sessions
    this.clearInterval = options.clearInterval || 60; // Seconds
    this.timeSinceLastClear = 0;
    
    // Exploration stats
    this.totalQuadrants = 0;
    this.exploredQuadrants = 0;
    
    // Flag to track if system is initialized
    this.isInitialized = false;
  }

  /**
   * Initialize the system
   */
  initialize() {
    if (this.isInitialized) return;
    
    try {
      // Reset exploration tracking
      this.processedQuadrants.clear();
      
      // Get total number of quadrants (for stats)
      const gameWorld = getGameWorld();
      if (gameWorld && gameWorld.quadrants) {
        this.totalQuadrants = gameWorld.quadrants.length;
        
        // Count already explored quadrants (for stats)
        this.exploredQuadrants = gameWorld.quadrants.filter(q => q.explored).length;
      } else {
        console.warn('QuadrantExplorationSystem: Game world or quadrants not available');
        this.totalQuadrants = 0;
        this.exploredQuadrants = 0;
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('QuadrantExplorationSystem: Failed to initialize', error);
      this.isInitialized = false;
    }
  }

  /**
   * Process a single entity (typically the player)
   * @param {Entity} entity - Entity to process
   * @param {number} deltaTime - Time since last update in seconds
   */
  processEntity(entity, deltaTime) {
    if (!this.isInitialized) {
      this.initialize();
      if (!this.isInitialized) return; // Exit if still not initialized
    }
    
    // Update clear timer and clear processed quadrants if needed
    this.updateClearTimer(deltaTime);
    
    // Skip entities that are not players or player-controlled
    if (!entity.hasTag('player')) {
      return;
    }
    
    const transform = entity.getComponent('TransformComponent');
    if (!transform) return;
    
    const x = transform.position.x;
    const y = transform.position.y;
    
    // Get the quadrant index for the current position
    const quadrantIndex = getQuadrantIndex(x, y);
    if (quadrantIndex === -1) {
      // Out of bounds - log only in development to avoid spam
      if (process.env.NODE_ENV === 'development') {
        console.warn(`QuadrantExplorationSystem: Entity at (${x}, ${y}) is outside any quadrant`);
      }
      return;
    }
    
    // Mark current quadrant as explored if not already processed
    if (!this.processedQuadrants.has(quadrantIndex)) {
      try {
        const wasExplored = markQuadrantAsExplored(quadrantIndex);
        
        // Update stats if this is newly explored
        if (wasExplored) {
          this.exploredQuadrants++;
          
          // Trigger exploration event so other systems can react
          this.triggerExplorationEvent(quadrantIndex);
        }
        
        // Add to processed set to avoid duplicate processing
        this.processedQuadrants.add(quadrantIndex);
      } catch (error) {
        console.error(`QuadrantExplorationSystem: Error marking quadrant ${quadrantIndex} as explored`, error);
      }
    }
    
    // If entity has a sensor range component, use that for exploration
    let explorationRange = this.explorationRange;
    if (entity.hasComponent('SensorComponent')) {
      const sensor = entity.getComponent('SensorComponent');
      if (sensor && sensor.isEnabled()) {
        explorationRange = sensor.getEffectiveRange() * this.visibleRangeModifier;
      }
    }
    
    // If we have an exploration range, check nearby quadrants too
    if (explorationRange > 0) {
      this.checkNearbyQuadrants(x, y, explorationRange);
    }
  }
  
  /**
   * Update the timer for clearing processed quadrants to prevent memory leaks
   * @param {number} deltaTime - Time since last update in seconds
   * @private
   */
  updateClearTimer(deltaTime) {
    this.timeSinceLastClear += deltaTime;
    
    // Clear processed quadrants periodically to prevent memory buildup
    if (this.timeSinceLastClear >= this.clearInterval) {
      // Only keep quadrants in the current session
      const currentExplored = this.processedQuadrants.size;
      this.processedQuadrants.clear();
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`QuadrantExplorationSystem: Cleared ${currentExplored} processed quadrants from memory`);
      }
      
      this.timeSinceLastClear = 0;
    }
  }
  
  /**
   * Check and mark nearby quadrants as explored
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} range - Exploration range
   * @private
   */
  checkNearbyQuadrants(x, y, range) {
    // Validate inputs
    if (isNaN(x) || isNaN(y) || isNaN(range) || range <= 0) {
      return;
    }
    
    // Check quadrants in all 8 directions
    const directions = [
      { dx: -range, dy: -range }, // Top-left
      { dx: 0,      dy: -range }, // Top
      { dx: range,  dy: -range }, // Top-right
      { dx: -range, dy: 0      }, // Left
      { dx: range,  dy: 0      }, // Right
      { dx: -range, dy: range  }, // Bottom-left
      { dx: 0,      dy: range  }, // Bottom
      { dx: range,  dy: range  }, // Bottom-right
    ];
    
    for (const dir of directions) {
      try {
        const qx = x + dir.dx;
        const qy = y + dir.dy;
        
        const quadrantIndex = getQuadrantIndex(qx, qy);
        
        if (quadrantIndex !== -1 && !this.processedQuadrants.has(quadrantIndex)) {
          const wasExplored = markQuadrantAsExplored(quadrantIndex);
          
          if (wasExplored) {
            this.exploredQuadrants++;
            this.triggerExplorationEvent(quadrantIndex);
          }
          
          this.processedQuadrants.add(quadrantIndex);
        }
      } catch (error) {
        console.error('QuadrantExplorationSystem: Error checking nearby quadrants', error);
      }
    }
  }
  
  /**
   * Trigger an exploration event when a new quadrant is discovered
   * @param {number} quadrantIndex - Index of the newly explored quadrant
   * @private
   */
  triggerExplorationEvent(quadrantIndex) {
    const world = this.getWorld();
    if (world && world.eventEmitter) {
      try {
        world.eventEmitter.emit('quadrant:explored', {
          quadrantIndex,
          exploredCount: this.exploredQuadrants,
          totalCount: this.totalQuadrants,
          explorationPercentage: (this.exploredQuadrants / this.totalQuadrants) * 100,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('QuadrantExplorationSystem: Error emitting exploration event', error);
      }
    }
  }

  /**
   * Reset the system's state
   */
  reset() {
    this.processedQuadrants.clear();
    this.exploredQuadrants = 0;
    this.timeSinceLastClear = 0;
    this.isInitialized = false;
  }
  
  /**
   * Get exploration statistics
   * @returns {Object} Exploration stats
   */
  getExplorationStats() {
    return {
      explored: this.exploredQuadrants,
      total: this.totalQuadrants,
      percentage: this.totalQuadrants > 0 ? (this.exploredQuadrants / this.totalQuadrants) * 100 : 0
    };
  }
  
  /**
   * Handle system disposal - cleanup resources
   */
  dispose() {
    this.processedQuadrants.clear();
    this.isInitialized = false;
    super.dispose();
  }
} 