/**
 * Handles touch input for the game
 */
export class TouchInputHandler {
  #touchPoints = new Map();
  #eventListeners = new Map();
  #eventSystem = null;

  constructor() {
    this.#initializeEventListeners();
  }

  /**
   * Set the event system for touch events
   * @param {EventSystem} eventSystem - The event system to use
   * @returns {TouchInputHandler} This handler for chaining
   */
  setEventSystem(eventSystem) {
    if (!eventSystem || typeof eventSystem.emit !== 'function') {
      console.warn('TouchInputHandler: Invalid event system provided');
      return this;
    }
    this.#eventSystem = eventSystem;
    return this;
  }

  /**
   * Initialize touch event listeners
   * @private
   */
  #initializeEventListeners() {
    this.#addEventListener('touchstart', this.#handleTouchStart.bind(this));
    this.#addEventListener('touchmove', this.#handleTouchMove.bind(this));
    this.#addEventListener('touchend', this.#handleTouchEnd.bind(this));
    this.#addEventListener('touchcancel', this.#handleTouchEnd.bind(this));
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
   * Handle touch start event
   * @private
   * @param {TouchEvent} event - Touch event
   */
  #handleTouchStart(event) {
    event.preventDefault();
    
    const touchPoints = [];
    for (const touch of event.touches) {
      const point = {
        x: touch.clientX,
        y: touch.clientY,
        id: touch.identifier,
        timestamp: Date.now(),
      };
      
      touchPoints.push(point);
      this.#touchPoints.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      });
    }
    
    // Emit touch start event if event system is available
    if (this.#eventSystem) {
      this.#eventSystem.emit('input:touchstart', {
        touches: touchPoints,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle touch move event
   * @private
   * @param {TouchEvent} event - Touch event
   */
  #handleTouchMove(event) {
    event.preventDefault();
    
    const touchPoints = [];
    for (const touch of event.touches) {
      const point = this.#touchPoints.get(touch.identifier);
      if (point) {
        point.x = touch.clientX;
        point.y = touch.clientY;
        
        touchPoints.push({
          x: touch.clientX,
          y: touch.clientY,
          id: touch.identifier
        });
      }
    }
    
    // Emit touch move event if event system is available
    if (this.#eventSystem && touchPoints.length > 0) {
      this.#eventSystem.emit('input:touchmove', {
        touches: touchPoints,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle touch end event
   * @private
   * @param {TouchEvent} event - Touch event
   */
  #handleTouchEnd(event) {
    event.preventDefault();
    for (const touch of event.changedTouches) {
      this.#touchPoints.delete(touch.identifier);
    }
  }

  /**
   * Get active touch points
   * @returns {Array<{x: number, y: number, id: number}>} Active touch points
   */
  getTouchPoints() {
    return Array.from(this.#touchPoints.entries()).map(([id, point]) => ({
      ...point,
      id,
    }));
  }

  /**
   * Clear all touch states
   */
  clear() {
    this.#touchPoints.clear();
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