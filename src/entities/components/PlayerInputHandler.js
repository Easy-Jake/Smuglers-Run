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

    // Friction depends on inertial mode + stabilizer power
    const ps = this.player.powerSystem;
    const inertial = ps?.inertialMode;
    let friction = 0.9995;
    if (!inertial && ps) {
      const stabPower = ps.allocation?.stabilizer || 0;
      const stabHealthMult = (ps.systemHealth?.stabilizer || 100) / 100;
      const stabRatio = (stabPower / 9) * stabHealthMult;
      friction = 0.9995 - stabRatio * 0.0395;
    }
    this.player.velocity.multiplyMut(Math.pow(friction, dt));

    // === ROTATIONAL INERTIA ===
    // Apply rotational velocity to rotation
    this.player.rotation += this.player.rotationVelocity * dt;
    this.player.angle = this.player.rotation;

    // Rotational friction — also affected by stabilizer
    // Stab 0%: 0.998/frame (spins long time)
    // Stab 50%: 0.96/frame (~2 sec to stop)
    // Stab 90%: 0.85/frame (~0.5 sec)
    let rotFriction = 0.998;
    if (!inertial && ps) {
      const stabPower = ps.allocation?.stabilizer || 0;
      const stabHealthMult = (ps.systemHealth?.stabilizer || 100) / 100;
      const stabRatio = (stabPower / 9) * stabHealthMult;
      rotFriction = 0.998 - stabRatio * 0.148; // 0.998 → 0.85
    }
    this.player.rotationVelocity *= Math.pow(rotFriction, dt);
    // Clamp to zero if very small (avoid micro-drift)
    if (Math.abs(this.player.rotationVelocity) < 0.0005) {
      this.player.rotationVelocity = 0;
    }

    // Handle jump cooldown (shoot cooldown handled in Player.update)
    if (this.player.jumpCooldown > 0) {
      this.player.jumpCooldown -= dt;
    }
  }

  handleInput(controls) {
    if (!controls) return;
    this.controls = controls;

    const { rotateLeft, rotateRight, thrust, reverse, boost, jump } = controls;

    // Rotation thrust scales with stabilizer (responsiveness when ACCELERATING rotation)
    // Low stab still lets you spin up but slowly. High stab is snappy.
    const ps = this.player.powerSystem;
    const stabPower = ps?.allocation?.stabilizer || 0;
    const stabHealthMult = (ps?.systemHealth?.stabilizer || 100) / 100;
    const stabFactor = (stabPower / 9) * stabHealthMult;
    const rotResponse = 0.4 + stabFactor * 0.7; // 0.4x at stab 0, 1.1x at stab 9
    const baseRotAccel = (this.player.rotationSpeed || 0.05) * 0.15; // accel per frame
    const rotImpulse = baseRotAccel * rotResponse;

    // --- Rotation: add to velocity (not direct rotate) ===
    // Holding left = constant negative rotational thrust
    // Holding right = positive
    // Pressing opposite to spin = brake
    if (rotateLeft) {
      this.player.rotationVelocity -= rotImpulse;
    }
    if (rotateRight) {
      this.player.rotationVelocity += rotImpulse;
    }
    // Cap rotational velocity to prevent dizzy spin
    const maxRotVel = (this.player.rotationSpeed || 0.05) * 2;
    if (this.player.rotationVelocity > maxRotVel) this.player.rotationVelocity = maxRotVel;
    if (this.player.rotationVelocity < -maxRotVel) this.player.rotationVelocity = -maxRotVel;

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
    // Thrust cost scales with engine power — 10% engine = cheap, 90% = expensive
    // engineRatio^1.5 gives sharp scaling: 10%=0.03, 50%=0.35, 90%=0.85
    const ps = this.player.powerSystem;
    const engineRatio = (ps?.allocation?.engines || 0) / 10;
    const powerCostMult = Math.pow(engineRatio, 1.5);
    const cost = (this.player.thrustCost || 0.1) * powerCostMult / this.player.fuelEfficiency;
    if (this.player.energy < cost) return;
    this.player.energy -= cost;
    this._applyThrust(basePower);
  }

  _applyReverseThrust(power) {
    const ps = this.player.powerSystem;
    const engineRatio = (ps?.allocation?.engines || 0) / 10;
    const powerCostMult = Math.pow(engineRatio, 1.5);
    const cost = (this.player.thrustCost || 0.1) * powerCostMult / this.player.fuelEfficiency;
    if (this.player.energy < cost) return;
    this.player.energy -= cost;
    // Mark thrusting so heat builds (was missing!)
    this.player.thrusting = true;
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
