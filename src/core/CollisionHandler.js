import { EventTypes } from '../ecs/events/EventTypes.js';
import { Vector2D } from '../utils/Vector2D.js';
import { playSFX } from '../audio/SoundEngine.js';

/**
 * Handles collision detection and response between game entities
 */
export class CollisionHandler {
  /**
   * Create a new collision handler
   * @param {Object} services - Game services
   * @param {GameState} gameState - Game state
   */
  constructor(services, gameState) {
    this.services = services;
    this.gameState = gameState;
    this.eventSystem = services.eventSystem;
  }

  /**
   * Update collision detection and handle responses
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Skip collision detection if game is paused or over
    if (this.gameState.isPaused || this.gameState.isGameOver) return;

    // Direct collision checks
    this._checkPlayerVsAsteroids();
    this._checkProjectilesVsAsteroids();
    this._checkPlayerVsEnemies();
    this._checkProjectilesVsEnemies();
    this._checkEnemyProjectilesVsPlayer();
  }

  /**
   * Simple distance-based collision: player vs all active asteroids
   */
  _checkPlayerVsAsteroids() {
    const player = this.gameState.player;
    if (!player || !player.active) return;

    for (const asteroid of this.gameState.asteroids) {
      if (!asteroid.active) continue;
      const dx = player.x - asteroid.x;
      const dy = player.y - asteroid.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < player.radius + asteroid.radius) {
        this.handlePlayerAsteroidCollision(player, asteroid);
      }
    }
  }

  /**
   * Simple distance-based collision: projectiles vs all active asteroids
   */
  _checkProjectilesVsAsteroids() {
    const projectiles = this.gameState.projectiles || [];

    for (const projectile of projectiles) {
      if (!projectile.active) continue;
      if (projectile.owner !== 'player') continue;

      for (const asteroid of this.gameState.asteroids) {
        if (!asteroid.active) continue;
        const dx = projectile.x - asteroid.x;
        const dy = projectile.y - asteroid.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < projectile.radius + asteroid.radius) {
          this.handleProjectileAsteroidCollision(projectile, asteroid);
          projectile.active = false;
          break;
        }
      }
    }
  }

  /**
   * Player vs enemy ships (ram damage)
   */
  _checkPlayerVsEnemies() {
    const player = this.gameState.player;
    if (!player || !player.active) return;
    const enemies = this.gameState.enemies || [];

    for (const enemy of enemies) {
      if (!enemy.active) continue;
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < player.radius + enemy.radius) {
        this.handlePlayerEnemyCollision(player, enemy);
      }
    }
  }

  /**
   * Player projectiles vs enemy ships
   */
  _checkProjectilesVsEnemies() {
    const projectiles = this.gameState.projectiles || [];
    const enemies = this.gameState.enemies || [];

    for (const proj of projectiles) {
      if (!proj.active || proj.owner !== 'player') continue;
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < proj.radius + enemy.radius) {
          this.handleProjectileEnemyCollision(proj, enemy);
          proj.active = false;
          break;
        }
      }
    }
  }

  /**
   * Enemy projectiles vs player
   */
  _checkEnemyProjectilesVsPlayer() {
    const player = this.gameState.player;
    if (!player || !player.active) return;
    const projectiles = this.gameState.projectiles || [];

    for (const proj of projectiles) {
      if (!proj.active || proj.owner === 'player') continue;
      const dx = proj.x - player.x;
      const dy = proj.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < proj.radius + player.radius) {
        this.handleEnemyProjectilePlayerCollision(proj, player);
        proj.active = false;
      }
    }
  }

  /**
   * Check for player collisions with other entities
   * @private
   */
  checkPlayerCollisions() {
    const player = this.gameState.player;
    if (!player || !player.active) return;

    // Get potential collisions with player
    const collisions = this.services.collisionManager.checkCollisions(player);

    // Process each collision based on entity type
    collisions.forEach(entity => {
      switch(entity.type) {
        case 'enemy':
          this.handlePlayerEnemyCollision(player, entity);
          break;
        case 'asteroid':
          this.handlePlayerAsteroidCollision(player, entity);
          break;
        case 'station':
          this.handlePlayerStationCollision(player, entity);
          break;
        case 'cargo':
          this.handleCargoPlayerCollision(entity, player);
          break;
        case 'powerup':
          this.handlePowerupPlayerCollision(entity, player);
          break;
        default:
          // Unknown entity type
          break;
      }
    });
  }

  /**
   * Check for projectile collisions with other entities
   * @private
   */
  checkProjectileCollisions() {
    const projectiles = this.gameState.projectiles || [];

    // Process player projectiles
    projectiles.forEach(projectile => {
      if (!projectile.active) return;
      
      if (projectile.owner === 'player') {
        // Get potential collisions for this projectile
        const collisions = this.services.collisionManager.checkCollisions(projectile);
        
        // Process each collision
        for (const entity of collisions) {
          // Skip collision with the shooter
          if (entity === this.gameState.player) continue;
          
          let handled = false;
          
          switch(entity.type) {
            case 'enemy':
              this.handleProjectileEnemyCollision(projectile, entity);
              handled = true;
              break;
            case 'asteroid':
              this.handleProjectileAsteroidCollision(projectile, entity);
              handled = true;
              break;
            default:
              // Projectile does not collide with this entity type
              break;
          }
          
          // If collision was handled, deactivate projectile and stop checking
          if (handled) {
            projectile.active = false;
            break;
          }
        }
      } else if (projectile.owner === 'enemy') {
        // Enemy projectiles only collide with player
        if (this.gameState.player && this.gameState.player.isAlive) {
          if (this.services.collisionManager.checkCollision(projectile, this.gameState.player)) {
            this.handleEnemyProjectilePlayerCollision(projectile, this.gameState.player);
            projectile.active = false;
          }
        }
      }
    });
  }

  /**
   * Check for collisions between non-player entities
   * @private
   */
  checkEntityCollisions() {
    const enemies = this.gameState.enemies || [];
    const cargo = this.gameState.cargo || [];
    const stations = this.gameState.stations || [];

    // Check enemy-enemy collisions for avoidance behavior
    for (let i = 0; i < enemies.length; i++) {
      const enemy1 = enemies[i];
      if (!enemy1.active) continue;

      for (let j = i + 1; j < enemies.length; j++) {
        const enemy2 = enemies[j];
        if (!enemy2.active) continue;

        if (this.services.collisionManager.checkCollision(enemy1, enemy2)) {
          if (enemy1.onCollision) enemy1.onCollision(enemy2);
          if (enemy2.onCollision) enemy2.onCollision(enemy1);
        }
      }
    }

    // Check cargo-station collisions
    cargo.forEach(c => {
      if (!c.active) return;
      stations.forEach(station => {
        if (this.services.collisionManager.checkCollision(c, station)) {
          this.handleCargoStationCollision(c, station);
        }
      });
    });
  }

  /**
   * Handle collision between player and enemy
   * @param {Player} player - The player
   * @param {Enemy} enemy - The enemy
   * @private
   */
  handlePlayerEnemyCollision(player, enemy) {
    // Calculate damage based on velocity
    const relativeVelocity = Math.sqrt(
      Math.pow(player.velocityX - enemy.velocityX, 2) +
      Math.pow(player.velocityY - enemy.velocityY, 2)
    );
    
    const damageMultiplier = relativeVelocity / 5; // Adjust factor as needed
    const playerDamage = Math.max(1, 5 * damageMultiplier);
    const enemyDamage = Math.max(1, 10 * damageMultiplier);
    
    // Apply damage
    player.takeDamage(playerDamage);
    enemy.takeDamage(enemyDamage);
    
    // Create collision effect
    this.createCollisionEffect(player, enemy);
    
    // Emit collision event
    this.eventSystem.emit(EventTypes.COLLISION, {
      type: 'player_enemy',
      entities: [player, enemy],
      damage: {
        player: playerDamage,
        enemy: enemyDamage
      }
    });
  }

  /**
   * Handle player colliding with an asteroid — velocity-based damage + bounce
   */
  handlePlayerAsteroidCollision(player, asteroid) {
    if (player.invulnerable) return;

    // Player uses velocity.x/y (Vector2D), asteroid uses vx/vy
    const pvx = player.velocity ? player.velocity.x : 0;
    const pvy = player.velocity ? player.velocity.y : 0;
    const dvx = pvx - (asteroid.vx || 0);
    const dvy = pvy - (asteroid.vy || 0);
    const impact = Math.sqrt(dvx * dvx + dvy * dvy);
    const damage = Math.max(1, Math.floor(impact * 3));

    player.takeDamage(damage, this.gameState);
    playSFX('hit');

    // Screen shake proportional to damage
    if (this.gameState._gameLoop) {
      this.gameState._gameLoop._shakeIntensity = Math.min(20, damage * 2);
    }

    // Bounce player away from asteroid
    const dx = player.x - asteroid.x;
    const dy = player.y - asteroid.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const pushForce = 3;
    if (player.velocity) {
      player.velocity = new Vector2D((dx / dist) * pushForce, (dy / dist) * pushForce);
    }

    this.eventSystem.emit(EventTypes.COLLISION, {
      type: 'player_asteroid',
      entities: [player, asteroid],
      damage
    });
  }

  /**
   * Handle player overlapping station — no damage, handled by docking system
   */
  handlePlayerStationCollision(player, station) {
    // Docking is handled in GameLoop.fixedUpdate via station.checkDocking
    // No collision response needed here
  }

  /**
   * Handle player projectile hitting an enemy
   */
  handleProjectileEnemyCollision(projectile, enemy) {
    const destroyed = enemy.takeDamage(projectile.damage);

    if (destroyed) {
      this.gameState.updateScore(enemy.creditReward || 25);
      // Award credits for kill
      if (this.gameState.player) {
        this.gameState.player.credits += enemy.creditReward || 25;
      }
    }

    this.eventSystem.emit(EventTypes.COLLISION, {
      type: 'projectile_enemy',
      entities: [projectile, enemy],
      damage: projectile.damage
    });
  }

  /**
   * Handle player projectile hitting an asteroid — damage, destroy, drop resources
   */
  handleProjectileAsteroidCollision(projectile, asteroid) {
    const destroyed = asteroid.takeDamage(projectile.damage);

    if (destroyed) {
      playSFX('explode');
      // Drop resources
      const drops = asteroid.dropResources();
      drops.forEach(resource => {
        this.gameState.addResource(resource);
      });

      this.gameState.updateScore(10);

      this.eventSystem.emit(EventTypes.COLLISION, {
        type: 'asteroid_destroyed',
        entities: [asteroid],
        resourcesDropped: drops.length
      });
    } else {
      this.eventSystem.emit(EventTypes.COLLISION, {
        type: 'projectile_asteroid',
        entities: [projectile, asteroid],
        damage: projectile.damage
      });
    }
  }

  /**
   * Handle enemy projectile hitting the player
   */
  handleEnemyProjectilePlayerCollision(projectile, player) {
    if (player.invulnerable) return;
    player.takeDamage(projectile.damage, this.gameState);
    playSFX('hit');
    if (this.gameState._gameLoop) {
      this.gameState._gameLoop._shakeIntensity = Math.min(15, projectile.damage * 1.5);
    }

    this.eventSystem.emit(EventTypes.COLLISION, {
      type: 'enemy_projectile_player',
      entities: [projectile, player],
      damage: projectile.damage
    });
  }

  /**
   * Handle player picking up cargo/resource
   */
  handleCargoPlayerCollision(cargo, player) {
    if (!cargo.active) return;

    // Check if player has cargo space
    const currentCargo = player.resources || 0;
    if (currentCargo < player.cargoCapacity) {
      player.resources = (player.resources || 0) + (cargo.value || cargo.resourceValue || 1);
      cargo.active = false;

      this.eventSystem.emit(EventTypes.COLLISION, {
        type: 'cargo_pickup',
        entities: [cargo, player],
        value: cargo.value || cargo.resourceValue || 1
      });
    }
  }

  /**
   * Handle player picking up a powerup
   */
  handlePowerupPlayerCollision(powerup, player) {
    if (!powerup.active) return;

    // Apply powerup effect
    if (powerup.effect === 'health') {
      player.health = Math.min(player.maxHealth || 100, player.health + 25);
    } else if (powerup.effect === 'energy') {
      player.energy = Math.min(100, player.energy + 25);
    }

    powerup.active = false;

    this.eventSystem.emit(EventTypes.COLLISION, {
      type: 'powerup_pickup',
      entities: [powerup, player]
    });
  }

  /**
   * Handle cargo landing at a station — not used currently
   */
  handleCargoStationCollision(cargo, station) {
    // Cargo doesn't auto-sell at station; player must trade manually
  }

  /**
   * Create a collision effect between two entities
   * @param {Entity} entity1 - First entity
   * @param {Entity} entity2 - Second entity
   * @private
   */
  createCollisionEffect(entity1, entity2) {
    // Calculate collision point (midpoint between entities)
    const x = (entity1.x + entity2.x) / 2;
    const y = (entity1.y + entity2.y) / 2;
    
    // Create particles based on collision velocity and entities
    // ...
    
    // Play sound effect
    if (this.services.audioManager?.playSoundAtPosition) {
      this.services.audioManager.playSoundAtPosition('collision', x, y);
    }
  }
} 