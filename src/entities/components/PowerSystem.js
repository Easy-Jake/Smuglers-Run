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

// Battery is a derived system — heat from total system load
const BATTERY_REDLINE = 85;

const DEFAULT_ALLOCATIONS = {
  [SYSTEM_NAMES.ENGINES]: 5,
  [SYSTEM_NAMES.WEAPONS]: 3,
  [SYSTEM_NAMES.STABILIZER]: 1,
};

// Heat generation per system (higher = builds faster)
// Was: ENG 1.0, WPN 1.2, STB 0.5 — too gentle to feel
const BASE_HEAT_GENERATION = {
  [SYSTEM_NAMES.ENGINES]: 3.0,
  [SYSTEM_NAMES.WEAPONS]: 4.0,
  [SYSTEM_NAMES.STABILIZER]: 1.5,
};

const REDLINE_THRESHOLD = 85;
const HEAT_DISSIPATION = 0.4; // slower cooling — was 0.5

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
  // Oxygen lasts 15 seconds at 60fps = 900 frames
  // Depletion rate of 100/900 ≈ 0.111 per frame to last 15s
  OXYGEN_DEPLETION_RATE: 100 / 900, // 15 seconds to deplete
  // Grace period after oxygen runs out — 7 seconds before death
  GRACE_PERIOD_SECONDS: 7,
};

