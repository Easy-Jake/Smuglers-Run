/**
 * Ship Power Management System — ported from Asteroid Driver
 *
 * Three subsystems: ENGINES, WEAPONS, STABILIZER
 * Each has:
 *   - Power allocation (0-9, i.e. 0%-90%)
 *   - Heat level (0-100, redline at 85)
 *   - Stability rating (determines failure chance when overheating)
 *   - System status (nominal, minor/major/critical failure)
 *
 * Controls:
 *   T then 0-9  → set engine power
 *   F then 0-9  → set weapon power (F instead of W since W is thrust)
 *   G then 0-9  → set stabilizer power
 *   Backspace    → toggle all power on/off (kill switch)
 */

import { Vector2D } from '../../utils/Vector2D.js';

// --- Constants ---

export const SYSTEM_NAMES = {
  ENGINES: 'engines',
  WEAPONS: 'weapons',
  STABILIZER: 'stabilizer',
};

const DEFAULT_ALLOCATIONS = {
  [SYSTEM_NAMES.ENGINES]: 5,
  [SYSTEM_NAMES.WEAPONS]: 3,
  [SYSTEM_NAMES.STABILIZER]: 1,
};

const BASE_HEAT_GENERATION = {
  [SYSTEM_NAMES.ENGINES]: 1.0,
  [SYSTEM_NAMES.WEAPONS]: 1.2,
  [SYSTEM_NAMES.STABILIZER]: 0.5,
};

const REDLINE_THRESHOLD = 85;
const HEAT_DISSIPATION = 0.5;

const BASE_STABILITY = {
  [SYSTEM_NAMES.ENGINES]: 75,
  [SYSTEM_NAMES.WEAPONS]: 70,
  [SYSTEM_NAMES.STABILIZER]: 90,
};

const STABILITY_PER_LEVEL = 5;

const FAILURE_TIERS = {
  MINOR: 0.7,
  MAJOR: 0.4,
  CRITICAL: 0.0,
};

const FAILURE_RECOVERY = {
  MINOR: 500,
  MAJOR: 1500,
  CRITICAL: 3000,
};

const POWER_STATE = {
  OFF: 'off',
  STARTING: 'starting',
  ON: 'on',
};

const INERTIA = {
  DRIFT_MULTIPLIER: 0.995,
  OXYGEN_DEPLETION_RATE: 0.1,
};

const BASE_START_PROBABILITY = 0.3;
const MAX_START_ATTEMPTS = 5;
const KEY_SEQUENCE_TIMEOUT = 500; // ms

// --- Power System Class ---

export class PowerSystem {
  constructor(player) {
    this.player = player;

    // Power allocation per system (0-9)
    this.allocation = { ...DEFAULT_ALLOCATIONS };

    // Heat level per system (0-100)
    this.heat = {
      [SYSTEM_NAMES.ENGINES]: 0,
      [SYSTEM_NAMES.WEAPONS]: 0,
      [SYSTEM_NAMES.STABILIZER]: 0,
    };

    // System status
    this.status = {
      [SYSTEM_NAMES.ENGINES]: 'nominal',
      [SYSTEM_NAMES.WEAPONS]: 'nominal',
      [SYSTEM_NAMES.STABILIZER]: 'nominal',
    };

    // Recovery timers
    this.recoveryTimer = {
      [SYSTEM_NAMES.ENGINES]: 0,
      [SYSTEM_NAMES.WEAPONS]: 0,
      [SYSTEM_NAMES.STABILIZER]: 0,
    };

    // Stability upgrade levels (start at 1)
    this.stabilityUpgradeLevel = {
      [SYSTEM_NAMES.ENGINES]: 1,
      [SYSTEM_NAMES.WEAPONS]: 1,
      [SYSTEM_NAMES.STABILIZER]: 1,
    };

    // Ship power state
    this.powerState = POWER_STATE.ON;

    // Inertial mode / oxygen
    this.inertialMode = false;
    this.oxygenLevel = 100;

    // Engine start attempts
    this.startAttempts = 0;
    this.lastStartAttempt = 0;

    // Key sequence for power allocation (T/F/G then 0-9)
    this.selectedSystem = null;
    this.keySelectionTime = 0;

    // Store original values for restoration
    this._originalFriction = player.friction || 0.998;
  }

  // --- Main Update (call every frame) ---

