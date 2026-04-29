import { GAME_CONFIG } from '../config/gameConfig.js';
import { Player } from '../entities/Player.js';
import { Asteroid } from '../entities/Asteroid.js';
import { Ship as EnemyShip } from '../entities/Ship.js';
import { Station } from '../entities/Station.js';
import { Projectile } from '../entities/Projectile.js';
import { Particle } from '../entities/Particle.js';
import { Cargo } from '../entities/Cargo.js';
import { UIManager } from '../ui/UIManager.js';
import { GameState } from './GameState.js';
import { EventTypes } from '../ecs/events/EventTypes.js';
import { World } from '../ecs/World.js';
import { getSceneAssets } from '../config/assets.js';
import { PerformanceGraph } from '../utils/PerformanceGraph.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { PerformanceOptimizer } from '../utils/PerformanceOptimizer.js';
import { GameInitializer } from './GameInitializer.js';
import { GameLoop } from './GameLoop.js';
import { CollisionHandler } from './CollisionHandler.js';
import { ServiceRegistry } from './ServiceRegistry.js';

/**
 * Main Game class - coordinates game initialization and lifecycle
 */
export class Game {
  /**
   * Create a new Game instance
   */
  constructor() {
    // Game state
    this.gameState = null;
    
    // UI manager
    this.ui = null;
    
    // Service registry and locator
    this.serviceRegistry = new ServiceRegistry();
    
    // Game systems
    this.gameInitializer = null;
    this.gameLoop = null;
    this.collisionHandler = null;
    
    // Performance monitoring
    this.performanceMonitor = null;
    
    // Background stars
    this.stars = [];
    
    // Initialization status
    this.initialized = false;
  }

  /**
   * Initialize the game
   * @returns {Promise<boolean>} Promise that resolves when initialization is complete
   * @throws {Error} If game initialization fails
   */
  async initialize() {
    try {
      // Initialize UI elements
      await this.initializeUI();
      
      // Register and initialize all services
      this.serviceRegistry.registerServices();
      await this.serviceRegistry.initializeServices();
      
      // Get service references
      const services = this.getServices();
      
      // Initialize game state
      this.gameState = new GameState();
      
      // Initialize UI with game state
      this.ui = new UIManager(this.gameState);
      
      // Initialize game components with services
      this.gameInitializer = new GameInitializer(services, this.gameState);
      this.gameLoop = new GameLoop(services, this.gameState);
      this.collisionHandler = new CollisionHandler(services, this.gameState);
      
      // Initialize performance monitoring
      this.performanceMonitor = new PerformanceMonitor();
      
      // Set up event listeners
      this.setupEventListeners(services.eventSystem);
      
      // Mark as initialized
      this.initialized = true;
      
      return true;
    } catch (error) {
      this.handleInitializationError(error);
      throw error;
    }
  }

  /**
   * Initialize game UI elements
   * @private
   * @returns {Promise<void>}
   */
  async initializeUI() {
    const gameUI = document.getElementById('gameUI');
    if (!gameUI) {
      throw new Error('Game UI element not found');
    }

    // Remove 'not-started' class to ensure elements are rendered in the DOM
    gameUI.classList.remove('not-started');
    // Add 'started' class to make it visible according to CSS
    gameUI.classList.add('started');

    // Small delay to ensure DOM updates have been applied
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Get all initialized services
   * @private
   * @returns {Object} Object with service references
   */
  getServices() {
    const locator = this.serviceRegistry.getServiceLocator();
    
    return {
      eventSystem: locator.get('eventSystem'),
      canvasManager: locator.get('canvasManager'),
      renderManager: locator.get('renderManager'),
      inputManager: locator.get('inputManager'),
      audioManager: locator.get('audioManager'),
      assetManager: locator.get('assetManager'),
      resourceManager: locator.get('resourceManager'),
      stateManager: locator.get('stateManager'),
      collisionManager: locator.get('collisionManager')
    };
  }

  /**
   * Set up event listeners
   * @private
   * @param {EventSystem} eventSystem - The event system
   */
  setupEventListeners(eventSystem) {
    // Game state events
    eventSystem.on(EventTypes.GAME_STATE_CHANGED, (data) => {
      if (this.ui) {
        this.ui.updateState(data);
      }
    });
    
    // Canvas click handler for trading UI
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      canvas.addEventListener('click', (e) => {
        if (this.gameState?.tradingActive && this.gameLoop) {
          const rect = canvas.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          this.gameLoop.handleTradeClick(mouseX, mouseY);
        }
      });
    }
  }

  /**
   * Start the game
   */
  start() {
    if (!this.initialized) {
      throw new Error('Game not initialized');
    }
    
    // Start game state
    this.gameState.startGame();
    
    // Generate background stars
    this.generateStars();
    
    // Start the game loop
    this.gameLoop.start();
    
    // Start performance monitoring
    this.performanceMonitor.start();
    
    // Emit game started event
    const services = this.getServices();
    services.eventSystem.emit(EventTypes.GAME_STARTED, {
      timestamp: performance.now()
    });
  }

  /**
   * Generate background stars
   * @private
   */
  generateStars() {
    const worldSize = GAME_CONFIG.WORLD.SIZE;
    const starCount = GAME_CONFIG.WORLD.STAR_COUNT;
    this.gameState.stars = [];
    for (let i = 0; i < starCount; i++) {
      this.gameState.stars.push({
        x: Math.random() * worldSize,
        y: Math.random() * worldSize,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.5 + 0.3,
      });
    }
  }

  /**
   * Handle initialization errors
   * @private
   * @param {Error} error - The error that occurred
   */
  handleInitializationError(error) {
    console.error('Failed to initialize game:', error);

    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = `Failed to initialize game: ${error.message}`;
    document.body.appendChild(errorMessage);

    // Remove error message after 5 seconds
    setTimeout(() => {
      errorMessage.remove();
    }, 5000);

    // Clean up any initialized resources
    this.cleanup();
  }

  /**
   * Clean up game resources
   */
  cleanup() {
    try {
      // Stop the game loop if it's running
      if (this.gameLoop) {
        this.gameLoop.stop();
      }
      
      // Clean up services
      if (this.serviceRegistry) {
        const locator = this.serviceRegistry.getServiceLocator();
        
        // Clean up canvas manager
        if (locator.isInitialized('canvasManager')) {
          locator.get('canvasManager').destroy();
        }
        
        // Clean up audio manager
        if (locator.isInitialized('audioManager')) {
          locator.get('audioManager').dispose();
        }
        
        // Clean up resource manager
        if (locator.isInitialized('resourceManager')) {
          locator.get('resourceManager').dispose();
        }
        
        // Reset service locator
        locator.reset();
      }
      
      // Reset state
      this.initialized = false;
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Private singleton instance
let gameInstance = null;

/**
 * Get the game instance
 * @returns {Game} The game instance
 */
export function getGameInstance() {
  if (!gameInstance) {
    gameInstance = new Game();
  }
  return gameInstance;
}

// For backward compatibility
export default getGameInstance();
