import { ObjectPool } from './ObjectPool.js';

export class Combat {
  static checkCollisions(ships, asteroids) {
    // Check ship-asteroid collisions
    for (const ship of ships) {
      if (!ship.isAlive) continue;

      for (const asteroid of asteroids) {
        const dx = ship.x - asteroid.x;
        const dy = ship.y - asteroid.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < ship.size + asteroid.size) {
          this.handleShipAsteroidCollision(ship, asteroid);
        }
      }
    }

    // Check projectile collisions
    const projectiles = ObjectPool.activeObjects.projectile;
    for (const projectile of projectiles) {
      // Check projectile-asteroid collisions
      for (const asteroid of asteroids) {
        if (this.checkProjectileHit(projectile, asteroid)) {
          this.handleProjectileAsteroidHit(projectile, asteroid);
          break;
        }
      }

      // Check projectile-ship collisions
      for (const ship of ships) {
        if (!ship.isAlive) continue;
        if (this.checkProjectileHit(projectile, ship)) {
          this.handleProjectileShipHit(projectile, ship);
          break;
        }
      }
    }
  }

  static checkProjectileHit(projectile, target) {
    const dx = projectile.x - target.x;
    const dy = projectile.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < target.size;
  }

  static handleShipAsteroidCollision(ship, asteroid) {
    // Calculate impact damage based on relative velocity
    const relativeVx = ship.vx - asteroid.vx;
    const relativeVy = ship.vy - asteroid.vy;
    const impactSpeed = Math.sqrt(relativeVx * relativeVx + relativeVy * relativeVy);

    const damage = Math.ceil(impactSpeed * 10 * (1 - ship.impactResistance));

    // Apply damage to ship
    if (ship.shield > 0) {
      ship.shield = Math.max(0, ship.shield - damage);
      // Create shield impact effect
      for (let i = 0; i < 5; i++) {
        ObjectPool.get('particle', ship.x, ship.y, '#0ff');
      }
    } else {
      ship.health = Math.max(0, ship.health - damage);
      // Create damage effect
      for (let i = 0; i < 5; i++) {
        ObjectPool.get('particle', ship.x, ship.y, '#f00');
      }
    }

    // Calculate direction for bounce effect
    const dx = ship.x - asteroid.x;
    const dy = ship.y - asteroid.y;

    // Bounce effect
    const angle = Math.atan2(dy, dx);
    const bounceForce = impactSpeed * 0.5;
    ship.vx = Math.cos(angle) * bounceForce;
    ship.vy = Math.sin(angle) * bounceForce;

    // Check ship death
    ship.checkDeath();
  }

  static handleProjectileAsteroidHit(projectile, asteroid) {
    // Apply damage to asteroid
    asteroid.health -= projectile.damage;

    // Create hit effect
    for (let i = 0; i < 3; i++) {
      ObjectPool.get('particle', projectile.x, projectile.y, '#ff0');
    }

    // Check if asteroid is destroyed
    if (asteroid.health <= 0) {
      asteroid.dropCargo();
      // Create explosion effect
      for (let i = 0; i < 20; i++) {
        ObjectPool.get('particle', asteroid.x, asteroid.y, '#f84');
      }
    }

    // Remove projectile
    ObjectPool.release('projectile', projectile);
  }

  static handleProjectileShipHit(projectile, ship) {
    // Apply damage to ship
    const damage = projectile.damage;

    if (ship.shield > 0) {
      ship.shield = Math.max(0, ship.shield - damage);
      // Create shield impact effect
      for (let i = 0; i < 3; i++) {
        ObjectPool.get('particle', projectile.x, projectile.y, '#0ff');
      }
    } else {
      ship.health = Math.max(0, ship.health - damage);
      // Create damage effect
      for (let i = 0; i < 3; i++) {
        ObjectPool.get('particle', projectile.x, projectile.y, '#f00');
      }
    }

    // Check ship death
    ship.checkDeath();

    // Remove projectile
    ObjectPool.release('projectile', projectile);
  }

  static applyShieldRegeneration(ships) {
    for (const ship of ships) {
      if (!ship.isAlive || ship.shield >= ship.maxShield) continue;
      ship.shield = Math.min(ship.maxShield, ship.shield + ship.shieldRegen);
    }
  }

  static applyHealthRegeneration(ships) {
    for (const ship of ships) {
      if (!ship.isAlive || ship.health >= ship.maxHealth) continue;
      ship.health = Math.min(ship.maxHealth, ship.health + ship.healthRegen);
    }
  }
}