  update(deltaTime) {
    const dt = deltaTime; // already in seconds-ish from fixed timestep

    // If power is off, just deplete oxygen in inertial mode
    if (this.powerState !== POWER_STATE.ON) {
      if (this.inertialMode) {
        this.oxygenLevel = Math.max(0, this.oxygenLevel - INERTIA.OXYGEN_DEPLETION_RATE * dt * 60);
      }
      return;
    }

    // Process each system
    for (const system of Object.values(SYSTEM_NAMES)) {
      // Handle recovery
      if (this.recoveryTimer[system] > 0) {
        this.recoveryTimer[system] -= dt * 60;
        if (this.recoveryTimer[system] <= 0) {
          this.status[system] = 'nominal';
          this._restoreSystem(system);
        }
        continue;
      }

      if (this.allocation[system] <= 0) continue;

      const powerRatio = this.allocation[system] / 10;
      let usageMultiplier = 0.2; // idle heat

      // Active usage generates more heat
      if (system === SYSTEM_NAMES.ENGINES && this.player.thrusting) {
        usageMultiplier = 1.0;
      } else if (system === SYSTEM_NAMES.WEAPONS && this.player.shootCooldown > 10) {
        usageMultiplier = 1.0;
      }

      const baseHeat = BASE_HEAT_GENERATION[system];
      const heatGen = baseHeat * powerRatio * powerRatio * usageMultiplier * dt * 60;
      this.heat[system] += heatGen;

      // Cooling: less power = better cooling
      const coolingFactor = 1 + (1 - powerRatio) * 0.5;
      this.heat[system] = Math.max(0, this.heat[system] - HEAT_DISSIPATION * coolingFactor * dt * 60);

      // Overheating check
      if (this.heat[system] > REDLINE_THRESHOLD) {
        this._checkStability(system);
      }
    }
  }

  // --- Power Toggle ---

  togglePower() {
    if (this.powerState === POWER_STATE.ON) {
      this.powerState = POWER_STATE.OFF;
      this._shutdown();
      return true;
    }
    if (this.powerState === POWER_STATE.OFF || this.powerState === POWER_STATE.STARTING) {
      return this._attemptStart();
    }
    return false;
  }

  isPowered() {
    return this.powerState === POWER_STATE.ON;
  }

  // --- Power Allocation ---

  allocate(system, level) {
    if (level < 0 || level > 9) return false;
    if (!SYSTEM_NAMES[system.toUpperCase()] && !Object.values(SYSTEM_NAMES).includes(system)) return false;
    this.allocation[system] = Math.max(0, Math.min(9, level));
    this.player.recalculateCosts?.();
    return true;
  }

  /**
   * Get the power ratio (0.0-0.9) for a system
   */
  getPowerRatio(system) {
    return (this.allocation[system] || 0) / 10;
  }

  // --- Key Sequence Processing ---

  processKey(key) {
    const systemKeys = {
      'T': SYSTEM_NAMES.ENGINES,
      't': SYSTEM_NAMES.ENGINES,
      'F': SYSTEM_NAMES.WEAPONS,   // F instead of W (W is thrust)
      'f': SYSTEM_NAMES.WEAPONS,
      'G': SYSTEM_NAMES.STABILIZER,
      'g': SYSTEM_NAMES.STABILIZER,
    };

    // System selection
    if (systemKeys[key]) {
      // Double-tap to zero
      if (this.selectedSystem === systemKeys[key] && Date.now() - this.keySelectionTime < KEY_SEQUENCE_TIMEOUT) {
        this.allocate(this.selectedSystem, 0);
        this.selectedSystem = null;
        return true;
      }
      this.selectedSystem = systemKeys[key];
      this.keySelectionTime = Date.now();
      return true;
    }

    // Number key after system selection
    if (this.selectedSystem && Date.now() - this.keySelectionTime < KEY_SEQUENCE_TIMEOUT) {
      const level = parseInt(key);
      if (!isNaN(level) && level >= 0 && level <= 9) {
        this.allocate(this.selectedSystem, level);
        this.selectedSystem = null;
        this.keySelectionTime = 0;
        return true;
      }
    }

    // Timeout
    if (this.selectedSystem && Date.now() - this.keySelectionTime >= KEY_SEQUENCE_TIMEOUT) {
      this.selectedSystem = null;
    }

    return false;
  }

  // --- Internals ---

  _checkStability(system) {
    const base = BASE_STABILITY[system] || BASE_STABILITY[system.toUpperCase()] || 75;
    const upgradeBonus = (this.stabilityUpgradeLevel[system] - 1) * STABILITY_PER_LEVEL;
    const actual = base + upgradeBonus;

    const powerStress = this.allocation[system] * 2;
    const heatStress = Math.max(0, this.heat[system] - REDLINE_THRESHOLD) / 5;
    const stabilityCheck = actual - powerStress - heatStress;

    const roll = Math.random() * 100;
    if (roll > stabilityCheck) {
      this._triggerFailure(system);
    }
  }

