/**
 * A 2D vector class with both immutable and mutable operations.
 * Immutable operations return new vectors, while mutable operations modify the current vector.
 */
export class Vector2D {
  #x;
  #y;
  #magnitude = null; // Cache for magnitude
  #normalized = null; // Cache for normalized vector

  constructor(x = 0, y = 0) {
    this.#x = Number(x);
    this.#y = Number(y);
  }

  // Getters
  get x() {
    return this.#x;
  }
  get y() {
    return this.#y;
  }

  // Immutable operations
  add(v) {
    return new Vector2D(this.#x + v.x, this.#y + v.y);
  }

  subtract(v) {
    return new Vector2D(this.#x - v.x, this.#y - v.y);
  }

  multiply(scalar) {
    return new Vector2D(this.#x * scalar, this.#y * scalar);
  }

  divide(scalar) {
    if (scalar === 0) {
      throw new Error('Division by zero');
    }
    return new Vector2D(this.#x / scalar, this.#y / scalar);
  }

  // Mutable operations
  addMut(v) {
    this.#x += v.x;
    this.#y += v.y;
    this.#invalidateCache();
    return this;
  }

  subtractMut(v) {
    this.#x -= v.x;
    this.#y -= v.y;
    this.#invalidateCache();
    return this;
  }

  multiplyMut(scalar) {
    this.#x *= scalar;
    this.#y *= scalar;
    this.#invalidateCache();
    return this;
  }

  divideMut(scalar) {
    if (scalar === 0) {
      throw new Error('Division by zero');
    }
    this.#x /= scalar;
    this.#y /= scalar;
    this.#invalidateCache();
    return this;
  }

  // Magnitude and normalization
  magnitude() {
    if (this.#magnitude === null) {
      this.#magnitude = Math.sqrt(this.#x * this.#x + this.#y * this.#y);
    }
    return this.#magnitude;
  }

  normalize() {
    if (this.#normalized === null) {
      const mag = this.magnitude();
      const EPSILON = 1e-10; // Add epsilon check for floating point precision
      if (mag < EPSILON) {
        this.#normalized = new Vector2D(0, 0);
      } else {
        this.#normalized = new Vector2D(this.#x / mag, this.#y / mag);
      }
    }
    return this.#normalized;
  }

  normalizeMut() {
    const mag = this.magnitude();
    const EPSILON = 1e-10; // Add epsilon check for floating point precision
    if (mag < EPSILON) {
      this.#x = 0;
      this.#y = 0;
    } else {
      this.#x /= mag;
      this.#y /= mag;
    }
    this.#invalidateCache();
    return this;
  }

  // Additional useful operations
  dot(v) {
    return this.#x * v.x + this.#y * v.y;
  }

  cross(v) {
    return this.#x * v.y - this.#y * v.x;
  }

  distanceTo(v) {
    const dx = this.#x - v.x;
    const dy = this.#y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  distanceToSquared(v) {
    const dx = this.#x - v.x;
    const dy = this.#y - v.y;
    return dx * dx + dy * dy;
  }

  angle() {
    return Math.atan2(this.#y, this.#x);
  }

  angleTo(v) {
    return Math.atan2(v.y - this.#y, v.x - this.#x);
  }

  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vector2D(this.#x * cos - this.#y * sin, this.#x * sin + this.#y * cos);
  }

  rotateMut(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = this.#x * cos - this.#y * sin;
    const y = this.#x * sin + this.#y * cos;
    this.#x = x;
    this.#y = y;
    this.#invalidateCache();
    return this;
  }

  // Utility methods
  clone() {
    return new Vector2D(this.#x, this.#y);
  }

  equals(v) {
    return this.#x === v.x && this.#y === v.y;
  }

  isZero() {
    return this.#x === 0 && this.#y === 0;
  }

  toString() {
    return `Vector2D(${this.#x}, ${this.#y})`;
  }

  // Private helper methods
  #invalidateCache() {
    this.#magnitude = null;
    this.#normalized = null;
  }
}
