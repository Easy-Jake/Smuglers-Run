import { Component } from '../Component';
import { BoxShape } from './shapes/BoxShape';
import { ShapeFactory } from './shapes/ShapeFactory';

/**
 * Component that defines collision properties for an entity.
 */
export class Collider extends Component {
  #shape;
  #isTrigger;
  #layer;
  #mask;
  #isStatic;

  /**
   * Create a new collider
   * @param {Object} options - Collider options
   * @param {CollisionShape} options.shape - Collision shape
   * @param {boolean} options.isTrigger - Whether this is a trigger collider
   * @param {number} options.layer - Collision layer
   * @param {number} options.mask - Collision mask
   * @param {boolean} options.isStatic - Whether this is a static collider
   */
  constructor(options = {}) {
    super();
    this.#shape = options.shape || new BoxShape({ width: 0, height: 0 });
    this.#isTrigger = options.isTrigger || false;
    this.#layer = options.layer || 0;
    this.#mask = options.mask || 0;
    this.#isStatic = options.isStatic || false;
  }

  /**
   * Get collision shape
   * @returns {CollisionShape} Collision shape
   */
  getShape() {
    return this.#shape;
  }

  /**
   * Set collision shape
   * @param {CollisionShape} shape - New collision shape
   * @returns {Collider} This collider for chaining
   */
  setShape(shape) {
    this.#shape = shape;
    return this;
  }

  /**
   * Get collision bounds
   * @returns {Object} Collision bounds
   */
  getBounds() {
    return this.#shape.getBounds();
  }

  /**
   * Set collision bounds
   * @param {Object} bounds - New collision bounds
   * @returns {Collider} This collider for chaining
   */
  setBounds(bounds) {
    this.#shape.setBounds(bounds);
    return this;
  }

  /**
   * Check if this is a trigger collider
   * @returns {boolean} Whether this is a trigger
   */
  isTrigger() {
    return this.#isTrigger;
  }

  /**
   * Set trigger state
   * @param {boolean} isTrigger - Whether this is a trigger
   * @returns {Collider} This collider for chaining
   */
  setTrigger(isTrigger) {
    this.#isTrigger = isTrigger;
    return this;
  }

  /**
   * Get collision layer
   * @returns {number} Collision layer
   */
  getLayer() {
    return this.#layer;
  }

  /**
   * Set collision layer
   * @param {number} layer - New collision layer
   * @returns {Collider} This collider for chaining
   */
  setLayer(layer) {
    this.#layer = layer;
    return this;
  }

  /**
   * Get collision mask
   * @returns {number} Collision mask
   */
  getMask() {
    return this.#mask;
  }

  /**
   * Set collision mask
   * @param {number} mask - New collision mask
   * @returns {Collider} This collider for chaining
   */
  setMask(mask) {
    this.#mask = mask;
    return this;
  }

  /**
   * Check if this is a static collider
   * @returns {boolean} Whether this is static
   */
  isStatic() {
    return this.#isStatic;
  }

  /**
   * Set static state
   * @param {boolean} isStatic - Whether this is static
   * @returns {Collider} This collider for chaining
   */
  setStatic(isStatic) {
    this.#isStatic = isStatic;
    return this;
  }

  /**
   * Check if this collider can collide with another
   * @param {Collider} other - Other collider to check
   * @returns {boolean} Whether collision is possible
   */
  canCollideWith(other) {
    return (this.#layer & other.getMask()) !== 0 && (other.getLayer() & this.#mask) !== 0;
  }

  /**
   * Check if this collider intersects with another
   * @param {Collider} other - Other collider to check
   * @returns {boolean} Whether colliders intersect
   */
  intersects(other) {
    return this.#shape.intersects(other.getShape());
  }

  /**
   * Get intersection with another collider
   * @param {Collider} other - Other collider to check
   * @returns {Object|null} Intersection data or null if no intersection
   */
  getIntersection(other) {
    return this.#shape.getIntersection(other.getShape());
  }

  /**
   * Serialize collider data
   * @protected
   * @returns {Object} Serialized data
   */
  #serializeData() {
    return {
      shape: this.#shape.serialize(),
      isTrigger: this.#isTrigger,
      layer: this.#layer,
      mask: this.#mask,
      isStatic: this.#isStatic,
    };
  }

  /**
   * Deserialize collider data
   * @protected
   * @param {Object} data - Serialized data
   */
  #deserializeData(data) {
    this.#shape = ShapeFactory.deserialize(data.shape);
    this.#isTrigger = data.isTrigger;
    this.#layer = data.layer;
    this.#mask = data.mask;
    this.#isStatic = data.isStatic;
  }
}
