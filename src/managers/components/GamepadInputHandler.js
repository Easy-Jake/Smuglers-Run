/**
 * Handles gamepad input for the game
 */
export class GamepadInputHandler {
  #gamepads = new Map();
  #eventListeners = new Map();
  #pollingInterval = null;
  #eventSystem = null;

  constructor() {
    this.#initializeEventListeners();
  }

  /**
   * Set the event system for gamepad events
   * @param {EventSystem} eventSystem - The event system to use
   * @returns {GamepadInputHandler} This handler for chaining
   */
  setEventSystem(eventSystem) {
    if (!eventSystem || typeof eventSystem.emit !== 'function') {
      console.warn('GamepadInputHandler: Invalid event system provided');
      return this;
    }
    this.#eventSystem = eventSystem;
    return this;
  }

  /**
   * Initialize event listeners
   * @private
   */
  #initializeEventListeners() {
    this.#addEventListener('gamepadconnected', this.#handleGamepadConnect.bind(this));
    this.#addEventListener('gamepaddisconnected', this.#handleGamepadDisconnect.bind(this));
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
   * Handle gamepad connect event
   * @private
   * @param {GamepadEvent} event - Gamepad event
   */
  #handleGamepadConnect(event) {
    this.#gamepads.set(event.gamepad.index, event.gamepad);
    
    // Emit gamepad connect event if event system is available
    if (this.#eventSystem) {
      this.#eventSystem.emit('input:gamepadconnected', {
        gamepadIndex: event.gamepad.index,
        id: event.gamepad.id,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle gamepad disconnect event
   * @private
   * @param {GamepadEvent} event - Gamepad event
   */
  #handleGamepadDisconnect(event) {
    this.#gamepads.delete(event.gamepad.index);
    
    // Emit gamepad disconnect event if event system is available
    if (this.#eventSystem) {
      this.#eventSystem.emit('input:gamepaddisconnected', {
        gamepadIndex: event.gamepad.index,
        id: event.gamepad.id,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Setup gamepad polling
   */
  setupPolling() {
    // Clear existing interval if any
    if (this.#pollingInterval) {
      clearInterval(this.#pollingInterval);
    }
    
    // Setup new polling interval
    this.#pollingInterval = setInterval(() => {
      const gamepads = navigator.getGamepads();
      for (const gamepad of gamepads) {
        if (gamepad) {
          const previousGamepad = this.#gamepads.get(gamepad.index);
          this.#gamepads.set(gamepad.index, gamepad);
          
          // Emit gamepad update event if event system is available and if buttons/axes changed
          if (this.#eventSystem && this.#hasGamepadStateChanged(previousGamepad, gamepad)) {
            this.#eventSystem.emit('input:gamepadupdate', {
              gamepadIndex: gamepad.index,
              buttons: Array.from(gamepad.buttons).map(b => b.pressed),
              axes: Array.from(gamepad.axes),
              timestamp: Date.now()
            });
          }
        }
      }
    }, 1000 / 60); // Poll at 60Hz
  }
  
  /**
   * Check if gamepad state has changed
   * @private
   * @param {Gamepad} previousGamepad - Previous gamepad state
   * @param {Gamepad} currentGamepad - Current gamepad state
   * @returns {boolean} Whether state has changed
   */
  #hasGamepadStateChanged(previousGamepad, currentGamepad) {
    if (!previousGamepad) return true;
    
    // Check if any button state changed
    for (let i = 0; i < currentGamepad.buttons.length; i++) {
      if (!previousGamepad.buttons[i] || 
          previousGamepad.buttons[i].pressed !== currentGamepad.buttons[i].pressed) {
        return true;
      }
    }
    
    // Check if any axis value changed significantly
    const AXIS_THRESHOLD = 0.01;
    for (let i = 0; i < currentGamepad.axes.length; i++) {
      if (!previousGamepad.axes[i] || 
          Math.abs(previousGamepad.axes[i] - currentGamepad.axes[i]) > AXIS_THRESHOLD) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get connected gamepads
   * @returns {Array<Gamepad>} Connected gamepads
   */
  getGamepads() {
    return Array.from(this.#gamepads.values());
  }

  /**
   * Check if a gamepad button is pressed
   * @param {number} gamepadIndex - Gamepad index
   * @param {number} buttonIndex - Button index
   * @returns {boolean} Whether the button is pressed
   */
  isButtonPressed(gamepadIndex, buttonIndex) {
    const gamepad = this.#gamepads.get(gamepadIndex);
    if (!gamepad || !gamepad.buttons[buttonIndex]) {
      return false;
    }
    return gamepad.buttons[buttonIndex].pressed;
  }

  /**
   * Get axis value
   * @param {number} gamepadIndex - Gamepad index
   * @param {number} axisIndex - Axis index
   * @returns {number} Axis value (-1 to 1)
   */
  getAxisValue(gamepadIndex, axisIndex) {
    const gamepad = this.#gamepads.get(gamepadIndex);
    if (!gamepad || !gamepad.axes[axisIndex]) {
      return 0;
    }
    return gamepad.axes[axisIndex];
  }

  /**
   * Update gamepad state (called per frame from InputManager)
   */
  update() {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    for (const gamepad of gamepads) {
      if (gamepad) {
        const previousGamepad = this.#gamepads.get(gamepad.index);
        this.#gamepads.set(gamepad.index, gamepad);
        if (this.#eventSystem && this.#hasGamepadStateChanged(previousGamepad, gamepad)) {
          this.#eventSystem.emit('input:gamepadupdate', {
            gamepadIndex: gamepad.index,
            buttons: Array.from(gamepad.buttons).map(b => b.pressed),
            axes: Array.from(gamepad.axes),
            timestamp: Date.now()
          });
        }
      }
    }
  }

  /**
   * Clear all gamepad states
   */
  clear() {
    this.#gamepads.clear();
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.#pollingInterval) {
      clearInterval(this.#pollingInterval);
      this.#pollingInterval = null;
    }
    
    // Remove all event listeners
    for (const [event, handler] of this.#eventListeners) {
      window.removeEventListener(event, handler);
    }
    this.#eventListeners.clear();
    this.clear();
  }
} 