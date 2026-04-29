import { Entity } from './Entity.js';

/**
 * Builder for creating and configuring entities with a fluent API
 * Makes entity creation more concise and readable
 */
export class EntityBuilder {
  /**
   * Create a new EntityBuilder
   * @param {World} world - The world to create the entity in
   * @param {ComponentRegistry} componentRegistry - The component registry
   */
  constructor(world, componentRegistry) {
    this.world = world;
    this.componentRegistry = componentRegistry;
    this.entity = null;
    this.componentData = new Map();
    this.entityTags = new Set();
  }

  /**
   * Start building a new entity
   * @returns {EntityBuilder} This builder for chaining
   */
  create() {
    this.entity = this.world.createEntity();
    this.componentData.clear();
    this.entityTags.clear();
    return this;
  }

  /**
   * Add a component to the entity
   * @param {string} componentType - Component type name
   * @param {Object} data - Component initialization data
   * @returns {EntityBuilder} This builder for chaining
   */
  withComponent(componentType, data = {}) {
    this.componentData.set(componentType, data);
    return this;
  }

  /**
   * Add a tag to the entity
   * @param {string} tag - Tag to add
   * @returns {EntityBuilder} This builder for chaining
   */
  withTag(tag) {
    this.entityTags.add(tag);
    return this;
  }

  /**
   * Add multiple tags to the entity
   * @param {Array<string>} tags - Tags to add
   * @returns {EntityBuilder} This builder for chaining
   */
  withTags(tags) {
    tags.forEach(tag => this.entityTags.add(tag));
    return this;
  }

  /**
   * Set the entity's active state
   * @param {boolean} active - Whether the entity is active
   * @returns {EntityBuilder} This builder for chaining
   */
  setActive(active) {
    if (this.entity) {
      this.entity.setActive(active);
    }
    return this;
  }

  /**
   * Set a transform component with position, rotation, and scale
   * @param {Object} transform - Transform data
   * @param {Object} transform.position - Position vector {x, y}
   * @param {number} transform.rotation - Rotation in radians
   * @param {Object} transform.scale - Scale vector {x, y}
   * @returns {EntityBuilder} This builder for chaining
   */
  withTransform(transform = {}) {
    return this.withComponent('TransformComponent', {
      position: transform.position || { x: 0, y: 0 },
      rotation: transform.rotation || 0,
      scale: transform.scale || { x: 1, y: 1 }
    });
  }

  /**
   * Set position component
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {EntityBuilder} This builder for chaining
   */
  withPosition(x, y) {
    const transformData = this.componentData.get('TransformComponent') || {
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 }
    };
    
    transformData.position = { x, y };
    return this.withComponent('TransformComponent', transformData);
  }

  /**
   * Apply a preset configuration to the entity
   * @param {string} presetName - Name of the preset
   * @param {Object} overrides - Optional data to override preset values
   * @returns {EntityBuilder} This builder for chaining
   */
  withPreset(presetName, overrides = {}) {
    // This would be implemented to apply predefined component sets
    // For example, a "player" preset might add player-specific components
    // For now, we'll leave it as a stub for future implementation
    console.warn(`Preset '${presetName}' not implemented`);
    return this;
  }

  /**
   * Build and return the configured entity
   * @returns {Entity} The built entity
   */
  build() {
    if (!this.entity) {
      throw new Error('No entity created. Call create() first.');
    }

    // Add all components
    for (const [componentType, data] of this.componentData.entries()) {
      try {
        const component = this.componentRegistry.create(componentType, data);
        this.entity.addComponent(component);
      } catch (error) {
        console.error(`Failed to add component '${componentType}':`, error);
      }
    }

    // Add all tags
    for (const tag of this.entityTags) {
      this.entity.addTag(tag);
    }

    return this.entity;
  }
} 