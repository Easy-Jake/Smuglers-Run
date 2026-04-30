import { Entity } from './Entity.js';
import { Projectile } from './Projectile.js';

/**
 * AI Enemy Ship — patrols asteroid fields, attacks player on sight
 *
 * Behaviors:
 *   PATROL  — follows waypoints through asteroid fields
 *   CHASE   — pursues player when detected within sensor range
 *   ATTACK  — fires at player when in weapon range
 *   RETURN  — returns to patrol route after losing contact
 *
 * Kill Switch stealth: if player.isPowered() === false, enemy can't detect them
 */
export class Enemy extends Entity {
  constructor(x, y, config = {}) {
    super(x, y);
    this.type = 'enemy';

    // Ship type
    this.enemyType = config.enemyType || 'scout'; // 'scout' | 'heavy'
    const isHeavy = this.enemyType === 'heavy';

    // Stats
    this.health = isHeavy ? 80 : 40;
    this.maxHealth = this.health;
    this.speed = isHeavy ? 1.2 : 2.0;
    this.rotationSpeed = isHeavy ? 0.03 : 0.05;
    this.radius = isHeavy ? 25 : 18;
    this.width = this.radius * 2;
    this.height = this.radius * 2;
    this.active = true;
    this.rotation = Math.random() * Math.PI * 2;

    // Combat
    this.damage = isHeavy ? 15 : 8;
    this.sensorRange = isHeavy ? 600 : 800;  // detection radius
    this.attackRange = isHeavy ? 350 : 250;   // shooting range
    this.shootCooldown = 0;
    this.shootRate = isHeavy ? 90 : 60; // frames between shots
    this.projectileSpeed = 6;
    this.projectileDamage = this.damage;

    // Movement
    this.vx = 0;
    this.vy = 0;
    this.maxSpeed = this.speed;

    // AI State
    this.state = 'patrol'; // 'patrol' | 'chase' | 'attack' | 'return'
    this.target = null;
    this.lastKnownTargetPos = null;

    // Patrol waypoints
    this.waypoints = config.waypoints || [];
    this.currentWaypoint = 0;
    this.patrolOrigin = { x, y };

    // Sprite — strip black background
    this.sprite = null;
    this.spriteLoaded = false;
    this._loadSprite(isHeavy ? 'assets/enemy-heavy.png' : 'assets/enemy-scout.png');

    // Loot
    this.creditReward = isHeavy ? 50 : 25;
  }

  update(deltaTime, gameState) {
    if (!this.active) return;

    // Cooldowns
    if (this.shootCooldown > 0) this.shootCooldown -= deltaTime * 60;

    // Get player reference
    const player = gameState?.player || this.target;
    if (!player) {
      this._patrol(deltaTime);
      return;
    }

    // Distance to player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Stealth check — can't detect player if they're running dark
    const playerVisible = player.isPowered ? player.isPowered() : true;

    // State machine
    switch (this.state) {
      case 'patrol':
        if (playerVisible && dist < this.sensorRange) {
          this.state = 'chase';
          this.target = player;
        } else {
          this._patrol(deltaTime);
        }
        break;

      case 'chase':
        if (!playerVisible || dist > this.sensorRange * 1.5) {
          // Lost contact
          this.lastKnownTargetPos = { x: player.x, y: player.y };
          this.state = 'return';
        } else if (dist < this.attackRange) {
          this.state = 'attack';
        } else {
          this._moveToward(player.x, player.y, this.speed, deltaTime);
        }
        break;

      case 'attack':
        if (!playerVisible || dist > this.attackRange * 1.3) {
          this.state = 'chase';
        } else {
          // Strafe / orbit at attack range
          this._orbitTarget(player.x, player.y, this.attackRange * 0.8, deltaTime);
          // Shoot
          if (this.shootCooldown <= 0) {
            this._shoot(player, gameState);
          }
        }
        break;

      case 'return':
        // Go back to patrol origin or last waypoint
        const returnTarget = this.waypoints.length > 0
          ? this.waypoints[this.currentWaypoint]
          : this.patrolOrigin;
        const rdx = returnTarget.x - this.x;
        const rdy = returnTarget.y - this.y;
        const rdist = Math.sqrt(rdx * rdx + rdy * rdy);

        if (rdist < 50) {
          this.state = 'patrol';
        } else if (playerVisible && dist < this.sensorRange) {
          this.state = 'chase';
          this.target = player;
        } else {
          this._moveToward(returnTarget.x, returnTarget.y, this.speed, deltaTime);
        }
        break;
    }

    // Apply velocity
    this.x += this.vx * deltaTime * 60;
    this.y += this.vy * deltaTime * 60;

    // Friction
    this.vx *= 0.98;
    this.vy *= 0.98;

    // World bounds
    this.x = Math.max(0, Math.min(8000, this.x));
    this.y = Math.max(0, Math.min(8000, this.y));
  }

