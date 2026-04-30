import { GAME_CONFIG } from '../../config/gameConfig.js';
import { Vector2D } from '../../utils/Vector2D.js';

export class PlayerInputHandler {
  constructor(player) {
    this.player = player;
    this.controls = {
      rotateLeft: false,
      rotateRight: false,
      thrust: false,
      reverse: false,
      boost: false,
      jump: false,
    };
  }

  update(deltaTime) {
    const dt = deltaTime * 60; // normalize to 60fps

    // Update position based on velocity — Newtonian drift
    this.player.x += this.player.velocity.x * dt;
    this.player.y += this.player.velocity.y * dt;

    // Friction depends on inertial mode
    // Normal: 0.998/frame (~12% loss/sec) — space feel
    // Inertial: 0.9995/frame (~3% loss/sec) — extreme drift, almost no friction
    const inertial = this.player.powerSystem?.inertialMode;
    const friction = inertial ? 0.9995 : 0.998;
    this.player.velocity.multiplyMut(Math.pow(friction, dt));

    // Handle jump cooldown (shoot cooldown handled in Player.update)
    if (this.player.jumpCooldown > 0) {
      this.player.jumpCooldown -= dt;
    }
  }

  handleInput(controls) {
    if (!controls) return;
    this.controls = controls;

    const { rotateLeft, rotateRight, thrust, reverse, boost, jump } = controls;
    const turnSpeed = this.player.rotationSpeed || 0.05;

    // --- Rotation ---
    if (rotateLeft) {
      this.player.rotation -= turnSpeed;
    }
    if (rotateRight) {
      this.player.rotation += turnSpeed;
    }
    // Keep angle synced for projectile direction
    this.player.angle = this.player.rotation;

    // --- Thrust ---
    // Engine power allocation affects thrust strength
    const engineMult = this.player.powerSystem?.getEnginePowerMultiplier() || 1.0;
    const basePower = this.player.thrustPower * this.player.thrustMultiplier * engineMult;

    if (thrust) {
      if (boost && this.player.energy >= GAME_CONFIG.SHIP.BOOST.FUEL_COST) {
        this._applyBoost(basePower);
      } else {
        this._applyNormalThrust(basePower);
      }
      this.player.thrusting = true;
    }

    if (reverse) {
      // Reverse thrust is weaker — 40% power, same energy cost
      this._applyReverseThrust(basePower * 0.4);
    }

    // Limit speed
    this._limitSpeed();

    // Quick jump
    if (jump && this.player.jumpCooldown <= 0) {
      this.player.quickJump?.();
    }
  }

  _applyBoost(basePower) {
    const boostCost = GAME_CONFIG.SHIP.BOOST.FUEL_COST / this.player.fuelEfficiency;
    if (this.player.energy < boostCost) return;
    this.player.energy -= boostCost;
    const boosted = basePower * GAME_CONFIG.SHIP.BOOST.MULTIPLIER;
    this._applyThrust(boosted);
  }

  _applyNormalThrust(basePower) {
    const cost = (this.player.thrustCost || 0.1) / this.player.fuelEfficiency;
    if (this.player.energy < cost) return;
    this.player.energy -= cost;
    this._applyThrust(basePower);
  }

  _applyReverseThrust(power) {
    const cost = (this.player.thrustCost || 0.1) / this.player.fuelEfficiency;
    if (this.player.energy < cost) return;
    this.player.energy -= cost;
    // Thrust opposite to facing direction
    const vec = new Vector2D(
      -Math.cos(this.player.rotation) * power,
      -Math.sin(this.player.rotation) * power
    );
    this.player.velocity.addMut(vec);
  }

  _applyThrust(power) {
    const vec = new Vector2D(
      Math.cos(this.player.rotation) * power,
      Math.sin(this.player.rotation) * power
    );
    this.player.velocity.addMut(vec);
  }

  _limitSpeed() {
    const speed = Math.sqrt(
      this.player.velocity.x * this.player.velocity.x +
      this.player.velocity.y * this.player.velocity.y
    );
    if (speed > this.player.maxSpeed) {
      const scale = this.player.maxSpeed / speed;
      this.player.velocity = this.player.velocity.multiply(scale);
    }
  }
}
