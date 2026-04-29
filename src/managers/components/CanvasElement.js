/**
 * Responsible for managing the canvas DOM element
 */
export class CanvasElement {
  /**
   * Create a new canvas element manager
   */
  constructor() {
    this.canvas = null;
    this.context = null;
    this.width = 0;
    this.height = 0;
    this.isInit = false;
  }

  /**
   * Initialize the canvas element
   * @param {string} id - The ID to assign to the canvas element
   * @returns {Promise<boolean>} Promise that resolves when initialization is complete
   * @throws {Error} If canvas initialization fails
   */
  async initialize(id) {
    if (this.isInit) return true;

    // Find existing canvas element or create a new one
    const canvasId = id || 'gameCanvas';
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;
      document.body.appendChild(this.canvas);
    }

    // Get canvas context
    this.context = this.canvas.getContext('2d');
    if (!this.context) {
      throw new Error('Failed to get canvas context');
    }

    // Set initial size to match window
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.isInit = true;
    return true;
  }

  /**
   * Get the canvas context
   * @returns {CanvasRenderingContext2D|null} The canvas context
   */
  getContext() {
    return this.context;
  }

  /**
   * Get the canvas element
   * @returns {HTMLCanvasElement|null} The canvas element
   */
  getElement() {
    return this.canvas;
  }

  /**
   * Get the canvas width
   * @returns {number} The canvas width
   */
  getWidth() {
    return this.width;
  }

  /**
   * Get the canvas height
   * @returns {number} The canvas height
   */
  getHeight() {
    return this.height;
  }

  /**
   * Check if the canvas is initialized
   * @returns {boolean} Whether the canvas is initialized
   */
  isInitialized() {
    return this.isInit;
  }

  /**
   * Set the canvas size
   * @param {number} width - The new width
   * @param {number} height - The new height
   */
  setSize(width, height) {
    if (!this.isInit) return;
    
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Set the canvas background color
   * @param {string} color - The background color
   */
  setBackground(color) {
    if (!this.isInit || !this.canvas) return;
    
    this.canvas.style.backgroundColor = color;
  }

  /**
   * Remove the canvas element from the DOM
   */
  remove() {
    if (!this.isInit || !this.canvas) return;
    
    // Remove canvas element
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }

    // Reset state
    this.canvas = null;
    this.context = null;
    this.width = 0;
    this.height = 0;
    this.isInit = false;
  }
} 