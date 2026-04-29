/**
 * Handles mouse input for the game
 */
export class MouseInputHandler {
  #mousePosition = { x: 0, y: 0 };
  #mouseButtons = new Map();
  #eventListeners = new Map();
  #eventSystem = null;

  // Mouse button codes
  static MOUSE_BUTTONS = {
    LEFT: 0,
    MIDDLE: 1,
    RIGHT: 2,
  };

  constructor() {
    this.#initializeEventListeners();
  }

  /**
   * Set the event system for mouse events
   * @param {EventSystem} eventSystem - The event system to use
   * @returns {MouseInputHandler} This handler for chaining
   */
  setEventSystem(eventSystem) {
    if (!eventSystem || typeof eventSystem.emit !== 'function') {
      console.warn('MouseInputHandler: Invalid event system provided');
      return this;
    }
    this.#eventSystem = eventSystem;
    return this;
  }

  /**
   * Initialize mouse event listeners
   * @private
   */
  #initializeEventListeners() {
    this.#addEventListener('mousemove', this.#handleMouseMove.bind(this));
    this.#addEventListener('mousedown', this.#handleMouseDown.bind(this));
    this.#addEventListener('mouseup', this.#handleMouseUp.bind(this));
    this.#addEventListener('mouseleave', this.#handleMouseLeave.bind(this));
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
   * Handle mouse move event
   * @private
   * @param {MouseEvent} event - Mouse event
   */
  #handleMouseMove(event) {
    this.#mousePosition = {
      x: event.clientX,
      y: event.clientY,
    };
    
    // Emit mouse move event if event system is available
    if (this.#eventSystem) {
      this.#eventSystem.emit('input:mousemove', {
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle mouse down event
   * @private
   * @param {MouseEvent} event - Mouse event
   */
  #handleMouseDown(event) {
    this.#mouseButtons.set(event.button, {
      pressed: true,
      timestamp: Date.now(),
    });
    
    // Emit mouse down event if event system is available
    if (this.#eventSystem) {
      this.#eventSystem.emit('input:mousedown', {
        button: event.button,
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle mouse up event
   * @private
   * @param {MouseEvent} event - Mouse event
   */
  #handleMouseUp(event) {
    this.#mouseButtons.delete(event.button);
    
    // Emit mouse up event if event system is available
    if (this.#eventSystem) {
      this.#eventSystem.emit('input:mouseup', {
        button: event.button,
        x: event.clientX,
        y: event.clientY,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle mouse leave event
   * @private
   * @param {MouseEvent} event - Mouse event
   */
  #handleMouseLeave(event) {
    this.#mouseButtons.clear();
  }

  /**
   * Check if a mouse button is pressed
   * @param {number} button - Mouse button to check
   * @returns {boolean} Whether the button is pressed
   */
  isMouseButtonPressed(button) {
    return this.#mouseButtons.has(button);
  }

  /**
   * Get current mouse position
   * @returns {{x: number, y: number}} Mouse position
   */
  getMousePosition() {
    return { ...this.#mousePosition };
  }

  /**
   * Clear all mouse states
   */
  clear() {
    this.#mouseButtons.clear();
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