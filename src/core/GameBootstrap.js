import { BaseService } from './services/BaseService.js';
import { EventTypes } from '../ecs/events/EventTypes.js';

/**
 * Manages game initialization and service lifecycle
 */
export class GameBootstrap {
  constructor() {
    this.services = new Map();
    this.initializationOrder = [
      'config',
      'eventSystem',
      'canvas',
      'render',
      'input',
      'gameLoop'
    ];
    this.state = 'uninitialized';
    this.error = null;
  }

  /**
   * Register a service
   * @param {string} name - Service name
   * @param {BaseService} service - Service instance
   */
  registerService(name, service) {
    if (!(service instanceof BaseService)) {
      throw new Error(`Service ${name} must extend BaseService`);
    }
    this.services.set(name, service);
  }

  /**
   * Get a service by name
   * @param {string} name - Service name
   * @returns {BaseService|null}
   */
  getService(name) {
    return this.services.get(name) || null;
  }

  /**
   * Initialize all services in the correct order
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.state === 'initialized') return;
    if (this.state === 'initializing') return;

    this.state = 'initializing';
    this.error = null;

    try {
      // Initialize services in order
      for (const serviceName of this.initializationOrder) {
        const service = this.services.get(serviceName);
        if (!service) {
          throw new Error(`Missing required service: ${serviceName}`);
        }
        await service.initialize();
      }

      // Set up service dependencies
      await this.setupServiceDependencies();

      // Verify all services are ready
      await this.verifyServices();

      this.state = 'initialized';
    } catch (error) {
      this.state = 'error';
      this.error = error;
      throw error;
    }
  }

  /**
   * Set up dependencies between services
   * @private
   * @returns {Promise<void>}
   */
  async setupServiceDependencies() {
    // Set up dependencies between services
    const renderManager = this.getService('renderManager');
    const canvasManager = this.getService('canvasManager');
    if (renderManager && canvasManager) {
      renderManager.addDependency('canvasManager', canvasManager);
    }

    const inputManager = this.getService('inputManager');
    const eventSystem = this.getService('eventSystem');
    if (inputManager && eventSystem) {
      inputManager.addDependency('eventSystem', eventSystem);
    }

    // Add more dependencies as needed
  }

  /**
   * Verify all services are ready
   * @private
   * @returns {Promise<void>}
   */
  async verifyServices() {
    for (const [name, service] of this.services) {
      if (!service.isReady()) {
        throw new Error(`Service ${name} failed to initialize: ${service.getError()?.message || 'Unknown error'}`);
      }
    }
  }

  /**
   * Start the game
   * @returns {Promise<void>}
   */
  async start() {
    if (this.state !== 'initialized') {
      throw new Error('Game must be initialized before starting');
    }

    const gameLoop = this.getService('gameLoop');
    if (!gameLoop) {
      throw new Error('GameLoop service not found');
    }

    await gameLoop.start();
  }

  /**
   * Stop the game
   * @returns {Promise<void>}
   */
  async stop() {
    const gameLoop = this.getService('gameLoop');
    if (gameLoop) {
      gameLoop.stop();
    }
  }

  /**
   * Get the current state
   * @returns {string}
   */
  getState() {
    return this.state;
  }

  /**
   * Get any initialization error
   * @returns {Error|null}
   */
  getError() {
    return this.error;
  }
} 