/**
 * Responsible for detecting collisions between game objects
 */
export class CollisionDetector {
  /**
   * Create a new collision detector
   */
  constructor() {
    // Collision detection strategies
    this.strategies = {
      aabb: this.aabbCollision,
      circle: this.circleCollision,
    };
  }

  /**
   * Detect collisions between an object and a list of potential collision candidates
   * @param {Object} object - The object to check collisions for
   * @param {Array} potentialCollisions - Array of potential collision candidates
   * @param {CollisionPerformance} performanceTracker - Performance tracker instance
   * @returns {Array} Array of objects that collide with the given object
   */
  detectCollisions(object, potentialCollisions, performanceTracker) {
    const startTime = performance.now();
    
    const collisions = potentialCollisions.filter(other => {
      if (object === other) return false;
      
      // Track collision check
      if (performanceTracker) {
        performanceTracker.incrementChecks();
      }
      
      // Use circle collision if both have radius, otherwise AABB
      let collisionStrategy = this.strategies.aabb;
      if ((object.radius && other.radius) ||
          (object.collisionType === 'circle' && other.collisionType === 'circle')) {
        collisionStrategy = this.strategies.circle;
      }
      
      // Detect collision
      const isColliding = collisionStrategy(object, other);
      
      // Track collision detection
      if (isColliding && performanceTracker) {
        performanceTracker.incrementCollisions();
      }
      
      return isColliding;
    });
    
    // Track timing
    if (performanceTracker) {
      performanceTracker.setCollisionTime(performance.now() - startTime);
    }
    
    return collisions;
  }

  /**
   * Check collision between two specific objects
   * @param {Object} a - First object
   * @param {Object} b - Second object
   * @returns {boolean} True if the objects are colliding
   */
  detectCollision(a, b) {
    if (a === b) return false;
    if (a.radius && b.radius) {
      return this.circleCollision(a, b);
    }
    return this.aabbCollision(a, b);
  }

  /**
   * Check if two objects are colliding using AABB collision detection
   * @param {Object} obj1 - First object
   * @param {Object} obj2 - Second object
   * @returns {boolean} True if the objects are colliding
   */
  aabbCollision(obj1, obj2) {
    return (
      obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + obj2.height &&
      obj1.y + obj1.height > obj2.y
    );
  }

  /**
   * Check if two objects are colliding using circle collision detection
   * @param {Object} obj1 - First object
   * @param {Object} obj2 - Second object
   * @returns {boolean} True if the objects are colliding
   */
  circleCollision(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < (obj1.radius + obj2.radius);
  }
} 