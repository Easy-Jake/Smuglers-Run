/**
 * Manages canvas operations and provides a clean interface for rendering
 */
import { CanvasElement } from './components/CanvasElement.js';
import { CanvasResizer } from './components/CanvasResizer.js';
import { CanvasRenderer } from './components/CanvasRenderer.js';

export class CanvasManager {
  /**
   * Create a new canvas manager
   */
  constructor() {
    this.canvasElement = new CanvasElement();
    this.canvasResizer = new CanvasResizer(this.canvasElement);
    this.canvasRenderer = new CanvasRenderer(this.canvasElement);
  }

  /**
   * Initialize the canvas manager
   * @param {string} id - Canvas ID for DOM element
   * @returns {Promise<boolean>} Promise that resolves when initialization is complete
   */
  async initialize(id = 'gameCanvas') {
    try {
      if (!this.canvasElement.isInitialized()) {
        console.log('Initializing canvas element with ID:', id);
        await this.canvasElement.initialize(id);
        
        // Setup resize handling
        this.canvasResizer.setupResizeHandler();
        
        // Enable rendering features
        this.canvasRenderer.enableSmoothing();
      }
      return true;
    } catch (error) {
      console.error('CanvasManager: Failed to initialize', error);
      return false;
    }
  }

  /**
   * Get the canvas context
   * @returns {CanvasRenderingContext2D} The canvas context
   */
  getContext() {
    return this.canvasElement.getContext();
  }

  /**
   * Get the canvas element
   * @returns {HTMLCanvasElement} The canvas element
   */
  getCanvas() {
    return this.canvasElement.getElement();
  }

  /**
   * Get the canvas width
   * @returns {number} The canvas width
   */
  getWidth() {
    return this.canvasElement.getWidth();
  }

  /**
   * Get the canvas height
   * @returns {number} The canvas height
   */
  getHeight() {
    return this.canvasElement.getHeight();
  }

  /**
   * Check if the canvas is initialized
   * @returns {boolean} Whether the canvas is initialized
   */
  isInitialized() {
    return this.canvasElement.isInitialized();
  }

  /**
   * Clear the canvas
   */
  clear() {
    this.canvasRenderer.clear();
  }

  /**
   * Set the canvas size
   * @param {number} width - The new width
   * @param {number} height - The new height
   */
  setSize(width, height) {
    this.canvasResizer.resize(width, height);
  }

  /**
   * Set the canvas background color
   * @param {string} color - The background color
   */
  setBackground(color) {
    this.canvasElement.setBackground(color);
  }

  /**
   * Destroy the canvas manager
   */
  destroy() {
    if (!this.canvasElement.isInitialized()) return;

    // Remove event listeners
    this.canvasResizer.cleanup();
    
    // Remove canvas element
    this.canvasElement.remove();
  }
}
