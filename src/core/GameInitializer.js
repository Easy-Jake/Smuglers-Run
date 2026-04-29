import { GameBootstrap } from './GameBootstrap.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { EventSystem } from '../ecs/systems/EventSystem.js';
import { CanvasManager } from '../managers/CanvasManager.js';
import { RenderManager } from './RenderManager.js';
import { InputManager } from '../managers/InputManager.js';
import { GameLoop } from './GameLoop.js';
import { GameState } from './GameState.js';

/**
 * Initializes the game and its services
 */
export class GameInitializer {
  constructor() {
    this.bootstrap = new GameBootstrap();
    this.gameState = new GameState();
  }

  /**
   * Initialize the game
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Register core services
      this.registerServices();

      // Initialize all services
      await this.bootstrap.initialize();

      // Start the game
      await this.bootstrap.start();
    } catch (error) {
      console.error('Game initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register all game services
   * @private
   */
  registerServices() {
    // Register config manager
    this.bootstrap.registerService('config', new ConfigManager());

    // Register event system
    this.bootstrap.registerService('eventSystem', new EventSystem());

    // Register canvas manager
    this.bootstrap.registerService('canvas', new CanvasManager());

    // Register render manager
    this.bootstrap.registerService('render', new RenderManager({
      targetFPS: 60,
      debug: false,
    }));

    // Register input manager
    this.bootstrap.registerService('input', new InputManager());

    // Register game loop
    this.bootstrap.registerService('gameLoop', new GameLoop(
      this.bootstrap.getService.bind(this.bootstrap),
      this.gameState
    ));
  }

  /**
   * Stop the game
   * @returns {Promise<void>}
   */
  async stop() {
    await this.bootstrap.stop();
  }
} 