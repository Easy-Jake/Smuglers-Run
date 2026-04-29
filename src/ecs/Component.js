/**
 * Base class for all components in the Entity Component System.
 * Components are pure data containers with no logic.
 */
export class Component {
  #entity = null;
  #isEnabled = true;

  /**
   * Set the entity this component belongs to
   * @param {Entity} entity - The entity
   * @returns {Component} This component for chaining
   */
  setEntity(entity) {
    this.#entity = entity;
    return this;
  }

  /**
   * Get the entity this component belongs to
   * @returns {Entity|null} The entity or null if not set
   */
  getEntity() {
    return this.#entity;
  }

  /**
   * Set component enabled state
   * @param {boolean} enabled - Whether component is enabled
   * @returns {Component} This component for chaining
   */
  setEnabled(enabled) {
    this.#isEnabled = enabled;
    return this;
  }

  /**
   * Check if component is enabled
   * @returns {boolean} Whether component is enabled
   */
  isEnabled() {
    return this.#isEnabled;
  }

  /**
   * Clone the component
   * @returns {Component} New component with same data
   */
  clone() {
    const newComponent = new this.constructor();
    Object.assign(newComponent, this);
    return newComponent;
  }

  /**
   * Serialize component data
   * @returns {Object} Serialized component data
   */
  serialize() {
    return {
      type: this.constructor.name,
      enabled: this.#isEnabled,
      data: this.#serializeData(),
    };
  }

  /**
   * Deserialize component data
   * @param {Object} data - Serialized component data
   * @returns {Component} This component for chaining
   */
  deserialize(data) {
    this.#isEnabled = data.enabled;
    this.#deserializeData(data.data);
    return this;
  }

  /**
   * Serialize component-specific data
   * @protected
   * @returns {Object} Serialized data
   */
  #serializeData() {
    return {};
  }

  /**
   * Deserialize component-specific data
   * @protected
   * @param {Object} data - Serialized data
   */
  #deserializeData(data) {
    // Override in subclasses
  }

  /**
   * Clean up component resources
   */
  dispose() {
    this.#entity = null;
    this.#isEnabled = false;
  }
}
