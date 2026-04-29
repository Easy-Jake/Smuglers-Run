// Define upgrade definitions outside the class
const upgradeDefinitions = {
  weapons: {
    multishot: {
      name: 'Multishot',
      levels: [
        { cost: 500, shots: 2, spread: 0.2 },
        { cost: 1000, shots: 3, spread: 0.3 },
        { cost: 2000, shots: 4, spread: 0.4 },
      ],
    },
    damage: {
      name: 'Weapon Power',
      levels: [
        { cost: 300, multiplier: 1.5 },
        { cost: 600, multiplier: 2.0 },
        { cost: 1200, multiplier: 2.5 },
      ],
    },
    firerate: {
      name: 'Fire Rate',
      levels: [
        { cost: 400, multiplier: 1.3 },
        { cost: 800, multiplier: 1.6 },
        { cost: 1600, multiplier: 2.0 },
      ],
    },
  },
  defense: {
    shield: {
      name: 'Shield Generator',
      levels: [
        { cost: 1000, capacity: 50, regen: 0.1 },
        { cost: 2000, capacity: 100, regen: 0.2 },
        { cost: 4000, capacity: 200, regen: 0.3 },
      ],
    },
    armor: {
      name: 'Hull Plating',
      levels: [
        { cost: 500, health: 150 },
        { cost: 1000, health: 200 },
        { cost: 2000, health: 300 },
      ],
    },
  },
  utility: {
    cargo: {
      name: 'Cargo Hold',
      levels: [
        { cost: 300, capacity: 75 },
        { cost: 600, capacity: 100 },
        { cost: 1200, capacity: 150 },
      ],
    },
    engine: {
      name: 'Engine Boost',
      levels: [
        { cost: 400, thrust: 1.2, efficiency: 1.1 },
        { cost: 800, thrust: 1.4, efficiency: 1.2 },
        { cost: 1600, thrust: 1.6, efficiency: 1.3 },
      ],
    },
  },
};

function TechTree() {
  // Initialize tech tree properties
  this.upgrades = upgradeDefinitions;
  this.playerLevel = 1;
  this.techPoints = 0;
}

TechTree.prototype.getUpgradeById = function (id) {
  return this.upgrades[id];
};

TechTree.prototype.applyUpgrade = function (ship, category, type, level) {
  const upgrade = this.upgrades[category][type].levels[level];

  if (!upgrade || ship.credits < upgrade.cost) {
    return false;
  }

  ship.credits -= upgrade.cost;

  switch (category) {
    case 'weapons':
      this.applyWeaponUpgrade(ship, type, upgrade);
      break;
    case 'defense':
      this.applyDefenseUpgrade(ship, type, upgrade);
      break;
    case 'utility':
      this.applyUtilityUpgrade(ship, type, upgrade);
      break;
  }

  ship.upgrades[type] = (ship.upgrades[type] || 0) + 1;
  return true;
};

TechTree.prototype.applyWeaponUpgrade = function (ship, type, upgrade) {
  switch (type) {
    case 'multishot':
      ship.multiShot = upgrade.shots;
      ship.spreadAngle = upgrade.spread;
      break;
    case 'damage':
      ship.damage *= upgrade.multiplier;
      break;
    case 'firerate':
      ship.fireRate *= upgrade.multiplier;
      break;
  }
};

TechTree.prototype.applyDefenseUpgrade = function (ship, type, upgrade) {
  switch (type) {
    case 'shield':
      ship.maxShield = upgrade.capacity;
      ship.shield = upgrade.capacity;
      ship.shieldRegen = upgrade.regen;
      break;
    case 'armor':
      var healthIncrease = upgrade.health - ship.maxHealth;
      ship.maxHealth = upgrade.health;
      ship.health += healthIncrease;
      break;
  }
};

TechTree.prototype.applyUtilityUpgrade = function (ship, type, upgrade) {
  switch (type) {
    case 'cargo':
      ship.cargoCapacity = upgrade.capacity;
      break;
    case 'engine':
      ship.maxThrust *= upgrade.thrust;
      ship.fuelEfficiency *= upgrade.efficiency;
      break;
  }
};

TechTree.prototype.getUpgradeCost = function (category, type, currentLevel) {
  var upgrades = this.upgrades[category][type].levels;
  return currentLevel < upgrades.length ? upgrades[currentLevel].cost : Infinity;
};

TechTree.prototype.isUpgradeAvailable = function (ship, category, type) {
  var currentLevel = ship.upgrades[type] || 0;
  return currentLevel < this.upgrades[category][type].levels.length;
};

export default TechTree;
