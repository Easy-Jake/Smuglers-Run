import { System } from '../System.js';

/**
 * System for visualizing collision detection and spatial partitioning.
 *
 * This system handles all UI-related aspects of collision debugging,
 * including drawing quadtree nodes, collision bounds, and intersection points.
 * It's completely separated from the collision detection logic.
 *
 * @example
 * const debugSystem = new CollisionDebugSystem({
 *   showQuadtree: true,
 *   showBounds: true,
 *   showIntersections: true,
 *   colors: {
 *     quadtree: 'rgba(0, 255, 0, 0.2)',
 *     bounds: 'rgba(255, 0, 0, 0.5)',
 *     intersection: 'rgba(0, 0, 255, 0.8)'
 *   }
 * });
 */
export class CollisionDebugSystem extends System {
  /** @private Whether to show quadtree nodes */
  #showQuadtree;
  /** @private Whether to show collision bounds */
  #showBounds;
  /** @private Whether to show intersection points */
  #showIntersections;
  /** @private Custom colors for visualization */
  #colors;
  /** @private Reference to the collision system */
  #collisionSystem;
  /** @private Whether the system is enabled */
  #isEnabled;

  /**
   * Create a new collision debug system
   * @param {Object} options - Debug options
   * @param {boolean} options.showQuadtree - Whether to show quadtree nodes
   * @param {boolean} options.showBounds - Whether to show collision bounds
   * @param {boolean} options.showIntersections - Whether to show intersection points
   * @param {Object} options.colors - Custom colors for visualization
   */
  constructor(options = {}) {
    super();
    this.#showQuadtree = options.showQuadtree ?? true;
    this.#showBounds = options.showBounds ?? true;
    this.#showIntersections = options.showIntersections ?? true;
    this.#colors = {
      quadtree: options.colors?.quadtree ?? 'rgba(0, 255, 0, 0.2)',
      bounds: options.colors?.bounds ?? 'rgba(255, 0, 0, 0.5)',
      intersection: options.colors?.intersection ?? 'rgba(0, 0, 255, 0.8)',
    };
    this.#isEnabled = true;
  }

  /**
   * Initialize the debug system
   */
  initialize() {
    this.#collisionSystem = this.world.getSystem('CollisionSystem');
    if (!this.#collisionSystem) {
      throw new Error('CollisionDebugSystem requires CollisionSystem to be present');
    }
  }

  /**
   * Render debug visualization
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} deltaTime - Time since last render
   */
  render(ctx, deltaTime) {
    if (!this.#isEnabled || !this.#collisionSystem) return;

    const quadtree = this.#collisionSystem.getQuadtree();
    if (!quadtree) return;

    this.#drawQuadtree(ctx, quadtree);
  }

  /**
   * Draw the quadtree structure
   * @private
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {QuadTree} node - Current quadtree node
   */
  #drawQuadtree(ctx, node) {
    if (!node) return;

    const bounds = node.getBounds();

    // Draw current node
    if (this.#showQuadtree) {
      ctx.strokeStyle = this.#colors.quadtree;
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    // Draw objects in this node
    if (this.#showBounds) {
      const objects = node.getObjects();
      for (const object of objects) {
        const objectBounds = object.getBounds();
        ctx.strokeStyle = this.#colors.bounds;
        ctx.strokeRect(objectBounds.x, objectBounds.y, objectBounds.width, objectBounds.height);
      }
    }

    // Recursively draw child nodes
    const childNodes = node.getNodes();
    if (childNodes) {
      for (const childNode of childNodes) {
        this.#drawQuadtree(ctx, childNode);
      }
    }
  }

  /**
   * Draw intersection points
   * @private
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} intersection - Intersection data
   */
  #drawIntersection(ctx, intersection) {
    if (!this.#showIntersections) return;

    ctx.fillStyle = this.#colors.intersection;
    ctx.beginPath();
    ctx.arc(intersection.point.x, intersection.point.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Set whether to show quadtree nodes
   * @param {boolean} show - Whether to show quadtree nodes
   */
  setShowQuadtree(show) {
    this.#showQuadtree = show;
  }

  /**
   * Set whether to show collision bounds
   * @param {boolean} show - Whether to show collision bounds
   */
  setShowBounds(show) {
    this.#showBounds = show;
  }

  /**
   * Set whether to show intersection points
   * @param {boolean} show - Whether to show intersection points
   */
  setShowIntersections(show) {
    this.#showIntersections = show;
  }

  /**
   * Set custom colors for visualization
   * @param {Object} colors - Custom colors
   */
  setColors(colors) {
    this.#colors = { ...this.#colors, ...colors };
  }

  /**
   * Enable or disable the debug system
   * @param {boolean} enabled - Whether the system is enabled
   */
  setEnabled(enabled) {
    this.#isEnabled = enabled;
  }

  /**
   * Check if the system is enabled
   * @returns {boolean} Whether the system is enabled
   */
  isEnabled() {
    return this.#isEnabled;
  }
}
