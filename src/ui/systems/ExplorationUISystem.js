import { System } from '../../ecs/System.js';
import { ExplorationProgress } from '../components/ExplorationProgress.js';

/**
 * System responsible for updating the exploration UI based on exploration data
 */
export class ExplorationUISystem extends System {
  /**
   * Create a new ExplorationUISystem
   * @param {number} priority - System priority (lower runs first)
   * @param {Object} options - System options
   */
  constructor(priority = 100, options = {}) {
    super(priority);
    
    // Don't need specific components - only responds to events
    
    // UI options
    this.uiOptions = options.uiOptions || {};
    
    // Reference to exploration UI
    this.explorationUI = null;
    
    // Exploration data
    this.explorationData = {
      explored: 0,
      total: 0,
      percentage: 0,
      lastQuadrant: -1,
      lastUpdate: 0
    };
    
    // Throttle UI updates to avoid performance issues
    this.updateThrottleMs = options.updateThrottleMs || 100; // Minimum ms between UI updates
    this.lastUpdateTime = 0;
    
    // Event binding - bind handlers to maintain "this" context
    this.onQuadrantExplored = this.onQuadrantExplored.bind(this);
    this.onGameStateChanged = this.onGameStateChanged.bind(this);
    
    // Show the UI by default
    this.isVisible = options.visible !== undefined ? options.visible : true;
    
    // Flag to track initialization state
    this.isInitialized = false;
    
    // Fallback event system if needed
    this.fallbackEventSystem = null;
  }
  
  /**
   * Create a minimal event system if one is not available
   * @private
   * @returns {Object} A minimal event system
   */
  #createMinimalEventSystem() {
    const listeners = new Map();
    
    return {
      on: (event, callback) => {
        if (!listeners.has(event)) {
          listeners.set(event, new Set());
        }
        listeners.get(event).add(callback);
      },
      
      off: (event, callback) => {
        if (listeners.has(event)) {
          listeners.get(event).delete(callback);
          if (listeners.get(event).size === 0) {
            listeners.delete(event);
          }
        }
      },
      
      emit: (event, data) => {
        if (listeners.has(event)) {
          listeners.get(event).forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error(`Error in event listener for ${event}:`, error);
            }
          });
        }
      }
    };
  }
  
  /**
   * Initialize the system
   */
  initialize() {
    if (this.isInitialized) return;
    
    try {
      // Create exploration UI
      this.explorationUI = new ExplorationProgress(this.uiOptions);
      
      // Set initial visibility
      if (this.isVisible) {
        this.explorationUI.show();
      } else {
        this.explorationUI.hide();
      }
      
      // Subscribe to exploration events
      const world = this.getWorld();
      if (world && world.eventEmitter) {
        world.eventEmitter.on('quadrant:explored', this.onQuadrantExplored);
        world.eventEmitter.on('gamestate:changed', this.onGameStateChanged);
      } else {
        console.info('ExplorationUISystem: Creating minimal event system for development');
        // Create a minimal event system for development/testing
        this.fallbackEventSystem = this.#createMinimalEventSystem();
        this.fallbackEventSystem.on('quadrant:explored', this.onQuadrantExplored);
        this.fallbackEventSystem.on('gamestate:changed', this.onGameStateChanged);
        
        // Simulate initial state
        this.fallbackEventSystem.emit('gamestate:changed', {
          state: 'play'
        });
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('ExplorationUISystem: Failed to initialize', error);
      this.isInitialized = false;
    }
  }
  
  /**
   * Handle quadrant exploration events
   * @param {Object} data - Exploration event data
   */
  onQuadrantExplored(data) {
    if (!data) return;
    
    try {
      // Update exploration data
      this.explorationData = {
        explored: data.exploredCount || 0,
        total: data.totalCount || 1,
        percentage: data.explorationPercentage || 0,
        lastQuadrant: data.quadrantIndex,
        lastUpdate: data.timestamp || Date.now()
      };
      
      // Throttle UI updates for performance
      const now = Date.now();
      if (now - this.lastUpdateTime >= this.updateThrottleMs) {
        this.updateUI();
        this.lastUpdateTime = now;
      }
    } catch (error) {
      console.error('ExplorationUISystem: Error processing exploration event', error);
    }
  }
  
  /**
   * Update the exploration UI with current data
   * @private
   */
  updateUI() {
    if (this.explorationUI && this.isVisible) {
      try {
        this.explorationUI.update(this.explorationData);
      } catch (error) {
        console.error('ExplorationUISystem: Error updating UI', error);
      }
    }
  }
  
  /**
   * Handle game state changes
   * @param {Object} data - Game state event data
   */
  onGameStateChanged(data) {
    if (!data || !data.state) return;
    
    try {
      // Show UI only during gameplay, hide in menus
      const gameplayStates = ['play', 'exploring'];
      const shouldBeVisible = gameplayStates.includes(data.state);
      
      if (shouldBeVisible !== this.isVisible) {
        this.isVisible = shouldBeVisible;
        
        if (this.explorationUI) {
          if (this.isVisible) {
            this.explorationUI.show();
            
            // Force a UI update when becoming visible
            this.updateUI();
          } else {
            this.explorationUI.hide();
          }
        }
      }
    } catch (error) {
      console.error('ExplorationUISystem: Error handling game state change', error);
    }
  }
  
  /**
   * Process system update
   * This system doesn't need to process entities, it only responds to events
   * @param {number} deltaTime - Time since last update in seconds
   */
  update(deltaTime) {
    if (!this.isInitialized) {
      this.initialize();
      if (!this.isInitialized) return;
    }
    
    // We might want to occasionally update the UI even without events
    // especially if we have animations or time-based UI elements
    const now = Date.now();
    if (now - this.lastUpdateTime > 1000) { // Update at least once per second
      this.updateUI();
      this.lastUpdateTime = now;
    }
  }
  
  /**
   * Clean up the system
   */
  dispose() {
    try {
      // Unsubscribe from events
      const world = this.getWorld();
      if (world && world.eventEmitter) {
        world.eventEmitter.off('quadrant:explored', this.onQuadrantExplored);
        world.eventEmitter.off('gamestate:changed', this.onGameStateChanged);
      }
      
      // Clean up fallback event system if it was created
      if (this.fallbackEventSystem) {
        this.fallbackEventSystem.off('quadrant:explored', this.onQuadrantExplored);
        this.fallbackEventSystem.off('gamestate:changed', this.onGameStateChanged);
        this.fallbackEventSystem = null;
      }
      
      // Clean up UI
      if (this.explorationUI) {
        this.explorationUI.hide();
        this.explorationUI = null;
      }
      
      this.isInitialized = false;
      
      // Call parent dispose
      super.dispose();
    } catch (error) {
      console.error('ExplorationUISystem: Error disposing system', error);
      super.dispose();
    }
  }
} 