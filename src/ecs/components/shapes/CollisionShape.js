/**
 * Base class for all collision shapes.
 */
export class CollisionShape {
  /**
   * Create a new collision shape
   * @param {Object} options - Shape options
   */
  constructor(options = {}) {
    this.#options = options;
  }

  /**
   * Get the shape's bounds
   * @returns {Object} Bounds object {x, y, width, height}
   */
  getBounds() {
    throw new Error('getBounds() must be implemented by shape class');
  }

  /**
   * Check if this shape intersects with another
   * @param {CollisionShape} other - Other shape to check
   * @returns {boolean} Whether shapes intersect
   */
  intersects(other) {
    throw new Error('intersects() must be implemented by shape class');
  }

  /**
   * Get intersection data with another shape
   * @param {CollisionShape} other - Other shape to check
   * @returns {Object|null} Intersection data or null if no intersection
   */
  getIntersection(other) {
    throw new Error('getIntersection() must be implemented by shape class');
  }

  /**
   * Get the shape's center point
   * @returns {Object} Center point {x, y}
   */
  getCenter() {
    throw new Error('getCenter() must be implemented by shape class');
  }

  /**
   * Get the shape's area
   * @returns {number} Area of the shape
   */
  getArea() {
    throw new Error('getArea() must be implemented by shape class');
  }

  /**
   * Get the shape's perimeter
   * @returns {number} Perimeter of the shape
   */
  getPerimeter() {
    throw new Error('getPerimeter() must be implemented by shape class');
  }

  /**
   * Get the shape's type
   * @returns {string} Shape type
   */
  getType() {
    return this.constructor.name;
  }

  /**
   * Serialize shape data
   * @returns {Object} Serialized data
   */
  serialize() {
    return {
      type: this.getType(),
      options: this.#options,
    };
  }

  /**
   * Deserialize shape data
   * @param {Object} data - Serialized data
   */
  deserialize(data) {
    this.#options = data.options;
  }

  #options;
}
