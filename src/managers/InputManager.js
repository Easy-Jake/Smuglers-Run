import { KeyboardInputHandler } from './components/KeyboardInputHandler.js';
import { MouseInputHandler } from './components/MouseInputHandler.js';
import { TouchInputHandler } from './components/TouchInputHandler.js';
import { GamepadInputHandler } from './components/GamepadInputHandler.js';

/**
 * Manages all input handling for the game.
 * Handles keyboard, mouse, touch, and gamepad inputs.
 */
export class InputManager {
  #keyboardHandler;
  #mouseHandler;
  #touchHandler;
  #gamepadHandler;
  #eventSystem;
  #isInitialized = false;

  constructor() {
    this.#keyboardHandler = new KeyboardInputHandler();
    this.#mouseHandler = new MouseInputHandler();
    this.#touchHandler = new TouchInputHandler();
    this.#gamepadHandler = new GamepadInputHandler();
    this.#eventSystem = null;
  }

  /**
   * Set the event system
   * @param {EventSystem} eventSystem - Event system to use
   * @returns {InputManager} This manager for chaining
   */
  setEventSystem(eventSystem) {
    if (!eventSystem || typeof eventSystem.emit !== 'function') {
      throw new Error('Invalid event system');
    }
    this.#eventSystem = eventSystem;
    
    // Configure handlers with event system
    this.#keyboardHandler.setEventSystem(eventSystem);
    this.#mouseHandler.setEventSystem(eventSystem);
    this.#touchHandler.setEventSystem(eventSystem);
    this.#gamepadHandler.setEventSystem(eventSystem);
    
    return this;
  }

  /**
   * Initialize the input manager
   * @returns {Promise} Promise that resolves when initialization is complete
   */
  async initialize() {
    try {
      // Ensure event system is set
      if (!this.#eventSystem) {
        console.warn('InputManager: No event system set, input events will not be emitted');
      }
      
      // Initialize handlers
      this.#keyboardHandler.initialize?.();
      this.#mouseHandler.initialize?.();
      this.#touchHandler.initialize?.();
      
      // Setup gamepad polling
      this.#gamepadHandler.setupPolling();
      
      // Mark as initialized
      this.#isInitialized = true;
      console.log('InputManager: Successfully initialized');
      
      return this;
    } catch (error) {
      console.error('Failed to initialize input manager:', error);
      throw error;
    }
  }

  /**
   * Check if a key is currently pressed
   * @param {string} key - Key to check
   * @returns {boolean} Whether the key is pressed
   */
  isKeyPressed(key) {
    return this.#keyboardHandler.isKeyPressed(key);
  }

  /**
   * Check if any key in a group is pressed
   * @param {string} group - Key group to check
   * @returns {boolean} Whether any key in the group is pressed
   */
  isKeyGroupPressed(group) {
    return this.#keyboardHandler.isKeyGroupPressed(group);
  }

  /**
   * Check if a mouse button is pressed
   * @param {number} button - Mouse button to check
   * @returns {boolean} Whether the button is pressed
   */
  isMouseButtonPressed(button) {
    return this.#mouseHandler.isMouseButtonPressed(button);
  }

  /**
   * Get current mouse position
   * @returns {{x: number, y: number}} Mouse position
   */
  getMousePosition() {
    return this.#mouseHandler.getMousePosition();
  }

  /**
   * Get active touch points
   * @returns {Array<{x: number, y: number, id: number}>} Active touch points
   */
  getTouchPoints() {
    return this.#touchHandler.getTouchPoints();
  }

  /**
   * Get connected gamepads
   * @returns {Array<Gamepad>} Connected gamepads
   */
  getGamepads() {
    return this.#gamepadHandler.getGamepads();
  }

  /**
   * Check if a gamepad button is pressed
   * @param {number} gamepadIndex - Gamepad index
   * @param {number} buttonIndex - Button index
   * @returns {boolean} Whether the button is pressed
   */
  isGamepadButtonPressed(gamepadIndex, buttonIndex) {
    return this.#gamepadHandler.isButtonPressed(gamepadIndex, buttonIndex);
  }

  /**
   * Get gamepad axis value
   * @param {number} gamepadIndex - Gamepad index
   * @param {number} axisIndex - Axis index
   * @returns {number} Axis value (-1 to 1)
   */
  getGamepadAxisValue(gamepadIndex, axisIndex) {
    return this.#gamepadHandler.getAxisValue(gamepadIndex, axisIndex);
  }

  /**
   * Clear all input states
   */
  clear() {
    this.#keyboardHandler.clear();
    this.#mouseHandler.clear();
    this.#touchHandler.clear();
    this.#gamepadHandler.clear();
  }

  /**
   * Update input state
   */
  update() {
    if (!this.#isInitialized) {
      console.warn('InputManager: Not initialized, skipping update');
      return;
    }

    try {
      // Update gamepad state
      this.#gamepadHandler.update();
    } catch (error) {
      console.error('InputManager: Error updating input state', error);
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.#keyboardHandler.dispose();
    this.#mouseHandler.dispose();
    this.#touchHandler.dispose();
    this.#gamepadHandler.dispose();
    this.#isInitialized = false;
  }
}
