import { GAME_CONFIG } from '../config/gameConfig.js';
import { Projectile } from './Projectile.js';
import { Particle } from './Particle.js';
import { Entity } from './Entity.js';
import { Vector2D } from '../utils/Vector2D.js';
import { PlayerInputHandler } from './components/PlayerInputHandler.js';
import { PowerSystem } from './components/PowerSystem.js';
import { playSFX } from '../audio/SoundEngine.js';

const PC = GAME_CONFIG.PLAYER;

export class Player extends Entity {
  constructor(x, y) {
    super(x, y);
    this.type = 'player';

    // Basic Properties
    this.width = 32;
    this.height = 32;
    this.radius = PC.RADIUS;
    this.angle = -Math.PI / 2; // point up
    this.rotation = -Math.PI / 2;
    this.velocity = new Vector2D();
    this.active = true;
    this.thrusting = false;

    // Movement Properties
    this.speed = PC.SPEED;
    this.rotationSpeed = PC.ROTATION_SPEED;
    this.thrustPower = PC.THRUST_POWER;
    this.maxSpeed = PC.MAX_SPEED;
    this.acceleration = PC.ACCELERATION;
    this.friction = PC.FRICTION;
    this.thrustMultiplier = 1.0;
    this.fuelEfficiency = 1.0;

    // Combat Properties
    this.health = PC.STARTING_HEALTH;
    this.maxHealth = PC.MAX_HEALTH;
    this.shootCooldown = 0;
    this.invulnerable = false;
    this.invulnerabilityTime = 0;
    this.ammo = PC.MAX_AMMO;
    this.maxAmmo = PC.MAX_AMMO;

    // Energy system (from AD)
    this.energy = PC.STARTING_ENERGY;
    this.maxEnergy = PC.STARTING_ENERGY;
    this.fuel = PC.STARTING_ENERGY; // alias for backward compat

    // Economy
    this.credits = PC.STARTING_CREDITS;
    this.resources = 0;
    this.cargoCapacity = PC.INITIAL_CARGO_CAPACITY;

    // Resource collection
    this.resourcePickupRange = 50;

    // Docking state
    this.isDocked = false;
    this.isUndocking = false;
    this.undockCooldown = 0;
    this.isDockingRequested = false;

    // Power Management System (3 subsystems: engines, weapons, stabilizer)
    this.powerSystem = new PowerSystem(this);
    this.baseThrustPower = PC.THRUST_POWER; // store base for restoration after failures

    // Upgrade levels (all start at 1)
    this.cargoCapacityLevel = 1;
    this.thrustEfficiencyLevel = 1;
    this.ammoEfficiencyLevel = 1;
    this.speedLevel = 1;
    this.resourceRangeLevel = 1;
    this.blasterDamageLevel = 1;
    this.energyCapacityLevel = 1;

    // Derived combat values
    this.projectileDamage = GAME_CONFIG.PROJECTILES.DAMAGE;
    this.thrustCost = PC.ENERGY_COST.THRUST;
    this.shotCost = PC.ENERGY_COST.SHOT;

    // Ship sprite — remove black background via canvas processing
    this.sprite = null;
    this.spriteLoaded = false;
    this._loadSprite('assets/player-ship.png');

    // Initialize components
    this.inputHandler = new PlayerInputHandler(this);
  }

  update(deltaTime) {
    if (!this.active) return;

    // Handle undocking cooldown
    if (this.undockCooldown > 0) {
      this.undockCooldown -= deltaTime * 60;
      if (this.undockCooldown <= 0) {
        this.isUndocking = false;
      }
    }

    // Update power system (heat, failures, oxygen, inertial mode)
    this.powerSystem.update(deltaTime);

    // Update input handler (applies velocity & friction)
    this.inputHandler.update(deltaTime);

    // Sync fuel/energy
    this.fuel = this.energy;

    // Handle cooldowns
    if (this.shootCooldown > 0) {
      this.shootCooldown -= deltaTime * 60;
    }

    if (this.invulnerable) {
      this.invulnerabilityTime -= deltaTime * 60;
      if (this.invulnerabilityTime <= 0) {
        this.invulnerable = false;
      }
    }

    // Reset thrusting flag each frame
    this.thrusting = false;
  }

