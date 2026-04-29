import { ServiceLocator } from './ServiceLocator.js';
import { AssetManager } from '../managers/AssetManager.js';
import { AudioManager } from '../managers/AudioManager.js';
import { CanvasManager } from '../managers/CanvasManager.js';
import { CollisionManager } from '../managers/CollisionManager.js';
import { InputManager } from '../managers/InputManager.js';
import { ResourceManager } from '../managers/ResourceManager.js';
import { StateManager } from '../managers/StateManager.js';
import { EventSystem } from '../ecs/systems/EventSystem.js';
import { RenderManager } from './RenderManager.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { ECSManager } from '../ecs/ECSManager.js';
import configManager from '../config/ConfigManager.js';

/**
 * Manages game service registration and dependencies
 */
export class ServiceRegistry {
  /**
   * Create a new service registry
   */
  constructor() {
    this.serviceLocator = new ServiceLocator();
    this.initialized = false;
  }

  /**
   * Register all game services and their dependencies
   */
  registerServices() {
    // Register core services first
    this.registerCoreServices();
    
    // Register manager services
    this.registerManagerServices();
    
    // Register ECS services
    this.registerECSServices();
    
    // Mark as initialized
    this.initialized = true;
  }

  /**
   * Register core services
   * @private
   */
  registerCoreServices() {
    // ConfigManager has no dependencies and is already instantiated
    this.serviceLocator.register('configManager', configManager);

    // EventSystem has no dependencies
    this.serviceLocator.registerFactory('eventSystem', () => {
      return new EventSystem();
    });

    // Canvas manager has no dependencies
    this.serviceLocator.registerFactory('canvasManager', () => {
      return new CanvasManager();
    });
  }

  /**
   * Register manager services
   * @private
   */
  registerManagerServices() {
    // Register RenderManager with canvasManager dependency
    this.serviceLocator.registerFactory('renderManager', async (canvasManager) => {
      try {
        // Create render manager with sensible defaults
        const renderManager = new RenderManager({
          targetFPS: 60,
          debug: false,
        });
        
        // Initialize canvas manager if needed
        if (!canvasManager.isInitialized()) {
          console.log('Initializing canvas manager for render manager');
          await canvasManager.initialize();
        }
        
        // Verify canvas manager was properly initialized 
        if (!canvasManager.getContext()) {
          console.error('RenderManager: Canvas manager initialization failed or returned no context');
          throw new Error('Canvas context unavailable');
        }
        
        // Set canvas manager for render manager
        renderManager.setCanvasManager(canvasManager);
        
        // Initialize the render manager
        await renderManager.initialize();
        
        return renderManager;
      } catch (error) {
        console.error('RenderManager factory error:', error);
        // Create a proper RenderManager instance with a stubbed canvas manager
        const fallbackManager = new RenderManager({
          targetFPS: 60,
          debug: false,
        });
        
        // Create a minimal canvas manager that won't crash
        const stubbedCanvasManager = {
          initialize: () => Promise.resolve(),
          isInitialized: () => true,
          getContext: () => ({
            clearRect: () => {},
            save: () => {},
            restore: () => {},
          }),
          getWidth: () => 800,
          getHeight: () => 600,
        };
        
        // Set the stubbed canvas manager
        fallbackManager.setCanvasManager(stubbedCanvasManager);
        
        // Initialize the fallback manager
        await fallbackManager.initialize();
        
        return fallbackManager;
      }
    }, ['canvasManager']);

    // Register InputManager with eventSystem dependency
    this.serviceLocator.registerFactory('inputManager', async (eventSystem) => {
      const inputManager = new InputManager();
      inputManager.setEventSystem(eventSystem);
      await inputManager.initialize();
      return inputManager;
    }, ['eventSystem']);

    // Register AudioManager with eventSystem and configManager dependencies
    this.serviceLocator.registerFactory('audioManager', (eventSystem, configManager) => {
      const audioManager = new AudioManager();
      audioManager.setEventSystem(eventSystem);
      audioManager.setConfigManager(configManager);
      return audioManager;
    }, ['eventSystem', 'configManager']);

    // Register AssetManager with eventSystem and configManager dependencies
    this.serviceLocator.registerFactory('assetManager', (eventSystem, configManager) => {
      const assetManager = new AssetManager();
      assetManager.setEventSystem(eventSystem);
      assetManager.setConfigManager(configManager);
      return assetManager;
    }, ['eventSystem', 'configManager']);

    // Register ResourceManager with eventSystem dependency
    this.serviceLocator.registerFactory('resourceManager', (eventSystem) => {
      const resourceManager = new ResourceManager();
      resourceManager.setEventSystem(eventSystem);
      return resourceManager;
    }, ['eventSystem']);

    // Register StateManager with eventSystem and configManager dependencies
    this.serviceLocator.registerFactory('stateManager', async (eventSystem, configManager) => {
      const stateManager = new StateManager();
      
      // Set event system first
      stateManager.setEventSystem(eventSystem);
      
      // Ensure history size is set properly before configManager is used
      if (stateManager.history && typeof stateManager.history.setMaxHistorySize === 'function') {
        stateManager.history.setMaxHistorySize(50); // Set a safe default
      }
      
      // Set config manager if available
      if (configManager && typeof configManager.get === 'function') {
        stateManager.setConfigManager(configManager);
        
        // Override history size with config value if available
        const historySize = configManager.get('state.historySize', 50);
        if (historySize > 0 && stateManager.history && 
            typeof stateManager.history.setMaxHistorySize === 'function') {
          console.log('Setting history size to', historySize);
          stateManager.history.setMaxHistorySize(historySize);
        } else {
          console.warn('StateManager: Invalid history size from config:', historySize);
        }
      } else {
        console.warn('StateManager: Invalid config manager provided');
      }
      
      return stateManager;
    }, ['eventSystem', 'configManager']);

    // Register CollisionManager with configManager dependency
    this.serviceLocator.registerFactory('collisionManager', (configManager) => {
      const worldSize = configManager.get('game.WORLD.SIZE');
      return new CollisionManager(worldSize);
    }, ['configManager']);
  }

