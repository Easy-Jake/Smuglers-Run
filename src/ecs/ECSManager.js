import { World } from './World.js';
import { EntityBuilder } from './EntityBuilder.js';
import { ComponentRegistry } from './ComponentRegistry.js';
import { SystemRegistry } from './SystemRegistry.js';
import { TransformComponent } from './components/TransformComponent.js';
import { VelocityComponent } from './components/VelocityComponent.js';
import { SensorComponent } from './components/SensorComponent.js';
import { MovementSystem } from './systems/MovementSystem.js';
import { QuadrantExplorationSystem } from './systems/QuadrantExplorationSystem.js';
import { ExplorationUISystem } from '../ui/systems/ExplorationUISystem.js';

/**
 * ECS Manager - central access point for the Entity Component System
 * Coordinates entities, components, and systems, providing a unified API
 */
export class ECSManager {
  /**
   * Create a new ECS Manager
   */
  constructor() {
    this.world = new World();
    this.componentRegistry = new ComponentRegistry();
    this.systemRegistry = new SystemRegistry();
    this.entityBuilder = new EntityBuilder(this.world, this.componentRegistry);
    this.configManager = null;
    this.initialized = false;
  }

  /**
   * Set the config manager
   * @param {ConfigManager} configManager - The config manager to use
   * @returns {ECSManager} This manager for chaining
   */
  setConfigManager(configManager) {
    this.configManager = configManager;
    return this;
  }

  /**
   * Initialize the ECS Manager and register default components and systems
   * @returns {Promise<boolean>} Promise that resolves when initialization is complete
   */
  async initialize() {
    if (this.initialized) return true;
    
    try {
      // Register default components
      this.registerDefaultComponents();
      
      // Register default systems
      this.registerDefaultSystems();
      
      // Initialize systems in order
      await this.initializeSystems();
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize ECS Manager:', error);
      throw error;
    }
  }

  /**
   * Register default component types
   * @private
   */
  registerDefaultComponents() {
    // Register the TransformComponent
    this.componentRegistry.register('TransformComponent', TransformComponent, {
      required: ['position', 'rotation', 'scale']
    });
    
    // Register the VelocityComponent
    this.componentRegistry.register('VelocityComponent', VelocityComponent, {
      required: ['x', 'y']
    });
    
    // Register the SensorComponent
    this.componentRegistry.register('SensorComponent', SensorComponent, {
      required: ['range', 'enabled']
    });
    
    // Additional components would be registered here
  }

  /**
   * Register default system types
   * @private
   */
  registerDefaultSystems() {
    // Get system configuration from ConfigManager if available
    const maxSpeed = this.configManager ? 
      this.configManager.get('game.PLAYER.MAX_SPEED', 10) : 10;
    
    const damping = this.configManager ?
      this.configManager.get('physics.damping', 0.99) : 0.99;
    
    // Register the MovementSystem with configuration
    this.systemRegistry.register('MovementSystem', MovementSystem, {
      priority: 10,
      options: {
        maxSpeed,
        damping
      }
    });
    
    // Register the QuadrantExplorationSystem
    const explorationRange = this.configManager ?
      this.configManager.get('player.SENSOR_RANGE', 200) : 200;
    
    this.systemRegistry.register('QuadrantExplorationSystem', QuadrantExplorationSystem, {
      priority: 50,
      options: {
        explorationRange,
        visibleRangeModifier: 1.0
      }
    });
    
    // Register the ExplorationUISystem
    this.systemRegistry.register('ExplorationUISystem', ExplorationUISystem, {
      priority: 100,
      options: {
        uiOptions: {
          containerId: 'exploration-progress',
          showPercentage: true,
          showCount: true
        },
        visible: true
      }
    });
    
    // Additional systems would be registered here
  }

  /**
   * Initialize systems in dependency order
   * @private
   * @returns {Promise<void>} Promise that resolves when all systems are initialized
   */
  async initializeSystems() {
    const orderedSystems = this.systemRegistry.getOrderedSystemNames();
    
    for (const systemName of orderedSystems) {
      try {
        // Get system options from registry
        const systemInfo = this.systemRegistry.getSystemInfo(systemName);
        const system = this.systemRegistry.create(systemName, systemInfo.options || {});
        
        // Add the system to the world
        this.world.addSystem(system);
      } catch (error) {
        console.error(`Failed to initialize system '${systemName}':`, error);
        throw error;
      }
    }
  }

  /**
   * Register a component type
   * @param {string} name - Component type name
   * @param {Function} constructor - Component constructor
   * @param {Object} schema - Optional JSON schema for component data validation
   * @returns {ECSManager} This ECS Manager for chaining
   */
  registerComponent(name, constructor, schema = null) {
    this.componentRegistry.register(name, constructor, schema);
    return this;
  }

  /**
   * Register a system type
   * @param {string} name - System type name
   * @param {Function} constructor - System constructor
   * @param {Object} options - System registration options
   * @returns {ECSManager} This ECS Manager for chaining
   */
  registerSystem(name, constructor, options = {}) {
    this.systemRegistry.register(name, constructor, options);
    return this;
  }

