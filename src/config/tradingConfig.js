/**
 * Trading system configuration — ported from Asteroid Driver
 * Prices, upgrade costs with diminishing-return formulas, and UI layout.
 */

export const PRICES = {
  RESOURCE_BUY: 15,    // station buys player resources at 15 credits each
  RESOURCE_SELL: 20,   // station sells resources to player at 20 credits each
  ENERGY_CELL: 50,     // cost for one energy cell
  ENERGY_AMOUNT: 25,   // energy restored per cell
};

// Base upgrade costs
export const UPGRADE_COSTS = {
  CAPACITY: 200,
  THRUST_EFFICIENCY: 100,
  AMMO_EFFICIENCY: 120,
  SPEED: 150,
  RESOURCE_RANGE: 180,
  BLASTER_DAMAGE: 200,
  CARGO: 300,
};

// Degradation factor (z) — controls how fast costs ramp up
// Formula: cost = Base * (level + z * level²)
export const UPGRADE_DEGRADATION = {
  CAPACITY: 0.0,         // no degradation — always same cost
  THRUST_EFFICIENCY: 0.1,
  AMMO_EFFICIENCY: 0.1,
  SPEED: 0.15,
  RESOURCE_RANGE: 0.1,
  BLASTER_DAMAGE: 0.2,
  CARGO: 0.0,
};

/**
 * Calculate upgrade cost using diminishing-return formula:
 *   cost = Base * (level + z * level²)
 *
 * @param {number} baseCost - Base price for this upgrade type
 * @param {number} level - Current level (1-based)
 * @param {number} degradation - The z factor
 * @returns {number} Cost in credits
 */
export function calculateUpgradeCost(baseCost, level, degradation) {
  return Math.round(baseCost * (level + degradation * level * level));
}

/**
 * Get the cost for a specific upgrade at the player's current level
 */
export function getUpgradeCost(upgradeType, currentLevel) {
  const base = UPGRADE_COSTS[upgradeType];
  const z = UPGRADE_DEGRADATION[upgradeType] ?? 0;
  if (!base) return Infinity;
  return calculateUpgradeCost(base, currentLevel, z);
}

// All upgrade definitions for the trading UI
export const UPGRADES = [
  {
    id: 'CAPACITY',
    label: 'Energy Capacity',
    description: '+25 max energy',
    playerLevel: 'cargoCapacityLevel', // reusing for now
    applyFn: 'upgradeEnergyCapacity',
  },
  {
    id: 'THRUST_EFFICIENCY',
    label: 'Thrust Efficiency',
    description: 'Less energy per thrust',
    playerLevel: 'thrustEfficiencyLevel',
    applyFn: 'upgradeThrustEfficiency',
  },
  {
    id: 'AMMO_EFFICIENCY',
    label: 'Ammo Efficiency',
    description: 'Less energy per shot',
    playerLevel: 'ammoEfficiencyLevel',
    applyFn: 'upgradeAmmoEfficiency',
  },
  {
    id: 'SPEED',
    label: 'Speed',
    description: '+1 max speed',
    playerLevel: 'speedLevel',
    applyFn: 'upgradeSpeed',
  },
  {
    id: 'RESOURCE_RANGE',
    label: 'Resource Range',
    description: '+20% pickup radius',
    playerLevel: 'resourceRangeLevel',
    applyFn: 'upgradeResourceRange',
  },
  {
    id: 'BLASTER_DAMAGE',
    label: 'Blaster Damage',
    description: '+25% damage',
    playerLevel: 'blasterDamageLevel',
    applyFn: 'upgradeBlasterDamage',
  },
  {
    id: 'CARGO',
    label: 'Cargo Capacity',
    description: '+50 cargo space',
    playerLevel: 'cargoCapacityLevel',
    applyFn: 'upgradeCargoCapacity',
  },
];
