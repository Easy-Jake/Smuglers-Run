/**
 * Map layout configuration — Smuggler's Run System 1
 *
 * Zone difficulty radiates outward from center station:
 *   FREE ZONE (center)  → Carbon asteroids, no enemies
 *   LOW SECURITY (near)  → Scrap + Carbon, weak scout patrols
 *   MEDIUM (outer)       → Mixed resources, patrol ships, mining station
 *   HARD (far edges)     → Tough asteroids, heavy fighters
 *   BOSS ZONE (bottom-right) → Final station, boss encounter
 *
 * Story: You borrowed your uncle's rig while he's in prison.
 *        Start at the central trading station. Work your way out.
 */

export const MAP_WIDTH = 8000;
export const MAP_HEIGHT = 8000;

// --- ZONE DEFINITIONS ---
// Each zone has a center, radius, difficulty tier, and resource type

export const ZONES = {
  free: {
    name: 'Free Zone',
    description: 'Safe space around the trading station',
    tier: 0,
    center: { x: 4000, y: 4000 },
    radius: 1500,
    resourceType: 'hydro',
    enemyTypes: [],           // no enemies
    enemyCount: 0,
    color: 'rgba(0, 255, 0, 0.05)',
  },
  lowNorth: {
    name: 'Northern Reach',
    description: 'Low-security zone, scattered scrap deposits',
    tier: 1,
    center: { x: 3500, y: 2000 },
    radius: 1200,
    resourceType: 'ferro',
    enemyTypes: ['scout'],
    enemyCount: 3,
    enemyDetectionRange: 300,  // narrow — have to fly right past them
    color: 'rgba(255, 255, 0, 0.05)',
  },
  lowEast: {
    name: 'Eastern Drift',
    description: 'Low-security zone, old wreckage fields',
    tier: 1,
    center: { x: 5800, y: 3500 },
    radius: 1000,
    resourceType: 'ferro',
    enemyTypes: ['scout'],
    enemyCount: 2,
    enemyDetectionRange: 300,
    color: 'rgba(255, 255, 0, 0.05)',
  },
  mediumWest: {
    name: 'Western Mining Belt',
    description: 'Medium security — mining operation territory',
    tier: 2,
    center: { x: 1500, y: 4000 },
    radius: 1200,
    resourceType: 'silicrystal',
    enemyTypes: ['scout', 'patrol'],
    enemyCount: 4,
    enemyDetectionRange: 500,
    stationId: 'station_mining',
    color: 'rgba(255, 165, 0, 0.05)',
  },
  mediumSouth: {
    name: 'Southern Expanse',
    description: 'Medium security — dense asteroid belt',
    tier: 2,
    center: { x: 3000, y: 6500 },
    radius: 1000,
    resourceType: 'silicrystal',
    enemyTypes: ['patrol'],
    enemyCount: 3,
    enemyDetectionRange: 500,
    color: 'rgba(255, 165, 0, 0.05)',
  },
  hardNorth: {
    name: 'Northern Void',
    description: 'Dangerous territory — heavy patrols',
    tier: 3,
    center: { x: 4500, y: 800 },
    radius: 800,
    resourceType: 'titan',
    enemyTypes: ['patrol', 'heavy'],
    enemyCount: 4,
    enemyDetectionRange: 700,
    color: 'rgba(255, 0, 0, 0.05)',
  },
  hardEast: {
    name: 'Eastern Frontier',
    description: 'Fortified zone — military presence',
    tier: 3,
    center: { x: 6500, y: 5000 },
    radius: 1000,
    resourceType: 'titan',
    enemyTypes: ['patrol', 'heavy'],
    enemyCount: 5,
    enemyDetectionRange: 700,
    stationId: 'station_military',
    color: 'rgba(255, 0, 0, 0.05)',
  },
  bossZone: {
    name: 'The Dead End',
    description: 'Maximum security — final station territory',
    tier: 4,
    center: { x: 6800, y: 7000 },
    radius: 900,
    resourceType: 'aurum',
    enemyTypes: ['heavy', 'elite'],
    enemyCount: 6,
    enemyDetectionRange: 800,
    stationId: 'station_final',
    color: 'rgba(128, 0, 255, 0.05)',
  },
};

