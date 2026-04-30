export const GAME_CONFIG = {
  fps: 60,
  maxDeltaTime: 100,

  WORLD: {
    WIDTH: 20000,
    HEIGHT: 20000,
    SIZE: 20000, // kept for backward compat
    GRID_SIZE: 200,
    STAR_COUNT: 3000,
  },

  PLAYER: {
    STARTING_CREDITS: 50,       // barely enough for a couple energy cells
    STARTING_HEALTH: 100,
    STARTING_ENERGY: 100,       // tight cap — every thrust counts
    STARTING_FUEL: 100,         // alias
    INITIAL_CARGO_CAPACITY: 20, // tiny hold on uncle's junker
    RADIUS: 20,
    SPEED: 1.2,                 // slow junker — upgrades make it faster
    ROTATION_SPEED: 0.08,       // sluggish rotation
    THRUST_POWER: 0.12,         // weak thrust — momentum builds slow but gets scary
    ACCELERATION: 0.12,
    FRICTION: 0.99,
    MAX_SPEED: 5,               // low cap — feels dangerous when maxed
    MAX_HEALTH: 100,
    MAX_AMMO: 100,
    ENERGY_COST: {
      THRUST: 0.15,             // costs more per thrust — energy management matters
      SHOT: 8,                  // expensive shots — can't spam
      SPEED_MULTIPLIER: 0.15,
      DAMAGE_MULTIPLIER: 0.2,
    },
  },

  GAME: {
    FRICTION: 0.99,
    WAVE_DURATION: 300,
    DIFFICULTY_INCREASE: 0.1,
  },

  STATION: {
    RADIUS: 125,
    SAFE_ZONE_RADIUS: 500,
    APPROACH_RADIUS: 300,
    DOCKING_RADIUS: 150,
    MAX_DOCKING_SPEED: 1.0,
    DOCKING_COOLDOWN: 1000,
  },

  ASTEROIDS: {
    SIZES: {
      small: { RADIUS: 15, HEALTH: 20, RESOURCE_VALUE: 5, RESOURCE_COUNT: { MIN: 3, MAX: 4 } },
      medium: { RADIUS: 30, HEALTH: 40, RESOURCE_VALUE: 10, RESOURCE_COUNT: { MIN: 5, MAX: 7 } },
      large: { RADIUS: 45, HEALTH: 60, RESOURCE_VALUE: 15, RESOURCE_COUNT: { MIN: 7, MAX: 8 } },
    },
    MAX_RESOURCES: 8,
    BASE_SPEED: 0.2,
    SPEED_VARIATION: 0.3,
    ROTATION_SPEED: 0.02,
    // legacy compat
    INITIAL_COUNT: 50,
    SPAWN_RADIUS: 1000,
    MIN_SIZE: 20,
    MAX_SIZE: 50,
    DAMAGE: 20,
  },

  RESOURCE: {
    RADIUS: 5,
    BASE_VALUE: 1,
    LIFETIME: 30000,
    BASE_SPEED: 0.2,
    SPEED_VARIATION: 0.3,
    GLOW_COLOR: 'rgba(136, 187, 255, 0.5)',
    COLOR: '#8bf',
  },

  PROJECTILES: {
    SPEED: 10,
    DAMAGE: 10,
    LIFETIME: 1000,
    RADIUS: 3,
  },

  PARTICLES: {
    LIFETIME: 1000,
    SPEED: 2,
    SIZE: 2,
  },

  SHIP: {
    BOOST: {
      FUEL_COST: 0.3,
      MULTIPLIER: 1.5,
    },
  },

  TRADING: {
    BUY_PRICE: 20,
    SELL_PRICE: 15,
    ENERGY_CELL: { COST: 50, AMOUNT: 25 },
    UPGRADES: {
      CAPACITY: { BASE_COST: 200, COST_MULTIPLIER: 1 },
      THRUST_EFFICIENCY: { BASE_COST: 100, COST_MULTIPLIER: 1, DEGRADATION_FACTOR: 0.1 },
      AMMO_EFFICIENCY: { BASE_COST: 120, COST_MULTIPLIER: 1, DEGRADATION_FACTOR: 0.1 },
      SPEED: { BASE_COST: 150, COST_MULTIPLIER: 1, DEGRADATION_FACTOR: 0.15 },
      RESOURCE_RANGE: { BASE_COST: 180, COST_MULTIPLIER: 1, DEGRADATION_FACTOR: 0.1 },
      BLASTER_DAMAGE: { BASE_COST: 200, COST_MULTIPLIER: 1, DEGRADATION_FACTOR: 0.2 },
      CARGO: { BASE_COST: 300, COST_MULTIPLIER: 1 },
    },
  },

  POWER_SYSTEM: {
    MIN_ALLOCATION: 0,
    MAX_ALLOCATION: 9,
    DEFAULT_ALLOCATIONS: { ENGINES: 5, WEAPONS: 3, STABILIZER: 1 },
    KEY_SEQUENCE_TIMEOUT: 500,
    MAX_START_ATTEMPTS: 5,
    BASE_START_PROBABILITY: 0.3,
  },

  STABILITY: {
    BASE_HEAT_GENERATION: { ENGINES: 1.0, WEAPONS: 1.2, STABILIZER: 0.5 },
    REDLINE_THRESHOLD: 85,
    HEAT_DISSIPATION: 0.5,
    BASE_STABILITY: { ENGINES: 75, WEAPONS: 70, STABILIZER: 90 },
    STABILITY_PER_LEVEL: 5,
    FAILURE_TIERS: { MINOR: 0.7, MAJOR: 0.4, CRITICAL: 0.0 },
    FAILURE_RECOVERY: { MINOR: 500, MAJOR: 1500, CRITICAL: 3000 },
    POWER_STATE: { OFF: 'off', STARTING: 'starting', ON: 'on', FAILING: 'failing' },
  },

  PHYSICS: {
    COLLISION: {
      DAMAGE_FACTOR: 0.5,
      DAMAGE_SIZE_FACTOR: 15,
      PUSH_FACTOR: 0.05,
      SEPARATION_FACTOR: 0.6,
      ASTEROID_RESTITUTION: 0.5,
      MIN_ASTEROID_VELOCITY: 0.1,
      ASTEROID_DAMPING_FACTOR: 0.98,
    },
    WORLD_WRAP: { BUFFER: 100, PUSH_FORCE: 0.5 },
    BOUNDARY_BOUNCE_FACTOR: 0.8,
    SHIELD: {
      MAX_DAMAGE_REDUCTION: 0.5,
      MAX_HEAT_PER_HIT: 30,
      HEAT_GENERATION_FACTOR: 0.8,
      PUSH_REDUCTION_FACTOR: 0.3,
    },
  },

  PERFORMANCE: {
    CHUNK_SIZE: 2000,
    VIEW_DISTANCE: 3000,
    MAX_ACTIVE_ENTITIES: 100,
  },

  CAMERA: {
    ZOOM_SPEED: 0.1,
    MIN_ZOOM: 0.5,
    MAX_ZOOM: 2,
    SMOOTHING: 0.1,
  },

  ASSETS: {
    BACKGROUND_IMAGE: '/assets/background.png',
    STATION_IMAGE: '/assets/station.png',
    RESOURCE_IMAGE: '/assets/resource-carbon.png',
  },

  // kept for legacy compat
  ENEMIES: {
    INITIAL_COUNT: 10,
    SPAWN_RADIUS: 1000,
    SPEED: 3,
    FIRE_RATE: 1,
    DAMAGE: 15,
  },
};

export const currentGalaxy = {
  id: 1,
  name: 'Alpha',
  difficulty: 1,
  resources: { common: 1.0, rare: 1.0, exotic: 1.0 },
  resourceMultipliers: {
    Iron: 1.0, Copper: 1.0, Silver: 1.2, Gold: 1.2,
    Platinum: 1.5, Crystal: 1.5, 'Exotic Matter': 2.0,
  },
  stations: [],
  enemies: [],
  asteroids: [],
};
