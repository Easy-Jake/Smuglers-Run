import { System } from '../System.js';

/**
 * System that handles entity movement using velocity and transform components
 */
export class MovementSystem extends System {
  /**
   * Create a new MovementSystem
   * @param {number} priority - System priority (lower runs first)
   * @param {Object} options - System options
   */
  constructor(priority = 0, options = {}) {
    super(priority);
    
    // Required components for entities to be processed by this system
    this.requireComponents(['TransformComponent', 'VelocityComponent']);
    
    // Maximum movement speed if specified in options
    this.maxSpeed = options.maxSpeed || Infinity;
    
    // Damping factor (0-1) to slow down objects over time
    this.damping = options.damping || 0.99;
    
    // Factor to convert physics calculations to appropriate scale
    this.physicsScale = options.physicsScale || 1;
  }

  /**
   * Initialize the system
   */
  initialize() {
    // Any one-time setup code would go here
  }

  /**
   * Process a single entity
   * @param {Entity} entity - Entity to process
   * @param {number} deltaTime - Time since last update in seconds
   */
  processEntity(entity, deltaTime) {
    const transform = entity.getComponent('TransformComponent');
    const velocity = entity.getComponent('VelocityComponent');
    
    if (!transform.isEnabled() || !velocity.isEnabled()) {
      return;
    }
    
    // Apply velocity to position
    const dx = velocity.x * deltaTime * this.physicsScale;
    const dy = velocity.y * deltaTime * this.physicsScale;
    
    // Update position
    transform.move(dx, dy);
    
    // If entity has angular velocity, apply it to rotation
    if (velocity.angular !== undefined) {
      const dr = velocity.angular * deltaTime * this.physicsScale;
      transform.rotate(dr);
    }
    
    // Apply damping if not zero
    if (this.damping !== 1) {
      velocity.x *= this.damping;
      velocity.y *= this.damping;
      
      if (velocity.angular !== undefined) {
        velocity.angular *= this.damping;
      }
      
      // If velocity is very small, set it to zero to avoid jittering
      const epsilon = 0.001;
      if (Math.abs(velocity.x) < epsilon) velocity.x = 0;
      if (Math.abs(velocity.y) < epsilon) velocity.y = 0;
      if (velocity.angular !== undefined && Math.abs(velocity.angular) < epsilon) velocity.angular = 0;
    }
    
    // Enforce maximum speed if set
    if (this.maxSpeed < Infinity) {
      const speedSquared = velocity.x * velocity.x + velocity.y * velocity.y;
      if (speedSquared > this.maxSpeed * this.maxSpeed) {
        const speed = Math.sqrt(speedSquared);
        velocity.x = (velocity.x / speed) * this.maxSpeed;
        velocity.y = (velocity.y / speed) * this.maxSpeed;
      }
    }
  }

  /**
   * Update the system
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    // The parent System class implementation already iterates
    // through entities with the required components and calls
    // processEntity for each one
    super.update(deltaTime);
    
    // Additional global system logic could go here
  }
} 