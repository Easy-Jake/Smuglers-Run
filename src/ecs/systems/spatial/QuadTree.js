/**
 * QuadTree implementation for spatial partitioning.
 *
 * A QuadTree is a tree data structure where each node has exactly four children.
 * It's used for efficient spatial partitioning and collision detection by dividing
 * a 2D space into four equal quadrants recursively.
 *
 * @example
 * const quadtree = new QuadTree(
 *   { x: 0, y: 0, width: 1000, height: 1000 },
 *   4,  // max depth
 *   10  // max objects per node
 * );
 *
 * // Insert a collider
 * quadtree.insert(collider);
 *
 * // Find potential collisions
 * const collisions = quadtree.retrieve(collider);
 */
export class QuadTree {
  /** @private Bounds of this quadtree node */
  #bounds;
  /** @private Maximum depth of the quadtree */
  #maxDepth;
  /** @private Maximum objects per node before splitting */
  #maxObjects;
  /** @private Current depth of this node */
  #depth;
  /** @private Objects stored in this node */
  #objects;
  /** @private Child nodes (null if leaf node) */
  #nodes;

  /**
   * Create a new quadtree node
   * @param {Object} bounds - Node bounds {x, y, width, height}
   * @param {number} maxDepth - Maximum tree depth
   * @param {number} maxObjects - Maximum objects per node
   * @param {number} depth - Current depth
   */
  constructor(bounds, maxDepth, maxObjects, depth = 0) {
    this.#bounds = { ...bounds };
    this.#maxDepth = maxDepth;
    this.#maxObjects = maxObjects;
    this.#depth = depth;
    this.#objects = [];
    this.#nodes = null;
  }

  /**
   * Insert a collider into the quadtree.
   * If the node exceeds its capacity, it will split into four child nodes.
   *
   * @param {Collider} collider - Collider to insert
   * @returns {boolean} Whether insertion was successful
   * @throws {Error} If collider is null or undefined
   */
  insert(collider) {
    if (!collider) {
      throw new Error('Cannot insert null or undefined collider');
    }

    if (!this.#contains(collider)) return false;

    if (this.#nodes) {
      return this.#nodes.some(node => node.insert(collider));
    }

    this.#objects.push(collider);

    if (this.#shouldSplit()) {
      this.#split();
    }

    return true;
  }

  /**
   * Retrieve potential collisions for a collider.
   * Returns all objects in the same node and its parent nodes.
   *
   * @param {Collider} collider - Collider to check
   * @returns {Array<Collider>} Potential collisions
   * @throws {Error} If collider is null or undefined
   */
  retrieve(collider) {
    if (!collider) {
      throw new Error('Cannot retrieve collisions for null or undefined collider');
    }

    const potentialCollisions = [];

    if (this.#nodes) {
      const nodeIndex = this.#getNodeIndex(collider);
      if (nodeIndex !== -1) {
        potentialCollisions.push(...this.#nodes[nodeIndex].retrieve(collider));
      } else {
        for (const node of this.#nodes) {
          potentialCollisions.push(...node.retrieve(collider));
        }
      }
    }

    potentialCollisions.push(...this.#objects);

    return potentialCollisions;
  }

  /**
   * Clear the quadtree and remove all objects.
   * Resets the node to its initial state.
   */
  clear() {
    this.#objects = [];
    if (this.#nodes) {
      for (const node of this.#nodes) {
        node.clear();
      }
      this.#nodes = null;
    }
  }

  /**
   * Get the node's bounds.
   * Returns a copy to prevent external modification.
   *
   * @returns {Object} Bounds object {x, y, width, height}
   */
  getBounds() {
    return { ...this.#bounds };
  }

  /**
   * Get child nodes.
   * Returns null if this is a leaf node.
   *
   * @returns {Array<QuadTree>|null} Child nodes or null
   */
  getNodes() {
    return this.#nodes;
  }

  /**
   * Get objects stored in this node.
   * Returns a copy to prevent external modification.
   *
   * @returns {Array<Collider>} Objects in this node
   */
  getObjects() {
    return [...this.#objects];
  }

  /**
   * Check if node should split based on capacity and depth.
   *
   * @private
   * @returns {boolean} Whether node should split
   */
  #shouldSplit() {
    return this.#objects.length > this.#maxObjects && this.#depth < this.#maxDepth;
  }

  /**
   * Split the quadtree node into four equal quadrants.
   * Redistributes existing objects to child nodes.
   *
   * @private
   */
  #split() {
    const { width, height, x, y } = this.#bounds;
    const subWidth = width / 2;
    const subHeight = height / 2;

    this.#nodes = [
      this.#createChildNode(x + subWidth, y + subHeight, subWidth, subHeight),
      this.#createChildNode(x, y + subHeight, subWidth, subHeight),
      this.#createChildNode(x, y, subWidth, subHeight),
      this.#createChildNode(x + subWidth, y, subWidth, subHeight),
    ];

    const currentObjects = [...this.#objects];
    this.#objects = [];

    for (const object of currentObjects) {
      this.insert(object);
    }
  }

  /**
   * Create a new child node with the specified bounds.
   *
   * @private
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @returns {QuadTree} New child node
   */
  #createChildNode(x, y, width, height) {
    return new QuadTree({ x, y, width, height }, this.#maxDepth, this.#maxObjects, this.#depth + 1);
  }

  /**
   * Get index of subnode that contains the collider.
   * Returns -1 if collider spans multiple quadrants.
   *
   * @private
   * @param {Collider} collider - Collider to check
   * @returns {number} Index of subnode or -1 if none
   */
  #getNodeIndex(collider) {
    const bounds = collider.getBounds();
    const verticalMidpoint = this.#bounds.x + this.#bounds.width / 2;
    const horizontalMidpoint = this.#bounds.y + this.#bounds.height / 2;

    const isTopQuadrant =
      bounds.y < horizontalMidpoint && bounds.y + bounds.height < horizontalMidpoint;
    const isBottomQuadrant = bounds.y > horizontalMidpoint;

    if (bounds.x < verticalMidpoint && bounds.x + bounds.width < verticalMidpoint) {
      if (isTopQuadrant) return 1;
      if (isBottomQuadrant) return 2;
    } else if (bounds.x > verticalMidpoint) {
      if (isTopQuadrant) return 0;
      if (isBottomQuadrant) return 3;
    }

    return -1;
  }

  /**
   * Check if the collider is fully contained within this node's bounds.
   *
   * @private
   * @param {Collider} collider - Collider to check
   * @returns {boolean} Whether bounds contain collider
   */
  #contains(collider) {
    const bounds = collider.getBounds();
    return (
      bounds.x >= this.#bounds.x &&
      bounds.x + bounds.width <= this.#bounds.x + this.#bounds.width &&
      bounds.y >= this.#bounds.y &&
      bounds.y + bounds.height <= this.#bounds.y + this.#bounds.height
    );
  }
}