// Idle drain — scales as power^1.5 so low power is MUCH more efficient
// Total drain = BASE + sum_of(alloc^1.5 × FACTOR) for each system
// Default 5+3+1: 11.18 + 5.20 + 1.00 = 17.4 → ~0.30/sec  (5 min on full tank)
// All low (1+1+1):  3.0 → ~0.06/sec (28 min on full tank)
// All max (9+9+9): 81.0 → ~1.2/sec (1.4 min on full tank)
const IDLE_BASE_DRAIN = 0.001;
const ALLOC_DRAIN_FACTOR = 0.00023;

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

    // System damage (separate from ship hull) — 100 = healthy, 0 = destroyed
    this.systemHealth = {
      [SYSTEM_NAMES.ENGINES]: 100,
      [SYSTEM_NAMES.WEAPONS]: 100,
      [SYSTEM_NAMES.STABILIZER]: 100,
    };
    this.systemMaxHealth = 100;

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

    // Battery state — derived from system load
    this.batteryHeat = 0;
    this.batteryHealth = 100;       // 0 = battery dead, can't operate
    this.batteryStatus = 'nominal'; // 'nominal' | 'brownout' | 'dead'
    this.batteryRedlineTimer = 0;

    // Key sequence for power allocation (T/F/G then 0-9)
    this.selectedSystem = null;
    this.keySelectionTime = 0;

    // Oxygen grace period (after O2 hits zero, you have N seconds before dying)
    this.graceTimer = 0;

    // Store original values for restoration
    this._originalFriction = player.friction || 0.998;
  }

  // --- Main Update (call every frame) ---

  update(deltaTime) {
    const dt = deltaTime; // already in seconds-ish from fixed timestep

    // While docked at a station, ship is on station power/air — no drain at all
    // Heat dissipates fast, brownouts cleared, system health restored
    if (this.player.isDocked) {
      for (const system of Object.values(SYSTEM_NAMES)) {
        this.heat[system] = Math.max(0, this.heat[system] - HEAT_DISSIPATION * 2 * dt * 60);
      }
      // Repair: clear brownouts, restore status, full system health
      if (this.brownout) {
        this.brownout.engines = false;
        this.brownout.weapons = false;
        this.brownout.stabilizer = false;
      }
      this.brownoutAttempts = 0;
      this.oxygenLevel = 100;
      this.graceTimer = 0;
      // Battery cools fast and recovers status
      this.batteryHeat = Math.max(0, this.batteryHeat - 5 * dt * 60);
      this.batteryHealth = Math.min(100, this.batteryHealth + 20 * dt);
      if (this.batteryHealth > 50) this.batteryStatus = 'nominal';
      this.batteryRedlineTimer = 0;
      return;
    }

    // If power is off, deplete oxygen + grace period
    if (this.powerState !== POWER_STATE.ON) {
      if (this.inertialMode || this.oxygenLevel < 100) {
        if (this.oxygenLevel > 0) {
          this.oxygenLevel = Math.max(0, this.oxygenLevel - INERTIA.OXYGEN_DEPLETION_RATE * dt * 60);
        } else {
          // Grace period — N seconds of suffocation before death
          this.graceTimer += dt;
          if (this.graceTimer >= INERTIA.GRACE_PERIOD_SECONDS) {
            // Player dies from suffocation — call gameOver directly via gameLoop ref
            this.player.health = 0;
            const gs = this.player._gameLoop?.gameState || window.__gameState;
            if (gs && !gs.isGameOver) {
              gs.gameOver?.();
            }
          } else {
            // Damage from suffocation as warning
            const sufferRate = 5; // 5 hp/sec while suffocating
            this.player.health = Math.max(0, this.player.health - sufferRate * dt);
          }
        }
      }
      return;
    }

    // Reset grace timer when powered on (oxygen recovers)
    this.graceTimer = 0;
    if (this.oxygenLevel < 100) {
      this.oxygenLevel = Math.min(100, this.oxygenLevel + 30 * dt); // recover at 30%/sec when powered
    }

    // Idle energy drain — power^1.5 scaling makes low power MUCH cheaper
    // Default 5+3+1: ~0.30/sec | All low 1+1+1: ~0.06/sec (5x cheaper)
    // All max 9+9+9: ~1.2/sec (4x more expensive than default)
    const drainSum =
      Math.pow(this.allocation[SYSTEM_NAMES.ENGINES] || 0, 1.5) +
      Math.pow(this.allocation[SYSTEM_NAMES.WEAPONS] || 0, 1.5) +
      Math.pow(this.allocation[SYSTEM_NAMES.STABILIZER] || 0, 1.5);
    const drain = IDLE_BASE_DRAIN + drainSum * ALLOC_DRAIN_FACTOR;
    this.player.energy = Math.max(0, this.player.energy - drain * dt * 60);

    // If energy hits 0 and we still have power, force shutdown
    if (this.player.energy <= 0 && this.powerState === POWER_STATE.ON) {
      this.powerState = POWER_STATE.OFF;
      this._shutdown();
      return;
    }

    // Process each system — heat asymptotes toward a target "ceiling"
    // Power level sets the ceiling; active use boosts target above ceiling
    //
    // At power 0: ceiling = 0 (no heat ever)
    // At power 50%: ceiling = 25 (always cool)
    // At power 90% idle: ceiling = 81 (just below redline)
    // At power 90% active: target = 122 → guaranteed redline if held
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

      const alloc = this.allocation[system] || 0;
      const powerRatio = alloc / 10;

      // Heat ceiling = power² × 100 (sharp curve)
      const ceiling = powerRatio * powerRatio * 100;

      // Active use multiplier — pushes target above ceiling
      let active = false;
      if (alloc > 0) {
        if (system === SYSTEM_NAMES.ENGINES && this.player.thrusting) active = true;
        else if (system === SYSTEM_NAMES.WEAPONS && this.player.shootCooldown > 5) active = true;
      }
      const targetHeat = active ? ceiling * 1.5 : ceiling;

      // Smooth approach toward target — slower so player has reaction time
      // 90% active redlines in ~0.5 sec, plus 0.5 sec warning = ~1 sec to break
      const current = this.heat[system];
      const diff = targetHeat - current;
      // Heating rate: 1.5-3% per frame (was 4-10%, way too fast)
      // Cooling rate: 4% per frame (faster than heating, gives recovery)
      const rate = diff > 0 ? 0.015 + powerRatio * 0.015 : 0.04;
      this.heat[system] = Math.max(0, current + diff * rate * dt * 60);

      // Track time spent over redline for warning window
      if (this.heat[system] > REDLINE_THRESHOLD) {
        this.redlineTimer = this.redlineTimer || {};
        this.redlineTimer[system] = (this.redlineTimer[system] || 0) + dt;

        // Damage system from sustained heat
        const damageRate = (this.heat[system] - REDLINE_THRESHOLD) / 10;
        this.systemHealth[system] = Math.max(0, this.systemHealth[system] - damageRate * dt * 60);

        // Only roll for failure AFTER 0.5 sec warning window
        if (this.redlineTimer[system] > 0.5) {
          this._checkStability(system);
        }
      } else {
        // Reset warning timer when heat drops below redline
        if (this.redlineTimer) this.redlineTimer[system] = 0;
      }
    }

    // === BATTERY HEAT ===
    // Aggregate heat = sum of (active_system_heats²) × 0.5
    // Two systems at 60% active = ~65 (yellow zone)
    // Two systems at 90% active = 162 (instant brownout!)
    this._updateBattery(dt);
  }

  _updateBattery(dt) {
    // Battery stress scales with NUMBER of active systems × their average heat
    // 1 system at 60: target = 60 (yellow, safe)
    // 2 systems at 60: target = 90 (over redline)
    // 3 systems at 60: target = 120 (instant brownout)
    // 1 system at 90: target = 100 (over redline alone)
    // 2 systems at 90: target = 180 (instant brownout)
    let totalHeat = 0;
    let activeCount = 0;
    for (const system of Object.values(SYSTEM_NAMES)) {
      const h = this.heat[system] || 0;
      if (h > 5) {
        totalHeat += h;
        activeCount++;
      }
    }
    const avgHeat = activeCount > 0 ? totalHeat / activeCount : 0;
    // Multi-system multiplier: 1 active = 1.0×, 2 = 1.5×, 3 = 2.0×
    const multiSystemMult = 1 + 0.5 * Math.max(0, activeCount - 1);
    const target = Math.min(200, avgHeat * multiSystemMult);

    // Smooth approach (battery has thermal mass — slower)
    const diff = target - this.batteryHeat;
    const rate = diff > 0 ? 0.012 : 0.025; // slower heating, faster cooling
    this.batteryHeat = Math.max(0, this.batteryHeat + diff * rate * dt * 60);

    // Battery brownout when at redline for 0.5 sec
    if (this.batteryHeat > BATTERY_REDLINE) {
      this.batteryRedlineTimer += dt;
      // Damage battery
      const damageRate = (this.batteryHeat - BATTERY_REDLINE) / 15;
      this.batteryHealth = Math.max(0, this.batteryHealth - damageRate * dt * 60);

      if (this.batteryRedlineTimer > 0.5 && this.batteryStatus === 'nominal') {
        // Trigger brownout — caps all systems at power 5
        this.batteryStatus = 'brownout';
        // Force-cap all allocations
        for (const system of Object.values(SYSTEM_NAMES)) {
          if (this.allocation[system] > 5) {
            this.allocation[system] = 5;
          }
        }
      }
    } else {
      this.batteryRedlineTimer = 0;
      // Auto-recover battery from brownout when cool
      if (this.batteryStatus === 'brownout' && this.batteryHeat < 50) {
        this.batteryStatus = 'nominal';
      }
    }

    // Battery dead = total shutdown
    if (this.batteryHealth <= 0 && this.batteryStatus !== 'dead') {
      this.batteryStatus = 'dead';
      this.powerState = POWER_STATE.OFF;
      this._shutdown();
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
    // Battery brownout caps all systems at 5
    const cap = this.batteryStatus === 'brownout' ? 5 : 9;
    this.allocation[system] = Math.max(0, Math.min(cap, level));
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

    // Track brownout state — limits performance until restart attempts succeed
    // or station repair
    if (!this.brownout) this.brownout = { engines: false, weapons: false, stabilizer: false };

    switch (system) {
      case SYSTEM_NAMES.ENGINES:
        p.thrustPower *= 0.5;
        if (tier === 'MAJOR' || tier === 'CRITICAL') {
          // Random velocity impulse — engine sputters
          if (p.velocity) {
            const impulse = new Vector2D((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
            p.velocity.addMut(impulse);
          }
          // BROWNOUT: engine forced to limp mode
          this.brownout.engines = true;
          this.brownoutAttempts = (this.brownoutAttempts || 0) + 1;
        }
        break;

      case SYSTEM_NAMES.WEAPONS:
        if (tier === 'MAJOR' || tier === 'CRITICAL') {
          // BROWNOUT: weapons severely degraded
          this.brownout.weapons = true;
        }
        if (tier === 'CRITICAL') {
          p.takeDamage?.(5);
        }
        break;

      case SYSTEM_NAMES.STABILIZER:
        if (tier === 'MAJOR' || tier === 'CRITICAL') {
          this.enableInertialMode();
          this.brownout.stabilizer = true;
        }
        break;
    }
  }

  _restoreSystem(system) {
    const p = this.player;
    if (system === SYSTEM_NAMES.ENGINES) {
      p.thrustPower = p.baseThrustPower || 0.2;
      // Brownout persists past recovery until restart attempt succeeds
      // (handled via attemptStart logic for engines)
    } else if (this.brownout) {
      // Weapons / stabilizer auto-recover from brownout when nominal
      this.brownout[system] = false;
    }
  }

  // Check if a system is in brownout (severely degraded performance)
  isBrownedOut(system) {
    return this.brownout?.[system] || false;
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
    if (this.isBrownedOut('weapons')) {
      return 3.0; // triple cost during brownout
    }
    if (this.status[SYSTEM_NAMES.WEAPONS] !== 'nominal') {
      return 2.0; // double cost during weapon failure
    }
    return 1.0;
  }

  // --- Engine power modifier (affects thrust) ---
  // Brownout = 5% effective speed, "limp home" mode
  getEnginePowerMultiplier() {
    const ratio = this.getPowerRatio(SYSTEM_NAMES.ENGINES);
    const healthMult = (this.systemHealth[SYSTEM_NAMES.ENGINES] || 100) / 100;
    if (this.isBrownedOut('engines')) {
      return 0.05 * healthMult; // brownout: 5% no matter the allocation
    }
    return (0.2 + ratio * 2.0) * healthMult;
  }

  // Engine fuel cost multiplier — brownout doubles thrust cost
  getEngineCostMultiplier() {
    return this.isBrownedOut('engines') ? 2.0 : 1.0;
  }

  // Weapon damage scaling — brownout halves damage
  getWeaponPowerMultiplier() {
    const ratio = this.getPowerRatio(SYSTEM_NAMES.WEAPONS);
    const healthMult = (this.systemHealth[SYSTEM_NAMES.WEAPONS] || 100) / 100;
    if (this.isBrownedOut('weapons')) {
      return 0.5 * healthMult; // brownout: half damage
    }
    return (0.5 + ratio * 1.2) * healthMult;
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