  _triggerFailure(system) {
    // Determine tier based on current stability
    let tier = 'MINOR';
    const stabilityPct = this._getStabilityPercent(system);
    if (stabilityPct <= FAILURE_TIERS.MAJOR * 100) tier = 'MAJOR';
    if (stabilityPct <= FAILURE_TIERS.CRITICAL * 100) tier = 'CRITICAL';

    this.recoveryTimer[system] = FAILURE_RECOVERY[tier];
    this.status[system] = tier.toLowerCase() + '_failure';
    this.heat[system] = REDLINE_THRESHOLD / 2; // partial cooldown

    this._applyFailureEffects(system, tier);
  }

  _applyFailureEffects(system, tier) {
    const p = this.player;

    switch (system) {
      case SYSTEM_NAMES.ENGINES:
        p.thrustPower *= 0.5;
        if (tier === 'MAJOR' || tier === 'CRITICAL') {
          // Random velocity impulse
          if (p.velocity) {
            const impulse = new Vector2D((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
            p.velocity.addMut(impulse);
          }
        }
        break;

      case SYSTEM_NAMES.WEAPONS:
        // Weapon failures increase shot cost (checked in shoot())
        if (tier === 'CRITICAL') {
          p.takeDamage?.(5);
        }
        break;

      case SYSTEM_NAMES.STABILIZER:
        if (tier === 'MAJOR' || tier === 'CRITICAL') {
          this.enableInertialMode();
        }
        break;
    }
  }

  _restoreSystem(system) {
    const p = this.player;
    if (system === SYSTEM_NAMES.ENGINES) {
      p.thrustPower = p.baseThrustPower || 0.2;
    }
  }

  _getStabilityPercent(system) {
    const base = BASE_STABILITY[system] || 75;
    const bonus = (this.stabilityUpgradeLevel[system] - 1) * STABILITY_PER_LEVEL;
    return base + bonus;
  }

  _shutdown() {
    this.enableInertialMode();
  }

  _attemptStart() {
    const now = Date.now();
    if (now - this.lastStartAttempt > 5000) {
      this.startAttempts = 0;
    }
    this.lastStartAttempt = now;
    this.startAttempts++;
    this.powerState = POWER_STATE.STARTING;

    let prob = BASE_START_PROBABILITY;

    // Reduce probability if engines are damaged
    if (this.status[SYSTEM_NAMES.ENGINES] !== 'nominal') {
      if (this.status[SYSTEM_NAMES.ENGINES].includes('minor')) prob *= 0.7;
      else if (this.status[SYSTEM_NAMES.ENGINES].includes('major')) prob *= 0.4;
      else if (this.status[SYSTEM_NAMES.ENGINES].includes('critical')) prob *= 0.1;
    }

    // More attempts = better chance
    prob += Math.min(0.5, (this.startAttempts - 1) * 0.1);
    prob = Math.min(1.0, prob);

    if (Math.random() < prob) {
      this.powerState = POWER_STATE.ON;
      this.disableInertialMode();
      this.player.thrustPower = this.player.baseThrustPower || 0.2;
      this.startAttempts = 0;
      return true;
    }

    if (this.startAttempts >= MAX_START_ATTEMPTS) {
      this.powerState = POWER_STATE.OFF;
      this.startAttempts = 0;
    }
    return false;
  }

  // --- Inertial Mode ---

  enableInertialMode() {
    if (this.inertialMode) return;
    this.inertialMode = true;
    // Store original friction and switch to extreme drift
    this._originalFriction = 0.998; // normal space friction
    // The PlayerInputHandler will check this.inertialMode for drift behavior
  }

  disableInertialMode() {
    if (!this.inertialMode) return;
    if (this.powerState !== POWER_STATE.ON) return;
    this.inertialMode = false;
  }

  // --- Weapon failure check (call from Player.shoot) ---

  getWeaponCostMultiplier() {
    if (this.status[SYSTEM_NAMES.WEAPONS] !== 'nominal') {
      return 2.0; // double cost during weapon failure
    }
    return 1.0;
  }

  // --- Engine power modifier (affects thrust) ---

  getEnginePowerMultiplier() {
    return 0.5 + this.getPowerRatio(SYSTEM_NAMES.ENGINES); // 0.5 at 0%, 1.4 at 90%
  }

  // --- Serialization ---

  getState() {
    return {
      allocation: { ...this.allocation },
      heat: { ...this.heat },
      status: { ...this.status },
      powerState: this.powerState,
      inertialMode: this.inertialMode,
      oxygenLevel: this.oxygenLevel,
    };
  }
}
