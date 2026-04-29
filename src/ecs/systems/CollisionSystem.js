import { System } from '../System.js';
import { QuadTree } from './spatial/QuadTree.js';

/**
 * System for handling collision detection using spatial partitioning.
 *
 * The CollisionSystem uses a QuadTree for efficient spatial partitioning to reduce
 * the number of collision checks needed. It supports:
 * - Layer-based collision filtering
 * - Trigger vs physical collisions
 * - Debug visualization
 * - Efficient collision pair tracking
 *
 * @example
 * const collisionSystem = new CollisionSystem(
 *   { x: 0, y: 0, width: 1000, height: 1000 },
 *   { maxDepth: 4, maxObjects: 10, debug: true }
 * );
 *
 * // Handle collision events
 * world.on('collision', (event) => {
 *   const { entityA, entityB, intersection } = event;
 *   // Handle collision...
 * });
 *
 * // Handle trigger events
 * world.on('triggerEnter', (event) => {
 *   const { entityA, entityB, intersection } = event;
 *   // Handle trigger...
 * });
 */
export class CollisionSystem extends System {
  /** @private QuadTree for spatial partitioning */
  #quadTree;
  /** @private Maximum depth of the quadtree */
  #maxDepth;
  /** @private Maximum objects per quadtree node */
  #maxObjects;
  /** @private World bounds for quadtree */
  #worldBounds;
  /** @private Set of active collision pairs to prevent duplicate events */
  #activeCollisionPairs;
  /** @private Whether debug visualization is enabled */
  #isDebugEnabled;

  /**
   * Create a new collision system
   * @param {Object} worldBounds - World bounds {x, y, width, height}
   * @param {Object} options - System options
   * @param {number} options.maxDepth - Maximum quadtree depth
   * @param {number} options.maxObjects - Maximum objects per quadtree node
   * @param {boolean} options.debug - Enable debug mode
   */
  constructor(worldBounds, options = {}) {
    super();
    this.#worldBounds = { ...worldBounds };
    this.#maxDepth = options.maxDepth ?? 4;
    this.#maxObjects = options.maxObjects ?? 10;
    this.#isDebugEnabled = options.debug ?? false;
    this.#activeCollisionPairs = new Set();
    this.#initializeQuadTree();
  }

  /**
   * Initialize the quadtree with world bounds and configuration.
   *
   * @private
   */
  #initializeQuadTree() {
    this.#quadTree = new QuadTree(this.#worldBounds, this.#maxDepth, this.#maxObjects);
  }

  /**
   * Update the collision system.
   * Resets state and processes all collisions for the current frame.
   *
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    this.#resetState();
    this.#processCollisions(deltaTime);
  }

  /**
   * Reset system state for the current frame.
   * Clears the quadtree and active collision pairs.
   *
   * @private
   */
  #resetState() {
    this.#quadTree.clear();
    this.#activeCollisionPairs.clear();
  }

  /**
   * Process all collisions for the current frame.
   * First indexes all colliders, then detects and resolves collisions.
   *
   * @private
   * @param {number} deltaTime - Time since last update
   */
  #processCollisions(deltaTime) {
    this.#indexColliders();
    this.#detectCollisions(deltaTime);
  }

  /**
   * Index all colliders in the quadtree for efficient spatial querying.
   *
   * @private
   */
  #indexColliders() {
    const entities = this.world.getEntitiesWithComponent('Collider');
    for (const entity of entities) {
      const collider = entity.getComponent('Collider');
      this.#quadTree.insert(collider);
    }
  }

  /**
   * Detect collisions between entities using spatial partitioning.
   *
   * @private
   * @param {number} deltaTime - Time since last update
   */
  #detectCollisions(deltaTime) {
    const entities = this.world.getEntitiesWithComponent('Collider');

    for (const entity of entities) {
      const collider = entity.getComponent('Collider');
      const potentialCollisions = this.#quadTree.retrieve(collider);

      this.#resolveCollisions(entity, collider, potentialCollisions, deltaTime);
    }
  }

  /**
   * Resolve collisions between entities.
   * Checks compatibility, prevents duplicate events, and emits appropriate events.
   *
   * @private
   * @param {Entity} entity - Current entity
   * @param {Collider} collider - Current collider
   * @param {Array<Collider>} potentialCollisions - Potential collision candidates
   * @param {number} deltaTime - Time since last update
   */
  #resolveCollisions(entity, collider, potentialCollisions, deltaTime) {
    for (const otherCollider of potentialCollisions) {
      const otherEntity = otherCollider.entity;

      if (entity === otherEntity) continue;
      if (!this.#areCollidersCompatible(collider, otherCollider)) continue;

      const pairKey = this.#generateCollisionPairKey(collider, otherCollider);
      if (this.#activeCollisionPairs.has(pairKey)) continue;

      const intersection = collider.getIntersection(otherCollider);
      if (intersection) {
        this.#activeCollisionPairs.add(pairKey);
        this.#notifyCollisionEvent(entity, otherEntity, intersection, deltaTime);
      }
    }
  }

  /**
   * Check if two colliders can collide based on their layers and masks.
   *
   * @private
   * @param {Collider} colliderA - First collider
   * @param {Collider} colliderB - Second collider
   * @returns {boolean} Whether colliders can collide
   */
  #areCollidersCompatible(colliderA, colliderB) {
    return (
      (colliderA.getLayer() & colliderB.getMask()) !== 0 &&
      (colliderB.getLayer() & colliderA.getMask()) !== 0
    );
  }

  /**
   * Generate a unique key for a collision pair.
   * Ensures consistent key generation regardless of collider order.
   *
   * @private
   * @param {Collider} colliderA - First collider
   * @param {Collider} colliderB - Second collider
   * @returns {string} Unique key
   */
  #generateCollisionPairKey(colliderA, colliderB) {
    const idA = colliderA.entity.id;
    const idB = colliderB.entity.id;
    return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
  }

  /**
   * Notify collision event to the world.
   * Emits either 'triggerEnter' or 'collision' event based on intersection type.
   *
   * @private
   * @param {Entity} entityA - First entity
   * @param {Entity} entityB - Second entity
   * @param {Object} intersection - Intersection data
   * @param {number} deltaTime - Time since last update
   */
  #notifyCollisionEvent(entityA, entityB, intersection, deltaTime) {
    const event = {
      entityA,
      entityB,
      intersection,
      deltaTime,
      timestamp: Date.now(),
    };

    if (intersection.isTrigger) {
      this.world.emit('triggerEnter', event);
    } else {
      this.world.emit('collision', event);
    }
  }

  /**
   * Get the quadtree for debugging purposes.
   * Only returns the quadtree if debug mode is enabled.
   *
   * @returns {QuadTree|null} The quadtree if debug is enabled
   */
  getQuadtree() {
    return this.#isDebugEnabled ? this.#quadTree : null;
  }

  /**
   * Enable or disable debug mode.
   * When enabled, allows access to the quadtree for visualization.
   *
   * @param {boolean} enabled - Whether debug mode is enabled
   */
  setDebugEnabled(enabled) {
    this.#isDebugEnabled = enabled;
  }
}

