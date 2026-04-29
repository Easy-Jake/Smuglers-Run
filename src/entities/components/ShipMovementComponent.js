import { WORLD_WIDTH, WORLD_HEIGHT } from '../../config/constants.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';
import { ObjectPool } from '../../systems/ObjectPool.js';

export class ShipMovementComponent {
  constructor(ship) {
    this.ship = ship;
    
    // Movement Properties
    this.thrust = 0;
    this.maxThrust = 0.15;
    this.turnRate = 0.05;
    this.momentum = 0.98;
    this.boostMultiplier = 1.5;
    this.boostFuelCost = 0.3;
    this.thrustMultiplier = 1.0;
  }

  move(controls = null) {
    if (!this.ship.isAlive) return;

    // Kill switch active — no thrust, just drift
    if (!this.ship.isPowered()) {
      this._applyPhysics();
      return;
    }

    if (!this.ship.isAI && controls) {
      const { dirX, dirY, shift } = controls;

      // Update ship orientation based on movement direction
      if (dirX !== 0 || dirY !== 0) {
        this.ship.angle = Math.atan2(dirY, dirX);

        // Apply thrust in movement direction
        let thrust = this.maxThrust * this.thrustMultiplier;

        // Apply boost if shift is held
        if (shift && this.ship.fuel >= GAME_CONFIG.SHIP.BOOST.FUEL_COST) {
          thrust *= GAME_CONFIG.SHIP.BOOST.MULTIPLIER;
          this.ship.fuel -= GAME_CONFIG.SHIP.BOOST.FUEL_COST / this.ship.fuelEfficiency;

          // Create boosted engine particles
          ObjectPool.get(
            'particle',
            this.ship.x - Math.cos(this.ship.angle) * this.ship.size,
            this.ship.y - Math.sin(this.ship.angle) * this.ship.size,
            '#07f'
          );
        } else {
          this.ship.fuel -= 0.1 / this.ship.fuelEfficiency;

          // Create normal engine particles
          ObjectPool.get(
            'particle',
            this.ship.x - Math.cos(this.ship.angle) * this.ship.size,
            this.ship.y - Math.sin(this.ship.angle) * this.ship.size,
            this.ship.fuelCellColor
          );
        }

        // Apply thrust vector
        this.ship.vx += Math.cos(this.ship.angle) * thrust;
        this.ship.vy += Math.sin(this.ship.angle) * thrust;
      }

      // Apply physics
      this._applyPhysics();
    }
  }

  _applyPhysics() {
    // Apply momentum/drag
    this.ship.vx *= this.momentum;
    this.ship.vy *= this.momentum;

    // Update position
    this.ship.x += this.ship.vx;
    this.ship.y += this.ship.vy;

    // Keep in bounds
    this.ship.x = Math.max(0, Math.min(WORLD_WIDTH, this.ship.x));
    this.ship.y = Math.max(0, Math.min(WORLD_HEIGHT, this.ship.y));
  }

  setThrustMultiplier(multiplier) {
    this.thrustMultiplier = multiplier;
  }
} 