  /**
   * Register ECS services
   * @private
   */
  registerECSServices() {
    // Register ECSManager
    this.serviceLocator.registerFactory('ecsManager', (configManager) => {
      const ecsManager = new ECSManager();
      ecsManager.setConfigManager(configManager);
      return ecsManager;
    }, ['configManager']);
  }

  /**
   * Initialize all registered services
   * @returns {Promise<void>}
   */
  async initializeServices() {
    if (!this.initialized) {
      this.registerServices();
    }
    
    try {
      // Initialize services in the correct order
      await this.serviceLocator.initializeAll();
      
      // Verify critical services are available
      const criticalServices = ['renderManager', 'canvasManager', 'eventSystem'];
      for (const serviceName of criticalServices) {
        const service = this.serviceLocator.get(serviceName);
        if (!service) {
          throw new Error(`Critical service ${serviceName} is not available`);
        }
      }
      
      // Perform any post-initialization setup
      await this.setupServiceConnections();
    } catch (error) {
      console.error('ServiceRegistry: Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * Set up connections between services after initialization
   * @private
   * @returns {Promise<void>}
   */
  async setupServiceConnections() {
    // Initialize ECS Manager
    if (this.serviceLocator.isInitialized('ecsManager')) {
      const ecsManager = this.serviceLocator.get('ecsManager');
      await ecsManager.initialize().catch(error => {
        console.error('Failed to initialize ECS Manager:', error);
        throw error;
      });
    }
  }

  /**
   * Get the service locator
   * @returns {ServiceLocator} The service locator
   */
  getServiceLocator() {
    return this.serviceLocator;
  }

  /**
   * Get a service by name
   * @param {string} name - Service name
   * @returns {Object} Service instance
   */
  getService(name) {
    return this.serviceLocator.get(name);
  }
} 