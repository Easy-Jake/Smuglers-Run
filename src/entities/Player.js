import { GAME_CONFIG } from '../config/gameConfig.js';
import { Projectile } from './Projectile.js';
import { Particle } from './Particle.js';
import { Entity } from './Entity.js';
import { Vector2D } from '../utils/Vector2D.js';
import { PlayerInputHandler } from './components/PlayerInputHandler.js';

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

    // Power / Kill Switch System
    // When OFF: no thrust, no weapons, no energy signature — drift stealth
    this.powerState = 'on'; // 'on' | 'off'
    this.powerDownTime = 0;

    // Upgrade levels (all start at 1)
    this.cargoCapacityLevel = 1;
    this.thrustEfficiencyLevel = 1;
    this.ammoEfficiencyLevel = 1;
    this.speedLevel = 1;
    this.resourceRangeLevel = 1;
    this.blasterDamageLevel = 1;

    // Derived combat values
    this.projectileDamage = GAME_CONFIG.PROJECTILES.DAMAGE;
    this.thrustCost = PC.ENERGY_COST.THRUST;
    this.shotCost = PC.ENERGY_COST.SHOT;

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
    if (this.energy < this.shotCost) return;

    this.energy -= this.shotCost;

    const projectile = new Projectile(
      this.x + Math.cos(this.angle) * this.radius,
      this.y + Math.sin(this.angle) * this.radius,
      this.angle,
      GAME_CONFIG.PROJECTILES.SPEED,
      this.projectileDamage,
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

  addResources(amount) {
    const canAdd = Math.min(amount, this.cargoCapacity - this.resources);
    this.resources += canAdd;
    return canAdd;
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

  // Power / Kill Switch
  togglePower() {
    if (this.powerState === 'on') {
      this.powerState = 'off';
      this.powerDownTime = Date.now();
    } else {
      this.powerState = 'on';
      this.powerDownTime = 0;
    }
  }

  isPowered() {
    return this.powerState === 'on';
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

  upgradeCargoCapacity() { this.cargoCapacityLevel++; this.cargoCapacity += 50; }
  upgradeThrustEfficiency() { this.thrustEfficiencyLevel++; this.recalculateCosts(); }
  upgradeAmmoEfficiency() { this.ammoEfficiencyLevel++; this.recalculateCosts(); }
  upgradeSpeed() { this.speedLevel++; this.maxSpeed += 1; this.recalculateCosts(); }
  upgradeResourceRange() { this.resourceRangeLevel++; this.recalculateCosts(); }
  upgradeBlasterDamage() { this.blasterDamageLevel++; this.recalculateCosts(); }

  render(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Ship body — AD-style triangle
    const r = this.radius;
    if (!this.isPowered()) {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#555';
      ctx.fillStyle = '#333';
    } else {
      ctx.strokeStyle = '#fff';
      ctx.fillStyle = '#0af';
    }
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r, 0);                        // nose
    ctx.lineTo(-r / 1.5, -r / 1.5);         // top wing
    ctx.lineTo(-r / 2, 0);                   // back center
    ctx.lineTo(-r / 1.5, r / 1.5);          // bottom wing
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Thruster flame
    if (this.thrusting) {
      ctx.fillStyle = '#f70';
      const flicker = Math.random() * 10;
      ctx.beginPath();
      ctx.moveTo(-r / 1.5, -r / 4);
      ctx.lineTo(-r - flicker, 0);
      ctx.lineTo(-r / 1.5, r / 4);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    // Health bar
    if (this.health < this.maxHealth) {
      const barW = this.radius * 2;
      ctx.fillStyle = 'black';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 12, barW, 5);
      ctx.fillStyle = '#f44';
      ctx.fillRect(this.x - barW / 2, this.y - this.radius - 12, barW * (this.health / this.maxHealth), 5);
    }

    // Energy bar
    const barW = this.radius * 2;
    ctx.fillStyle = '#444';
    ctx.fillRect(this.x - barW / 2, this.y - this.radius - 6, barW, 3);
    ctx.fillStyle = '#4af';
    ctx.fillRect(this.x - barW / 2, this.y - this.radius - 6, barW * (this.energy / this.maxEnergy), 3);
  }
}
