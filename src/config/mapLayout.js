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
  // ===== FREE ZONE — Starting area around Uncle Ricky's =====
  free: {
    name: 'Free Zone',
    description: "Safe space around Uncle Ricky's. Hydro and Carbon deposits. No hostiles.",
    tier: 0,
    center: { x: 4000, y: 4000 },
    radius: 1500,
    resourceType: 'hydro',
    enemyTypes: [],
    enemyCount: 0,
    color: 'rgba(0, 255, 0, 0.05)',
  },

  // ===== JUNKYARD — First real destination. Tow Cable puzzle. =====
  // Lore: Old ship graveyard. A derelict freighter has a military-grade
  // tow cable stuck in its wreckage. You need to navigate the debris field
  // and dock with the wreck to salvage it. Light scout patrols — scavengers
  // who don't want you taking their finds.
  junkyard: {
    name: 'The Junkyard',
    description: 'Ship graveyard west of the station. Scavenger scouts patrol the wrecks.',
    tier: 1,
    center: { x: 1800, y: 3200 },
    radius: 1200,
    resourceType: 'ferro',
    enemyTypes: ['scout'],
    enemyCount: 3,
    enemyDetectionRange: 300,
    stationId: 'station_junkyard',
    puzzle: {
      type: 'salvage',
      description: 'Dock with the derelict freighter to salvage the tow cable',
      reward: 'tow_cable',
      rewardName: 'Military Tow Cable',
    },
    color: 'rgba(255, 200, 0, 0.08)',
  },

  // ===== FERRO FIELDS — Low-sec mining between junkyard and station =====
  ferroFields: {
    name: 'Ferro Fields',
    description: 'Iron-rich asteroid scatter. Easy pickings but watch for scouts.',
    tier: 1,
    center: { x: 2800, y: 5200 },
    radius: 1000,
    resourceType: 'ferro',
    enemyTypes: ['scout'],
    enemyCount: 2,
    enemyDetectionRange: 300,
    color: 'rgba(255, 255, 0, 0.05)',
  },

  // ===== MINING PLANET — Cave creature puzzle. Drill reward. =====
  // Lore: DeepCore Mining Corp abandoned this operation after something
  // started living in the mine shafts. The drill rig is still down there.
  // Get past the creature, get the drill. Patrol ships guard the approach —
  // DeepCore doesn't want liability lawsuits from dead freelancers.
  miningPlanet: {
    name: 'DeepCore Mines',
    description: 'Abandoned mining operation. Something lives in the caves.',
    tier: 2,
    center: { x: 3500, y: 1200 },
    radius: 1100,
    resourceType: 'silicrystal',
    enemyTypes: ['scout', 'patrol'],
    enemyCount: 4,
    enemyDetectionRange: 500,
    stationId: 'station_mining',
    puzzle: {
      type: 'cave_creature',
      description: 'Navigate the mine shafts and defeat or evade the cave creature to reach the drill rig',
      reward: 'drill',
      rewardName: 'DeepCore Drill Attachment',
    },
    color: 'rgba(255, 165, 0, 0.08)',
  },

  // ===== THE STRIP — Bar + Chop Shop. Info and black market. =====
  // Lore: Neutral zone run by a retired smuggler named Maz. Part bar,
  // part ship-stripping facility. You can buy black market upgrades,
  // get intel on the gang, and maybe find a shady mechanic who'll
  // soup up your uncle's rig. No combat here — Maz doesn't tolerate it.
  theStrip: {
    name: 'The Strip',
    description: "Maz's Bar & Chop Shop. Neutral ground. Black market upgrades and intel.",
    tier: 2,
    center: { x: 6200, y: 2800 },
    radius: 800,
    resourceType: 'silicrystal',
    enemyTypes: [],  // neutral zone — no hostiles
    enemyCount: 0,
    enemyDetectionRange: 0,
    stationId: 'station_strip',
    puzzle: {
      type: 'intel',
      description: "Buy intel from Maz about the gang's patrol routes and the jump drive location",
      reward: 'gang_intel',
      rewardName: 'Gang Patrol Routes',
    },
    color: 'rgba(0, 200, 255, 0.08)',
  },

  // ===== TITAN RIDGE — Hard zone buffer before gang territory =====
  titanRidge: {
    name: 'Titan Ridge',
    description: 'Dense asteroid belt with titanium deposits. Heavy patrol presence.',
    tier: 3,
    center: { x: 5500, y: 5500 },
    radius: 1000,
    resourceType: 'titan',
    enemyTypes: ['patrol', 'heavy'],
    enemyCount: 5,
    enemyDetectionRange: 700,
    color: 'rgba(255, 0, 0, 0.05)',
  },

  // ===== GANG TERRITORY — Final area. Boss fight. Jump drive. =====
  // Lore: The Void Reapers run this sector. They've been raiding
  // shipping lanes across the system. Their leader, "Krank," has a
  // stolen military jump drive installed in his flagship. Take him
  // down, take the drive, and get out of this system for good.
  gangTerritory: {
    name: 'Void Reaper Territory',
    description: "The gang's home turf. Maximum security. Krank's flagship has the jump drive.",
    tier: 4,
    center: { x: 6800, y: 7000 },
    radius: 900,
    resourceType: 'aurum',
    enemyTypes: ['heavy', 'elite'],
    enemyCount: 6,
    enemyDetectionRange: 800,
    stationId: 'station_gang',
    puzzle: {
      type: 'boss_fight',
      description: "Defeat Krank's flagship to take the jump drive",
      reward: 'jump_drive',
      rewardName: 'Military Jump Drive',
      bossConfig: {
        name: 'Krank',
        shipName: "Krank's Flagship",
        health: 500,
        damage: 30,
        speed: 0.8,
        sensorRange: 1000,
        attackRange: 500,
        shootRate: 30,
      },
    },
    color: 'rgba(128, 0, 255, 0.08)',
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

  // JUNKYARD — wreckage and ferro scrap
  junkyardDebris: {
    name: 'Junkyard Debris',
    zone: 'junkyard',
    x: 1600, y: 3000,
    width: 1600, height: 1400,
    count: 35,
    size: 'mixed',
    resourceType: 'ferro',
    pattern: 'scattered',
  },

  // FERRO FIELDS — low-sec mining south-west
  ferroFieldScatter: {
    name: 'Ferro Fields',
    zone: 'ferroFields',
    x: 2600, y: 5000,
    width: 1200, height: 1200,
    count: 25,
    size: 'mixed',
    resourceType: 'ferro',
    pattern: 'scattered',
  },

  // MINING PLANET — sili-crystal deposits, dense and tough
  mineShafts: {
    name: 'Mine Shafts',
    zone: 'miningPlanet',
    x: 3300, y: 1000,
    width: 1400, height: 1200,
    count: 30,
    size: 'mixed',
    resourceType: 'silicrystal',
    pattern: 'scattered',
  },

  // THE STRIP — some scattered resources, mostly a trade hub
  stripOutskirts: {
    name: 'Strip Outskirts',
    zone: 'theStrip',
    x: 6000, y: 2600,
    width: 800, height: 800,
    count: 10,
    size: 'small',
    resourceType: 'ferro',
    pattern: 'scattered',
  },

  // TITAN RIDGE — hard zone buffer, dense titanium
  titanRidgeField: {
    name: 'Titan Ridge',
    zone: 'titanRidge',
    x: 5300, y: 5300,
    width: 1400, height: 1400,
    count: 25,
    size: 'large',
    resourceType: 'titan',
    pattern: 'scattered',
  },
  // GANG TERRITORY — aurum-rich, heavily defended
  gangField: {
    name: 'Reaper Rocks',
    zone: 'gangTerritory',
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
    locked: false,
  },
  {
    id: 'station_junkyard',
    x: 1800, y: 3400,
    type: 'salvage',
    name: "Rusty's Salvage Yard",
    zone: 'junkyard',
    locked: true,
    unlockRequirement: null, // first stop, unlocked by arriving
    reward: 'tow_cable',
  },
  {
    id: 'station_mining',
    x: 3500, y: 1400,
    type: 'mining',
    name: 'DeepCore Mining Op',
    zone: 'miningPlanet',
    locked: true,
    unlockRequirement: 'tow_cable', // need tow cable to clear debris at entrance
    reward: 'drill',
  },
  {
    id: 'station_strip',
    x: 6200, y: 2800,
    type: 'bar',
    name: "Maz's Bar & Chop Shop",
    zone: 'theStrip',
    locked: true,
    unlockRequirement: 'drill', // need to have proven yourself
    reward: 'gang_intel',
  },
  {
    id: 'station_gang',
    x: 7000, y: 7200,
    type: 'gang_hq',
    name: 'Void Reaper HQ',
    zone: 'gangTerritory',
    locked: true,
    unlockRequirement: 'gang_intel', // need intel from Maz to find it
    reward: 'jump_drive',
  },
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

// --- SHIP TOOLS / GADGETS ---
// Unlocked through station puzzles. Each opens new gameplay possibilities.

export const SHIP_TOOLS = {
  tow_cable: {
    name: 'Military Tow Cable',
    description: 'Drag asteroids, debris, and disabled ships. Also clears blocked paths.',
    source: "Rusty's Salvage Yard",
    keybind: 'R', // hold R to activate tow beam
    energyCost: 2, // per second while active
    range: 150,
  },
  drill: {
    name: 'DeepCore Drill Attachment',
    description: 'Mine crystal and dense ore that blasters alone cannot break.',
    source: 'DeepCore Mining Op',
    keybind: 'C', // hold C to drill targeted asteroid
    energyCost: 3,
    range: 80,
    bonusDamageVs: ['silicrystal', 'titan'], // 3x damage to these resource types
  },
  gang_intel: {
    name: 'Gang Patrol Routes',
    description: "Shows Void Reaper patrol paths on the map. Reveals Krank's location.",
    source: "Maz's Bar",
    passive: true, // no keybind, always active once acquired
  },
  jump_drive: {
    name: 'Military Jump Drive',
    description: 'FTL travel between star systems. Requires Thorium Core fuel.',
    source: "Krank's Flagship",
    keybind: 'J', // press J to activate (when fueled)
    fuelType: 'thorium',
    fuelCost: 1, // 1 Thorium Core per jump
  },
};

export const MAP_CONFIG = {
  dimensions: { width: MAP_WIDTH, height: MAP_HEIGHT },
  zones: ZONES,
  asteroidFields: ASTEROID_FIELDS,
  stations: FIXED_STATIONS,
  resourceTypes: RESOURCE_TYPES,
  shipTools: SHIP_TOOLS,
  enemyTiers: ENEMY_TIERS,
};
