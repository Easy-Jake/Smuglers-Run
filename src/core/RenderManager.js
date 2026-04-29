import { BaseService } from './services/BaseService.js';
import { CanvasManager } from '../managers/CanvasManager.js';

/**
 * Manages rendering operations for the game
 *
 * This class handles all rendering operations in a separate loop,
 * ensuring smooth UI performance even when game logic is heavy.
 *
 * @example
 * const renderManager = new RenderManager({
 *   targetFPS: 60,
 *   canvas: document.getElementById('gameCanvas'),
 *   systems: [collisionDebugSystem, particleSystem]
 * });
 *
 * // Start rendering
 * renderManager.start();
 */
export class RenderManager extends BaseService {
  /** @private The canvas manager */
  #canvasManager;
  /** @private Array of renderable systems */
  #systems;
  /** @private Target frames per second */
  #targetFPS;
  /** @private Frame interval in milliseconds */
  #frameInterval;
  /** @private Last render timestamp */
  #lastRender;
  /** @private Whether debug mode is enabled */
  #debug;
  /** @private Whether rendering is active */
  #isActive;

  /**
   * Create a new render manager
   * @param {Object} options - Render options
   * @param {number} options.targetFPS - Target frames per second
   * @param {boolean} options.debug - Whether debug mode is enabled
   */
  constructor(options = {}) {
    super();
    this.#canvasManager = null;
    this.#systems = [];
    this.#targetFPS = options.targetFPS ?? 60;
    this.#frameInterval = 1000 / this.#targetFPS;
    this.#lastRender = 0;
    this.#debug = options.debug ?? false;
    this.#isActive = false;
  }

  /**
   * Initialize the render manager
   * @protected
   * @returns {Promise<void>}
   */
  async doInitialize() {
    // Wait for dependencies
    await this.waitForDependencies();

    const canvasManager = this.getDependency('canvasManager');
    if (!canvasManager) {
      throw new Error('CanvasManager dependency not found');
    }

    // Initialize canvas manager if needed
    if (!canvasManager.isInitialized()) {
      console.log('Initializing canvas manager for render manager');
      await canvasManager.initialize();
    }

    // Verify canvas manager was properly initialized
    if (!canvasManager.getContext()) {
      throw new Error('Canvas context unavailable');
    }

    this.#canvasManager = canvasManager;
    // Don't start own render loop - GameLoop handles rendering
    this.#isActive = true;
  }

  /**
   * Set the canvas manager
   * @param {CanvasManager} canvasManager - The canvas manager to use
   * @returns {RenderManager} This render manager for chaining
   */
  setCanvasManager(canvasManager) {
    if (!(canvasManager instanceof CanvasManager)) {
      throw new Error('Invalid canvas manager');
    }
    this.#canvasManager = canvasManager;
    this.addDependency('canvasManager', canvasManager);
    return this;
  }

  /**
   * Start the render loop
   * @private
   */
  #startRenderLoop() {
    this.#isActive = true;
    this.#renderLoop();
  }

  /**
   * Stop the render loop
   */
  stop() {
    this.#isActive = false;
  }

  /**
   * The main render loop
   * @private
   */
  #renderLoop() {
    if (!this.#isActive) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.#lastRender;

    if (deltaTime >= this.#frameInterval) {
      this.#render(deltaTime);
      this.#lastRender = currentTime;
    }

    requestAnimationFrame(() => this.#renderLoop());
  }

  /**
   * Render all systems
   * @private
   * @param {number} deltaTime - Time since last render
   */
  #render(deltaTime) {
    if (!this.#canvasManager) return;

    const ctx = this.#canvasManager.getContext();
    if (!ctx) return;

    ctx.clearRect(0, 0, this.#canvasManager.getWidth(), this.#canvasManager.getHeight());

    // Render each system
    for (const system of this.#systems) {
      if (system.isEnabled()) {
        system.render(ctx, deltaTime);
      }
    }

    // Render debug information if enabled
    if (this.#debug) {
      this.#renderDebugInfo(ctx);
    }
  }

  /**
   * Render debug information
   * @private
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  #renderDebugInfo(ctx) {
    const fps = Math.round(1000 / (performance.now() - this.#lastRender));
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(`FPS: ${fps}`, 10, 20);
    ctx.fillText(`Systems: ${this.#systems.length}`, 10, 40);
  }

  /**
   * Add a renderable system
   * @param {Object} system - The system to add
   */
  addSystem(system) {
    if (!this.#systems.includes(system)) {
      this.#systems.push(system);
    }
  }

  /**
   * Remove a renderable system
   * @param {Object} system - The system to remove
   */
  removeSystem(system) {
    const index = this.#systems.indexOf(system);
    if (index !== -1) {
      this.#systems.splice(index, 1);
    }
  }

  /**
   * Get the canvas manager
   * @returns {CanvasManager} The canvas manager
   */
  getCanvasManager() {
    return this.#canvasManager;
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

  /**
   * Check if rendering is active
   * @returns {boolean} Whether rendering is active
   */
  isActive() {
    return this.#isActive;
  }

  /**
   * Begin a render frame and get the render context
   * @returns {CanvasRenderingContext2D|null} Canvas rendering context or null if not available
   */
  beginRender() {
    if (!this.#canvasManager) {
      console.warn('RenderManager: No canvas manager set');
      return null;
    }
    
    const ctx = this.#canvasManager.getContext();
    if (!ctx) {
      console.warn('RenderManager: Could not get rendering context');
      return null;
    }
    
    // Clear canvas for new frame
    ctx.clearRect(0, 0, this.#canvasManager.getWidth(), this.#canvasManager.getHeight());
    
    // Save context state
    ctx.save();
    
    return ctx;
  }
  
  /**
   * End a render frame
   */
  endRender() {
    if (!this.#canvasManager) return;
    
    const ctx = this.#canvasManager.getContext();
    if (!ctx) return;
    
    // Restore context state
    ctx.restore();
    
    // Render debug information if enabled
    if (this.#debug) {
      this.#renderDebugInfo(ctx);
    }
  }
}