// --- ASTEROID FIELDS ---
// Now tied to zones with difficulty-appropriate sizes and resources

export const ASTEROID_FIELDS = {
  // FREE ZONE — easy pickings
  freeCenter: {
    name: 'Central Scatter',
    zone: 'free',
    x: 3800, y: 3600,
    width: 1200, height: 1200,
    count: 25,
    size: 'small',
    resourceType: 'hydro',
    pattern: 'scattered',
  },
  freeRing: {
    name: 'Station Ring',
    zone: 'free',
    x: 4000, y: 4000,
    radius: 1200,
    innerRadius: 600,
    count: 15,
    size: 'small',
    resourceType: 'carbon',
    pattern: 'ring',
  },

  // LOW SECURITY — scrap deposits
  lowNorthField: {
    name: 'Scrap Yard North',
    zone: 'lowNorth',
    x: 3200, y: 1800,
    width: 1800, height: 1200,
    count: 30,
    size: 'mixed',
    resourceType: 'ferro',
    pattern: 'scattered',
  },
  lowEastField: {
    name: 'Wreckage Field',
    zone: 'lowEast',
    x: 5800, y: 3200,
    width: 1200, height: 1000,
    count: 20,
    size: 'mixed',
    resourceType: 'ferro',
    pattern: 'scattered',
  },

  // MEDIUM — crystal ore (will need drill later)
  mediumWestField: {
    name: 'Mining Belt',
    zone: 'mediumWest',
    x: 1300, y: 3800,
    width: 1400, height: 1400,
    count: 25,
    size: 'mixed',
    resourceType: 'silicrystal',
    pattern: 'scattered',
  },
  mediumSouthField: {
    name: 'Southern Belt',
    zone: 'mediumSouth',
    x: 2800, y: 6200,
    width: 1200, height: 1000,
    count: 20,
    size: 'large',
    resourceType: 'silicrystal',
    pattern: 'scattered',
  },

  // HARD — rare gas pockets, tough rocks
  hardNorthField: {
    name: 'Void Cluster',
    zone: 'hardNorth',
    x: 4200, y: 700,
    width: 1000, height: 800,
    count: 15,
    size: 'large',
    resourceType: 'titan',
    pattern: 'scattered',
  },
  hardEastField: {
    name: 'Fortress Rocks',
    zone: 'hardEast',
    x: 6300, y: 4800,
    width: 1200, height: 1200,
    count: 20,
    size: 'large',
    resourceType: 'titan',
    pattern: 'scattered',
  },

  // BOSS ZONE — plasma deposits, near-indestructible rocks
  bossField: {
    name: 'Dead End Asteroids',
    zone: 'bossZone',
    x: 6600, y: 6800,
    width: 1200, height: 1200,
    count: 20,
    size: 'large',
    resourceType: 'aurum',
    pattern: 'scattered',
  },
};

// --- STATIONS ---

export const FIXED_STATIONS = [
  {
    id: 'station_central',
    x: 4000, y: 4000,
    type: 'trading',
    name: "Uncle Ricky's Trading Post",
    zone: 'free',
  },
  // Future stations (unlocked via missions):
  // { id: 'station_mining', x: 1200, y: 4200, type: 'mining', name: 'DeepCore Mining Op', zone: 'mediumWest', locked: true },
  // { id: 'station_military', x: 6800, y: 5200, type: 'military', name: 'Garrison Outpost', zone: 'hardEast', locked: true },
  // { id: 'station_final', x: 7000, y: 7200, type: 'final', name: 'The Vault', zone: 'bossZone', locked: true },
];

// --- RESOURCE DEFINITIONS ---
// Based on cosmic abundance (periodic table), most common → rarest
// with sci-fi jargon sprinkled in