  move(controls) {
    if (this.isDocked) return;
    // Kill switch — no thrust, just drift (rotation still works for aiming)
    if (!this.isPowered()) return;
    this.inputHandler.handleInput(controls);
    // thrusting flag is set by inputHandler for flame rendering
  }

  takeDamage(amount, gameState) {
    if (this.invulnerable) return;

    this.health = Math.max(0, this.health - amount);
    this.invulnerable = true;
    this.invulnerabilityTime = 60;

    // Damage particles
    for (let i = 0; i < 5; i++) {
      const particle = new Particle(
        this.x + (Math.random() - 0.5) * this.radius,
        this.y + (Math.random() - 0.5) * this.radius,
        'damage'
      );
      if (gameState?.addParticle) {
        gameState.addParticle(particle);
      }
    }

    if (this.health <= 0) {
      if (gameState) gameState.gameOver();
    }
  }

  shoot(gameState) {
    if (!this.isPowered()) return; // Can't shoot when dark
    if (this.shootCooldown > 0 || this.isDocked) return;

    // Weapon failure doubles shot cost
    const costMult = this.powerSystem?.getWeaponCostMultiplier() || 1.0;
    const actualCost = this.shotCost * costMult;
    if (this.energy < actualCost) return;

    this.energy -= actualCost;
    playSFX('shoot');

    // Weapon power scaling — affects damage and projectile speed
    const wpnMult = this.powerSystem?.getWeaponPowerMultiplier() || 1.0;
    const damage = this.projectileDamage * wpnMult;
    const speed = GAME_CONFIG.PROJECTILES.SPEED * (0.7 + wpnMult * 0.3);

    const projectile = new Projectile(
      this.x + Math.cos(this.angle) * this.radius,
      this.y + Math.sin(this.angle) * this.radius,
      this.angle,
      speed,
      damage,
      true
    );

    if (gameState?.addProjectile) {
      gameState.addProjectile(projectile);
    } else if (gameState?.projectiles) {
      gameState.projectiles.push(projectile);
    }

    this.shootCooldown = 15; // quarter second at 60 FPS
  }

  addAmmo(amount) {
    this.ammo = Math.min(this.maxAmmo, this.ammo + amount);
  }

  addResources(amount, resourceType = 'carbon') {
    const canAdd = Math.min(amount, this.cargoCapacity - this.resources);
    if (canAdd <= 0) return 0;
    this.resources += canAdd;
    // Track by type for proper sell prices
    if (!this.cargoByType) this.cargoByType = {};
    this.cargoByType[resourceType] = (this.cargoByType[resourceType] || 0) + canAdd;
    return canAdd;
  }

  // Calculate total sell value of cargo across all types
  getCargoValue() {
    if (!this.cargoByType) return 0;
    // sellPrice values from RESOURCE_TYPES
    const PRICES = {
      hydro: 3, carbon: 8, ferro: 18, silicrystal: 45, titan: 85,
      nebula: 150, aurum: 300, thorium: 500, darkmatter: 2000,
    };
    let total = 0;
    for (const [type, count] of Object.entries(this.cargoByType)) {
      total += (PRICES[type] || 5) * count;
    }
    return total;
  }

  // Sell all cargo, return total credits earned
  sellAllCargo() {
    const earned = this.getCargoValue();
    this.credits += earned;
    this.resources = 0;
    this.cargoByType = {};
    return earned;
  }

