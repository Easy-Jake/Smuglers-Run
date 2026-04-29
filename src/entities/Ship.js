import { WORLD_WIDTH, WORLD_HEIGHT, FUEL_CELL_TYPES, FUEL_CELL_CAPACITIES } from '../config/constants.js';
import { currentGalaxy } from '../config/gameConfig.js';
import { ObjectPool } from '../systems/ObjectPool.js';
import { CONSTANTS } from '../config/constants.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { Projectile } from './Projectile.js';
import { Particle } from './Particle.js';
import { ShipMovementComponent } from './components/ShipMovementComponent.js';
import { ShipCombatComponent } from './components/ShipCombatComponent.js';
import { ShipResourceComponent } from './components/ShipResourceComponent.js';

export class Ship {
  constructor(x, y, color, name = null, isAI = false) {
    // Basic Properties
    this.id = Math.random().toString(36).substr(2, 9);
    this.x = x;
    this.y = y;
    this.color = color;
    this.name = name || (isAI ? 'ENEMY' : 'PLAYER');
    this.size = 20;
    this.angle = 0;
    this.vx = 0;
    this.vy = 0;

    // Movement Properties
    this.thrust = 0;
    this.maxThrust = 0.15;
    this.turnRate = 0.05;
    this.momentum = 0.98;
    this.boostMultiplier = 1.5;
    this.boostFuelCost = 0.3;

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
    this.ammo = isAI ? Infinity : CONSTANTS.PLAYER.MAX_AMMO;
    this.maxAmmo = CONSTANTS.PLAYER.MAX_AMMO;
    this.ammoRegenRate = 0.1;
    this.ammoRegenDelay = 60;
    this.lastShotTime = 0;
    this.laserWidth = 3;
    this.laserColor = this.color;

    // Cargo and Resources
    this.mass = 100;
    this.cargo = [];
    this.cargoCapacity = 50;
    this.currentCargoSpace = 0;
    this.credits = 100;

    // Stats
    this.score = 0;
    this.kills = 0;
    this.deaths = 0;

    // State
    this.isAlive = true;
    this.isAI = isAI;
    this.respawnTime = 0;
    this.trail = [];
    this.lastQuadrant = null;
    this.currentQuadrant = null;

    // Power / Kill Switch System
    // When power is OFF: no thrust, no shields, no weapons, no energy signature
    // Ship drifts on momentum and becomes nearly undetectable
    this.powerState = 'on'; // 'on' | 'off'
    this.powerDownTime = 0;  // timestamp when power was cut (for stealth duration tracking)

    // Fuel System - Default to small fuel cell type
    this.fuelCellType = FUEL_CELL_TYPES.SMALL;
    this.maxFuel = FUEL_CELL_CAPACITIES[this.fuelCellType] || 100;
    this.fuel = this.maxFuel;
    this.fuelEfficiency = 1.0;
    this.thrustMultiplier = 1.0;
    this.fuelCellColor = '#00ff00'; // Default green

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

    // Galaxy Jump Capability
    this.jumpRange = 0;
    this.jumpCooldown = 0;
    this.currentGalaxy = currentGalaxy;

    // Upgrade Tracking
    this.upgrades = {
      thrust: 0,
      booster: 0,
      blaster: 0,
      bombs: 0,
      shields: 0,
      shotgun: 0,
    };

    this.radius = 20;
    this.speed = 2;
    this.state = 'patrol'; // patrol, chase, attack, flee
    this.patrolPoint = { x: x, y: y };
    this.patrolRadius = 200;
    this.patrolAngle = Math.random() * Math.PI * 2;
    this.detectionRange = 400;
    this.attackRange = 300;
    this.fleeThreshold = 30; // Flee when health below 30%

    // Initialize Components
    this.movement = new ShipMovementComponent(this);
    this.combat = new ShipCombatComponent(this);
    this.resources = new ShipResourceComponent(this);
  }

  update() {
    if (!this.isAlive) return;

    // Update components
    this.combat.update();
    this.resources.update();
  }

  move(controls = null) {
    this.movement.move(controls);
  }

  shoot() {
    this.combat.shoot();
  }

  takeDamage(amount) {
    this.combat.takeDamage(amount);
  }

  heal(amount) {
    this.combat.heal(amount);
  }

  addShield(amount) {
    this.combat.addShield(amount);
  }

  addCargo(item) {
    return this.resources.addCargo(item);
  }

  removeCargo(item) {
    return this.resources.removeCargo(item);
  }

  addCredits(amount) {
    this.resources.addCredits(amount);
  }

  removeCredits(amount) {
    return this.resources.removeCredits(amount);
  }

  addFuel(amount) {
    this.resources.addFuel(amount);
  }

  removeFuel(amount) {
    return this.resources.removeFuel(amount);
  }

  jump() {
    return this.resources.jump();
  }

  renderWithOffset(ctx, offsetX, offsetY) {
    if (!this.isAlive) return;

    const screenX = this.x + offsetX;
    const screenY = this.y + offsetY;

    // Draw ship
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.angle);

    // Dim ship when power is off (going dark)
    if (!this.isPowered()) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#333';
    } else {
      ctx.fillStyle = this.color;
    }

    ctx.beginPath();
    ctx.moveTo(this.size, 0);
    ctx.lineTo(-this.size / 2, -this.size / 2);
    ctx.lineTo(-this.size / 2, this.size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw name and stats
    if (!this.isAI) {
      ctx.fillStyle = '#fff';
      ctx.font = "10px 'Press Start 2P'";
      ctx.textAlign = 'center';
      ctx.fillText(this.name, screenX, screenY - 30);
    }
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
  upgradeThrust() {
    this.upgrades.thrust++;
    this.movement.setThrustMultiplier(1 + this.upgrades.thrust * 0.1);
  }

  upgradeShields() {
    this.upgrades.shields++;
    this.combat.setMaxShield(100 * (1 + this.upgrades.shields * 0.2));
  }

  upgradeBlaster() {
    this.upgrades.blaster++;
    this.combat.damage *= 1.2;
  }

  upgradeShotgun() {
    this.upgrades.shotgun++;
    this.combat.shotgunEnabled = true;
    this.combat.shotgunShots = 3 + this.upgrades.shotgun;
    this.combat.shotgunSpread = 30;
  }

  upgradeBooster() {
    this.upgrades.booster++;
    this.resources.setFuelEfficiency(1 + this.upgrades.booster * 0.1);
  }

  upgradeBombs() {
    this.upgrades.bombs++;
    this.combat.hasBombs = true;
    this.combat.bombDamage = 50 * (1 + this.upgrades.bombs * 0.2);
    this.combat.bombRadius = 100 * (1 + this.upgrades.bombs * 0.1);
  }
}
