import { ObjectPool } from '../../systems/ObjectPool.js';
import { CONSTANTS } from '../../config/constants.js';

export class ShipCombatComponent {
  constructor(ship) {
    this.ship = ship;
    
    // Combat Properties
    this.health = CONSTANTS.PLAYER.MAX_HEALTH;
    this.maxHealth = CONSTANTS.PLAYER.MAX_HEALTH;
    this.shield = 0;
    this.maxShield = 0;
    this.shieldRegen = 0;
    this.healthRegen = 0;
    this.damage = 10;
    this.impactResistance = 0;

    // Weapon Properties
    this.fireRate = 1;
    this.multiShot = 1;
    this.spreadAngle = 0;
    this.shootCooldown = 0;
    this.ammo = ship.isAI ? Infinity : CONSTANTS.PLAYER.MAX_AMMO;
    this.maxAmmo = CONSTANTS.PLAYER.MAX_AMMO;
    this.ammoRegenRate = 0.1;
    this.ammoRegenDelay = 60;
    this.lastShotTime = 0;
    this.laserWidth = 3;
    this.laserColor = ship.color;

    // Weapon Systems
    this.hasBombs = false;
    this.bombDamage = 0;
    this.bombRadius = 0;
    this.bombCluster = 1;
    this.bombCooldown = 0;
    this.shotgunEnabled = false;
    this.shotgunShots = 0;
    this.shotgunSpread = 0;
    this.shotgunDamageMultiplier = 1;
  }

  update() {
    if (!this.ship.isAlive) return;

    // Handle cooldowns
    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.bombCooldown > 0) this.bombCooldown--;

    // Regenerate ammo
    if (!this.ship.isAI && this.ammo < this.maxAmmo) {
      const timeSinceLastShot = Date.now() - this.lastShotTime;
      if (timeSinceLastShot > this.ammoRegenDelay) {
        this.ammo = Math.min(this.maxAmmo, this.ammo + this.ammoRegenRate);
      }
    }

    // Regenerate shields and health (only when powered)
    if (this.ship.isPowered()) {
      if (this.shield < this.maxShield) {
        this.shield = Math.min(this.maxShield, this.shield + this.shieldRegen);
      }
      if (this.health < this.maxHealth) {
        this.health = Math.min(this.maxHealth, this.health + this.healthRegen);
      }
    }
  }

  shoot() {
    // Can't shoot with power off
    if (!this.ship.isPowered()) return;
    if (this.shootCooldown > 0 || this.ammo <= 0) return;

    const projectileX = this.ship.x + Math.cos(this.ship.angle) * this.ship.size;
    const projectileY = this.ship.y + Math.sin(this.ship.angle) * this.ship.size;

    if (this.shotgunEnabled) {
      this._fireShotgun(projectileX, projectileY);
    } else if (this.multiShot > 1) {
      this._fireMultishot(projectileX, projectileY);
    } else {
      this._fireSingleShot(projectileX, projectileY);
    }

    this.shootCooldown = 60 / this.fireRate;
    if (!this.ship.isAI) {
      this.ammo--;
      this.lastShotTime = Date.now();
    }
  }

  _fireShotgun(x, y) {
    const halfSpread = this.shotgunSpread / 2;
    const angleStep = this.shotgunShots > 1 ? this.shotgunSpread / (this.shotgunShots - 1) : 0;
    const startAngle = this.ship.angle - halfSpread;

    for (let i = 0; i < this.shotgunShots; i++) {
      const shotAngle = startAngle + angleStep * i;
      ObjectPool.get(
        'projectile',
        x,
        y,
        shotAngle,
        10,
        this.damage * this.shotgunDamageMultiplier,
        this.laserColor,
        this.laserWidth
      );
    }
  }

  _fireMultishot(x, y) {
    const halfSpread = this.spreadAngle / 2;
    const angleStep = this.multiShot > 1 ? this.spreadAngle / (this.multiShot - 1) : 0;
    const startAngle = this.ship.angle - halfSpread;

    for (let i = 0; i < this.multiShot; i++) {
      const shotAngle = startAngle + angleStep * i;
      ObjectPool.get(
        'projectile',
        x,
        y,
        shotAngle,
        10,
        this.damage,
        this.laserColor,
        this.laserWidth
      );
    }
  }

  _fireSingleShot(x, y) {
    ObjectPool.get(
      'projectile',
      x,
      y,
      this.ship.angle,
      10,
      this.damage,
      this.laserColor,
      this.laserWidth
    );
  }

  takeDamage(amount) {
    const damage = Math.max(0, amount - this.impactResistance);
    
    if (this.shield > 0) {
      const shieldDamage = Math.min(this.shield, damage);
      this.shield -= shieldDamage;
      
      if (this.shield <= 0) {
        this.health -= (damage - shieldDamage);
      }
    } else {
      this.health -= damage;
    }

    if (this.health <= 0) {
      this.ship.isAlive = false;
      this.ship.deaths++;
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addShield(amount) {
    this.shield = Math.min(this.maxShield, this.shield + amount);
  }

  setMaxShield(amount) {
    this.maxShield = amount;
    this.shield = Math.min(this.shield, amount);
  }

  setMaxHealth(amount) {
    this.maxHealth = amount;
    this.health = Math.min(this.health, amount);
  }
} 