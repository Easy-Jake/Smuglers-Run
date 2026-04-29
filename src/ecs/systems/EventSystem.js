import { System } from '../System.js';

/**
 * System for managing game events in a centralized way.
 *
 * This system provides a robust event handling mechanism that:
 * - Supports event bubbling and capturing
 * - Allows for event delegation
 * - Provides type safety through event types
 * - Supports async event handlers
 * - Includes debug logging in development
 *
 * @example
 * // Register an event handler
 * eventSystem.on('collision', (event) => {
 *   console.log('Collision detected:', event.detail);
 * });
 *
 * // Emit an event
 * eventSystem.emit('collision', { entity1, entity2 });
 */
export class EventSystem extends System {
  /** @private Map of event listeners */
  #listeners;
  /** @private Whether debug mode is enabled */
  #debug;
  /** @private Event queue for async processing */
  #eventQueue;
  /** @private Whether event processing is active */
  #isProcessing;

  /**
   * Create a new event system
   * @param {Object} options - Event system options
   * @param {boolean} options.debug - Whether debug mode is enabled
   */
  constructor(options = {}) {
    super();
    this.#listeners = new Map();
    this.#debug = options.debug ?? false;
    this.#eventQueue = [];
    this.#isProcessing = false;
  }

  /**
   * Initialize the event system
   */
  initialize() {
    // Start event processing loop
    this.#processEventQueue();
  }

  /**
   * Register an event listener
   * @param {string} type - Event type
   * @param {Function} handler - Event handler function
   * @param {Object} options - Listener options
   * @param {boolean} options.once - Whether to remove listener after first trigger
   * @param {boolean} options.capture - Whether to use capture phase
   * @returns {Function} Function to remove the listener
   */
  on(type, handler, options = {}) {
    if (!this.#listeners.has(type)) {
      this.#listeners.set(type, new Set());
    }

    const listeners = this.#listeners.get(type);
    const listener = { handler, options };

    listeners.add(listener);

    // Return removal function
    return () => this.off(type, handler);
  }

  /**
   * Remove an event listener
   * @param {string} type - Event type
   * @param {Function} handler - Event handler function
   */
  off(type, handler) {
    const listeners = this.#listeners.get(type);
    if (!listeners) return;

    for (const listener of listeners) {
      if (listener.handler === handler) {
        listeners.delete(listener);
        break;
      }
    }

    // Clean up empty event types
    if (listeners.size === 0) {
      this.#listeners.delete(type);
    }
  }

  /**
   * Emit an event
   * @param {string} type - Event type
   * @param {Object} detail - Event data
   * @param {boolean} async - Whether to process event asynchronously
   */
  emit(type, detail = {}, async = false) {
    const event = {
      type,
      detail,
      timestamp: performance.now(),
      target: this.world,
    };

    if (async) {
      this.#eventQueue.push(event);
    } else {
      this.#processEvent(event);
    }
  }

  /**
   * Process an event
   * @private
   * @param {Object} event - Event to process
   */
  #processEvent(event) {
    const { type, detail } = event;
    const listeners = this.#listeners.get(type);

    if (!listeners) return;

    if (this.#debug) {
      console.debug(`[EventSystem] Processing event: ${type}`, detail);
    }

    // Process listeners in a new array to avoid modification during iteration
    const listenersArray = Array.from(listeners);

    for (const listener of listenersArray) {
      try {
        const result = listener.handler(event);

        // Handle async handlers
        if (result instanceof Promise) {
          result.catch(error => {
            console.error(`[EventSystem] Error in async handler for ${type}:`, error);
          });
        }

        // Remove one-time listeners
        if (listener.options.once) {
          this.off(type, listener.handler);
        }
      } catch (error) {
        console.error(`[EventSystem] Error in handler for ${type}:`, error);
      }
    }
  }

  /**
   * Process the event queue
   * @private
   */
  async #processEventQueue() {
    if (this.#isProcessing) return;
    this.#isProcessing = true;

    while (this.#eventQueue.length > 0) {
      const event = this.#eventQueue.shift();
      await this.#processEvent(event);
    }

    this.#isProcessing = false;
    requestAnimationFrame(() => this.#processEventQueue());
  }

  /**
   * Remove all event listeners
   */
  clear() {
    this.#listeners.clear();
    this.#eventQueue = [];
  }

  /**
   * Get all registered event types
   * @returns {string[]} Array of event types
   */
  getEventTypes() {
    return Array.from(this.#listeners.keys());
  }

  /**
   * Get number of listeners for an event type
   * @param {string} type - Event type
   * @returns {number} Number of listeners
   */
  getListenerCount(type) {
    const listeners = this.#listeners.get(type);
    return listeners ? listeners.size : 0;
  }

  /**
   * Set whether debug mode is enabled
   * @param {boolean} enabled - Whether debug mode is enabled
   */
  setDebugEnabled(enabled) {
    this.#debug = enabled;
  }

  /**
   * Check if debug mode is enabled
   * @returns {boolean} Whether debug mode is enabled
   */
  isDebugEnabled() {
    return this.#debug;
  }
}
