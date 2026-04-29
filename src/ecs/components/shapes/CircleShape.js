import { CollisionShape } from './CollisionShape';

/**
 * Circular collision shape.
 */
export class CircleShape extends CollisionShape {
  /**
   * Create a new circle shape
   * @param {Object} options - Circle options
   * @param {number} options.radius - Radius of the circle
   * @param {number} [options.x=0] - X position of center
   * @param {number} [options.y=0] - Y position of center
   */
  constructor(options = {}) {
    super(options);
    this.#radius = options.radius || 0;
    this.#x = options.x || 0;
    this.#y = options.y || 0;
  }

  /**
   * Get the circle's bounds
   * @returns {Object} Bounds object {x, y, width, height}
   */
  getBounds() {
    return {
      x: this.#x - this.#radius,
      y: this.#y - this.#radius,
      width: this.#radius * 2,
      height: this.#radius * 2,
    };
  }

  /**
   * Set the circle's bounds
   * @param {Object} bounds - New bounds
   */
  setBounds(bounds) {
    this.#x = bounds.x + bounds.width / 2;
    this.#y = bounds.y + bounds.height / 2;
    this.#radius = Math.min(bounds.width, bounds.height) / 2;
  }

  /**
   * Check if this circle intersects with another shape
   * @param {CollisionShape} other - Other shape to check
   * @returns {boolean} Whether shapes intersect
   */
  intersects(other) {
    if (other instanceof CircleShape) {
      return this.#intersectsCircle(other);
    } else if (other instanceof BoxShape) {
      return this.#intersectsBox(other);
    }
    return false;
  }

  /**
   * Get intersection data with another shape
   * @param {CollisionShape} other - Other shape to check
   * @returns {Object|null} Intersection data or null if no intersection
   */
  getIntersection(other) {
    if (!this.intersects(other)) return null;

    if (other instanceof CircleShape) {
      return this.#getCircleIntersection(other);
    } else if (other instanceof BoxShape) {
      return this.#getBoxIntersection(other);
    }
    return null;
  }

  /**
   * Get the circle's center point
   * @returns {Object} Center point {x, y}
   */
  getCenter() {
    return { x: this.#x, y: this.#y };
  }

  /**
   * Get the circle's area
   * @returns {number} Area of the circle
   */
  getArea() {
    return Math.PI * this.#radius * this.#radius;
  }

  /**
   * Get the circle's perimeter
   * @returns {number} Perimeter of the circle
   */
  getPerimeter() {
    return 2 * Math.PI * this.#radius;
  }

  /**
   * Check if this circle intersects with another circle
   * @private
   * @param {CircleShape} other - Other circle to check
   * @returns {boolean} Whether circles intersect
   */
  #intersectsCircle(other) {
    const dx = this.#x - other.#x;
    const dy = this.#y - other.#y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.#radius + other.#radius;
  }

  /**
   * Check if this circle intersects with a box
   * @private
   * @param {BoxShape} other - Box to check
   * @returns {boolean} Whether circle intersects box
   */
  #intersectsBox(other) {
    const bounds = other.getBounds();
    const closestX = Math.max(bounds.x, Math.min(this.#x, bounds.x + bounds.width));
    const closestY = Math.max(bounds.y, Math.min(this.#y, bounds.y + bounds.height));
    const distanceX = this.#x - closestX;
    const distanceY = this.#y - closestY;
    return distanceX * distanceX + distanceY * distanceY < this.#radius * this.#radius;
  }

  /**
   * Get intersection data with another circle
   * @private
   * @param {CircleShape} other - Other circle to check
   * @returns {Object} Intersection data
   */
  #getCircleIntersection(other) {
    const dx = other.#x - this.#x;
    const dy = other.#y - this.#y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const overlap = this.#radius + other.#radius - distance;

    if (overlap <= 0) return null;

    const angle = Math.atan2(dy, dx);
    const x = this.#x + Math.cos(angle) * (this.#radius - overlap / 2);
    const y = this.#y + Math.sin(angle) * (this.#radius - overlap / 2);

    return {
      x,
      y,
      width: overlap,
      height: overlap,
      angle,
      overlap,
    };
  }

  /**
   * Get intersection data with a box
   * @private
   * @param {BoxShape} other - Box to check
   * @returns {Object} Intersection data
   */
  #getBoxIntersection(other) {
    const bounds = other.getBounds();
    const closestX = Math.max(bounds.x, Math.min(this.#x, bounds.x + bounds.width));
    const closestY = Math.max(bounds.y, Math.min(this.#y, bounds.y + bounds.height));
    const distanceX = this.#x - closestX;
    const distanceY = this.#y - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;

    if (distanceSquared > this.#radius * this.#radius) return null;

    const distance = Math.sqrt(distanceSquared);
    const overlap = this.#radius - distance;

    return {
      x: closestX,
      y: closestY,
      width: overlap,
      height: overlap,
      angle: Math.atan2(distanceY, distanceX),
      overlap,
    };
  }

  #radius;
  #x;
  #y;
}