  refuelEnergy(amount) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
    this.fuel = this.energy;
  }

  // Docking
  startUndocking(station) {
    this.isDocked = false;
    this.isUndocking = true;
    this.undockCooldown = 60; // 1 second

    // Push away from station
    const angle = Math.random() * Math.PI * 2;
    this.x = station.x + Math.cos(angle) * (station.dockingRadius + 30);
    this.y = station.y + Math.sin(angle) * (station.dockingRadius + 30);
    this.velocity = new Vector2D(
      Math.cos(angle) * 0.5,
      Math.sin(angle) * 0.5
    );
  }

  // Power / Kill Switch — delegates to PowerSystem
  togglePower() {
    const wasPowered = this.isPowered();
    const result = this.powerSystem.togglePower();
    playSFX(this.isPowered() ? 'powerUp' : 'powerDown');
    return result;
  }

  isPowered() {
    return this.powerSystem.isPowered();
  }

  // Upgrade methods
  recalculateCosts() {
    const speedMult = 1 + (this.speedLevel - 1) * PC.ENERGY_COST.SPEED_MULTIPLIER;
    const damageMult = 1 + (this.blasterDamageLevel - 1) * PC.ENERGY_COST.DAMAGE_MULTIPLIER;
    this.thrustCost = PC.ENERGY_COST.THRUST * speedMult / this.thrustEfficiencyLevel;
    this.shotCost = PC.ENERGY_COST.SHOT * damageMult / this.ammoEfficiencyLevel;
    this.resourcePickupRange = 50 * (1 + (this.resourceRangeLevel - 1) * 0.2);
    this.projectileDamage = GAME_CONFIG.PROJECTILES.DAMAGE * (1 + (this.blasterDamageLevel - 1) * 0.25);
  }

  upgradeCargoCapacity() { this.cargoCapacityLevel++; this.cargoCapacity += 20; }
  upgradeThrustEfficiency() { this.thrustEfficiencyLevel++; this.recalculateCosts(); }
  upgradeAmmoEfficiency() { this.ammoEfficiencyLevel++; this.recalculateCosts(); }
  upgradeSpeed() { this.speedLevel++; this.maxSpeed += 1; this.recalculateCosts(); }
  upgradeResourceRange() { this.resourceRangeLevel++; this.recalculateCosts(); }
  upgradeBlasterDamage() { this.blasterDamageLevel++; this.recalculateCosts(); }
  upgradeEnergyCapacity() { this.energyCapacityLevel++; this.maxEnergy += 25; this.energy = Math.min(this.energy + 25, this.maxEnergy); }

  /**
   * Load sprite and strip black/dark background to transparent
   */
  _loadSprite(src) {
    const img = new Image();
    img.onload = () => {
      // Draw to offscreen canvas to access pixel data
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const cx = c.getContext('2d');
      cx.drawImage(img, 0, 0);

      const imageData = cx.getImageData(0, 0, c.width, c.height);
      const data = imageData.data;

      // Make dark pixels transparent (threshold-based)
      const threshold = 35; // pixels darker than this become transparent
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const brightness = (r + g + b) / 3;
        if (brightness < threshold) {
          data[i + 3] = 0; // fully transparent
        } else if (brightness < threshold + 20) {
          // Feather edge — partial transparency for smooth blending
          data[i + 3] = Math.round(((brightness - threshold) / 20) * 255);
        }
      }

      cx.putImageData(imageData, 0, 0);
      this.sprite = c; // use the canvas as the sprite (works with drawImage)
      this.spriteLoaded = true;
    };
    img.src = src;
  }

  render(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    // Sprite points DOWN by default, so subtract PI/2 to align with rotation (0 = right)
    ctx.rotate(this.rotation - Math.PI / 2);

    if (!this.isPowered()) {
      ctx.globalAlpha = 0.3;
    }

    const r = this.radius;
    const spriteSize = r * 3; // scale sprite to roughly match collision radius

    if (this.spriteLoaded) {
      // Draw ship sprite centered
      ctx.drawImage(this.sprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
    } else {
      // Fallback triangle
      ctx.strokeStyle = this.isPowered() ? '#fff' : '#555';
      ctx.fillStyle = this.isPowered() ? '#0af' : '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -r);                      // nose (up)
      ctx.lineTo(-r / 1.5, r / 1.5);         // left wing
      ctx.lineTo(0, r / 2);                   // back center
      ctx.lineTo(r / 1.5, r / 1.5);          // right wing
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Thruster flame (behind ship)
    if (this.thrusting && this.isPowered()) {
      ctx.fillStyle = '#f70';
      const flicker = Math.random() * 10;
      ctx.beginPath();
      ctx.moveTo(-r / 4, r / 1.5);
      ctx.lineTo(0, r + flicker);
      ctx.lineTo(r / 4, r / 1.5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
    // Health/energy displayed in HUD panel, not floating on ship
  }
}
