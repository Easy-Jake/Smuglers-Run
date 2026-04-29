import { BoxShape } from './BoxShape';
import { CircleShape } from './CircleShape';

/**
 * Factory for creating and deserializing collision shapes.
 */
export class ShapeFactory {
  /**
   * Create a shape from options
   * @param {Object} options - Shape options
   * @param {string} options.type - Type of shape ('box' or 'circle')
   * @param {Object} options.params - Shape parameters
   * @returns {CollisionShape} Created shape
   */
  static create(options) {
    switch (options.type.toLowerCase()) {
      case 'box':
        return new BoxShape(options.params);
      case 'circle':
        return new CircleShape(options.params);
      default:
        throw new Error(`Unknown shape type: ${options.type}`);
    }
  }

  /**
   * Deserialize a shape from data
   * @param {Object} data - Serialized shape data
   * @returns {CollisionShape} Deserialized shape
   */
  static deserialize(data) {
    return this.create({
      type: data.type,
      params: data.options,
    });
  }

  /**
   * Create a box shape
   * @param {Object} params - Box parameters
   * @returns {BoxShape} Created box shape
   */
  static createBox(params) {
    return new BoxShape(params);
  }

  /**
   * Create a circle shape
   * @param {Object} params - Circle parameters
   * @returns {CircleShape} Created circle shape
   */
  static createCircle(params) {
    return new CircleShape(params);
  }
}
