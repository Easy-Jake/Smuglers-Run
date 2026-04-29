/**
 * Responsible for handling canvas resizing
 */
export class CanvasResizer {
  /**
   * Create a new canvas resizer
   * @param {CanvasElement} canvasElement - The canvas element to resize
   */
  constructor(canvasElement) {
    this.canvasElement = canvasElement;
    this.resizeHandler = this.handleResize.bind(this);
    this.resizeListenerActive = false;
  }

  /**
   * Set up the resize event handler
   */
  setupResizeHandler() {
    if (this.resizeListenerActive) return;
    
    // Handle window resize
    window.addEventListener('resize', this.resizeHandler);
    this.resizeListenerActive = true;
  }

  /**
   * Handle window resize events
   */
  handleResize() {
    // Default behavior is to resize to window dimensions
    this.resize(window.innerWidth, window.innerHeight);
  }

  /**
   * Resize the canvas to specific dimensions
   * @param {number} width - The new width
   * @param {number} height - The new height
   */
  resize(width, height) {
    if (!this.canvasElement.isInitialized()) return;
    
    this.canvasElement.setSize(width, height);
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    if (this.resizeListenerActive) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeListenerActive = false;
    }
  }

  /**
   * Get the current resize listener status
   * @returns {boolean} Whether the resize listener is active
   */
  isListenerActive() {
    return this.resizeListenerActive;
  }
} 