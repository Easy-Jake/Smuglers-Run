/**
 * Manages game state in a reactive and organized way.
 * Supports state subscriptions, history, and efficient updates.
 */
import { StateStorage } from './components/StateStorage.js';
import { StateHistory } from './components/StateHistory.js';
import { StateSubscriber } from './components/StateSubscriber.js';

export class StateManager {
  #state = new Map();
  #isInitialized = false;
  #eventSystem = null;
  #configManager = null;

  constructor() {
    this.storage = new StateStorage();
    this.history = new StateHistory();
    this.subscriber = new StateSubscriber();
    this.#initializeDefaultState();
  }

  /**
   * Set the event system for state events
   * @param {EventSystem} eventSystem - The event system to use
   * @returns {StateManager} This manager for chaining
   */
  setEventSystem(eventSystem) {
    if (!eventSystem || typeof eventSystem.emit !== 'function') {
      console.warn('StateManager: Invalid event system provided');
      return this;
    }
    this.#eventSystem = eventSystem;
    this.subscriber.setEventSystem(eventSystem);
    return this;
  }

  /**
   * Set the config manager for state configuration
   * @param {ConfigManager} configManager - The config manager to use
   * @returns {StateManager} This manager for chaining
   */
  setConfigManager(configManager) {
    if (!configManager) {
      console.warn('StateManager: Invalid config manager provided');
      return this;
    }
    this.#configManager = configManager;
    
    // Configure components with config manager
    const historySize = this.#configManager.get('state.historySize', 20);
    this.history.setMaxHistorySize(historySize);
    
    // Configure storage options if needed
    if (this.#configManager.get('state.persistEnabled', true)) {
      this.storage.setStorageKey(this.#configManager.get('state.storageKey', 'smugglers-run-state'));
    }
    
    return this;
  }

  /**
   * Initialize default game state
   * @private
   */
  #initializeDefaultState() {
    // Core game state
    this.#state.set('game', {
      status: 'idle', // idle, running, paused, gameOver
      score: 0,
      level: 1,
      difficulty: 'normal',
      time: 0,
      lastUpdate: Date.now(),
    });

    // Player state
    this.#state.set('player', {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      health: 100,
      energy: 100,
      inventory: [],
      equipped: null,
    });

    // World state
    this.#state.set('world', {
      entities: new Map(),
      resources: new Map(),
      events: [],
      weather: 'clear',
    });

    // UI state
    this.#state.set('ui', {
      activeMenu: null,
      notifications: [],
      tooltips: new Map(),
      selectedEntity: null,
    });

    // Input state
    this.#state.set('input', {
      lastInput: null,
      inputBuffer: [],
      isProcessing: false,
    });
  }

  /**
   * Initialize the state manager
   */
  async initialize() {
    if (this.#isInitialized) return;

    try {
      const savedState = await this.storage.load();
      if (savedState) {
        this.#state = this.storage.deserializeState(savedState);
      }
      this.#isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize state manager:', error);
      throw error;
    }
  }

  /**
   * Subscribe to state changes
   * @param {string} path - State path to subscribe to (e.g., 'player.health')
   * @param {Function} callback - Callback function to be called on state changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    return this.subscriber.subscribe(path, callback);
  }

  /**
   * Get state value at path
   * @param {string} path - State path (e.g., 'player.health')
   * @returns {*} State value
   */
  get(path) {
    return this.#getValueAtPath(path);
  }

  /**
   * Set state value at path
   * @param {string} path - State path (e.g., 'player.health')
   * @param {*} value - New value
   */
  set(path, value) {
    const oldValue = this.#getValueAtPath(path);
    this.#setValueAtPath(path, value);
    this.subscriber.notify(path, oldValue, value);
    this.history.add(path, oldValue, value);
    this.storage.save(this.#state);
  }

  /**
   * Update state with partial update
   * @param {string} path - State path
   * @param {Object} update - Partial update object
   */
  update(path, update) {
    const currentValue = this.#getValueAtPath(path);
    const newValue = { ...currentValue, ...update };
    this.set(path, newValue);
  }

  /**
   * Get value at path
   * @private
   * @param {string} path - State path
   * @returns {*} Value at path
   */
  #getValueAtPath(path) {
    const parts = path.split('.');
    let value = this.#state;

    for (const part of parts) {
      if (value instanceof Map) {
        value = value.get(part);
      } else {
        value = value[part];
      }
      if (value === undefined) return undefined;
    }

    return value;
  }

  /**
   * Set value at path
   * @private
   * @param {string} path - State path
   * @param {*} value - New value
   */
  #setValueAtPath(path, value) {
    const parts = path.split('.');
    let current = this.#state;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current instanceof Map) {
        if (!current.has(part)) {
          current.set(part, new Map());
        }
        current = current.get(part);
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }

    const lastPart = parts[parts.length - 1];
    if (current instanceof Map) {
      current.set(lastPart, value);
    } else {
      current[lastPart] = value;
    }
  }

  /**
   * Undo last state change
   * @returns {boolean} Whether undo was successful
   */
  undo() {
    const change = this.history.undo();
    if (change) {
      this.set(change.path, change.value);
    }
  }

  /**
   * Get state history
   * @returns {Array} State history
   */
  getHistory() {
    return this.history.getHistory();
  }

  /**
   * Clear state history
   */
  clearHistory() {
    this.history.clear();
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this.#state.clear();
    this.#initializeDefaultState();
    this.history.clear();
    this.storage.save(this.#state);
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.#state.clear();
    this.history.clear();
    this.subscriber.clear();
    this.#isInitialized = false;
  }
}
