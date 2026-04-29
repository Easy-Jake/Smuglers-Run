import { Component } from '../Component.js';

/**
 * Component that represents an entity's linear and angular velocity
 */
export class VelocityComponent extends Component {
  /**
   * Create a new VelocityComponent
   * @param {Object} options - Component initialization options
   * @param {number} options.x - X velocity
   * @param {number} options.y - Y velocity
   * @param {number} options.angular - Angular velocity in radians per second
   */
  constructor(options = {}) {
    super();
    
    /**
     * X velocity
     * @type {number}
     */
    this.x = options.x || 0;
    
    /**
     * Y velocity
     * @type {number}
     */
    this.y = options.y || 0;
    
    /**
     * Angular velocity in radians per second
     * @type {number}
     */
    this.angular = options.angular || 0;
    
    /**
     * Maximum speed
     * @type {number}
     */
    this.maxSpeed = options.maxSpeed || Infinity;
  }

  /**
   * Set linear velocity
   * @param {number} x - X velocity
   * @param {number} y - Y velocity
   * @returns {VelocityComponent} This component for chaining
   */
  setVelocity(x, y) {
    this.x = x;
    this.y = y;
    this.enforceMaxSpeed();
    return this;
  }

  /**
   * Set angular velocity
   * @param {number} angular - Angular velocity in radians per second
   * @returns {VelocityComponent} This component for chaining
   */
  setAngularVelocity(angular) {
    this.angular = angular;
    return this;
  }

  /**
   * Add to velocity (accelerate)
   * @param {number} dx - X velocity delta
   * @param {number} dy - Y velocity delta
   * @returns {VelocityComponent} This component for chaining
   */
  addVelocity(dx, dy) {
    this.x += dx;
    this.y += dy;
    this.enforceMaxSpeed();
    return this;
  }

  /**
   * Add to angular velocity
   * @param {number} dAngular - Angular velocity delta
   * @returns {VelocityComponent} This component for chaining
   */
  addAngularVelocity(dAngular) {
    this.angular += dAngular;
    return this;
  }

  /**
   * Apply a force in a direction
   * @param {number} force - Force magnitude
   * @param {number} angle - Force direction in radians
   * @param {number} mass - Entity mass
   * @returns {VelocityComponent} This component for chaining
   */
  applyForce(force, angle, mass = 1) {
    const acceleration = force / mass;
    this.x += Math.cos(angle) * acceleration;
    this.y += Math.sin(angle) * acceleration;
    this.enforceMaxSpeed();
    return this;
  }

  /**
   * Apply a torque
   * @param {number} torque - Torque magnitude
   * @param {number} inertia - Entity moment of inertia
   * @returns {VelocityComponent} This component for chaining
   */
  applyTorque(torque, inertia = 1) {
    const angularAcceleration = torque / inertia;
    this.angular += angularAcceleration;
    return this;
  }

  /**
   * Enforce maximum speed
   * @private
   */
  enforceMaxSpeed() {
    if (this.maxSpeed < Infinity) {
      const speedSquared = this.x * this.x + this.y * this.y;
      if (speedSquared > this.maxSpeed * this.maxSpeed) {
        const speed = Math.sqrt(speedSquared);
        this.x = (this.x / speed) * this.maxSpeed;
        this.y = (this.y / speed) * this.maxSpeed;
      }
    }
  }

  /**
   * Get current speed
   * @returns {number} Current speed
   */
  getSpeed() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Get current direction
   * @returns {number} Current direction in radians
   */
  getDirection() {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Clone the component
   * @returns {VelocityComponent} New component with same data
   */
  clone() {
    return new VelocityComponent({
      x: this.x,
      y: this.y,
      angular: this.angular,
      maxSpeed: this.maxSpeed
    });
  }

  /**
   * Serialize component data
   * @returns {Object} Serialized component data
   */
  serialize() {
    return {
      type: 'VelocityComponent',
      enabled: this.isEnabled(),
      data: {
        x: this.x,
        y: this.y,
        angular: this.angular,
        maxSpeed: this.maxSpeed
      }
    };
  }

  /**
   * Deserialize component data
   * @param {Object} data - Serialized component data
   * @returns {VelocityComponent} This component for chaining
   */
  deserialize(data) {
    if (data.data) {
      if (data.data.x !== undefined) this.x = data.data.x;
      if (data.data.y !== undefined) this.y = data.data.y;
      if (data.data.angular !== undefined) this.angular = data.data.angular;
      if (data.data.maxSpeed !== undefined) this.maxSpeed = data.data.maxSpeed;
    }
    
    this.setEnabled(data.enabled !== undefined ? data.enabled : true);
    return this;
  }
} 