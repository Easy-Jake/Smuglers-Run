/**
 * Responsible for rendering operations on the canvas
 */
export class CanvasRenderer {
  /**
   * Create a new canvas renderer
   * @param {CanvasElement} canvasElement - The canvas element to render on
   */
  constructor(canvasElement) {
    this.canvasElement = canvasElement;
  }

  /**
   * Clear the canvas
   */
  clear() {
    if (!this.canvasElement.isInitialized()) return;
    
    const context = this.canvasElement.getContext();
    const width = this.canvasElement.getWidth();
    const height = this.canvasElement.getHeight();
    
    context.clearRect(0, 0, width, height);
  }

  /**
   * Draw a rectangle on the canvas
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @param {number} width - The width of the rectangle
   * @param {number} height - The height of the rectangle
   * @param {string} color - The fill color
   */
  drawRect(x, y, width, height, color) {
    if (!this.canvasElement.isInitialized()) return;
    
    const context = this.canvasElement.getContext();
    
    context.fillStyle = color;
    context.fillRect(x, y, width, height);
  }

  /**
   * Draw a circle on the canvas
   * @param {number} x - The x coordinate of the center
   * @param {number} y - The y coordinate of the center
   * @param {number} radius - The radius of the circle
   * @param {string} color - The fill color
   */
  drawCircle(x, y, radius, color) {
    if (!this.canvasElement.isInitialized()) return;
    
    const context = this.canvasElement.getContext();
    
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
  }

  /**
   * Draw text on the canvas
   * @param {string} text - The text to draw
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @param {string} color - The text color
   * @param {string} font - The font specification
   * @param {string} align - The text alignment
   */
  drawText(text, x, y, color = 'white', font = '16px Arial', align = 'left') {
    if (!this.canvasElement.isInitialized()) return;
    
    const context = this.canvasElement.getContext();
    
    context.font = font;
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(text, x, y);
  }

  /**
   * Draw an image on the canvas
   * @param {HTMLImageElement} image - The image to draw
   * @param {number} x - The x coordinate
   * @param {number} y - The y coordinate
   * @param {number} width - The width
   * @param {number} height - The height
   */
  drawImage(image, x, y, width, height) {
    if (!this.canvasElement.isInitialized()) return;
    
    const context = this.canvasElement.getContext();
    
    context.drawImage(image, x, y, width, height);
  }

  /**
   * Enable image smoothing for better rendering quality
   * @param {boolean} enable - Whether to enable smoothing (default: true)
   */
  enableSmoothing(enable = true) {
    if (!this.canvasElement.isInitialized()) return;
    
    const context = this.canvasElement.getContext();
    if (!context) return;
    
    // Set image smoothing properties
    context.imageSmoothingEnabled = enable;
    
    // For older browsers
    context.mozImageSmoothingEnabled = enable;
    context.webkitImageSmoothingEnabled = enable;
    context.msImageSmoothingEnabled = enable;
  }
} 