/**
 * Represents an entity in the Entity Component System.
 * Entities are simple containers that hold components.
 */
export class Entity {
  #id;
  #components = new Map();
  #tags = new Set();
  #isActive = true;

  constructor(id) {
    this.#id = id;
  }

  /**
   * Get entity ID
   * @returns {string} Entity ID
   */
  getId() {
    return this.#id;
  }

  /**
   * Add a component to the entity
   * @param {Component} component - Component to add
   * @returns {Entity} This entity for chaining
   */
  addComponent(component) {
    const componentName = component.constructor.name;
    this.#components.set(componentName, component);
    return this;
  }

  /**
   * Remove a component from the entity
   * @param {string} componentName - Name of component to remove
   * @returns {Entity} This entity for chaining
   */
  removeComponent(componentName) {
    this.#components.delete(componentName);
    return this;
  }

  /**
   * Get a component by name
   * @param {string} componentName - Name of component to get
   * @returns {Component|null} The component or null if not found
   */
  getComponent(componentName) {
    return this.#components.get(componentName) || null;
  }

  /**
   * Check if entity has a component
   * @param {string} componentName - Name of component to check
   * @returns {boolean} Whether entity has the component
   */
  hasComponent(componentName) {
    return this.#components.has(componentName);
  }

  /**
   * Get all components
   * @returns {Map<string, Component>} Map of components
   */
  getComponents() {
    return this.#components;
  }

  /**
   * Add a tag to the entity
   * @param {string} tag - Tag to add
   * @returns {Entity} This entity for chaining
   */
  addTag(tag) {
    this.#tags.add(tag);
    return this;
  }

  /**
   * Remove a tag from the entity
   * @param {string} tag - Tag to remove
   * @returns {Entity} This entity for chaining
   */
  removeTag(tag) {
    this.#tags.delete(tag);
    return this;
  }

  /**
   * Check if entity has a tag
   * @param {string} tag - Tag to check
   * @returns {boolean} Whether entity has the tag
   */
  hasTag(tag) {
    return this.#tags.has(tag);
  }

  /**
   * Get all tags
   * @returns {Set<string>} Set of tags
   */
  getTags() {
    return this.#tags;
  }

  /**
   * Set entity active state
   * @param {boolean} active - Whether entity is active
   * @returns {Entity} This entity for chaining
   */
  setActive(active) {
    this.#isActive = active;
    return this;
  }

  /**
   * Check if entity is active
   * @returns {boolean} Whether entity is active
   */
  isActive() {
    return this.#isActive;
  }

  /**
   * Clone the entity
   * @returns {Entity} New entity with same components and tags
   */
  clone() {
    const newEntity = new Entity(this.#id);

    // Clone components
    for (const [name, component] of this.#components) {
      newEntity.addComponent(component.clone());
    }

    // Clone tags
    for (const tag of this.#tags) {
      newEntity.addTag(tag);
    }

    newEntity.setActive(this.#isActive);
    return newEntity;
  }

  /**
   * Clean up entity resources
   */
  dispose() {
    this.#components.clear();
    this.#tags.clear();
    this.#isActive = false;
  }
}
