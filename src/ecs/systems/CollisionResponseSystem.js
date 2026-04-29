import { System } from '../System';
import { Vector2D } from '../../core/Vector2D';

/**
 * System that handles physics-based collision response.
 */
export class CollisionResponseSystem extends System {
  /**
   * Create a new collision response system
   */
  constructor() {
    super(2); // High priority, after CollisionSystem
  }

  /**
   * Initialize the system
   */
  initialize() {
    this.requireComponents(['Collider', 'RigidBody']);
  }

  /**
   * Update the system
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (!this.isEnabled()) return;

    // Get all collision events from the world
    const collisionEvents = this.getWorld().getEvents('collision');
    if (!collisionEvents) return;

    for (const event of collisionEvents) {
      const { entity1, entity2, collider1, collider2, intersection, isTrigger } = event;

      // Skip trigger collisions
      if (isTrigger) continue;

      // Get rigid bodies
      const body1 = entity1.getComponent('RigidBody');
      const body2 = entity2.getComponent('RigidBody');

      // Skip if either body is missing
      if (!body1 || !body2) continue;

      // Resolve collision
      this.#resolveCollision(body1, body2, intersection);
    }
  }

  /**
   * Resolve a collision between two rigid bodies
   * @private
   * @param {RigidBody} body1 - First rigid body
   * @param {RigidBody} body2 - Second rigid body
   * @param {Object} intersection - Intersection data
   */
  #resolveCollision(body1, body2, intersection) {
    // Calculate relative velocity
    const relativeVelocity = body2.getVelocity().subtract(body1.getVelocity());

    // Calculate collision normal
    const normal = this.#calculateCollisionNormal(body1, body2, intersection);

    // Calculate relative velocity along normal
    const velocityAlongNormal = relativeVelocity.dot(normal);

    // Don't resolve if objects are moving apart
    if (velocityAlongNormal > 0) return;

    // Calculate restitution (bounciness)
    const restitution = Math.min(body1.getRestitution(), body2.getRestitution());

    // Calculate impulse scalar
    const impulseScalar = -(1 + restitution) * velocityAlongNormal;
    const impulse = normal.multiply(impulseScalar);

    // Apply impulse
    if (!body1.isStatic()) {
      body1.applyImpulse(impulse.multiply(-1));
    }
    if (!body2.isStatic()) {
      body2.applyImpulse(impulse);
    }

    // Apply friction
    this.#applyFriction(body1, body2, normal, intersection);
  }

  /**
   * Calculate collision normal
   * @private
   * @param {RigidBody} body1 - First rigid body
   * @param {RigidBody} body2 - Second rigid body
   * @param {Object} intersection - Intersection data
   * @returns {Vector2D} Collision normal
   */
  #calculateCollisionNormal(body1, body2, intersection) {
    const center1 = body1.getPosition();
    const center2 = body2.getPosition();
    const dx = center2.x - center1.x;
    const dy = center2.y - center1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    return new Vector2D(dx / length, dy / length);
  }

  /**
   * Apply friction between colliding bodies
   * @private
   * @param {RigidBody} body1 - First rigid body
   * @param {RigidBody} body2 - Second rigid body
   * @param {Vector2D} normal - Collision normal
   * @param {Object} intersection - Intersection data
   */
  #applyFriction(body1, body2, normal, intersection) {
    // Calculate relative velocity
    const relativeVelocity = body2.getVelocity().subtract(body1.getVelocity());

    // Calculate tangent vector
    const tangent = relativeVelocity.subtract(normal.multiply(relativeVelocity.dot(normal)));
    const tangentLength = tangent.length();
    if (tangentLength === 0) return;

    // Normalize tangent
    const normalizedTangent = tangent.multiply(1 / tangentLength);

    // Calculate friction coefficient
    const friction = Math.min(body1.getFriction(), body2.getFriction());

    // Calculate friction impulse
    const frictionImpulse = normalizedTangent.multiply(-friction * relativeVelocity.length());

    // Apply friction impulse
    if (!body1.isStatic()) {
      body1.applyImpulse(frictionImpulse.multiply(-1));
    }
    if (!body2.isStatic()) {
      body2.applyImpulse(frictionImpulse);
    }
  }
}