/**
 * QuadTree implementation for spatial partitioning
 */
class QuadTree {
  #bounds;
  #maxDepth;
  #maxObjects;
  #depth;
  #objects = [];
  #nodes = null;

  constructor(bounds, maxDepth, maxObjects, depth = 0) {
    this.#bounds = bounds;
    this.#maxDepth = maxDepth;
    this.#maxObjects = maxObjects;
    this.#depth = depth;
  }

  /**
   * Insert a collider into the quadtree
   * @param {Collider} collider - Collider to insert
   */
  insert(collider) {
    if (!this.#contains(collider)) return false;

    if (this.#nodes) {
      return this.#nodes.some(node => node.insert(collider));
    }

    this.#objects.push(collider);

    if (this.#objects.length > this.#maxObjects && this.#depth < this.#maxDepth) {
      this.#split();
    }

    return true;
  }

  /**
   * Retrieve potential collisions for a collider
   * @param {Collider} collider - Collider to check
   * @returns {Array<Collider>} Potential collisions
   */
  retrieve(collider) {
    const returnObjects = [];

    if (this.#nodes) {
      const index = this.#getIndex(collider);
      if (index !== -1) {
        returnObjects.push(...this.#nodes[index].retrieve(collider));
      } else {
        for (const node of this.#nodes) {
          returnObjects.push(...node.retrieve(collider));
        }
      }
    }

    returnObjects.push(...this.#objects);

    return returnObjects;
  }

  /**
   * Split the quadtree node
   * @private
   */
  #split() {
    const subWidth = this.#bounds.width / 2;
    const subHeight = this.#bounds.height / 2;
    const x = this.#bounds.x;
    const y = this.#bounds.y;

    this.#nodes = [
      new QuadTree(
        { x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight },
        this.#maxDepth,
        this.#maxObjects,
        this.#depth + 1
      ),
      new QuadTree(
        { x: x, y: y + subHeight, width: subWidth, height: subHeight },
        this.#maxDepth,
        this.#maxObjects,
        this.#depth + 1
      ),
      new QuadTree(
        { x: x, y: y, width: subWidth, height: subHeight },
        this.#maxDepth,
        this.#maxObjects,
        this.#depth + 1
      ),
      new QuadTree(
        { x: x + subWidth, y: y, width: subWidth, height: subHeight },
        this.#maxDepth,
        this.#maxObjects,
        this.#depth + 1
      ),
    ];

    const objects = [...this.#objects];
    this.#objects = [];

    for (const object of objects) {
      this.insert(object);
    }
  }

  /**
   * Get index of subnode for a collider
   * @private
   * @param {Collider} collider - Collider to check
   * @returns {number} Index of subnode or -1 if none
   */
  #getIndex(collider) {
    const bounds = collider.getBounds();
    const verticalMidpoint = this.#bounds.x + this.#bounds.width / 2;
    const horizontalMidpoint = this.#bounds.y + this.#bounds.height / 2;

    const topQuadrant =
      bounds.y < horizontalMidpoint && bounds.y + bounds.height < horizontalMidpoint;
    const bottomQuadrant = bounds.y > horizontalMidpoint;

    if (bounds.x < verticalMidpoint && bounds.x + bounds.width < verticalMidpoint) {
      if (topQuadrant) return 1;
      if (bottomQuadrant) return 2;
    } else if (bounds.x > verticalMidpoint) {
      if (topQuadrant) return 0;
      if (bottomQuadrant) return 3;
    }

    return -1;
  }

  /**
   * Check if bounds contain a collider
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

  /**
   * Get the node's bounds
   * @returns {Object} Bounds object
   */
  getBounds() {
    return { ...this.#bounds };
  }

  /**
   * Get child nodes
   * @returns {Array<QuadTree>} Child nodes
   */
  getNodes() {
    return this.#nodes;
  }

  /**
   * Clear the quadtree
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
}
