/**
 * Manages entities and systems in the Entity Component System.
 * Coordinates the interaction between entities, components, and systems.
 */
export class World {
  #entities = new Map();
  #systems = new Map();
  #nextEntityId = 1;
  #isInitialized = false;

  constructor() {
    this.#initialize();
  }

  /**
   * Initialize the world
   * @private
   */
  #initialize() {
    if (this.#isInitialized) return;

    try {
      // Initialize systems
      this.#initializeSystems();
      this.#isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize world:', error);
      throw error;
    }
  }

  /**
   * Initialize systems
   * @private
   */
  #initializeSystems() {
    for (const system of this.#systems.values()) {
      system.setWorld(this);
      system.initialize();
    }
  }

  /**
   * Create a new entity
   * @returns {Entity} New entity
   */
  createEntity() {
    const id = `entity_${this.#nextEntityId++}`;
    const entity = new Entity(id);
    this.#entities.set(id, entity);
    return entity;
  }

  /**
   * Remove an entity
   * @param {string} id - Entity ID
   */
  removeEntity(id) {
    const entity = this.#entities.get(id);
    if (entity) {
      entity.dispose();
      this.#entities.delete(id);
    }
  }

  /**
   * Get an entity by ID
   * @param {string} id - Entity ID
   * @returns {Entity|null} The entity or null if not found
   */
  getEntity(id) {
    return this.#entities.get(id) || null;
  }

  /**
   * Get all entities
   * @returns {Array<Entity>} Array of entities
   */
  getEntities() {
    return Array.from(this.#entities.values());
  }

  /**
   * Add a system
   * @param {System} system - System to add
   * @returns {World} This world for chaining
   */
  addSystem(system) {
    const systemName = system.constructor.name;
    this.#systems.set(systemName, system);
    system.setWorld(this);
    system.initialize();
    return this;
  }

  /**
   * Remove a system
   * @param {string} name - System name
   */
  removeSystem(name) {
    const system = this.#systems.get(name);
    if (system) {
      system.dispose();
      this.#systems.delete(name);
    }
  }

  /**
   * Get a system by name
   * @param {string} name - System name
   * @returns {System|null} The system or null if not found
   */
  getSystem(name) {
    return this.#systems.get(name) || null;
  }

  /**
   * Get all systems
   * @returns {Array<System>} Array of systems
   */
  getSystems() {
    return Array.from(this.#systems.values());
  }

  /**
   * Update the world
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Update systems in priority order
    const systems = this.getSystems().sort((a, b) => a.getPriority() - b.getPriority());
    for (const system of systems) {
      system.update(deltaTime);
    }
  }

  /**
   * Find entities with specific components
   * @param {Array<string>} components - Required component names
   * @returns {Array<Entity>} Matching entities
   */
  findEntitiesWithComponents(components) {
    return this.getEntities().filter(entity =>
      components.every(component => entity.hasComponent(component))
    );
  }

  /**
   * Find entities with specific tags
   * @param {Array<string>} tags - Required tags
   * @returns {Array<Entity>} Matching entities
   */
  findEntitiesWithTags(tags) {
    return this.getEntities().filter(entity => tags.every(tag => entity.hasTag(tag)));
  }

  /**
   * Serialize world state
   * @returns {Object} Serialized world state
   */
  serialize() {
    return {
      entities: Array.from(this.#entities.entries()).map(([id, entity]) => ({
        id,
        components: Array.from(entity.getComponents().entries()).map(([name, component]) => ({
          name,
          data: component.serialize(),
        })),
        tags: Array.from(entity.getTags()),
        active: entity.isActive(),
      })),
    };
  }

  /**
   * Deserialize world state
   * @param {Object} data - Serialized world state
   */
  deserialize(data) {
    // Clear existing entities
    for (const entity of this.#entities.values()) {
      entity.dispose();
    }
    this.#entities.clear();

    // Restore entities
    for (const entityData of data.entities) {
      const entity = this.createEntity();

      // Restore components
      for (const componentData of entityData.components) {
        const component = this.#createComponent(componentData.name);
        component.deserialize(componentData.data);
        entity.addComponent(component);
      }

      // Restore tags
      for (const tag of entityData.tags) {
        entity.addTag(tag);
      }

      entity.setActive(entityData.active);
    }
  }

  /**
   * Create a component instance
   * @private
   * @param {string} name - Component name
   * @returns {Component} New component instance
   */
  #createComponent(name) {
    // This would need to be implemented based on your component registry
    throw new Error(`Component type not found: ${name}`);
  }

  /**
   * Clean up world resources
   */
  dispose() {
    // Dispose all entities
    for (const entity of this.#entities.values()) {
      entity.dispose();
    }
    this.#entities.clear();

    // Dispose all systems
    for (const system of this.#systems.values()) {
      system.dispose();
    }
    this.#systems.clear();

    this.#isInitialized = false;
  }
}
