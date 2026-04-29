import { Component } from '../Component.js';

/**
 * Component that represents an entity's position, rotation, and scale in the game world
 */
export class TransformComponent extends Component {
  /**
   * Create a new TransformComponent
   * @param {Object} options - Component initialization options
   * @param {Object} options.position - Position vector {x, y}
   * @param {number} options.rotation - Rotation in radians
   * @param {Object} options.scale - Scale vector {x, y}
   */
  constructor(options = {}) {
    super();
    
    /**
     * Position vector
     * @type {Object}
     * @property {number} x - X position
     * @property {number} y - Y position
     */
    this.position = options.position || { x: 0, y: 0 };
    
    /**
     * Rotation in radians
     * @type {number}
     */
    this.rotation = options.rotation || 0;
    
    /**
     * Scale vector
     * @type {Object}
     * @property {number} x - X scale
     * @property {number} y - Y scale
     */
    this.scale = options.scale || { x: 1, y: 1 };
    
    /**
     * Previous position for interpolation
     * @type {Object}
     * @property {number} x - Previous X position
     * @property {number} y - Previous Y position
     */
    this.previousPosition = { ...this.position };
    
    /**
     * Previous rotation for interpolation
     * @type {number}
     */
    this.previousRotation = this.rotation;
  }

  /**
   * Set position
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {TransformComponent} This component for chaining
   */
  setPosition(x, y) {
    this.previousPosition.x = this.position.x;
    this.previousPosition.y = this.position.y;
    this.position.x = x;
    this.position.y = y;
    return this;
  }

  /**
   * Set rotation
   * @param {number} rotation - Rotation in radians
   * @returns {TransformComponent} This component for chaining
   */
  setRotation(rotation) {
    this.previousRotation = this.rotation;
    this.rotation = rotation;
    return this;
  }

  /**
   * Set scale
   * @param {number} x - X scale
   * @param {number} y - Y scale
   * @returns {TransformComponent} This component for chaining
   */
  setScale(x, y) {
    this.scale.x = x;
    this.scale.y = y;
    return this;
  }

  /**
   * Move by delta
   * @param {number} dx - X delta
   * @param {number} dy - Y delta
   * @returns {TransformComponent} This component for chaining
   */
  move(dx, dy) {
    return this.setPosition(this.position.x + dx, this.position.y + dy);
  }

  /**
   * Rotate by delta
   * @param {number} dr - Rotation delta in radians
   * @returns {TransformComponent} This component for chaining
   */
  rotate(dr) {
    return this.setRotation(this.rotation + dr);
  }

  /**
   * Scale by factor
   * @param {number} sx - X scale factor
   * @param {number} sy - Y scale factor
   * @returns {TransformComponent} This component for chaining
   */
  scaleBy(sx, sy) {
    return this.setScale(this.scale.x * sx, this.scale.y * sy);
  }

  /**
   * Get interpolated position
   * @param {number} alpha - Interpolation factor (0-1)
   * @returns {Object} Interpolated position {x, y}
   */
  getInterpolatedPosition(alpha) {
    return {
      x: this.previousPosition.x + (this.position.x - this.previousPosition.x) * alpha,
      y: this.previousPosition.y + (this.position.y - this.previousPosition.y) * alpha
    };
  }

  /**
   * Get interpolated rotation
   * @param {number} alpha - Interpolation factor (0-1)
   * @returns {number} Interpolated rotation
   */
  getInterpolatedRotation(alpha) {
    return this.previousRotation + (this.rotation - this.previousRotation) * alpha;
  }

  /**
   * Clone the component
   * @returns {TransformComponent} New component with same data
   */
  clone() {
    return new TransformComponent({
      position: { ...this.position },
      rotation: this.rotation,
      scale: { ...this.scale }
    });
  }

  /**
   * Serialize component data
   * @returns {Object} Serialized component data
   */
  serialize() {
    return {
      type: 'TransformComponent',
      enabled: this.isEnabled(),
      data: {
        position: { ...this.position },
        rotation: this.rotation,
        scale: { ...this.scale }
      }
    };
  }

  /**
   * Deserialize component data
   * @param {Object} data - Serialized component data
   * @returns {TransformComponent} This component for chaining
   */
  deserialize(data) {
    if (data.data) {
      if (data.data.position) {
        this.position = { ...data.data.position };
        this.previousPosition = { ...this.position };
      }
      
      if (data.data.rotation !== undefined) {
        this.rotation = data.data.rotation;
        this.previousRotation = this.rotation;
      }
      
      if (data.data.scale) {
        this.scale = { ...data.data.scale };
      }
    }
    
    this.setEnabled(data.enabled !== undefined ? data.enabled : true);
    return this;
  }
} 