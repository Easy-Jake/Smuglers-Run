import { CollisionShape } from './CollisionShape';

/**
 * Rectangular collision shape.
 */
export class BoxShape extends CollisionShape {
  /**
   * Create a new box shape
   * @param {Object} options - Box options
   * @param {number} options.width - Width of the box
   * @param {number} options.height - Height of the box
   * @param {number} [options.x=0] - X position
   * @param {number} [options.y=0] - Y position
   */
  constructor(options = {}) {
    super(options);
    this.#width = options.width || 0;
    this.#height = options.height || 0;
    this.#x = options.x || 0;
    this.#y = options.y || 0;
  }

  /**
   * Get the box's bounds
   * @returns {Object} Bounds object {x, y, width, height}
   */
  getBounds() {
    return {
      x: this.#x,
      y: this.#y,
      width: this.#width,
      height: this.#height,
    };
  }

  /**
   * Set the box's bounds
   * @param {Object} bounds - New bounds
   */
  setBounds(bounds) {
    this.#x = bounds.x;
    this.#y = bounds.y;
    this.#width = bounds.width;
    this.#height = bounds.height;
  }

  /**
   * Check if this box intersects with another shape
   * @param {CollisionShape} other - Other shape to check
   * @returns {boolean} Whether shapes intersect
   */
  intersects(other) {
    if (other instanceof BoxShape) {
      return this.#intersectsBox(other);
    }
    // Add support for other shape types here
    return false;
  }

  /**
   * Get intersection data with another shape
   * @param {CollisionShape} other - Other shape to check
   * @returns {Object|null} Intersection data or null if no intersection
   */
  getIntersection(other) {
    if (!this.intersects(other)) return null;

    if (other instanceof BoxShape) {
      return this.#getBoxIntersection(other);
    }
    // Add support for other shape types here
    return null;
  }

  /**
   * Get the box's center point
   * @returns {Object} Center point {x, y}
   */
  getCenter() {
    return {
      x: this.#x + this.#width / 2,
      y: this.#y + this.#height / 2,
    };
  }

  /**
   * Get the box's area
   * @returns {number} Area of the box
   */
  getArea() {
    return this.#width * this.#height;
  }

  /**
   * Get the box's perimeter
   * @returns {number} Perimeter of the box
   */
  getPerimeter() {
    return 2 * (this.#width + this.#height);
  }

  /**
   * Check if this box intersects with another box
   * @private
   * @param {BoxShape} other - Other box to check
   * @returns {boolean} Whether boxes intersect
   */
  #intersectsBox(other) {
    const otherBounds = other.getBounds();
    return (
      this.#x < otherBounds.x + otherBounds.width &&
      this.#x + this.#width > otherBounds.x &&
      this.#y < otherBounds.y + otherBounds.height &&
      this.#y + this.#height > otherBounds.y
    );
  }

  /**
   * Get intersection data with another box
   * @private
   * @param {BoxShape} other - Other box to check
   * @returns {Object} Intersection data
   */
  #getBoxIntersection(other) {
    const otherBounds = other.getBounds();
    const x = Math.max(this.#x, otherBounds.x);
    const y = Math.max(this.#y, otherBounds.y);
    const width = Math.min(this.#x + this.#width, otherBounds.x + otherBounds.width) - x;
    const height = Math.min(this.#y + this.#height, otherBounds.y + otherBounds.height) - y;

    return { x, y, width, height };
  }

  #width;
  #height;
  #x;
  #y;
}
