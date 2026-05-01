/**
 * Handles keyboard input for the game
 */
export class KeyboardInputHandler {
  #keys = new Map();
  #eventListeners = new Map();
  #eventSystem = null;

  // Key codes for common actions
  static KEY_CODES = {
    UP: ['ArrowUp', 'w', 'W'],
    DOWN: ['ArrowDown', 's', 'S'],
    LEFT: ['ArrowLeft', 'a', 'A'],
    RIGHT: ['ArrowRight', 'd', 'D'],
    SHOOT: ['Space'],
    PAUSE: ['Escape'],
    INTERACT: ['e', 'E'],
    INVENTORY: ['i', 'I'],
    MAP: ['m', 'M'],
  };

  constructor() {
    this.#initializeEventListeners();
  }

  /**
   * Set the event system for input events
   * @param {EventSystem} eventSystem - The event system to use
   * @returns {KeyboardInputHandler} This handler for chaining
   */
  setEventSystem(eventSystem) {
    if (!eventSystem || typeof eventSystem.emit !== 'function') {
      console.warn('KeyboardInputHandler: Invalid event system provided');
      return this;
    }
    this.#eventSystem = eventSystem;
    return this;
  }

  /**
   * Initialize keyboard event listeners
   * @private
   */
  #initializeEventListeners() {
    this.#addEventListener('keydown', this.#handleKeyDown.bind(this));
    this.#addEventListener('keyup', this.#handleKeyUp.bind(this));
  }

  /**
   * Add event listener with cleanup tracking
   * @private
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  #addEventListener(event, handler) {
    window.addEventListener(event, handler);
    this.#eventListeners.set(event, handler);
  }

  /**
   * Handle key down event
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  #handleKeyDown(event) {
    // Prevent browser defaults for game keys
    if (event.key === 'Tab' || event.key === ' ') {
      event.preventDefault();
    }

    if (!event.repeat) {
      this.#keys.set(event.key, {
        pressed: true,
        timestamp: Date.now(),
      });
      
      // Emit keyboard event if event system is available
      if (this.#eventSystem) {
        this.#eventSystem.emit('input:keydown', {
          key: event.key,
          code: event.code,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Handle key up event
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  #handleKeyUp(event) {
    this.#keys.delete(event.key);
    
    // Emit keyboard event if event system is available
    if (this.#eventSystem) {
      this.#eventSystem.emit('input:keyup', {
        key: event.key,
        code: event.code,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Check if a key is currently pressed
   * @param {string} key - Key to check
   * @returns {boolean} Whether the key is pressed
   */
  isKeyPressed(key) {
    return this.#keys.has(key);
  }

  /**
   * Check if any key in a group is pressed
   * @param {string} group - Key group to check
   * @returns {boolean} Whether any key in the group is pressed
   */
  isKeyGroupPressed(group) {
    return KeyboardInputHandler.KEY_CODES[group]?.some(key => this.isKeyPressed(key)) || false;
  }

  /**
   * Clear all keyboard states
   */
  clear() {
    this.#keys.clear();
  }

  /**
   * Clean up resources
   */
  dispose() {
    // Remove all event listeners
    for (const [event, handler] of this.#eventListeners) {
      window.removeEventListener(event, handler);
    }
    this.#eventListeners.clear();
    this.clear();
  }
} 