  _patrol(deltaTime) {
    if (this.waypoints.length === 0) {
      // Idle drift
      return;
    }

    const wp = this.waypoints[this.currentWaypoint];
    const dx = wp.x - this.x;
    const dy = wp.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 30) {
      // Reached waypoint, go to next
      this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
    } else {
      this._moveToward(wp.x, wp.y, this.speed * 0.6, deltaTime);
    }
  }

  _moveToward(tx, ty, speed, deltaTime) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const targetAngle = Math.atan2(dy, dx);

    // Smooth rotation toward target
    let diff = targetAngle - this.rotation;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    if (Math.abs(diff) < this.rotationSpeed) {
      this.rotation = targetAngle;
    } else {
      this.rotation += Math.sign(diff) * this.rotationSpeed;
    }

    // Thrust in facing direction
    this.vx += Math.cos(this.rotation) * speed * 0.05;
    this.vy += Math.sin(this.rotation) * speed * 0.05;

    // Clamp speed
    const s = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (s > this.maxSpeed) {
      this.vx = (this.vx / s) * this.maxSpeed;
      this.vy = (this.vy / s) * this.maxSpeed;
    }
  }

  _orbitTarget(tx, ty, orbitDist, deltaTime) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Rotate to face target
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - this.rotation;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.rotation += Math.sign(diff) * this.rotationSpeed;

    // Orbit: move perpendicular to target direction
    const perpAngle = targetAngle + Math.PI / 2;
    this.vx += Math.cos(perpAngle) * this.speed * 0.03;
    this.vy += Math.sin(perpAngle) * this.speed * 0.03;

    // Maintain distance
    if (dist < orbitDist * 0.8) {
      // Too close, back off
      this.vx -= (dx / dist) * 0.05;
      this.vy -= (dy / dist) * 0.05;
    } else if (dist > orbitDist * 1.2) {
      // Too far, close in
      this.vx += (dx / dist) * 0.05;
      this.vy += (dy / dist) * 0.05;
    }
  }

  _shoot(target, gameState) {
    this.shootCooldown = this.shootRate;

    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    const proj = new Projectile(
      this.x + Math.cos(angle) * this.radius,
      this.y + Math.sin(angle) * this.radius,
      angle,
      this.projectileSpeed,
      this.projectileDamage,
      false // fromPlayer = false (enemy projectile)
    );

    if (gameState?.addProjectile) {
      gameState.addProjectile(proj);
    } else if (gameState?.projectiles) {
      gameState.projectiles.push(proj);
    }
  }

  _loadSprite(src) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const cx = c.getContext('2d');
      cx.drawImage(img, 0, 0);
      const imageData = cx.getImageData(0, 0, c.width, c.height);
      const data = imageData.data;
      const threshold = 35;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness < threshold) {
          data[i + 3] = 0;
        } else if (brightness < threshold + 20) {
          data[i + 3] = Math.round(((brightness - threshold) / 20) * 255);
        }
      }
      cx.putImageData(imageData, 0, 0);
      this.sprite = c;
      this.spriteLoaded = true;
    };
    img.src = src;
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.active = false;
      return true; // destroyed
    }
    // Aggro on attacker
    this.state = 'chase';
    return false;
  }

  render(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation - Math.PI / 2); // sprite points down, rotate to match heading

    const spriteSize = this.radius * 3;

    if (this.spriteLoaded) {
      ctx.drawImage(this.sprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
    } else {
      // Fallback: red diamond
      ctx.fillStyle = this.enemyType === 'heavy' ? '#a44' : '#f44';
      ctx.strokeStyle = '#f88';
      ctx.lineWidth = 2;
      const r = this.radius;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(-r * 0.7, r * 0.5);
      ctx.lineTo(0, r * 0.3);
      ctx.lineTo(r * 0.7, r * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();

    // Health bar if damaged
    if (this.health < this.maxHealth) {
      const barW = this.radius * 2;
      ctx.fillStyle = 'black';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 10, barW, 4);
      ctx.fillStyle = '#f44';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 10, barW * (this.health / this.maxHealth), 4);
    }

    // State indicator (small text for debug — remove later)
    // ctx.fillStyle = '#ff0';
    // ctx.font = '8px monospace';
    // ctx.textAlign = 'center';
    // ctx.fillText(this.state, this.x, this.y + this.radius + 12);
  }

  destroy() {
    this.active = false;
  }

  onCollision(other) {
    // Bounce away from other enemies
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.vx += (dx / dist) * 0.5;
    this.vy += (dy / dist) * 0.5;
  }
}
