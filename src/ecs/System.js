/**
 * Base class for all systems in the Entity Component System.
 * Systems contain the logic that operates on components.
 */
export class System {
  #world = null;
  #isEnabled = true;
  #priority = 0;
  #requiredComponents = new Set();
  #excludedComponents = new Set();

  constructor(priority = 0) {
    this.#priority = priority;
  }

  /**
   * Set the world this system belongs to
   * @param {World} world - The world
   * @returns {System} This system for chaining
   */
  setWorld(world) {
    this.#world = world;
    return this;
  }

  /**
   * Get the world this system belongs to
   * @returns {World|null} The world or null if not set
   */
  getWorld() {
    return this.#world;
  }

  /**
   * Set system enabled state
   * @param {boolean} enabled - Whether system is enabled
   * @returns {System} This system for chaining
   */
  setEnabled(enabled) {
    this.#isEnabled = enabled;
    return this;
  }

  /**
   * Check if system is enabled
   * @returns {boolean} Whether system is enabled
   */
  isEnabled() {
    return this.#isEnabled;
  }

  /**
   * Get system priority
   * @returns {number} System priority
   */
  getPriority() {
    return this.#priority;
  }

  /**
   * Set required components
   * @param {Array<string>} components - Component names
   * @returns {System} This system for chaining
   */
  requireComponents(components) {
    components.forEach(component => this.#requiredComponents.add(component));
    return this;
  }

  /**
   * Set excluded components
   * @param {Array<string>} components - Component names
   * @returns {System} This system for chaining
   */
  excludeComponents(components) {
    components.forEach(component => this.#excludedComponents.add(component));
    return this;
  }

  /**
   * Check if an entity matches system requirements
   * @param {Entity} entity - Entity to check
   * @returns {boolean} Whether entity matches requirements
   */
  matchesEntity(entity) {
    // Check required components
    for (const component of this.#requiredComponents) {
      if (!entity.hasComponent(component)) {
        return false;
      }
    }

    // Check excluded components
    for (const component of this.#excludedComponents) {
      if (entity.hasComponent(component)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Process an entity
   * @param {Entity} entity - Entity to process
   * @param {number} deltaTime - Time since last update
   */
  processEntity(entity, deltaTime) {
    // Override in subclasses
  }

  /**
   * Update the system
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (!this.#isEnabled || !this.#world) return;

    const entities = this.#world.getEntities();
    for (const entity of entities) {
      if (this.matchesEntity(entity)) {
        this.processEntity(entity, deltaTime);
      }
    }
  }

  /**
   * Initialize the system
   */
  initialize() {
    // Override in subclasses
  }

  /**
   * Clean up system resources
   */
  dispose() {
    this.#world = null;
    this.#isEnabled = false;
    this.#requiredComponents.clear();
    this.#excludedComponents.clear();
  }
}