  /**
   * Create a new entity builder for fluent entity creation
   * @returns {EntityBuilder} The entity builder
   */
  createEntity() {
    return this.entityBuilder.create();
  }

  /**
   * Create a predefined entity type
   * @param {string} type - Entity type name
   * @param {Object} options - Entity initialization options
   * @returns {Entity} The created entity
   */
  createEntityOfType(type, options = {}) {
    const builder = this.entityBuilder.create();
    
    // Apply type-specific configuration
    switch (type.toLowerCase()) {
      case 'player':
        return this.createPlayerEntity(builder, options);
      case 'enemy':
        return this.createEnemyEntity(builder, options);
      case 'asteroid':
        return this.createAsteroidEntity(builder, options);
      default:
        throw new Error(`Unknown entity type: ${type}`);
    }
  }

  /**
   * Create a player entity with common components
   * @param {EntityBuilder} builder - The entity builder to use
   * @param {Object} options - Player entity options
   * @returns {Entity} The created entity
   * @private
   */
  createPlayerEntity(builder, options = {}) {
    // Get player config settings
    const config = this.configManager ? this.configManager.get('game.PLAYER', {}) : {};
    
    // Starting position
    const x = options.x || config.START_X || 500;
    const y = options.y || config.START_Y || 500;
    
    // Create entity with required components
    const entity = builder
      .withTag('player')
      .withComponent('TransformComponent', {
        position: { x, y },
        rotation: options.rotation || 0,
        scale: { x: 1, y: 1 }
      })
      .withComponent('VelocityComponent', {
        x: 0,
        y: 0,
        maxSpeed: config.MAX_SPEED || 10
      })
      .withComponent('SensorComponent', {
        range: config.SENSOR_RANGE || 200,
        type: options.sensorType || 'standard',
        upgradeLevel: options.sensorLevel || 0
      })
      .build();
    
    return entity;
  }

  /**
   * Create an enemy entity
   * @private
   * @param {EntityBuilder} builder - Entity builder
   * @param {Object} options - Enemy initialization options
   * @returns {Entity} The enemy entity
   */
  createEnemyEntity(builder, options = {}) {
    const enemySpeed = this.configManager ? 
      this.configManager.get('game.ENEMIES.SPEED', 3) : 3;
    
    return builder
      .withTag('enemy')
      .withComponent('TransformComponent', {
        position: options.position || { x: 0, y: 0 },
        rotation: options.rotation || 0,
        scale: options.scale || { x: 1, y: 1 }
      })
      .withComponent('VelocityComponent', {
        x: 0,
        y: 0,
        angular: 0,
        maxSpeed: enemySpeed
      })
      .build();
  }

  /**
   * Create an asteroid entity
   * @private
   * @param {EntityBuilder} builder - Entity builder
   * @param {Object} options - Asteroid initialization options
   * @returns {Entity} The asteroid entity
   */
  createAsteroidEntity(builder, options = {}) {
    return builder
      .withTag('asteroid')
      .withComponent('TransformComponent', {
        position: options.position || { x: 0, y: 0 },
        rotation: options.rotation || 0,
        scale: options.scale || { x: 1, y: 1 }
      })
      .build();
  }

  /**
   * Get an entity by ID
   * @param {string} id - Entity ID
   * @returns {Entity|null} The entity or null if not found
   */
  getEntity(id) {
    return this.world.getEntity(id);
  }

  /**
   * Get all entities
   * @returns {Array<Entity>} Array of entities
   */
  getEntities() {
    return this.world.getEntities();
  }

  /**
   * Remove an entity by ID
   * @param {string} id - Entity ID
   */
  removeEntity(id) {
    this.world.removeEntity(id);
  }

  /**
   * Get a system by name
   * @param {string} name - System name
   * @returns {System|null} The system or null if not found
   */
  getSystem(name) {
    return this.world.getSystem(name);
  }

  /**
   * Find entities with specific components
   * @param {Array<string>} componentTypes - Required component types
   * @returns {Array<Entity>} Matching entities
   */
  findEntitiesWithComponents(componentTypes) {
    return this.world.findEntitiesWithComponents(componentTypes);
  }

  /**
   * Find entities with specific tags
   * @param {Array<string>} tags - Required tags
   * @returns {Array<Entity>} Matching entities
   */
  findEntitiesWithTags(tags) {
    return this.world.findEntitiesWithTags(tags);
  }

  /**
   * Update the ECS world
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    if (!this.initialized) return;
    this.world.update(deltaTime);
  }

  /**
   * Reset the ECS world
   */
  reset() {
    this.world.dispose();
    this.world = new World();
    this.entityBuilder = new EntityBuilder(this.world, this.componentRegistry);
  }

  /**
   * Dispose of ECS resources
   */
  dispose() {
    this.world.dispose();
    this.componentRegistry.reset();
    this.systemRegistry.reset();
    this.initialized = false;
  }
} 