export const RESOURCE_TYPES = {
  hydro: {
    name: 'Hydro Cells',
    element: 'Hydrogen',
    color: '#aaddff',
    glowColor: '#cceeFF',
    baseValue: 1,
    sellPrice: 3,
    tier: 0,
    description: 'Compressed hydrogen — fuel and basic trade goods',
  },
  carbon: {
    name: 'Carbon Composite',
    element: 'Carbon',
    color: '#888',
    glowColor: '#aaa',
    baseValue: 2,
    sellPrice: 8,
    tier: 0,
    description: 'Processed carbon — building block of everything',
  },
  ferro: {
    name: 'Ferro Scrap',
    element: 'Iron/Nickel',
    color: '#b87333',
    glowColor: '#da8a44',
    baseValue: 5,
    sellPrice: 18,
    tier: 1,
    description: 'Salvageable iron-nickel alloy from debris fields',
  },
  silicrystal: {
    name: 'Sili-Crystal',
    element: 'Silicon',
    color: '#4af',
    glowColor: '#8cf',
    baseValue: 12,
    sellPrice: 45,
    tier: 2,
    description: 'Crystallized silicon — used in advanced electronics',
    // requiresTool: 'drill',
  },
  titan: {
    name: 'Titan Ore',
    element: 'Titanium',
    color: '#9988cc',
    glowColor: '#bbaaee',
    baseValue: 20,
    sellPrice: 85,
    tier: 3,
    description: 'Dense titanium deposits — hull-grade material',
    // requiresTool: 'heavy_drill',
  },
  nebula: {
    name: 'Nebula Extract',
    element: 'Xenon/Noble Gas',
    color: '#a4f',
    glowColor: '#c8f',
    baseValue: 35,
    sellPrice: 150,
    tier: 3,
    description: 'Volatile noble gases from nebula pockets',
    // requiresTool: 'gas_collector',
  },
  aurum: {
    name: 'Aurum Dust',
    element: 'Gold/Platinum',
    color: '#ffd700',
    glowColor: '#ffe44d',
    baseValue: 60,
    sellPrice: 300,
    tier: 4,
    description: 'Precious metal particles — extremely valuable',
    // requiresTool: 'precision_extractor',
  },
  thorium: {
    name: 'Thorium Core',
    element: 'Uranium/Thorium',
    color: '#44ff44',
    glowColor: '#88ff88',
    baseValue: 100,
    sellPrice: 500,
    tier: 5,
    description: 'Radioactive fuel cores — powers jump drives',
    // requiresTool: 'radiation_shield',
  },
  darkmatter: {
    name: 'Dark Matter Fragment',
    element: '???',
    color: '#222233',
    glowColor: '#ffffff',
    baseValue: 500,
    sellPrice: 2000,
    tier: 6,
    description: 'Unknown substance — bends spacetime',
    // requiresTool: 'quantum_containment',
  },
};

// --- ENEMY TIER DEFINITIONS ---

export const ENEMY_TIERS = {
  scout: {
    name: 'Scout',
    tier: 1,
    health: 25,
    speed: 1.8,
    damage: 5,
    sensorRange: 300,
    attackRange: 200,
    shootRate: 80,
    creditReward: 15,
    sprite: 'enemy-scout',
  },
  patrol: {
    name: 'Patrol Ship',
    tier: 2,
    health: 50,
    speed: 1.5,
    damage: 10,
    sensorRange: 500,
    attackRange: 300,
    shootRate: 60,
    creditReward: 35,
    sprite: 'enemy-scout', // reuse scout sprite for now
  },
  heavy: {
    name: 'Heavy Fighter',
    tier: 3,
    health: 100,
    speed: 1.0,
    damage: 18,
    sensorRange: 700,
    attackRange: 400,
    shootRate: 50,
    creditReward: 75,
    sprite: 'enemy-heavy',
  },
  elite: {
    name: 'Elite Enforcer',
    tier: 4,
    health: 200,
    speed: 1.3,
    damage: 25,
    sensorRange: 800,
    attackRange: 450,
    shootRate: 40,
    creditReward: 150,
    sprite: 'enemy-heavy', // reuse heavy sprite for now
  },
};

export const MAP_CONFIG = {
  dimensions: { width: MAP_WIDTH, height: MAP_HEIGHT },
  zones: ZONES,
  asteroidFields: ASTEROID_FIELDS,
  stations: FIXED_STATIONS,
  resourceTypes: RESOURCE_TYPES,
  enemyTiers: ENEMY_TIERS,
};
