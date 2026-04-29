/**
 * QuadTree implementation for efficient spatial partitioning and collision detection
 */
export class QuadTree {
  constructor(bounds, maxObjects = 10, maxLevels = 4, level = 0) {
    this.bounds = bounds;
    this.maxObjects = maxObjects;
    this.maxLevels = maxLevels;
    this.level = level;
    this.objects = [];
    this.nodes = [];
  }

  /**
   * Clear the QuadTree
   */
  clear() {
    this.objects = [];
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i]) {
        this.nodes[i].clear();
        this.nodes[i] = null;
      }
    }
  }

  /**
   * Split the node into 4 subnodes
   * @private
   */
  split() {
    const subWidth = this.bounds.width / 2;
    const subHeight = this.bounds.height / 2;
    const x = this.bounds.x;
    const y = this.bounds.y;

    this.nodes[0] = new QuadTree(
      { x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight },
      this.maxObjects,
      this.maxLevels,
      this.level + 1
    );

    this.nodes[1] = new QuadTree(
      { x: x, y: y + subHeight, width: subWidth, height: subHeight },
      this.maxObjects,
      this.maxLevels,
      this.level + 1
    );

    this.nodes[2] = new QuadTree(
      { x: x, y: y, width: subWidth, height: subHeight },
      this.maxObjects,
      this.maxLevels,
      this.level + 1
    );

    this.nodes[3] = new QuadTree(
      { x: x + subWidth, y: y, width: subWidth, height: subHeight },
      this.maxObjects,
      this.maxLevels,
      this.level + 1
    );
  }

  /**
   * Get the index of the subnode that should contain the object
   * @param {Object} object - The object to check
   * @returns {number[]} Array of indices of subnodes that contain the object
   * @private
   */
  getIndex(object) {
    const indices = [];
    const verticalMidpoint = this.bounds.x + this.bounds.width / 2;
    const horizontalMidpoint = this.bounds.y + this.bounds.height / 2;

    // Convert center+radius to AABB bounds, fall back to width/height
    const r = object.radius || 0;
    const objLeft   = r ? object.x - r : object.x;
    const objRight  = r ? object.x + r : object.x + (object.width || 0);
    const objTop    = r ? object.y - r : object.y;
    const objBottom = r ? object.y + r : object.y + (object.height || 0);

    // Object can span multiple quadrants — check each side
    const inTop    = objTop < horizontalMidpoint;
    const inBottom = objBottom > horizontalMidpoint;
    const inLeft   = objLeft < verticalMidpoint;
    const inRight  = objRight > verticalMidpoint;

    if (inTop && inRight)  indices.push(0);
    if (inTop && inLeft)   indices.push(1);
    if (inBottom && inLeft) indices.push(2);
    if (inBottom && inRight) indices.push(3);

    return indices;
  }

  /**
   * Insert an object into the QuadTree
   * @param {Object} object - The object to insert
   */
  insert(object) {
    // Check if we already have subnodes
    if (this.nodes.length > 0) {
      const indices = this.getIndex(object);

      // Loop through all indices this object belongs to
      for (let i = 0; i < indices.length; i++) {
        // Make sure the node exists before inserting
        if (this.nodes[indices[i]]) {
          this.nodes[indices[i]].insert(object);
        }
      }
      return;
    }

    // If no subnodes yet, add to current node
    this.objects.push(object);

    // Check if we need to split
    if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
      // If no subnodes yet, create them
      if (this.nodes.length === 0) {
        this.split();
      }

      // Move objects from this node to subnodes
      let i = 0;
      while (i < this.objects.length) {
        const indices = this.getIndex(this.objects[i]);
        if (indices.length > 0) { // Only insert if object belongs to at least one subnode
          // Insert into all applicable subnodes
          for (let j = 0; j < indices.length; j++) {
            if (this.nodes[indices[j]]) {
              this.nodes[indices[j]].insert(this.objects[i]);
            }
          }
          
          // Remove from this node
          this.objects.splice(i, 1);
        } else {
          // If object doesn't belong to any subnodes, keep it in this node
          i++;
        }
      }
    }
  }

  /**
   * Retrieve all objects that could collide with the given object
   * @param {Object} object - The object to check for collisions
   * @returns {Object[]} Array of potential collision objects
   */
  retrieve(object) {
    const indices = this.getIndex(object);
    let returnObjects = this.objects;

    if (this.nodes.length > 0) {
      for (let i = 0; i < indices.length; i++) {
        const node = this.nodes[indices[i]];
        if (node) {
          returnObjects = returnObjects.concat(node.retrieve(object));
        }
      }
    }

    return returnObjects;
  }

  /**
   * Draw the QuadTree structure for debugging
   * @param {CanvasRenderingContext2D} ctx - The canvas context to draw on
   * @param {number} scale - The scale factor for the visualization
   */
  draw(ctx, scale = 1) {
    // Draw current node bounds
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      this.bounds.x * scale,
      this.bounds.y * scale,
      this.bounds.width * scale,
      this.bounds.height * scale
    );

    // Draw objects in this node
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.objects.forEach(obj => {
      ctx.fillRect(obj.x * scale, obj.y * scale, obj.width * scale, obj.height * scale);
    });

    // Draw subnodes
    if (this.nodes.length > 0) {
      this.nodes.forEach(node => node.draw(ctx, scale));
    }
  }

  /**
   * Get the total number of objects in the tree
   * @returns {number} Total number of objects
   */
  getTotalObjects() {
    let count = this.objects.length;
    if (this.nodes.length > 0) {
      count += this.nodes.reduce((sum, node) => sum + node.getTotalObjects(), 0);
    }
    return count;
  }

  /**
   * Get the total number of nodes in the tree
   * @returns {number} Total number of nodes
   */
  getTotalNodes() {
    let count = 1; // Current node
    if (this.nodes.length > 0) {
      count += this.nodes.reduce((sum, node) => sum + node.getTotalNodes(), 0);
    }
    return count;
  }

  /**
   * Get the average number of objects per node
   * @returns {number} Average objects per node
   */
  getObjectsPerNode() {
    const totalObjects = this.getTotalObjects();
    const totalNodes = this.getTotalNodes();
    return totalObjects / totalNodes;
  }

  /**
   * Get the maximum depth of the tree
   * @returns {number} Maximum depth
   */
  getMaxDepth() {
    if (this.nodes.length === 0) return this.level;
    return Math.max(...this.nodes.map(node => node.getMaxDepth()));
  }
}
